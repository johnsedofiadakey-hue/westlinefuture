import React, { useState, useEffect, Suspense, lazy, useRef } from 'react';
const _BUILD_ID = '20260519';
const PublicSite = lazy(() => import('./pages/PublicSite'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const AdminPortal = lazy(() => import('./pages/AdminPortal'));
const ClientPortal = lazy(() => import('./pages/ClientPortal'));
const AccountManagerPortal = lazy(() => import('./pages/AccountManagerPortal'));
const ProductsHub = lazy(() => import('./pages/ProductsHub'));
const Portfolio = lazy(() => import('./pages/Portfolio'));
const Showcase = lazy(() => import('./pages/Showcase'));
const FieldUpload = lazy(() => import('./pages/admin/FieldUpload'));
const WorkerView = lazy(() => import('./pages/WorkerView'));
import ProtectedRoute from './components/ProtectedRoute';
import { sanitizeText } from './lib/sanitize';
import { mapFirebaseError } from './lib/firebaseErrors';
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


import { auth, db, storage, functions, isFirebaseEnabled } from './lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { 
  collection, query, onSnapshot, getDocs, getDoc, doc, 
  updateDoc, addDoc, setDoc, deleteDoc, orderBy, limit, where, serverTimestamp,
  writeBatch, increment,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { uploadFile } from './lib/firebase';
import { MessengerService } from './lib/MessengerService';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';







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

  const checkRateLimit = (identifier) => {
    const now = Date.now();
    const record = loginAttempts.current[identifier];
    if (!record) { loginAttempts.current[identifier] = { count: 1, lockUntil: 0 }; return; }
    if (record.lockUntil && now < record.lockUntil) {
      const mins = Math.ceil((record.lockUntil - now) / 60000);
      throw new Error(`Too many attempts. Try again in ${mins} minute${mins > 1 ? 's' : ''}.`);
    }
    if (record.count >= 5) {
      loginAttempts.current[identifier] = { count: record.count + 1, lockUntil: now + 15 * 60000 };
      throw new Error('Too many failed attempts. Account locked for 15 minutes.');
    }
    loginAttempts.current[identifier] = { count: record.count + 1, lockUntil: 0 };
  };
  const clearRateLimit = (id) => { delete loginAttempts.current[id]; };

  const {
    user, setUser, clients, proposals, invoices, bookings, emails, setEmails, dbClients, teamMembers, logs, shipments, messages, testimonials, tasks, transactions, changeRequests, userNotifications, procurements, jobs, notes, media, approvals, materials, assets, workOrders, containers,
    brand, content, currency, lang,
    setCurrency, setLang, setBrand, setContent,
    loadMoreMessages, hasMoreMessages,
    loadMoreInvoices, hasMoreInvoices,
    loadMoreWorkOrders, hasMoreWorkOrders
  } = useContext(AppContext);
  
  const notify = useCallback((type, msg) => {
    if (window._notifTimeout) clearTimeout(window._notifTimeout);
    setNotification({ type, msg });
    if (type !== 'pending') {
      window._notifTimeout = setTimeout(() => setNotification(null), 5000);
    }
  }, []);

  const { uploadMedia } = useFileUpload(notify);
  const { sendMessage } = useMessaging();

  // Inject dynamic CSS variables based on brand settings
  useEffect(() => {
    const root = document.documentElement;
    if (brand.bgPrimary) root.style.setProperty('--bg', brand.bgPrimary);
    if (brand.textColor) root.style.setProperty('--fg', brand.textColor);
    if (brand.color || brand.accent) root.style.setProperty('--ac', brand.accent || brand.color);
    if (brand.fontFamily) root.style.setProperty('--font-primary', brand.fontFamily);
  }, [brand]);
  const fxRate = content?.finSettings?.exchangeRate || brand?.finSettings?.exchangeRate || 15.5;
  const rates = { USD: 1, GHS: fxRate, EUR: 0.93 };



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
    // Standardize to 233 format
    if (clean.startsWith('0') && clean.length === 10) {
      return '233' + clean.slice(1);
    }
    if (clean.length === 9) {
      return '233' + clean;
    }
    if (clean.startsWith('233') && clean.length === 12) {
      return clean;
    }
    return clean;
  };

  const normalizeClientId = (value) => {
    const raw = typeof value === 'object' ? (value?.id || value?.phone || value?.value) : value;
    return normalizePhone(String(raw || ''));
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
      await addDoc(collection(db, 'notifications'), {
        userId, msg: sanitizeText(msg), type, link,
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
        localStorage.setItem('westlinefuture_user_cache', JSON.stringify(cacheData));
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
        { email: 'operations@westlinefuture.com', role: 'admin', name: 'Factory Admin', uid: _adminUid2 },
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
              { id: 'm3', name: 'Final Handover', amount: '$50,000', stageId: 7, status: 'Pending' }
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
          const cid = item.phone ? normalizeClientId(item.phone) : (item.email ? (userMap[item.email] || item.email.replace(/[.@]/g, '_')) : `CL_${pid}`);

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
            { id: 'm3', name: 'Final (20%)', amount: '$' + (projectBudget * 0.2).toLocaleString(), stageId: 7, status: 'Pending' }
          ];

          await setDoc(doc(db, 'projects', pid), {
            ...item, id: pid, title: item.project || item.title,
            clientId: cid, primaryClientId: cid, clientIds: [cid],
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

  const checkManualSession = async () => {
    const savedSession = localStorage.getItem('westlinefuture_session') || localStorage.getItem('glasstech_session');
    if (savedSession) {
      try {
        const sessionData = JSON.parse(savedSession);
        if (sessionData.expiry > Date.now()) {
          if (!db) {
             // Mock session restoration
             setUser({ id: sessionData.id, name: 'Mock User', role: 'client' });
             return true;
          }
          const userRef = doc(db, 'users', sessionData.id);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const u = { id: sessionData.id, ...userSnap.data() };
            setUser(u);
            if (import.meta.env.DEV) devLog("[AUTH] Restored Client Session:", u.id);
            if (location.pathname === '/login') navigate('/portal');
            return true;
          }
        }
      } catch (e) {
        devErr("Session restoration failed:", e);
      }
    }
    return false;
  };

  const loginWithCredentials = async (username, password) => {
    checkRateLimit(username || 'unknown-client');
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
        if (!snap.empty) uDoc = snap.docs[0];
      }

      if (!uDoc.exists()) {
        throw new Error("Profile document not located in secure storage.");
      }

      const uData = uDoc.data();
      
      // Email-based users (admin/staff) have no phone — use Firebase UID as their id
      const fullUser = { ...uData, id: isEmail ? sessionUser.uid : normalizePhone(uData.phone || uDoc.id), uid: sessionUser.uid };
      delete fullUser.password;
      
      localStorage.setItem('westlinefuture_user_cache', JSON.stringify(fullUser));
      setUser(fullUser);
      clearRateLimit(username || 'unknown-client');
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
        primaryClientId: userId,
        clientIds: [userId],
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

  const updateStage = async (projectId, stageId) => {
    try {
      const stageObj = PROJECT_STAGES.find(s => s.id === stageId);
      const project = clients.find(p => p.id === projectId);
      
      if (stageObj) {
         if (stageObj.requiresPayment) {
            const projectInvoices = invoices.filter(i => i.parentId === projectId);
            const unpaid = projectInvoices.filter(i => i.status !== 'Paid');
            if (unpaid.length > 0) {
               notify('error', 'Stage locked: Outstanding payments required.');
               return;
            }
         }
         
         // AUTOMATED MILESTONE INVOICING (10-stage pipeline)
         const invoiceTriggers = {
           2: { title: 'Rendering / CAD 3D Access Fee', percent: 0, type: 'rendering_fee' },
           5: { title: 'Project Deposit Payment', percent: 50, type: 'deposit' },
           10: { title: 'Final Handover & Quality Settlement', percent: 50, type: 'final_balance' }
         };

         if (invoiceTriggers[stageId] && project) {
            const { title, percent, type } = invoiceTriggers[stageId];
            const baseBudget = parseMoney(project.projectTotal || project.budget);
            const amount = percent > 0 ? (baseBudget * percent) / 100 : parseMoney(project.renderingFee);
            
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
                  type: type || 'Milestone',
                  invoiceType: type || 'milestone',
                  stageGate: stageId
                });
                createNotification(project.clientId, `New Invoice Generated: ${title}`, 'info', '/portal');
              }
            }
         }

         // FEEDBACK LOOP: If stage is 10 (Handover), request feedback
         if (stageId === 10 && project) {
           createNotification(project.clientId, "Project Complete! We'd love to hear your feedback on your Westline Future experience.", "success", "/portal?action=feedback");
         }
      }
      
      const stageObjForPct = CLIENT_PROJECT_STAGES.find(s => s.id === stageId);
      await updateDoc(doc(db, 'projects', projectId), { stageId, progress: stageObjForPct?.pct ?? Math.round((stageId / 10) * 100), nextAction: computeNextProjectAction(project, stageId) });
      logAction(projectId, 'Stage', `Moved to Stage ${stageId}`);
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

  const createInvoice = async (data) => {
    if (!db) return;
    try {
      const amount = parseMoney(data.total ?? data.amount);
      const docRef = await addDoc(collection(db, 'invoices'), {
        ...data,
        clientIds: data.clientIds || (data.clientId ? [data.clientId] : []),
        primaryClientId: data.primaryClientId || data.clientId || null,
        projectId: data.projectId || data.parentId || null,
        invoiceType: data.invoiceType || data.type || 'invoice',
        stageGate: data.stageGate || null,
        provider: data.provider || data.paymentProvider || null,
        amount,
        total: data.total ?? amount,
        balanceDue: data.balanceDue ?? amount,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: data.status || 'Pending'
      });
      notify('success', 'Official Invoice Issued');
      return docRef.id;
    } catch (err) {
      devErr(err);
      notify('error', 'Issuance failed');
    }
  };

  const deleteInvoice = async (id) => {
    if (!db || !id) return;
    try {
      await deleteDoc(doc(db, 'invoices', id));
      notify('success', 'Invoice deleted');
    } catch (err) {
      notify('error', 'Failed to delete invoice');
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

  const getProjectClientId = (projectId) => {
    return clients.find(p => p.id === projectId)?.clientId || null;
  };

  const recordProjectActivity = async (projectId, action, data = {}) => {
    if (!db || !projectId) return;
    const project = clients.find(p => p.id === projectId);
    const clientId = data.clientId || project?.clientId || null;
    const payload = {
      projectId,
      clientId,
      action: sanitizeText(action || 'Project activity'),
      actorId: user?.uid || user?.id || 'system',
      actorName: user?.name || user?.displayName || user?.email || 'Westline Future',
      actorRole: user?.role || 'admin',
      created_at: new Date().toISOString(),
      createdAt: serverTimestamp(),
      ...data,
    };
    try {
      await addDoc(collection(db, 'activity_logs'), payload);
      await addDoc(collection(db, 'projects', projectId, 'activity_logs'), payload);
    } catch (e) {
      devWarn('[activityLog]', e);
    }
  };

  const computeNextProjectAction = (project, targetStageId = project?.stageId || 1) => {
    if (!project) return 'Review project setup';
    if (targetStageId <= 1) return 'Create rendering fee invoice';
    if (targetStageId === 2) return project.renderingFeePaid ? 'Unlock rendering package' : 'Awaiting rendering fee payment';
    if (targetStageId === 3) {
      if (!project.renderingUnlocked) return 'Rendering locked until payment is verified';
      return project.renderingApproved ? 'Prepare final project quote' : 'Awaiting rendering review and approval';
    }
    if (targetStageId === 4) return project.quoteApproved ? 'Create project deposit invoice' : 'Awaiting final quote approval';
    if (targetStageId === 5) return project.depositPaid ? 'Begin procurement and production' : 'Awaiting project deposit payment';
    if (targetStageId === 8) return 'Field team installation updates required';
    if (targetStageId === 9) return 'Awaiting inspection sign-off';
    if (targetStageId === 10) return project.finalPaymentPaid ? 'Issue handover documents' : 'Awaiting final settlement';
    return CLIENT_PROJECT_STAGES.find(s => s.id === targetStageId)?.adminPrompt || 'Monitor project progress';
  };

  const createRenderingPackage = async (projectId, data = {}) => {
    if (!db || !projectId) return null;
    try {
      const projectSnap = await getDoc(doc(db, 'projects', projectId));
      if (!projectSnap.exists()) throw new Error('Project not found');
      const project = projectSnap.data();
      const clientId = data.clientId || project.clientId || getProjectClientId(projectId);
      const packageRef = await addDoc(collection(db, 'renderingPackages'), {
        projectId,
        clientId,
        title: sanitizeText(data.title || `${project.title || 'Project'} Rendering Package`),
        status: data.status || 'invoice_required',
        accessStatus: data.accessStatus || 'locked',
        includedRevisions: Number(data.includedRevisions ?? 2),
        usedRevisions: Number(data.usedRevisions ?? 0),
        extraRevisionFee: parseMoney(data.extraRevisionFee),
        versions: data.versions || [],
        comments: [],
        approvedVersion: null,
        invoiceId: data.invoiceId || null,
        createdBy: user?.uid || user?.id || 'admin',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'projects', projectId), {
        renderingPackageId: packageRef.id,
        renderingStatus: 'invoice_required',
        nextAction: 'Issue rendering fee invoice',
        updatedAt: serverTimestamp(),
      });
      await recordProjectActivity(projectId, 'Rendering package created', { renderingPackageId: packageRef.id, clientId });
      notify('success', 'Rendering package created');
      return packageRef.id;
    } catch (e) {
      notify('error', 'Failed to create rendering package: ' + e.message);
      return null;
    }
  };

  const issueRenderingInvoice = async (projectId, amount, provider = 'paystack') => {
    if (!db || !projectId) return null;
    try {
      const projectSnap = await getDoc(doc(db, 'projects', projectId));
      if (!projectSnap.exists()) throw new Error('Project not found');
      const project = projectSnap.data();
      const fee = parseMoney(amount || project.renderingFee);
      if (!fee) throw new Error('Rendering fee amount is required.');
      const invoiceId = await createInvoice({
        projectId,
        parentId: projectId,
        clientId: project.clientId,
        clientName: project.clientName || project.name || '',
        clientEmail: project.email || '',
        clientPhone: project.phone || '',
        title: `Rendering / CAD 3D Access Fee — ${project.title || 'Project'}`,
        type: 'rendering_fee',
        invoiceType: 'rendering_fee',
        stageGate: 2,
        provider,
        amount: fee,
        total: fee,
        currency: 'GHS',
        status: 'Pending',
        due: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      });
      await updateDoc(doc(db, 'projects', projectId), {
        renderingInvoiceId: invoiceId,
        renderingFee: fee,
        renderingStatus: 'invoice_sent',
        nextAction: 'Awaiting rendering fee payment',
        updatedAt: serverTimestamp(),
      });
      if (project.renderingPackageId) {
        await updateDoc(doc(db, 'renderingPackages', project.renderingPackageId), {
          invoiceId,
          status: 'invoice_sent',
          updatedAt: serverTimestamp(),
        });
      }
      await recordProjectActivity(projectId, 'Rendering fee invoice issued', { invoiceId, amount: fee, clientId: project.clientId });
      return invoiceId;
    } catch (e) {
      notify('error', 'Failed to issue rendering invoice: ' + e.message);
      return null;
    }
  };

  const approveRenderingPackage = async (projectId, packageId = null, comment = '') => {
    if (!db || !projectId) return;
    try {
      const projectSnap = await getDoc(doc(db, 'projects', projectId));
      if (!projectSnap.exists()) throw new Error('Project not found');
      const project = projectSnap.data();
      const targetPackageId = packageId || project.renderingPackageId;
      if (targetPackageId) {
        await updateDoc(doc(db, 'renderingPackages', targetPackageId), {
          status: 'approved',
          approvedAt: serverTimestamp(),
          approvedBy: user?.uid || user?.id || project.clientId || 'client',
          approvalComment: sanitizeText(comment || ''),
          updatedAt: serverTimestamp(),
        });
      }
      await updateDoc(doc(db, 'projects', projectId), {
        renderingApproved: true,
        renderingApprovedAt: serverTimestamp(),
        renderingStatus: 'approved',
        nextAction: 'Prepare final project quote',
        updatedAt: serverTimestamp(),
      });
      await recordProjectActivity(projectId, 'Rendering approved', { renderingPackageId: targetPackageId, clientId: project.clientId });
      notify('success', 'Rendering approved. Final quote can now be prepared.');
    } catch (e) {
      notify('error', 'Failed to approve rendering');
    }
  };

  const createQuoteVersion = async (projectId, data = {}) => {
    if (!db || !projectId) return null;
    try {
      const projectSnap = await getDoc(doc(db, 'projects', projectId));
      if (!projectSnap.exists()) throw new Error('Project not found');
      const project = projectSnap.data();
      if (!project.renderingApproved && !data.adminOverride) {
        notify('error', 'Final quote is locked until rendering is approved.');
        return null;
      }
      const existing = await getDocs(query(collection(db, 'quotes'), where('projectId', '==', projectId)));
      const version = Number(data.version || existing.size + 1);
      const total = parseMoney(data.total || data.amount || project.budget || project.projectTotal);
      const quoteRef = await addDoc(collection(db, 'quotes'), {
        projectId,
        clientId: project.clientId,
        version,
        title: sanitizeText(data.title || `${project.title || 'Project'} Quote v${version}`),
        scopeItems: data.scopeItems || [],
        exclusions: data.exclusions || [],
        optionalItems: data.optionalItems || [],
        addOns: data.addOns || [],
        discounts: data.discounts || [],
        total,
        status: data.status || 'sent',
        createdBy: user?.uid || user?.id || 'admin',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'projects', projectId), {
        activeQuoteId: quoteRef.id,
        activeQuoteVersion: version,
        quoteStatus: 'sent',
        projectTotal: total,
        budget: total ? String(total) : project.budget || '',
        nextAction: 'Awaiting final quote approval',
        updatedAt: serverTimestamp(),
      });
      await recordProjectActivity(projectId, `Quote v${version} created`, { quoteId: quoteRef.id, amount: total, clientId: project.clientId });
      notify('success', `Quote v${version} created`);
      return quoteRef.id;
    } catch (e) {
      notify('error', 'Failed to create quote: ' + e.message);
      return null;
    }
  };

  const createAddOn = async (projectId, data = {}) => {
    if (!db || !projectId) return null;
    try {
      const project = clients.find(p => p.id === projectId) || {};
      const amount = parseMoney(data.amount || data.price);
      const addOnRef = await addDoc(collection(db, 'addOns'), {
        projectId,
        clientId: data.clientId || project.clientId || getProjectClientId(projectId),
        description: sanitizeText(data.description || data.title || 'Project add-on'),
        reason: sanitizeText(data.reason || ''),
        amount,
        timelineImpactDays: Number(data.timelineImpactDays || 0),
        approvalStatus: data.approvalStatus || 'pending',
        invoiceStatus: 'not_invoiced',
        paymentStatus: 'unpaid',
        linkedFiles: data.linkedFiles || [],
        createdBy: user?.uid || user?.id || 'admin',
        approvedBy: null,
        paidAt: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await recordProjectActivity(projectId, 'Add-on requested', { addOnId: addOnRef.id, amount });
      notify('success', 'Add-on request created');
      return addOnRef.id;
    } catch (e) {
      notify('error', 'Failed to create add-on: ' + e.message);
      return null;
    }
  };

  const approveAddOn = async (addOnId, projectId) => {
    if (!db || !addOnId || !projectId) return;
    try {
      const addOnSnap = await getDoc(doc(db, 'addOns', addOnId));
      if (!addOnSnap.exists()) throw new Error('Add-on not found');
      const addOn = addOnSnap.data();
      const amount = parseMoney(addOn.amount);
      const batch = writeBatch(db);
      batch.update(doc(db, 'addOns', addOnId), {
        approvalStatus: 'approved',
        approvedBy: user?.uid || user?.id || 'client',
        approvedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.update(doc(db, 'projects', projectId), {
        approvedAddOnsTotal: increment(amount),
        projectTotal: increment(amount),
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
      await recordProjectActivity(projectId, 'Add-on approved', { addOnId, amount, clientId: addOn.clientId });
      notify('success', 'Add-on approved and added to project total');
    } catch (e) {
      notify('error', 'Failed to approve add-on: ' + e.message);
    }
  };

  const updateProjectTimeline = async (projectId, stageId, patch = {}) => {
    if (!db || !projectId || !stageId) return;
    try {
      const snap = await getDoc(doc(db, 'projects', projectId));
      if (!snap.exists()) throw new Error('Project not found');
      const project = snap.data();
      const previous = (project.stageTimeline || []).find(t => Number(t.stageId) === Number(stageId)) || {};
      const stageTimeline = CLIENT_PROJECT_STAGES.map(stage => {
        const current = (project.stageTimeline || []).find(t => Number(t.stageId) === stage.id) || { stageId: stage.id, owner: stage.whoActs };
        return stage.id === Number(stageId)
          ? { ...current, ...patch, stageId: stage.id, updatedAt: new Date().toISOString(), updatedBy: user?.uid || user?.id || 'admin' }
          : current;
      });
      await updateDoc(doc(db, 'projects', projectId), { stageTimeline, updatedAt: serverTimestamp() });
      await recordProjectActivity(projectId, `Timeline updated for stage ${stageId}`, {
        stageId,
        previousEstimatedEndDate: previous.estimatedEndDate || null,
        newEstimatedEndDate: patch.estimatedEndDate || previous.estimatedEndDate || null,
        delayReason: patch.delayReason || '',
      });
      notify('success', 'Timeline updated');
    } catch (e) {
      notify('error', 'Failed to update timeline');
    }
  };

  const createApproval = async (projectId, data) => {
    if (!db) return;
    try {
      const clientId = data.clientId || getProjectClientId(projectId);
      await addDoc(collection(db, 'approvals'), { ...data, clientId, projectId, status: data.status || 'pending', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      await addDoc(collection(db, 'projects', projectId, 'approvals'), { ...data, clientId, projectId, status: data.status || 'pending', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      notifyUser(dbClients.find(c => c.id === clients.find(p => p.id === projectId)?.clientId)?.id, "New technical item requires your approval", "approval");
    } catch (e) { devErr(e); }
  };

  const updateApproval = async (id, data, projectId) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'projects', projectId, 'approvals', id), data);
      logAction(projectId, 'Approval', `Item ${id} marked as ${data.status}`);
    } catch (e) { devErr(e); }
  };

  const createChangeRequest = async (projectId, data) => {
    if (!db) return;
    try {
      const clientId = data.clientId || getProjectClientId(projectId);
      await addDoc(collection(db, 'change_requests'), { ...data, clientId, projectId, status: 'pending', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      await addDoc(collection(db, 'projects', projectId, 'change_requests'), { ...data, clientId, projectId, status: 'pending', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      // Notify Admin
      teamMembers.filter(m => m.role === 'admin').forEach(admin => {
        notifyUser(admin.id, "New change request submitted by client", "change_request");
      });
    } catch (e) { devErr(e); }
  };

  const updateChangeRequest = async (id, data, projectId) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'projects', projectId, 'change_requests', id), data);
      logAction(projectId, 'ChangeRequest', `Request ${id} updated to ${data.status}`);
    } catch (e) { devErr(e); }
  };

  const payInvoice = async (id, projectId, method = 'Paystack') => {
    if (!db) return;
    try {
      const inv = invoices.find(i => i.id === id);
      const projectSnap = projectId ? await getDoc(doc(db, 'projects', projectId)) : null;
      const project = projectSnap?.exists?.() ? projectSnap.data() : clients.find(p => p.id === projectId);
      const amount = parseMoney(inv?.total ?? inv?.amount);
      const txId = `TX-${Date.now()}`;
      const newTx = {
        id: txId,
        projectId,
        clientId: inv?.clientId || getProjectClientId(projectId),
        invoiceId: id,
        amount,
        invoiceType: inv?.invoiceType || inv?.type || 'invoice',
        stageGate: inv?.stageGate || null,
        date: new Date().toISOString().split('T')[0],
        method,
        provider: method,
        reference: id,
        status: 'verified'
      };
      const batch = writeBatch(db);
      if (projectId) {
        batch.set(doc(db, 'projects', projectId, 'transactions', txId), newTx);
        batch.update(doc(db, 'projects', projectId), {
          paidAmount: increment(amount),
          updatedAt: serverTimestamp(),
          ...(inv?.invoiceType === 'rendering_fee' || inv?.type === 'rendering_fee' ? {
            renderingFeePaid: true,
            renderingUnlocked: true,
            renderingStatus: 'paid_unlocked',
            nextAction: 'Client can review rendering',
          } : {}),
          ...(inv?.invoiceType === 'deposit' || inv?.type === 'deposit' ? {
            depositPaid: true,
            depositStatus: 'paid',
            nextAction: 'Begin procurement and production',
          } : {}),
          ...(inv?.invoiceType === 'final_balance' || inv?.type === 'final_balance' ? {
            finalPaymentPaid: true,
            finalSettlementStatus: 'paid',
            nextAction: 'Issue handover documents',
          } : {}),
        });
      }
      batch.set(doc(db, 'transactions', txId), newTx);
      if (id && inv) {
        batch.update(doc(db, 'invoices', id), {
          status: 'Paid',
          paidAt: serverTimestamp(),
          method,
          provider: method,
          transactionId: txId,
          balanceDue: 0,
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
      if ((inv?.invoiceType === 'rendering_fee' || inv?.type === 'rendering_fee') && project?.renderingPackageId) {
        await updateDoc(doc(db, 'renderingPackages', project.renderingPackageId), {
          status: 'paid_unlocked',
          accessStatus: 'unlocked',
          paidAt: serverTimestamp(),
          transactionId: txId,
          updatedAt: serverTimestamp(),
        });
        try {
          const projectDocs = await getDocs(query(collection(db, 'projects', projectId, 'documents'), where('documentType', '==', 'rendering')));
          const topDocs = await getDocs(query(collection(db, 'documents'), where('projectId', '==', projectId), where('documentType', '==', 'rendering')));
          const unlockBatch = writeBatch(db);
          projectDocs.docs.forEach(d => unlockBatch.update(d.ref, { clientVisible: true, unlockedAt: serverTimestamp() }));
          topDocs.docs.forEach(d => unlockBatch.update(d.ref, { clientVisible: true, unlockedAt: serverTimestamp() }));
          await unlockBatch.commit();
        } catch (unlockErr) {
          devWarn('[rendering unlock docs]', unlockErr);
        }
      }
      await recordProjectActivity(projectId, `Invoice paid via ${method}`, { invoiceId: id, transactionId: txId, amount, clientId: newTx.clientId });
      notify('success', `Payment of ${amount ? `GHS ${amount.toLocaleString()}` : ''} confirmed via ${method}`);
    } catch (e) { devErr(e); }
  };

  const recordOfflinePayment = async (pid, amount, method, ref) => {
    if (!db) return;
    try {
      const newTx = {
        parentId: pid,
        projectId: pid,
        clientId: getProjectClientId(pid),
        invoiceId: ref || 'Manual Entry',
        amount: String(amount),
        date: new Date().toISOString().split('T')[0],
        method,
        status: 'verified'
      };
      await addDoc(collection(db, 'projects', pid, 'transactions'), newTx);
      logAction(pid, 'Finance', `Offline payment of $${amount} recorded via ${method} (${ref})`);
      notify('success', 'Manual payment recorded in audit trail');
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
    const stagePct = ((proj.stageId || 1) / 10) * 100;
    
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
    try { await addDoc(collection(db, 'projects', projectId, 'procurements'), { ...data, projectId, clientId: data.clientId || getProjectClientId(projectId), createdAt: new Date().toISOString() }); notify('success', 'Tracker Updated'); }
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
      await addDoc(collection(db, 'projects', pid, 'procurements'), { ...data, projectId: pid, clientId: data.clientId || getProjectClientId(pid), isShipment: true, createdAt: new Date().toISOString() });
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
    try { await addDoc(collection(db, 'projects', projectId, 'notes'), { ...data, projectId, clientId: data.clientId || getProjectClientId(projectId), createdAt: new Date().toISOString() }); }
    catch(e) { devErr(e); }
  };
  const deleteNote = async (projectId, id) => {
    if (!db) return;
    try { await deleteDoc(doc(db, 'projects', projectId, 'notes', id)); }
    catch(e) { devErr(e); }
  };

  const deleteProject = async (projectId) => {
    if (!db) return;
    try {
      // Delete subcollections first (messages, documents, notes)
      const subcols = ['messages', 'documents', 'notes', 'procurements'];
      await Promise.all(subcols.map(async sub => {
        const snap = await getDocs(collection(db, 'projects', projectId, sub));
        return Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
      }));
      await deleteDoc(doc(db, 'projects', projectId));
      notify('success', 'Project deleted');
    } catch (e) {
      devErr(e);
      notify('error', 'Failed to delete project');
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

  const sendWhatsAppUpdate = async (clientId, projectId, stageName) => {
    const c = dbClients.find(x => x.id === clientId) || { phone: clientId, name: 'Client' };
    const p = clients.find(x => x.id === projectId) || { project: 'General Works' };
    
    try {
      notify('pending', `Sending SMS to ${c.name}...`);
      const message = stageName.includes(' ') ? stageName : `Hello ${c.name}, your project "${p.project || p.title}" has moved to the ${stageName} phase. - Westline Future`;

      await MessengerService.sendMessage(c.phone || clientId, message);
      notify('success', 'SMS sent successfully');
      if (projectId) logAction(projectId, 'Notification', `SMS update sent: ${stageName}`);
    } catch (err) {
      notify('error', 'SMS dispatch failed');
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
      type: 'General Inquiry',
      sentAt: new Date().toLocaleDateString(),
      details: data
    };
    setEmails(prev => [payload, ...prev]);
    if (db) {
      try {
        await setDoc(doc(db, 'emails', payload.id), payload);
        notify('success', 'Inquiry sent successfully to our procurement team.');
      } catch (e) {
        devErr("Failed to sync contact inquiry:", e);
        notify('error', 'Message dispatch failed.');
      }
    }
  };
  
  const createClient = async (data) => {
    try {
      if (!functions) {
        notify('error', 'System unavailable');
        return;
      }
      if (!data.phone) throw new Error('A valid phone number is required.');

      notify('pending', 'Registering client...');

      const fn = httpsCallable(functions, 'createClientRecord');
      const result = await fn(data);
      const { id, updated } = result.data;

      if (updated) {
        notify('success', 'Existing client record updated.');
        return;
      }

      notify('success', `${data.name} registered successfully.`);

      // Welcome SMS — phone OTP handles login, no credentials needed
      const smsPhone = `+${id}`;
      const message = `Hi ${data.name}, welcome to Westline Future!\n\nYour project portal is ready. Log in at:\nwestlinefuture-635c2.web.app/login\n\nEnter your phone number and we'll send you a one-time code.`;

      try {
        await MessengerService.sendMessage(smsPhone, message);
        notify('success', 'Welcome SMS sent.');
      } catch (smsErr) {
        if (import.meta.env.DEV) devWarn('[SMS]', smsErr.message);
        notify('success', 'Client registered. SMS failed — notify them manually.');
      }

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


  const parseMoney = (value) => {
    if (typeof value === 'number') return value;
    const n = parseFloat(String(value || '').replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) ? n : 0;
  };

  const createProject = async (data) => {
    if (!db) return;
    try {
      const id = normalizeClientId(data.clientId);
      if (!id) throw new Error("Identifier Validation Failed: Client ID is required.");

      const docRef = await addDoc(collection(db, 'projects'), {
        ...data,
        clientId: id,
        primaryClientId: id,
        clientIds: [id],
        status: 'Initialized',
        stageId: 1,
        stageModel: 'westline-10-stage-v1',
        renderingStatus: 'not_started',
        quoteStatus: 'not_started',
        depositStatus: 'not_started',
        projectTotal: parseMoney(data.budget),
        approvedAddOnsTotal: 0,
        paidAmount: 0,
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
    const num = parseMoney(budget);
    if (!num) return [];
    const fmt = (v) => `GHS ${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    const ts = Date.now();
    const SCHEDULES = {
      standard: [
        { name: '50% Project Deposit', pct: 0.50, stageId: 5, invoiceType: 'deposit' },
        { name: '50% Final Settlement', pct: 0.50, stageId: 10, invoiceType: 'final_balance' },
      ],
      '70-30': [
        { name: '70% Before Procurement', pct: 0.70, stageId: 5, invoiceType: 'deposit' },
        { name: '30% Final Settlement',  pct: 0.30, stageId: 10, invoiceType: 'final_balance' },
      ],
    };
    const template = SCHEDULES[paymentSchedule] || SCHEDULES.standard;
    return template.map((m, i) => ({
      id: `ms_${ts}_${i}`,
      name: m.name,
      pct: m.pct,
      amount: fmt(num * m.pct),
      stageId: m.stageId,
      invoiceType: m.invoiceType,
      status: 'Pending',
    }));
  };

  const createClientProject = async (data) => {
    if (!db) return;
    try {
      const clientId = normalizeClientId(data.clientId);
      if (!clientId) throw new Error('Client ID is required.');
      const milestones = data.milestones?.length ? data.milestones : buildDefaultMilestones(data.budget, data.paymentSchedule);
      const effectiveDate = data.projectDate ? new Date(data.projectDate).toISOString() : new Date().toISOString();
      const docRef = await addDoc(collection(db, 'projects'), {
        title: sanitizeText(data.title || 'New Project'),
        clientId,
        primaryClientId: clientId,
        clientIds: [clientId],
        projectType: data.projectType || 'full-service',
        stageId: 1,
        stageModel: 'westline-10-stage-v1',
        status: 'Active',
        budget: data.budget || '',
        projectTotal: parseMoney(data.budget),
        approvedAddOnsTotal: 0,
        paidAmount: 0,
        breakdown: data.breakdown || null,
        paymentSchedule: data.paymentSchedule || 'standard',
        renderingFee: parseMoney(data.renderingFee),
        renderingStatus: 'not_started',
        quoteStatus: 'not_started',
        depositStatus: 'not_started',
        finalSettlementStatus: 'not_started',
        nextAction: 'Create rendering fee invoice',
        description: sanitizeText(data.description || ''),
        milestones,
        stageTimeline: CLIENT_PROJECT_STAGES.map((stage, index) => ({
          stageId: stage.id,
          status: stage.id === 1 ? 'on_track' : 'upcoming',
          estimatedStartDate: null,
          estimatedEndDate: null,
          actualStartDate: stage.id === 1 ? effectiveDate : null,
          actualEndDate: null,
          delayReason: '',
          owner: stage.whoActs,
          clientNote: '',
          internalNote: '',
          order: index + 1,
        })),
        assignedWorkers: [],
        assignedStaff: user?.uid || user?.id ? [user.uid || user.id] : [],
        stageHistory: [{ stageId: 1, note: data.projectDate ? `Project created (backdated to ${data.projectDate})` : 'Project created', timestamp: effectiveDate, byRole: 'admin' }],
        createdAt: data.projectDate ? effectiveDate : serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
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
      if (newStageId >= 3 && !data.renderingFeePaid && !options.adminOverride) {
        notify('error', 'Stage locked: rendering fee must be paid before the client can review drawings.');
        return;
      }
      if (newStageId >= 4 && !data.renderingApproved && !options.adminOverride) {
        notify('error', 'Stage locked: rendering must be approved before the final quote.');
        return;
      }
      if (newStageId >= 5 && !data.quoteApproved && !options.adminOverride) {
        notify('error', 'Stage locked: final quote approval is required before project deposit.');
        return;
      }
      if (newStageId >= 6 && !data.depositPaid && !options.adminOverride) {
        notify('error', 'Stage locked: project deposit must be paid before procurement.');
        return;
      }
      const effectiveTimestamp = options.overrideDate
        ? new Date(options.overrideDate).toISOString()
        : new Date().toISOString();
      const stageHistory = [...(data.stageHistory || []), {
        stageId: newStageId, note: sanitizeText(note) || 'Stage advanced',
        timestamp: effectiveTimestamp, byRole: 'admin',
        ...(options.overrideDate ? { backdated: true } : {}),
      }];
      const stage = CLIENT_PROJECT_STAGES.find(s => s.id === newStageId);
      await updateDoc(doc(db, 'projects', projectId), {
        stageId: newStageId,
        status: newStageId === 10 && /final payment|settlement|complete|handover/i.test(note) ? 'Completed' : 'Active',
        progress: stage?.pct ?? Math.round((newStageId / 10) * 100),
        nextAction: computeNextProjectAction({ ...data, stageId: newStageId }, newStageId),
        stageHistory,
        updatedAt: serverTimestamp(),
      });
      await addDoc(collection(db, 'projects', projectId, 'messages'), {
        text: `Stage updated to: ${stage?.name || `Stage ${newStageId}`}. ${stage?.clientMsg || ''}`,
        senderRole: 'system', senderId: 'system', senderName: 'Westline Future',
        isInternal: true, createdAt: serverTimestamp(),
      });
      if (data.clientId) {
        try { await sendWhatsAppUpdate(data.clientId, projectId, stage?.name || `Stage ${newStageId}`); } catch (_) {}
        await createNotification(data.clientId, `Your project "${data.title}" has progressed to ${stage?.name}.`, 'info', '/portal');
      }
      notify('success', `Project advanced to ${stage?.name}`);
      logAction(data.clientId, 'Projects', `Stage ${newStageId} — ${projectId}`);
    } catch (e) {
      notify('error', 'Failed to update stage');
      devErr(e);
    }
  };

  const addProjectMessage = async (projectId, text, senderRole = 'admin', isInternal = false, meta = {}) => {
    if (!db || !text?.trim()) return;
    const senderName = user?.name || user?.displayName || 'Westline Future Team';
    try {
      await addDoc(collection(db, 'projects', projectId, 'messages'), {
        text: sanitizeText(text.trim()),
        type: meta.type || 'text',
        audioUrl: meta.audioUrl || null,
        duration: meta.duration || null,
        transcript: meta.transcript || null,
        originalLanguage: meta.originalLanguage || null,
        translations: meta.translations || {},
        senderRole,
        senderId: user?.uid || user?.id || 'admin',
        senderName,
        isInternal,
        createdAt: serverTimestamp(),
      });
      if (!isInternal) {
        const project = clients.find(p => p.id === projectId);
        if (project) {
          // Notify the client
          if (project.clientId) {
            try { await createNotification(project.clientId, `New message from ${senderName} on your project`, 'message', `/portal`); } catch (_) {}
          }
          // If a staff/worker sent the message, also notify admin (uid-based lookup)
          // If admin sent, notify assigned staff members
          if (senderRole === 'admin') {
            const assignedWorkers = project.assignedWorkers || [];
            for (const workerId of assignedWorkers) {
              try { await createNotification(workerId, `Admin sent a message on ${project.project || project.title}`, 'message', `/admin/client-hub`); } catch (_) {}
            }
          }
        }
      }
    } catch (e) {
      notify('error', 'Message failed');
    }
  };

  const assignWorkerToProject = async (projectId, workerId) => {
    if (!db) return;
    try {
      const snap = await getDoc(doc(db, 'projects', projectId));
      if (!snap.exists()) return;
      const current = snap.data().assignedWorkers || [];
      const updated = current.includes(workerId) ? current.filter(id => id !== workerId) : [...current, workerId];
      await updateDoc(doc(db, 'projects', projectId), { assignedWorkers: updated, updatedAt: serverTimestamp() });
      notify('success', current.includes(workerId) ? 'Worker unassigned' : 'Worker assigned to project');
    } catch (e) {
      notify('error', 'Failed to update worker assignment');
    }
  };

  const approveQuote = async (projectId) => {
    if (!db) return;
    try {
      const project = clients.find(p => p.id === projectId);
      await updateDoc(doc(db, 'projects', projectId), {
        quoteApproved: true,
        quoteApprovedAt: serverTimestamp(),
        quoteStatus: 'approved',
        approvedQuoteId: project?.activeQuoteId || null,
        approvedQuoteVersion: project?.activeQuoteVersion || null,
        nextAction: 'Create project deposit invoice',
        updatedAt: serverTimestamp(),
      });
      if (project?.activeQuoteId) {
        try {
          await updateDoc(doc(db, 'quotes', project.activeQuoteId), {
            status: 'approved',
            approvedBy: user?.uid || user?.id || project.clientId || 'client',
            approvedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (_) {}
      }
      await recordProjectActivity(projectId, 'Final quote approved', { quoteId: project?.activeQuoteId || null, clientId: project?.clientId || null });
      notify('success', 'Quote approved. Deposit payment is now available.');
    } catch (e) { notify('error', 'Failed to approve quote'); }
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
        documentType: meta.documentType || meta.category || (meta.stageId === 3 ? 'rendering' : 'project'),
        category: meta.category || (meta.stageId === 3 ? 'rendering' : 'project'),
        clientVisible: meta.clientVisible ?? !(meta.documentType === 'rendering' || meta.category === 'rendering' || meta.stageId === 3),
        projectId,
        clientId: meta.clientId || getProjectClientId(projectId),
        uploadedBy: meta.uploadedBy || 'admin',
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'projects', projectId, 'documents'), docData);
      await addDoc(collection(db, 'documents'), docData);
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
         projectId,
         clientId: getProjectClientId(projectId),
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

  const addContainer = async (data) => {
    if (!db) return;
    try {
      const docRef = await addDoc(collection(db, 'containers'), {
        ...data,
        createdAt: data.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      notify('success', 'Shipment added');
      return docRef.id;
    } catch (e) {
      notify('error', 'Failed to add shipment: ' + e.message);
      throw e;
    }
  };

  const deleteClient = async (id) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'users', id));
      
      // Cleanup ghost records associated with this client
      const collectionsToCleanup = [
        'projects', 'work_orders', 'invoices', 'tasks', 
        'approvals', 'change_requests', 'procurements'
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
      
      notify('success', 'Client and associated records removed');
      logAction(null, 'CRM', `Deleted Client and records: ${id}`);
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

      const result = await signInWithPhoneNumber(auth, phone, window._gtRecaptcha);
      confirmationResultRef.current = result;

      notify('success', `Code sent to ${phone}`);
      return true;
    } catch (err) {
      if (window._gtRecaptcha) {
        try { window._gtRecaptcha.clear(); } catch (_) {}
        window._gtRecaptcha = null;
      }
      const container = document.getElementById('recaptcha-container');
      if (container) container.innerHTML = '';
      setNotification({ msg: err.message, type: 'error' });
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
      localStorage.setItem('westlinefuture_session', JSON.stringify({ id: userDoc.id, phone, user: fullUser, expiry: Date.now() + 86400000 }));
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
      localStorage.removeItem('westlinefuture_session');
      localStorage.removeItem('glasstech_session');
      setUser(null);
      setLoginType('client'); // always reset to client/OTP mode on logout
      navigate('/login');
    } catch (e) {
      devErr("Logout failed:", e);
      notify('error', 'Logout failed');
    }
  };

  const createStaffAccount = async ({ name, email, role, password }) => {
    if (!functions) throw new Error('System not connected');
    if (!email?.trim()) throw new Error('Email is required');
    try {
      const fn = httpsCallable(functions, 'createStaffAccount');
      await fn({ name: name.trim(), email: email.trim(), password, jobRole: role });
      notify('success', `Account created for ${name}`);
      logAction(null, 'Staff', `Created ${role === 'Field Worker' ? 'worker' : 'staff'} account for ${name} (${role})`);
    } catch (err) {
      throw new Error(err.message);
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
      notify('error', err.message || 'Failed to delete staff account');
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
    page, setPage, navigate,
    brand, setBrand, content, setContent,
    clients, updateProject: syncProjects,
    dbClients: uniqueDbClients, rawDbClients: dbClients,
    createClient, updateClient,
    loadMoreMessages, hasMoreMessages,
    loadMoreInvoices, hasMoreInvoices,
    loadMoreWorkOrders, hasMoreWorkOrders,
    teamMembers,
    logs, logAction, 
    invoices,
    payInvoice,
    createInvoice,
    deleteInvoice,
    deleteProposal,
    uploadMedia,
    handleMediaUpload: ({ file, parentId, stageId = 1 }) => uploadMedia(parentId, file, stageId),
    deleteMedia,
    createProposal,
    createProcurement, updateProcurement, deleteProcurement,
    createShipment, updateShipment,
    createNote, deleteNote,
    transactions, recordOfflinePayment,
    materials, updateMaterial,
    assets, updateAsset,
    updateStage, calculateProjectPulse,
    submitContact: submitContactInquiry,
    submitMarketplace: submitMarketplaceInquiry,
    sendOTP, verifyOTP, findUserByPhone,
    loginWithCredentials, resetUserPassword, changeClientPassword,
    deleteClient, deleteAllClients, deleteSelectedClients,
    activeMagicCode, 
    userNotifications, markNotificationRead,
    submitMarketplaceInquiry,
    migrateToFirebase, getSLA, syncCMS, PROJECT_STAGES,
    updateEmailStatus, convertInquiryToProject, sendToProcurement,
    currency, setCurrency, rates,
    onPortal: (type) => { setLoginType(type); navigate('/login'); },
    formatPrice: (priceStr) => {
      if (!priceStr) return '-';
      const num = typeof priceStr === 'number' ? priceStr : parseFloat(String(priceStr).replace(/[^0-9.]/g, ''));
      if (isNaN(num)) return priceStr;
      const converted = num * (rates[currency] || 1);
      const symbol = currency === 'GHS' ? 'GH₵' : currency === 'EUR' ? '€' : '$';
      return `${symbol}${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    },
    lang, setLang, t, messages, sendMessage, testimonials, submitTestimonial, showVisualizer, setShowVisualizer,
    sendWhatsAppUpdate,
    jobs, createJob, updateJob,
    createClientProject, updateProjectStage, addProjectMessage, assignWorkerToProject, deleteProject,
    createRenderingPackage, issueRenderingInvoice, approveRenderingPackage,
    createQuoteVersion, createAddOn, approveAddOn, updateProjectTimeline,
    approveQuote, updateShippingDetails, addProjectDocument, createStaffAccount, deleteMember,
    workOrders, containers,
    updateWorkOrder: (id, d) => db && updateDoc(doc(db, 'work_orders', id), { ...d, updatedAt: serverTimestamp() }),
    createWorkOrder,
    addContainer,
    updateContainer: (id, d) => db && updateDoc(doc(db, 'containers', id), d),
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

      const isAdminEmail = e?.endsWith('@westlinefuture.com');
      const isActualAdminMode = mode === 'admin' || isAdminEmail;

      if (isActualAdminMode) {
        checkRateLimit(e || 'admin-unknown');
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
          clearRateLimit(e);
          return res;
        } catch (signInErr) {
          if ((signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential') && isAdminEmail) {
            throw new Error("Admin account is not provisioned or the password is incorrect. Provision admin users server-side before login.");
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
    <div style={{ background: '#0D0B2E', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#231F78', fontFamily: 'Inter' }}>
      <div className="pulse" style={{ fontSize: '1.2rem', letterSpacing: '4px', textTransform: 'uppercase' }}>Authenticating</div>
      <div style={{ marginTop: '20px', fontSize: '0.8rem', opacity: 0.6 }}>Securing Westline Future Gateway...</div>
    </div>
  );

  return (
    <div className="lxf-platform">
      <div className="mesh-bg" />
      <Suspense fallback={
        <div style={{ background: '#0D0B2E', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#231F78', fontFamily: 'Inter' }}>
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
              <WorkerView user={user} onLogout={handleLogout} {...commonProps} />
            </ProtectedRoute>
          } />
        </Routes>
      </Suspense>

      {notification && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 10000, padding: '12px 24px', borderRadius: 100, background: notification.type === 'error' ? '#EF4444' : '#0D0B2E', color: '#fff', fontSize: 13, boxShadow: '0 8px 32px rgba(0,0,0,.15)' }}>
           {notification.msg}
        </div>
      )}
    </div>
  );
}
