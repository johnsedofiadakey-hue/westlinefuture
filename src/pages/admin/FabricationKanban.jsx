import React, { useState } from 'react';
import { 
  Plus, MoreVertical, Clock, CheckCircle, 
  AlertCircle, ArrowRight, Maximize2, MessageCircle,
  Activity, Hammer, FileText, Send
} from 'lucide-react';
import { PAv, SBadge } from '../../components/Shared';
import { motion, AnimatePresence } from 'framer-motion';

const STAGES = [
  { id: 'queue', label: 'In Queue', color: '#B5AFA9', desc: 'Awaiting scheduling' },
  { id: 'cutting', label: 'Cutting & Sizing', color: '#2196F3', desc: 'Precision sizing' },
  { id: 'processing', label: 'Processing', color: '#9C27B0', desc: 'Edges & Holes' },
  { id: 'tempering', label: 'Tempering', color: '#FF9800', desc: 'Heat treatment' },
  { id: 'qc', label: 'Quality Control', color: '#16A34A', desc: 'Final inspection' },
  { id: 'ready', label: 'Ready', color: '#1A1410', desc: 'Dispatch stage' }
];

const QC_ITEMS = ['Edge Polish', 'Dimensional Accuracy', 'Clarity Check', 'Temper Verification', 'No Scratches'];

function QCChecklist({ job, updateJob, ac }) {
  const checks = job.qcChecks || {};
  const allPassed = QC_ITEMS.every(item => checks[item]);

  const toggle = (item) => {
    const updated = { ...checks, [item]: !checks[item] };
    updateJob(job.id, { qcChecks: updated });
  };

  return (
    <div style={{ marginBottom: 20, padding: 12, border: `1px dashed ${ac}40`, borderRadius: 12, background: `${ac}05` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 9, fontWeight: 800, color: ac }}>QC PROTOCOL</div>
        {allPassed && <div style={{ fontSize: 9, fontWeight: 800, color: '#16A34A', background: '#DCFCE7', padding: '2px 8px', borderRadius: 6 }}>PASSED ✓</div>}
      </div>
      {QC_ITEMS.map(item => (
        <label key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, marginBottom: 6, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={!!checks[item]}
            onChange={() => toggle(item)}
            style={{ accentColor: ac, width: 14, height: 14 }}
          />
          <span style={{ color: checks[item] ? '#16A34A' : '#4B5563', fontWeight: checks[item] ? 700 : 400, textDecoration: checks[item] ? 'line-through' : 'none' }}>
            {item}
          </span>
        </label>
      ))}
    </div>
  );
}

