import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useResponsive } from '../../hooks/useResponsive'; // ✅ CRITICAL FIX #7: Use centralized responsive hook
import {
  DollarSign, Receipt, Clock, CheckCircle, Plus, Users, FileText, Truck, AlertTriangle, Target, Activity, Sparkles, TrendingUp, MessageSquareDiff, ChevronDown
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';
import { REV, CLIENT_PROJECT_STAGES } from '../../data';
import { isPaidStatus } from '../../components/Shared';

function fmtMoney(val) {
  const n = Number(val) || 0;
  if (n >= 1_000_000) return `GH₵${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000)    return `GH₵${(n / 1_000).toFixed(1)}k`;
  if (n >= 1_000)     return `GH₵${(n / 1_000).toFixed(2)}k`;
  return `GH₵${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function AdminDashboard({ clients, invoices, proposals, brand, getSLA, stats, ...props }) {
  const ac = brand.color || `var(--accent-secondary)`;
  const { isMobile } = useResponsive(); // ✅ CRITICAL FIX #7: Use centralized responsive hook instead of local state
  const [liveProducts, setLiveProducts] = useState([]);
  useEffect(() => {
    if (db) {
       const unsub = onSnapshot(collection(db, 'products'), (snap) => {
          setLiveProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
       });
       return () => unsub();
    }
  }, []);
  
  const totalRev = (invoices || []).filter(i => isPaidStatus(i?.status)).reduce((a, i) => a + parseFloat(String(i?.amount || '0').replace(/[$,]/g, '') || 0), 0);
  const pendingInvs = (invoices || []).filter(i => i?.status === 'Pending' || i?.status === 'pending' || i?.status === 'Unpaid');
  const totalUnpaid = pendingInvs.reduce((a, i) => a + parseFloat(String(i?.amount || '0').replace(/[$,]/g, '') || 0), 0);
  const oneTimeSales = (invoices || [])
    .filter(i => i?.oneTimeClient || i?.customerType === 'one-time' || (!i?.parentId && !i?.projectId && (i?.type === 'Receipt' || i?.documentKind === 'receipt')))
    .reduce((a, i) => a + parseFloat(String(i?.amount || '0').replace(/[$,]/g, '') || 0), 0);
  const openQuoteValue = (proposals || [])
    .filter(p => String(p?.status || '').toLowerCase() === 'pending')
    .reduce((a, p) => a + parseFloat(String(p?.amount || '0').replace(/[$,]/g, '') || 0), 0);
  const pendingApprovals = (props.approvals || []).filter(a => a?.status === 'pending' || a?.status === 'Pending').length;
  const delayedProjects = (clients || []).filter(c => getSLA && c ? getSLA(c)?.delayed : false).length;
  const activeJobs = (props.jobs || []).filter(j => j?.stage !== 'ready' && j?.stage !== 'Completed').length;
  const activeShipments = (props.procurements || []).filter(p => p?.isShipment && p?.status !== 'Delivered' && p?.status !== 'delivered').length;

  const dashboardStats = [
    { label: 'Total Collected', value: fmtMoney(totalRev), raw: totalRev, icon: <DollarSign size={22} />, sub: 'Payments received to date', color: '#16A34A', trend: 18 },
    { label: 'Money Owed', value: fmtMoney(totalUnpaid), raw: totalUnpaid, icon: <Receipt size={22} />, sub: `${pendingInvs.length} unpaid invoice${pendingInvs.length !== 1 ? 's' : ''}`, color: '#B45309', trend: 2 },
    { label: 'Delayed Projects', value: delayedProjects, icon: <AlertTriangle size={22} />, sub: 'Projects behind schedule', color: '#EF4444', trend: -5 },
    { label: 'Awaiting Approval', value: pendingApprovals, icon: <CheckCircle size={22} />, sub: 'Quotes, designs, or sign-offs pending', color: ac, trend: 12 },
  ];

  // --- DYNAMIC ANALYTICS ENGINE ---
  const getRevenueData = () => {
    const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    // Key by YYYY-MM to avoid collisions when the 6-month window spans a year boundary
    const revenueMap = {};
    const keyToLabel = {};

    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
      revenueMap[key] = 0;
      keyToLabel[key] = MONTH_LABELS[d.getMonth()];
    }

    (invoices || []).forEach(inv => {
      if (inv?.status?.toLowerCase() === 'paid' && inv?.date) {
        const date = new Date(inv.date);
        if (isNaN(date.getTime())) return;
        const amt = parseFloat(String(inv.amount || '0').replace(/[$,]/g, '') || 0) / 1000;
        const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
        if (revenueMap[key] !== undefined) {
          revenueMap[key] += amt;
        }
      }
    });

    return Object.keys(revenueMap).map(key => ({
      m: keyToLabel[key],
      v: parseFloat(revenueMap[key].toFixed(1)),
      p: parseFloat((revenueMap[key] * 1.25).toFixed(1)),
    }));
  };

  const dynamicRevData = getRevenueData();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 24 : 32 }}>
      
      {/* 1. OPERATIONS COMMAND CONTROL */}
      <div className="glass-matrix" style={{ 
        padding: isMobile ? '32px 24px' : '40px 48px', 
        display: 'flex', 
        flexDirection: 'column',
        gap: 32,
        background: `var(--accent-secondary)`, 
        color: '#fff', 
        borderRadius: isMobile ? 32 : 48, 
        border: 'none',
        boxShadow: '0 40px 100px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="lxf eyebrow" style={{ fontSize: 10, letterSpacing: '.25em', color: ac, fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 }}>At a Glance</div>
            <div className="lxfh" style={{ fontSize: isMobile ? 28 : 40, fontWeight: 300, letterSpacing: '-0.03em' }}>Dashboard</div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
               <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 800 }}>Active Jobs</div>
               <div style={{ fontSize: isMobile ? 16 : 18, color: '#fff', fontWeight: 400 }}>{activeJobs}</div>
            </div>
         </div>
      </div>

      {/* 1.5 ADMIN WATCHDOG (SYSTEM HEALTH MONITOR) */}
      <div style={{
        padding: '32px 40px',
        background: '#fff',
        borderRadius: 24,
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.04)',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)',
        gap: 40,
        position: 'relative',
        overflow: 'hidden'
      }}>
         <div style={{ position: 'absolute', top: -100, right: -100, width: 300, height: 300, background: `${ac}10`, filter: 'blur(80px)', borderRadius: '50%' }} />
         
         <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
               <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: ac, flexShrink: 0 }}>
                  <Target size={20} />
               </div>
               <div className="lxf eyebrow" style={{ fontSize: 10, letterSpacing: '.1em', color: 'var(--text-secondary)', fontWeight: 800 }}>Shipments in Transit</div>
            </div>
            <div
              className="lxfh"
              title={`GH₵${(props.containers || []).filter(c => c.status !== 'Delivered').reduce((acc, c) => acc + (c.value || 0), 0).toLocaleString()}`}
              style={{ fontSize: 'clamp(16px, 1.6vw, 26px)', color: 'var(--accent-secondary)', letterSpacing: '-0.03em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {fmtMoney((props.containers || []).filter(c => c.status !== 'Delivered').reduce((acc, c) => acc + (c.value || 0), 0))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>Goods currently shipping</div>
         </div>

         <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
               <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16A34A', flexShrink: 0 }}>
                  <TrendingUp size={20} />
               </div>
               <div className="lxf eyebrow" style={{ fontSize: 10, letterSpacing: '.1em', color: 'var(--text-secondary)', fontWeight: 800 }}>Cash Collected</div>
            </div>
            <div
              className="lxfh"
              title={`GH₵${totalRev.toLocaleString()}`}
              style={{ fontSize: 'clamp(16px, 1.6vw, 26px)', color: 'var(--accent-secondary)', letterSpacing: '-0.03em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
               {fmtMoney(totalRev)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>Revenue received</div>
         </div>

         <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
               <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444', flexShrink: 0 }}>
                  <AlertTriangle size={20} />
               </div>
               <div className="lxf eyebrow" style={{ fontSize: 10, letterSpacing: '.1em', color: 'var(--text-secondary)', fontWeight: 800 }}>Pending Quotes</div>
            </div>
            <div
              className="lxfh"
              title={`GH₵${openQuoteValue.toLocaleString()}`}
              style={{ fontSize: 'clamp(16px, 1.6vw, 26px)', color: 'var(--accent-secondary)', letterSpacing: '-0.03em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {fmtMoney(openQuoteValue)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 700 }}>Awaiting client approval</div>
         </div>

         <div style={{ display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center' }}>
            <div className="lxf eyebrow" style={{ fontSize: 9, letterSpacing: '.2em', color: ac, fontWeight: 900, marginBottom: 8 }}>Collection Rate</div>
            <div style={{ height: 40, background: 'rgba(0,0,0,0.03)', borderRadius: 12, display: 'flex', alignItems: 'center', padding: '0 12px', gap: 12 }}>
               <div style={{ flex: 1, height: 6, background: 'rgba(0,0,0,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${(totalRev + totalUnpaid) === 0 ? 100 : Math.min(100, (totalRev / (totalRev + totalUnpaid)) * 100)}%`, height: '100%', background: ac }} />
               </div>
               <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent-secondary)' }}>
                  {((totalRev + totalUnpaid) === 0 ? 100 : (totalRev / (totalRev + totalUnpaid)) * 100).toFixed(0)}%
               </div>
            </div>
         </div>
      </div>
 
      {/* 2. OPERATIONAL SEQUENCE GUIDE */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: 24, marginBottom: 32 }}>
         {[
           { step: '01', label: 'Add Clients', sub: 'Register phone number & details', color: ac, icon: <Users size={20} />, view: 'operations', action: 'Go to Clients →' },
           { step: '02', label: 'Start Project', sub: 'Create project & send invoice', color: '#B45309', icon: <Plus size={20} />, view: 'operations', action: 'Go to Clients →' },
           { step: '03', label: 'Track Work', sub: 'Advance stages & manage delivery', color: `var(--accent-secondary)`, icon: <Activity size={20} />, view: 'projects', action: 'Go to Projects →' },
           { step: '04', label: 'Get Paid', sub: 'Review invoices & collect payment', color: '#16A34A', icon: <DollarSign size={20} />, view: 'financials', action: 'Go to Payments →' },
         ].map(s => (
           <div 
            key={s.step} 
            className="p-card dash-step-card" 
            style={{ 
              padding: 24, display: 'flex', flexDirection: 'column', gap: 16,
              border: '1px solid var(--border)', background: '#fff', position: 'relative', overflow: 'hidden',
              borderRadius: 24, transition: 'all 0.3s ease'
            }}
           >
              <div style={{ position: 'absolute', right: -10, top: -10, fontSize: 64, fontWeight: 900, opacity: 0.03, color: '#000' }}>{s.step}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: s.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   {s.icon}
                </div>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, opacity: 0.5 }} />
              </div>
              <div style={{ zIndex: 1 }}>
                 <div className="lxf" style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: `var(--text-secondary)`, letterSpacing: 1 }}>Step {s.step}</div>
                 <div className="lxfh" style={{ fontSize: 20, marginTop: 4 }}>{s.label}</div>
                 <div className="lxf" style={{ fontSize: 12, color: `var(--text-secondary)` }}>{s.sub}</div>
              </div>
              <button 
                onClick={() => props.setView(s.view)}
                className="p-btn-dark" 
                style={{ width: '100%', marginTop: 8, padding: '10px', fontSize: 11, background: s.color, color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700 }}
              >
                {s.action}
              </button>
           </div>
         ))}
      </div>

      {/* 3. CORE METRICS OVERVIEW */}
      <div className="kpi-grid">
        {dashboardStats.map((s, i) => (
          <div key={i} className="p-card" style={{ padding: 32, background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(20px)', borderRadius: 24, border: '1px solid rgba(255,255,255,0.5)', minWidth: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, border: `1px solid ${s.color}20`, background: `${s.color}08`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                {s.icon}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800, color: s.trend > 0 ? '#16A34A' : '#EF4444', background: s.trend > 0 ? '#16A34A10' : '#EF444410', padding: '6px 12px', borderRadius: 100 }}>
                 {s.trend > 0 ? <TrendingUp size={14} /> : <AlertTriangle size={14} />} {Math.abs(s.trend)}%
              </div>
            </div>
            <div className="lxf eyebrow" style={{ fontSize: 10, color: `var(--text-secondary)`, marginBottom: 6, fontWeight: 800 }}>{s.label}</div>
            <div
              className="lxfh"
              title={s.raw != null ? `GH₵${Number(s.raw).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : String(s.value)}
              style={{ fontSize: 'clamp(18px, 1.8vw, 30px)', fontWeight: 300, color: `var(--accent-secondary)`, letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >{s.value}</div>
            <p className="lxf" style={{ fontSize: 13, color: `var(--text-secondary)`, marginTop: 14 }}>{s.sub}</p>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20 }}>
        <div className="p-card" style={{ padding: 24, borderRadius: 20, border: '1px solid var(--border-color)', background: '#fff', minWidth: 0, overflow: 'hidden' }}>
          <div className="lxf eyebrow" style={{ fontSize: 10, color: `var(--text-secondary)`, marginBottom: 8, fontWeight: 800 }}>Retail / One-Time Sales</div>
          <div className="lxfh" title={`GH₵${oneTimeSales.toLocaleString()}`} style={{ fontSize: 'clamp(17px, 1.6vw, 26px)', color: `var(--accent-secondary)`, marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fmtMoney(oneTimeSales)}</div>
          <div style={{ fontSize: 12, color: `var(--text-secondary)` }}>Revenue from walk-ins, direct purchases, and one-time client documents.</div>
        </div>
        <div className="p-card" style={{ padding: 24, borderRadius: 20, border: '1px solid var(--border-color)', background: '#fff', minWidth: 0, overflow: 'hidden' }}>
          <div className="lxf eyebrow" style={{ fontSize: 10, color: `var(--text-secondary)`, marginBottom: 8, fontWeight: 800 }}>Project Board Capacity</div>
          <div className="lxfh" style={{ fontSize: 'clamp(17px, 1.6vw, 26px)', color: `var(--accent-secondary)`, marginBottom: 6 }}>{(clients || []).filter(c => c.status !== 'Archived').length}/50</div>
          <div style={{ fontSize: 12, color: `var(--text-secondary)` }}>Active visible projects against the current operating load target.</div>
        </div>
      </div>
 
      {/* 3.4 ACTION BOARD — Waiting on you vs waiting on client */}
      {clients && clients.length > 0 && (() => {
        const stageMap = {};
        CLIENT_PROJECT_STAGES.forEach(s => { stageMap[s.id] = s; });
        const active = (clients || []).filter(p => p.stageId && p.stageId < 8 && p.status !== 'Completed' && p.status !== 'Archived');

        // Waiting on ADMIN: current stage whoActs === 'admin'
        const waitingOnAdmin = active.filter(p => {
          const s = stageMap[p.stageId];
          return s?.whoActs === 'admin';
        });

        // Waiting on CLIENT: current stage whoActs === 'client'
        const waitingOnClient = active.filter(p => {
          const s = stageMap[p.stageId];
          return s?.whoActs === 'client';
        });

        if (waitingOnAdmin.length === 0 && waitingOnClient.length === 0) return null;

        const ProjRow = ({ project, tone }) => {
          const s = stageMap[project.stageId];
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.title || 'Untitled'}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>{s?.name || `Stage ${project.stageId}`}</div>
              </div>
              <button
                onClick={() => { props.onSelectClient?.(project.clientId); props.setView?.('client-hub'); }}
                style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: tone, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
              >Open →</button>
            </div>
          );
        };

        return (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
            {waitingOnAdmin.length > 0 && (
              <div style={{ background: '#fff', border: '1.5px solid #BFDBFE', borderRadius: 20, padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Activity size={16} color="#1D4ED8" />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#1D4ED8' }}>Waiting on you</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{waitingOnAdmin.length} project{waitingOnAdmin.length !== 1 ? 's' : ''} need your action</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {waitingOnAdmin.slice(0, 5).map(p => <ProjRow key={p.id} project={p} tone="#1D4ED8" />)}
                  {waitingOnAdmin.length > 5 && <div style={{ fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center', paddingTop: 4 }}>+{waitingOnAdmin.length - 5} more</div>}
                </div>
              </div>
            )}
            {waitingOnClient.length > 0 && (
              <div style={{ background: '#fff', border: '1.5px solid #FDE68A', borderRadius: 20, padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock size={16} color="#B45309" />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#B45309' }}>Waiting on client</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{waitingOnClient.length} project{waitingOnClient.length !== 1 ? 's' : ''} need client action</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {waitingOnClient.slice(0, 5).map(p => <ProjRow key={p.id} project={p} tone="#B45309" />)}
                  {waitingOnClient.length > 5 && <div style={{ fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center', paddingTop: 4 }}>+{waitingOnClient.length - 5} more</div>}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* 3.5 NEEDS ATTENTION */}
      {clients && clients.length > 0 && (() => {
        const getDays = (p) => {
          const entry = [...(p.stageHistory || [])].reverse().find(h => h.stageId === p.stageId);
          const ts = entry?.timestamp;
          if (!ts) return 0;
          const d = ts?.toDate ? ts.toDate() : new Date(ts);
          return Math.floor((Date.now() - d.getTime()) / 86400000);
        };
        const stuckProjects = clients.filter(project => {
          if (!project.stageId || project.stageId === 8) return false;
          const history = project.stageHistory || [];
          const entry = [...history].reverse().find(h => h.stageId === project.stageId);
          const ts = entry?.timestamp;
          if (!ts) return false;
          const d = ts?.toDate ? ts.toDate() : new Date(ts);
          const days = Math.floor((Date.now() - d.getTime()) / 86400000);
          return days >= 5;
        }).sort((a, b) => getDays(b) - getDays(a)).slice(0, 8);

        return (
          <div style={{ background: '#fff', border: '1px solid var(--border-color)', borderRadius: 20, padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={20} color="#D97706" />
              </div>
              <div>
                <div className="lxfh" style={{ fontSize: 18, letterSpacing: '-0.01em' }}>Needs Attention</div>
                <div className="lxf" style={{ fontSize: 12, color: `var(--text-secondary)` }}>Projects stuck in their current stage for 5+ days</div>
              </div>
            </div>
            {stuckProjects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', border: '1px dashed var(--border-color)', borderRadius: 16, color: '#16A34A', fontSize: 13, background: 'rgba(22,163,74,0.03)' }}>
                <CheckCircle size={22} style={{ marginBottom: 8 }} />
                <div style={{ fontWeight: 700 }}>All projects are moving ✓</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {stuckProjects.map(project => {
                  const days = getDays(project);
                  const stageObj = CLIENT_PROJECT_STAGES.find(s => s.id === project.stageId);
                  const badgeBg = days > 14 ? '#EF4444' : '#D97706';
                  return (
                    <div key={project.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', background: `var(--bg-secondary)`, borderRadius: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: `var(--accent-secondary)`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{project.title || project.name || 'Untitled Project'}</div>
                        <div style={{ fontSize: 11, color: `var(--text-secondary)`, marginTop: 2 }}>{project.clientName || ''} · {stageObj?.name || `Stage ${project.stageId}`}</div>
                      </div>
                      <div style={{ background: badgeBg, color: '#fff', padding: '4px 10px', borderRadius: 100, fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap' }}>
                        {days}d stuck
                      </div>
                      <button
                        onClick={() => {
                          props.onSelectClient && props.onSelectClient(project.clientId);
                          props.setView && props.setView('client-hub');
                        }}
                        style={{ padding: '8px 14px', borderRadius: 10, background: `var(--accent-secondary)`, color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        View →
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* 3. PERFORMANCE ARCHITECTURE */}
      <div className="hub-grid">
        {/* REVENUE MOMENTUM */}
        <div className="p-card" style={{ padding: 40, background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(20px)', borderRadius: 32, border: '1px solid rgba(255,255,255,0.5)' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 48 }}>
              <div>
                <h3 className="lxfh" style={{ fontSize: 28, letterSpacing: '-0.02em' }}>Financial Velocity</h3>
                <p className="lxf" style={{ fontSize: 14, color: `var(--text-secondary)` }}>Trailing revenue against production targets.</p>
              </div>
              {!isMobile && <button className="p-btn-light lxf" style={{ padding: '12px 24px', fontSize: 11, borderRadius: 14, border: '1px solid var(--border-color)', fontWeight: 800 }}>AUDIT STATEMENTS</button>}
           </div>
           
            <div style={{ height: 320, width: '100%', minHeight: 320, background: 'var(--bg-alt)', borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
             <ResponsiveContainer width="100%" height={320} minHeight={320}>
               <AreaChart data={dynamicRevData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.03)" vertical={false} />
                <XAxis dataKey="m" tick={{ fill: `var(--text-secondary)`, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: `var(--text-secondary)`, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `GH₵${v}k`} />
                <Tooltip 
                  contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', background: `var(--accent-secondary)`, color: '#fff' }} 
                  itemStyle={{ fontSize: 12, fontWeight: 800 }}
                />
                <Area type="monotone" dataKey="v" name="Actual Revenue" stroke={ac} fill="url(#dashColor)" strokeWidth={3} />
                <Area type="monotone" dataKey="p" name="Projected Targets" stroke="rgba(255,255,255,0.2)" fill="transparent" strokeDasharray="5 5" strokeWidth={2} />
                <defs>
                   <linearGradient id="dashColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={ac} stopOpacity={0.2}/>
                      <stop offset="95%" stopColor={ac} stopOpacity={0}/>
                   </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {/* PRODUCTION CAPACITY GAUGE */}
          <div className="p-card" style={{ padding: 40, background: `var(--accent-secondary)`, color: '#fff', borderRadius: 32, border: 'none' }}>
             {(() => {
               const maxCap = 50;
               const pct = Math.min(100, Math.round((activeJobs / maxCap) * 100));
               const barColor = pct >= 90 ? '#EF4444' : pct >= 70 ? '#D97706' : ac;
               return (
                 <>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                     <h3 className="lxfh" style={{ fontSize: 24 }}>Factory Throughput</h3>
                     <div style={{ fontSize: 10, fontWeight: 800, color: barColor }}>{pct}% LOAD</div>
                   </div>
                   <div style={{ height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
                     <div style={{ width: `${pct}%`, height: '100%', background: barColor, transition: 'width 0.8s ease' }} />
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, opacity: 0.6 }}>
                     <span>Active Fabrication: {activeJobs} Jobs</span>
                     <span>Max Capacity: {maxCap} Jobs</span>
                   </div>
                 </>
               );
             })()}
          </div>
          {/* OPERATIONS FEED */}
          <div className="p-card" style={{ padding: 40, background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(20px)', borderRadius: 32, border: '1px solid rgba(255,255,255,0.5)' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
                <h3 className="lxfh" style={{ fontSize: 24, letterSpacing: '-0.02em' }}>Live Throughput</h3>
                <div className="luxe-pulse" style={{ background: '#16A34A', width: 10, height: 10, borderRadius: '50%' }}></div>
             </div>
             
             <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {(props.logs || []).slice(0, 5).map(l => (
                  <div key={l.id} style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '12px', borderRadius: 16, border: '1px solid var(--bg-secondary)' }}>
                     <div style={{ width: 44, height: 44, borderRadius: 12, background: `var(--bg-secondary)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Activity size={18} color={ac} />
                     </div>
                     <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 800 }}>{l.action}</div>
                        <div style={{ fontSize: 11, color: `var(--text-secondary)` }}>{l.project_title || 'System Core'} • {new Date(l.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                     </div>
                  </div>
                ))}
             </div>
             
              <button 
                onClick={() => typeof props.setMod === 'function' && props.setMod('AuditLog')}
                style={{ width: '100%', marginTop: 24, padding: 14, borderRadius: 12, background: `var(--bg-secondary)`, border: '1px solid var(--border-color)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
              >
                Full Operations Audit
              </button>
          </div>

          {/* INVENTORY ALERTS */}
          <div className="p-card" style={{ padding: 40, background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(20px)', borderRadius: 32, border: '1px solid rgba(255,255,255,0.5)' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
                <h3 className="lxfh" style={{ fontSize: 24, letterSpacing: '-0.02em' }}>Inventory Criticality</h3>
                <div style={{ background: '#EF4444', color: '#fff', padding: '4px 10px', borderRadius: 100, fontSize: 10, fontWeight: 800 }}>ALERTS</div>
             </div>
             
             <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {liveProducts.filter(p => p.stock <= p.threshold).map(p => (
                  <div key={p.id} style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '12px', borderRadius: 16, background: '#FFF7ED', border: '1px solid #FFEDD5' }}>
                     <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <AlertTriangle size={18} color="#D97706" />
                     </div>
                     <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 800 }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: '#D97706' }}>Stock: {p.stock} units • Threshold: {p.threshold}</div>
                     </div>
                  </div>
                ))}
                {liveProducts.filter(p => p.stock <= p.threshold).length === 0 && (
                  <div style={{ textAlign: 'center', padding: 40, border: '1px dashed var(--border-color)', borderRadius: 20, color: '#16A34A', fontSize: 13, background: 'rgba(22, 163, 74, 0.03)' }}>
                     <CheckCircle size={24} style={{ marginBottom: 8 }} />
                     <div>All inventory levels are within nominal parameters.</div>
                  </div>
                )}
             </div>
          </div>

          {/* FINANCIAL LEDGER */}
          <div className="p-card" style={{ padding: 40, background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(20px)', borderRadius: 32, border: '1px solid rgba(255,255,255,0.5)' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
                <h3 className="lxfh" style={{ fontSize: 24, letterSpacing: '-0.02em' }}>Recent Payments</h3>
                <div style={{ background: `var(--bg-secondary)`, color: ac, padding: '4px 10px', borderRadius: 100, fontSize: 10, fontWeight: 800 }}>LIVE</div>
             </div>
             
             <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {(invoices || []).slice(0, 5).map(inv => (
                  <div key={inv.id} style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '12px', borderRadius: 16, border: '1px solid var(--bg-secondary)' }}>
                     <div style={{ width: 44, height: 44, borderRadius: 12, background: `var(--bg-secondary)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Receipt size={18} color={inv.status === 'Paid' ? '#16A34A' : '#D97706'} />
                     </div>
                     <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 800 }}>{inv.invoice_number || 'INV-000'}</div>
                        <div style={{ fontSize: 11, color: `var(--text-secondary)` }}>{inv.client_name || 'Walk-in'} • {inv.date ? new Date(inv.date).toLocaleDateString() : 'No date'}</div>
                     </div>
                     <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 14, fontWeight: 800 }}>GH₵{parseFloat(String(inv.amount || '0').replace(/[$,]/g, '')).toLocaleString()}</div>
                        <div style={{ fontSize: 11, color: inv.status === 'Paid' ? '#16A34A' : '#D97706', fontWeight: 800, textTransform: 'uppercase' }}>
                           {inv.status}
                        </div>
                     </div>
                  </div>
                ))}
                {(!invoices || invoices.length === 0) && (
                  <div style={{ textAlign: 'center', padding: 40, border: '1px dashed var(--border-color)', borderRadius: 20, color: `var(--text-secondary)`, fontSize: 13 }}>
                     <DollarSign size={24} style={{ marginBottom: 8, opacity: 0.5 }} />
                     <div>No financial records found.</div>
                  </div>
                )}
             </div>
             <button 
                onClick={() => typeof props.setMod === 'function' && props.setMod('invoices')}
                style={{ width: '100%', marginTop: 24, padding: 14, borderRadius: 12, background: ac, color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
              >
                View Recent Payments
              </button>
          </div>
        </div>
      </div>
      {/* 4. CHANGE REQUESTS */}
      {(() => {
        const pendingCRs = (props.changeRequests || []).filter(cr => cr.status === 'pending' || cr.status === 'Pending');
        if (pendingCRs.length === 0) return null;
        return (
          <div className="p-card" style={{ padding: 40, background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(20px)', borderRadius: 32, border: '1px solid rgba(255,255,255,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
              <div>
                <h3 className="lxfh" style={{ fontSize: 24, letterSpacing: '-0.02em' }}>Change Requests</h3>
                <p className="lxf" style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Client-submitted scope changes awaiting your decision.</p>
              </div>
              <div style={{ background: '#FEF3C7', color: '#B45309', padding: '4px 12px', borderRadius: 100, fontSize: 11, fontWeight: 800 }}>{pendingCRs.length} PENDING</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {pendingCRs.map(cr => (
                <ChangeRequestRow key={cr.id} cr={cr} clients={clients} ac={ac} onUpdate={props.updateChangeRequest} />
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function ChangeRequestRow({ cr, clients, ac, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const client = (clients || []).find(c => c.id === cr.clientId);
  const clientName = client?.name || client?.company || cr.clientId || 'Client';

  const handle = async (status) => {
    if (!onUpdate || loading) return;
    setLoading(true);
    await onUpdate(cr.id, { status, resolvedAt: new Date().toISOString() }, cr.projectId);
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: 20, borderRadius: 18, border: '1px solid var(--bg-secondary)', background: '#fff' }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <MessageSquareDiff size={20} color="#B45309" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 14 }}>{clientName}</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{cr.projectId || 'No project ref'} • {cr.createdAt ? new Date(cr.createdAt).toLocaleDateString() : ''}</div>
        {cr.description && <div style={{ fontSize: 13, marginTop: 8, color: 'var(--text-primary)', lineHeight: 1.5 }}>{cr.description}</div>}
        {cr.items && Array.isArray(cr.items) && (
          <ul style={{ margin: '8px 0 0', paddingLeft: 16, fontSize: 12, color: 'var(--text-secondary)' }}>
            {cr.items.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button
          disabled={loading}
          onClick={() => handle('approved')}
          style={{ padding: '8px 16px', borderRadius: 10, background: '#16A34A', color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
        >Approve</button>
        <button
          disabled={loading}
          onClick={() => handle('rejected')}
          style={{ padding: '8px 16px', borderRadius: 10, background: '#EF4444', color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
        >Reject</button>
      </div>
    </div>
  );
}
