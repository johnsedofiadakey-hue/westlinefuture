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
  const [user, setUser] = useState(null);

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
  const [currency, setCurrency] = useState('GHS');
  const [lang, setLang] = useState(localStorage.getItem('lx-lang') || 'en');

  const fetchUserProfile = async (authUser) => {
    if (!authUser || !db) return null;

    const phoneId = normalizePhone(authUser.phoneNumber);
    if (phoneId) {
      const phoneSnap = await getDoc(doc(db, 'users', phoneId));
      if (phoneSnap.exists()) return { id: phoneSnap.id, ...phoneSnap.data(), uid: authUser.uid };
    }

    const uidSnap = await getDoc(doc(db, 'users', authUser.uid));
    if (uidSnap.exists()) return { id: uidSnap.id, ...uidSnap.data(), uid: authUser.uid };

    if (authUser.email) {
      const q = query(collection(db, 'users'), where('email', '==', authUser.email), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const uData = snap.docs[0].data();
        return { id: snap.docs[0].id, ...uData, uid: authUser.uid };
      }
    }

    return { id: phoneId || authUser.uid, uid: authUser.uid, email: authUser.email || '', phone: phoneId, role: phoneId ? 'client' : 'staff' };
  };

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile', currentUser?.uid, currentUser?.email, currentUser?.phoneNumber],
    queryFn: () => fetchUserProfile(currentUser),
    enabled: !!currentUser && !!db,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (userProfile && JSON.stringify(userProfile) !== JSON.stringify(user)) {
      setUser(userProfile);
    } else if (!currentUser && user !== null) {
      const savedSession = localStorage.getItem('westlinefuture_session');
      if (savedSession) {
        try {
          const sessionData = JSON.parse(savedSession);
          if (sessionData.expiry > Date.now()) {
            if (sessionData.user) {
              setUser(sessionData.user);
            } else if (sessionData.id) {
              setUser({ id: sessionData.id, phone: sessionData.phone, role: 'client' });
            }
            return;
          }
        } catch (e) {
          if (import.meta.env.DEV) console.error("Manual session parse error:", e);
        }
      }
      setUser(null);
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

    const isAdmin = user.role === 'admin';
    const isStaff = user.role === 'staff';
    const isWorker = user.role === 'worker';
    const isAdminOrStaff = isAdmin || isStaff;
    const userKey = user.uid || user.id;

    const projectQuery = isAdmin
      ? collection(db, 'projects')
      : isStaff
        ? query(collection(db, 'projects'), where('assignedStaff', 'array-contains', userKey), limit(100))
        : isWorker
          ? query(collection(db, 'projects'), where('assignedWorkers', 'array-contains', userKey), limit(100))
          : query(collection(db, 'projects'), where('clientIds', 'array-contains', user.id), limit(100));

    const unsubProject = onSnapshot(projectQuery, (snap) => {
      setClients(snap.docs.map(d => {
        const data = d.data();
        // Normalize legacy 10/12-stage IDs into the canonical 7-stage model at read time.
        const rawStageId = data.stageId ?? data.stage ?? 1;
        return { id: d.id, ...data, stageId: normalizeStageId(rawStageId, data.stageModel), stageModel: 'westline-7-stage-v1', name: data.title || data.project };
      }));
    }, (err) => devWarn("Project Sync Error:", err));

    let unsubUser = () => {};
    if (isAdminOrStaff) {
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
      : query(collection(db, 'invoices'), where('clientIds', 'array-contains', user.id), limit(invoiceLimit)), (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setInvoices(all);
    }, (err) => devWarn("Invoice Sync Error:", err));

    const unsubTasks = isWorker ? (() => {}) : onSnapshot(isAdminOrStaff ? collection(db, 'tasks') : query(collection(db, 'tasks'), where('clientId', '==', user.id)), (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => devWarn("Global Task Sync Error:", err));

    let unsubLogs = () => {};
    if (user.role === 'admin') {
      unsubLogs = onSnapshot(query(collection(db, 'activity_logs'), orderBy('created_at', 'desc'), limit(30)), (snap) => {
        setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => devWarn("Activity logs listener failed:", err));
    }

    const listenMerged = (name, setter, label) => {
      let topLevel = [];
      let scoped = [];
      const flush = () => setter(mergeScopedRecords(topLevel, scoped));
      if (isWorker) {
        setter([]);
        return () => {};
      }
      const topQuery = user.role === 'admin'
        ? collection(db, name)
        : query(collection(db, name), where('clientId', '==', user.id));
      const unsubTop = onSnapshot(topQuery, (snap) => {
        topLevel = snap.docs.map(mapScopedDoc);
        flush();
      }, (err) => devWarn(`${label} Top-Level Sync Error:`, err));
      const unsubScoped = user.role === 'admin'
        ? onSnapshot(collectionGroup(db, name), (snap) => {
            scoped = snap.docs.map(mapScopedDoc).filter(item => item.parentId);
            flush();
          }, (err) => devWarn(`${label} Scoped Sync Error:`, err))
        : () => {};
      return () => {
        unsubTop();
        unsubScoped();
      };
    };

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

    const unsubJobs = isAdminOrStaff ? onSnapshot(collection(db, 'jobs'), (snap) => {
      setJobs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => devWarn("Jobs Sync Error:", err)) : (() => {});

    const unsubAssets = isAdminOrStaff ? onSnapshot(collection(db, 'assets'), (snap) => {
      setAssets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => devWarn("Assets Sync Error:", err)) : (() => {});

    const unsubMaterials = isAdminOrStaff ? onSnapshot(collectionGroup(db, 'materials'), (snap) => {
      setMaterials(snap.docs.map(mapScopedDoc));
    }, (err) => devWarn("Materials Sync Error:", err)) : (() => {});

    const unsubProposals = isWorker ? (() => {}) : onSnapshot(user.role === 'admin' ? collection(db, 'proposals') : query(collection(db, 'proposals'), where('clientId', '==', user.id)), (snap) => {
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

    const unsubTrans = listenMerged('transactions', setTransactions, 'Transactions');

    const unsubNotif = onSnapshot(query(collection(db, 'notifications'), where('userId', '==', user.id), limit(50)), (snap) => {
      const sorted = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
      setUserNotifications(sorted.slice(0, 20));
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
      unsubEmails = onSnapshot(query(collection(db, 'emails'), orderBy('createdAt', 'desc')), (snap) => {
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
      unsubNotif();
      unsubMsg();
      unsubEmails();
    };
  }, [user?.id, user?.role, messageLimit, invoiceLimit, workOrderLimit]);

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
      if (newContent.brand) {
        const cmsBrandName = String(newContent.brand.name || '');
        const staleBrandPattern = new RegExp(`${['glass', 'tech'].join('')}|${['luxe', 'space'].join('')}`, 'i');
        const safeBrand = staleBrandPattern.test(cmsBrandName)
          ? BRAND0
          : { ...BRAND0, ...newContent.brand, name: 'Westline Future' };
        setBrand(prev => ({ ...prev, ...safeBrand }));
      }
    }, (err) => {
      devWarn("CMS Sync Permission Issue:", err);
      setContent(INITIAL_CONTENT);
    });

    return () => {
      unsubTest();
      unsubCMS();
    };
  }, []);

  const loadMoreMessages = () => setMessageLimit(prev => prev + 50);
  const loadMoreInvoices = () => setInvoiceLimit(prev => prev + 20);
  const loadMoreWorkOrders = () => setWorkOrderLimit(prev => prev + 20);

  return (
    <AppContext.Provider value={{
      user, setUser,
      clients, proposals, invoices, bookings, emails, setEmails, dbClients, teamMembers, logs, shipments, messages, testimonials, tasks, transactions, changeRequests, userNotifications, procurements, jobs, notes, media, approvals, materials, assets, workOrders, containers,
      brand, content, currency, lang,
      setCurrency, setLang, setBrand, setContent,
      loadMoreMessages, hasMoreMessages: messages.length >= messageLimit,
      loadMoreInvoices, hasMoreInvoices: invoices.length >= invoiceLimit,
      loadMoreWorkOrders, hasMoreWorkOrders: workOrders.length >= workOrderLimit
    }}>
      {children}
    </AppContext.Provider>
  );
};
