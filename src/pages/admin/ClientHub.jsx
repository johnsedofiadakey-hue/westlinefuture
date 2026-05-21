import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, LayoutDashboard, MessageSquare, FileText, 
  Printer, Plus, Download, Image, Hammer, Sparkles, 
  DollarSign, Truck, PackageCheck, Send, Camera, Info, Trash2,
  Calendar, CheckCircle2, AlertCircle, ShieldCheck, Briefcase, Package,
  ChevronRight, ArrowRight, User, Zap
} from 'lucide-react';
import { PAv, PSBadge, SBadge, FF as PFormField } from '../../components/Shared';
import { PROJECT_STAGES } from '../../data';
import AdminTasks from './AdminTasks';
import AdminProjectGallery from './AdminProjectGallery';
import MaterialSelector from '../../components/MaterialSelector';
import FabricationKanban from './FabricationKanban';
import ProjectProcurement from './ProjectProcurement';
import Button from '../../components/ui/Button';
import '../../components/ui/Input.css';

export default function ClientHub({ clientId, dbClients = [], clients = [], onBack, ...props }) {
  const brand = props.brand || {};
  const ac = brand.color || '#231F78';
  
  const client = dbClients.find(c => c.id === clientId) || dbClients.find(c => c.phone === clientId) || dbClients.find(c => c.email === clientId);
  
  // 🛡️ Identity Hardening: Use normalized identifiers for filtering
  const hId = (client?.phone || client?.id || clientId);
  const myWorkOrders = (props.workOrders || []).filter(wo => {
    const wCId = wo.clientId;
    return wCId === hId || wCId === client?.id || wCId === client?.phone;
  });
  
  const [activeWorkOrderId, setActiveWorkOrderId] = useState(null);
  const [tab, setTab] = useState('status');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (myWorkOrders.length > 0 && !activeWorkOrderId) {
      setActiveWorkOrderId(myWorkOrders[0].id);
    }
  }, [myWorkOrders, activeWorkOrderId]);

  if (!client) return (
    <div style={{ padding: 60, textAlign: 'center', background: '#F4F4FA', borderRadius: 24 }}>
      <AlertCircle size={48} color="#9B99C8" style={{ marginBottom: 16 }} />
      <div className="lxfh" style={{ fontSize: 20, color: '#0D0B2E' }}>Contextual Identifier Not Located</div>
      <p className="lxf" style={{ color: '#9B99C8', marginBottom: 24 }}>Security Layer: The stakeholder identity {clientId} is not resolved.</p>
      <Button onClick={onBack} variant="dark" size="md">Return to Directory</Button>
    </div>
  );

  const activeWorkOrder = myWorkOrders.find(wo => wo.id === activeWorkOrderId) || myWorkOrders[0];
  const myInvoices = (props.invoices || []).filter(i => 
    i.clientId === clientId || 
    i.clientId === client?.id || 
    i.clientId === client?.phone ||
    i.clientEmail === client?.email
  );
  const totalInvoiced = myInvoices.reduce((acc, i) => acc + (parseFloat(String(i.amount).replace(/[^0-9.]/g, '')) || 0), 0);
  const totalPaid = myInvoices.filter(i => i.status === 'Paid').reduce((acc, i) => acc + (parseFloat(String(i.amount).replace(/[^0-9.]/g, '')) || 0), 0);
  
  const hubTabs = [
    { id: 'status', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
    { id: 'production', label: 'Production', icon: <Hammer size={16} /> },
    { id: 'sourcing', label: 'Sourcing Hub', icon: <Package size={16} /> },
    { id: 'logistics', label: 'Logistics', icon: <Truck size={16} /> },
    { id: 'finance', label: 'Payments', icon: <DollarSign size={16} /> },
    { id: 'support', label: 'Secure Support', icon: <MessageSquare size={16} /> },
  ];

  return (
    <div className="client-hub-container fade-in" style={{ padding: '20px 0' }}>
      {/* 1. TOP ACTION BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button onClick={onBack} aria-label="Go back" style={{ width: 44, height: 44, borderRadius: 14, background: '#F4F4FA', border: '1px solid #E8E6F5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
               <ArrowLeft size={18} />
            </button>
            <div>
               <div className="lxfh" style={{ fontSize: 24, fontWeight: 800 }}>{client.name}</div>
               <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 4 }}>
                  <span className="lxf" style={{ fontSize: 11, color: '#9B99C8', fontWeight: 600 }}>ID: {client.id}</span>
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#E8E6F5' }} />
                  <PSBadge s={client.status || 'Active'} />
               </div>
            </div>
         </div>
         <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {hubTabs.map(t => (
               <button 
                 key={t.id} 
                 onClick={() => setTab(t.id)}
                 className="lxf"
                 style={{ 
                   height: 40, padding: '0 16px', borderRadius: 12, 
                   background: tab === t.id ? '#0D0B2E' : '#F4F4FA', 
                   color: tab === t.id ? '#fff' : '#0D0B2E',
                   border: '1px solid #E8E6F5', display: 'flex', alignItems: 'center', gap: 8,
                   fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.3s ease'
                 }}
               >
                  {t.icon} {t.label}
               </button>
            ))}
         </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 40 }}>
         
         {/* MAIN COLUMN */}
         <div>
            {tab === 'status' && (
               <div className="fade-in">
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                      <h3 className="lxfh" style={{ fontSize: 20 }}>Project Evolution</h3>
                      <button 
                        onClick={() => props.createProject({ clientId: client.id, project: 'Santeo project', cat: 'Glass Fabrication', budget: '0', stage: 1 })}
                        className="p-btn-dark" style={{ height: 40, padding: '0 20px', fontSize: 12 }}
                      >
                        <Plus size={16} /> Deploy New Phase
                      </button>
                   </div>
                  
                  {myWorkOrders.length > 0 ? myWorkOrders.map(wo => (
                     <div key={wo.id} className="p-card" style={{ padding: 0, marginBottom: 24, overflow: 'hidden', border: '1px solid #E8E6F5' }}>
                        <div style={{ padding: 32 }}>
                           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                              <div>
                                 <h4 className="lxfh" style={{ fontSize: 18, marginBottom: 4 }}>{wo.title || wo.project}</h4>
                                 <div className="lxf" style={{ fontSize: 11, color: '#9B99C8' }}>Reference: {wo.id.toUpperCase()}</div>
                              </div>
                              <PSBadge s={PROJECT_STAGES.find(s => s.id === wo.stage)?.name || 'Planning'} c={ac} />
                           </div>
                           
                           {/* PROGRESS BAR */}
                           <div style={{ height: 6, background: '#F4F4FA', borderRadius: 3, overflow: 'hidden', marginBottom: 12 }}>
                              <div style={{ height: '100%', width: `${((wo.stage || 1) / 12) * 100}%`, background: ac, transition: 'width 1s ease' }} />
                           </div>
                           <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: '#9B99C8', letterSpacing: 1 }}>
                              <span>Design</span>
                              <span>Fabrication</span>
                              <span>Local Delivery</span>
                           </div>
                        </div>
                        <div style={{ padding: '16px 32px', background: '#F4F4FA', borderTop: '1px solid #E8E6F5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                           <div style={{ display: 'flex', gap: 16 }}>
                              <div className="lxf" style={{ fontSize: 11, color: '#5B5894' }}><Package size={14} style={{ marginBottom: -3, marginRight: 4 }} /> {wo.components || 'Standard'} Components</div>
                           </div>
                           <div style={{ display: 'flex', gap: 12 }}>
                              <Button onClick={() => { setTab('production'); setActiveWorkOrderId(wo.id); }} variant="ghost" size="sm" className="lxf" style={{ gap: 4, fontSize: 11, fontWeight: 800 }}>Manage Steps <ChevronRight size={14} /></Button>
                           </div>
                        </div>
                     </div>
                  )) : (
                     <div style={{ padding: 80, textAlign: 'center', background: '#fff', borderRadius: 32, border: '1px dashed #E8E6F5' }}>
                        <Briefcase size={48} color="#E8E6F5" style={{ marginBottom: 20 }} />
                        <p className="lxf" style={{ color: '#9B99C8' }}>No active requirements deployed for this stakeholder.</p>
                     </div>
                  )}
                  {props.hasMoreWorkOrders && (
                     <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16, marginBottom: 24 }}>
                        <Button 
                           onClick={props.loadMoreWorkOrders}
                           variant="outline"
                           size="sm"
                        >
                           Load More Work Orders
                        </Button>
                     </div>
                  )}
               </div>
            )}

            {tab === 'production' && (
               <div className="fade-in">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                     <h3 className="lxfh" style={{ fontSize: 20 }}>Fabrication & Installation Steps</h3>
                     <div style={{ display: 'flex', gap: 12 }}>
                        {myWorkOrders.map(wo => (
                           <button 
                             key={wo.id}
                             onClick={() => setActiveWorkOrderId(wo.id)}
                             style={{ 
                               padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                               background: activeWorkOrderId === wo.id ? ac : '#fff',
                               color: activeWorkOrderId === wo.id ? '#0D0B2E' : '#9B99C8',
                               border: '1px solid #E8E6F5'
                             }}
                           >
                              {wo.title || wo.project}
                           </button>
                        ))}
                     </div>
                  </div>
                  
                  {activeWorkOrder ? (
                     <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                        <div className="p-card" style={{ padding: 32, border: '1px solid #E8E6F5' }}>
                           <div style={{ position: 'relative', paddingLeft: 40 }}>
                              <div style={{ position: 'absolute', left: 15, top: 0, bottom: 0, width: 2, background: '#E8E6F5' }} />
                              {PROJECT_STAGES.map((s, idx) => {
                                 const isCurrent = (activeWorkOrder.stage || 1) === s.id;
                                 const isPast = (activeWorkOrder.stage || 1) > s.id;
                                 return (
                                    <div key={s.id} style={{ display: 'flex', gap: 20, marginBottom: 24, position: 'relative' }}>
                                       <div 
                                          onClick={() => props.updateStage && props.updateStage(activeWorkOrder.id, s.id)}
                                          style={{ 
                                             position: 'absolute', left: -40, width: 32, height: 32, borderRadius: '50%', 
                                             background: isPast ? s.color : '#fff',
                                             border: isPast ? `2px solid ${s.color}` : isCurrent ? `2px solid ${s.color}` : '2px solid #E4E3F0',
                                             display: 'flex', alignItems: 'center', justifyContent: 'center',
                                             zIndex: 2, cursor: 'pointer', transition: 'all .3s'
                                          }}
                                       >
                                          {isPast ? <CheckCircle2 size={16} color="#fff" /> : <div style={{ width: 8, height: 8, borderRadius: '50%', background: isCurrent ? s.color : '#E4E3F0' }} />}
                                       </div>
                                       <div style={{ flex: 1 }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                             <div className="lxf" style={{ fontSize: 15, fontWeight: isCurrent ? 800 : 500, color: isCurrent ? '#0D0B2E' : '#9B99C8' }}>{s.name}</div>
                                             {isCurrent && <Button onClick={() => props.updateStage(activeWorkOrder.id, s.id + 1)} variant="primary" size="sm">Complete Stage</Button>}
                                          </div>
                                       </div>
                                    </div>
                                 );
                              })}
                           </div>
                        </div>
                        <AdminTasks projectId={activeWorkOrderId} projectTitle={activeWorkOrder.project} {...props} brand={brand} />
                     </div>
                  ) : (
                     <div style={{ padding: 40, textAlign: 'center', background: '#fff', borderRadius: 24, border: '1px dashed #E8E6F5' }}>
                        Select a project to manage production steps.
                     </div>
                  )}
               </div>
            )}

            {tab === 'logistics' && (
               <div className="fade-in">
                  <h3 className="lxfh" style={{ fontSize: 20, marginBottom: 24 }}>Logistics & Shipping</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                     {(props.containers || []).filter(c => c.items?.some(woId => myWorkOrders.some(mwo => mwo.id === woId))).map(c => (
                        <div key={c.id} className="p-card" style={{ padding: 32, border: '1px solid #E8E6F5' }}>
                           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                              <div>
                                 <div style={{ fontSize: 10, fontWeight: 800, color: '#9B99C8', textTransform: 'uppercase' }}>Shipment Reference</div>
                                 <div className="lxfh" style={{ fontSize: 18 }}>{c.shipmentRef}</div>
                              </div>
                              <PSBadge s={c.status} />
                           </div>
                           <div style={{ display: 'flex', justifyContent: 'space-between', background: '#F4F4FA', padding: 20, borderRadius: 16 }}>
                              <div>
                                 <div style={{ fontSize: 10, color: '#9B99C8', textTransform: 'uppercase' }}>ETA</div>
                                 <div style={{ fontSize: 14, fontWeight: 800 }}>{c.eta}</div>
                              </div>
                              <div>
                                 <div style={{ fontSize: 10, color: '#9B99C8', textTransform: 'uppercase', textAlign: 'right' }}>Vessel</div>
                                 <div style={{ fontSize: 14, fontWeight: 800, textAlign: 'right' }}>{c.vessel || 'TBD'}</div>
                              </div>
                           </div>
                        </div>
                     ))}
                     {(!props.containers || props.containers.filter(c => c.items?.some(woId => myWorkOrders.some(mwo => mwo.id === woId))).length === 0) && (
                        <div style={{ padding: 60, textAlign: 'center', background: '#fff', borderRadius: 32, border: '1px dashed #E8E6F5' }}>
                           <Truck size={40} color="#E8E6F5" style={{ marginBottom: 16 }} />
                           <p style={{ color: '#9B99C8' }}>No active shipments linked to this stakeholder.</p>
                        </div>
                     )}
                  </div>
               </div>
            )}

            {tab === 'support' && (
               <div className="fade-in p-card" style={{ height: 600, display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #E8E6F5' }}>
                  <div style={{ padding: '24px 32px', borderBottom: '1px solid #E8E6F5', background: '#fff' }}>
                     <h3 className="lxfh" style={{ fontSize: 18 }}>Secure Support Session</h3>
                     <p className="lxf" style={{ fontSize: 11, color: '#16A34A', fontWeight: 800, marginTop: 4 }}>ENC-256 LAYER ACTIVE</p>
                  </div>
                  <div style={{ flex: 1, padding: 32, overflowY: 'auto', background: '#F8F8FD', display: 'flex', flexDirection: 'column', gap: 16 }}>
                     {props.hasMoreMessages && (
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                           <Button 
                              onClick={props.loadMoreMessages}
                              variant="outline"
                              size="sm"
                           >
                              Load Older Messages
                           </Button>
                        </div>
                     )}
                     {(props.messages || []).filter(m => 
                        m.senderId === hId || m.receiverId === hId || 
                        m.senderId === client?.id || m.receiverId === client?.id ||
                        m.senderId === client?.phone || m.receiverId === client?.phone
                     ).sort((a,b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)).map((m, i) => {
                        const isMe = m.senderId === 'admin';
                        return (
                           <div key={i} style={{ 
                             alignSelf: isMe ? 'flex-end' : 'flex-start',
                             background: isMe ? '#0D0B2E' : '#fff',
                             color: isMe ? '#fff' : '#0D0B2E',
                             padding: '14px 20px', borderRadius: 20,
                             maxWidth: '70%', fontSize: 14,
                             boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                             border: isMe ? 'none' : '1px solid #E8E6F5'
                           }}>
                              {m.text}
                           </div>
                        );
                     })}
                  </div>
                  <div style={{ padding: 24, background: '#fff', borderTop: '1px solid #E8E6F5', display: 'flex', gap: 12 }}>
                     <input 
                       id="hubMsgInp" 
                       className="input-field" 
                       placeholder="Send secure message..." 
                       style={{ flex: 1 }}
                       onKeyDown={e => { if (e.key === 'Enter' && e.target.value) { props.sendMessage(e.target.value, 'admin', client.id); e.target.value = ''; } }}
                     />
                     <button onClick={() => { const inp = document.getElementById('hubMsgInp'); if (inp.value) { props.sendMessage(inp.value, 'admin', client.id); inp.value = ''; } }} aria-label="Send message" className="p-btn-dark" style={{ width: 56, height: 56, borderRadius: 16, background: ac, color: '#0D0B2E', border: 'none' }}>
                        <Send size={20} />
                     </button>
                  </div>
               </div>
            )}

            {tab === 'sourcing' && (
               <div className="fade-in">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                     <h3 className="lxfh" style={{ fontSize: 20 }}>Sourcing & Procurement</h3>
                     <button 
                       onClick={() => props.addSourcingItem({ clientId: client.id, status: 'Pending', name: 'New Component' })}
                       className="p-btn-dark" style={{ height: 40, padding: '0 20px', fontSize: 12 }}
                     >
                        <Plus size={16} /> Add Sourcing Item
                     </button>
                  </div>
                  <div className="p-card" style={{ padding: 32, border: '1px solid #E8E6F5' }}>
                     <p className="lxf" style={{ color: '#9B99C8', marginBottom: 32 }}>Manage factory orders, material selection, and China logistics here.</p>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {(props.procurements || []).filter(p => p.clientId === client.id).map(p => (
                           <div key={p.id} style={{ padding: 24, border: '1px solid #E8E6F5', borderRadius: 16, display: 'flex', justifyContent: 'space-between' }}>
                              <div>
                                 <div className="lxfh" style={{ fontSize: 16 }}>{p.name}</div>
                                 <div className="lxf" style={{ fontSize: 12, color: '#9B99C8' }}>{p.specs}</div>
                                 <PSBadge s={p.status} />
                              </div>
                              <div style={{ display: 'flex', gap: 12 }}>
                                 {p.img && <img src={p.img} style={{ width: 60, height: 60, borderRadius: 12, objectFit: 'cover' }} />}
                                 <Button variant="secondary" size="sm">Share with Client</Button>
                              </div>
                           </div>
                        ))}
                        {(!props.procurements || props.procurements.filter(p => p.clientId === client.id).length === 0) && (
                           <div style={{ textAlign: 'center', padding: 40, border: '1px dashed #E8E6F5', borderRadius: 16 }}>
                              <Package size={32} color="#E8E6F5" style={{ marginBottom: 16 }} />
                              <p style={{ color: '#9B99C8', fontSize: 13 }}>No items in procurement pipeline.</p>
                           </div>
                        )}
                     </div>
                  </div>
               </div>
            )}

            {tab === 'finance' && (
               <div className="fade-in">
                  <h3 className="lxfh" style={{ fontSize: 20, marginBottom: 24 }}>Payments & Invoices</h3>
                  <div className="p-card" style={{ padding: 0, border: '1px solid #E8E6F5' }}>
                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#F4F4FA', borderBottom: '1px solid #E8E6F5' }}>
                           <tr>
                              <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: 10, color: '#9B99C8', textTransform: 'uppercase' }}>Reference</th>
                              <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: 10, color: '#9B99C8', textTransform: 'uppercase' }}>Status</th>
                              <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: 10, color: '#9B99C8', textTransform: 'uppercase' }}>Amount</th>
                           </tr>
                        </thead>
                        <tbody>
                           {myInvoices.map(inv => (
                              <tr key={inv.id} style={{ borderBottom: '1px solid #F4F4FA' }}>
                                 <td style={{ padding: '20px 24px' }}>
                                    <div style={{ fontSize: 14, fontWeight: 800 }}>INV-{inv.id.slice(-4).toUpperCase()}</div>
                                    <div style={{ fontSize: 11, color: '#9B99C8' }}>{inv.date}</div>
                                 </td>
                                 <td style={{ padding: '20px 24px' }}>
                                    <PSBadge s={inv.status} />
                                 </td>
                                 <td style={{ padding: '20px 24px', textAlign: 'right', fontWeight: 900 }}>{props.formatPrice(inv.amount)}</td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
                  {props.hasMoreInvoices && (
                     <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                        <Button 
                           onClick={props.loadMoreInvoices}
                           variant="outline"
                           size="sm"
                        >
                           Load More Invoices
                        </Button>
                     </div>
                  )}
               </div>
            )}
         </div>

         {/* SIDEBAR */}
         <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            <div className="p-card" style={{ padding: 32, background: '#0D0B2E', color: '#fff', borderRadius: 32 }}>
               <h4 className="lxfh" style={{ fontSize: 18, marginBottom: 24, color: ac }}>Financial Ledger</h4>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                     <span className="lxf" style={{ opacity: 0.6, fontSize: 13 }}>Invoiced to Date</span>
                     <span className="lxfh" style={{ fontSize: 18 }}>{props.formatPrice(totalInvoiced)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                     <span className="lxf" style={{ opacity: 0.6, fontSize: 13 }}>Verified Payments</span>
                     <span className="lxfh" style={{ fontSize: 18, color: '#16A34A' }}>{props.formatPrice(totalPaid)}</span>
                  </div>
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '8px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                     <span className="lxf" style={{ opacity: 0.6, fontSize: 13, fontWeight: 800 }}>Balance Due</span>
                     <span className="lxfh" style={{ fontSize: 22, color: ac }}>{props.formatPrice(totalInvoiced - totalPaid)}</span>
                  </div>
               </div>
            </div>

            <div className="p-card" style={{ padding: 32, border: '1px solid #E8E6F5' }}>
               <h4 className="lxfh" style={{ fontSize: 18, marginBottom: 24 }}>System Identity</h4>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                     <span style={{ color: '#9B99C8' }}>Primary ID</span>
                     <span style={{ fontWeight: 800 }}>{client.id}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                     <span style={{ color: '#9B99C8' }}>Verified Phone</span>
                     <span style={{ fontWeight: 800 }}>{client.phone}</span>
                  </div>
               </div>
               <Button onClick={() => alert("Credentials sent.")} variant="dark" size="md" style={{ width: '100%', marginTop: 24 }}>Sync Portal Access</Button>
            </div>
         </div>
      </div>
    </div>
  );
}
