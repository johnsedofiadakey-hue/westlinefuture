import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Search, X, Check, CheckCircle2,
  DollarSign, MessageCircle, FileText, Camera,
  Clock, User, Grip, Activity, Calendar, ChevronRight, Trash2, AlertTriangle, Users, UserCheck
} from 'lucide-react';
import { CLIENT_PROJECT_STAGES, PROJECT_TYPES } from '../../data';

// ─── Column definitions — 7-stage pipeline ───────────────────────────────────
const KANBAN_COLS = [
  { id: 'intake',       label: 'Intake',       stages: [1], color: `var(--text-secondary)`, bg: 'rgba(139,115,85,0.07)' },
  { id: 'ordering',     label: 'Ordering',     stages: [2], color: `var(--accent-primary)`, bg: 'rgba(37,99,235,0.07)' },
  { id: 'production',   label: 'Production',   stages: [3], color: '#374151', bg: 'rgba(55,65,81,0.06)' },
  { id: 'delivery',     label: 'Delivery',     stages: [4], color: '#0891B2', bg: 'rgba(8,145,178,0.07)' },
  { id: 'installation', label: 'Installation', stages: [5], color: '#16A34A', bg: 'rgba(22,163,74,0.07)' },
  { id: 'inspection',   label: 'Inspection',   stages: [6], color: `var(--accent-secondary)`, bg: 'rgba(124,58,237,0.07)' },
  { id: 'handover',     label: 'Handover',     stages: [7], color: `var(--accent-secondary)`, bg: 'rgba(92, 58, 33,0.07)' },
];

const STAGE_MAP = {};
CLIENT_PROJECT_STAGES.forEach(s => { STAGE_MAP[s.id] = s; });

const COL_BY_STAGE = {};
KANBAN_COLS.forEach(col => col.stages.forEach(sid => { COL_BY_STAGE[sid] = col.id; }));

