import { createContext, useState, useEffect, useContext } from 'react';
import { db, isFirebaseEnabled } from '../lib/firebase';
import { AuthContext } from './AuthContext';
import { useQuery } from '@tanstack/react-query';
import {
  collection, query, onSnapshot, getDocs, getDoc, doc,
  orderBy, limit, where, serverTimestamp
} from 'firebase/firestore';
import { BRAND0, INITIAL_CONTENT, HERO_SLIDES, SERVICES_DATA, PORTFOLIO_DATA, ABOUT_DATA, GLASS_CATALOG_DATA, GLASS_CATALOG_CATEGORIES, CLIENTS_DATA, PROPOSALS_DATA, INVOICES_DATA, BOOKINGS_DATA, TEAM_MEMBERS } from '../data';

export const AppContext = createContext();

const devLog = (...args) => { if (import.meta.env.DEV) console.log(...args); };
const devWarn = (...args) => { if (import.meta.env.DEV) console.warn(...args); };

export const AppProvider = ({ children }) => {
  const { currentUser } = useContext(AuthContext);
  const [user, setUser] = useState(null);

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

  const fetchUserProfile = async (email) => {
    if (!email || !db) return null;
    const q = query(collection(db, 'users'), where('email', '==', email), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const uData = snap.docs[0].data();
      return { id: snap.docs[0].id, ...uData };
    }
    return { id: currentUser?.uid, email: email, role: 'client' };
  };

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile', currentUser?.email],
    queryFn: () => fetchUserProfile(currentUser?.email),
    enabled: !!currentUser && !!db,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (userProfile && JSON.stringify(userProfile) !== JSON.stringify(user)) {
      setUser(userProfile);
    } else if (!currentUser && user !== null) {
      const savedSession = localStorage.getItem('glasstech_session');
      if (savedSession) {
        try {
          const sessionData = JSON.parse(savedSession);
          if (sessionData.expiry > Date.now()) {
            setUser(sessionData.user);
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

    const projectQuery = user.role === 'admin'
      ? collection(db, 'projects')
      : query(collection(db, 'projects'), where('clientId', '==', user.id), limit(100));

    const unsubProject = onSnapshot(projectQuery, (snap) => {
      setClients(snap.docs.map(d => ({ id: d.id, ...d.data(), name: d.data().title || d.data().project })));
    }, (err) => devWarn("Project Sync Error:", err));

    let unsubUser = () => {};
    if (user.role === 'admin') {
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

    const unsubInvoices = onSnapshot(user.role === 'admin'
      ? query(collection(db, 'invoices'), orderBy('createdAt', 'desc'), limit(invoiceLimit))
      : query(collection(db, 'invoices'), where('clientId', '==', user.id), limit(invoiceLimit)), (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setInvoices(user.role === 'admin' ? all : all.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)));
    }, (err) => devWarn("Invoice Sync Error:", err));

    const unsubTasks = onSnapshot(user.role === 'admin' ? collection(db, 'tasks') : query(collection(db, 'tasks'), where('clientId', '==', user.id)), (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => devWarn("Global Task Sync Error:", err));

    let unsubLogs = () => {};
    if (user.role === 'admin') {
      unsubLogs = onSnapshot(query(collection(db, 'activity_logs'), orderBy('created_at', 'desc'), limit(30)), (snap) => {
        setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => devWarn("Activity logs listener failed:", err));
    }

    const unsubApprovals = onSnapshot(user.role === 'admin' ? collection(db, 'approvals') : query(collection(db, 'approvals'), where('clientId', '==', user.id)), (snap) => {
      setApprovals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => devWarn("Approval Sync Error:", err));

    const unsubCR = onSnapshot(user.role === 'admin' ? collection(db, 'change_requests') : query(collection(db, 'change_requests'), where('clientId', '==', user.id)), (snap) => {
      setChangeRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => devWarn("CR Sync Error:", err));

    const unsubProc = onSnapshot(user.role === 'admin' ? collection(db, 'procurements') : query(collection(db, 'procurements'), where('clientId', '==', user.id)), (snap) => {
      setProcurements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => devWarn("Procurement Sync Error:", err));

    const unsubNotes = onSnapshot(user.role === 'admin' ? collection(db, 'notes') : query(collection(db, 'notes'), where('clientId', '==', user.id)), (snap) => {
      setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => devWarn("Note Sync Error:", err));

    const unsubMedia = onSnapshot(user.role === 'admin' ? collection(db, 'media') : query(collection(db, 'media'), where('clientId', '==', user.id)), (snap) => {
      setMedia(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => devWarn("Media Sync Error:", err));

    const unsubWorkOrders = onSnapshot(user.role === 'admin'
      ? query(collection(db, 'work_orders'), orderBy('createdAt', 'desc'), limit(workOrderLimit))
      : query(collection(db, 'work_orders'), where('clientId', '==', user.id), limit(workOrderLimit)), (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setWorkOrders(user.role === 'admin' ? all : all.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    }, (err) => devWarn("Work Order Sync Error:", err));

    const unsubContainers = onSnapshot(user.role === 'admin' ? collection(db, 'containers') : query(collection(db, 'containers'), where('clientId', '==', user.id)), (snap) => {
      setContainers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => devWarn("Container Sync Error:", err));

    const unsubShipments = onSnapshot(user.role === 'admin' ? collection(db, 'shipments') : query(collection(db, 'shipments'), where('clientId', '==', user.id)), (snap) => {
      setShipments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => devWarn("Shipment Sync Error:", err));

    const unsubProposals = onSnapshot(user.role === 'admin' ? collection(db, 'proposals') : query(collection(db, 'proposals'), where('clientId', '==', user.id)), (snap) => {
      setProposals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => devWarn("Proposal Sync Error:", err));

    const unsubBookings = onSnapshot(user.role === 'admin' ? collection(db, 'bookings') : query(collection(db, 'bookings'), where('userId', '==', user.id)), (snap) => {
      setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => devWarn("Booking Sync Error:", err));

    const unsubTrans = onSnapshot(user.role === 'admin' ? query(collection(db, 'transactions'), orderBy('date', 'desc')) : query(collection(db, 'transactions'), where('clientId', '==', user.id)), (snap) => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => devWarn("Transactions listener failed:", err));

    const unsubNotif = onSnapshot(query(collection(db, 'notifications'), where('userId', '==', user.id), limit(50)), (snap) => {
      const sorted = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
      setUserNotifications(sorted.slice(0, 20));
    }, (err) => devWarn("Notifications listener failed:", err));

    const unsubMsg = onSnapshot(query(collection(db, 'messages'), orderBy('createdAt', 'desc'), limit(messageLimit)), (snap) => {
      const allMsgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (user.role === 'admin') {
        setMessages(allMsgs);
      } else {
        setMessages(allMsgs.filter(m => m.senderId === user.id || m.receiverId === user.id));
      }
    }, (err) => devWarn("Msg Sync Error:", err));

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
      if (newContent.brand) setBrand(prev => ({ ...prev, ...newContent.brand }));
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
      user,
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
