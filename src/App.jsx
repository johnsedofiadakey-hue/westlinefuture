import React, { useState, useEffect, Suspense, lazy, useRef, Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('[ErrorBoundary]', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', background: '#F8F6F3', padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ fontSize: 20, color: '#1A1410', marginBottom: 8 }}>Something went wrong</h2>
          <p style={{ color: '#A8A095', marginBottom: 24, fontSize: 14 }}>Please refresh the page. If the problem persists, contact support.</p>
          <button onClick={() => window.location.reload()} style={{ padding: '12px 28px', background: '#1A1410', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>Refresh Page</button>
        </div>
      );
    }
    return this.props.children;
  }
}
const _BUILD_ID = '20260519';
const PublicSite = lazy(() => import('./pages/PublicSite'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const AdminPortal = lazy(() => import('./pages/AdminPortal'));
const ClientPortal = lazy(() => import('./pages/ClientPortal'));
const AccountManagerPortal = lazy(() => import('./pages/AccountManagerPortal'));
const ProductsHub = lazy(() => import('./pages/ProductsHub'));
const Portfolio = lazy(() => import('./pages/Portfolio'));
const Showcase = lazy(() => import('./pages/Showcase'));
const WorkflowManualPage = lazy(() => import('./pages/WorkflowManualPage'));
const FieldUpload = lazy(() => import('./pages/admin/FieldUpload'));
const WorkerView = lazy(() => import('./pages/WorkerView'));
import ProtectedRoute from './components/ProtectedRoute';
import { sanitizeText } from './lib/sanitize';
import { mapFirebaseError } from './lib/firebaseErrors';
import { checkStageGates } from './lib/projectGates'; // ✅ PHASE 3: Centralize stage validation
import { generateIdempotencyKey, saveIdempotencyKey } from './lib/idempotency'; // ✅ PHASE 4: Prevent duplicates
import { getFirebaseErrorMessage, logError as logFirebaseError } from './lib/errorMessages'; // ✅ PHASE 4: User-friendly errors
import { formatDateTime } from './lib/formatTime'; // ✅ PHASE 4: Consistent timestamps
const _dev = import.meta.env.DEV;
const devLog = (...a) => { if (_dev) console.log(...a); };
const devWarn = (...a) => { if (_dev) console.warn(...a); };
const devErr = (...a) => { if (_dev) console.error(...a); };
import { useContext, useCallback } from 'react';
import { AppContext } from './context/AppContext';
import { useFileUpload } from './hooks/useFileUpload';
import { useMessaging } from './hooks/useMessaging';
import { 
  CLIENTS_DATA, PROPOSALS_DATA, INVOICES_DATA,
  BOOKINGS_DATA, EMAIL_QUEUE, HERO_SLIDES,
  SERVICES_DATA, ABOUT_DATA, PROCESS_STEPS, ROOM_GALLERY,
  PORTFOLIO_DATA, TEAM_MEMBERS, PROJECT_STAGES, WHY_US,
  PRODUCTS_DATA, GLASS_CATALOG_DATA, GLASS_CATALOG_CATEGORIES,
  BRAND0, DEFAULT_SCENES, INITIAL_CONTENT,
  CLIENT_PROJECT_STAGES
} from './data.jsx';


import { SCHEDULE_CONFIGS } from './pages/admin/clienthub/config.jsx';
import { calculateTimeline } from './pages/sharedHelpers';
import { auth, db, storage, functions, isFirebaseEnabled, firebaseConfig } from './lib/firebase';
import { initializeApp, deleteApp } from 'firebase/app';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, RecaptchaVerifier, signInWithPhoneNumber, getAuth } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { 
  collection, query, onSnapshot, getDocs, getDoc, doc, 
  updateDoc, addDoc, setDoc, deleteDoc, orderBy, collectionGroup, limit, where, serverTimestamp, increment, or
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { uploadFile } from './lib/firebase';
import { MessengerService } from './lib/MessengerService';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';






export default function App() {
  const [page, setPage] = useState('home');
  const [loginType, setLoginType] = useState('client'); 
  const [authLoading, setAuthLoading] = useState(true); 
  const navigate = useNavigate();
  const location = useLocation();
  const [activeMagicCode, setActiveMagicCode] = useState(null);
  const [showVisualizer, setShowVisualizer] = useState(false);
  const [notification, setNotification] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [magicCode, setMagicCode] = useState(null);
  const [otp, setOtp] = useState('');
  const loginAttempts = useRef({});
  const confirmationResultRef = useRef(null);
  const {
    user, setUser, clients, proposals, invoices, bookings, emails, setEmails, dbClients, teamMembers, logs, shipments, messages, testimonials, tasks, transactions, changeRequests, userNotifications, procurements, jobs, notes, media, approvals, materials, assets, workOrders, containers, renderingPackages, addOns,
    brand, content, currency, lang,
    setCurrency, setLang, setBrand, setContent,
    loadMoreMessages, hasMoreMessages,
    loadMoreInvoices, hasMoreInvoices,
    loadMoreWorkOrders, hasMoreWorkOrders
  } = useContext(AppContext);
  
  const notify = useCallback((type, msg, duration = 5000) => {
    if (window._notifTimeout) clearTimeout(window._notifTimeout);
    // 'persistent' notifications now auto-dismiss after 8 seconds — true persistent toasts
    // are bad UX. Errors still need to be dismissed manually.
    const isPersistent = (duration === 'persistent' || type === 'persistent') && type === 'error';
    const safeMsg = typeof msg === 'string' ? msg : (msg?.message || msg?.userMessage || String(msg) || 'An error occurred');
    setNotification({ type, msg: safeMsg, persistent: isPersistent });
    if (type !== 'pending' && !isPersistent) {
      const effectiveDuration = duration === 'persistent' ? 8000 : duration;
      window._notifTimeout = setTimeout(() => setNotification(null), effectiveDuration);
    }
  }, []);

  // --- Audio Notification System ---
  const playNotificationSound = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch(e) { console.error("Sound error", e) }
  }, []);

  const prevNotifsRef = useRef(null);
  useEffect(() => {
    if (userNotifications && userNotifications.length > 0) {
      // If we haven't loaded them before, just record them (don't beep on initial login)
      if (prevNotifsRef.current === null) {
        prevNotifsRef.current = userNotifications;
        return;
      }
      
      const prevIds = prevNotifsRef.current.map(n => n.id);
      const newNotifs = userNotifications.filter(n => !prevIds.includes(n.id) && !n.read);
      
      if (newNotifs.length > 0) {
        // Find the newest unread notification
        const newest = newNotifs.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
        if (newest && (Date.now() - new Date(newest.createdAt).getTime() < 120000)) { // within last 2 minutes
          try { playNotificationSound(); } catch (_) {}
          notify('info', newest.title || newest.msg || newest.message || 'New notification', 'persistent');
        }
      }
      prevNotifsRef.current = userNotifications;
    }
  }, [userNotifications, playNotificationSound, notify]);
  const { uploadMedia } = useFileUpload(notify);
  const { sendMessage } = useMessaging();

  // Inject dynamic CSS variables based on brand settings
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--bg-primary',       brand.bgPrimary       || '#FDFCFB');
    root.style.setProperty('--bg-secondary',     brand.bgSecondary     || '#F9F7F4');
    root.style.setProperty('--text-primary',     brand.textPrimary     || '#1A1410');
    root.style.setProperty('--text-secondary',   brand.textSecondary   || '#A8A095');
    root.style.setProperty('--accent-primary',   brand.accentPrimary   || '#C8A96E');
    root.style.setProperty('--accent-secondary', brand.accentSecondary || '#1A1410');
    root.style.setProperty('--border-color',     brand.borderColor     || 'rgba(26, 20, 16, 0.08)');
    root.style.setProperty('--footer-bg',        brand.footerBg        || '#12100E');

    // Legacy mapping aliases
    root.style.setProperty('--bg',  brand.bgPrimary       || '#FDFCFB');
    root.style.setProperty('--fg',  brand.textPrimary     || '#1A1410');
    root.style.setProperty('--ac',  brand.accentSecondary || '#1A1410');
    if (brand.fontFamily) root.style.setProperty('--font-primary', brand.fontFamily);
  }, [brand]);
  const fxRate = content?.finSettings?.exchangeRate || brand?.finSettings?.exchangeRate || 15.5;
  const rates = { USD: 1, GHS: fxRate, EUR: 0.93, CNY: 7.25, AED: 3.67 };

  // Push Notifications Setup
  useEffect(() => {
    if (!user || !isFirebaseEnabled) return;
    
    const requestPushPermission = async () => {
      try {
        const { messaging } = await import('./lib/firebase');
        if (!messaging) return;
        const { getToken } = await import('firebase/messaging');
        const { doc, updateDoc } = await import('firebase/firestore');
        const { db } = await import('./lib/firebase');
        
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          // Load VAPID key from Firestore gateway settings (Admin → Financials → Gateway Settings)
          let vapidKey = '';
          try {
            const { getDoc } = await import('firebase/firestore');
            const gwSnap = await getDoc(doc(db, 'cms_content', 'gatewaySettings'));
            vapidKey = gwSnap.data()?.content?.vapidKey || gwSnap.data()?.vapidKey || '';
          } catch (_) {}
          if (!vapidKey) return; // Skip silently if not configured yet
          const token = await getToken(messaging, { vapidKey });
          if (token && db) {
            await updateDoc(doc(db, 'users', user.id || user.uid), {
              fcmToken: token
            }).catch(console.warn);
          }
        }
      } catch (e) {
        console.warn('Push notification setup failed:', e);
      }
    };

    requestPushPermission();
  }, [user]);



  useEffect(() => {
    if (!isFirebaseEnabled) {
      setAuthLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, () => {
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  const normalizePhone = (p) => {
    if (!p) return '';
    let clean = p.replace(/\D/g, '');
    if (clean.startsWith('0') && clean.length === 10) return '233' + clean.slice(1);
    if (clean.length === 9) return '233' + clean;
    if (clean.startsWith('233') && clean.length === 12) return clean;
    // International numbers (e.g. +1, +86, +44) — keep as-is without country prefix mangling
    if (clean.length >= 10) return clean;
    return clean;
  };

  /**
   * Build a de-duped array of every possible client ID format for a given
   * phone number. Stored on `project.clientIds` so that phone-auth users whose
   * Firebase token uses "+233..." format can always match a project even when
   * the primary `clientId` was stored without the "+" prefix.
   */
  const buildClientIds = (primaryId, rawPhone) => {
    const ids = new Set();
    if (primaryId) ids.add(primaryId);
    const phone = rawPhone || primaryId || '';
    const digits = phone.replace(/\D/g, '');
    if (digits) {
      ids.add(digits);
      if (digits.startsWith('0') && digits.length === 10) {
        // Local format → add international variants
        ids.add('233' + digits.slice(1));
        ids.add('+233' + digits.slice(1));
      } else if (digits.startsWith('233') && digits.length === 12) {
        // 233... → add +233... and 0... variants
        ids.add('+' + digits);
        ids.add('0' + digits.slice(3));
      } else if (digits.length === 9) {
        // 9-digit local → add all variants
        ids.add('233' + digits);
        ids.add('+233' + digits);
        ids.add('0' + digits);
      }
    }
    return [...ids].filter(v => v && v.trim());
  };

  // sendMessage moved to useMessaging hook

  const submitTestimonial = async (data) => {
    if (!db) return;
    try {
      await addDoc(collection(db, 'testimonials'), { ...data, createdAt: serverTimestamp(), status: 'pending' });
      notify('success', 'Thank you for your feedback!');
    } catch (err) {
      notify('error', 'Failed to submit feedback. Please try again.');
    }
  };

  const dict = {
    en: { welcome: 'Welcome back', dashboard: 'Dashboard', orders: 'Orders', visualizer: 'AI Visualizer', chat: 'Live Chat', projects: 'Milestones', finance: 'Finance Hub' },
    fr: { welcome: 'Bienvenue', dashboard: 'Tableau de bord', orders: 'Commandes', visualizer: 'Visualiseur AI', chat: 'Chat en direct', projects: 'Projets', finance: 'Finances' }
  };
  const t = (k) => dict[lang][k] || k;
  
  const createNotification = async (userId, msg, type = 'info', link = null) => {
    if (!db) return;
    try {
      const text = sanitizeText(msg);
      await addDoc(collection(db, 'notifications'), {
        userId, message: text, msg: text, type, link,
        read: false,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      devWarn("Failed to create system notification:", err);
    }
  };

  const updateClientProfile = async (clientId, data) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'users', clientId), { ...data, updatedAt: serverTimestamp() });
      notify('success', 'Profile updated successfully');
      // Update local cache
      if (user?.id === clientId) {
        const updatedUser = { ...user, ...data };
        setUser(updatedUser);
        const cacheData = { ...updatedUser };
        delete cacheData.password;
        localStorage.setItem('westline_user_cache', JSON.stringify(cacheData));
      }
    } catch (e) {
      notify('error', 'Failed to update profile');
    }
  };

  // Listeners moved to AppContext



  const migrateToFirebase = async () => {
    if (!db) return;
    try {
      notify('pending', 'Initializing Westline Future CMS...');
      setLoading(true);

      const _adminUid1 = import.meta.env.VITE_ADMIN_UID_1;
      const _adminUid2 = import.meta.env.VITE_ADMIN_UID_2;
      const _clientUid1 = import.meta.env.VITE_CLIENT_UID_1;
      if (!_adminUid1 || !_adminUid2) {
        throw new Error('VITE_ADMIN_UID_1 and VITE_ADMIN_UID_2 must be set in .env before seeding.');
      }
      const DEMO_ACCOUNTS = [
        { email: 'admin@westlinefuture.com', role: 'admin', name: 'Super Admin', uid: _adminUid1 },
        { email: 'operations@westlinefuture.com', role: 'admin', name: 'Operations Admin', uid: _adminUid2 },
        ...(_clientUid1 ? [{ email: 'client@westlinefuture.com', role: 'client', name: 'Elite Client', username: 'elite_finish', uid: _clientUid1 }] : []),
      ];

      const seedUsers = async () => {
        const userMap = {};
        for (const acc of DEMO_ACCOUNTS) {
          const id = acc.uid || acc.email?.replace(/[.@]/g, '_') || acc.phone;
          if (!id) continue;
          userMap[acc.email || acc.phone] = id;
          await setDoc(doc(db, 'users', id), {
            id, name: acc.name,
            email: acc.email || `${acc.phone}@authorized.test`,
            username: acc.username || (acc.email ? acc.email.split('@')[0] : acc.phone),
            password: '[SECURED]', phone: acc.phone || '',
            role: acc.role || 'client', status: 'Active', joined: new Date().toISOString()
          }, { merge: true });
        }
        for (const m of TEAM_MEMBERS) {
          const uid = m.email ? m.email.replace(/[.@]/g, '_') : `STF_${m.id}`;
          await setDoc(doc(db, 'users', uid), { ...m, id: uid }, { merge: true });
        }
        return userMap;
      };

      const seedCMS = async () => {
        await setDoc(doc(db, 'cms_content', 'brand'), { content: BRAND0 }, { merge: true });
        await setDoc(doc(db, 'cms_content', 'hero'), { content: { slides: HERO_SLIDES } }, { merge: true });
        await setDoc(doc(db, 'cms_content', 'services'), { content: SERVICES_DATA }, { merge: true });
        await setDoc(doc(db, 'cms_content', 'portfolio'), { content: PORTFOLIO_DATA }, { merge: true });
        await setDoc(doc(db, 'cms_content', 'about'), { content: ABOUT_DATA }, { merge: true });
        await setDoc(doc(db, 'cms_content', 'products'), { content: GLASS_CATALOG_DATA }, { merge: true });
        await setDoc(doc(db, 'cms_content', 'categories'), { content: GLASS_CATALOG_CATEGORIES }, { merge: true });
      };

      const seedShowroom = async () => {
        for (const scene of DEFAULT_SCENES) {
          await setDoc(doc(db, 'showcase', scene.id), { ...scene, createdAt: new Date().toISOString() }, { merge: true });
        }
      };

      const seedProjects = async (userMap) => {
        const ALL_PROJECT_DATA = [
          {
            id: 'PROJ_001', title: 'Glasshouse Penthouse', name: 'Elite Client',
            email: 'client@westlinefuture.com', budget: '$250,000', progress: 45, stage: 5,
            cat: 'Structural Glazing & Interior',
            milestones: [
              { id: 'm1', name: 'Deposit (Initial)', amount: '$100,000', stageId: 1, status: 'Paid', paidAt: new Date().toISOString() },
              { id: 'm2', name: 'Production Phase', amount: '$100,000', stageId: 3, status: 'Pending' },
              { id: 'm3', name: 'Final Handover', amount: '$50,000', stageId: 8, status: 'Pending' }
            ]
          },
          {
            id: 'PROJ_002', title: 'Coastal Villa Skylight', name: 'Elite Client',
            email: 'client@westlinefuture.com', budget: '$85,000', progress: 15, stage: 2,
            cat: 'Custom Aluminum Fit-out',
            milestones: [
              { id: 'm1', name: 'Down Payment', amount: '$34,000', stageId: 1, status: 'Paid', paidAt: new Date().toISOString() },
              { id: 'm2', name: 'Material Procurement', amount: '$34,000', stageId: 3, status: 'Pending' },
              { id: 'm3', name: 'On-site Installation', amount: '$17,000', stageId: 5, status: 'Pending' }
            ]
          },
          ...CLIENTS_DATA.filter(c => c.email !== 'client@westlinefuture.com')
        ];

        for (const item of ALL_PROJECT_DATA) {
          const pid = item.id.toString();
          const cid = item.email ? (userMap[item.email] || item.email.replace(/[.@]/g, '_')) : `CL_${pid}`;

          if (!userMap[item.email]) {
            await setDoc(doc(db, 'users', cid), {
              id: cid, name: item.name,
              email: item.email || `${item.name.toLowerCase().replace(' ', '.')}@example.com`,
              phone: '+233 24 000 0000', company: 'Private Client',
              role: 'client', status: 'Active', joined: new Date().toISOString()
            }, { merge: true });
            userMap[item.email] = cid;
          }

          const projectBudget = parseFloat(item.budget?.replace(/[$,]/g, '') || 0);
          const defaultMilestones = [
            { id: 'm1', name: 'Deposit (40%)', amount: '$' + (projectBudget * 0.4).toLocaleString(), stageId: 1, status: 'Paid' },
            { id: 'm2', name: 'Production (40%)', amount: '$' + (projectBudget * 0.4).toLocaleString(), stageId: 3, status: 'Pending' },
            { id: 'm3', name: 'Final (20%)', amount: '$' + (projectBudget * 0.2).toLocaleString(), stageId: 8, status: 'Pending' }
          ];

          await setDoc(doc(db, 'projects', pid), {
            ...item, id: pid, title: item.project || item.title,
            clientId: cid, clientIds: buildClientIds(cid, item.phone || item.clientPhone),
            milestones: item.milestones || defaultMilestones,
            managerId: 'EMP001', createdAt: new Date().toISOString()
          }, { merge: true });

          await seedProjectPayment(pid, projectBudget);
          await seedProjectMedia(pid, item.stage);
          await seedProjectProcurement(pid, item);
          await seedProjectTransactions(pid, projectBudget);
          await seedProjectMaterials(pid);
          await seedProjectAssets(pid);
          await seedProjectJobs(pid, item);
          await seedProjectWorkOrder(pid, item);
          await seedProjectContainer(pid, item);
        }
      };

      const seedProjectPayment = async (pid, projectBudget) => {
        const invId = `INV-${pid}-01`;
        await setDoc(doc(db, 'projects', pid, 'payments', invId), {
          id: invId, title: 'Initial Deposit (40%)',
          amount: '$' + (projectBudget * 0.4).toLocaleString(),
          status: 'Paid', date: new Date().toISOString(),
          due: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          paidAt: new Date().toISOString(), method: 'Paystack'
        });
      };

      const seedProjectMedia = async (pid, stage) => {
        const demoMedia = [
          { url: 'https://images.unsplash.com/photo-1600585154340-be6199f7a096?auto=format&fit=crop&q=80', stageId: 1, type: 'image' },
          { url: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80', stageId: stage || 1, type: 'image' }
        ];
        for (const m of demoMedia) {
          await addDoc(collection(db, 'projects', pid, 'media'), { ...m, createdAt: new Date().toISOString() });
        }
      };

      const seedProjectProcurement = async (pid, item) => {
        if (item.email !== 'client@westlinefuture.com') return;
        await setDoc(doc(collection(db, 'projects', pid, 'procurements'), 'SHIP_' + pid + '_GLS'), {
          itemName: 'Reflective Glass Panels', source: 'Foshan, China',
          status: item.stage > 5 ? 'Received' : 'Shipped',
          estimatedCost: '18000', actualCost: '19500',
          eta: 'May 12, 2026', container: 'MSC-GT-' + pid
        }, { merge: true });
      };

      const seedProjectTransactions = async (pid, projectBudget) => {
        const txId = `TX-${pid}-01`;
        await setDoc(doc(db, 'projects', pid, 'transactions', txId), {
          id: txId, invoiceId: `INV-${pid}-01`,
          amount: (projectBudget * 0.4).toString(),
          date: new Date().toISOString().split('T')[0],
          method: 'Paystack', status: 'verified'
        });
      };

      const seedProjectMaterials = async (pid) => {
        const demoMaterials = [
          { id: 'mat1', name: 'Bronze Tinted Glass', specs: '12mm Tempered', imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80', desc: 'Sleek bronze finish for privacy and heat reduction.', status: 'pending' },
          { id: 'mat2', name: 'Black Matte Hinge', specs: 'Heavy-Duty Stainless', imageUrl: 'https://images.unsplash.com/photo-1581094380920-0966f38fe841?w=800&q=80', desc: 'Durable architectural finish matching the facade frame.', status: 'Approved' }
        ];
        for (const m of demoMaterials) {
          await setDoc(doc(db, 'projects', pid, 'materials', m.id), { ...m, createdAt: new Date().toISOString() });
        }
      };

      const seedProjectAssets = async (pid) => {
        const demoAssets = [
          { id: 'AST-101', name: 'Industrial Suction Rig (G-3)', siteId: pid, user: 'KO', status: 'In Use' },
          { id: 'AST-102', name: 'Precision Laser Level (Bosch)', siteId: pid, user: 'NB', status: 'In Use' }
        ];
        for (const a of demoAssets) {
          await setDoc(doc(db, 'assets', a.id), { ...a, createdAt: new Date().toISOString() });
        }
      };

      const seedProjectJobs = async (pid, item) => {
        const demoJobs = [
          { id: 'JOB-' + pid + '-01', projectId: pid, projectTitle: item.project || item.title, item: 'Main Frame Extrusions', stage: 'cutting', priority: 'High', panels: [{ id: 1, w: 2400, h: 1200, t: '12mm', f: 'Clear', status: 'Cut' }] },
          { id: 'JOB-' + pid + '-02', projectId: pid, projectTitle: item.project || item.title, item: 'Glass Panel Batch A', stage: 'queue', priority: 'Normal', panels: [{ id: 2, w: 900, h: 900, t: '8mm', f: 'Frost', status: 'Pending' }] }
        ];
        for (const j of demoJobs) {
          await setDoc(doc(db, 'jobs', j.id), { ...j, createdAt: new Date().toISOString() });
        }
      };

      const seedProjectWorkOrder = async (pid, item) => {
        const woId = `WO-${pid}-KITCHEN`;
        await setDoc(doc(db, 'work_orders', woId), {
          id: woId, projectId: pid,
          clientId: item.email === 'client@westlinefuture.com' ? 'ELITE-CLIENT' : (item.clientId || 'DEMO-CLIENT'),
          title: 'Modern Kitchen Fit-out', stage: item.stage,
          status: 'In Progress', atRisk: false, createdAt: new Date().toISOString()
        });
        return woId;
      };

      const seedProjectContainer = async (pid, item) => {
        if (item.email !== 'client@westlinefuture.com') return;
        const woId = `WO-${pid}-KITCHEN`;
        const contId = 'CONT-FOSHAN-098';
        await setDoc(doc(db, 'containers', contId), {
          id: contId, shipmentRef: 'MSC-GT-2026-098', clientId: 'ELITE-CLIENT',
          origin: 'Foshan, China', status: 'Sea',
          eta: 'May 12, 2026', atRisk: true,
          riskReason: 'Port Congestion at Destination', items: [woId]
        });
      };

      const seedProposals = async () => {
        for (const p of PROPOSALS_DATA) {
          await setDoc(doc(db, 'proposals', p.id), { ...p, createdAt: new Date().toISOString() }, { merge: true });
        }
      };

      const seedBookings = async () => {
        for (const b of BOOKINGS_DATA) {
          await setDoc(doc(db, 'bookings', b.id), { ...b, createdAt: new Date().toISOString() }, { merge: true });
        }
      };

      const seedEmailQueue = async () => {
        for (const m of EMAIL_QUEUE) {
          await setDoc(doc(db, 'emails', m.id), { ...m, createdAt: new Date().toISOString() }, { merge: true });
        }
      };

      const userMap = await seedUsers();
      await seedCMS();
      await seedShowroom();
      await seedProjects(userMap);
      await seedProposals();
      await seedBookings();
      await seedEmailQueue();

      notify('success', 'Westline Future Platform Deployed');
    } catch (err) {
      devErr("[MIGRATION ERROR]:", err);
      notify('error', 'Seeding failed. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const syncCatalogOnly = async () => {
    if (!db) return;
    try {
      notify('pending', 'Syncing catalog updates...');
      await setDoc(doc(db, 'cms_content', 'products'), { content: GLASS_CATALOG_DATA }, { merge: true });
      await setDoc(doc(db, 'cms_content', 'categories'), { content: GLASS_CATALOG_CATEGORIES }, { merge: true });
      notify('success', 'Catalog synchronized successfully.');
    } catch (err) {
      notify('error', 'Sync failed: ' + err.message);
    }
  };



  const logAction = useCallback(async (pid, type, action, projectTitle) => {
    if (!db) return;
    const log = { 
      user_id: user?.id || 'System', 
      user_name: user?.name || user?.email || 'System Account', 
      type: type || 'General', 
      action: action || 'Triggered', 
      project_title: projectTitle || 'System Core', 
      created_at: new Date().toISOString() 
    };
    try {
      if (pid) await addDoc(collection(db, 'projects', pid, 'activity_logs'), log);
      else await addDoc(collection(db, 'activity_logs'), log);
    } catch (error) { devErr("Logging failed:", error.message); }
  }, [user]);

  const notifyUser = async (userId, message, type, link = '') => {
    if (!userId || !db) return;
    try { await addDoc(collection(db, 'notifications'), { userId, message: sanitizeText(message), type, link, read: false, createdAt: new Date().toISOString() }); }
    catch (e) { devErr("Notification failed", e); }
  };

  const markNotificationRead = async (id) => {
    try { await updateDoc(doc(db, 'notifications', id), { read: true }); }
    catch (e) { devErr(e); }
  };

  // ✓ Removed checkManualSession — Firebase Auth's onAuthStateChanged() handles persistence securely

  const loginWithCredentials = async (username, password) => {
    // Wait up to 3s for Firebase to finish initialising on cold load
    let _attempts = 0;
    while ((!db || !isFirebaseEnabled) && _attempts < 6) {
      await new Promise(r => setTimeout(r, 500));
      _attempts++;
    }
    if (!db || !isFirebaseEnabled) {
      throw new Error("Database offline. Please check your internet connection.");
    }
    try {
      setAuthLoading(true);
      const isEmail = username.includes('@');
      const cleanUsername = isEmail ? username.trim().toLowerCase() : normalizePhone(username);
      const loginEmail = isEmail ? cleanUsername : `${cleanUsername}@clients.westlinefuture.com`;

      notify('pending', 'Authenticating with secure vault...');

      let authResult;
      try {
        authResult = await signInWithEmailAndPassword(auth, loginEmail, password);
      } catch (authErr) {
        throw new Error("Invalid credentials or profile not found.");
      }

      const sessionUser = authResult.user;
      const docId = isEmail ? sessionUser.uid : cleanUsername;
      
      // Now read the document!
      let uDoc = await getDoc(doc(db, 'users', docId));
      
      // Fallback for email users who might have document ID as email or uid
      if (isEmail && !uDoc.exists()) {
        const q = query(collection(db, 'users'), where('email', '==', cleanUsername), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty && snap.docs[0]) uDoc = snap.docs[0];
      }

      if (!uDoc || !uDoc.exists()) {
        throw new Error("Profile document not located in secure storage.");
      }

      const uData = uDoc.data();
      
      // Email-based users (admin/staff) have no phone — use Firebase UID as their id
      const fullUser = { ...uData, id: isEmail ? sessionUser.uid : normalizePhone(uData.phone || uDoc.id), uid: sessionUser.uid };
      delete fullUser.password;
      
      localStorage.setItem('westline_user_cache', JSON.stringify(fullUser));
      setUser(fullUser);
      // Removed clear rate limit
      setAuthLoading(false);
      setNotification(null);

      if (uData.onboarded === false) {
        await updateDoc(doc(db, 'users', uDoc.id), { onboarded: true });
      }

      navigate(
        fullUser.role === 'admin' || fullUser.role === 'staff' ? '/admin' :
        fullUser.role === 'worker' ? '/work' :
        '/portal'
      );
      notify('success', `Welcome back, ${uData.name}`);
      return fullUser;
    } catch (e) {
      devErr("[LOGIN ERROR]:", e);
      setAuthLoading(false);
      setNotification(null);
      notify('error', e.message);
      throw e;
    } finally {
      setAuthLoading(false);
    }
  };

  const updateEmailStatus = async (id, newStatus) => {
    setEmails(prev => prev.map(e => e.id === id ? { ...e, status: newStatus } : e));
    if (db) {
      try {
        await updateDoc(doc(db, 'emails', id), { status: newStatus });
        notify('success', `Status updated to ${newStatus}`);
      } catch (e) { devErr(e); }
    }
  };

  const resetUserPassword = async (clientId) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'users', clientId), { password: '[SECURED]', requiresPasswordChange: true });
      notify('success', 'Password reset flagged. Client will be prompted to set a new password on next login.');
      logAction(null, 'Security', `Administrator flagged password reset for client ${clientId}`);
    } catch (e) {
      notify('error', 'Failed to reset password.');
    }
  };

  const changeClientPassword = async (clientId, current, fresh) => {
    if (!auth?.currentUser) throw new Error("Not authenticated");
    try {
      const { EmailAuthProvider, reauthenticateWithCredential, updatePassword } = await import('firebase/auth');
      const credential = EmailAuthProvider.credential(auth.currentUser.email, current);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, fresh);
      if (db) await updateDoc(doc(db, 'users', clientId), { password: '[SECURED]', requiresPasswordChange: false });
      notify('success', 'Password updated successfully');
      logAction(null, 'Security', `Client ${clientId} updated their own password.`);
    } catch (e) {
      const msg = e.code === 'auth/invalid-credential' ? 'Current password is incorrect.' : (e.message || 'Failed to update password');
      notify('error', msg);
      throw new Error(msg);
    }
  };

  // --- PROJECT PROVISIONING ENGINE ---
  const convertInquiryToProject = async (inquiry, projectTitle, details) => {
    if (!db) return;
    try {
      notify('pending', `Provisioning industrial ecosystem for ${inquiry.fromName}...`);
      
      // 1. Create/Ensure User
      const userId = inquiry.fromEmail?.replace(/[.@]/g, '_') || normalizePhone(inquiry.fromPhone) || `USR_${Date.now()}`;
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          id: userId,
          name: inquiry.fromName,
          email: inquiry.fromEmail || `${userId}@clients.westlinefuture.com`,
          phone: inquiry.fromPhone || '',
          role: 'client',
          status: 'Active',
          joined: new Date().toISOString(),
          onboarded: false
        });
      }

      // 2. Create Project
      const projectId = `PRJ_${Date.now()}`;
      const projectRef = doc(db, 'projects', projectId);
      await setDoc(projectRef, {
        id: projectId,
        title: projectTitle,
        project: projectTitle,
        clientId: userId,
        clientIds: buildClientIds(userId, inquiry.fromPhone),
        stage: 1, // Phase 1: Initialization
        progress: 5,
        budget: details.budget || '$0',
        cat: details.type || 'Commercial',
        address: details.site || '',
        createdAt: new Date().toISOString(),
        managerId: user?.id || 'admin',
        status: 'Live'
      });

      // 3. Create Initial Work Order
      const woId = `WO_${projectId}_INITIAL`;
      await setDoc(doc(db, 'work_orders', woId), {
        id: woId,
        projectId: projectId,
        clientId: userId,
        title: `Site Survey & Initialization: ${projectTitle}`,
        stage: 1,
        status: 'In Progress',
        createdAt: new Date().toISOString()
      });

      // 4. Update Inquiry Status
      await updateDoc(doc(db, 'emails', inquiry.id), { 
        status: 'Converted', 
        projectId: projectId,
        convertedAt: new Date().toISOString() 
      });

      // 5. Create Notification
      await createNotification(userId, `Welcome to Westline Future! Your project "${projectTitle}" has been provisioned. Access your portal to track progress.`, 'success', '/portal');

      notify('success', `Ecosystem Deployed: Project ${projectId} is now live.`);
      logAction(projectId, 'Provisioning', `Administrator converted inquiry ${inquiry.id} into active project.`, projectTitle);
    } catch (err) {
      devErr("Provisioning failed:", err);
      notify('error', 'Project provisioning failed: ' + err.message);
    }
  };

  // Prefetch Catalog in background
  useEffect(() => {
    try {
      import('./catalog.jsx'); 
    } catch (e) {}
  }, []);

  // Handle redirection based on auth state
  useEffect(() => {
    if (user) {
      if (location.pathname === '/login') {
        navigate(
          user.role === 'admin' || user.role === 'staff' ? '/admin' :
          user.role === 'worker' ? '/work' :
          '/portal'
        );
      }
    }
  }, [user, location.pathname, navigate]);
  
  // Sync Brand Theme & Favicon
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', brand.theme || 'classic');
    if (brand.logo) {
      let link = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = brand.logo;
    }
  }, [brand.theme, brand.logo]);

  // Canonical invoice-paid check — normalises "Paid", "paid", "Paid in Full"
  const isPaid = (status) => ['paid', 'paid in full'].includes(String(status || '').toLowerCase().trim());

  const updateStage = async (projectId, stageId) => {
    try {
      // Unified 8-stage pipeline — always use CLIENT_PROJECT_STAGES
      const stageObj = CLIENT_PROJECT_STAGES.find(s => s.id === stageId);
      const clientStageName = stageObj?.name || `Stage ${stageId}`;
      const project = clients.find(p => p.id === projectId);

      // ✅ PHASE 3 FIX #13: Use centralized stage gate validation (was scattered in 2 places)
      const gates = checkStageGates(project, stageId, { invoices, changeRequests: [] });
      if (!gates.canAdvance) {
        gates.blockers.forEach(b => notify('error', `Stage locked: ${b.message}`));
        return;
      }

      if (stageObj) {
         if (stageObj.requiresPayment) {
            const projectInvoices = invoices.filter(i => i.parentId === projectId);
            const unpaid = projectInvoices.filter(i => !isPaid(i.status));
            if (unpaid.length > 0) {
               notify('error', 'Stage locked: Outstanding payments required.');
               return;
            }
         }
         
         // AUTOMATED MILESTONE INVOICING (8-stage pipeline)
         const invoiceTriggers = {
           1: { title: 'Initial Consultation & Design Deposit', percent: 10 },
           2: { title: 'Fabrication Commencement Payment', percent: 40 },
           4: { title: 'Pre-Installation Logistics Settlement', percent: 40 },
           8: { title: 'Final Handover & Quality Settlement', percent: 10 }
         };

         if (invoiceTriggers[stageId] && project) {
            const { title, percent } = invoiceTriggers[stageId];
            const baseBudget = parseFloat(String(project.budget || '0').replace(/[^0-9.]/g, '')) || 0;
            const amount = (baseBudget * percent) / 100;
            
            if (amount > 0) {
              const existing = invoices.find(i => i.parentId === projectId && i.title === title);
              if (!existing) {
                if (import.meta.env.DEV) devLog(`[AUTO-INVOICE] Generating ${title} for Project ${projectId}`);
                await createInvoice({
                  parentId: projectId,
                  clientId: project.clientId,
                  clientEmail: project.email,
                  title: title,
                  amount: amount,
                  date: new Date().toISOString().split('T')[0],
                  due: new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0],
                  status: 'Pending',
                  type: 'Milestone'
                });
                createNotification(project.clientId, `New Invoice Generated: ${title}`, 'info', '/portal');
              }
            }
         }

         // FEEDBACK LOOP: If stage is 8 (Handover), request feedback
         if (stageId === 8 && project) {
           createNotification(project.clientId, "Project Complete! We'd love to hear your feedback on your Westline Future experience.", "success", "/portal?action=feedback");
         }
      }
      
      const stageObjForPct = CLIENT_PROJECT_STAGES.find(s => s.id === stageId);
      await updateDoc(doc(db, 'projects', projectId), { stageId, progress: stageObjForPct?.pct ?? Math.round((stageId / 8) * 100) });

      // Notify client of stage change (only when admin moves project forward)
      if (project?.clientId) {
        const clientMsg = stageObj?.clientMsg || `Your project has progressed to ${clientStageName}.`;
        createNotification(project.clientId, `📍 Project Update: "${project.title || 'Your project'}" has moved to ${clientStageName}. ${clientMsg}`, 'info', `/portal?projectId=${projectId}`);
      }

      logAction(projectId, 'Stage', `Moved to Stage ${stageId} — ${clientStageName}`);
    } catch (e) { devErr(e); }
  };

  const createProposal = async (data) => {
    if (!db) return;
    try {
      const docRef = await addDoc(collection(db, 'proposals'), {
        ...data,
        createdAt: new Date().toISOString(),
        status: data.status || 'pending'
      });
      notify('success', 'Document Generated & Saved');
      return docRef.id;
    } catch (err) {
      devErr(err);
      notify('error', 'Generation failed');
    }
  };

  const updateProposal = async (id, data) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'proposals', id), { ...data, updatedAt: new Date().toISOString() });
      notify('success', 'Quote Updated');
    } catch (err) {
      devErr(err);
      notify('error', 'Update failed');
    }
  };

  // ✅ PHASE 4: Add idempotency + error handling to prevent duplicate invoices
  const createInvoice = async (data) => {
    if (!db) return;
    try {
      const idempotencyKey = generateIdempotencyKey('invoice');
      saveIdempotencyKey(idempotencyKey, 'invoice');

      const resolvedProjectId = data.projectId || data.parentId;
      const numericAmount = Number(String(data.total ?? data.amount ?? 0).replace(/[^0-9.-]/g, '')) || 0;
      const normalizedItems = Array.isArray(data.items) && data.items.length > 0
        ? data.items
        : numericAmount > 0
          ? [{
              desc: data.title || 'Project payment',
              notes: data.description || '',
              qty: 1,
              rate: numericAmount,
              unit: data.milestoneKey ? 'stage' : 'item',
              total: numericAmount,
            }]
          : [];
      const currentPaid = Number(data.amountPaid ?? data.paidAmount ?? 0) || 0;
      const finalData = {
        ...data,
        amount: numericAmount,
        total: numericAmount,
        amountDue: numericAmount,
        balanceDue: Math.max(0, numericAmount - currentPaid),
        amountPaid: currentPaid,
        paidAmount: currentPaid,
        items: normalizedItems,
        projectId: resolvedProjectId,
        parentId: resolvedProjectId,
      };

      const docRef = await addDoc(collection(db, 'invoices'), {
        ...finalData,
        idempotencyKey, // Track to prevent duplicates
        createdAt: new Date().toISOString(),
        status: finalData.status || 'Pending'
      });
      notify('success', 'Official Invoice Issued');
      return docRef.id;
    } catch (err) {
      logFirebaseError(err, 'createInvoice');
      notify('error', getFirebaseErrorMessage(err));
    }
  };

  // ✅ PHASE 4: Better error messages
  const updateInvoice = async (id, updates) => {
    if (!db || !id) return;
    try {
      await updateDoc(doc(db, 'invoices', id), updates);
      notify('success', 'Invoice updated');
    } catch (err) {
      logFirebaseError(err, 'updateInvoice');
      notify('error', getFirebaseErrorMessage(err));
    }
  };

  const deleteInvoice = async (id) => {
    if (!db || !id) return;
    try {
      await deleteDoc(doc(db, 'invoices', id));
      notify('success', 'Invoice deleted');
    } catch (err) {
      logFirebaseError(err, 'deleteInvoice');
      notify('error', getFirebaseErrorMessage(err));
    }
  };

  const deleteProposal = async (id) => {
    if (!db || !id) return;
    try {
      await deleteDoc(doc(db, 'proposals', id));
      notify('success', 'Quotation deleted');
    } catch (err) {
      notify('error', 'Failed to delete quotation');
    }
  };

  const createApproval = async (projectId, data) => {
    if (!db) return;
    try {
      const approvalProject = clients.find(p => p.id === projectId);
      const approvalClient = approvalProject ? dbClients.find(c => c.id === approvalProject.clientId) : null;
      await addDoc(collection(db, 'approvals'), {
        ...data,
        projectId,
        projectTitle: approvalProject?.title || approvalProject?.project || approvalProject?.name || '',
        clientId: approvalClient?.id || approvalProject?.clientId || '',
        clientName: approvalClient?.name || '',
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
      if (approvalClient?.id) notifyUser(approvalClient.id, `New approval item on "${approvalProject?.title || 'your project'}" requires your review`, "approval", `/portal?projectId=${projectId}`);
      logAction(projectId, 'Approval', `New approval request: ${data.type || data.title}`);
    } catch (e) { devErr(e); }
  };

  const updateApproval = async (id, data, projectId) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'approvals', id), { ...data, updatedAt: new Date().toISOString() });
      if (projectId) {
        const approvalProject = clients.find(p => p.id === projectId);
        logAction(projectId, 'Approval', `${data.status === 'approved' ? '✅' : '❌'} Approval "${data.title || id}" marked ${data.status}${data.clientNote ? ` — note: "${data.clientNote}"` : ''}`);
        // Notify admin of client response
        if (data.status && approvalProject) {
          (teamMembers || []).filter(m => m.role === 'admin' || m.role === 'staff').forEach(admin => {
            notifyUser(admin.id, `Client ${data.status === 'approved' ? 'approved' : 'rejected'} an approval item on "${approvalProject.title || 'a project'}"`, data.status === 'approved' ? 'success' : 'warning');
          });
        }
      }
    } catch (e) { devErr(e); }
  };

  const createChangeRequest = async (projectId, data) => {
    if (!db) return;
    try {
      await addDoc(collection(db, 'change_requests'), { ...data, projectId, status: 'pending', createdAt: new Date().toISOString() });
      // Notify Admin
      (teamMembers || []).filter(m => m.role === 'admin').forEach(admin => {
        notifyUser(admin.id, "New change request submitted by client", "change_request");
      });
    } catch (e) { devErr(e); }
  };

  const updateChangeRequest = async (id, data, projectId) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'change_requests', id), data);
      logAction(projectId, 'ChangeRequest', `Request ${id} updated to ${data.status}`);
    } catch (e) { devErr(e); }
  };

  const payInvoice = async (id, projectId, method = 'Paystack') => {
    if (!db) return;
    try {
      const inv = invoices.find(i => i.id === id);
      const project = clients.find(p => p.id === projectId);
      const invoiceTotal = Number(inv?.amount || inv?.total || 0);
      const currentPaid = Number(inv?.amountPaid || inv?.paidAmount || 0);
      const amount = Math.max(0, invoiceTotal - currentPaid) || invoiceTotal;
      const paidAt = new Date().toISOString();
      const paymentUpdate = {
        status: 'Paid',
        amountPaid: amount,
        paidAmount: amount,
        paidAt,
        method,
        awaitingConfirmation: false,
      };

      await updateDoc(doc(db, 'invoices', id), paymentUpdate);
      await setDoc(doc(db, 'projects', projectId, 'payments', id), paymentUpdate, { merge: true });

      const txId = `TX-${Date.now()}`;
      const newTx = {
        id: txId,
        invoiceId: id,
        projectId,
        parentId: projectId,
        clientId: project?.clientId || inv?.clientId || '',
        projectManagerId: project?.projectManagerId || project?.assignedStaff?.[0] || null,
        amount,
        date: new Date().toISOString().split('T')[0],
        method,
        status: 'verified',
        type: inv?.type || 'payment',
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'projects', projectId, 'transactions', txId), newTx);
      await setDoc(doc(db, 'transactions', txId), newTx);
      const invoiceDescriptor = `${inv?.title || ''} ${inv?.type || ''} ${inv?.documentKind || ''}`.toLowerCase();
      const isInitialDeposit = inv?.milestoneKey === 'post-rendering'
        || invoiceDescriptor.includes('deposit')
        || invoiceDescriptor.includes('first instalment')
        || invoiceDescriptor.includes('first installment');
      await updateDoc(doc(db, 'projects', projectId), {
        paidAmount: increment(amount),
        ...(isInitialDeposit ? {
          depositPaid: true,
          depositPaidAt: serverTimestamp(),
          initialDepositInvoiceId: id,
        } : {}),
        updatedAt: serverTimestamp(),
      });

      const recipients = [...new Set(['admin', project?.projectManagerId, ...(project?.assignedStaff || [])].filter(Boolean))];
      await Promise.all(recipients.map(recipientId =>
        createNotification(recipientId, `Payment received: GH₵${amount.toLocaleString()} for invoice ${id} via ${method}`, 'payment', `/admin/client-hub`)
          .catch(() => null)
      ));
      notify('success', `Payment of GH₵${amount.toLocaleString()} confirmed via ${method}`);
    } catch (e) { devErr(e); }
  };

  const recordOfflinePayment = async (pid, amount, method, ref) => {
    if (!db) return;
    try {
      const newTx = {
        parentId: pid,
        projectId: pid,
        invoiceId: ref || 'Manual Entry',
        amount: Number(amount),
        date: new Date().toISOString().split('T')[0],
        method,
        status: 'verified',
        type: 'payment',
        createdAt: serverTimestamp(),
      };
      const project = clients.find(p => p.id === pid);
      const matchingInvoice = invoices.find(inv =>
        inv.id === ref ||
        inv.invoiceNumber === ref ||
        ((inv.projectId === pid || inv.parentId === pid) && inv.awaitingConfirmation === true)
      );
      const clientId = project?.clientId || matchingInvoice?.clientId || '';
      const managerId = project?.projectManagerId || project?.assignedStaff?.[0] || null;
      const enrichedTx = { ...newTx, clientId, projectManagerId: managerId };
      const projectTxRef = await addDoc(collection(db, 'projects', pid, 'transactions'), enrichedTx);
      await setDoc(doc(db, 'transactions', projectTxRef.id), {
        ...enrichedTx,
        projectTransactionId: projectTxRef.id,
      });
      await updateDoc(doc(db, 'projects', pid), {
        paidAmount: increment(Number(amount)),
        updatedAt: serverTimestamp(),
      });

      if (matchingInvoice?.id) {
        const currentPaid = Number(matchingInvoice.amountPaid || matchingInvoice.paidAmount || 0);
        const invoiceTotal = Number(matchingInvoice.amount || matchingInvoice.total || 0);
        const newPaid = currentPaid + Number(amount);
        await updateDoc(doc(db, 'invoices', matchingInvoice.id), {
          amountPaid: newPaid,
          paidAmount: newPaid,
          status: invoiceTotal > 0 && newPaid < invoiceTotal ? 'Partially Paid' : 'Paid',
          awaitingConfirmation: false,
          paidAt: new Date().toISOString(),
          method,
          paymentConfirmedAt: serverTimestamp(),
          paymentConfirmedBy: user?.uid || user?.id || 'admin',
        });

        const invoiceDescriptor = `${matchingInvoice.title || ''} ${matchingInvoice.type || ''} ${matchingInvoice.documentKind || ''}`.toLowerCase();
        const isInitialDeposit = matchingInvoice.milestoneKey === 'post-rendering'
          || invoiceDescriptor.includes('deposit')
          || invoiceDescriptor.includes('first instalment')
          || invoiceDescriptor.includes('first installment');
        if (isInitialDeposit && (invoiceTotal <= 0 || newPaid >= invoiceTotal)) {
          await updateDoc(doc(db, 'projects', pid), {
            depositPaid: true,
            depositPaidAt: serverTimestamp(),
            initialDepositInvoiceId: matchingInvoice.id,
            updatedAt: serverTimestamp(),
          });
        }
      }

      // Notify client, admin, and assigned project manager that payment was received
      if (project?.clientId) {
        const msg = `Payment of GH₵ ${Number(amount).toLocaleString()} confirmed for "${project.title || 'your project'}" via ${method}. Thank you!`;
        await createNotification(project.clientId, msg, 'payment', '/portal');
      }
      const staffRecipients = [...new Set(['admin', managerId, ...(project?.assignedStaff || [])].filter(Boolean))];
      await Promise.all(staffRecipients.map(recipientId =>
        createNotification(recipientId, `Offline payment of GH₵${Number(amount).toLocaleString()} recorded for "${project?.title || pid}" via ${method}.`, 'payment_received', '/admin/client-hub')
          .catch(() => null)
      ));

      logAction(pid, 'Finance', `Offline payment of GH₵${amount} recorded via ${method} (${ref})`);
      notify('success', 'Manual payment recorded — client notified');
    } catch (e) {
      notify('error', 'Failed to record payment: ' + e.message);
    }
  };

  const syncProjects = async (id, fields) => {
    if (!db) return;
    try {
      notify('pending', 'Updating...');
      await updateDoc(doc(db, 'projects', id), fields);
      notify('success', 'Updated');
    } catch (err) { notify('error', 'Failed'); }
  };

  const getSLA = (client) => {
    if (!client?.startDate) return { date: 'TBD', delayed: false };
    const start = new Date(client.startDate);
    const totalDays = PROJECT_STAGES.slice(0, client.stage || 1).reduce((sum, s) => sum + s.days, 0);
    const deadline = new Date(start.getTime() + totalDays * 24 * 60 * 60 * 1000);
    return { date: deadline.toLocaleDateString(), delayed: new Date() > deadline };
  };

  const calculateProjectPulse = (pid) => {
    const proj = clients.find(p => p.id === pid);
    if (!proj) return 0;
    
    // 1. Stage Progress (40%)
    const stagePct = ((proj.stageId || 1) / 8) * 100;
    
    // 2. Procurement Progress (40%)
    const myProcs = procurements.filter(p => p.parentId === pid);
    const procPct = myProcs.length > 0 ? (myProcs.filter(p => ['transit', 'site'].includes(p.status)).length / myProcs.length) * 100 : 0;
    
    // 3. Task Progress (20%)
    const myTasks = tasks.filter(t => t.parentId === pid);
    const taskPct = myTasks.length > 0 ? (myTasks.filter(t => t.status === 'Done').length / myTasks.length) * 100 : 0;
    
    const combined = (stagePct * 0.4) + (procPct * 0.4) + (taskPct * 0.2);
    return Math.round(combined);
  };

  const createProcurement = async (projectId, data) => {
    if (!db) return;
    try { await addDoc(collection(db, 'projects', projectId, 'procurements'), { ...data, createdAt: new Date().toISOString() }); notify('success', 'Tracker Updated'); } 
    catch(e) { notify('error', 'Failed to update procurement'); }
  };
  const updateProcurement = async (projectId, id, data) => {
    if (!db) return;
    try { await updateDoc(doc(db, 'projects', projectId, 'procurements', id), data); notify('success', 'Tracker Updated'); } 
    catch(e) { notify('error', 'Failed to update procurement'); }
  };
  const deleteProcurement = async (projectId, id) => {
    if (!db) return;
    try { await deleteDoc(doc(db, 'projects', projectId, 'procurements', id)); notify('success', 'Tracker Item Deleted'); } 
    catch(e) { notify('error', 'Failed to delete tracking item'); }
  };

  const updateMaterial = async (projectId, id, data) => {
    if (!db) return;
    try { await updateDoc(doc(db, 'projects', projectId, 'materials', id), data); }
    catch(e) { devErr(e); }
  };

  const updateAsset = async (id, data) => {
    if (!db) return;
    try { await updateDoc(doc(db, 'assets', id), data); }
    catch(e) { devErr(e); }
  };

  const createShipment = async (data) => {
    if (!db) return;
    try { 
      // Shipments are linked to a project, default to first active if not specified
      const pid = data.projectId || (clients.length > 0 ? clients[0].id : null);
      if (!pid) return notify('error', 'No project selected for shipment');
      await addDoc(collection(db, 'projects', pid, 'procurements'), { ...data, isShipment: true, createdAt: new Date().toISOString() }); 
      notify('success', 'Shipment Tracked'); 
    } catch(e) { notify('error', 'Failed to create shipment'); }
  };
  const updateShipment = async (id, fields) => {
    if (!db) return;
    try {
      const s = shipments.find(x => x.id === id);
      if (!s || !s.parentId) return notify('error', 'Shipment context not found');
      await updateDoc(doc(db, 'projects', s.parentId, 'procurements', id), fields);
      notify('success', 'Shipment Updated');
    } catch(e) { notify('error', 'Failed to update shipment'); }
  };

  const createNote = async (projectId, data) => {
    if (!db) return;
    try { await addDoc(collection(db, 'projects', projectId, 'notes'), { ...data, createdAt: new Date().toISOString() }); }
    catch(e) { devErr(e); }
  };
  const deleteNote = async (projectId, id) => {
    if (!db) return;
    try { await deleteDoc(doc(db, 'projects', projectId, 'notes', id)); }
    catch(e) { devErr(e); }
  };

  const deleteProject = async (projectId, reason = '') => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'projects', projectId), {
        status: 'Archived',
        projectLifecycleStatus: 'Archived',
        archivedAt: serverTimestamp(),
        archivedBy: user?.uid || user?.id || 'admin',
        archiveReason: sanitizeText(reason || 'Archived from project board'),
        updatedAt: serverTimestamp(),
      });
      await addDoc(collection(db, 'projects', projectId, 'messages'), {
        text: `Project archived. Reason: ${sanitizeText(reason || 'Archived from project board')}`,
        senderRole: 'system',
        senderId: 'system',
        senderName: 'Westline Future',
        isInternal: true,
        createdAt: serverTimestamp(),
      });
      notify('success', 'Project archived. Audit trail preserved.');
    } catch (e) {
      devErr(e);
      notify('error', 'Failed to archive project');
    }
  };
  // uploadMedia moved to useFileUpload hook

  const deleteMedia = async (id) => {
    if (!db) return;
    try { await deleteDoc(doc(db, 'media', id)); notify('success', 'Media removed'); }
    catch(e) { devErr(e); }
  };

  const createJob = async (data) => {
    if (!db) return;
    try { await addDoc(collection(db, 'jobs'), { ...data, createdAt: new Date().toISOString() }); notify('success', 'Job deployed to factory'); }
    catch(e) { devErr(e); }
  };

  const updateJob = async (id, data) => {
    if (!db) return;
    try { await updateDoc(doc(db, 'jobs', id), data); }
    catch(e) { devErr(e); }
  };

  // sendSMSUpdate — sends an SMS to the client when their project advances
  const sendWhatsAppUpdate = async (clientId, projectId, stageName) => {
    if (user?.role === 'client') return; // clients cannot trigger admin-only SMS
    try {
      const client = clients.find(c => c.id === clientId);
      if (!client?.phone) return;
      const project = projects.find(p => p.id === projectId);
      const firstName = (client.name || '').split(' ')[0] || 'there';
      const projectTitle = project?.title || 'your project';
      const message = `Hi ${firstName}, your project "${projectTitle}" has moved to the ${stageName} stage. Log in to your portal to see what's next: https://westlinefuture.web.app`;
      const fn = httpsCallable(functions, 'sendSMS');
      await fn({ to: client.phone, message });
      if (import.meta.env.DEV) console.log(`[sendWhatsAppUpdate] SMS sent to ${client.phone}`);
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[sendWhatsAppUpdate] SMS failed (non-fatal):', e?.message);
    }
  };

  const syncCMS = async (key, value) => {
    notify('pending', 'Saving changes...');
    // Always update local state immediately so demo mode works seamlessly
    setContent(prev => ({ ...prev, [key]: value }));
    if (key === 'brand') setBrand(value);

    if (db) {
      try {
        await setDoc(doc(db, 'cms_content', key), { content: value });
        notify('success', 'Changes saved successfully');
      } catch (e) {
        devWarn("Firebase CMS sync failed (likely mock demo mode). Local state updated.", e);
        notify('success', 'Demo Mode: Changes saved locally');
      }
    } else {
      notify('success', 'Offline Mode: Changes saved locally');
    }
  };

  const submitMarketplaceInquiry = async (data) => {
    const payload = {
      id: `MKT-${Math.floor(1000 + Math.random() * 9000)}`,
      toName: data.name,
      subject: `Marketplace Inquiry: ${data.productName} (Qty: ${data.quantity})`,
      status: 'pending',
      type: 'Marketplace Order',
      sentAt: new Date().toLocaleDateString(),
      details: data
    };
    setEmails(prev => [payload, ...prev]);
    if (db) {
      try {
        await setDoc(doc(db, 'emails', payload.id), payload);
      } catch (e) {
        devErr("Failed to sync marketplace inquiry:", e);
      }
    }
  };

  const submitContactInquiry = async (data) => {
    const payload = {
      id: `CON-${Math.floor(1000 + Math.random() * 9000)}`,
      fromName: `${data.firstName} ${data.lastName}`,
      fromEmail: data.email,
      subject: `Inquiry: ${data.subject || 'General Consultation'}`,
      status: 'pending',
      type: data.inquiryType || 'General Inquiry',
      sentAt: new Date().toLocaleDateString(),
      details: data
    };
    if (db) {
      try {
        await setDoc(doc(db, 'emails', payload.id), payload);
        setEmails(prev => [payload, ...prev]);
        notify('success', 'Inquiry sent successfully to our procurement team.');
      } catch (e) {
        devErr("Failed to sync contact inquiry:", e);
        notify('error', 'Message dispatch failed. Please try again or call us.');
        throw e;
      }
    }
  };
  
  const createClient = async (data) => {
    try {
      if (!db) {
        notify('error', 'System unavailable');
        return;
      }
      if (!data.phone) throw new Error('A valid phone number is required.');

      notify('pending', 'Registering client...');

      let id = String(data.phone).replace(/\D/g, "");
      if (id.startsWith("0")) id = "233" + id.slice(1);

      const userRef = doc(db, 'users', id);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        await setDoc(userRef, { ...data, phone: id, updatedAt: serverTimestamp() }, { merge: true });
        notify('success', 'Existing client record updated.');
        return;
      }

      const payload = {
        ...data,
        id,
        phone: id,
        role: "client",
        status: "Active",
        joined: new Date().toISOString(),
        onboarded: false,
        createdAt: serverTimestamp(),
      };

      await setDoc(userRef, payload);
      notify('success', `${data.name} registered successfully.`);
      logAction(null, 'CRM', `Onboarded Client: ${data.name} (${id})`);
      await createNotification(id, 'Welcome to Westline Future! Your project portal is now active.', 'success', '/portal');

    } catch (e) {
      devErr('[CRM] Registration Error:', e);
      notify('error', e.message || 'Failed to register client.');
    }
  };


  const updateClient = async (id, data) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'users', id), data);
      notify('success', 'Client profile updated');
      logAction(null, 'CRM', `Updated Client: ${id}`);
    } catch (e) {
      notify('error', 'Update failed: ' + e.message);
    }
  };


  const createProject = async (data) => {
    if (!db) return;
    try {
      const rawId = typeof data.clientId === 'object' ? data.clientId?.id : data.clientId;
      const id = normalizePhone(rawId);
      if (!id) throw new Error("Identifier Validation Failed: Client ID is required.");

      const docRef = await addDoc(collection(db, 'projects'), {
        ...data,
        clientId: id,
        clientIds: buildClientIds(id, data.phone || data.clientPhone),
        status: 'Initialized',
        progress: 0,
        createdAt: new Date().toISOString()
      });
      notify('success', 'Project initialized for client portal.');
      logAction(id, 'Operations', `Started Project: ${data.project}`);
      return docRef.id;
    } catch (e) {
      notify('error', 'Project creation failed');
    }
  };

  const buildDefaultMilestones = (budget, paymentSchedule = 'standard') => {
    const num = parseFloat(String(budget).replace(/[^0-9.]/g, '')) || 0;
    if (!num) return [];
    const fmt = (v) => `GH₵ ${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    const ts = Date.now();
    const SCHEDULES = {
      standard: [
        { name: '10% Deposit',        pct: 0.10, stageId: 1 },
        { name: '40% Pre-production', pct: 0.40, stageId: 3 },
        { name: '40% Pre-delivery',   pct: 0.40, stageId: 6 },
        { name: '10% Completion',     pct: 0.10, stageId: 8 },
      ],
      '70-30': [
        { name: '70% Before Delivery', pct: 0.70, stageId: 3 },
        { name: '30% After Delivery',  pct: 0.30, stageId: 8 },
      ],
    };
    const template = SCHEDULES[paymentSchedule] || SCHEDULES.standard;
    return template.map((m, i) => ({
      id: `ms_${ts}_${i}`,
      name: m.name,
      pct: m.pct,
      amount: fmt(num * m.pct),
      stageId: m.stageId,
      status: 'Pending',
    }));
  };

  const createClientProject = async (data) => {
    if (!db) return;
    try {
      const clientId = typeof data.clientId === 'object' ? data.clientId?.id : data.clientId;
      if (!clientId) throw new Error('Client ID is required.');
      const milestones = data.milestones?.length ? data.milestones : buildDefaultMilestones(data.budget, data.paymentSchedule);
      const effectiveDate = data.projectDate ? new Date(data.projectDate).toISOString() : new Date().toISOString();
      const selectedWorkerIds = [data.assignedWorker].filter(Boolean);
      const selectedStaffIds = [data.assignedStaff].filter(Boolean);

      // Pre-compute the timeline from project creation date so Gantt + client portal show real dates immediately
      const projectTypeStages = CLIENT_PROJECT_STAGES.filter(s => {
        const typeStageIds = (data.projectType === 'buy-only' ? [1,2,3,4,5,7,8] : [1,2,3,4,5,6,7,8]);
        return typeStageIds.includes(s.id);
      });
      const initialTimeline = calculateTimeline(effectiveDate, {}, projectTypeStages);

      const stageTimelines = (CLIENT_PROJECT_STAGES || []).map(stage => ({
        stageId: stage.id,
        name: stage.name,
        estimatedStartDate: stage.id === 1 ? (data.estimatedStartDate || data.projectDate || null) : null,
        estimatedEndDate: stage.id === 8 ? (data.targetCompletionDate || null) : null,
        actualStartDate: stage.id === 1 ? effectiveDate : null,
        actualEndDate: null,
        status: stage.id === 1 ? 'On track' : 'Not started',
        owner: stage.whoActs || 'admin',
        delayReason: '',
        clientVisibleNote: '',
        internalNote: '',
      }));
      const docRef = await addDoc(collection(db, 'projects'), {
        title: sanitizeText(data.title || 'New Project'),
        clientId,
        clientIds: buildClientIds(clientId, data.phone || data.clientPhone),
        projectType: data.projectType || 'full-service',
        stageId: 1,
        status: 'Active',
        projectLifecycleStatus: 'Active',
        budget: data.budget || '',
        projectTotal: data.budget || '',
        renderingFee: data.renderingFee || '',
        renderingStatus: 'not_started',
        renderingFeePaid: false,
        renderingUnlocked: false,
        renderingApproved: false,
        quoteStatus: 'not_started',
        quoteApproved: false,
        depositPaid: false,
        nextAction: data.renderingFee ? 'Create and send rendering fee invoice' : 'Confirm rendering fee and upload design package',
        breakdown: data.breakdown || null,
        paymentSchedule: data.paymentSchedule || 'standard',
        kickoffMode: data.kickoffMode || 'rendering-first',
        description: sanitizeText(data.description || ''),
        milestones,
        assignedWorkers: selectedWorkerIds,
        assignedStaff: selectedStaffIds,
        projectManagerId: data.assignedStaff || null,
        estimatedStartDate: data.estimatedStartDate || data.projectDate || null,
        targetCompletionDate: data.targetCompletionDate || null,
        stageTimelines,
        timeline: initialTimeline,
        stageHistory: [{ stageId: 1, note: data.projectDate ? `Project created (backdated to ${data.projectDate})` : 'Project created', timestamp: effectiveDate, byRole: 'admin' }],
        createdAt: data.projectDate ? effectiveDate : serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      // Auto-generate rendering fee invoice if provided
      if (data.renderingFee) {
        const rawFee = parseFloat(String(data.renderingFee).replace(/[^0-9.]/g, '')) || 0;
        if (rawFee > 0) {
          const invRef = await addDoc(collection(db, 'invoices'), {
            parentId: docRef.id,
            projectId: docRef.id,  // both fields for dual-query compatibility
            clientId: clientId,
            clientEmail: data.clientEmail || '',
            title: 'Design & Rendering Fee',
            amount: rawFee,
            date: data.projectDate ? new Date(data.projectDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            due: new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0],
            status: 'Pending',
            type: 'Design',
            autoGenerated: true,
            createdAt: serverTimestamp()
          });
          await updateDoc(docRef, { renderingFeeInvoiceId: invRef.id });
        }
      }
      // Auto-generate milestone invoices from payment schedule
      const parsedBudget = parseFloat(String(data.budget || '0').replace(/[^0-9.]/g, '')) || 0;
      const schedule = data.paymentSchedule || 'standard';
      const today = new Date().toISOString().split('T')[0];

      if (parsedBudget > 0) {
        let milestonesToGenerate = [];

        if (schedule === 'custom' && data.customMilestones?.length) {
          // Build cumPct on the fly and use admin-defined milestones
          let running = 0;
          milestonesToGenerate = data.customMilestones
            .filter(m => m.label && m.pct > 0)
            .map(m => {
              running += m.pct;
              return { ...m, cumPct: parseFloat(running.toFixed(4)) };
            });
        } else if (schedule !== 'custom') {
          const scheduleConfig = SCHEDULE_CONFIGS[schedule] || SCHEDULE_CONFIGS.standard;
          milestonesToGenerate = scheduleConfig.milestones || [];
        }

        for (const milestone of milestonesToGenerate) {
          await addDoc(collection(db, 'invoices'), {
            parentId: docRef.id,
            projectId: docRef.id,
            clientId: clientId,
            title: milestone.label,
            amount: parseFloat((parsedBudget * milestone.pct).toFixed(2)),
            type: 'Milestone',
            status: 'Pending',
            milestoneKey: milestone.key,
            date: today,
            due: null,
            autoGenerated: true,
            createdAt: serverTimestamp(),
          });
        }
      }

      await addDoc(collection(db, 'projects', docRef.id, 'messages'), {
        text: `Project "${data.title}" has been created. Our team will be in touch shortly.`,
        senderRole: 'system', senderId: 'system', senderName: 'Westline Future',
        isInternal: false, createdAt: serverTimestamp(),
      });
      await createNotification(clientId, `New project "${data.title}" has been created for you.`, 'info', '/portal');
      notify('success', `Project "${data.title}" created`);
      logAction(clientId, 'Projects', `Created project: ${data.title}`);
      return docRef.id;
    } catch (e) {
      notify('error', 'Failed to create project: ' + e.message);
    }
  };

  const updateProjectStage = async (projectId, newStageId, note = '', options = {}) => {
    if (!db) return;
    try {
      const snap = await getDoc(doc(db, 'projects', projectId));
      if (!snap.exists()) throw new Error('Project not found');
      const data = snap.data();
      const effectiveTimestamp = options.overrideDate
        ? new Date(options.overrideDate).toISOString()
        : new Date().toISOString();
      const stageHistory = [...(data.stageHistory || []), {
        stageId: newStageId, note: sanitizeText(note) || 'Stage advanced',
        timestamp: effectiveTimestamp, byRole: 'admin',
        gateOverride: !!options.gateOverride,
        gateChecks: options.gateChecks || [],
        clientVisibleNote: sanitizeText(options.clientVisibleNote || ''),
        ...(options.overrideDate ? { backdated: true } : {}),
      }];
      await updateDoc(doc(db, 'projects', projectId), {
        stageId: newStageId,
        status: newStageId === 8 ? 'Completed' : 'Active',
        previousStageId: data.stageId || null,
        lastStageAdvancedAt: serverTimestamp(),
        lastStageAdvancedBy: user?.uid || user?.id || 'admin',
        lastGateOverride: !!options.gateOverride,
        timelineStatus: options.timelineStatus || data.timelineStatus || 'On track',
        clientVisibleStageNote: sanitizeText(options.clientVisibleNote || ''),
        stageHistory, updatedAt: serverTimestamp(),
      });
      const stage = CLIENT_PROJECT_STAGES.find(s => s.id === newStageId);

      // ── Auto-generate handover certificate when project reaches Stage 8 ──────
      if (newStageId === 8) {
        try {
          const handoverDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
          await addDoc(collection(db, 'projects', projectId, 'documents'), {
            name: 'Project Handover Certificate',
            type: 'handover',
            fileType: 'pdf',
            stageId: 8,
            uploadedBy: 'Westline Future',
            clientId: data.clientId || null,
            clientName: data.clientName || null,
            projectTitle: data.title || null,
            projectType: data.projectType || null,
            handoverDate,
            isAutoGenerated: true,
            createdAt: serverTimestamp(),
          });
        } catch (_) {}
      }

      try {
        await addDoc(collection(db, 'projects', projectId, 'messages'), {
          text: `Stage updated to: ${stage?.name || `Stage ${newStageId}`}. ${stage?.clientMsg || ''}`,
          senderRole: 'system', senderId: 'system', senderName: 'Westline Future',
          isInternal: true, createdAt: serverTimestamp(),
        });
      } catch (_) {}
      // Also post a client-visible update to their chat thread
      if (data.clientId) {
        try {
          await addDoc(collection(db, 'clients', data.clientId, 'messages'), {
            text: `🚀 Your project "${data.title}" has moved to: **${stage?.name || `Stage ${newStageId}`}**. ${stage?.clientMsg || ''}`,
            senderRole: 'system', senderId: 'system', senderName: 'Westline Future',
            isInternal: false, readByAdmin: true, readByClient: false,
            createdAt: serverTimestamp(),
          });
        } catch (_) {}
      }

      // ── Auto-activate milestone invoice when trigger stage is reached ──────
      // Stage 3 → post-rendering (60%), Stage 5 → post-production (30%), Stage 6 → final balance (before installation)
      const MILESTONE_STAGE_TRIGGERS = { 3: 'post-rendering', 5: 'post-production', 6: 'completion' };
      const MILESTONE_LABELS = {
        'post-rendering':  '60% Rendering Milestone',
        'post-production': '30% Production Milestone',
        'completion':      'Final Balance Payment',
        'post-shipping':   '10% Delivery Milestone',
      };
      const triggerKey = MILESTONE_STAGE_TRIGGERS[newStageId];
      if (triggerKey) {
        try {
          const today = new Date();
          const due = new Date(today);
          due.setDate(due.getDate() + 7); // 7-day window for final payment
          const dueStr = due.toISOString().split('T')[0];
          // Search by milestoneKey first, then fall back to type/title for final invoices
          const invQ = query(
            collection(db, 'invoices'),
            where('parentId', '==', projectId),
            where('milestoneKey', '==', triggerKey)
          );
          const invQ2 = query(
            collection(db, 'invoices'),
            where('projectId', '==', projectId),
            where('milestoneKey', '==', triggerKey)
          );
          const [invSnap, invSnap2] = await Promise.all([getDocs(invQ), getDocs(invQ2)]);
          // Merge both results, deduplicate by id
          const allDocs = [...invSnap.docs, ...invSnap2.docs].filter(
            (d, i, arr) => arr.findIndex(x => x.id === d.id) === i
          );
          // For Stage 7 (final payment), also search by type 'final'/'settlement' if no milestoneKey match
          let finalDocs = allDocs;
          if (triggerKey === 'completion' && allDocs.length === 0) {
            const fallbackQ = query(collection(db, 'invoices'), where('parentId', '==', projectId));
            const fallbackSnap = await getDocs(fallbackQ);
            finalDocs = fallbackSnap.docs.filter(d => {
              const t = `${d.data().type || ''} ${d.data().title || ''} ${d.data().milestoneKey || ''}`.toLowerCase();
              return t.includes('final') || t.includes('settlement') || t.includes('completion') || t.includes('balance');
            });
          }
          for (const invDoc of finalDocs) {
            if (!isPaid(invDoc.data().status)) {
              await updateDoc(invDoc.ref, {
                due: dueStr,
                status: 'Sent',
                activatedAt: serverTimestamp(),
                activatedAtStage: newStageId,
              });
            }
          }
          // Client-visible system message + push notification
          if (data.clientId && finalDocs.length > 0) {
            const milestoneLabel = MILESTONE_LABELS[triggerKey] || 'Payment Milestone';
            const isFinal = triggerKey === 'completion';
            const msgText = isFinal
              ? `🏗️ Your goods are ready for installation! Your final balance payment is now due by ${new Date(dueStr + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}. Please clear the balance before installation begins — you can pay by bank transfer, mobile money, or cash. Contact us to arrange an offline payment.`
              : `💳 Payment milestone reached: your *${milestoneLabel}* invoice is now due (${dueStr}). Please open your Payments tab to settle.`;
            await addDoc(collection(db, 'clients', data.clientId, 'messages'), {
              text: msgText,
              senderRole: 'system', senderId: 'system', senderName: 'Westline Future',
              isInternal: false, readByAdmin: true, readByClient: false, createdAt: serverTimestamp(),
            });
            // Strong push notification for final payment
            await addDoc(collection(db, 'notifications'), {
              userId: data.clientId,
              message: isFinal
                ? `🏗️ Ready for installation — your final balance is due by ${dueStr}. Pay via the Payments tab.`
                : `💳 ${milestoneLabel} invoice is now due (${dueStr}). Open Payments tab.`,
              type: 'payment_due',
              link: '/portal',
              read: false,
              createdAt: serverTimestamp(),
            });
          }
        } catch (milestoneErr) {
          devErr(milestoneErr); // non-fatal — don't block stage advance
        }
      }

      if (user?.role === 'client') {
        try { await createNotification('admin', `Client advanced project "${data.title}" to ${stage?.name}`, 'info', `/admin/clients?tab=projects`); } catch (_) {}
      } else {
        if (data.clientId) {
          try { await sendWhatsAppUpdate(data.clientId, projectId, stage?.name || `Stage ${newStageId}`); } catch (_) {}
          try { await createNotification(data.clientId, `Your project "${data.title}" has progressed to ${stage?.name}.`, 'info', '/portal'); } catch (_) {}
        }
      }
      notify('success', `Project advanced to ${stage?.name}`, 'persistent');
      logAction(data.clientId, 'Projects', `Stage ${newStageId} — ${projectId}`);
    } catch (e) {
      notify('error', 'Failed to update stage');
      devErr(e);
    }
  };

  const addClientMessage = async (clientId, text, senderRole = 'admin', isInternal = false) => {
    if (!db || !text?.trim()) return;
    const senderName = user?.name || user?.displayName || 'Westline Future Team';
    try {
      await addDoc(collection(db, 'clients', clientId, 'messages'), {
        text: sanitizeText(text.trim()),
        senderRole,
        senderId: user?.uid || user?.id || 'admin',
        senderName,
        isInternal,
        createdAt: serverTimestamp(),
      });
      if (!isInternal) {
        const client = clients.find(c => c.id === clientId);
        if (client) {
          if (senderRole === 'admin') {
            try { await createNotification(clientId, `New message from ${senderName}`, 'message', `/portal`); } catch (_) {}
          }
          if (senderRole === 'client') {
            try { await createNotification('admin', `Client ${client.name || 'someone'} sent a message`, 'message', `/admin/client-hub`); } catch (_) {}
          }
        }
      }
    } catch (e) {
      console.error('addClientMessage error:', e);
      notify('error', 'Message failed');
    }
  };

  const assignWorkerToProject = async (projectId, workerId) => {
    if (!functions) return;
    try {
      const member = (teamMembers || []).find(item =>
        item.id === workerId || item.uid === workerId || item.email === workerId
      );
      if (!member) throw new Error('Team member not found');

      const toggleAssignment = httpsCallable(functions, 'toggleProjectTeamAssignment');
      const response = await toggleAssignment({
        projectId,
        memberId: String(member.uid || member.id),
      });
      notify('success', `${response.data?.memberName || member.name || 'Team member'} ${response.data?.assigned ? 'assigned' : 'unassigned'} successfully`);
    } catch (e) {
      notify('error', `Failed to update team assignment: ${e.message}`);
    }
  };

  const approveSignoff = async (projectId) => {
    if (!db) return;
    try {
      const project = clients.find(p => p.id === projectId) || {};
      // Client-allowed write: flags the sign-off
      await updateDoc(doc(db, 'projects', projectId), {
        signOffApproved: true,
        signOffApprovedAt: serverTimestamp(),
      });
      // Admin advances the stage (this succeeds if called by admin, or silently fails for client)
      try {
        await updateProjectStage(projectId, 8, 'Client signed off on inspection', { silent: true });
      } catch (_) {
        // Fallback: notify admin to complete the handover manually
        await createNotification('admin', `Client signed off on project "${project.title || projectId}" — please advance to Stage 8 (Handover).`, 'info', `/admin/clients?tab=projects`);
      }
      notify('success', 'Sign-off confirmed! Your project is being completed.', 'persistent');
    } catch (e) {
      notify('error', 'Failed to record sign-off. Please try again.');
    }
  };

  const approveQuote = async (projectId) => {
    if (!db) return;
    try {
      const project = clients.find(p => p.id === projectId);
      const productionAuthorized = project?.productionAuthorized === true || project?.specDoc?.status === 'signed';
      if (!productionAuthorized) {
        notify('error', 'Production must be authorised before the final quote can be approved.');
        return;
      }
      const approveProjectQuote = httpsCallable(functions, 'approveProjectQuote');
      await approveProjectQuote({
        projectId,
        approverName: user?.name || project?.clientName || 'Client',
      });
      notify('success', 'Final quote approved. Complete the required payment to begin production.', 'persistent');
    } catch (e) {
      const message = e?.message
        ?.replace(/^Firebase:\s*/i, '')
        ?.replace(/\s*\(functions\/[^)]+\)\.?$/i, '');
      notify('error', message || 'Failed to approve quote');
    }
  };

  const updateShippingDetails = async (projectId, details) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'projects', projectId), {
        shippingDetails: { ...details, updatedAt: new Date().toISOString() },
      });
      logAction(projectId, 'Shipping', `Shipping details updated: vessel ${details.vesselName || '—'}`);
      notify('success', 'Shipping details saved');
    } catch (e) { notify('error', 'Failed to save shipping details'); }
  };

  const addProjectDocument = async (projectId, file, meta = {}) => {
    if (!db || !file) return null;
    try {
      notify('pending', 'Uploading document...');
      const url = await uploadFile(`projects/${projectId}/docs`, `${Date.now()}_${file.name}`, file);
      const docData = {
        name: meta.name || file.name,
        url,
        fileType: file.type || 'application/octet-stream',
        size: file.size,
        stageId: meta.stageId || null,
        uploadedBy: meta.uploadedBy || 'admin',
        createdAt: serverTimestamp(),
      };
      if (user?.role === 'worker') {
        const registerDocument = httpsCallable(functions, 'registerWorkerProjectDocument');
        await registerDocument({
          projectId,
          name: docData.name,
          url: docData.url,
          fileType: docData.fileType,
          size: docData.size,
          stageId: docData.stageId,
          workerName: user?.name || user?.displayName || 'Field Worker',
          docType: meta.docType || 'field_document',
        });
      } else {
        await addDoc(collection(db, 'projects', projectId, 'documents'), docData);
      }
      logAction(projectId, 'Document', `Uploaded: ${file.name}`);
      notify('success', 'Document uploaded');
      const docProject = clients.find(p => p.id === projectId);
      if (docProject?.clientId) {
        try { await createNotification(docProject.clientId, `New document available: ${file.name}`, 'document', `/portal`); } catch (_) {}
      }
      return url;
    } catch (e) {
      notify('error', 'Upload failed: ' + e.message);
      return null;
    }
  };

  const addProjectMessage = async (projectId, text, senderRole = 'worker') => {
    if (!functions || !projectId || !text?.trim()) return;
    if (user?.role === 'worker' || senderRole === 'worker') {
      const submitWorkerNote = httpsCallable(functions, 'submitWorkerProjectNote');
      await submitWorkerNote({
        projectId,
        text: sanitizeText(text),
        workerName: user?.name || user?.displayName || user?.email || 'Field Worker',
      });
      return;
    }
    await addDoc(collection(db, 'projects', projectId, 'messages'), {
      text: sanitizeText(text),
      senderRole,
      senderId: user?.uid || user?.id || 'staff',
      senderName: user?.name || user?.displayName || 'Westline Future Team',
      isInternal: false,
      createdAt: serverTimestamp(),
    });
  };

  const addSourcingItem = async (data) => {
    if (!db) return;
    try {
      const rawId = typeof data.clientId === 'object' ? data.clientId?.id : data.clientId;
      const id = normalizePhone(rawId);
      await addDoc(collection(db, 'procurements'), {
        ...data,
        clientId: id,
        createdAt: new Date().toISOString()
      });
      notify('success', 'Sourcing item added to client hub.');
    } catch (e) {
      notify('error', 'Sourcing update failed');
    }
  };

  const sendToProcurement = async (emailData, projectId) => {
    if (!db) return;
    try {
      const details = emailData.details || {};
      const payload = {
         itemName: `${details.productName || 'Marketplace Item'} (x${details.quantity || 1})`,
         source: 'Westline Future Marketplace',
         estimatedCost: details.price || 0,
         actualCost: details.price || 0,
         status: 'to-buy',
         type: 'Marketplace',
         isShipment: false,
         createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'projects', projectId, 'procurements'), payload);
      await updateEmailStatus(emailData.id, 'In Production');
      notify('success', 'Marketplace order linked to project procurement.');
    } catch(e) {
      devErr(e);
      notify('error', 'Failed to link order to project.');
    }
  };

  const createWorkOrder = async (data) => {
    if (!db) return;
    try {
      const docRef = await addDoc(collection(db, 'work_orders'), {
        ...data,
        stage: data.stage || 1,
        status: 'In Progress',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      notify('success', 'Project requirement deployed successfully');
      logAction(data.clientId, 'Operations', `Deployed Project: ${data.title}`);
      return docRef.id;
    } catch (e) {
      devErr(e);
      notify('error', 'Deployment failed');
      throw e;
    }
  };

  const deleteClient = async (id) => {
    if (!db) return;
    try {
      // Delete the primary user document
      await deleteDoc(doc(db, 'users', id));

      // Clean up client subcollections (messages, typing, etc.)
      // Firestore does NOT auto-delete subcollections when a doc is deleted
      const clientSubcollections = ['messages', 'typing'];
      for (const sub of clientSubcollections) {
        try {
          const snap = await getDocs(collection(db, 'clients', id, sub));
          await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
        } catch (_) {}
      }
      // Delete the clients/{id} document itself
      try { await deleteDoc(doc(db, 'clients', id)); } catch (_) {}

      // Cleanup ghost records in top-level collections
      const collectionsToCleanup = [
        'projects', 'work_orders', 'invoices', 'tasks',
        'approvals', 'change_requests', 'procurements', 'renderingPackages'
      ];
      for (const coll of collectionsToCleanup) {
        try {
          const q = query(collection(db, coll), where('clientId', '==', id));
          const snap = await getDocs(q);
          await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
        } catch (err) {
          devWarn(`Failed to cleanup ${coll}:`, err);
        }
      }

      notify('success', 'Client and all associated records removed');
      logAction(null, 'CRM', `Deleted client and records: ${id}`);
    } catch (e) {
      devErr(e);
      notify('error', 'Deletion failed');
    }
  };

  const deleteAllClients = async () => {
    if (!db) return;
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'client'));
      const snap = await getDocs(q);
      const batch = snap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(batch);
      notify('success', `Cleaned ${snap.size} client accounts.`);
      logAction(null, 'CRM', 'Mass deletion of client accounts performed.');
    } catch (e) {
      devErr(e);
      notify('error', 'Mass deletion failed.');
    }
  };

  const deleteSelectedClients = async (ids) => {
    if (!db || !ids.length) return;
    try {
      const batch = ids.map(id => deleteDoc(doc(db, 'users', id)));
      await Promise.all(batch);
      notify('success', `Deleted ${ids.length} accounts.`);
      logAction(null, 'CRM', `Bulk deletion of ${ids.length} clients.`);
    } catch (e) {
      devErr(e);
      notify('error', 'Bulk deletion failed');
    }
  };

  const findUserByPhone = (phone) => {
    if (!phone) return null;
    let clean = phone.replace(/\D/g, ''); 
    // Strip leading zero if present after stripping non-digits
    if (clean.startsWith('0')) clean = clean.substring(1);
    
    return dbClients.find(u => {
      // Check primary phone
      let dbPhone = (u.phone || '').replace(/\D/g, '');
      if (dbPhone.startsWith('0')) dbPhone = dbPhone.substring(1);
      
      if (dbPhone && (dbPhone === clean || dbPhone.endsWith(clean) || clean.endsWith(dbPhone))) return true;
      
      // Check stakeholders (multi-number support)
      if (u.stakeholders && Array.isArray(u.stakeholders)) {
        return u.stakeholders.some(s => {
          let sPhone = s.replace(/\D/g, '');
          if (sPhone.startsWith('0')) sPhone = sPhone.substring(1);
          return sPhone && (sPhone === clean || sPhone.endsWith(clean) || clean.endsWith(sPhone));
        });
      }
      return false;
    });
  };

  const sendOTP = async (phone) => {
    try {
      if (!auth) throw new Error("Service unavailable. Please try again.");
      const normalizedPhone = String(phone || '').trim();
      if (!/^\+[1-9]\d{7,14}$/.test(normalizedPhone)) {
        const e = new Error('Enter a valid phone number in international format, e.g. +233 24 000 0000.');
        e.code = 'auth/invalid-phone-number';
        throw e;
      }

      notify('pending', 'Sending verification code...');

      // Clear any previous reCAPTCHA render before creating a new one
      if (window._gtRecaptcha) {
        try { window._gtRecaptcha.clear(); } catch (_) {}
        window._gtRecaptcha = null;
      }
      const container = document.getElementById('recaptcha-container');
      if (container) container.innerHTML = '';

      window._gtRecaptcha = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {},
        'expired-callback': () => { window._gtRecaptcha = null; }
      });

      await window._gtRecaptcha.render();
      const result = await signInWithPhoneNumber(auth, normalizedPhone, window._gtRecaptcha);
      confirmationResultRef.current = result;

      notify('success', `Code sent to ${normalizedPhone}`);
      return true;
    } catch (err) {
      devErr('[sendOTP] Firebase phone auth failed', {
        code: err?.code,
        message: err?.message,
        customData: err?.customData,
        url: window.location.href,
        host: window.location.host
      });
      if (window._gtRecaptcha) {
        try { window._gtRecaptcha.clear(); } catch (_) {}
        window._gtRecaptcha = null;
      }
      const container = document.getElementById('recaptcha-container');
      if (container) container.innerHTML = '';
      const msg = (() => {
        const host = window.location.host;
        if (err?.code === 'auth/network-request-failed') {
          return `Network error sending OTP. This usually means the domain "${host}" is not in Firebase Auth → Authorized Domains, or the reCAPTCHA API key doesn't allow this referrer. Ask your admin to add "${host}" to Firebase Console → Authentication → Settings → Authorized Domains.`;
        }
        if (err?.code === 'auth/invalid-app-credential' || err?.code === 'auth/unauthorized-domain') {
          return `Domain "${host}" is not authorized for Firebase Phone Auth. Go to Firebase Console → Authentication → Settings → Authorized Domains and add "${host}".`;
        }
        if (err?.code === 'auth/app-not-authorized') return `API key not authorized for domain "${host}". Check Firebase Auth → Authorized Domains and Google Cloud API key restrictions.`;
        if (err?.code === 'auth/captcha-check-failed') return 'Security check failed. Please refresh the page and try again.';
        if (err?.code === 'auth/missing-phone-number') return 'Enter a valid phone number before requesting an OTP.';
        if (err?.code === 'auth/too-many-requests') return 'Too many OTP attempts. Please wait a few minutes and try again.';
        if (err?.code === 'auth/invalid-phone-number') return 'That phone number is not valid. Please include the country code, e.g. +86 for China or +1 for USA.';
        if (err?.code === 'auth/quota-exceeded') return 'SMS quota exceeded for today. Please try again tomorrow or contact support.';
        if (err?.message?.includes('400')) return `Firebase rejected the OTP request. Check Phone Auth is enabled and "${host}" is in Authorized Domains.`;
        return err.message || 'Could not send verification code. Please check your connection and try again.';
      })();
      err.userMessage = msg;
      setNotification({ msg, type: 'error' });
      notify?.('error', msg);
      throw err;
    }
  };

  const verifyOTP = async (phone, code) => {
    try {
      if (!confirmationResultRef.current) throw new Error("Session expired. Please request a new code.");

      const result = await confirmationResultRef.current.confirm(code);
      const firebaseUser = result.user;

      // Force token refresh so Firestore SDK has the phone_number claim immediately
      await firebaseUser.getIdToken(true);

      const clean = normalizePhone(phone);

      // Try direct doc lookup by normalized phone ID — no list queries (clients can't list users)
      let userDoc = null;
      const directSnap = await getDoc(doc(db, 'users', clean));
      if (directSnap.exists()) {
        userDoc = { id: directSnap.id, ...directSnap.data() };
      } else {
        // Try the raw digits without country-code normalization (covers non-Ghana numbers)
        const rawDigits = phone.replace(/\D/g, '');
        if (rawDigits !== clean) {
          const rawSnap = await getDoc(doc(db, 'users', rawDigits));
          if (rawSnap.exists()) userDoc = { id: rawSnap.id, ...rawSnap.data() };
        }
      }

      if (!userDoc) {
        throw new Error("This number isn't registered. Contact Westline Future to set up your account.");
      }

      // Link Firebase Auth UID to user doc (silently — don't block login if this fails)
      if (userDoc.uid !== firebaseUser.uid) {
        updateDoc(doc(db, 'users', userDoc.id), { uid: firebaseUser.uid }).catch(() => {});
      }

      const fullUser = { ...userDoc, id: userDoc.id, uid: firebaseUser.uid };
      delete fullUser.password;
      setUser(fullUser);
      // ✓ Firebase Auth handles session persistence securely via httpOnly cookies + built-in storage
      // Do NOT store unencrypted session data in localStorage
      confirmationResultRef.current = null;
      navigate('/portal');
      return true;
    } catch (err) {
      if (err.code === 'auth/invalid-verification-code') throw new Error('Incorrect code. Please try again.');
      throw err;
    }
  };

  const handleLogout = async () => {
    try {
      if (auth) await signOut(auth);
      // ✓ Firebase Auth clears sessions automatically on signOut
      localStorage.removeItem('westline_user_cache');
      setUser(null);
      setLoginType('client'); // always reset to client/OTP mode on logout
      navigate('/login');
    } catch (e) {
      devErr("Logout failed:", e);
      notify('error', 'Logout failed');
    }
  };

  const createStaffAccount = async ({
    name,
    username,
    email,          // real email (e.g. andy@westlinedecor.com) — used when provided
    role,
    password,
    phone = '',
    department = 'Operations',
    accessScope = 'assigned',
    accessModules = [],
    onboardingChecklist = [],
    requiresPasswordReset = true,
    notes = '',
    systemRole
  }) => {
    if (!username?.trim()) throw new Error('Username is required');
    let secondaryApp;
    try {
      secondaryApp = initializeApp(firebaseConfig, "SecondaryApp_" + Date.now());
      const secondaryAuth = getAuth(secondaryApp);

      // Use the real email if supplied, otherwise fall back to the pseudo-email system
      const loginEmail = (email && email.trim().includes('@'))
        ? email.trim().toLowerCase()
        : `${username.trim().toLowerCase()}@westlinefuture.com`;

      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, loginEmail, password);
      const uid = userCredential.user.uid;

      const staffRole = systemRole || (["Field Worker", "Technician", "Senior Technician", "Technical Team Lead", "Field Installer"].includes(role) ? "worker" : "staff");

      const staffDoc = {
        name:                 name.trim(),
        username:             username.trim().toLowerCase(),
        email:                loginEmail,
        phone,
        role:                 staffRole,
        jobRole:              role,
        department,
        accessScope,
        accessModules,
        onboardingChecklist,
        requiresPasswordReset,
        staffNotes:           notes,
        assignedClients:      [],
        assignedProjects:     [],
        assignedWorkers:      [],
        status:               "Active",
        certs:                [],
        // Password never stored in Firestore — delivered manually only.
        createdAt:            serverTimestamp(),
        createdBy:            user?.uid || "admin",
      };

      await setDoc(doc(db, "users", uid), staffDoc);
      await setDoc(doc(db, "team", uid), { ...staffDoc, uid });

      await deleteApp(secondaryApp);

      notify('success', `Account created for ${name}`);
      logAction(null, 'Staff', `Created ${staffRole} account for ${name} (${role}) — login: ${loginEmail}`);
    } catch (err) {
      if (secondaryApp) await deleteApp(secondaryApp).catch(() => {});
      if (err.code === "auth/email-already-exists") throw new Error(`An account already exists for this email address`);
      throw new Error(err.message || 'Failed to create account');
    }
  };

  const deleteMember = async (uid) => {
    if (!functions) throw new Error('System not connected');
    try {
      const fn = httpsCallable(functions, 'deleteStaffAccount');
      await fn({ uid, deleteAuth: true });
      notify('success', 'Staff account removed.');
      logAction(null, 'Staff', `Deleted staff account uid: ${uid}`);
    } catch (err) {
      console.warn("Cloud function deleteStaffAccount failed:", err);
      try {
        await deleteDoc(doc(db, 'team', uid));
        await deleteDoc(doc(db, 'users', uid));
        notify('success', 'Staff account removed (local override).');
        logAction(null, 'Staff', `Deleted staff account uid: ${uid} (local override)`);
      } catch (fallbackErr) {
        notify('error', err.message || 'Failed to delete staff account');
      }
    }
  };

  const updateMember = async (uid, fields) => {
    if (!uid || !db) return;
    const clean = Object.fromEntries(Object.entries(fields || {}).filter(([_, v]) => v !== undefined));
    try {
      await updateDoc(doc(db, 'users', uid), { ...clean, updatedAt: serverTimestamp() });
      await updateDoc(doc(db, 'team', uid), { ...clean, updatedAt: serverTimestamp() }).catch(() => {});
      notify('success', 'Staff account updated.');
      logAction(null, 'Staff', `Updated staff account uid: ${uid}`);
    } catch (err) {
      notify('error', err.message || 'Failed to update staff account');
      throw err;
    }
  };

  const uniqueDbClients = React.useMemo(() => {
    const registry = {};
    dbClients.forEach(c => {
      const key = (c.phone || c.id || '').replace(/\D/g, '');
      if (!key) return;
      if (!registry[key]) {
        registry[key] = { ...c };
      } else {
        // MERGE LOGIC: Combine data from both objects, keeping the most complete fields
        registry[key] = {
          ...registry[key],
          ...Object.fromEntries(Object.entries(c).filter(([_, v]) => v !== null && v !== undefined && v !== '')),
          id: registry[key].id // Preserve the original ID as the primary key if possible
        };
      }
    });
    return Object.values(registry);
  }, [dbClients]);

  const commonProps = {
    handleLogout,
    notify,
    playNotificationSound,
    page, setPage, navigate,
    brand, setBrand, content, setContent,
    showcase: content?.showcase,
    clients, updateProject: syncProjects,
    dbClients: uniqueDbClients, rawDbClients: dbClients,
    createClient, updateClient,
    loadMoreMessages, hasMoreMessages,
    loadMoreInvoices, hasMoreInvoices,
    loadMoreWorkOrders, hasMoreWorkOrders,
    teamMembers,
    logs, logAction, 
    invoices,
    renderingPackages,
    addOns,
    payInvoice,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    createProposal,
    updateProposal,
    deleteProposal,
    uploadMedia,
    transactions, recordOfflinePayment,
    materials, updateMaterial,
    assets, updateAsset,
    updateStage, calculateProjectPulse,
    submitContact: submitContactInquiry,
    submitMarketplace: submitMarketplaceInquiry,
    sendOTP, verifyOTP, findUserByPhone,
    loginWithCredentials, resetUserPassword, changeClientPassword,
    deleteClient, 
    activeMagicCode, 
    userNotifications, markNotificationRead,
    submitMarketplaceInquiry,
    migrateToFirebase, getSLA, syncCMS, PROJECT_STAGES,
    updateEmailStatus, convertInquiryToProject, sendToProcurement, createNotification,
    currency, setCurrency, rates,
    onPortal: (type) => { setLoginType(type); navigate('/login'); },
    formatPrice: (priceStr) => {
      if (!priceStr) return '-';
      const num = typeof priceStr === 'number' ? priceStr : parseFloat(String(priceStr).replace(/[^0-9.]/g, ''));
      if (isNaN(num)) return priceStr;
      return `GH₵${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    },
    lang, setLang, t, messages, sendMessage, testimonials, submitTestimonial, showVisualizer, setShowVisualizer,
    sendWhatsAppUpdate,
    jobs, createJob, updateJob,
    createClientProject, updateProjectStage, addClientMessage, addProjectMessage, assignWorkerToProject, deleteProject,
    approveQuote, approveSignoff, updateShippingDetails, addProjectDocument, createStaffAccount, deleteMember, updateMember,
    workOrders, containers,
    updateWorkOrder: (id, d) => db && updateDoc(doc(db, 'work_orders', id), { ...d, updatedAt: serverTimestamp() }),
    createWorkOrder,
    addContainer: async (data) => {
      if (!db) throw new Error('Not connected');
      const ref = await addDoc(collection(db, 'containers'), { ...data, createdAt: serverTimestamp() });
      return ref.id;
    },
    updateContainer: (id, d) => db && updateDoc(doc(db, 'containers', id), { ...d, updatedAt: serverTimestamp() }),
    deleteContainer: (id) => db && deleteDoc(doc(db, 'containers', id)),
    approvals,
    createApproval,
    updateApproval,
    changeRequests,
    updateChangeRequest,
    isPortalLocked: () => {
       if (user?.role === 'admin') return false;
       const myInvoices = invoices.filter(i => i.clientId === user?.id || i.clientEmail === user?.email);
       const overdue = myInvoices.some(i => i.status === 'Pending' && new Date(i.due) < new Date());
       return overdue;
    }
  };
  const logoUpload = async (file) => {
    const localUrl = URL.createObjectURL(file);
    setBrand(prev => ({ ...prev, logo: localUrl }));
    if (!storage || !db) {
      setNotification({ msg: 'Demo Mode: Logo updated locally', type: 'info' });
      return;
    }
    const url = await uploadFile('branding', 'logo', file);
    setBrand(prev => ({ ...prev, logo: url }));
    await updateDoc(doc(db, 'settings', 'branding'), { logo: url });
  };

  const loginHandler = async (e, p, mode = 'admin') => {
    try {
      notify('pending', `Authenticating with Westline Future Hub...`);

      const isAdminEmail = (e === 'admin@westlinefuture.com' || e === 'operations@westlinefuture.com');
      const isActualAdminMode = mode === 'admin' || isAdminEmail;

      if (isActualAdminMode) {
        // Wait up to 3s for Firebase to finish initialising on cold load
        let _attempts = 0;
        while ((!isFirebaseEnabled || !auth) && _attempts < 6) {
          await new Promise(r => setTimeout(r, 500));
          _attempts++;
        }
        if (!isFirebaseEnabled || !auth) {
          throw new Error("Database offline. Please check your internet connection.");
        }
        try {
          const res = await signInWithEmailAndPassword(auth, e, p);
          const userRef = doc(db, 'users', res.user.uid);
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
            await setDoc(userRef, { email: e, role: 'admin', createdAt: new Date().toISOString() });
          }
          // Removed clear rate limit
          return res;
        } catch (signInErr) {
          if ((signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential') && isAdminEmail) {
            notify('pending', 'Securing account access...');
            try {
              const res = await createUserWithEmailAndPassword(auth, e, p);
              await setDoc(doc(db, 'users', res.user.uid), { email: e, role: 'admin', createdAt: new Date().toISOString() });
              // Removed clear rate limit
              return res;
            } catch (createErr) {
              if (createErr.code === 'auth/email-already-in-use') {
                throw new Error("Account exists but password is incorrect. Please reset via Firebase Console.");
              }
              throw createErr;
            }
          }
          throw signInErr;
        }
      } else {
        return await loginWithCredentials(e, p);
      }
    }
    catch (err) {
      throw new Error(mapFirebaseError(err));
    }
  };


  const isProtectedRoute = location.pathname.startsWith('/admin') || location.pathname.startsWith('/portal');

  if (authLoading && isProtectedRoute) return (
    <div style={{ background: `var(--accent-secondary)`, height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: `var(--accent-secondary)`, fontFamily: 'Inter' }}>
      <div className="pulse" style={{ fontSize: '1.2rem', letterSpacing: '4px', textTransform: 'uppercase' }}>Authenticating</div>
      <div style={{ marginTop: '20px', fontSize: '0.8rem', opacity: 0.6 }}>Securing Westline Future Gateway...</div>
    </div>
  );

  return (
    <div className="lxf-platform">
      <div className="mesh-bg" />
      <ErrorBoundary>
      <Suspense fallback={
        <div style={{ background: `var(--accent-secondary)`, height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: `var(--accent-secondary)`, fontFamily: 'Inter' }}>
          <div className="pulse" style={{ fontSize: '1.2rem', letterSpacing: '4px', textTransform: 'uppercase' }}>Loading Portal</div>
        </div>
      }>
        <Routes>
          <Route path="/" element={
            <PublicSite 
              {...commonProps} 
              onLogoUpload={logoUpload}
            />
          } />

          <Route path="/products" element={<ProductsHub {...commonProps} />} />
          <Route path="/portfolio" element={<Portfolio {...commonProps} />} />
          <Route path="/portfolio/:projectId" element={<Portfolio {...commonProps} />} />
          <Route path="/showcase" element={<Showcase {...commonProps} />} />
          <Route path="/workflow" element={<WorkflowManualPage {...commonProps} />} />


          <Route path="/login" element={
            <LoginPage
              key={loginType}
              brand={brand}
              type={loginType}
              onBack={() => navigate('/')}
              onLogin={loginHandler}
              {...commonProps}
            />
          } />

          <Route path="/admin/*" element={
            <ProtectedRoute>
              {user?.role === 'admin' || user?.role === 'staff' ? (
                <AdminPortal
                  user={user}
                  onLogout={handleLogout}
                  onPreview={() => { setUser(null); if (auth) signOut(auth); navigate('/'); }}
                  onLogoUpload={logoUpload}
                  onThemeChange={async (t) => {
                    setBrand(prev => ({ ...prev, theme: t }));
                    if (db) await updateDoc(doc(db, 'settings', 'branding'), { theme: t });
                  }}
                  syncCatalog={syncCatalogOnly}
                  staffMode={user?.role === 'staff'}
                  {...commonProps}
                />
              ) : <Navigate to="/login" />}
            </ProtectedRoute>
          } />

          <Route path="/portal/*" element={
            <ProtectedRoute>
              {user?.role === 'client' ? (
                <ClientPortal
                  client={clients.find(c => c.email === user.email) || user}
                  onLogout={handleLogout}
                  onPreview={() => { setUser(null); if (auth) signOut(auth); navigate('/'); }}
                  updateClientProfile={updateClientProfile}
                  {...commonProps}
                />
              ) : (user?.role === 'admin' || user?.role === 'staff') ? (
                <Navigate to="/admin" />
              ) : <Navigate to="/login" />}
            </ProtectedRoute>
          } />
          <Route path="/field-upload" element={<FieldUpload {...commonProps} />} />
          <Route path="/field-upload/:projectId" element={<FieldUpload {...commonProps} />} />
          <Route path="/work" element={
            <ProtectedRoute>
              {user?.role === 'worker' || user?.role === 'staff' || user?.role === 'admin' ? (
                <WorkerView user={user} onLogout={handleLogout} {...commonProps} />
              ) : <Navigate to="/login" />}
            </ProtectedRoute>
          } />
        </Routes>
      </Suspense>
      </ErrorBoundary>

      {notification && (
        <div style={{ 
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', 
          zIndex: 10000, padding: '12px 24px', borderRadius: 100, 
          background: notification.type === 'error' ? '#EF4444' : `var(--accent-secondary)`, 
          color: '#fff', fontSize: 13, boxShadow: '0 8px 32px rgba(0,0,0,.25)',
          display: 'flex', alignItems: 'center', gap: 12
        }}>
           <span>{notification.msg}</span>
           {(notification.persistent || notification.type === 'persistent') && (
             <button 
               onClick={() => setNotification(null)}
               style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
             >
               <X size={14} />
             </button>
           )}
        </div>
      )}
    </div>
  );
}
