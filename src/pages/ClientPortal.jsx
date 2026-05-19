import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, MessageSquare, FileText, Download,
  ChevronRight, Send, Package, DollarSign,
  Activity, ShieldCheck, CheckCircle2, AlertCircle,
  Briefcase, LogOut, Sparkles, Zap, Clock, BookOpen,
  Star, Truck, CheckCheck, Circle, Lock, ArrowRight,
  X, Check
} from 'lucide-react';
import { PAv, PSBadge } from '../components/Shared';
import { PROJECT_STAGES } from '../data';

const AC = '#C8A96E';

function MilestoneCard({ stage, isCurrent, isPast, isFuture, completedTasks = [], ac }) {
  const pct = stage.tasks?.length > 0
    ? Math.round((completedTasks.filter(t => stage.tasks.includes(t)).length / stage.tasks.length) * 100)
    : isPast ? 100 : 0;

  return (
    <div style={{
      minWidth: 240, maxWidth: 260,
      background: isCurrent ? '#fff' : isFuture ? '#FDFCFB' : '#F9F7F4',
      border: isCurrent ? `2px solid ${stage.color}` : isPast ? '1px solid #E8E3DD' : '1px dashed #E8E3DD',
      borderRadius: 20,
      padding: 20,
      opacity: isFuture ? 0.55 : 1,
      position: 'relative',
      transition: 'all 0.3s ease',
      boxShadow: isCurrent ? `0 12px 32px ${stage.color}20` : 'none',
      flexShrink: 0,
    }}>
      {/* Stage indicator */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 12,
          background: isPast ? stage.color : isCurrent ? `${stage.color}15` : '#F0EBE5',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: isCurrent ? `2px solid ${stage.color}` : 'none',
        }}>
          {isPast
            ? <Check size={18} color="#fff" strokeWidth={3} />
            : isFuture
              ? <Lock size={14} color="#B5AFA9" />
              : <span style={{ fontSize: 13, fontWeight: 800, color: stage.color }}>{stage.id}</span>
          }
        </div>
        {isCurrent && (
          <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: stage.color, background: `${stage.color}15`, padding: '4px 10px', borderRadius: 20 }}>
            Active
          </div>
        )}
        {isPast && (
          <CheckCircle2 size={16} color="#16A34A" />
        )}
      </div>

      <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1410', marginBottom: 4 }}>{stage.name}</div>
      <div style={{ fontSize: 11, color: '#B5AFA9', marginBottom: 14, lineHeight: 1.5 }}>{stage.description}</div>

      {/* Progress ring */}
      {!isFuture && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, color: '#B5AFA9', marginBottom: 5 }}>
            <span>Progress</span>
            <span style={{ color: isPast ? '#16A34A' : stage.color }}>{pct}%</span>
          </div>
          <div style={{ height: 5, background: '#F0EBE5', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: isPast ? '#16A34A' : stage.color, borderRadius: 3, transition: 'width 0.8s ease' }} />
          </div>
        </div>
      )}

      {/* Tasks */}
      {!isFuture && stage.tasks && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {stage.tasks.map((task, ti) => {
            const done = completedTasks.includes(task) || isPast;
            return (
              <div key={ti} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: done ? '#16A34A' : '#7A6E62' }}>
                {done
                  ? <CheckCircle2 size={12} color="#16A34A" style={{ flexShrink: 0 }} />
                  : <Circle size={12} color="#DDD" style={{ flexShrink: 0 }} />
                }
                <span style={{ textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.6 : 1 }}>{task}</span>
              </div>
            );
          })}
        </div>
      )}

      {isFuture && (
        <div style={{ fontSize: 11, color: '#B5AFA9', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Clock size={11} /> ~{stage.days} day{stage.days > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

export default function ClientPortal({ user, dbClients = [], clients = [], ...props }) {
  const [mob, setMob] = useState(window.innerWidth < 1000);
  const [tab, setTab] = useState('projects');
  const [activeProject, setActiveProject] = useState(null);
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const msgRef = useRef(null);

  useEffect(() => {
    const h = () => setMob(window.innerWidth < 1000);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const client = dbClients.find(c => c.id === user?.id) || dbClients[0] || {};
  const uId = user?.id;
  const uPhone = user?.phone;

  const myProjects = clients.filter(p => p.clientId === uId || p.clientIds?.includes(uId) || p.clientId === uPhone);
  const myInvoices = (props.invoices || []).filter(i => i.clientId === uId || i.clientId === uPhone);
  const myMessages = (props.messages || []).filter(m => m.senderId === uId || m.receiverId === uId || m.senderId === uPhone || m.receiverId === uPhone);

  const ac = props.brand?.color || AC;

  useEffect(() => {
    if (myProjects.length > 0 && !activeProject) setActiveProject(myProjects[0]);
  }, [myProjects]);

  const adminId = props.teamMembers?.find(t => t.role === 'admin')?.id || 'admin';
  const handleSendMessage = () => {
    const val = msgRef.current?.value?.trim();
    if (val) {
      props.sendMessage(val, uId, adminId);
      msgRef.current.value = '';
    }
  };

  const isAgentOnline = (() => {
    const h = new Date().getHours();
    return h >= 8 && h < 18;
  })();

  const navItems = [
    { id: 'projects', label: 'My Projects', icon: <LayoutDashboard size={mob ? 20 : 18} /> },
    { id: 'sourcing', label: 'Marketplace', icon: <Package size={mob ? 20 : 18} /> },
    { id: 'logistics', label: 'Track Order', icon: <Truck size={mob ? 20 : 18} /> },
    { id: 'vault', label: 'Documents', icon: <BookOpen size={mob ? 20 : 18} /> },
    { id: 'finance', label: 'Payments', icon: <DollarSign size={mob ? 20 : 18} /> },
    { id: 'support', label: 'Chat', icon: <MessageSquare size={mob ? 20 : 18} /> },
  ];

  return (
    <div className="client-portal-layout fade-in" style={{ background: '#FDFCFB', minHeight: '100vh', padding: mob ? '20px 20px 100px' : '40px 60px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: mob ? 32 : 48, position: mob ? 'sticky' : 'relative', top: 0, zIndex: 100, background: '#FDFCFB', padding: mob ? '10px 0' : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: mob ? 12 : 20 }}>
          <div style={{ width: mob ? 36 : 48, height: mob ? 36 : 48, background: '#1A1410', borderRadius: mob ? 12 : 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: ac }}>
            <Sparkles size={mob ? 18 : 24} />
          </div>
          <div>
            <h1 className="lxfh" style={{ fontSize: mob ? 18 : 26, margin: 0, lineHeight: 1 }}>My Account</h1>
            <p className="lxf" style={{ color: '#B5AFA9', fontSize: 10, margin: 0 }}>Glasstech Client Portal</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={props.currency} onChange={e => props.setCurrency(e.target.value)} style={{ height: mob ? 40 : 48, padding: '0 12px', borderRadius: 12, border: '1px solid #F0EBE5', background: '#fff', fontSize: 11, fontWeight: 700 }}>
            <option value="GHS">{mob ? 'GHS' : 'GHS (₵)'}</option>
            <option value="USD">{mob ? 'USD' : 'USD ($)'}</option>
          </select>
          {!mob && <button onClick={props.handleLogout} className="p-btn-light" style={{ height: 48, borderRadius: 14 }}><LogOut size={18} /></button>}
        </div>
      </div>

      <div style={{ display: mob ? 'block' : 'grid', gridTemplateColumns: '260px 1fr', gap: 48 }}>

        {/* Sidebar */}
        {!mob && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
                  borderRadius: 14, background: tab === item.id ? '#1A1410' : 'transparent',
                  color: tab === item.id ? '#fff' : '#6A635C', border: 'none',
                  textAlign: 'left', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <span style={{ color: tab === item.id ? ac : 'inherit' }}>{item.icon}</span>
                {item.label}
              </button>
            ))}

            {/* Project switcher */}
            {myProjects.length > 1 && (
              <div style={{ marginTop: 24 }}>
                <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.15em', color: '#B5AFA9', marginBottom: 10, padding: '0 20px' }}>Switch Project</div>
                {myProjects.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setActiveProject(p)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px',
                      background: activeProject?.id === p.id ? `${ac}15` : 'transparent',
                      border: 'none', borderRadius: 12, width: '100%', textAlign: 'left',
                      cursor: 'pointer', fontSize: 12, fontWeight: activeProject?.id === p.id ? 700 : 500,
                      color: activeProject?.id === p.id ? ac : '#7A6E62',
                    }}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: activeProject?.id === p.id ? ac : '#DDD', flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.project || p.title}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Quality check widget */}
            <div className="p-card" style={{ marginTop: 32, padding: 20, background: '#F9F7F4', border: 'none' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                <Zap size={16} color={ac} fill={ac} />
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>Quality Check</span>
              </div>
              <p style={{ fontSize: 11, color: '#B5AFA9', marginBottom: 16, lineHeight: 1.5 }}>Verify your installation progress with our precision audit tool.</p>
              <button
                onClick={() => props.notify('info', 'Quality audit feature coming soon.')}
                className="p-btn-dark"
                style={{ width: '100%', height: 40, fontSize: 11, background: ac, color: '#1A1410', border: 'none' }}
              >
                Request Audit
              </button>
            </div>
          </div>
        )}

        {/* Main content */}
        <div style={{ minWidth: 0 }}>

          {/* ── PROJECTS TAB ── */}
          {tab === 'projects' && (
            <div className="fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: mob ? 24 : 32 }}>
                <h2 className="lxfh" style={{ fontSize: mob ? 24 : 32 }}>
                  {myProjects.length > 1 ? 'My Projects' : (activeProject?.project || activeProject?.title || 'My Project')}
                </h2>
                {activeProject && <PSBadge s={PROJECT_STAGES[(activeProject.stage || 1) - 1]?.name || 'Active'} />}
              </div>

              {myProjects.length === 0 ? (
                <div style={{ padding: mob ? 60 : 100, textAlign: 'center', background: '#fff', borderRadius: mob ? 24 : 40, border: '1px dashed #F0EBE5' }}>
                  <Briefcase size={mob ? 48 : 64} color="#F0EBE5" style={{ marginBottom: 24 }} />
                  <h3 className="lxfh" style={{ fontSize: mob ? 20 : 24 }}>Your project dashboard is ready</h3>
                  <p className="lxf" style={{ color: '#B5AFA9', maxWidth: 400, margin: '16px auto', fontSize: 13 }}>We'll populate your project data as soon as engineering confirms the site survey.</p>
                </div>
              ) : activeProject ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: mob ? 24 : 32 }}>

                  {/* Overall progress hero */}
                  <div className="p-card" style={{ padding: mob ? 24 : 36, background: '#1A1410', color: '#fff', border: 'none' }}>
                    <div style={{ display: 'flex', flexDirection: mob ? 'column' : 'row', justifyContent: 'space-between', alignItems: mob ? 'flex-start' : 'center', gap: 16, marginBottom: 24 }}>
                      <div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>Current Phase</div>
                        <div style={{ fontSize: mob ? 18 : 22, fontWeight: 700, color: '#fff' }}>{PROJECT_STAGES[(activeProject.stage || 1) - 1]?.name}</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{activeProject.cat || 'Glass & Interior'} · {activeProject.budget}</div>
                      </div>
                      <div style={{ textAlign: mob ? 'left' : 'right' }}>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>Overall</div>
                        <div style={{ fontSize: mob ? 32 : 44, fontWeight: 800, color: ac, lineHeight: 1 }}>{Math.round(((activeProject.stage || 1) / PROJECT_STAGES.length) * 100)}%</div>
                      </div>
                    </div>
                    <div style={{ height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.round(((activeProject.stage || 1) / PROJECT_STAGES.length) * 100)}%`, height: '100%', background: ac, borderRadius: 4, transition: 'width 1.2s cubic-bezier(0.4,0,0.2,1)' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                      <span>Stage {activeProject.stage || 1} of {PROJECT_STAGES.length}</span>
                      <span>Next: {PROJECT_STAGES[activeProject.stage]?.name || 'Handover'}</span>
                    </div>
                  </div>

                  {/* Milestone roadmap — horizontal scroll */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <h3 className="lxfh" style={{ fontSize: mob ? 16 : 20 }}>Project Roadmap</h3>
                      <div style={{ fontSize: 11, color: '#B5AFA9' }}>Scroll to see all stages →</div>
                    </div>
                    <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 12, scrollSnapType: 'x mandatory' }}>
                      {PROJECT_STAGES.map((stage) => {
                        const isPast = (activeProject.stage || 1) > stage.id;
                        const isCurrent = (activeProject.stage || 1) === stage.id;
                        const isFuture = (activeProject.stage || 1) < stage.id;
                        return (
                          <div key={stage.id} style={{ scrollSnapAlign: 'start', flexShrink: 0 }}>
                            <MilestoneCard
                              stage={stage}
                              isPast={isPast}
                              isCurrent={isCurrent}
                              isFuture={isFuture}
                              completedTasks={activeProject.completedTasks || []}
                              ac={ac}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Current stage detail */}
                  {(() => {
                    const s = PROJECT_STAGES[(activeProject.stage || 1) - 1];
                    if (!s) return null;
                    const completedTasks = activeProject.completedTasks || [];
                    const done = completedTasks.filter(t => s.tasks?.includes(t)).length;
                    const total = s.tasks?.length || 0;
                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr', gap: 20 }}>
                        <div className="p-card" style={{ padding: mob ? 20 : 28, border: `1px solid ${s.color}30`, background: `${s.color}05` }}>
                          <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: s.color, marginBottom: 12 }}>Current Stage Tasks</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {(s.tasks || []).map((task, ti) => {
                              const isDone = completedTasks.includes(task);
                              return (
                                <div key={ti} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                                  {isDone
                                    ? <CheckCircle2 size={16} color="#16A34A" style={{ flexShrink: 0 }} />
                                    : <Circle size={16} color="#DDD" style={{ flexShrink: 0 }} />
                                  }
                                  <span style={{ color: isDone ? '#16A34A' : '#1A1410', textDecoration: isDone ? 'line-through' : 'none', opacity: isDone ? 0.6 : 1 }}>{task}</span>
                                </div>
                              );
                            })}
                          </div>
                          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(0,0,0,.05)', display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: '#B5AFA9' }}>
                            <span>Tasks complete</span>
                            <span style={{ color: done === total ? '#16A34A' : s.color }}>{done}/{total}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          <div className="p-card" style={{ padding: mob ? 20 : 24, border: '1px solid #F0EBE5' }}>
                            <Activity size={20} color={ac} style={{ marginBottom: 10 }} />
                            <div className="lxfh" style={{ fontSize: 15 }}>{s.name}</div>
                            <div className="lxf" style={{ fontSize: 11, color: '#B5AFA9', marginTop: 4, lineHeight: 1.5 }}>{s.description}</div>
                          </div>
                          <div className="p-card" style={{ padding: mob ? 20 : 24, border: '1px solid #F0EBE5' }}>
                            <Clock size={20} color={ac} style={{ marginBottom: 10 }} />
                            <div className="lxfh" style={{ fontSize: 15 }}>~{s.days} days remaining</div>
                            <div className="lxf" style={{ fontSize: 11, color: '#B5AFA9', marginTop: 4 }}>Typical duration for this phase</div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : null}
            </div>
          )}

          {/* ── SOURCING TAB ── */}
          {tab === 'sourcing' && (
            <div className="fade-in">
              <h2 className="lxfh" style={{ fontSize: mob ? 24 : 32, marginBottom: mob ? 24 : 40 }}>Material Sourcing</h2>
              <div className="p-card" style={{ padding: mob ? 24 : 40, border: '1px solid #F0EBE5' }}>
                <p className="lxf" style={{ color: '#B5AFA9', marginBottom: 32 }}>Review the high-precision materials sourced for your project from our global factory partners.</p>
                <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr', gap: 24 }}>
                  {(props.procurements || []).filter(p => p.clientId === uId).map(p => (
                    <div key={p.id} style={{ border: '1px solid #F0EBE5', borderRadius: 20, overflow: 'hidden' }}>
                      <img src={p.img || 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800'} alt={p.name} style={{ width: '100%', height: 200, objectFit: 'cover' }} />
                      <div style={{ padding: 20 }}>
                        <h4 className="lxfh" style={{ fontSize: 16, marginBottom: 4 }}>{p.name}</h4>
                        <p className="lxf" style={{ fontSize: 12, color: '#B5AFA9', marginBottom: 16 }}>{p.specs}</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <PSBadge s={p.status} />
                          <button onClick={() => props.notify('success', 'Selection confirmed.')} className="p-btn-dark" style={{ height: 32, fontSize: 10, padding: '0 16px' }}>Approve</button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(props.procurements || []).filter(p => p.clientId === uId).length === 0 && (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 60, background: '#F9F7F4', borderRadius: 20 }}>
                      <Package size={48} color="#F0EBE5" style={{ marginBottom: 16 }} />
                      <p style={{ color: '#B5AFA9', fontSize: 13 }}>Sourcing documents are being prepared by the procurement team.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── LOGISTICS TAB ── */}
          {tab === 'logistics' && (
            <div className="fade-in">
              <h2 className="lxfh" style={{ fontSize: mob ? 24 : 32, marginBottom: mob ? 24 : 40 }}>Logistics Tracker</h2>
              {activeProject ? (
                <div className="p-card" style={{ padding: mob ? 24 : 40, border: '1px solid #F0EBE5' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                    {[
                      { id: 4, name: 'China Production', desc: 'Items being built at the factory.' },
                      { id: 5, name: 'Global Shipping', desc: 'Cargo moving via ocean freight to Tema Port.' },
                      { id: 6, name: 'Ghana Site Delivery', desc: 'Materials dispatched to your physical location.' }
                    ].map((s, i) => {
                      const active = activeProject.stage >= s.id;
                      return (
                        <div key={i} style={{ display: 'flex', gap: 24, position: 'relative' }}>
                          <div style={{ width: 40, height: 40, borderRadius: 12, background: active ? ac : '#F9F7F4', color: active ? '#1A1410' : '#B5AFA9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1 }}>
                            {active ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                          </div>
                          <div style={{ flex: 1 }}>
                            <h4 className="lxfh" style={{ fontSize: 16, color: active ? '#1A1410' : '#B5AFA9' }}>{s.name}</h4>
                            <p className="lxf" style={{ fontSize: 12, color: '#B5AFA9' }}>{s.desc}</p>
                          </div>
                          {i < 2 && <div style={{ position: 'absolute', top: 40, left: 20, width: 2, height: 32, background: activeProject.stage > s.id ? ac : '#F9F7F4' }} />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 60, color: '#B5AFA9', background: '#F9F7F4', borderRadius: 24 }}>
                  No active project to track.
                </div>
              )}
            </div>
          )}

          {/* ── DOCUMENTS TAB ── */}
          {tab === 'vault' && (
            <div className="fade-in">
              <h2 className="lxfh" style={{ fontSize: mob ? 24 : 32, marginBottom: mob ? 24 : 40 }}>Technical Vault</h2>
              <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr', gap: mob ? 16 : 32 }}>
                <div className="p-card" style={{ padding: mob ? 24 : 40, border: '1px solid #F0EBE5' }}>
                  <ShieldCheck size={mob ? 24 : 32} color={ac} style={{ marginBottom: 16 }} />
                  <h3 className="lxfh" style={{ fontSize: 18, marginBottom: 8 }}>Material Grades</h3>
                  <p className="lxf" style={{ color: '#B5AFA9', fontSize: 13, marginBottom: 24 }}>Official technical specifications for your site materials.</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[{ l: 'Glass Type', v: '12mm Tempered' }, { l: 'Coating', v: 'Solar Control' }, { l: 'Safety', v: 'BS EN Certified' }].map(x => (
                      <div key={x.l} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F9F7F4', paddingBottom: 10 }}>
                        <span className="lxf" style={{ fontSize: 12, color: '#B5AFA9' }}>{x.l}</span>
                        <span className="lxf" style={{ fontSize: 12, fontWeight: 700 }}>{x.v}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-card" style={{ padding: mob ? 24 : 40, border: '1px solid #F0EBE5' }}>
                  <Download size={mob ? 24 : 32} color={ac} style={{ marginBottom: 16 }} />
                  <h3 className="lxfh" style={{ fontSize: 18, marginBottom: 8 }}>Care Protocol</h3>
                  <p className="lxf" style={{ color: '#B5AFA9', fontSize: 13, marginBottom: 24 }}>Maintenance guidelines for longevity.</p>
                  <button className="p-btn-dark" style={{ width: '100%', height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 12 }}>
                    <Download size={16} /> Download Guides
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── FINANCE TAB ── */}
          {tab === 'finance' && (
            <div className="fade-in">
              <h2 className="lxfh" style={{ fontSize: mob ? 24 : 32, marginBottom: mob ? 24 : 40 }}>Financial Ledger</h2>
              <div className="p-card" style={{ padding: 0, border: '1px solid #F0EBE5', overflowX: mob ? 'auto' : 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: mob ? 500 : 'auto' }}>
                  <thead style={{ background: '#F9F7F4', borderBottom: '1px solid #F0EBE5' }}>
                    <tr>
                      {['Invoice', 'Description', 'Status', 'Amount', 'Action'].map(h => (
                        <th key={h} style={{ padding: mob ? '16px 16px' : '20px 28px', textAlign: h === 'Amount' ? 'right' : h === 'Action' ? 'center' : 'left', fontSize: 9, color: '#B5AFA9', textTransform: 'uppercase', fontWeight: 800 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {myInvoices.map(inv => (
                      <tr key={inv.id} style={{ borderBottom: '1px solid #F9F7F4' }}>
                        <td style={{ padding: mob ? '14px 16px' : '20px 28px' }}>
                          <div style={{ fontSize: 13, fontWeight: 900 }}>REF-{inv.id.slice(-4).toUpperCase()}</div>
                          <div style={{ fontSize: 10, color: '#B5AFA9' }}>{inv.date}</div>
                        </td>
                        <td style={{ padding: mob ? '14px 16px' : '20px 28px' }}>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>{inv.title || 'Installation'}</div>
                        </td>
                        <td style={{ padding: mob ? '14px 16px' : '20px 28px' }}><PSBadge s={inv.status} /></td>
                        <td style={{ padding: mob ? '14px 16px' : '20px 28px', textAlign: 'right', fontSize: 14, fontWeight: 900 }}>{props.formatPrice(inv.amount)}</td>
                        <td style={{ padding: mob ? '14px 16px' : '20px 28px', textAlign: 'center' }}>
                          <button onClick={() => setActiveInvoice(inv)} className="p-btn-light" style={{ padding: '6px 12px', fontSize: 10, borderRadius: 8 }}>View</button>
                        </td>
                      </tr>
                    ))}
                    {myInvoices.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ padding: 60, textAlign: 'center', color: '#B5AFA9', fontSize: 13 }}>No financial transactions to display yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── SUPPORT TAB ── */}
          {tab === 'support' && (
            <div className="fade-in">
              <h2 className="lxfh" style={{ fontSize: mob ? 24 : 32, marginBottom: mob ? 24 : 32 }}>Project Concierge</h2>
              <div className="p-card" style={{ height: mob ? 'calc(100vh - 280px)' : 600, display: 'flex', flexDirection: 'column', border: '1px solid #F0EBE5', overflow: 'hidden' }}>
                <div style={{ padding: mob ? '16px 20px' : '20px 28px', borderBottom: '1px solid #F0EBE5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 className="lxfh" style={{ fontSize: mob ? 14 : 18, margin: 0 }}>Direct Support</h4>
                    <p className="lxf" style={{ fontSize: 9, color: isAgentOnline ? '#16A34A' : '#B5AFA9', fontWeight: 800, margin: 0 }}>{isAgentOnline ? 'AGENT ONLINE' : 'OFFICE HOURS: 8AM–6PM'}</p>
                  </div>
                  <PSBadge s="Secured" />
                </div>
                <div style={{ flex: 1, padding: mob ? 20 : 28, overflowY: 'auto', background: '#F9F7F4', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {myMessages.length > 0 ? myMessages.map((m, i) => {
                    const isMe = m.senderId === uId;
                    return (
                      <div key={i} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', background: isMe ? '#1A1410' : '#fff', color: isMe ? '#fff' : '#1A1410', padding: mob ? '12px 16px' : '14px 18px', borderRadius: 16, maxWidth: '85%', fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: isMe ? 'none' : '1px solid #F0EBE5' }}>
                        {m.text}
                      </div>
                    );
                  }) : (
                    <div style={{ textAlign: 'center', padding: 60, color: '#B5AFA9', fontSize: 13 }} className="lxf">Awaiting your first inquiry.</div>
                  )}
                </div>
                <div style={{ padding: mob ? 16 : 20, borderTop: '1px solid #F0EBE5', display: 'flex', gap: 8 }}>
                  <input
                    ref={msgRef}
                    className="p-inp"
                    placeholder="Type here..."
                    style={{ flex: 1, height: mob ? 48 : 52, borderRadius: 12, fontSize: 13 }}
                    onKeyDown={e => { if (e.key === 'Enter') handleSendMessage(); }}
                  />
                  <button onClick={handleSendMessage} className="p-btn-dark" style={{ width: mob ? 48 : 52, height: mob ? 48 : 52, borderRadius: 12, background: ac, color: '#1A1410', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile bottom nav */}
      {mob && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', borderTop: '1px solid #F0EBE5', display: 'flex', justifyContent: 'space-around', padding: '10px 10px 28px', zIndex: 1000 }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setTab(item.id)} style={{ background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, color: tab === item.id ? '#1A1410' : '#B5AFA9', cursor: 'pointer', transition: 'color 0.2s' }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: tab === item.id ? '#1A1410' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: tab === item.id ? ac : 'inherit' }}>{item.icon}</div>
              <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase' }}>{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Feedback modal */}
      {showFeedback && (
        <div className="overlay-modal" style={{ background: 'rgba(26,20,16,0.95)', zIndex: 6000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="modal-box" style={{ maxWidth: 480, padding: mob ? 32 : 48, textAlign: 'center', borderRadius: mob ? 24 : 40 }}>
            <Star size={mob ? 48 : 64} color={ac} fill={ac} style={{ marginBottom: 24 }} />
            <h2 className="lxfh" style={{ fontSize: mob ? 24 : 28, marginBottom: 12 }}>Rate the Craftsmanship</h2>
            <p className="lxf" style={{ color: '#B5AFA9', marginBottom: 32, fontSize: 14 }}>Your project is complete. Please share your feedback.</p>
            <textarea className="p-inp" style={{ height: 100, borderRadius: 16, marginBottom: 24, padding: 16, fontSize: 13, width: '100%' }} placeholder="Share your experience..." value={feedbackText} onChange={e => setFeedbackText(e.target.value)} />
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowFeedback(false)} className="p-btn-light" style={{ flex: 1, height: 48, borderRadius: 12, fontSize: 12 }}>Skip</button>
              <button onClick={() => { props.notify('success', 'Feedback recorded. Thank you!'); setShowFeedback(false); }} className="p-btn-dark" style={{ flex: 1, height: 48, borderRadius: 12, background: ac, color: '#1A1410', border: 'none', fontSize: 12 }}>Submit</button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice detail modal */}
      {activeInvoice && (
        <div className="overlay-modal" style={{ background: 'rgba(26,20,16,0.95)', zIndex: 6000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="modal-box" style={{ maxWidth: 580, width: '100%', padding: mob ? 32 : 48, borderRadius: mob ? 24 : 40, background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
              <div>
                <h2 className="lxfh" style={{ fontSize: 24, margin: 0 }}>INVOICE</h2>
                <div style={{ fontSize: 12, color: '#B5AFA9' }}>Ref: {activeInvoice.id.toUpperCase()}</div>
              </div>
              <button onClick={() => setActiveInvoice(null)} style={{ background: '#F9F7F4', border: 'none', color: '#1A1410', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ borderTop: '1px solid #F0EBE5', borderBottom: '1px solid #F0EBE5', padding: '20px 0', marginBottom: 28 }}>
              {[{ l: 'Description', v: activeInvoice.title || 'Installation Service' }, { l: 'Date', v: activeInvoice.date }, { l: 'Status', v: activeInvoice.status }].map(r => (
                <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: '#B5AFA9' }}>{r.l}:</span>
                  {r.l === 'Status' ? <PSBadge s={r.v} /> : <span style={{ fontSize: 13, fontWeight: 700 }}>{r.v}</span>}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 36 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Total Amount:</span>
              <span style={{ fontSize: 24, fontWeight: 900, color: '#1A1410' }}>{props.formatPrice(activeInvoice.amount)}</span>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setActiveInvoice(null)} className="p-btn-light" style={{ flex: 1, height: 48, borderRadius: 12 }}>Close</button>
              <button onClick={() => window.print()} className="p-btn-dark" style={{ flex: 1, height: 48, borderRadius: 12, background: ac, color: '#1A1410', border: 'none' }}>Print Invoice</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
