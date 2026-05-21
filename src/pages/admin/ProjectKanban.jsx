import React, { useState, useRef, useCallback } from 'react';
import {
  Search, Plus, X, ChevronRight, ArrowLeft, Check, CheckCircle2,
  DollarSign, MessageCircle, FileText, Camera, AlertCircle,
  Clock, User, Package, Truck, Wrench, Star, Factory,
  MoreHorizontal, Grip, Send, Activity, Calendar, Zap
} from 'lucide-react';
import { PSBadge } from '../../components/Shared';
import { KANBAN_COLUMNS, PROJECT_STAGES } from '../../data';

const STAGE_MAP = {};
PROJECT_STAGES.forEach(s => { STAGE_MAP[s.id] = s; });

const COL_BY_STAGE = {};
KANBAN_COLUMNS.forEach(col => { col.stages.forEach(sid => { COL_BY_STAGE[sid] = col.id; }); });

function daysSince(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

function ProjectCard({ project, ac, onOpen, onDragStart }) {
  const stage = STAGE_MAP[project.stage || 1] || PROJECT_STAGES[0];
  const days = daysSince(project.stageEnteredAt || project.createdAt);
  const isAtRisk = days !== null && days > (stage.days || 14);

  return (
    <div
      draggable
      onDragStart={() => onDragStart(project)}
      onClick={() => onOpen(project)}
      style={{
        background: '#fff',
        border: `1px solid ${isAtRisk ? 'rgba(239,68,68,0.2)' : '#F0EBE5'}`,
        borderRadius: 16,
        padding: '16px 18px',
        cursor: 'grab',
        transition: 'box-shadow 0.2s, transform 0.15s',
        position: 'relative',
        marginBottom: 12,
        userSelect: 'none',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
    >
      {isAtRisk && (
        <div style={{ position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: '50%', background: '#EF4444', boxShadow: '0 0 6px #EF4444' }} title="Overdue in current stage" />
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
        <Grip size={14} color="#DDD" style={{ marginTop: 2, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0D0B2E', lineHeight: 1.3, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {project.project || project.title}
          </div>
          <div style={{ fontSize: 11, color: '#9B99C8', display: 'flex', alignItems: 'center', gap: 6 }}>
            <User size={10} /> {project.name || 'Unknown Client'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#5B5894' }}>
          {project.budget || '—'}
        </div>
        {days !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: isAtRisk ? '#EF4444' : '#9B99C8', fontWeight: 700 }}>
            <Clock size={10} /> {days}d in stage
          </div>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ height: 4, background: '#F0EBE5', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: `${project.progress || 0}%`, height: '100%', background: ac, transition: 'width 0.6s ease', borderRadius: 2 }} />
        </div>
        <div style={{ fontSize: 9, color: '#9B99C8', marginTop: 4, textAlign: 'right', fontWeight: 700 }}>{project.progress || 0}%</div>
      </div>
    </div>
  );
}

function KanbanColumn({ col, projects, ac, onOpen, onDragStart, onDrop, onDragOver, onDragLeave, isDragOver }) {
  return (
    <div
      onDragOver={e => { e.preventDefault(); onDragOver(col.id); }}
      onDragLeave={onDragLeave}
      onDrop={() => onDrop(col.id)}
      style={{
        minWidth: 280,
        maxWidth: 300,
        background: isDragOver ? col.bg : 'rgba(249,247,244,0.6)',
        borderRadius: 20,
        padding: '0 0 12px',
        border: isDragOver ? `2px dashed ${col.color}` : '2px solid transparent',
        transition: 'border-color 0.2s, background 0.2s',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Column header */}
      <div style={{ padding: '16px 16px 14px', position: 'sticky', top: 0, background: 'inherit', borderRadius: '20px 20px 0 0', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: col.color, boxShadow: `0 0 8px ${col.color}66` }} />
            <span style={{ fontSize: 12, fontWeight: 800, color: '#0D0B2E', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{col.label}</span>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#9B99C8', background: '#F0EBE5', padding: '2px 8px', borderRadius: 20 }}>
            {projects.length}
          </span>
        </div>
        <div style={{ marginTop: 6, height: 2, background: col.color, borderRadius: 1, opacity: 0.3 }} />
      </div>

      {/* Cards */}
      <div style={{ padding: '4px 12px', flex: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 280px)' }}>
        {projects.length === 0 ? (
          <div style={{ padding: '24px 12px', textAlign: 'center', color: '#D0C9C1', fontSize: 12 }}>
            No projects here
          </div>
        ) : (
          projects.map(p => (
            <ProjectCard key={p.id} project={p} ac={ac} onOpen={onOpen} onDragStart={onDragStart} />
          ))
        )}
      </div>
    </div>
  );
}

function MilestoneChecklist({ tasks, projectTasks = [] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {tasks.map((task, i) => {
        const done = projectTasks.includes(task);
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: done ? 'rgba(22,163,74,0.06)' : '#F8F8FD', borderRadius: 10, border: `1px solid ${done ? 'rgba(22,163,74,0.15)' : '#F0EBE5'}` }}>
            <div style={{ width: 20, height: 20, borderRadius: 6, background: done ? '#16A34A' : 'transparent', border: done ? 'none' : '1.5px solid #DDD', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {done && <Check size={12} color="#fff" strokeWidth={3} />}
            </div>
            <span style={{ fontSize: 13, color: done ? '#16A34A' : '#5B5894', fontWeight: done ? 600 : 400, textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.7 : 1 }}>
              {task}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ProjectDrawer({ project, ac, onClose, updateStage, updateProject, createInvoice, sendWhatsAppUpdate, notify, invoices = [] }) {
  const [msgVal, setMsgVal] = useState('');
  const [tab, setTab] = useState('overview');
  const stage = STAGE_MAP[project.stage || 1] || PROJECT_STAGES[0];
  const projInvoices = invoices.filter(i => i.parentId === project.id);
  const completedTasks = project.completedTasks || [];

  const toggleTask = async (task) => {
    const updated = completedTasks.includes(task)
      ? completedTasks.filter(t => t !== task)
      : [...completedTasks, task];
    await updateProject(project.id, { completedTasks: updated });
  };

  const advance = async () => {
    const next = (project.stage || 1) + 1;
    if (next > PROJECT_STAGES.length) return;
    await updateStage(project.id, next);
    notify('success', `Project advanced to ${STAGE_MAP[next]?.name || 'next stage'}`);
  };

  const drawerTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'milestones', label: 'Milestones' },
    { id: 'finance', label: 'Finance' },
  ];

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: 480, height: '100vh', background: '#fff',
          boxShadow: '-20px 0 60px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column',
          overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drawer header */}
        <div style={{ padding: '28px 28px 0', background: '#0D0B2E', color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: ac, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>
                {project.cat || 'Glass Project'}
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.2 }}>
                {project.project || project.title}
              </h2>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 6 }}>
                {project.name} · {project.budget || '—'}
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, marginLeft: 12 }}>
              <X size={18} />
            </button>
          </div>

          {/* Progress bar */}
          <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, marginBottom: 4, overflow: 'hidden' }}>
            <div style={{ width: `${((project.stage || 1) / PROJECT_STAGES.length) * 100}%`, height: '100%', background: ac, borderRadius: 2, transition: 'width 0.8s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>
            <span>Stage {project.stage || 1} of {PROJECT_STAGES.length}</span>
            <span>{stage.name}</span>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            {drawerTabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  flex: 1, padding: '12px 0', background: 'none', border: 'none',
                  fontSize: 12, fontWeight: 700,
                  color: tab === t.id ? ac : 'rgba(255,255,255,0.4)',
                  borderBottom: tab === t.id ? `2px solid ${ac}` : '2px solid transparent',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Drawer body */}
        <div style={{ flex: 1, padding: 28, overflowY: 'auto' }}>

          {tab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Stage info */}
              <div style={{ padding: 20, background: `${stage.color}10`, border: `1px solid ${stage.color}30`, borderRadius: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: stage.color, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>Current Stage</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#0D0B2E', marginBottom: 6 }}>{stage.name}</div>
                <p style={{ fontSize: 12, color: '#5B5894', margin: 0, lineHeight: 1.6 }}>{stage.description}</p>
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#9B99C8' }}>
                  <Clock size={12} /> Typical duration: {stage.days} days
                </div>
              </div>

              {/* Quick stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ padding: 16, background: '#F4F4FA', borderRadius: 14 }}>
                  <div style={{ fontSize: 10, color: '#9B99C8', textTransform: 'uppercase', fontWeight: 800, marginBottom: 8 }}>Tasks Done</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#0D0B2E' }}>
                    {completedTasks.filter(t => (stage.tasks || []).includes(t)).length}<span style={{ fontSize: 13, color: '#9B99C8', fontWeight: 500 }}>/{(stage.tasks || []).length}</span>
                  </div>
                </div>
                <div style={{ padding: 16, background: '#F4F4FA', borderRadius: 14 }}>
                  <div style={{ fontSize: 10, color: '#9B99C8', textTransform: 'uppercase', fontWeight: 800, marginBottom: 8 }}>Invoiced</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#0D0B2E' }}>
                    {projInvoices.filter(i => i.status === 'Paid').length}<span style={{ fontSize: 13, color: '#9B99C8', fontWeight: 500 }}>/{projInvoices.length}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#9B99C8', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 14 }}>Quick Actions</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {(project.stage || 1) < 7 && (
                    <button
                      onClick={advance}
                      style={{ padding: '12px 16px', background: ac, color: '#0D0B2E', border: 'none', borderRadius: 12, fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                      <Activity size={14} /> Advance Stage
                    </button>
                  )}
                  <button
                    onClick={() => sendWhatsAppUpdate && sendWhatsAppUpdate(project.clientId, project.id, stage.name)}
                    style={{ padding: '12px 16px', background: '#F4F4FA', color: '#0D0B2E', border: '1px solid #F0EBE5', borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <MessageCircle size={14} /> Notify Client
                  </button>
                  <button
                    onClick={() => createInvoice && createInvoice({ parentId: project.id, clientId: project.clientId, title: `${stage.name} Payment`, amount: '', status: 'Pending' })}
                    style={{ padding: '12px 16px', background: '#F4F4FA', color: '#0D0B2E', border: '1px solid #F0EBE5', borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <FileText size={14} /> New Invoice
                  </button>
                  <button
                    onClick={() => {}}
                    style={{ padding: '12px 16px', background: '#F4F4FA', color: '#0D0B2E', border: '1px solid #F0EBE5', borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <Camera size={14} /> Upload Photo
                  </button>
                </div>
              </div>

              {/* All stages mini-map */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#9B99C8', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 14 }}>Project Journey</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {PROJECT_STAGES.map((s, i) => {
                    const isPast = (project.stage || 1) > s.id;
                    const isCurrent = (project.stage || 1) === s.id;
                    return (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: isCurrent ? `${s.color}12` : 'transparent', border: isCurrent ? `1px solid ${s.color}30` : '1px solid transparent' }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: isPast ? s.color : isCurrent ? '#fff' : '#F0EBE5', border: isCurrent ? `2px solid ${s.color}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {isPast ? <Check size={12} color="#fff" strokeWidth={3} /> : <div style={{ width: 6, height: 6, borderRadius: '50%', background: isCurrent ? s.color : '#DDD' }} />}
                        </div>
                        <span style={{ fontSize: 12, fontWeight: isCurrent ? 700 : 400, color: isCurrent ? '#0D0B2E' : isPast ? '#5B5894' : '#9B99C8' }}>{s.name}</span>
                        {isCurrent && <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 800, color: s.color, textTransform: 'uppercase' }}>Active</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === 'milestones' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              {PROJECT_STAGES.map((s) => {
                const isPast = (project.stage || 1) > s.id;
                const isCurrent = (project.stage || 1) === s.id;
                const isFuture = (project.stage || 1) < s.id;
                const stageDone = completedTasks.filter(t => s.tasks.includes(t)).length;
                return (
                  <div key={s.id} style={{ opacity: isFuture ? 0.45 : 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: isPast ? s.color : isCurrent ? '#fff' : '#F0EBE5', border: isCurrent ? `2px solid ${s.color}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {isPast ? <Check size={14} color="#fff" strokeWidth={3} /> : <span style={{ fontSize: 11, fontWeight: 800, color: isCurrent ? s.color : '#9B99C8' }}>{s.id}</span>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#0D0B2E' }}>{s.name}</div>
                        <div style={{ fontSize: 11, color: '#9B99C8' }}>{stageDone}/{s.tasks.length} tasks · {s.days} day{s.days > 1 ? 's' : ''}</div>
                      </div>
                      {isPast && <CheckCircle2 size={16} color="#16A34A" />}
                      {isCurrent && <span style={{ fontSize: 9, fontWeight: 800, color: s.color, background: `${s.color}15`, padding: '3px 8px', borderRadius: 20, textTransform: 'uppercase' }}>Active</span>}
                    </div>
                    {!isFuture && (
                      <div style={{ marginLeft: 38 }}>
                        <MilestoneChecklist tasks={s.tasks} projectTasks={completedTasks} />
                        {isCurrent && (
                          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {s.tasks.map((task, ti) => (
                              <button
                                key={ti}
                                onClick={() => toggleTask(task)}
                                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: completedTasks.includes(task) ? 'rgba(22,163,74,0.08)' : '#F4F4FA', border: `1px solid ${completedTasks.includes(task) ? 'rgba(22,163,74,0.2)' : '#F0EBE5'}`, borderRadius: 10, cursor: 'pointer', fontSize: 12, color: completedTasks.includes(task) ? '#16A34A' : '#0D0B2E', fontWeight: 600 }}
                              >
                                {completedTasks.includes(task) ? <CheckCircle2 size={13} color="#16A34A" /> : <div style={{ width: 13, height: 13, borderRadius: 4, border: '1.5px solid #DDD' }} />}
                                {task}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'finance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Invoices ({projInvoices.length})</div>
              </div>
              {projInvoices.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#9B99C8', fontSize: 13, background: '#F4F4FA', borderRadius: 16 }}>
                  No invoices yet for this project.
                </div>
              ) : (
                projInvoices.map(inv => (
                  <div key={inv.id} style={{ padding: '14px 16px', background: '#F4F4FA', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{inv.title || 'Invoice'}</div>
                      <div style={{ fontSize: 11, color: '#9B99C8', marginTop: 2 }}>{inv.date || '—'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 800 }}>{inv.amount}</div>
                      <div style={{ fontSize: 10, fontWeight: 800, color: inv.status === 'Paid' ? '#16A34A' : '#EF4444', marginTop: 2 }}>{inv.status}</div>
                    </div>
                  </div>
                ))
              )}
              {/* Financial summary */}
              {projInvoices.length > 0 && (() => {
                const total = projInvoices.reduce((a, b) => a + parseFloat((b.amount || '0').replace(/[$,]/g, '')), 0);
                const paid = projInvoices.filter(i => i.status === 'Paid').reduce((a, b) => a + parseFloat((b.amount || '0').replace(/[$,]/g, '')), 0);
                return (
                  <div style={{ padding: 16, background: '#0D0B2E', borderRadius: 14, color: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, opacity: 0.6 }}>Total Invoiced</span>
                      <span style={{ fontSize: 14, fontWeight: 800 }}>${total.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, opacity: 0.6 }}>Collected</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#16A34A' }}>${paid.toLocaleString()}</span>
                    </div>
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '8px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, opacity: 0.6 }}>Outstanding</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: ac }}>${(total - paid).toLocaleString()}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProjectKanban({ clients = [], brand, updateStage, updateProject, createInvoice, sendWhatsAppUpdate, notify, invoices = [], createProject, dbClients = [], ...props }) {
  const ac = brand?.color || '#231F78';
  const [search, setSearch] = useState('');
  const [dragProject, setDragProject] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [openProject, setOpenProject] = useState(null);

  const STAGE_TO_COL_STAGE = useCallback((colId) => {
    const col = KANBAN_COLUMNS.find(c => c.id === colId);
    return col ? col.stages[0] : 1;
  }, []);

  const handleDrop = async (colId) => {
    if (!dragProject) return;
    const targetStage = STAGE_TO_COL_STAGE(colId);
    if (dragProject.stage !== targetStage) {
      await updateStage(dragProject.id, targetStage);
    }
    setDragProject(null);
    setDragOverCol(null);
  };

  const filtered = (clients || []).filter(p =>
    !search ||
    (p.project || p.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.cat || '').toLowerCase().includes(search.toLowerCase())
  );

  const projectsByCol = {};
  KANBAN_COLUMNS.forEach(col => {
    projectsByCol[col.id] = filtered.filter(p => col.stages.includes(p.stage || 1));
  });

  const totalProjects = clients.length;
  const activeProjects = clients.filter(p => (p.stage || 1) < 7).length;
  const completedProjects = clients.filter(p => (p.stage || 1) === 7).length;
  const atRiskProjects = clients.filter(p => {
    const stage = STAGE_MAP[p.stage || 1];
    const days = daysSince(p.stageEnteredAt || p.createdAt);
    return days !== null && days > (stage?.days || 14) && (p.stage || 1) < 7;
  }).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, minHeight: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 32, fontWeight: 400, fontFamily: 'var(--font-heading)', margin: 0 }}>Project Board</h2>
          <p style={{ color: '#9B99C8', fontSize: 13, margin: '4px 0 0' }}>Drag projects between columns to advance their stage</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9B99C8' }} />
            <input
              className="p-inp"
              placeholder="Search projects..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 34, width: 220, height: 40 }}
            />
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {[
          { label: 'Total', value: totalProjects, color: '#0D0B2E' },
          { label: 'Active', value: activeProjects, color: '#2196F3' },
          { label: 'Completed', value: completedProjects, color: '#16A34A' },
          { label: 'At Risk', value: atRiskProjects, color: '#EF4444' },
        ].map(stat => (
          <div key={stat.label} style={{ padding: '12px 20px', background: '#fff', border: '1px solid #F0EBE5', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: stat.color }} />
            <span style={{ fontSize: 11, fontWeight: 800, color: '#9B99C8', textTransform: 'uppercase' }}>{stat.label}</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: stat.color }}>{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Kanban board */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          overflowX: 'auto',
          paddingBottom: 16,
          minHeight: 400,
        }}
      >
        {KANBAN_COLUMNS.map(col => (
          <KanbanColumn
            key={col.id}
            col={col}
            projects={projectsByCol[col.id] || []}
            ac={ac}
            onOpen={setOpenProject}
            onDragStart={setDragProject}
            onDrop={handleDrop}
            onDragOver={(colId) => setDragOverCol(colId)}
            onDragLeave={() => setDragOverCol(null)}
            isDragOver={dragOverCol === col.id}
          />
        ))}
      </div>

      {/* Project detail drawer */}
      {openProject && (
        <ProjectDrawer
          project={openProject}
          ac={ac}
          onClose={() => setOpenProject(null)}
          updateStage={updateStage}
          updateProject={updateProject}
          createInvoice={createInvoice}
          sendWhatsAppUpdate={sendWhatsAppUpdate}
          notify={notify}
          invoices={invoices}
        />
      )}
    </div>
  );
}
