import { createContext, useState, useEffect, useContext } from 'react';
import { db, isFirebaseEnabled } from '../lib/firebase';
import { AuthContext } from './AuthContext';
import { useQuery } from '@tanstack/react-query';
import {
  collection, query, onSnapshot, getDocs, getDoc, doc,
  orderBy, limit, where, collectionGroup
} from 'firebase/firestore';
import { BRAND0, INITIAL_CONTENT, HERO_SLIDES, SERVICES_DATA, PORTFOLIO_DATA, ABOUT_DATA, GLASS_CATALOG_DATA, GLASS_CATALOG_CATEGORIES, CLIENTS_DATA, PROPOSALS_DATA, INVOICES_DATA, BOOKINGS_DATA, TEAM_MEMBERS, normalizeStageId } from '../data';

export const AppContext = createContext();

const devLog = (...args) => { if (import.meta.env.DEV) console.log(...args); };
const devWarn = (...args) => { if (import.meta.env.DEV) console.warn(...args); };

const mapScopedDoc = (d) => {
  const data = d.data();
  const parentProject = d.ref.parent.parent;
  const parentId = parentProject?.id || data.parentId || data.projectId || null;
  return {
    id: d.id,
    scopedId: parentId ? `${parentId}/${d.id}` : d.id,
    parentId,
    projectId: data.projectId || parentId,
    ...data
  };
};

const mergeScopedRecords = (primary, scoped) => {
  const map = new Map();
  [...primary, ...scoped].forEach((item) => {
    const key = item.scopedId || item.id;
    map.set(key, item);
  });
  return Array.from(map.values());
};