function fmtDate(val) {
  if (!val) return null;
  const d = val?.toDate ? val.toDate() : new Date(val);
  if (isNaN(d)) return null;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtDateShort(val) {
  if (!val) return null;
  const d = val?.toDate ? val.toDate() : new Date(val);
  if (isNaN(d)) return null;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function daysSince(val) {
  if (!val) return null;
  const d = val?.toDate ? val.toDate() : new Date(val);
  if (isNaN(d)) return null;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
}

// ─── ProjectCard ─────────────────────────────────────────────────────────────
function ProjectCard({ project, ac, onOpen, onDragStart }) {
  const stageId = project.stageId || 1;
  const stage = STAGE_MAP[stageId] || CLIENT_PROJECT_STAGES[0];
  const ptype = PROJECT_TYPES[project.projectType] || PROJECT_TYPES['full-service'];

  // find how long project has been in current stage
  const history = project.stageHistory || [];
  const currentEntry = [...history].reverse().find(h => h.stageId === stageId);
  const daysInStage = daysSince(currentEntry?.timestamp || project.createdAt);

  return (
    <div
      draggable
      onDragStart={() => onDragStart(project)}
      onClick={() => onOpen(project)}
      style={{
        background: '#fff',
        border: '1px solid var(--border-color)',
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
      {/* project type badge */}
      <div style={{ position: 'absolute', top: 10, right: 10, fontSize: 9, fontWeight: 800, color: ptype.color, background: `${ptype.color}15`, padding: '2px 7px', borderRadius: 20, textTransform: 'uppercase' }}>
        {ptype.label}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <Grip size={14} color="#DDD" style={{ marginTop: 2, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0, paddingRight: 64 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: `var(--accent-secondary)`, lineHeight: 1.3, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {project.project || project.title}
          </div>
          <div style={{ fontSize: 11, color: `var(--text-secondary)`, display: 'flex', alignItems: 'center', gap: 5 }}>
            <User size={10} /> {project.name || 'Unknown Client'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <span style={{ fontSize: 14 }}>{stage.emoji}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: stage.color }}>{stage.short}</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)` }}>{project.budget || '—'}</div>
        {daysInStage !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: `var(--text-secondary)`, fontWeight: 700 }}>
            <Clock size={10} /> {daysInStage}d here
          </div>
        )}
      </div>

      <div>
        <div style={{ height: 4, background: `var(--border-color)`, borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: `${stage.pct}%`, height: '100%', background: stage.color, transition: 'width 0.6s ease', borderRadius: 2 }} />
        </div>
        <div style={{ fontSize: 9, color: `var(--text-secondary)`, marginTop: 4, textAlign: 'right', fontWeight: 700 }}>{stage.pct}%</div>
      </div>
    </div>
  );
}

// ─── KanbanColumn ─────────────────────────────────────────────────────────────
function KanbanColumn({ col, projects, ac, onOpen, onDragStart, onDrop, onDragOver, onDragLeave, isDragOver }) {
  return (
    <div
      onDragOver={e => { e.preventDefault(); onDragOver(col.id); }}
      onDragLeave={onDragLeave}
      onDrop={() => onDrop(col.id)}
      style={{
        flexShrink: 0, minWidth: 280, maxWidth: 300,
        background: isDragOver ? col.bg : 'rgba(249,247,244,0.6)',
        borderRadius: 20,
        padding: '0 0 12px',
        border: isDragOver ? `2px dashed ${col.color}` : '2px solid transparent',
        transition: 'border-color 0.2s, background 0.2s',
        display: 'flex', flexDirection: 'column',
      }}
    >
      <div style={{ padding: '16px 16px 14px', position: 'sticky', top: 0, background: 'inherit', borderRadius: '20px 20px 0 0', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: col.color, boxShadow: `0 0 8px ${col.color}66` }} />
            <span style={{ fontSize: 12, fontWeight: 800, color: `var(--accent-secondary)`, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{col.label}</span>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: `var(--text-secondary)`, background: `var(--border-color)`, padding: '2px 8px', borderRadius: 20 }}>{projects.length}</span>
        </div>
        <div style={{ marginTop: 6, fontSize: 10, color: `var(--text-secondary)` }}>
          {col.stages.map(sid => STAGE_MAP[sid]?.short).join(' · ')}
        </div>
        <div style={{ marginTop: 6, height: 2, background: col.color, borderRadius: 1, opacity: 0.3 }} />
      </div>
      <div style={{ padding: '4px 12px', flex: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 290px)' }}>
        {projects.length === 0 ? (
          <div style={{ padding: '24px 12px', textAlign: 'center', color: '#D0C9C1', fontSize: 12 }}>No projects here</div>
        ) : (
          projects.map(p => <ProjectCard key={p.id} project={p} ac={ac} onOpen={onOpen} onDragStart={onDragStart} />)
        )}
      </div>
    </div>
  );
}

// ─── ProjectDrawer ────────────────────────────────────────────────────────────
function ProjectDrawer({ project, ac, onClose, updateProjectStage, updateProject, createInvoice, sendWhatsAppUpdate, notify, invoices = [], deleteProject, teamMembers = [], assignWorkerToProject, staffMode = false }) {
  const [tab, setTab] = useState('overview');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [assigning, setAssigning] = useState(null);

  const handleDelete = async () => {
    setDeleting(true);
    await deleteProject?.(project.id);
    onClose();
  };
  const stageId = project.stageId || 1;
  const stage = STAGE_MAP[stageId] || CLIENT_PROJECT_STAGES[0];
  const ptype = PROJECT_TYPES[project.projectType] || PROJECT_TYPES['full-service'];
  const availableStages = CLIENT_PROJECT_STAGES.filter(s => ptype.stages.includes(s.id));
  const currentIdx = availableStages.findIndex(s => s.id === stageId);
  const nextStage = availableStages[currentIdx + 1];
  const projInvoices = invoices.filter(i => i.parentId === project.id);
  const history = project.stageHistory || [];

  const advance = async () => {
    if (!nextStage) return;
    await updateProjectStage(project.id, nextStage.id);
    notify && notify('success', `Advanced to ${nextStage.name}`);
    onClose();
  };

  const stageHistoryMap = {};
  history.forEach(h => { stageHistoryMap[h.stageId] = h; });

  const handleToggleAssignment = async (memberId) => {
    if (!assignWorkerToProject) return;
    setAssigning(memberId);
    try {
      await assignWorkerToProject(project.id, memberId);
    } finally {
      setAssigning(null);
    }
  };

  const drawerTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'finance', label: 'Finance' },
    ...(!staffMode ? [{ id: 'team', label: 'Team' }] : []),
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end' }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 500, height: '100vh', background: '#fff', boxShadow: '-20px 0 60px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '28px 28px 0', background: `var(--accent-secondary)`, color: '#fff', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: ptype.color, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>{ptype.label}</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.2 }}>{project.project || project.title}</h2>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{project.name} · {project.budget || '—'}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 12 }}>
              <button onClick={() => setConfirmDelete(true)} style={{ background: 'rgba(239,68,68,0.15)', border: 'none', color: '#FCA5A5', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} title="Delete project">
                <Trash2 size={16} />
              </button>
              <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {/* Delete confirmation overlay */}
            {confirmDelete && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(92, 58, 33,0.97)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, borderRadius: 0 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                  <AlertTriangle size={28} color="#EF4444" />
                </div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginBottom: 8, textAlign: 'center' }}>Delete this project?</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 8, textAlign: 'center', lineHeight: 1.6 }}>
                  <strong style={{ color: '#fff' }}>{project.project || project.title}</strong> and all its messages, documents, and notes will be permanently removed.
                </div>
                <div style={{ fontSize: 12, color: '#EF4444', fontWeight: 700, marginBottom: 32, textAlign: 'center' }}>This cannot be undone.</div>
                <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                  <button onClick={() => setConfirmDelete(false)} disabled={deleting} style={{ flex: 1, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, height: 48, borderRadius: 14, background: '#EF4444', border: 'none', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    {deleting ? 'Deleting…' : <><Trash2 size={15} /> Delete Project</>}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Stage + progress */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 18 }}>{stage.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{stage.name}</div>
              <div style={{ height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${stage.pct}%`, height: '100%', background: stage.color, borderRadius: 2, transition: 'width 0.8s ease' }} />
              </div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 800, color: stage.color }}>{stage.pct}%</span>
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>
            Stage {currentIdx + 1} of {availableStages.length}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            {drawerTabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: '12px 0', background: 'none', border: 'none', fontSize: 12, fontWeight: 700, color: tab === t.id ? ac : 'rgba(255,255,255,0.4)', borderBottom: tab === t.id ? `2px solid ${ac}` : '2px solid transparent', cursor: 'pointer', transition: 'all 0.2s' }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, padding: 28, overflowY: 'auto' }}>

          {/* ── OVERVIEW TAB ─────────────────────────────────────── */}
          {tab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Current stage card */}
              <div style={{ padding: 20, background: `${stage.color}10`, border: `1px solid ${stage.color}30`, borderRadius: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: stage.color, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>Required Action</div>
                <p style={{ fontSize: 13, color: `var(--accent-secondary)`, margin: 0, lineHeight: 1.6, fontWeight: 500 }}>{stage.adminPrompt}</p>
                {stageHistoryMap[stageId]?.timestamp && (
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: `var(--text-secondary)` }}>
                    <Calendar size={12} /> Entered {fmtDate(stageHistoryMap[stageId].timestamp)}
                    {daysSince(stageHistoryMap[stageId].timestamp) !== null && (
                      <span style={{ fontWeight: 700, color: `var(--text-secondary)` }}>· {daysSince(stageHistoryMap[stageId].timestamp)}d ago</span>
                    )}
                  </div>
                )}
              </div>

              {/* Quick stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ padding: 16, background: `var(--bg-secondary)`, borderRadius: 14 }}>
                  <div style={{ fontSize: 10, color: `var(--text-secondary)`, textTransform: 'uppercase', fontWeight: 800, marginBottom: 8 }}>Stages Done</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: `var(--accent-secondary)` }}>{currentIdx}<span style={{ fontSize: 13, color: `var(--text-secondary)`, fontWeight: 500 }}>/{availableStages.length}</span></div>
                </div>
                <div style={{ padding: 16, background: `var(--bg-secondary)`, borderRadius: 14 }}>
                  <div style={{ fontSize: 10, color: `var(--text-secondary)`, textTransform: 'uppercase', fontWeight: 800, marginBottom: 8 }}>Invoiced</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: `var(--accent-secondary)` }}>{projInvoices.filter(i => i.status === 'Paid').length}<span style={{ fontSize: 13, color: `var(--text-secondary)`, fontWeight: 500 }}>/{projInvoices.length}</span></div>
                </div>
              </div>

              {/* Actions */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 14 }}>Quick Actions</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {nextStage && (
                    <button onClick={advance} style={{ padding: '12px 16px', background: ac, color: `var(--accent-secondary)`, border: 'none', borderRadius: 12, fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, gridColumn: '1 / -1' }}>
                      <ChevronRight size={14} /> Advance to {nextStage.name}
                    </button>
                  )}
                  <button onClick={() => sendWhatsAppUpdate && sendWhatsAppUpdate(project.clientId, project.id, stage.name)} style={{ padding: '12px 16px', background: `var(--bg-secondary)`, color: `var(--accent-secondary)`, border: '1px solid var(--border-color)', borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <MessageCircle size={14} /> Notify Client
                  </button>
                  <button onClick={() => createInvoice && createInvoice({ parentId: project.id, clientId: project.clientId, title: `${stage.name} Payment`, amount: '', status: 'Pending' })} style={{ padding: '12px 16px', background: `var(--bg-secondary)`, color: `var(--accent-secondary)`, border: '1px solid var(--border-color)', borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <FileText size={14} /> New Invoice
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── TIMELINE TAB ─────────────────────────────────────── */}
          {tab === 'timeline' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 16 }}>Project Journey</div>
              {availableStages.map((s, i) => {
                const isPast = stageId > s.id;
                const isCurrent = stageId === s.id;
                const isFuture = stageId < s.id;
                const entry = stageHistoryMap[s.id];
                const enteredDate = entry?.timestamp ? fmtDateShort(entry.timestamp) : null;
                const daysIn = (isCurrent && entry?.timestamp) ? daysSince(entry.timestamp) : null;

                return (
                  <div key={s.id} style={{ display: 'flex', gap: 12, position: 'relative', opacity: isFuture ? 0.4 : 1 }}>
                    {/* Connector line */}
                    {i < availableStages.length - 1 && (
                      <div style={{ position: 'absolute', left: 16, top: 36, width: 2, height: 'calc(100% - 4px)', background: isPast ? s.color : `var(--border-color)`, borderRadius: 1 }} />
                    )}
                    {/* Circle */}
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: isPast ? s.color : isCurrent ? '#fff' : `var(--border-color)`, border: isCurrent ? `2px solid ${s.color}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1 }}>
                      {isPast ? <Check size={14} color="#fff" strokeWidth={3} /> : <span style={{ fontSize: 14 }}>{s.emoji}</span>}
                    </div>
                    {/* Content */}
                    <div style={{ flex: 1, paddingBottom: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: isCurrent ? 700 : 500, color: isCurrent ? `var(--accent-secondary)` : isPast ? `var(--text-secondary)` : `var(--text-secondary)` }}>{s.name}</span>
                        {isCurrent && <span style={{ fontSize: 9, fontWeight: 800, color: s.color, background: `${s.color}15`, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase' }}>Active</span>}
                      </div>
                      {enteredDate && (
                        <div style={{ fontSize: 11, color: `var(--text-secondary)`, display: 'flex', gap: 10 }}>
                          <span>Entered {enteredDate}</span>
                          {daysIn !== null && <span style={{ fontWeight: 700, color: `var(--text-secondary)` }}>{daysIn}d in stage</span>}
                          {isPast && entry?.note && <span style={{ fontStyle: 'italic' }}>— {entry.note}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── FINANCE TAB ──────────────────────────────────────── */}
          {tab === 'finance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Invoices ({projInvoices.length})</div>
              {projInvoices.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: `var(--text-secondary)`, fontSize: 13, background: `var(--bg-secondary)`, borderRadius: 16 }}>No invoices yet for this project.</div>
              ) : (
                projInvoices.map(inv => (
                  <div key={inv.id} style={{ padding: '14px 16px', background: `var(--bg-secondary)`, borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{inv.title || 'Invoice'}</div>
                      <div style={{ fontSize: 11, color: `var(--text-secondary)`, marginTop: 2 }}>{inv.date || '—'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 800 }}>{inv.amount}</div>
                      <div style={{ fontSize: 10, fontWeight: 800, color: inv.status === 'Paid' ? '#16A34A' : '#EF4444', marginTop: 2 }}>{inv.status}</div>
                    </div>
                  </div>
                ))
              )}
              {projInvoices.length > 0 && (() => {
                const total = projInvoices.reduce((a, b) => a + parseFloat((b.amount || '0').replace(/[^0-9.]/g, '')), 0);
                const paid = projInvoices.filter(i => i.status === 'Paid').reduce((a, b) => a + parseFloat((b.amount || '0').replace(/[^0-9.]/g, '')), 0);
                return (
                  <div style={{ padding: 16, background: `var(--accent-secondary)`, borderRadius: 14, color: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, opacity: 0.6 }}>Total Invoiced</span>
                      <span style={{ fontSize: 14, fontWeight: 800 }}>GHS {total.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, opacity: 0.6 }}>Collected</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#16A34A' }}>GHS {paid.toLocaleString()}</span>
                    </div>
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '8px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, opacity: 0.6 }}>Outstanding</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: ac }}>GHS {(total - paid).toLocaleString()}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── TEAM TAB ─────────────────────────────────────── */}
          {tab === 'team' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>
                Assigned Team — only assigned members can message this client
              </div>
              {teamMembers.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: `var(--text-secondary)`, fontSize: 13, background: `var(--bg-secondary)`, borderRadius: 16 }}>
                  No staff accounts yet. Create staff accounts in the Team section.
                </div>
              ) : (
                teamMembers.filter(m => m.role !== 'client').map(m => {
                  const assignedWorkers = project.assignedWorkers || [];
                  const isAssigned = assignedWorkers.includes(m.id) || assignedWorkers.includes(m.uid);
                  const isLoading = assigning === (m.id || m.uid);
                  return (
                    <div key={m.id || m.uid} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: isAssigned ? '#F0FDF4' : `var(--bg-secondary)`, border: `1px solid ${isAssigned ? '#BBF7D0' : `var(--border-color)`}`, borderRadius: 14, transition: 'all 0.2s' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: isAssigned ? '#16A34A' : `var(--border-color)`, color: isAssigned ? '#fff' : `var(--text-secondary)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
                        {(m.name || 'S')[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: `var(--accent-secondary)` }}>{m.name}</div>
                        <div style={{ fontSize: 11, color: `var(--text-secondary)` }}>{m.jobRole || m.role}</div>
                      </div>
                      {isAssigned && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 800, color: '#16A34A' }}>
                          <UserCheck size={13} /> Assigned
                        </div>
                      )}
                      <button
                        onClick={() => handleToggleAssignment(m.id || m.uid)}
                        disabled={isLoading}
                        style={{ padding: '7px 14px', borderRadius: 10, border: 'none', background: isAssigned ? '#EF4444' : ac, color: isAssigned ? '#fff' : `var(--accent-secondary)`, fontSize: 11, fontWeight: 800, cursor: 'pointer', opacity: isLoading ? 0.6 : 1, flexShrink: 0 }}
                      >
                        {isLoading ? '…' : isAssigned ? 'Remove' : 'Assign'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function ProjectKanban({ clients = [], brand, updateProjectStage, updateProject, createInvoice, sendWhatsAppUpdate, notify, invoices = [], deleteProject, teamMembers = [], assignWorkerToProject, staffMode = false, ...props }) {
  const ac = brand?.color || `var(--accent-secondary)`;
  const [search, setSearch] = useState('');
  const [dragProject, setDragProject] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [openProject, setOpenProject] = useState(null);

  const colFirstStage = useCallback((colId) => {
    return KANBAN_COLS.find(c => c.id === colId)?.stages[0] ?? 1;
  }, []);

  const handleDrop = async (colId) => {
    if (!dragProject) return;
    const targetStage = colFirstStage(colId);
    if ((dragProject.stageId || 1) !== targetStage) {
      await updateProjectStage(dragProject.id, targetStage);
    }
    setDragProject(null);
    setDragOverCol(null);
  };

  const filtered = (clients || []).filter(p =>
    !search ||
    (p.project || p.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const projectsByCol = {};
  KANBAN_COLS.forEach(col => {
    projectsByCol[col.id] = filtered.filter(p => col.stages.includes(p.stageId || 1));
  });

  const totalProjects = clients.length;
  const activeProjects = clients.filter(p => (p.stageId || 1) < 7).length;
  const completedProjects = clients.filter(p => (p.stageId || 1) === 7).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, minHeight: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 32, fontWeight: 400, fontFamily: 'var(--font-heading)', margin: 0 }}>Project Board</h2>
          <p style={{ color: `var(--text-secondary)`, fontSize: 13, margin: '4px 0 0' }}>Drag projects between columns — click to open detail and advance stages</p>
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: `var(--text-secondary)` }} />
          <input
            className="p-inp"
            placeholder="Search projects..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 34, width: 220, height: 40 }}
          />
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {[
          { label: 'Total', value: totalProjects, color: `var(--accent-secondary)` },
          { label: 'Active', value: activeProjects, color: '#2196F3' },
          { label: 'Completed', value: completedProjects, color: '#16A34A' },
        ].map(stat => (
          <div key={stat.label} style={{ padding: '12px 20px', background: '#fff', border: '1px solid var(--border-color)', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: stat.color }} />
            <span style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase' }}>{stat.label}</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: stat.color }}>{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Board */}
      <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16, minHeight: 400 }}>
        {KANBAN_COLS.map(col => (
          <KanbanColumn
            key={col.id}
            col={col}
            projects={projectsByCol[col.id] || []}
            ac={ac}
            onOpen={setOpenProject}
            onDragStart={setDragProject}
            onDrop={handleDrop}
            onDragOver={colId => setDragOverCol(colId)}
            onDragLeave={() => setDragOverCol(null)}
            isDragOver={dragOverCol === col.id}
          />
        ))}
      </div>

      {openProject && createPortal(
        <ProjectDrawer
          project={openProject}
          ac={ac}
          onClose={() => setOpenProject(null)}
          updateProjectStage={updateProjectStage}
          updateProject={updateProject}
          createInvoice={createInvoice}
          sendWhatsAppUpdate={sendWhatsAppUpdate}
          notify={notify}
          invoices={invoices}
          deleteProject={deleteProject}
          teamMembers={teamMembers}
          assignWorkerToProject={assignWorkerToProject}
          staffMode={staffMode}
        />,
        document.body
      )}
    </div>
  );
}
