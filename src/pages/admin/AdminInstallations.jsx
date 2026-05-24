import React, { useState } from 'react';
import { Search, ArrowLeft, Check, Plus, Camera, FileText, DollarSign, ArrowRight, MessageCircle, HardHat, UserCheck, UserX } from 'lucide-react';
import { PSBadge, SBadge, FF as PFormField } from '../../components/Shared';
import { PROJECT_STAGES } from '../../data';
import AdminTasks from './AdminTasks';
import AdminProcurement from './AdminProcurement';
import AdminProjectGallery from './AdminProjectGallery';
import AdminGovernance from './AdminGovernance';

export default function AdminInstallations({ clients = [], updateProject, dbClients, brand, transactions = [], recordOfflinePayment, calculateProjectPulse, teamMembers = [], assignWorkerToProject, ...props }) {
  const ac = brand.color || '#231F78';
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('active-field');
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
  const projectName = (project) => project.project || project.title || 'Untitled project';
  const clientName = (project) => project.name || project.clientName || 'Unknown client';
  const projectStageId = (project) => project.stageId || project.stage || 1;
  const isFieldStage = (project) => [7, 8, 9].includes(projectStageId(project)) || (project.assignedWorkers || []).length > 0;
  const filtered = (clients || []).filter(c => {
    const haystack = [projectName(c), clientName(c), c.location, c.nextAction, c.status].filter(Boolean).join(' ').toLowerCase();
    if (search && !haystack.includes(search.toLowerCase())) return false;
    if (stageFilter === 'active-field') return isFieldStage(c);
    if (stageFilter === 'delivery') return projectStageId(c) === 7;
    if (stageFilter === 'installation') return projectStageId(c) === 8;
    if (stageFilter === 'inspection') return projectStageId(c) === 9;
    if (stageFilter === 'assigned') return (c.assignedWorkers || []).length > 0;
    return true;
  });
  const deliveryCount = (clients || []).filter(c => projectStageId(c) === 7).length;
  const installationCount = (clients || []).filter(c => projectStageId(c) === 8).length;
  const inspectionCount = (clients || []).filter(c => projectStageId(c) === 9).length;
  const crewAssignedCount = (clients || []).filter(c => (c.assignedWorkers || []).length > 0).length;

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
              <h2 className="lxfh" style={{ fontSize: 24, fontWeight: 400 }}>{projectName(proj)}</h2>
              <div className="lxf" style={{ fontSize: 13, color: '#9B99C8' }}>{proj.cat || 'Full Interior Finishing'} • {clientName(proj)}</div>
            </div>
          </div>
          <div style={{ textAlign: 'right', display: 'flex', gap: 24 }}>
            <div>
              <div className="lxf" style={{ fontSize: 10, color: '#9B99C8', textTransform: 'uppercase', letterSpacing: '.15em' }}>Field Progress</div>
              <div className="lxfh" style={{ fontSize: 18, color: '#5B5894', textAlign: 'right' }}>{proj.progress || 0}%</div>
            </div>
            <div style={{ paddingLeft: 24, borderLeft: '1px solid #E8E6F5' }}>
              <div className="lxf" style={{ fontSize: 10, color: ac, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.15em' }}>Overall Project Pulse</div>
              <div className="lxfh" style={{ fontSize: 24, color: ac, textAlign: 'right' }}>{calculateProjectPulse(proj.id)}%</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: 32, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            
            {/* TIMELINE EDITOR */}
            <div className="p-card" style={{ padding: 24 }}>
              <h3 className="lxfh" style={{ fontSize: 18, marginBottom: 24 }}>Field Stage Control</h3>
              <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                <div style={{ position: 'absolute', left: 15, top: 0, bottom: 0, width: 2, background: '#E8E6F5' }} />
                
                {PROJECT_STAGES.map((s, idx) => {
                  const currentStageId = projectStageId(proj);
                  const isCurrent = currentStageId === s.id;
                  const isPast = currentStageId > s.id;
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
                            <div className="lxf" style={{ fontSize: 15, fontWeight: isCurrent ? 700 : 500, color: isCurrent ? '#0D0B2E' : isPast ? '#5B5894' : '#9B99C8', display: 'flex', alignItems: 'center', gap: 8 }}>
                               {s.name}
                               {s.requiresPayment && <span style={{ fontSize: 9, background: 'rgba(239,68,68,0.1)', color: '#EF4444', padding: '2px 6px', borderRadius: 4, fontWeight: 800 }}>PAYMENT GATE</span>}
                               {s.requiresApproval && <span style={{ fontSize: 9, background: 'rgba(33,150,243,0.1)', color: '#2196F3', padding: '2px 6px', borderRadius: 4, fontWeight: 800 }}>APPROVAL GATE</span>}
                            </div>
                            {isCurrent && <div className="lxf" style={{ fontSize: 12, color: '#9B99C8', marginTop: 4 }}>Active stage • Estimated {s.days} days remaining</div>}
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
               <AdminTasks projectId={sel} projectTitle={proj.project} {...props} brand={brand} />
               <AdminProcurement projectId={sel} procurements={props.procurements} createProcurement={props.createProcurement} updateProcurement={props.updateProcurement} deleteProcurement={props.deleteProcurement} brand={brand} />
            </div>

            <AdminProjectGallery projectId={sel} media={props.media} uploadMedia={props.uploadMedia} deleteMedia={props.deleteMedia} ac={ac} />

            <AdminGovernance projectId={sel} {...props} brand={brand} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* FINANCIAL AUDIT LEDGER */}
            <div className="p-card" style={{ padding: 24 }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h3 className="lxfh" style={{ fontSize: 18 }}>Project Ledger</h3>
                  <button onClick={() => setShowManual(true)} className="lxf" style={{ fontSize: 11, background: 'none', border: 'none', color: ac, fontWeight: 700, cursor: 'pointer' }}>+ Record External</button>
               </div>
               
               <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="lxf" style={{ fontSize: 10, color: '#9B99C8', textTransform: 'uppercase', letterSpacing: '.05em' }}>Transactions</div>
                  {(transactions || []).filter(t => t.parentId === sel).map(t => (
                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#F8F8FD', borderRadius: 8, borderLeft: `3px solid ${ac}` }}>
                       <div>
                          <div className="lxf" style={{ fontSize: 12, fontWeight: 700 }}>${parseFloat(t.amount).toLocaleString()}</div>
                          <div className="lxf" style={{ fontSize: 10, color: '#9B99C8' }}>{t.date} via {t.method}</div>
                       </div>
                       <SBadge s="VERIFIED" />
                    </div>
                  ))}
                  {(transactions || []).filter(t => t.parentId === sel).length === 0 && <div className="lxf" style={{ fontSize: 11, color: '#9B99C8', fontStyle: 'italic' }}>No transactions recorded.</div>}
               </div>

               <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(0,0,0,.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span className="lxf" style={{ fontSize: 13, color: '#9B99C8' }}>Total Verified</span>
                    <span className="lxf" style={{ fontSize: 14, fontWeight: 700, color: '#16A34A' }}>${(transactions || []).filter(t => t.parentId === sel).reduce((a, b) => a + (parseFloat(String(b.amount || '0').replace(/[^0-9.]/g, '')) || 0), 0).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="lxf" style={{ fontSize: 13, color: '#9B99C8' }}>Remaining Balance</span>
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
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9B99C8' }}>{assignedWorkers.length} assigned</span>
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
                            background: isAssigned ? '#F0FDF4' : '#F8F8FD',
                            border: `1.5px solid ${isAssigned ? '#BBF7D0' : '#E8E6F5'}`,
                            cursor: 'pointer', width: '100%', textAlign: 'left'
                          }}
                        >
                          <div style={{ width: 32, height: 32, borderRadius: 10, background: isAssigned ? '#16A34A' : '#E5E0D8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {isAssigned ? <UserCheck size={14} color="#fff" /> : <UserX size={14} color="#9A948E" />}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: isAssigned ? '#15803D' : '#0D0B2E', marginBottom: 1 }}>{w.name}</div>
                            <div style={{ fontSize: 10, color: '#9B99C8' }}>{w.jobRole || 'Field Worker'}</div>
                          </div>
                          <div style={{ fontSize: 10, fontWeight: 800, color: isAssigned ? '#16A34A' : '#9B99C8', textTransform: 'uppercase' }}>
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
                  <button className="glass-btn" style={{ fontSize: 11, padding: '10px 0', borderColor: 'rgba(255,255,255,.2)', color: '#fff' }}><Plus size={14} /> Task</button>
                  <button className="glass-btn" style={{ fontSize: 11, padding: '10px 0', borderColor: 'rgba(255,255,255,.2)', color: '#fff' }}><Camera size={14} /> Photo</button>
                  <button className="glass-btn" style={{ fontSize: 11, padding: '10px 0', borderColor: 'rgba(255,255,255,.2)', color: '#fff' }}><FileText size={14} /> Approval</button>
                  <button className="glass-btn" style={{ fontSize: 11, padding: '10px 0', borderColor: 'rgba(255,255,255,.2)', color: '#fff' }}><DollarSign size={14} /> Invoice</button>
               </div>
            </div>
          </div>
        </div>

        {/* MANUAL PAYMENT MODAL */}
        {showManual && (
          <div className="overlay-modal" onClick={() => setShowManual(false)}>
             <div className="modal-box lxf" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
                <h3 className="lxfh" style={{ fontSize: 22, marginBottom: 8 }}>Record External Payment</h3>
                <p style={{ fontSize: 13, color: '#9B99C8', marginBottom: 24 }}>Manually add a payment for audit purposes (Cash, Bank Trace, etc).</p>
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
        <div>
          <h2 className="lxfh" style={{ fontSize: 32, fontWeight: 400, margin: 0 }}>Field Operations Center</h2>
          <div className="lxf" style={{ fontSize: 13, color: '#9B99C8', marginTop: 4 }}>Installer assignments, site progress, photos, checklists, and inspection readiness</div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} className="p-inp" style={{ height: 40, width: 180, fontSize: 12, fontWeight: 700 }}>
            <option value="active-field">Active field work</option>
            <option value="delivery">Shipping & delivery</option>
            <option value="installation">Installation only</option>
            <option value="inspection">Inspection only</option>
            <option value="assigned">Crew assigned</option>
            <option value="all">All projects</option>
          </select>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9B99C8' }} />
            <input className="p-inp" placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 34, width: 240 }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        {[
          { label: 'Delivery Ready', value: deliveryCount, color: '#607D8B' },
          { label: 'Installing Now', value: installationCount, color: '#16A34A' },
          { label: 'Inspection Queue', value: inspectionCount, color: '#4945BE' },
          { label: 'Crew Assigned', value: crewAssignedCount, color: ac },
        ].map(stat => (
          <div key={stat.label} className="p-card" style={{ padding: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="lxf" style={{ fontSize: 10, color: '#9B99C8', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.08em' }}>{stat.label}</div>
              <div className="lxfh" style={{ fontSize: 28, color: stat.color, marginTop: 4 }}>{stat.value}</div>
            </div>
            <HardHat size={22} color={stat.color} />
          </div>
        ))}
      </div>
      
      <div className="ops-grid" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', 
        gap: 24 
      }}>
        {filtered.map(c => {
          const currentStageObj = PROJECT_STAGES.find(s => s.id === projectStageId(c));
          return (
            <div key={c.id} className="p-card fade-in" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                     <div className="lxf" style={{ fontSize: 10, color: ac, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>{c.cat || 'Full Interior'}</div>
                     <div className="lxfh" style={{ fontSize: 18, fontWeight: 700 }}>{projectName(c)}</div>
                     <div className="lxf" style={{ fontSize: 12, color: '#9B99C8', marginTop: 3 }}>{clientName(c)}</div>
                  </div>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F8F8FD', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <PSBadge s={currentStageObj?.name || 'Order Confirmed'} />
                  </div>
               </div>

               <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 11, fontWeight: 700 }}>
                     <span style={{ color: '#5B5894' }}>FIELD PROGRESS</span>
                     <span>{c.progress || 0}%</span>
                  </div>
                  <div className="prog" style={{ height: 6, width: '100%', background: '#E8E6F5' }}>
                     <div className="prog-f" style={{ width: `${c.progress || 0}%`, background: ac }} />
                  </div>
               </div>

               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '1px solid #F8F8FD' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                     <div className="lxf" style={{ fontSize: 11, color: '#9B99C8', display: 'flex', alignItems: 'center', gap: 5 }}>
                       <UserCheck size={13} /> {(c.assignedWorkers || []).length} crew
                     </div>
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
                        color: '#0D0B2E', 
                        fontWeight: 700, 
                        fontSize: 12, 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                     }}
                  >
                     Open Field File <ArrowRight size={14} />
                  </button>
               </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
