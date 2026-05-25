import React, { useState } from 'react';
import { Search, ArrowLeft, Check, Plus, Camera, FileText, DollarSign, ArrowRight, MessageCircle, HardHat, UserCheck, UserX } from 'lucide-react';
import { PSBadge, SBadge, FF as PFormField } from '../../components/Shared';
import { PROJECT_STAGES } from '../../data';
import AdminTasks from './AdminTasks';
import AdminProcurement from './AdminProcurement';
import AdminProjectGallery from './AdminProjectGallery';
import AdminGovernance from './AdminGovernance';

export default function AdminInstallations({ clients = [], updateProject, dbClients, brand, transactions = [], recordOfflinePayment, calculateProjectPulse, teamMembers = [], assignWorkerToProject, ...props }) {
  const ac = brand.color || `var(--accent-secondary)`;
  const [search, setSearch] = useState('');
  const [sel, setSel] = useState(null);
  const [showManual, setShowManual] = useState(false);
  const [manData, setManData] = useState({ amount: '', method: 'Bank Transfer', ref: '' });

  const [manErr, setManErr] = useState('');
  const [manSaving, setManSaving] = useState(false);
  const handleManual = async () => {
    if (!manData.amount) { setManErr('Amount is required'); return; }
    setManErr('');
    setManSaving(true);
    try {
      await recordOfflinePayment(sel, manData.amount, manData.method, manData.ref);
      setShowManual(false);
      setManData({ amount: '', method: 'Bank Transfer', ref: '' });
    } finally {
      setManSaving(false);
    }
  };
  const filtered = (clients || []).filter(c => (c.project || '').toLowerCase().includes(search.toLowerCase()));

  if (sel) {
    const proj = clients.find(x => x.id === sel);
    if (!proj) return <div className="lxf" style={{ padding: 40, textAlign: 'center' }}>Project data missing. <button onClick={() => setSel(null)}>Back</button></div>;
    
    const paidAmount = (props.invoices || []).filter(i => i.parentId === sel && i.status === 'Paid').reduce((a, b) => a + (parseFloat(String(b.amount || 0).replace(/[$,]/g, '')) || 0), 0);
    const totalBudget = parseFloat(String(proj.budget || 0).replace(/[$,]/g, '')) || 0;
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button onClick={() => setSel(null)} className="p-btn-light" style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ArrowLeft size={18} /></button>
            <div>
              <h2 className="lxfh" style={{ fontSize: 24, fontWeight: 400 }}>{proj.project}</h2>
              <div className="lxf" style={{ fontSize: 13, color: `var(--text-secondary)` }}>{proj.cat || 'Full Interior Finishing'} • {proj.name}</div>
            </div>
          </div>
          <div style={{ textAlign: 'right', display: 'flex', gap: 24 }}>
            <div>
              <div className="lxf" style={{ fontSize: 10, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.15em' }}>Fabrication Progress</div>
              <div className="lxfh" style={{ fontSize: 18, color: `var(--text-secondary)`, textAlign: 'right' }}>{proj.progress || 0}%</div>
            </div>
            <div style={{ paddingLeft: 24, borderLeft: '1px solid var(--border-color)' }}>
              <div className="lxf" style={{ fontSize: 10, color: ac, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.15em' }}>Overall Project Pulse</div>
              <div className="lxfh" style={{ fontSize: 24, color: ac, textAlign: 'right' }}>{calculateProjectPulse(proj.id)}%</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: 32, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            
            {/* TIMELINE EDITOR */}
            <div className="p-card" style={{ padding: 24 }}>
              <h3 className="lxfh" style={{ fontSize: 18, marginBottom: 24 }}>Project Journey</h3>
              <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                <div style={{ position: 'absolute', left: 15, top: 0, bottom: 0, width: 2, background: `var(--border-color)` }} />
                
                {PROJECT_STAGES.map((s, idx) => {
                  const isCurrent = (proj.stage || 1) === s.id;
                  const isPast = (proj.stage || 1) > s.id;
                  const isLast = idx === PROJECT_STAGES.length - 1;
                  
                  return (
                    <div key={s.id} style={{ display: 'flex', gap: 20, marginBottom: isLast ? 0 : 32, position: 'relative' }}>
                      <div 
                        onClick={() => props.updateStage && props.updateStage(proj.id, s.id)}
                        style={{ 
                          width: 32, height: 32, borderRadius: '50%', 
                          background: isPast ? s.color : isCurrent ? '#fff' : '#fff',
                          border: isPast ? `2px solid ${s.color}` : isCurrent ? `2px solid ${s.color}` : '2px solid #DFD9D1',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          zIndex: 2, cursor: 'pointer', transition: 'all .3s'
                        }}
                      >
                        {isPast ? <Check size={16} color="#fff" strokeWidth={3} /> : <div style={{ width: 8, height: 8, borderRadius: '50%', background: isCurrent ? s.color : '#DFD9D1' }} />}
                      </div>

                      <div style={{ flex: 1, paddingTop: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div className="lxf" style={{ fontSize: 15, fontWeight: isCurrent ? 700 : 500, color: isCurrent ? `var(--accent-secondary)` : isPast ? `var(--text-secondary)` : `var(--text-secondary)`, display: 'flex', alignItems: 'center', gap: 8 }}>
                               {s.name}
                               {s.requiresPayment && <span style={{ fontSize: 9, background: 'rgba(239,68,68,0.1)', color: '#EF4444', padding: '2px 6px', borderRadius: 4, fontWeight: 800 }}>PAYMENT GATE</span>}
                               {s.requiresApproval && <span style={{ fontSize: 9, background: 'rgba(33,150,243,0.1)', color: '#2196F3', padding: '2px 6px', borderRadius: 4, fontWeight: 800 }}>APPROVAL GATE</span>}
                            </div>
                            {isCurrent && <div className="lxf" style={{ fontSize: 12, color: `var(--text-secondary)`, marginTop: 4 }}>Active stage • Estimated {s.days} days remaining</div>}
                          </div>
                          {isCurrent && (
                            <div style={{ display: 'flex', gap: 8 }}>
                               <button onClick={() => props.updateStage && props.updateStage(proj.id, s.id + 1)} className="p-btn-gold" style={{ padding: '6px 12px', fontSize: 11 }}>Next Stage</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* TASKS & PROCUREMENT */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
               <div id="admin-tasks"><AdminTasks projectId={sel} projectTitle={proj.project} {...props} brand={brand} /></div>
               <AdminProcurement projectId={sel} procurements={props.procurements} createProcurement={props.createProcurement} updateProcurement={props.updateProcurement} deleteProcurement={props.deleteProcurement} brand={brand} />
            </div>

            <div id="admin-gallery"><AdminProjectGallery projectId={sel} media={props.media} uploadMedia={props.uploadMedia} deleteMedia={props.deleteMedia} ac={ac} /></div>

            <div id="admin-gov"><AdminGovernance projectId={sel} {...props} brand={brand} /></div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* FIELD QA REPORT */}
            {proj.fieldQAReport && (
              <div className="p-card" style={{ padding: 24 }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <Camera size={16} color={ac} />
                    <h3 className="lxfh" style={{ fontSize: 16 }}>Field QA Report</h3>
                 </div>
                 {proj.fieldQAReport.photoUrl && (
                   <img src={proj.fieldQAReport.photoUrl} alt="QA" style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 12, marginBottom: 12 }} />
                 )}
                 <div style={{ fontSize: 12, color: `var(--text-secondary)`, marginBottom: 4 }}>
                   <strong>Verified By:</strong> {proj.fieldQAReport.workerName || 'Worker'}
                 </div>
                 <div style={{ fontSize: 12, color: `var(--text-secondary)` }}>
                   <strong>Distance from Site:</strong> {Math.round(proj.fieldQAReport.siteDistanceMeters || 0)}m {proj.fieldQAReport.devBypassed ? '(Bypassed)' : ''}
                 </div>
              </div>
            )}

            {/* FINANCIAL AUDIT LEDGER */}
            <div className="p-card" style={{ padding: 24 }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h3 className="lxfh" style={{ fontSize: 18 }}>Project Ledger</h3>
                  <button onClick={() => setShowManual(true)} className="lxf" style={{ fontSize: 11, background: 'none', border: 'none', color: ac, fontWeight: 700, cursor: 'pointer' }}>+ Record External</button>
               </div>
               
               <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="lxf" style={{ fontSize: 10, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.05em' }}>Transactions</div>
                  {(transactions || []).filter(t => t.parentId === sel).map(t => (
                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: `var(--bg-secondary)`, borderRadius: 8, borderLeft: `3px solid ${ac}` }}>
                       <div>
                          <div className="lxf" style={{ fontSize: 12, fontWeight: 700 }}>${parseFloat(t.amount).toLocaleString()}</div>
                          <div className="lxf" style={{ fontSize: 10, color: `var(--text-secondary)` }}>{t.date} via {t.method}</div>
                       </div>
                       <SBadge s="VERIFIED" />
                    </div>
                  ))}
                  {(transactions || []).filter(t => t.parentId === sel).length === 0 && <div className="lxf" style={{ fontSize: 11, color: `var(--text-secondary)`, fontStyle: 'italic' }}>No transactions recorded.</div>}
               </div>

               <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(0,0,0,.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span className="lxf" style={{ fontSize: 13, color: `var(--text-secondary)` }}>Total Verified</span>
                    <span className="lxf" style={{ fontSize: 14, fontWeight: 700, color: '#16A34A' }}>${(transactions || []).filter(t => t.parentId === sel).reduce((a, b) => a + (parseFloat(String(b.amount || '0').replace(/[^0-9.]/g, '')) || 0), 0).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="lxf" style={{ fontSize: 13, color: `var(--text-secondary)` }}>Remaining Balance</span>
                    <span className="lxf" style={{ fontSize: 14, fontWeight: 700, color: '#ff4444' }}>${(totalBudget - (transactions || []).filter(t => t.parentId === sel).reduce((a, b) => a + (parseFloat(String(b.amount || '0').replace(/[^0-9.]/g, '')) || 0), 0)).toLocaleString()}</span>
                  </div>
               </div>
            </div>

            {/* FIELD CREW ASSIGNMENT */}
            {(() => {
              const fieldWorkers = (teamMembers || []).filter(m => m.role === 'worker' || m.jobRole === 'Field Worker');
              const assignedWorkers = proj.assignedWorkers || [];
              if (fieldWorkers.length === 0) return null;
              return (
                <div className="p-card" style={{ padding: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <HardHat size={16} color={ac} />
                    <h3 className="lxfh" style={{ fontSize: 16 }}>Field Crew</h3>
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: `var(--text-secondary)` }}>{assignedWorkers.length} assigned</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {fieldWorkers.map(w => {
                      const isAssigned = assignedWorkers.includes(w.id) || assignedWorkers.includes(w.uid);
                      const wId = w.uid || w.id;
                      return (
                        <button
                          key={w.id}
                          onClick={() => assignWorkerToProject && assignWorkerToProject(sel, wId)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 12px', borderRadius: 10,
                            background: isAssigned ? '#F0FDF4' : `var(--bg-secondary)`,
                            border: `1.5px solid ${isAssigned ? '#BBF7D0' : `var(--border-color)`}`,
                            cursor: 'pointer', width: '100%', textAlign: 'left'
                          }}
                        >
                          <div style={{ width: 32, height: 32, borderRadius: 10, background: isAssigned ? '#16A34A' : '#E5E0D8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {isAssigned ? <UserCheck size={14} color="#fff" /> : <UserX size={14} color="#9A948E" />}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: isAssigned ? '#15803D' : `var(--accent-secondary)`, marginBottom: 1 }}>{w.name}</div>
                            <div style={{ fontSize: 10, color: `var(--text-secondary)` }}>{w.jobRole || 'Field Worker'}</div>
                          </div>
                          <div style={{ fontSize: 10, fontWeight: 800, color: isAssigned ? '#16A34A' : `var(--text-secondary)`, textTransform: 'uppercase' }}>
                            {isAssigned ? 'On crew' : 'Add'}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* QUICK ACTIONS */}
            <div className="p-card" style={{ padding: 24, background: ac, color: '#fff' }}>
               <h3 className="lxfh" style={{ fontSize: 16, marginBottom: 16, color: '#fff' }}>Quick Actions</h3>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button onClick={() => document.getElementById('admin-tasks')?.scrollIntoView({behavior: 'smooth'})} className="glass-btn" style={{ fontSize: 11, padding: '10px 0', borderColor: 'rgba(255,255,255,.2)', color: '#fff', cursor: 'pointer' }}><Plus size={14} /> Task</button>
                  <button onClick={() => document.getElementById('admin-gallery')?.scrollIntoView({behavior: 'smooth'})} className="glass-btn" style={{ fontSize: 11, padding: '10px 0', borderColor: 'rgba(255,255,255,.2)', color: '#fff', cursor: 'pointer' }}><Camera size={14} /> Photo</button>
                  <button onClick={() => document.getElementById('admin-gov')?.scrollIntoView({behavior: 'smooth'})} className="glass-btn" style={{ fontSize: 11, padding: '10px 0', borderColor: 'rgba(255,255,255,.2)', color: '#fff', cursor: 'pointer' }}><FileText size={14} /> Approval</button>
                  <button onClick={() => setShowManual(true)} className="glass-btn" style={{ fontSize: 11, padding: '10px 0', borderColor: 'rgba(255,255,255,.2)', color: '#fff', cursor: 'pointer' }}><DollarSign size={14} /> Invoice</button>
               </div>
            </div>
          </div>
        </div>

        {/* MANUAL PAYMENT MODAL */}
        {showManual && (
          <div className="overlay-modal" onClick={() => setShowManual(false)}>
             <div className="modal-box lxf" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
                <h3 className="lxfh" style={{ fontSize: 22, marginBottom: 8 }}>Record External Payment</h3>
                <p style={{ fontSize: 13, color: `var(--text-secondary)`, marginBottom: 24 }}>Manually add a payment for audit purposes (Cash, Bank Trace, etc).</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                   {manErr && <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: 8, color: '#DC2626', fontSize: 12 }}>{manErr}</div>}
                   <PFormField label="Amount ($)"><input className="p-inp" type="number" value={manData.amount} onChange={e => setManData({...manData, amount: e.target.value})} /></PFormField>
                   <PFormField label="Method">
                      <select className="p-inp" value={manData.method} onChange={e => setManData({...manData, method: e.target.value})}>
                         <option value="Bank Transfer">Bank Transfer</option>
                         <option value="Cash">Cash</option>
                         <option value="Cheque">Cheque</option>
                         <option value="Mobile Money">Mobile Money</option>
                      </select>
                   </PFormField>
                   <PFormField label="Reference / Note"><input className="p-inp" value={manData.ref} onChange={e => setManData({...manData, ref: e.target.value})} placeholder="e.g. TR-9921 / Site Cash" /></PFormField>
                   <button onClick={handleManual} disabled={manSaving} className="p-btn-dark" style={{ padding: 14, marginTop: 10, opacity: manSaving ? 0.6 : 1, cursor: manSaving ? 'wait' : 'pointer' }}>{manSaving ? 'Saving…' : 'Confirm & Log Transaction'}</button>
                </div>
             </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="lxfh" style={{ fontSize: 32, fontWeight: 400 }}>Fabrication & Installations</h2>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: `var(--text-secondary)` }} />
          <input className="p-inp" placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 34, width: 240 }} />
        </div>
      </div>
      
      <div className="ops-grid" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', 
        gap: 24 
      }}>
        {filtered.map(c => {
          const currentStageObj = PROJECT_STAGES.find(s => s.id === (c.stage || 1));
          return (
            <div key={c.id} className="p-card fade-in" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                     <div className="lxf" style={{ fontSize: 10, color: ac, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>{c.cat || 'Full Interior'}</div>
                     <div className="lxfh" style={{ fontSize: 18, fontWeight: 700 }}>{c.project}</div>
                     <div className="lxf" style={{ fontSize: 12, color: `var(--text-secondary)`, marginTop: 3 }}>{c.name}</div>
                  </div>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `var(--bg-secondary)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <PSBadge s={currentStageObj?.name || 'Order Confirmed'} />
                  </div>
               </div>

               <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 11, fontWeight: 700 }}>
                     <span style={{ color: `var(--text-secondary)` }}>PROGRESS</span>
                     <span>{c.progress || 0}%</span>
                  </div>
                  <div className="prog" style={{ height: 6, width: '100%', background: `var(--border-color)` }}>
                     <div className="prog-f" style={{ width: `${c.progress || 0}%`, background: ac }} />
                  </div>
               </div>

               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '1px solid var(--bg-secondary)' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                     <button 
                        onClick={() => props.sendWhatsAppUpdate(c.id, c.id, currentStageObj?.name || 'New Stage')}
                        className="p-btn-light" 
                        style={{ height: 36, width: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: ac }}
                        title="Notify Client"
                     >
                        <MessageCircle size={16} />
                     </button>
                  </div>
                  <button 
                     onClick={() => setSel(c.id)} 
                     className="lxf" 
                     style={{ 
                        background: 'none', 
                        border: 'none', 
                        color: `var(--accent-secondary)`, 
                        fontWeight: 700, 
                        fontSize: 12, 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                     }}
                  >
                     Manage Operations <ArrowRight size={14} />
                  </button>
               </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
