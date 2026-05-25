import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, Settings, LogOut, Folder, FileCode,
  Eye, Calendar, Activity, Globe, Truck, Package, Mail, MessageSquare, Sparkles,
  ChevronRight, ChevronDown, FolderOpen, FileText, Briefcase, TrendingUp, Kanban, HardHat, KeyRound, X, Check, Loader2
} from 'lucide-react';
import { NotificationBell } from '../../components/Shared';
import { getAuth, updatePassword } from 'firebase/auth';
import LanguageFlagSwitch from '../../components/LanguageFlagSwitch';
import { translateAdminDom } from '../../lib/adminI18n';

export default function AdminLayout({ user, onLogout, onPreview, brand, view, setView, userNotifications, markNotificationRead, onSearchChange, children, staffMode = false, ...props }) {
  const ac = brand.color || `var(--accent-secondary)`;
  const [expandedFolders, setExpandedFolders] = useState({});
  const [searchValue, setSearchValue] = useState('');
  
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

  const STAFF_ALLOWED_IDS = ['operations', 'client-hub'];

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
        { id: 'installations', label: 'Installations', icon: <Activity size={18} /> },
        { id: 'logistics', label: 'Logistics', icon: <Truck size={18} /> },
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
        { id: 'product-sync', label: 'Product Sync Settings', icon: <Package size={18} /> },
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

  useEffect(() => {
    const lang = props.lang === 'zh' ? 'zh' : 'en';
    const apply = () => translateAdminDom(lang);
    apply();
    const observer = new MutationObserver(() => requestAnimationFrame(apply));
    const root = document.querySelector('.lx-admin');
    if (root) observer.observe(root, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [props.lang, view, isMobile]);

  return (
    <div className="lx-admin" style={{ display: 'flex', minHeight: '100vh', background: 'transparent', '--ac': ac }}>
      {/* NARROW COMMAND EXPLORER (Desktop Only) */}
      {!isMobile && (
        <aside className="p-sidebar-narrow" style={{ 
          width: 280, 
          background: `var(--accent-secondary)`, 
          borderRight: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ padding: '28px 24px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 8 }}>
            {brand.logo ? (
              <img src={brand.logo} alt={brand.name} style={{ height: 56, width: 'auto', objectFit: 'contain', display: 'block', filter: 'brightness(0) invert(1)' }} />
            ) : (
              <div>
                <div className="lxfh" style={{ fontSize: 15, fontWeight: 900, color: '#fff', letterSpacing: '0.04em' }}>WESTLINE</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.2em', marginTop: 2 }}>GLOBAL TRADING CO., LTD</div>
              </div>
            )}
          </div>
          <div style={{ padding: '8px 24px 12px', display: 'flex', alignItems: 'center' }}>
            <div className="lxfh" style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em' }}>Command</div>
          </div>
          
          <nav style={{ flex: 1, padding: '0 12px' }}>
            {menuGroups.map(group => (
              <div key={group.label} style={{ marginBottom: 24 }}>
                <div style={{ padding: '0 12px', fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 12 }}>
                  {group.label}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {group.items.map(m => (
                    <button 
                      key={m.id} 
                      onClick={() => setView(m.id)} 
                      style={{ 
                        width: '100%', 
                        padding: '12px 14px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 14, 
                        background: view === m.id ? 'rgba(255,255,255,0.05)' : 'none', 
                        border: 'none', 
                        borderRadius: 12, 
                        color: view === m.id ? ac : `var(--text-secondary)`, 
                        cursor: 'pointer', 
                        transition: 'all 0.2s',
                        position: 'relative'
                      }}
                    >
                      {m.icon}
                      <span className="lxf" style={{ fontSize: 13, fontWeight: view === m.id ? 700 : 500 }}>{m.label}</span>
                      {view === m.id && <div style={{ position: 'absolute', right: 12, width: 4, height: 4, borderRadius: '50%', background: ac }} />}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div style={{ padding: 16, borderTop: '1px solid rgba(255,255,255,.05)', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <a href="/work" target="_blank" rel="noreferrer" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: 'rgba(249,247,244,.6)', cursor: 'pointer', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
              <HardHat size={16} /> Field Worker View
            </a>
            <button onClick={() => { setShowPwModal(true); setPwMsg(null); setNewPw(''); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'none', border: 'none', color: 'rgba(249,247,244,.4)', cursor: 'pointer' }}>
              <KeyRound size={16} /> <span style={{ fontSize: 13 }}>Change Password</span>
            </button>
            <button onClick={onLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'none', border: 'none', color: 'rgba(249,247,244,.4)', cursor: 'pointer' }}>
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
                      <div className="lxf eyebrow" style={{ fontSize: 10, letterSpacing: '.2em', color: ac, fontWeight: 800, textTransform: 'uppercase' }}>Operations Control</div>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#16A34A', boxShadow: '0 0 10px #16A34A' }} />
                    </div>
                    <h1 className="lxfh" style={{ fontSize: 22, letterSpacing: '-0.02em' }}>Management Console</h1>
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
                   
                   <NotificationBell notifications={userNotifications} onMarkRead={markNotificationRead} />
                   
                   <button onClick={onPreview} className="p-btn-light" style={{ padding: '8px 12px', fontSize: 11, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid var(--border-color)' }}>
                     <Eye size={14} /> <span className="dt-only">Site Preview</span>
                   </button>
                   
                   <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${ac}22`, border: `1.5px solid ${ac}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: ac, fontSize: 11 }}>
                     {user?.email?.slice(0, 1).toUpperCase() || 'A'}
                   </div>
                   
                   {!isMobile && (
                     <button onClick={onLogout} style={{ background: 'none', border: 'none', color: `var(--text-secondary)`, padding: 8, cursor: 'pointer' }}><LogOut size={18} /></button>
                   )}
                 </div>
               </div>
               
            </div>
          </header>

          <div className="fade-in admin-content-wrap" style={{ padding: isMobile ? '20px 20px 120px' : '40px 60px' }}>
            {view === 'dash' && (
              <div style={{ padding: 32, background: `var(--bg-primary)`, border: '1px solid var(--border-color)', borderRadius: 32, marginBottom: 40 }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                    <div style={{ width: 48, height: 48, background: `var(--accent-secondary)`, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: ac }}>
                       <Briefcase size={24} />
                    </div>
                    <div>
                       <h3 className="lxfh" style={{ fontSize: 22, margin: 0 }}>Operational Guide</h3>
                       <p className="lxf" style={{ color: `var(--text-secondary)`, fontSize: 13 }}>Follow these steps to run your business</p>
                    </div>
                 </div>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
                    {[
                      { t: '1. Register Client', d: 'Go to Client Directory and add their phone number.', i: <Users size={18} /> },
                      { t: '2. Start Project', d: 'Open their hub and click "Deploy New Phase".', i: <Activity size={18} /> },
                      { t: '3. Add Sourcing', d: 'Add items in Sourcing Hub for client approval.', i: <Package size={18} /> },
                      { t: '4. Get Paid', d: 'Trigger an Invoice and share the portal link.', i: <FileText size={18} /> }
                    ].map(step => (
                       <div key={step.t} style={{ padding: 20, background: '#fff', borderRadius: 20, border: '1px solid var(--bg-secondary)' }}>
                          <div style={{ color: ac, marginBottom: 12 }}>{step.i}</div>
                          <h4 className="lxfh" style={{ fontSize: 14, marginBottom: 6 }}>{step.t}</h4>
                          <p className="lxf" style={{ fontSize: 11, color: `var(--text-secondary)`, lineHeight: 1.5 }}>{step.d}</p>
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