export default function FabricationKanban({ jobs = [], clients = [], dbClients = [], updateJob, createJob, sendWhatsAppUpdate, brand, ...props }) {
  const ac = brand.color || '#C8A96E';
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showNewJob, setShowNewJob] = useState(false);
  const [jobDraft, setJobDraft] = useState({ projectTitle: '', item: '', priority: 'Normal', stage: 'queue', panels: [] });

  React.useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const handleNextStage = (job) => {
    const currentIndex = STAGES.findIndex(s => s.id === job.stage);
    if (currentIndex < STAGES.length - 1) {
      updateJob(job.id, { stage: STAGES[currentIndex + 1].id });
    }
  };

  const handleNotify = (job) => {
    const stage = STAGES.find(s => s.id === job.stage);
    sendWhatsAppUpdate(job.clientId || (clients.find(c => c.id === job.projectId)?.id), job.projectId, stage.label);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {!props.isSubView && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: 16 }}>
          <div>
             <h2 className="lxfh" style={{ fontSize: isMobile ? 24 : 32, fontWeight: 400 }}>Factory Floor</h2>
             <p className="lxf" style={{ color: '#B5AFA9', fontSize: 13 }}>Real-time fabrication command center.</p>
          </div>
          <div style={{ display: 'flex', gap: 12, width: isMobile ? '100%' : 'auto' }}>
             <button onClick={() => setShowNewJob(true)} className="p-btn-dark lxf" style={{ padding: '10px 20px', flex: isMobile ? 1 : 'none', display: 'flex', alignItems: 'center', gap: 8 }}><Plus size={16} /> New Job</button>
             <div className="glass-panel" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid #F0EBE5' }}>
                <Activity size={16} color={ac} />
                <span className="lxf" style={{ fontSize: 12, fontWeight: 700 }}>{jobs.filter(j => j.stage !== 'ready').length} Active</span>
             </div>
          </div>
        </div>
      )}

      <div className="lx-scroll kanban-container" style={{ display: 'flex', gap: 24, overflowX: 'auto', paddingBottom: 20, minHeight: 'calc(100vh - 250px)' }}>
        {STAGES.map(s => (
          <div key={s.id} className="kanban-col" style={{ minWidth: 320, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, padding: '0 8px' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, boxShadow: `0 0 10px ${s.color}66` }} />
                  <div>
                    <span className="lxfh" style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '.1em', display: 'block' }}>{s.label}</span>
                    <span style={{ fontSize: 9, color: '#B5AFA9', fontWeight: 700 }}>{s.desc}</span>
                  </div>
               </div>
               <span style={{ fontSize: 11, background: '#fff', border: '1px solid #F0EBE5', padding: '2px 8px', borderRadius: 10, color: '#1A1410', fontWeight: 800 }}>{jobs.filter(j => j.stage === s.id).length}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '4px' }}>
               <AnimatePresence>
                 {jobs.filter(j => j.stage === s.id).map(j => (
                   <motion.div 
                     layout
                     key={j.id} 
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, scale: 0.95 }}
                     className="p-card kanban-card" 
                     style={{ padding: 20, background: '#fff', borderRadius: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: j.priority === 'High' ? '1px solid #FEE2E2' : '1px solid transparent' }}
                   >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                         <div>
                            <div style={{ fontSize: 9, color: '#B5AFA9', fontWeight: 800, textTransform: 'uppercase', marginBottom: 2 }}>{j.id}</div>
                            <div className="lxfh" style={{ fontSize: 15, fontWeight: 700 }}>{j.projectTitle}</div>
                         </div>
                         {j.priority === 'High' && <span style={{ fontSize: 9, background: '#FEF2F2', color: '#EF4444', padding: '2px 8px', borderRadius: 6, fontWeight: 800 }}>URGENT</span>}
                      </div>
                      
                      <div className="lxf" style={{ fontSize: 13, color: '#4B5563', marginBottom: 16, fontWeight: 500 }}>{j.item}</div>
                      
                      {/* PANEL SPECS */}
                      <div style={{ background: '#F9F7F4', borderRadius: 12, padding: 12, marginBottom: 20 }}>
                         {j.panels?.map(p => (
                           <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                              <span style={{ color: '#7A6E62' }}>{p.w}x{p.h}mm • {p.t}</span>
                              <span style={{ color: p.status === 'Cut' ? '#16A34A' : '#9CA3AF', fontWeight: 700 }}>{p.status}</span>
                           </div>
                         ))}
                      </div>

                      {/* QC CHECKLIST (Only for QC Stage) */}
                      {s.id === 'qc' && (
                        <QCChecklist job={j} updateJob={updateJob} ac={ac} />
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <div style={{ display: 'flex', gap: 8 }}>
                            <button 
                              onClick={() => handleNotify(j)}
                              className="p-btn-light" 
                              style={{ height: 36, width: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F0F9FF', border: 'none', color: '#0EA5E9' }}
                              title="Notify Client via WhatsApp"
                            >
                               <MessageCircle size={16} />
                            </button>
                            <button className="p-btn-light" style={{ height: 36, width: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileText size={16} /></button>
                         </div>
                         
                         {STAGES.indexOf(s) < STAGES.length - 1 && (
                           <button 
                             onClick={() => handleNextStage(j)}
                             style={{ padding: '8px 12px', borderRadius: 10, background: ac, color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700 }}
                           >
                             Promote <ArrowRight size={14} />
                           </button>
                         )}
                      </div>
                   </motion.div>
                 ))}
               </AnimatePresence>
               {jobs.filter(j => j.stage === s.id).length === 0 && (
                 <div style={{ padding: 32, border: '1px dashed #F0EBE5', borderRadius: 20, textAlign: 'center', color: '#B5AFA9', fontSize: 12 }}>
                    No jobs in {s.label}
                 </div>
               )}
            </div>
          </div>
        ))}
      </div>

      {showNewJob && (
        <div className="overlay-modal" style={{ position: 'fixed', inset: 0, background: 'rgba(26,20,16,0.7)', backdropFilter: 'blur(8px)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="p-card" style={{ width: '100%', maxWidth: 480, padding: 32, borderRadius: 24 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 className="lxfh" style={{ fontSize: 20 }}>New Fabrication Job</h3>
              <button onClick={() => setShowNewJob(false)} style={{ background: '#F9F7F4', border: 'none', width: 32, height: 32, borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#B5AFA9', display: 'block', marginBottom: 6 }}>PROJECT TITLE</label>
                <input className="p-inp" placeholder="e.g. Penthouse Facade — Phase 2" value={jobDraft.projectTitle} onChange={e => setJobDraft(d => ({ ...d, projectTitle: e.target.value }))} style={{ width: '100%', height: 44, borderRadius: 10, padding: '0 14px' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#B5AFA9', display: 'block', marginBottom: 6 }}>GLASS ITEM DESCRIPTION</label>
                <input className="p-inp" placeholder="e.g. 12mm Tempered Clear, Sliding Door" value={jobDraft.item} onChange={e => setJobDraft(d => ({ ...d, item: e.target.value }))} style={{ width: '100%', height: 44, borderRadius: 10, padding: '0 14px' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#B5AFA9', display: 'block', marginBottom: 6 }}>PRIORITY</label>
                <select className="p-inp" value={jobDraft.priority} onChange={e => setJobDraft(d => ({ ...d, priority: e.target.value }))} style={{ width: '100%', height: 44, borderRadius: 10, padding: '0 14px' }}>
                  <option value="Normal">Normal</option>
                  <option value="High">High (URGENT)</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button onClick={() => setShowNewJob(false)} className="p-btn-light" style={{ flex: 1, height: 48, borderRadius: 12, fontSize: 13 }}>Cancel</button>
                <button
                  onClick={async () => {
                    if (!jobDraft.projectTitle) return;
                    const newJob = { ...jobDraft, id: `JOB_${Date.now()}`, panels: [], qcChecks: {}, createdAt: new Date().toISOString() };
                    if (createJob) await createJob(newJob);
                    setJobDraft({ projectTitle: '', item: '', priority: 'Normal', stage: 'queue', panels: [] });
                    setShowNewJob(false);
                  }}
                  style={{ flex: 1, height: 48, borderRadius: 12, background: ac, color: '#1A1410', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  Add to Queue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