export const AppProvider = ({ children }) => {
  const { currentUser } = useContext(AuthContext);
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem('westline_user_cache');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const normalizePhone = (value) => {
    if (!value) return '';
    let clean = String(value).replace(/\D/g, '');
    if (clean.startsWith('0') && clean.length === 10) return `233${clean.slice(1)}`;
    if (clean.length === 9) return `233${clean}`;
    return clean;
  };

  // App Data State
  const [clients, setClients] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [emails, setEmails] = useState([]);
  const [dbClients, setDbClients] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [renderingPackages, setRenderingPackages] = useState([]);
  const [addOns, setAddOns] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [changeRequests, setChangeRequests] = useState([]);
  const [userNotifications, setUserNotifications] = useState([]);
  const [procurements, setProcurements] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [notes, setNotes] = useState([]);
  const [media, setMedia] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [assets, setAssets] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [containers, setContainers] = useState([]);

  const [brand, setBrand] = useState(BRAND0);
  const [content, setContent] = useState(INITIAL_CONTENT);
  const [messageLimit, setMessageLimit] = useState(50);
  const [invoiceLimit, setInvoiceLimit] = useState(20);
  const [workOrderLimit, setWorkOrderLimit] = useState(20);
  const [taskLimit, setTaskLimit] = useState(50); // ✅ NEW: for paginating tasks
  const [transactionLimit, setTransactionLimit] = useState(50); // ✅ NEW: for paginating transactions
  const [currency, setCurrency] = useState('GHS');
  const [lang, setLang] = useState(() => { try { return localStorage.getItem('lx-lang') || 'en'; } catch { return 'en'; } });

  useEffect(() => {
    localStorage.setItem('lx-lang', lang);
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  }, [lang]);

  const normalizePhoneId = (value) => String(value || '').replace(/\D/g, '');

  const fetchUserProfile = async (authUser) => {
    if (!authUser || !db) return null;
    const email = authUser.email || '';
    const phoneId = normalizePhoneId(authUser.phoneNumber || authUser.phone_number);

    if (phoneId) {
      const direct = await getDoc(doc(db, 'users', phoneId));
      if (direct.exists()) {
        return { id: direct.id, uid: authUser.uid, ...direct.data() };
      }

      const qPhone = query(collection(db, 'users'), where('phone', '==', `+${phoneId}`), limit(1));
      const phoneSnap = await getDocs(qPhone);
      if (!phoneSnap.empty) {
        const uData = phoneSnap.docs[0].data();
        return { id: phoneSnap.docs[0].id, uid: authUser.uid, ...uData };
      }

      return { id: phoneId, uid: authUser.uid, phone: `+${phoneId}`, role: 'client' };
    }

    if (!email || !db) return null;
    const q = query(collection(db, 'users'), where('email', '==', email), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const uData = snap.docs[0].data();
      return { id: snap.docs[0].id, ...uData };
    }
    return { id: authUser.uid, email: email, role: 'client' };
  };

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile', currentUser?.uid, currentUser?.email, currentUser?.phoneNumber],
    queryFn: () => fetchUserProfile(currentUser),
    enabled: !!currentUser && !!db,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (userProfile && userProfile.id !== user?.id) {
      setUser(userProfile);
      localStorage.setItem('westline_user_cache', JSON.stringify(userProfile));
    } else if (currentUser === null && user !== null) {
      // We only wipe user if auth state specifically resolves to null (logged out)
      // but to be completely safe with offline mode, we'll only wipe if they don't have a cache
      const cached = localStorage.getItem('westline_user_cache');
      if (!cached) setUser(null);
    }
  }, [userProfile, currentUser, user]);

  // Data Listeners
  useEffect(() => {
    if (!db || !isFirebaseEnabled) {
      devLog("[FETCH] Firebase disabled or not available. Using local mock data.");
      setClients(CLIENTS_DATA.map(c => ({ id: c.id, ...c, name: c.title || c.project })));
      setProposals(PROPOSALS_DATA);
      setInvoices(INVOICES_DATA);
      setBookings(BOOKINGS_DATA);
      setTeamMembers(TEAM_MEMBERS);
      return;
    }

    if (!user) return;

    devLog("[FETCH] Initializing Data Pipeline for user:", user.id);

    const isAdminOrStaff = user.role === 'admin' || user.role === 'staff';
    const isWorker = user.role === 'worker';
    const staffUid = user.uid || user.id;

    // Admin → all projects. Staff/Worker → only their assigned projects. Client → their own projects.
    const normalizeProject = (d) => {
        const data = d.data();
        const rawStageId = data.stageId ?? data.stage ?? 1;
        return { id: d.id, ...data, stageId: normalizeStageId(rawStageId), name: data.title || data.project };
    };

    const safeNormalizeProject = (d) => { try { return normalizeProject(d); } catch (e) { devWarn(`Bad project doc ${d.id}:`, e); return null; } };

    let unsubProject = () => {};
    if (user.role === 'admin') {
      unsubProject = onSnapshot(collection(db, 'projects'), (snap) => {
        setClients(snap.docs.map(safeNormalizeProject).filter(Boolean));
      }, (err) => devWarn("Project Sync Error:", err));
    } else if (user.role === 'staff') {
      const assignedProjects = new Map();
      const publishAssignedProjects = () => setClients(Array.from(assignedProjects.values()));
      const applyAssignedSnapshot = (source, snap) => {
        for (const key of Array.from(assignedProjects.keys())) {
          if (key.startsWith(`${source}:`)) assignedProjects.delete(key);
        }
        snap.docs.forEach(d => assignedProjects.set(`${source}:${d.id}`, safeNormalizeProject(d)));
        const deduped = new Map();
        assignedProjects.forEach(project => {
          if (project) deduped.set(project.id, project);
        });
        setClients(Array.from(deduped.values()));
      };
      const unsubAssignedStaff = onSnapshot(
        query(collection(db, 'projects'), where('assignedStaff', 'array-contains', staffUid)),
        snap => applyAssignedSnapshot('staff', snap),
        err => devWarn("Assigned staff project sync error:", err)
      );
      const unsubManagedProjects = onSnapshot(
        query(collection(db, 'projects'), where('projectManagerId', '==', staffUid)),
        snap => applyAssignedSnapshot('manager', snap),
        err => devWarn("Managed project sync error:", err)
      );
      unsubProject = () => {
        unsubAssignedStaff();
        unsubManagedProjects();
      };
      publishAssignedProjects();
    } else if (user.role === 'worker') {
      unsubProject = onSnapshot(query(collection(db, 'projects'), where('assignedWorkers', 'array-contains', staffUid)), (snap) => {
        setClients(snap.docs.map(safeNormalizeProject).filter(Boolean));
      }, (err) => devWarn("Assigned worker project sync error:", err));
    } else {
      const mergedProjects = new Map();
      const publishClientProjects = () => setClients(Array.from(mergedProjects.values()));
      // ✅ CRITICAL FIX #4: Optimize two-query client pattern with deduplication
      const mergedSnapshots = new Map(); // Track which query returned which docs
      const applyClientProjectSnap = (source, snap) => {
        // Only process docs new to this source to avoid duplicate processing
        snap.docs.forEach(d => {
          const key = `${source}:${d.id}`;
          if (!mergedSnapshots.has(key)) {
            mergedSnapshots.set(key, true);
            mergedProjects.set(d.id, normalizeProject(d));
          }
        });
        publishClientProjects();
      };

      const unsubByClientId = onSnapshot(
        query(collection(db, 'projects'), where('clientId', '==', user.id), limit(100)),
        snap => applyClientProjectSnap('clientId', snap),
        (err) => devWarn("Client projectId sync failed:", err)
      );
      const unsubByClientIds = onSnapshot(
        query(collection(db, 'projects'), where('clientIds', 'array-contains', user.id), limit(100)),
        snap => applyClientProjectSnap('clientIds', snap),
        (err) => devWarn("Client projectIds sync failed:", err)
      );
      unsubProject = () => {
        unsubByClientId();
        unsubByClientIds();
      };
    }

    let unsubUser = () => {};
    if (user.role === 'admin' || user.role === 'staff') {
      unsubUser = onSnapshot(collection(db, 'users'), (snap) => {
        const { team, clientList } = snap.docs.reduce((acc, d) => {
          const u = { id: d.id, ...d.data() };
          if (u.role === 'client') acc.clientList.push(u);
          else acc.team.push(u);
          return acc;
        }, { team: [], clientList: [] });
        setTeamMembers(team);
        setDbClients(clientList);
      }, (err) => devWarn("User Registry Error:", err));
    } else {
      unsubUser = onSnapshot(doc(db, 'users', user.id), (snap) => {
        if (snap.exists()) {
          setDbClients([{ id: snap.id, ...snap.data() }]);
        }
      }, (err) => devWarn("Client Profile Sync Error:", err));
    }

    const unsubInvoices = isWorker ? (() => {}) : onSnapshot(isAdminOrStaff
      ? query(collection(db, 'invoices'), orderBy('createdAt', 'desc'), limit(invoiceLimit))
      : query(collection(db, 'invoices'), where('clientId', '==', user.id), limit(invoiceLimit)), (snap) => {
      const all = snap.docs.map(d => {
        const data = d.data();
        if (!data) { devWarn(`Invoice doc ${d.id} has no data`); return null; }
        return { id: d.id, ...data };
      }).filter(Boolean);
      setInvoices(all);
    }, (err) => devWarn("Invoice Sync Error:", err));

    // ✅ CRITICAL FIX #2: Use taskLimit state for pagination (was hardcoded 200)
    const unsubTasks = onSnapshot(isAdminOrStaff ? query(collection(db, 'tasks'), limit(taskLimit)) : query(collection(db, 'tasks'), where('clientId', '==', user.id), limit(taskLimit)), (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => devWarn("Global Task Sync Error:", err));

    let unsubLogs = () => {};
    if (user.role === 'admin') {
      unsubLogs = onSnapshot(query(collection(db, 'activity_logs'), orderBy('created_at', 'desc'), limit(30)), (snap) => {
        setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => devWarn("Activity logs listener failed:", err));
    }

    // ✅ CRITICAL FIX #2: Reduce approvals limit from 200 → 50 with pagination
    const unsubApprovals = onSnapshot(user.role === 'admin' ? query(collection(db, 'approvals'), limit(50)) : query(collection(db, 'approvals'), where('clientId', '==', user.id), limit(50)), (snap) => {
      setApprovals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => devWarn("Approval Sync Error:", err));

    const unsubApprovals = listenMerged('approvals', setApprovals, 'Approval');
    const unsubCR = listenMerged('change_requests', setChangeRequests, 'CR');
    const unsubProc = listenMerged('procurements', setProcurements, 'Procurement');
    const unsubNotes = listenMerged('notes', setNotes, 'Note');
    const unsubMedia = listenMerged('media', setMedia, 'Media');

    const unsubWorkOrders = isWorker ? (() => {}) : onSnapshot(user.role === 'admin'
      ? query(collection(db, 'work_orders'), orderBy('createdAt', 'desc'), limit(workOrderLimit))
      : query(collection(db, 'work_orders'), where('clientId', '==', user.id), limit(workOrderLimit)), (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setWorkOrders(user.role === 'admin' ? all : all.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    }, (err) => devWarn("Work Order Sync Error:", err));

    const unsubContainers = isWorker ? (() => {}) : onSnapshot(user.role === 'admin' ? collection(db, 'containers') : query(collection(db, 'containers'), where('clientId', '==', user.id)), (snap) => {
      setContainers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => devWarn("Container Sync Error:", err));

    const unsubShipments = isWorker ? (() => {}) : onSnapshot(user.role === 'admin' ? collection(db, 'shipments') : query(collection(db, 'shipments'), where('clientId', '==', user.id)), (snap) => {
      setShipments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => devWarn("Shipment Sync Error:", err));

    // ✅ CRITICAL FIX #2: Reduced proposals limit from 200 → 50
    const unsubProposals = onSnapshot(user.role === 'admin' ? query(collection(db, 'proposals'), limit(50)) : query(collection(db, 'proposals'), where('clientId', '==', user.id)), (snap) => {
      setProposals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => devWarn("Proposal Sync Error:", err));

    // Bookings are admin-only in Firestore rules — clients don't need them
    let unsubBookings = () => {};
    if (user.role === 'admin') {
      unsubBookings = onSnapshot(collection(db, 'bookings'),
        (snap) => setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
        (err) => devWarn("Booking Sync Error:", err)
      );
    }

    // ✅ CRITICAL FIX #2: Use transactionLimit state for pagination (was hardcoded 500 - biggest perf win!)
    const unsubTrans = onSnapshot(isAdminOrStaff ? query(collection(db, 'transactions'), orderBy('date', 'desc'), limit(transactionLimit)) : query(collection(db, 'transactions'), where('clientId', '==', user.id), limit(transactionLimit)), (snap) => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => devWarn("Transactions listener failed:", err));

    const unsubRenderingPackages = onSnapshot(user.role === 'admin' ? collection(db, 'renderingPackages') : query(collection(db, 'renderingPackages'), where('clientId', '==', user.id)), (snap) => {
      setRenderingPackages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => devWarn("Rendering Packages Sync Error:", err));

    const unsubAddOns = onSnapshot(user.role === 'admin' ? collection(db, 'addOns') : query(collection(db, 'addOns'), where('clientId', '==', user.id)), (snap) => {
      setAddOns(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => devWarn("Add-ons Sync Error:", err));

    const notifQuery = user.role === 'admin' || user.role === 'staff'
      ? query(collection(db, 'notifications'), where('userId', 'in', [user.id, 'admin']), limit(50))
      : query(collection(db, 'notifications'), where('userId', '==', user.id), limit(50));

    const unsubNotif = onSnapshot(notifQuery, (snap) => {
      const toMs = (v) => v?.toMillis?.() || v?.seconds * 1000 || new Date(v).getTime() || 0;
      const sorted = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));
      setUserNotifications(sorted.slice(0, 30));
    }, (err) => devWarn("Notifications listener failed:", err));

    // Clients use per-project subcollection messages — skip the global messages collection for them
    let unsubMsg = () => {};
    if (user.role === 'admin') {
      unsubMsg = onSnapshot(
        query(collection(db, 'messages'), orderBy('createdAt', 'desc'), limit(messageLimit)),
        (snap) => setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
        (err) => devWarn("Msg Sync Error:", err)
      );
    }

    let unsubEmails = () => {};
    if (user.role === 'admin') {
      // ✅ CRITICAL FIX #2: Reduced emails limit from 200 → 50
      unsubEmails = onSnapshot(query(collection(db, 'emails'), orderBy('createdAt', 'desc'), limit(50)), (snap) => {
        setEmails(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => devWarn("Emails Sync Error:", err));
    }

    return () => {
      devLog("[FETCH] Tearing down Data Pipeline...");
      unsubProject();
      unsubUser();
      unsubInvoices();
      unsubTasks();
      unsubLogs();
      unsubApprovals();
      unsubCR();
      unsubProc();
      unsubNotes();
      unsubMedia();
      unsubWorkOrders();
      unsubContainers();
      unsubShipments();
      unsubJobs();
      unsubAssets();
      unsubMaterials();
      unsubProposals();
      unsubBookings();
      unsubTrans();
      unsubRenderingPackages();
      unsubAddOns();
      unsubNotif();
      unsubMsg();
      unsubEmails();
    };
  }, [user?.id, user?.role, messageLimit, invoiceLimit, workOrderLimit, taskLimit, transactionLimit]);

  // Public/CMS Listeners
  useEffect(() => {
    if (!db) return;

    const qTest = query(collection(db, 'testimonials'), orderBy('createdAt', 'desc'));
    const unsubTest = onSnapshot(qTest, (s) => setTestimonials(s.docs.map(d => ({id: d.id, ...d.data()}))), (err) => {
      devWarn("Testimonial Sync Issue:", err);
    });

    const unsubCMS = onSnapshot(collection(db, 'cms_content'), (s) => {
      const newContent = { ...INITIAL_CONTENT };
      s.docs.forEach(doc => {
        if (doc.data().content) {
          newContent[doc.id] = doc.data().content;
        }
      });
      setContent(newContent);
      if (newContent.brand) setBrand(prev => ({ ...prev, ...newContent.brand }));
      if (newContent.gatewaySettings) setBrand(prev => ({ ...prev, gatewaySettings: newContent.gatewaySettings }));
      if (newContent.finSettings) setBrand(prev => ({ ...prev, finSettings: newContent.finSettings }));
    }, (err) => {
      devWarn("CMS Sync Permission Issue:", err);
      setContent(INITIAL_CONTENT);
    });

    return () => {
      unsubTest();
      unsubCMS();
    };
  }, []);

  // ✅ CRITICAL FIX #3: Add pagination controls for all collections
  const loadMoreMessages = () => setMessageLimit(prev => prev + 50);
  const loadMoreInvoices = () => setInvoiceLimit(prev => prev + 20);
  const loadMoreWorkOrders = () => setWorkOrderLimit(prev => prev + 20);
  const loadMoreTasks = () => setTaskLimit(prev => prev + 50);
  const loadMoreTransactions = () => setTransactionLimit(prev => prev + 50);

  return (
    <AppContext.Provider value={{
      user, setUser,
      clients, proposals, invoices, bookings, emails, setEmails, dbClients, teamMembers, logs, shipments, messages, testimonials, tasks, transactions, renderingPackages, addOns, changeRequests, userNotifications, notifications, procurements, jobs, notes, media, approvals, materials, assets, workOrders, containers,
      brand, content, currency, lang,
      setCurrency, setLang, setBrand, setContent,
      loadMoreMessages, hasMoreMessages: messages.length >= messageLimit,
      loadMoreInvoices, hasMoreInvoices: invoices.length >= invoiceLimit,
      loadMoreWorkOrders, hasMoreWorkOrders: workOrders.length >= workOrderLimit,
      loadMoreTasks, hasMoreTasks: tasks.length >= taskLimit, // ✅ NEW
      loadMoreTransactions, hasMoreTransactions: transactions.length >= transactionLimit // ✅ NEW
    }}>
      {children}
    </AppContext.Provider>
  );
};
