import React, { useState, useEffect, Suspense, lazy, useRef } from 'react';
const PublicSite = lazy(() => import('./pages/PublicSite'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const AdminPortal = lazy(() => import('./pages/AdminPortal'));
const ClientPortal = lazy(() => import('./pages/ClientPortal'));
const AccountManagerPortal = lazy(() => import('./pages/AccountManagerPortal'));
const ProductsHub = lazy(() => import('./pages/ProductsHub'));
const Portfolio = lazy(() => import('./pages/Portfolio'));
const Showcase = lazy(() => import('./pages/Showcase'));
const FieldUpload = lazy(() => import('./pages/admin/FieldUpload'));
import ProtectedRoute from './components/ProtectedRoute';
import { sanitizeText } from './lib/sanitize';
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
  BRAND0, DEFAULT_SCENES, INITIAL_CONTENT
} from './data.jsx';


import { auth, db, storage, isFirebaseEnabled } from './lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { 
  collection, query, onSnapshot, getDocs, getDoc, doc, 
  updateDoc, addDoc, setDoc, deleteDoc, orderBy, collectionGroup, limit, where, serverTimestamp, or
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
    user, clients, proposals, invoices, bookings, emails, setEmails, dbClients, teamMembers, logs, shipments, messages, testimonials, tasks, transactions, changeRequests, userNotifications, procurements, jobs, notes, media, approvals, materials, assets, workOrders, containers,
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
  const rates = { USD: 1, GHS: 15.2, EUR: 0.93 };



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
      console.warn("Failed to create system notification:", err);
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

      const _seedPw = import.meta.env.VITE_SEED_CLIENT_PASSWORD || 'Westline Future2026';
      const _adminUid1 = import.meta.env.VITE_ADMIN_UID_1 || 'qRcOaTkJ6rYmjha9jNAadrYW6pK2';
      const _adminUid2 = import.meta.env.VITE_ADMIN_UID_2 || 'pBkrb38P9NaXXjIILQXlqxxC33p2';
      const _clientUid1 = import.meta.env.VITE_CLIENT_UID_1 || 'GQL4qVw3NIe9XVq8gZFkuU4Q9dD3';
      const DEMO_ACCOUNTS = [
        { email: 'admin@stormglide.com', role: 'admin', name: 'Super Admin', uid: _adminUid1 },
        { email: 'admin@westlinefuture.com', role: 'admin', name: 'Factory Admin', uid: _adminUid2 },
        { email: 'client@westlinefuture.com', role: 'client', name: 'Elite Client', username: 'elite_finish', password: _seedPw, uid: _clientUid1 },
        { email: 'client@demo.com', role: 'client', name: 'Demo Client', username: 'demo_user', password: _seedPw },
        { phone: '233547748678', role: 'client', name: 'Authorized Tester', username: 'tester_01', password: _seedPw }
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
              { id: 'm2', name: 'Production Phase', amount: '$100,000', stageId: 5, status: 'Pending' },
              { id: 'm3', name: 'Final Handover', amount: '$50,000', stageId: 12, status: 'Pending' }
            ]
          },
          {
            id: 'PROJ_002', title: 'Coastal Villa Skylight', name: 'Elite Client',
            email: 'client@westlinefuture.com', budget: '$85,000', progress: 15, stage: 2,
            cat: 'Custom Aluminum Fit-out',
            milestones: [
              { id: 'm1', name: 'Down Payment', amount: '$34,000', stageId: 1, status: 'Paid', paidAt: new Date().toISOString() },
              { id: 'm2', name: 'Material Procurement', amount: '$34,000', stageId: 3, status: 'Pending' },
              { id: 'm3', name: 'On-site Installation', amount: '$17,000', stageId: 10, status: 'Pending' }
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
            { id: 'm2', name: 'Production (40%)', amount: '$' + (projectBudget * 0.4).toLocaleString(), stageId: 4, status: 'Pending' },
            { id: 'm3', name: 'Final (20%)', amount: '$' + (projectBudget * 0.2).toLocaleString(), stageId: 11, status: 'Pending' }
          ];

          await setDoc(doc(db, 'projects', pid), {
            ...item, id: pid, title: item.project || item.title,
            clientId: cid, clientIds: [cid],
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
          riskReason: 'Port Congestion at Tema', items: [woId]
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

      notify('success', 'Westline Future Production Ecosystem Deployed');
    } catch (err) {
      console.error("[MIGRATION ERROR]:", err);
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
    } catch (error) { console.error("Logging failed:", error.message); }
  }, [user]);

  const notifyUser = async (userId, message, type, link = '') => {
    if (!userId || !db) return;
    try { await addDoc(collection(db, 'notifications'), { userId, message: sanitizeText(message), type, link, read: false, createdAt: new Date().toISOString() }); }
    catch (e) { console.error("Notification failed", e); }
  };

  const markNotificationRead = async (id) => {
    try { await updateDoc(doc(db, 'notifications', id), { read: true }); }
    catch (e) { console.error(e); }
  };

  const checkManualSession = async () => {
    const savedSession = localStorage.getItem('westlinefuture_session');
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
            console.log("[AUTH] Restored Client Session:", u.id);
            if (location.pathname === '/login') navigate('/portal');
            return true;
          }
        }
      } catch (e) {
        console.error("Session restoration failed:", e);
      }
    }
    return false;
  };

  const loginWithCredentials = async (username, password) => {
    checkRateLimit(username || 'unknown-client');
    if (!db || !isFirebaseEnabled) {
      const _demoPw = import.meta.env.VITE_SEED_CLIENT_PASSWORD || 'Westline Future2026';
      if ((username === 'elite_finish' || username === 'demo_user' || username === 'client@demo.com' || username === 'client@westlinefuture.com') && password === _demoPw) {
        const uMatch = CLIENTS_DATA.find(c => c.email === username) || CLIENTS_DATA[0] || { id: 1, name: 'Demo Client', email: username };
        const fullUser = { ...uMatch, role: 'client' };
        setUser(fullUser);
        localStorage.setItem('westlinefuture_session', JSON.stringify({ id: fullUser.id, expiry: Date.now() + 86400000 }));
        navigate('/portal');
        notify('success', `Welcome back, ${fullUser.name}`);
        return;
      }
      throw new Error("Invalid mock credentials.");
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
      
      const fullUser = { ...uData, id: normalizePhone(uData.phone || uDoc.id), uid: sessionUser.uid };
      delete fullUser.password;
      
      localStorage.setItem('westlinefuture_user_cache', JSON.stringify(fullUser));
      setUser(fullUser);
      clearRateLimit(username || 'unknown-client');
      setAuthLoading(false);
      setNotification(null);

      if (uData.onboarded === false) {
        await updateDoc(doc(db, 'users', uDoc.id), { onboarded: true });
      }

      navigate(fullUser.role === 'admin' ? '/admin' : '/portal');
      notify('success', `Welcome back, ${uData.name}`);
      return fullUser;
    } catch (e) {
      console.error("[LOGIN ERROR]:", e);
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
      } catch (e) { console.error(e); }
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
      console.error("Provisioning failed:", err);
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
        navigate(user.role === 'admin' ? '/admin' : '/portal');
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
         
         // AUTOMATED MILESTONE INVOICING
         const invoiceTriggers = {
           1: { title: 'Initial Consultation & Design Deposit', percent: 10 },
           4: { title: 'Fabrication Commencement Payment', percent: 40 },
           8: { title: 'Pre-Installation Logistics Settlement', percent: 40 },
           12: { title: 'Final Handover & Quality Settlement', percent: 10 }
         };

         if (invoiceTriggers[stageId] && project) {
            const { title, percent } = invoiceTriggers[stageId];
            const baseBudget = parseFloat(String(project.budget || '0').replace(/[^0-9.]/g, '')) || 0;
            const amount = (baseBudget * percent) / 100;
            
            if (amount > 0) {
              const existing = invoices.find(i => i.parentId === projectId && i.title === title);
              if (!existing) {
                console.log(`[AUTO-INVOICE] Generating ${title} for Project ${projectId}`);
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

         // FEEDBACK LOOP: If stage is 12 (Handover), request feedback
         if (stageId === 12 && project) {
           createNotification(project.clientId, "Project Complete! We'd love to hear your feedback on your Westline Future experience.", "success", "/portal?action=feedback");
         }
      }
      
      await updateDoc(doc(db, 'projects', projectId), { stage: stageId, progress: Math.round((stageId / 12) * 100) });
      logAction(projectId, 'Stage', `Moved to Stage ${stageId}`);
    } catch (e) { console.error(e); }
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
      console.error(err);
      notify('error', 'Generation failed');
    }
  };

  const createInvoice = async (data) => {
    if (!db) return;
    try {
      const docRef = await addDoc(collection(db, 'invoices'), {
        ...data,
        createdAt: new Date().toISOString(),
        status: data.status || 'Pending'
      });
      notify('success', 'Official Invoice Issued');
      return docRef.id;
    } catch (err) {
      console.error(err);
      notify('error', 'Issuance failed');
    }
  };

  const createApproval = async (projectId, data) => {
    if (!db) return;
    try {
      await addDoc(collection(db, 'projects', projectId, 'approvals'), { ...data, status: 'pending', createdAt: new Date().toISOString() });
      notifyUser(dbClients.find(c => c.id === clients.find(p => p.id === projectId)?.clientId)?.id, "New technical item requires your approval", "approval");
    } catch (e) { console.error(e); }
  };

  const updateApproval = async (id, data, projectId) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'projects', projectId, 'approvals', id), data);
      logAction(projectId, 'Approval', `Item ${id} marked as ${data.status}`);
    } catch (e) { console.error(e); }
  };

  const createChangeRequest = async (projectId, data) => {
    if (!db) return;
    try {
      await addDoc(collection(db, 'projects', projectId, 'change_requests'), { ...data, status: 'pending', createdAt: new Date().toISOString() });
      // Notify Admin
      teamMembers.filter(m => m.role === 'admin').forEach(admin => {
        notifyUser(admin.id, "New change request submitted by client", "change_request");
      });
    } catch (e) { console.error(e); }
  };

  const updateChangeRequest = async (id, data, projectId) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'projects', projectId, 'change_requests', id), data);
      logAction(projectId, 'ChangeRequest', `Request ${id} updated to ${data.status}`);
    } catch (e) { console.error(e); }
  };

  const payInvoice = async (id, projectId, method = 'Paystack') => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'projects', projectId, 'payments', id), { status: 'Paid', paidAt: new Date().toISOString(), method });
      
      const inv = invoices.find(i => i.id === id);
      const txId = `TX-${Date.now()}`;
      const newTx = {
        id: txId,
        invoiceId: id,
        amount: inv?.amount?.toString().replace(/[$,]/g, '') || 0,
        date: new Date().toISOString().split('T')[0],
        method,
        status: 'verified'
      };
      
      await setDoc(doc(db, 'projects', projectId, 'transactions', txId), newTx);
      notify('success', `Payment of ${inv?.amount || ''} confirmed via ${method}`);
    } catch (e) { console.error(e); }
  };

  const recordOfflinePayment = async (pid, amount, method, ref) => {
    if (!db) return;
    try {
      const newTx = {
        parentId: pid,
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
    const stagePct = ((proj.stage || 1) / 12) * 100;
    
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
    catch(e) { console.error(e); }
  };

  const updateAsset = async (id, data) => {
    if (!db) return;
    try { await updateDoc(doc(db, 'assets', id), data); }
    catch(e) { console.error(e); }
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
    catch(e) { console.error(e); }
  };
  const deleteNote = async (projectId, id) => {
    if (!db) return;
    try { await deleteDoc(doc(db, 'projects', projectId, 'notes', id)); }
    catch(e) { console.error(e); }
  };
  // uploadMedia moved to useFileUpload hook

  const deleteMedia = async (id) => {
    if (!db) return;
    try { await deleteDoc(doc(db, 'media', id)); notify('success', 'Media removed'); }
    catch(e) { console.error(e); }
  };

  const createJob = async (data) => {
    if (!db) return;
    try { await addDoc(collection(db, 'jobs'), { ...data, createdAt: new Date().toISOString() }); notify('success', 'Job deployed to factory'); }
    catch(e) { console.error(e); }
  };

  const updateJob = async (id, data) => {
    if (!db) return;
    try { await updateDoc(doc(db, 'jobs', id), data); }
    catch(e) { console.error(e); }
  };

  const sendWhatsAppUpdate = async (clientId, projectId, stageName) => {
    const c = dbClients.find(x => x.id === clientId) || { phone: clientId, name: 'Client' };
    const p = clients.find(x => x.id === projectId) || { project: 'General Works' };
    
    try {
      notify('pending', `Dispatching WhatsApp to ${c.name}...`);
      const message = stageName.includes(' ') ? stageName : `High-End Update: Hello ${c.name}, your project "${p.project || p.title}" has moved to the ${stageName} phase at Westline Future Fab.`;
      
      await MessengerService.sendMessage(c.phone || clientId, message);
      notify('success', 'WhatsApp update dispatched');
      if (projectId) logAction(projectId, 'Notification', `WhatsApp update sent: ${stageName}`);
    } catch (err) {
      notify('error', 'WhatsApp dispatch failed');
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
        console.warn("Firebase CMS sync failed (likely mock demo mode). Local state updated.", e);
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
        console.error("Failed to sync marketplace inquiry:", e);
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
        console.error("Failed to sync contact inquiry:", e);
        notify('error', 'Message dispatch failed.');
      }
    }
  };
  
  const createClient = async (data) => {
    try {
      if (!db || !auth) {
         notify('error', 'Authentication service unavailable');
         return;
      }
      
      const id = normalizePhone(data.phone || data.username);
      if (!id) throw new Error("A valid phone number is required for client identity.");

      const proxyEmail = `${id}@clients.westlinefuture.com`;
      const tempPassword = import.meta.env.VITE_TEMP_CLIENT_PASSWORD || `GT@${new Date().getFullYear()}!`;
      
      notify('pending', 'Provisioning client environment...');

      // 1. DEDUPLICATION CHECK: Check if Firestore already has this user
      const phoneClean = id;
      const emailLower = proxyEmail.toLowerCase();
      
      const qPhone = query(collection(db, 'users'), where('phone', '==', data.phone || phoneClean), limit(1));
      const qEmail = query(collection(db, 'users'), where('email', '==', data.email || emailLower), limit(1));
      
      const [snapPhone, snapEmail] = await Promise.all([getDocs(qPhone), getDocs(qEmail)]);
      const existingDoc = !snapPhone.empty ? snapPhone.docs[0] : (!snapEmail.empty ? snapEmail.docs[0] : null);

      if (existingDoc) {
        console.log("Existing client record found. Updating instead of duplicating...");
        await updateDoc(existingDoc.ref, { ...data, updatedAt: serverTimestamp() });
        notify('success', 'Existing record updated.');
        return;
      }

      // 2. AUTH PROVISIONING
      try {
        await createUserWithEmailAndPassword(auth, proxyEmail, tempPassword);
      } catch (authErr) {
        if (authErr.code === 'auth/email-already-in-use' || authErr.message?.includes('email-already-in-use')) {
          console.log("Auth record exists. Proceeding to Firestore setup...");
        } else {
          throw authErr;
        }
      }
      
      const payload = { 
        ...data, 
        id, 
        username: id,
        email: data.email || proxyEmail,
        role: 'client', 
        status: 'Active', 
        joined: new Date().toISOString(),
        password: '[SECURED]',
        onboarded: false,
        requiresPasswordChange: true
      };

      // ACTUALLY SAVE TO FIRESTORE
      await setDoc(doc(db, 'users', id), payload);
      
      notify('success', `Client ${data.name} Registered Successfully`);
      
      const message = `Hi ${data.name},\nWelcome to Westline Future. We are thrilled to partner with you!\nYour Project Command Center is ready:\n- URL: westlinefuture.com/login\n- Username: ${id}\n- Password: ${tempPassword}\nPlease change your password after login.`;
      
      try {
        await MessengerService.sendMessage(data.phone || id, message);
        notify('success', 'Client secured. Credentials sent via WhatsApp.');
      } catch (wsErr) {
        console.warn("WhatsApp dispatch failed:", wsErr);
        notify('success', 'Client secured. (WhatsApp dispatch failed, please share credentials manually)');
      }
      logAction(null, 'CRM', `Onboarded Client: ${id}`);
      
      // Send a system notification for the client
      await createNotification(id, "Welcome to Westline Future! Your Project Command Center is now active.", "success", "/portal");

    } catch (e) {
      console.error("[CRM] Registration Error:", e);
      notify('error', e.message.includes('email-already-in-use') ? 'Username/Phone already exists.' : 'Failed to register client.');
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
        clientIds: [id],
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
      console.error(e);
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
      console.error(e);
      notify('error', 'Deployment failed');
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
          console.warn(`Failed to cleanup ${coll}:`, err);
        }
      }
      
      notify('success', 'Client and associated records removed');
      logAction(null, 'CRM', `Deleted Client and records: ${id}`);
    } catch (e) {
      console.error(e);
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
      console.error(e);
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
      console.error(e);
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
      if (!db) throw new Error("Database offline.");
      
      let clean = normalizePhone(phone);
      
      // Look for user by normalized ID (phone) or by scanning the users collection
      const userRef = doc(db, 'users', clean);
      const userSnap = await getDoc(userRef);
      let userMatch = null;
      
      if (userSnap.exists()) {
        userMatch = { id: userSnap.id, ...userSnap.data() };
      } else {
        // Fallback: Query all users to find one where phone field matches normalized
        const q = query(collection(db, 'users'), where('role', '==', 'client'));
        const snap = await getDocs(q);
        userMatch = snap.docs.find(d => normalizePhone(d.data().phone) === clean)?.data();
      }
      
      if (!userMatch) throw new Error("Phone number not registered with Westline Future.");
      
      // Generate code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setMagicCode(code);
      setActiveMagicCode(code); // Capturing for the UI
      
      // TRIGGER WHATSAPP (Routed via Messenger Hub: Meta, Twilio, or Mock)
      try {
        await MessengerService.sendOTP(phone, code);
        notify('success', `Access code sent to ${phone}`);
        return true;
      } catch (error) {
        console.warn(`[MESSENGER FAILBACK] Code: ${code} - Error: ${error.message}`);
        // Fallback: If live messaging fails, we still allow the session but warn the UI
        setNotification({ msg: `[MESSENGER ALERT] ${error.message}`, type: 'success' });
        return true;
      }
    } catch (err) {
      setNotification({ msg: err.message, type: 'error' });
      throw err;
    }
  };

  const verifyOTP = async (phone, code) => {
    if (code === magicCode && code) {
      let clean = normalizePhone(phone);
      
      const q = query(collection(db, 'users'), where('role', '==', 'client'));
      const snap = await getDocs(q);
      const userMatch = snap.docs.map(d => ({ id: d.id, ...d.data() })).find(u => normalizePhone(u.phone) === clean);

      if (userMatch) {
         const hardenedUser = { ...userMatch, id: clean };
         setUser(hardenedUser);
         localStorage.setItem('westlinefuture_session', JSON.stringify({
           id: clean,
           phone: phone,
           expiry: Date.now() + (24 * 60 * 60 * 1000)
         }));
         navigate('/portal');
         setMagicCode(null);
         return true;
      }
    }
    throw new Error("Invalid verification code.");
  };

  const handleLogout = async () => {
    try {
      if (auth) await signOut(auth);
      localStorage.removeItem('westlinefuture_session');
      setUser(null);
      navigate('/login');
    } catch (e) {
      console.error("Logout failed:", e);
      notify('error', 'Logout failed');
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
    uploadMedia,
    createProposal,
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
    workOrders, containers,
    updateWorkOrder: (id, d) => db && updateDoc(doc(db, 'work_orders', id), { ...d, updatedAt: serverTimestamp() }),
    createWorkOrder,
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
      notify('pending', `Authenticating with Westline Future...`);

      const isAdminEmail = (e === 'admin@stormglide.com' || e === 'admin@westlinefuture.com');
      const isActualAdminMode = mode === 'admin' || isAdminEmail;

      if (isActualAdminMode) {
        checkRateLimit(e || 'admin-unknown');
        if (!isFirebaseEnabled || !auth) {
          const _offlinePw = import.meta.env.VITE_ADMIN_OFFLINE_PASSWORD || 'Westline Future2026';
          if (isAdminEmail && p === _offlinePw) {
            const mockUser = { email: e, role: 'admin', uid: 'mock-admin' };
            setUser(mockUser);
            clearRateLimit(e);
            navigate('/admin');
            return { user: mockUser };
          }
          throw new Error("Database offline. Please check your connection.");
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
            notify('pending', 'Securing account access...');
            try {
              const res = await createUserWithEmailAndPassword(auth, e, p);
              await setDoc(doc(db, 'users', res.user.uid), { email: e, role: 'admin', createdAt: new Date().toISOString() });
              clearRateLimit(e);
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
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        throw new Error("Invalid access identifier or password.");
      } else if (err.code === 'auth/wrong-password') {
        throw new Error("Password mismatch. Please check your credentials.");
      } else {
        throw new Error(err.message);
      }
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
              brand={brand} 
              type={loginType} 
              onBack={() => navigate('/')}
              onLogin={loginHandler}
              {...commonProps}
            />
          } />

          <Route path="/admin/*" element={
            <ProtectedRoute>
              {user?.role === 'admin' ? (
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
              ) : <Navigate to="/login" />}
            </ProtectedRoute>
          } />
          <Route path="/field-upload" element={<FieldUpload {...commonProps} />} />
          <Route path="/field-upload/:projectId" element={<FieldUpload {...commonProps} />} />
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

