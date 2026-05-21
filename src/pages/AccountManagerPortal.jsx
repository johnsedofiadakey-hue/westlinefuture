import React, { useState, useEffect } from 'react';
import { 
  LogOut, Check, Calendar, Clock, User, 
  Briefcase, Activity, Mail, Phone, MapPin,
  Folder, DollarSign, MessageSquare, Image, FileText,
  ChevronRight, LayoutDashboard, Settings, Hammer, Ship
} from 'lucide-react';
import { 
  PAv, PSBadge, NotificationBell
} from '../components/Shared';

export default function AccountManagerPortal({ user, brand, onLogout, ...props }) {
  const ac = brand.color || '#231F78';
  const { clients, bookings, tasks, updateTask, workOrders = [], containers = [] } = props;
  const [tab, setTab] = useState('dash');
  
  const member = user || {};
  const myWorkOrders = (workOrders || []).filter(wo => wo.managerId === user?.id || wo.assignedTo === user.id);
  const myClients = (clients || []).filter(c => myWorkOrders.some(wo => wo.clientId === c.id));

  const stats = [
    { label: 'Active Folders', value: myWorkOrders.length, icon: <Folder size={20} /> },
    { label: 'My Stakeholders', value: myClients.length, icon: <User size={20} /> },
    { label: 'Due Tasks', value: (tasks || []).filter(t => t.assignedTo === user.id && t.status !== 'completed').length, icon: <Activity size={20} /> }
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F4F4FA' }}>
       {/* OPERATIONS SIDEBAR */}
       <aside style={{ width: 280, background: '#0D0B2E', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '32px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
             {brand.logo ? <img src={brand.logo} alt="logo" style={{ height: 32 }} /> : <div className="lxfh" style={{ fontSize: 20, color: ac }}>G</div>}
             <div className="lxfh" style={{ color: '#fff', fontSize: 16 }}>Ops Center</div>
          </div>

          <nav style={{ flex: 1, padding: '0 12px' }}>
             {[
                { id: 'dash', label: 'Command', icon: <LayoutDashboard size={18} /> },
                { id: 'folders', label: 'Work Orders', icon: <Folder size={18} /> },
                { id: 'tasks', label: 'Field Tasks', icon: <Hammer size={18} /> },
                { id: 'chat', label: 'Messages', icon: <MessageSquare size={18} /> },
                { id: 'profile', label: 'My Access', icon: <User size={18} /> }
             ].map(i => (
               <button 
                 key={i.id} 
                 onClick={() => setTab(i.id)}
                 style={{ 
                   width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                   background: tab === i.id ? 'rgba(35, 31, 120, 0.1)' : 'none',
                   border: 'none', borderRadius: 12, cursor: 'pointer',
                   color: tab === i.id ? ac : 'rgba(255,255,255,0.4)',
                   transition: 'all 0.2s', marginBottom: 4
                 }}
               >
                  {i.icon}
                  <span style={{ fontSize: 14, fontWeight: tab === i.id ? 700 : 500 }}>{i.label}</span>
               </button>
             ))}
          </nav>

          <div style={{ padding: 24, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
             <button onClick={onLogout} style={{ background: 'none', border: 'none', color: '#EF4444', opacity: 0.6, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                <LogOut size={16} /> Logout
             </button>
          </div>
       </aside>

       {/* MAIN OPERATIONS VIEW */}
       <main style={{ flex: 1, padding: '40px 60px', overflowY: 'auto' }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 48 }}>
             <div>
                <h1 className="lxfh" style={{ fontSize: 32, fontWeight: 900, marginBottom: 4 }}>Ops Command</h1>
                <p style={{ fontSize: 13, color: '#9B99C8', fontWeight: 600 }}>Welcome back, {member.name}</p>
             </div>
             <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                <NotificationBell notifications={props.userNotifications} onMarkRead={props.markNotificationRead} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                   <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{member.name}</div>
                      <div style={{ fontSize: 10, color: ac, fontWeight: 800, textTransform: 'uppercase' }}>{member.role}</div>
                   </div>
                   <PAv i={member.av} s={40} c={ac} />
                </div>
             </div>
          </header>

          {/* STATS STRIP */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 48 }}>
             {stats.map(s => (
               <div key={s.label} className="p-card" style={{ padding: 24, background: '#fff', border: '1px solid #E8E6F5' }}>
                  <div style={{ color: ac, marginBottom: 12 }}>{s.icon}</div>
                  <div style={{ fontSize: 24, fontWeight: 900 }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: '#9B99C8', fontWeight: 700, textTransform: 'uppercase' }}>{s.label}</div>
               </div>
             ))}
          </div>

          {/* CONTENT AREA */}
          <div className="fade-in">
             {tab === 'dash' && (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 32 }}>
                   <div className="p-card" style={{ padding: 32 }}>
                      <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 24 }}>Active Work Orders</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                         {myWorkOrders.length > 0 ? myWorkOrders.map(wo => (
                           <div key={wo.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, background: '#F4F4FA', borderRadius: 16 }}>
                              <div>
                                 <div style={{ fontSize: 14, fontWeight: 700 }}>{wo.title}</div>
                                 <div style={{ fontSize: 11, color: '#9B99C8' }}>{wo.id} • {wo.project}</div>
                              </div>
                              <PSBadge s={wo.status} />
                           </div>
                         )) : (
                           <div style={{ padding: 40, textAlign: 'center', color: '#9B99C8', fontSize: 13 }}>No active work orders assigned to you.</div>
                         )}
                      </div>
                   </div>

                   <div className="p-card" style={{ padding: 24 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 20 }}>Site Pulse</h3>
                      {/* Simple list of recent site photos or updates */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                         {(props.media || []).slice(0, 5).map(m => (
                           <div key={m.id} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                              <img src={m.url} style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} />
                              <div>
                                 <div style={{ fontSize: 12, fontWeight: 700 }}>{m.caption?.slice(0, 20)}...</div>
                                 <div style={{ fontSize: 10, color: '#9B99C8' }}>{new Date(m.createdAt).toLocaleDateString()}</div>
                              </div>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>
             )}
             
             {tab === 'tasks' && (
                <div className="p-card" style={{ padding: 32 }}>
                   <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 24 }}>Field Task List</h3>
                   {/* Simplified task list matching the new ERP style */}
                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                      {(tasks || []).filter(t => t.assignedTo === user.id).map(t => (
                        <div key={t.id} style={{ padding: 20, background: '#F4F4FA', borderRadius: 20, border: '1px solid #E8E6F5' }}>
                           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                              <div style={{ fontSize: 10, fontWeight: 900, color: ac }}>{t.project_title}</div>
                              <PSBadge s={t.status} />
                           </div>
                           <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{t.title}</div>
                           <div style={{ fontSize: 12, color: '#9B99C8' }}>{t.description}</div>
                        </div>
                      ))}
                   </div>
                </div>
             )}

             {tab === 'profile' && (
                <div className="p-card" style={{ padding: 40, maxWidth: 600 }}>
                   <div style={{ display: 'flex', gap: 32, alignItems: 'center', marginBottom: 40 }}>
                      <PAv i={member.av} s={100} c={ac} />
                      <div>
                         <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 4 }}>{member.name}</h2>
                         <div style={{ fontSize: 14, color: ac, fontWeight: 700 }}>{member.role}</div>
                      </div>
                   </div>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      <div><label style={{ fontSize: 10, fontWeight: 900, color: '#9B99C8', textTransform: 'uppercase' }}>Email</label><div style={{ fontSize: 15 }}>{member.email}</div></div>
                      <div><label style={{ fontSize: 10, fontWeight: 900, color: '#9B99C8', textTransform: 'uppercase' }}>Access Role</label><div style={{ fontSize: 15 }}>Production Supervisor</div></div>
                   </div>
                </div>
             )}
          </div>
       </main>
    </div>
  );
}
