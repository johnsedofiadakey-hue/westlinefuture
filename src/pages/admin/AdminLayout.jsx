import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Settings, LogOut, Folder, FileCode,
  Eye, Calendar, Activity, Globe, Truck, Package, Mail, MessageSquare, Sparkles,
  ChevronRight, ChevronDown, FolderOpen, FileText, Briefcase, TrendingUp, Kanban, HardHat, KeyRound, X, Check, Loader2
} from 'lucide-react';
import { NotificationBell } from '../../components/Shared';
import { getAuth, updatePassword } from 'firebase/auth';
import { db } from '../../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import LanguageFlagSwitch from '../../components/LanguageFlagSwitch';
import { translateAdminDom } from '../../lib/adminI18n';
import { useRef } from 'react';

export default function AdminLayout({ user, onLogout, onPreview, brand, view, setView, userNotifications, markNotificationRead, onSearchChange, children, staffMode = false, ...props }) {
  const ac = brand.color || `var(--accent-secondary)`;
  const navigate = useNavigate();
  const [expandedFolders, setExpandedFolders] = useState({});
  const [searchValue, setSearchValue] = useState('');

  // Track unread messages across all clients for admin
  // props.dbClients = actual client records (ids match clients/{id}/messages)
  const [unreadMap, setUnreadMap] = useState({});
  useEffect(() => {
    const clientList = props.dbClients || props.rawDbClients || [];
    if (!db || clientList.length === 0) return;
    const activeClients = clientList.filter(c => c.status !== 'Archived');
    const unsubs = activeClients.map(c => {
      const cid = c.id;
      return onSnapshot(collection(db, 'clients', cid, 'messages'), snap => {
        const unread = snap.docs.filter(d => {
          const m = d.data();
          return !m.isInternal && m.senderRole !== 'admin' && m.senderRole !== 'staff' && !m.readByAdmin;
        }).length;
        setUnreadMap(prev => ({ ...prev, [cid]: unread }));
      }, () => {});
    });
    return () => unsubs.forEach(u => u());
  }, [props.dbClients, props.rawDbClients]);
  
  const totalUnread = Object.values(unreadMap).reduce((a, b) => a + b, 0);

  // ── Pending Client Actions: projects awaiting client decision ───────────────
  // Counts projects where the client is being shown an actionable prompt
  // (unsigned contract, unpaid rendering, pending approval, etc.)
  const pendingClientActions = (() => {
    const projects = props.projects || [];
    const invoices = props.invoices || [];
    const isPaid = (s) => ['paid', 'paid in full'].includes(String(s || '').toLowerCase());
    return projects.filter(p => {
      if (p.status === 'Completed') return false;
      // Rendering fee unpaid
      if (p.kickoffMode === 'rendering-first' && !p.renderingFeePaid) {
        const renderingInv = invoices.find(i => i.id === p.renderingFeeInvoiceId || (i.projectId === p.id && ['rendering','design'].includes((i.type||'').toLowerCase())));
        if (renderingInv && !isPaid(renderingInv.status)) return true;
      }
      // Contract not signed (after rendering or for direct kickoff)
      if (!p.contractAccepted && !p.kickoffGateCleared) {
        const renderingClear = p.kickoffMode !== 'rendering-first' || p.renderingFeePaid;
        if (renderingClear) return true;
      }
      // Spec pending approval
      if (p.specDoc?.url && p.specDoc?.status === 'pending') return true;
      // Quote pending approval
      const pendingQuote = invoices.find(i => i.projectId === p.id && ['Quotation','quote','quotation'].includes(i.type || i.documentKind) && !['approved'].includes(String(i.status || '').toLowerCase()) && !isPaid(i.status));
      if (pendingQuote) return true;
      // Unpaid invoice (overdue or sent)
      const unpaidInv = invoices.find(i => i.projectId === p.id && !isPaid(i.status) && i.type !== 'Quotation' && (i.status === 'Overdue' || i.status === 'Sent'));
      if (unpaidInv) return true;
      return false;
    }).length;
  })();

  const prevUnreadRef = useRef(0);
  useEffect(() => {
    if (totalUnread > prevUnreadRef.current) {
      if (props.playNotificationSound) props.playNotificationSound();
      if (props.notify) props.notify('info', 'New Client Message Received', 'persistent');
    }
    prevUnreadRef.current = totalUnread;
  }, [totalUnread, props.playNotificationSound, props.notify]);
  
  
  const [showPwModal, setShowPwModal] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);

  const handleUpdatePassword = async () => {
    if (newPw.length < 6) {
      setPwMsg({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }
    setPwLoading(true);
    setPwMsg(null);
    try {
      const auth = getAuth();
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPw);
        setPwMsg({ type: 'success', text: 'Password updated successfully!' });
        setNewPw('');
        setTimeout(() => setShowPwModal(false), 2000);
      } else {
        setPwMsg({ type: 'error', text: 'Not authenticated. Please log out and back in.' });
      }
    } catch (e) {
      if (e.code === 'auth/requires-recent-login') {
        setPwMsg({ type: 'error', text: 'For security, please log out and log back in before changing your password.' });
      } else {
        setPwMsg({ type: 'error', text: e.message || 'Failed to update password.' });
      }
    }
    setPwLoading(false);
  };

  const toggleFolder = (id) => {
    setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const STAFF_ALLOWED_IDS = ['operations', 'projects'];

  const allMenuGroups = [
    {
      label: 'Main',
      items: [
        { id: 'dash', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
        { id: 'analytics', label: 'Analytics', icon: <TrendingUp size={18} /> },
      ]
    },
    {
      label: 'Projects',
      items: [
        { id: 'projects', label: 'Project Board', icon: <Kanban size={18} /> },
        { id: 'installations', label: 'Field Operations', icon: <HardHat size={18} /> },
        { id: 'logistics', label: 'Supply Chain', icon: <Truck size={18} /> },
      ]
    },
    {
      label: 'Clients',
      items: [
        { id: 'operations', label: 'Client Directory', icon: <Users size={18} /> },
        { id: 'email', label: 'Inquiry Queue', icon: <Mail size={18} /> },
      ]
    },
    {
      label: 'Finance',
      items: [
        { id: 'financials', label: 'Payments', icon: <FileText size={18} /> },
      ]
    },
    {
      label: 'Marketing',
      items: [
        { id: 'cms', label: 'Showcase Hub', icon: <Globe size={18} /> },
      ]
    },
    {
      label: 'Team',
      items: [
        { id: 'staff', label: 'Staff Accounts', icon: <Users size={18} /> },
      ]
    },
    {
      label: 'System',
      items: [
        { id: 'system', label: 'Settings', icon: <Settings size={18} /> },
        { id: 'product-sync', label: 'Product Catalog', icon: <Package size={18} /> },
      ]
    }
  ];

  const menuGroups = staffMode
    ? allMenuGroups
        .map(g => ({ ...g, items: g.items.filter(item => STAFF_ALLOWED_IDS.includes(item.id)) }))
        .filter(g => g.items.length > 0)
    : allMenuGroups;

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  // Re-translate whenever lang changes or admin content mutates (tabs, Firestore data loads, etc.)
  useEffect(() => {
    const lang = props.lang === 'zh' ? 'zh' : 'en';
    const apply = () => translateAdminDom(lang);
    // Double-pass: immediate + short delay for async Firestore-driven content
    apply();
    const t = setTimeout(apply, 150);
    const observer = new MutationObserver(() => requestAnimationFrame(apply));
    const root = document.querySelector('.lx-admin');
    if (root) observer.observe(root, { childList: true, subtree: true, characterData: true });
    return () => { clearTimeout(t); observer.disconnect(); };
  }, [props.lang]);

  return (
    <div className="lx-admin" style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary, #FAF8F5)', '--ac': ac, fontFamily: 'var(--font-p)' }}>
      {/* NARROW COMMAND EXPLORER (Desktop Only) */}
      {!isMobile && (
        <aside className="p-sidebar-narrow" style={{ 
          width: 280, 
          background: 'rgba(255, 255, 255, 0.7)', 
          backdropFilter: 'blur(24px)',
          borderRight: '1px solid rgba(0, 0, 0, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '1px 0 20px rgba(0,0,0,0.02)'
        }}>
          <div style={{ padding: '32px 24px 20px', borderBottom: '1px solid rgba(0,0,0,0.04)', marginBottom: 12 }}>
            {brand.logo ? (
              <img src={brand.logo} alt={brand.name} style={{ height: 48, width: 'auto', objectFit: 'contain', display: 'block' }} />
            ) : (
              <div>
                <div className="lxfh" style={{ fontSize: 16, fontWeight: 900, color: 'var(--accent-secondary)', letterSpacing: '0.04em' }}>WESTLINE</div>
                <div style={{ fontSize: 9, color: 'var(--text-secondary)', letterSpacing: '0.2em', marginTop: 2, fontWeight: 600 }}>GLOBAL TRADING CO., LTD</div>
              </div>
            )}
          </div>
          <nav style={{ flex: 1, padding: '0 16px' }}>
            {menuGroups.map(group => (
              <div key={group.label} style={{ marginBottom: 28 }}>
                <div style={{ padding: '0 12px', fontSize: 10, fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>
                  {group.label}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {group.items.map(m => {
                    const isActive = view === m.id;
                    return (
                      <button 
                        key={m.id} 
                        onClick={() => setView(m.id)} 
                        style={{ 
                          width: '100%', 
                          padding: '12px 14px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 14, 
                          background: isActive ? '#fff' : 'transparent', 
                          border: 'none', 
                          borderLeft: isActive ? `3px solid var(--accent-primary)` : '3px solid transparent',
                          borderRadius: '0 12px 12px 0',
                          color: isActive ? 'var(--accent-secondary)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          position: 'relative',
                          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                          boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.03)' : 'none',
                          fontWeight: isActive ? 700 : 500
                        }}
                        onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.4)' }}
                        onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                      >
                        <div style={{ color: isActive ? 'var(--accent-primary)' : 'inherit', display: 'flex', alignItems: 'center' }}>
                          {m.icon}
                        </div>
                        <span style={{ fontSize: 14, flex: 1 }}>{m.label}</span>
                        {m.id === 'operations' && totalUnread > 0 && (
                          <div style={{ background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 10 }}>
                            {totalUnread > 99 ? '99+' : totalUnread}
                          </div>
                        )}
                        {m.id === 'projects' && pendingClientActions > 0 && (
                          <div style={{ background: 'var(--accent-primary)', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 10 }}>
                            {pendingClientActions > 99 ? '99+' : pendingClientActions}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div style={{ padding: '16px 20px 24px', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
            <a href="/work" target="_blank" rel="noreferrer" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', textDecoration: 'none', fontWeight: 500 }}>
              <HardHat size={16} /> <span style={{ fontSize: 13 }}>Field Worker View</span>
            </a>
            <button onClick={() => { setShowPwModal(true); setPwMsg(null); setNewPw(''); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 500 }}>
              <KeyRound size={16} /> <span style={{ fontSize: 13 }}>Change Password</span>
            </button>
            <div style={{ margin: '8px 0' }}>
              <LanguageFlagSwitch variant="mobile" style={{ width: '100%', borderRadius: 12, background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.05)', height: 42, fontSize: 18 }} />
            </div>
            <button onClick={onLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontWeight: 600 }}>
              <LogOut size={16} /> <span style={{ fontSize: 13 }}>Logout</span>
            </button>
          </div>
        </aside>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="lx-main-admin" style={{ flex: 1, marginLeft: !isMobile ? 280 : 0 }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          {/* RESPONSIVE HEADER */}
          <header className={`p-nav-float ${isMobile ? 'mobile-header' : ''}`} style={{
            marginTop: isMobile ? 0 : 24,
            borderRadius: isMobile ? 0 : 20,
            background: 'rgba(255, 255, 255, 0.4)',
            backdropFilter: 'blur(24px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.6)',
            boxShadow: 'var(--sh-md)',
            position: 'relative',
            zIndex: 50
          }}>
            <div className="header-inner" style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: isMobile ? '0 16px' : '20px 32px',
              flexDirection: 'row',
              height: isMobile ? 60 : 'auto'
            }}>
              <div className="header-title">
                {isMobile ? (
                  <div className="lxfh" style={{ fontSize: 18, fontWeight: 700 }}>Admin Console</div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <div className="lxf eyebrow" style={{ fontSize: 10, letterSpacing: '.2em', color: ac, fontWeight: 800, textTransform: 'uppercase' }}>Admin</div>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#16A34A', boxShadow: '0 0 10px #16A34A' }} />
                    </div>
                    <h1 className="lxfh" style={{ fontSize: 22, letterSpacing: '-0.02em' }}>Westline Future</h1>
                  </>
                )}
              </div>
              
              <div className="header-actions" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                 {!isMobile && (
                   <div style={{ flex: 1, margin: '0 40px', maxWidth: 500, position: 'relative' }}>
                      <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: ac, opacity: 0.5 }}>
                         <Eye size={16} />
                      </div>
                      <input
                        className="lxf"
                        value={searchValue}
                        onChange={e => {
                          setSearchValue(e.target.value);
                          onSearchChange?.(e.target.value);
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Escape') { setSearchValue(''); onSearchChange?.(''); }
                          if (e.key === 'Enter' && searchValue.trim()) setView('operations');
                        }}
                        placeholder="Search clients, projects, invoices..."
                        style={{
                          width: '100%',
                          height: 44,
                          borderRadius: 14,
                          background: 'rgba(255,255,255,0.4)',
                          border: '1px solid rgba(255,255,255,0.6)',
                          paddingLeft: 44,
                          paddingRight: searchValue ? 36 : 80,
                          fontSize: 12,
                          fontWeight: 500,
                          color: `var(--accent-secondary)`,
                          outline: 'none',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                        onFocus={(e) => { e.target.style.background = '#fff'; e.target.style.boxShadow = '0 10px 30px rgba(0,0,0,0.05)'; }}
                        onBlur={(e) => { e.target.style.background = 'rgba(255,255,255,0.4)'; e.target.style.boxShadow = 'none'; }}
                      />
                      {searchValue && (
                        <button onClick={() => { setSearchValue(''); onSearchChange?.(''); }} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: `var(--text-secondary)`, display: 'flex', alignItems: 'center' }}>✕</button>
                      )}
                   </div>
                 )}
                                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                   <LanguageFlagSwitch variant="mobile" />
                   
                   <NotificationBell notifications={userNotifications} onMarkRead={markNotificationRead} navigate={navigate} />
                   
                   <button
                     onClick={() => setView('operations')}
                     title={totalUnread > 0 ? `${totalUnread} unread client message${totalUnread > 1 ? 's' : ''}` : 'Client Messages'}
                     style={{ width: 38, height: 38, borderRadius: 10, background: 'transparent', border: '1.5px solid var(--border-color)', cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', color: totalUnread > 0 ? '#6366F1' : 'var(--text-secondary)', transition: 'all .15s' }}
                     onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                     onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                   >
                     <MessageSquare size={17} fill={totalUnread > 0 ? '#6366F1' : 'none'} />
                     {totalUnread > 0 && (
                       <div style={{ position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, borderRadius: 9, background: '#6366F1', color: '#fff', fontSize: 10, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', border: '2px solid #fff', lineHeight: 1 }}>
                         {totalUnread > 99 ? '99+' : totalUnread}
                       </div>
                     )}
                   </button>
                   
                   <button onClick={onPreview} title="Open the public website in a new tab" className="p-btn-light" style={{ padding: '8px 12px', fontSize: 11, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid var(--border-color)' }}>
                     <Eye size={14} /> <span className="dt-only">View Website</span>
                   </button>

                   <div title={user?.email || 'Admin account'} style={{ width: 32, height: 32, borderRadius: '50%', background: `${ac}22`, border: `1.5px solid ${ac}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: ac, fontSize: 11 }}>
                     {user?.email?.slice(0, 1).toUpperCase() || 'A'}
                   </div>

                   {!isMobile && (
                     <button onClick={onLogout} title="Sign out" style={{ background: 'none', border: 'none', color: `var(--text-secondary)`, padding: 8, cursor: 'pointer' }}><LogOut size={18} /></button>
                   )}
                 </div>
               </div>
               
            </div>
          </header>

          <div className="fade-in admin-content-wrap" style={{ padding: isMobile ? '20px 20px 120px' : '40px 60px' }}>
            {view === 'dash' && !localStorage.getItem('wl_admin_guide_dismissed') && (
              <div style={{ padding: 24, background: `var(--bg-primary)`, border: '1px solid var(--border-color)', borderRadius: 24, marginBottom: 28, position: 'relative' }}>
                 <button
                   onClick={() => { localStorage.setItem('wl_admin_guide_dismissed', '1'); window.location.reload(); }}
                   title="Dismiss this guide"
                   style={{ position: 'absolute', top: 16, right: 16, width: 28, height: 28, borderRadius: 8, background: 'var(--bg-secondary)', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800 }}
                 >
                   ×
                 </button>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                    <div style={{ width: 40, height: 40, background: `var(--accent-secondary)`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: ac }}>
                       <Briefcase size={20} />
                    </div>
                    <div>
                       <h3 className="lxfh" style={{ fontSize: 17, margin: 0 }}>Quick Start Guide</h3>
                       <p className="lxf" style={{ color: `var(--text-secondary)`, fontSize: 12, margin: 0 }}>4 steps to onboard your first client (dismiss when done)</p>
                    </div>
                 </div>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                    {[
                      { t: '1. Register Client', d: 'Add phone number in Client Directory.', i: <Users size={16} /> },
                      { t: '2. Create Project', d: 'Open client Hub and create a project.', i: <Activity size={16} /> },
                      { t: '3. Send Invoice', d: 'Generate first invoice for rendering fee.', i: <Package size={16} /> },
                      { t: '4. Track Progress', d: 'Use Project Board to advance stages.', i: <FileText size={16} /> }
                    ].map(step => (
                       <div key={step.t} style={{ padding: 16, background: '#fff', borderRadius: 14, border: '1px solid var(--bg-secondary)' }}>
                          <div style={{ color: ac, marginBottom: 8 }}>{step.i}</div>
                          <h4 className="lxfh" style={{ fontSize: 13, marginBottom: 4 }}>{step.t}</h4>
                          <p className="lxf" style={{ fontSize: 11, color: `var(--text-secondary)`, lineHeight: 1.5, margin: 0 }}>{step.d}</p>
                       </div>
                    ))}
                 </div>
              </div>
            )}
            {children}
          </div>
        </div>
      </main>

      {/* CHANGE PASSWORD MODAL */}
      {showPwModal && (
        <div className="overlay-modal" onClick={() => !pwLoading && setShowPwModal(false)}>
          <div className="modal-box lxf" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 className="lxfh" style={{ fontSize: 20, color: `var(--accent-secondary)` }}>Change Password</h3>
              <button onClick={() => setShowPwModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: `var(--text-secondary)` }}><X size={20} /></button>
            </div>
            
            {pwMsg && (
              <div style={{ padding: '10px 14px', borderRadius: 8, background: pwMsg.type === 'error' ? '#FEF2F2' : '#F0FDF4', color: pwMsg.type === 'error' ? '#DC2626' : '#16A34A', fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                {pwMsg.type === 'success' && <Check size={16} />}
                {pwMsg.text}
              </div>
            )}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="lxf" style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>New Password</label>
                <input 
                  className="p-inp" 
                  type="password" 
                  value={newPw} 
                  onChange={e => setNewPw(e.target.value)} 
                  placeholder="At least 6 characters" 
                  style={{ width: '100%', boxSizing: 'border-box' }} 
                />
              </div>
              <button
                onClick={handleUpdatePassword}
                disabled={pwLoading || newPw.length < 6}
                className="p-btn-dark lxf"
                style={{ width: '100%', padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: (pwLoading || newPw.length < 6) ? 0.6 : 1 }}
              >
                {pwLoading ? <><Loader2 size={16} className="lp-spin" /> Updating...</> : 'Update Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION (Premium Glass Dock) */}
      {isMobile && (
        <div className="glass-dock" style={{ 
          position: 'fixed', bottom: 20, left: 20, right: 20, height: 72, 
          background: 'rgba(92, 58, 33, 0.95)', backdropFilter: 'blur(20px)', 
          borderRadius: 24, border: '1px solid rgba(255,255,255,0.1)', 
          display: 'flex', justifyContent: 'space-around', alignItems: 'center', 
          padding: '0 10px', zIndex: 1000, boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
        }}>
          {menuGroups.flatMap(g => g.items).slice(0, 5).map(m => (
            <button 
              key={m.id} 
              onClick={() => setView(m.id)} 
              style={{ 
                background: 'none', border: 'none', color: view === m.id ? ac : `var(--text-secondary)`, 
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer' 
              }}
            >
              {m.icon}
              <span className="lxf" style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>{m.label}</span>
            </button>
          ))}
          <button onClick={onLogout} style={{ background: 'none', border: 'none', color: '#EF4444' }}><LogOut size={20} /></button>
        </div>
      )}
    </div>
  );
}
