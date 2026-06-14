import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useResponsive } from '../../hooks/useResponsive'; // ✅ CRITICAL FIX #7: Add responsive hook
import {
  Search, X, Check, CheckCircle2,
  DollarSign, MessageCircle, FileText, Camera,
  Clock, User, Grip, Activity, Calendar, ChevronRight, Trash2, AlertTriangle, Users, UserCheck,
  LayoutGrid, List, Filter, ShieldCheck, Eye, Download
} from 'lucide-react';
import { CLIENT_PROJECT_STAGES, PROJECT_TYPES } from '../../data';
import { isPaidStatus } from '../../components/Shared';

// ─── Contract helpers ─────────────────────────────────────────────────────────
function applyContractVars(template, project, brand) {
  const budget = Number(project?.budget || 0);
  const completionDate = project?.targetCompletionDate
    ? new Date(project.targetCompletionDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Pending Scheduling';
  return (template || '')
    .replace(/\{\{clientName\}\}/g,     project?.clientName || 'Valued Client')
    .replace(/\{\{projectTitle\}\}/g,   project?.title || 'Your Project')
    .replace(/\{\{budget\}\}/g,         `GH₵ ${budget.toLocaleString(undefined, { minimumFractionDigits: 2 })}`)
    .replace(/\{\{company\}\}/g,        brand?.name || 'Westline Future')
    .replace(/\{\{date\}\}/g,           new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }))
    .replace(/\{\{completionDate\}\}/g, completionDate);
}

const DEFAULT_CONTRACT = `SERVICE AGREEMENT

This Service Agreement ("Agreement") is entered into as of {{date}} between {{company}} ("Contractor") and {{clientName}} ("Client").

1. SCOPE OF WORK
The Contractor agrees to perform the following services for the Client: {{projectTitle}}.

2. PROJECT VALUE
The total agreed project value is {{budget}}, payable in accordance with the payment schedule set out in the associated quotation.

3. TIMELINE
Work is expected to be completed by {{completionDate}}, subject to client cooperation, site access, and prompt payment of invoices.

4. PAYMENT TERMS
Payment shall be made according to the milestone schedule agreed at project kickoff. Late payments may delay project progress and attract a 2% monthly late fee.

5. CHANGES & VARIATIONS
Any changes to the agreed scope of work must be submitted in writing and approved by both parties. Variations will be quoted separately before work begins.

6. CONFIDENTIALITY
Both parties agree to keep project details, pricing, and client information confidential and not to disclose it to third parties without prior written consent.

7. ACCEPTANCE
By signing this agreement, the Client confirms that they have read, understood, and agreed to the full terms of this Service Agreement.`;

// ─── Contract Preview Modal ───────────────────────────────────────────────────
function ContractPreviewModal({ project, brand, onClose }) {
  const rawTemplate = project.contractTerms || brand?.finSettings?.contractTemplate || DEFAULT_CONTRACT;
  const rendered = applyContractVars(rawTemplate, project, brand);
  const signed = !!project.contractAccepted;

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 680, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(0,0,0,.25)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 3 }}>Contract Preview</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--accent-secondary)' }}>{project.title}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {signed && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                <CheckCircle2 size={12} color="#16A34A" />
                <span style={{ fontSize: 11, fontWeight: 800, color: '#15803D' }}>Signed by {project.contractSignedName || 'Client'}</span>
              </div>
            )}
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Contract Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 36px' }}>
          {/* Letterhead */}
          <div style={{ textAlign: 'center', marginBottom: 28, paddingBottom: 20, borderBottom: '2px solid var(--border-color)' }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--accent-secondary)', letterSpacing: '.02em' }}>{brand?.name || 'Westline Future'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Service Agreement</div>
          </div>

          {/* Contract text */}
          <div style={{ fontSize: 13, lineHeight: 1.9, color: '#2D2D2D', whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif' }}>
            {rendered}
          </div>

          {/* Signature block — shown when signed */}
          {signed && (
            <div style={{ marginTop: 36, paddingTop: 24, borderTop: '1.5px solid var(--border-color)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Client Signature</div>
                  <div style={{ height: 60, display: 'flex', alignItems: 'center' }}>
                    {project.quoteSignature ? (
                      <img src={project.quoteSignature} alt="signature" style={{ maxHeight: 55, maxWidth: '100%', objectFit: 'contain' }} />
                    ) : (
                      <div style={{ fontSize: 28, fontFamily: 'Georgia, serif', fontStyle: 'italic', color: 'var(--accent-secondary)' }}>{project.contractSignedName}</div>
                    )}
                  </div>
                  <div style={{ height: 1, background: '#2D2D2D', marginTop: 4, width: 200 }} />
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>{project.contractSignedName || 'Client'}</div>
                  {project.quoteSignedAt?.seconds && (
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      {new Date(project.quoteSignedAt.seconds * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>For {brand?.name || 'Westline Future'}</div>
                  <div style={{ height: 60, display: 'flex', alignItems: 'flex-end' }}>
                    <div style={{ fontSize: 22, fontFamily: 'Georgia, serif', fontStyle: 'italic', color: 'var(--accent-secondary)' }}>{brand?.finSettings?.signatureName || 'Authorised Signatory'}</div>
                  </div>
                  <div style={{ height: 1, background: '#2D2D2D', marginTop: 4, width: 200 }} />
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>{brand?.finSettings?.signatureName || 'Authorised Signatory'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{brand?.finSettings?.signatureTitle || brand?.name}</div>
                </div>
              </div>
              {project.quoteVerificationStamp && (
                <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 10, background: '#F8F8FD', border: '1px solid var(--border-color)', fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'monospace', lineHeight: 1.7 }}>
                  <div style={{ fontWeight: 800, marginBottom: 4, fontFamily: 'inherit' }}>VERIFICATION RECORD</div>
                  IP: {project.quoteVerificationStamp.ipAddress} · UA: {(project.quoteVerificationStamp.userAgent || '').slice(0, 60)}...
                  <br />Timestamp: {project.quoteVerificationStamp.timestamp}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 28px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: '10px 24px', borderRadius: 10, border: '1.5px solid var(--border-color)', background: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Close</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Column definitions — professional project pipeline ─────────────────────
const KANBAN_COLS = [
  { id: 'intake',       label: 'Intake',       stages: [1], color: `var(--text-secondary)`, bg: 'rgba(139,115,85,0.07)' },
  { id: 'design',       label: 'Rendering',    stages: [2], color: '#9333EA', bg: 'rgba(147,51,234,0.07)' },
  { id: 'quote',        label: 'Quote',        stages: [3], color: `var(--accent-primary)`, bg: 'rgba(37,99,235,0.07)' },
  { id: 'production',   label: 'Production',   stages: [4], color: '#374151', bg: 'rgba(55,65,81,0.06)' },
  { id: 'delivery',     label: 'Delivery',     stages: [5], color: '#0891B2', bg: 'rgba(8,145,178,0.07)' },
  { id: 'installation', label: 'Installation', stages: [6], color: '#16A34A', bg: 'rgba(22,163,74,0.07)' },
  { id: 'inspection',   label: 'Inspection',   stages: [7], color: '#7C3AED', bg: 'rgba(124,58,237,0.07)' },
  { id: 'handover',     label: 'Handover',     stages: [8], color: `var(--accent-secondary)`, bg: 'rgba(92, 58, 33,0.07)' },
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

function parseMoney(val) {
  return parseFloat(String(val || '0').replace(/[^0-9.]/g, '')) || 0;
}

function getProjectHealth(project, invoices = []) {
  const stage = STAGE_MAP[project.stageId || 1] || CLIENT_PROJECT_STAGES[0];
  const history = project.stageHistory || [];
  const currentEntry = [...history].reverse().find(h => h.stageId === (project.stageId || 1));
  const daysInStage = daysSince(currentEntry?.timestamp || project.createdAt) || 0;
  const projectInvoices = invoices.filter(i => i.parentId === project.id || i.projectId === project.id);
  // Only treat invoices as "overdue/blocking" if they are explicitly Overdue OR have a due date set by admin.
  // Auto-generated milestone invoices with due: null are future obligations — they don't block project health.
  const overdueInvoices = projectInvoices.filter(i =>
    !isPaidStatus(i.status) &&
    (i.status === 'Overdue' || (i.due != null && i.due !== ''))
  );
  const waitingClient = stage.whoActs === 'client' || String(project.nextAction || '').toLowerCase().includes('client');
  const delayed = project.timelineStatus === 'Delayed' || daysInStage > ((stage.days || 7) + 3);
  const blocked = delayed || overdueInvoices.length > 0 || project.projectHealth === 'Red' || String(project.healthStatus || '').toLowerCase() === 'red';

  // Give specific, actionable labels instead of generic "Blocked"
  if (blocked) {
    if (overdueInvoices.length > 0) {
      return { label: 'Awaiting Payment', color: '#D97706', bg: '#FFF7ED', reason: `${overdueInvoices.length} overdue invoice${overdueInvoices.length > 1 ? 's' : ''}` };
    }
    if (delayed) {
      return { label: 'Needs Attention', color: '#DC2626', bg: '#FEF2F2', reason: `Stuck ${daysInStage} days in this stage` };
    }
    return { label: 'Needs Review', color: '#DC2626', bg: '#FEF2F2', reason: 'Admin review required' };
  }
  if (waitingClient) return { label: 'Waiting Client', color: '#D97706', bg: '#FFF7ED', reason: project.nextAction || stage.clientMsg };
  return { label: 'On Track', color: '#16A34A', bg: '#F0FDF4', reason: project.nextAction || stage.adminPrompt };
}

// ─── ProjectCard ─────────────────────────────────────────────────────────────
function ProjectCard({ project, ac, onOpen, onDragStart, invoices = [], compact = false }) {
  const stageId = project.stageId || 1;
  const stage = STAGE_MAP[stageId] || CLIENT_PROJECT_STAGES[0];
  const ptype = PROJECT_TYPES[project.projectType] || PROJECT_TYPES['full-service'];
  const health = getProjectHealth(project, invoices);

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
        border: `1px solid ${health.color}22`,
        borderRadius: 16,
        padding: compact ? '12px 14px' : '16px 18px',
        cursor: 'grab',
        transition: 'box-shadow 0.2s, transform 0.15s',
        position: 'relative',
        marginBottom: 12,
        userSelect: 'none',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
    >
      <div style={{ position: 'absolute', left: 0, top: 12, bottom: 12, width: 3, borderRadius: '0 4px 4px 0', background: health.color }} />
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
        <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 900, color: health.color, background: health.bg, padding: '3px 7px', borderRadius: 999, textTransform: 'uppercase' }}>{health.label}</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)` }}>{project.budget || '—'}</div>
        {daysInStage !== null && (
          <div title={`Days project has been in ${stage.short} stage`} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: `var(--text-secondary)`, fontWeight: 700, cursor: 'help' }}>
            <Clock size={10} /> {daysInStage}d
          </div>
        )}
      </div>
      {!compact && (
        <div style={{ fontSize: 10, color: `var(--text-secondary)`, lineHeight: 1.4, marginBottom: 10, minHeight: 28 }}>
          {health.reason}
        </div>
      )}

      <div>
        <div style={{ height: 4, background: `var(--border-color)`, borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: `${stage.pct}%`, height: '100%', background: stage.color, transition: 'width 0.6s ease', borderRadius: 2 }} />
        </div>
        <div title="Overall project completion based on current stage" style={{ fontSize: 9, color: `var(--text-secondary)`, marginTop: 4, textAlign: 'right', fontWeight: 700, cursor: 'help' }}>{stage.pct}% complete</div>
      </div>
    </div>
  );
}

// ─── KanbanColumn ─────────────────────────────────────────────────────────────
function KanbanColumn({ col, projects, ac, onOpen, onDragStart, onDrop, onDragOver, onDragLeave, isDragOver, invoices = [], compact = false }) {
  const blocked = projects.filter(p => getProjectHealth(p, invoices).label === 'Blocked').length;
  return (
    <div
      onDragOver={e => { e.preventDefault(); onDragOver(col.id); }}
      onDragLeave={onDragLeave}
      onDrop={() => onDrop(col.id)}
      style={{
        flexShrink: 0, minWidth: compact ? 236 : 280, maxWidth: compact ? 252 : 300,
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
          {blocked ? `${blocked} blocked` : col.stages.map(sid => STAGE_MAP[sid]?.short).join(' · ')}
        </div>
        <div style={{ marginTop: 6, height: 2, background: col.color, borderRadius: 1, opacity: 0.3 }} />
      </div>
      <div style={{ padding: '4px 12px', flex: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 290px)' }}>
        {projects.length === 0 ? (
          <div style={{ padding: '24px 12px', textAlign: 'center', color: '#D0C9C1', fontSize: 12 }}>No projects here</div>
        ) : (
          projects.map(p => <ProjectCard key={p.id} project={p} ac={ac} onOpen={onOpen} onDragStart={onDragStart} invoices={invoices} compact={compact} />)
        )}
      </div>
    </div>
  );
}

// ─── ProjectDrawer ────────────────────────────────────────────────────────────
function ProjectDrawer({ project, ac, onClose, updateProjectStage, updateProject, createInvoice, sendWhatsAppUpdate, notify, invoices = [], deleteProject, teamMembers = [], assignWorkerToProject, staffMode = false, brand }) {
  const [tab, setTab] = useState('overview');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [assigning, setAssigning] = useState(null);
  const [archiveReason, setArchiveReason] = useState('');
  const [archiveConfirm, setArchiveConfirm] = useState('');
  const [customTerms, setCustomTerms] = useState(project.contractTerms || '');
  const [showContractPreview, setShowContractPreview] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    await deleteProject?.(project.id, archiveReason);
    onClose();
  };
  const stageId = project.stageId || 1;
  const stage = STAGE_MAP[stageId] || CLIENT_PROJECT_STAGES[0];
  const ptype = PROJECT_TYPES[project.projectType] || PROJECT_TYPES['full-service'];
  const availableStages = CLIENT_PROJECT_STAGES.filter(s => ptype.stages.includes(s.id));
  const currentIdx = availableStages.findIndex(s => s.id === stageId);
  const nextStage = availableStages[currentIdx + 1];
  const projInvoices = invoices.filter(i => i.parentId === project.id || i.projectId === project.id);
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
              <button onClick={() => setConfirmDelete(true)} style={{ background: 'rgba(239,68,68,0.15)', border: 'none', color: '#FCA5A5', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} title="Archive project">
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
                <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginBottom: 8, textAlign: 'center' }}>Archive this project?</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 8, textAlign: 'center', lineHeight: 1.6 }}>
                  <strong style={{ color: '#fff' }}>{project.project || project.title}</strong> will leave active operations, but messages, documents, invoices, approvals, and logs will be preserved.
                </div>
                <div style={{ fontSize: 12, color: '#FCA5A5', fontWeight: 700, marginBottom: 16, textAlign: 'center' }}>Type ARCHIVE to confirm.</div>
                <textarea
                  value={archiveReason}
                  onChange={e => setArchiveReason(e.target.value)}
                  placeholder="Reason for archive, e.g. duplicate project, cancelled scope, migrated record..."
                  rows={3}
                  style={{ width: '100%', boxSizing: 'border-box', border: '1px solid rgba(255,255,255,.16)', background: 'rgba(255,255,255,.08)', color: '#fff', borderRadius: 12, padding: 12, resize: 'none', outline: 'none', marginBottom: 10, fontFamily: 'inherit', fontSize: 12 }}
                />
                <input
                  value={archiveConfirm}
                  onChange={e => setArchiveConfirm(e.target.value)}
                  placeholder="ARCHIVE"
                  style={{ width: '100%', boxSizing: 'border-box', border: '1px solid rgba(255,255,255,.16)', background: 'rgba(255,255,255,.08)', color: '#fff', borderRadius: 12, padding: 12, outline: 'none', marginBottom: 24, fontFamily: 'inherit', fontSize: 12, textAlign: 'center', fontWeight: 900, letterSpacing: '.12em' }}
                />
                <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                  <button onClick={() => setConfirmDelete(false)} disabled={deleting} style={{ flex: 1, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button onClick={handleDelete} disabled={deleting || archiveConfirm !== 'ARCHIVE'} style={{ flex: 1, height: 48, borderRadius: 14, background: archiveConfirm === 'ARCHIVE' ? '#EF4444' : 'rgba(255,255,255,.12)', border: 'none', color: '#fff', fontSize: 14, fontWeight: 800, cursor: archiveConfirm === 'ARCHIVE' ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    {deleting ? 'Archiving…' : <><Trash2 size={15} /> Archive Project</>}
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
                  <div style={{ fontSize: 22, fontWeight: 800, color: `var(--accent-secondary)` }}>{projInvoices.filter(i => isPaidStatus(i.status)).length}<span style={{ fontSize: 13, color: `var(--text-secondary)`, fontWeight: 500 }}>/{projInvoices.length}</span></div>
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
              
              {/* Contract Signing Status */}
              <div style={{ marginTop: 20, padding: '12px 16px', borderRadius: 12, background: project.contractAccepted ? '#F0FDF4' : '#FFF7ED', border: `1px solid ${project.contractAccepted ? '#BBF7D0' : '#FED7AA'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {project.contractAccepted
                    ? <><CheckCircle2 size={15} color="#16A34A" /><div><div style={{ fontSize: 12, fontWeight: 800, color: '#15803D' }}>Contract Signed</div><div style={{ fontSize: 11, color: '#16A34A' }}>{project.contractSignedName || 'Client'} · {project.quoteSignedAt?.seconds ? new Date(project.quoteSignedAt.seconds * 1000).toLocaleDateString('en-GB') : '—'}</div></div></>
                    : <><AlertTriangle size={15} color="#D97706" /><div style={{ fontSize: 12, fontWeight: 700, color: '#92400E' }}>Contract not yet signed by client</div></>
                  }
                </div>
                <button
                  onClick={() => setShowContractPreview(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 9, border: `1px solid ${project.contractAccepted ? '#BBF7D0' : '#FED7AA'}`, background: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 800, color: project.contractAccepted ? '#15803D' : '#92400E', whiteSpace: 'nowrap', flexShrink: 0 }}
                >
                  {project.contractAccepted ? <><Download size={12} /> View Signed</> : <><Eye size={12} /> Preview</>}
                </button>
              </div>

              {/* Contract Terms Customization */}
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.1em' }}>Custom Contract Terms</div>
                  <button
                    onClick={() => setShowContractPreview(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 800, color: `var(--text-secondary)`, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 7, padding: '4px 10px', cursor: 'pointer' }}
                  >
                    <Eye size={10} /> Preview as Client
                  </button>
                </div>
                <textarea
                  value={customTerms}
                  onChange={e => setCustomTerms(e.target.value)}
                  onBlur={() => {
                    if (customTerms !== project.contractTerms) {
                      updateProject(project.id, { contractTerms: customTerms });
                      notify && notify('success', 'Contract terms updated');
                    }
                  }}
                  placeholder="Enter customized contract terms for this project. Leave blank to use the global template from Financial Settings."
                  style={{ width: '100%', minHeight: 100, padding: 12, background: `var(--bg-secondary)`, border: '1px solid var(--border-color)', borderRadius: 12, fontSize: 13, color: `var(--text-primary)`, fontFamily: 'inherit', resize: 'vertical' }}
                />
                <div style={{ fontSize: 11, color: `var(--text-secondary)`, marginTop: 6 }}>Leave blank to use the global template set in Admin → Financials → Contract Template.</div>
              </div>

              {showContractPreview && (
                <ContractPreviewModal
                  project={{ ...project, contractTerms: customTerms || project.contractTerms }}
                  brand={brand}
                  onClose={() => setShowContractPreview(false)}
                />
              )}
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
                const total = projInvoices.reduce((a, b) => a + (parseFloat(String(b.amount || b.total || 0).replace(/[^0-9.]/g, '')) || 0), 0);
                const paid = projInvoices.filter(i => isPaidStatus(i.status)).reduce((a, b) => a + (parseFloat(String(b.amount || b.total || 0).replace(/[^0-9.]/g, '')) || 0), 0);
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
                  const assignedTeam = [
                    ...(project.assignedWorkers || []),
                    ...(project.assignedStaff || []),
                    ...(project.projectManagerId ? [project.projectManagerId] : []),
                  ];
                  const isAssigned = assignedTeam.includes(m.id) || assignedTeam.includes(m.uid);
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
  const { isMobile } = useResponsive(); // ✅ CRITICAL FIX #7: Get responsive state
  const ac = brand?.color || `var(--accent-secondary)`;
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('board');
  const [focusFilter, setFocusFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [dragProject, setDragProject] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [openProject, setOpenProject] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [healthFilter, setHealthFilter] = useState('all');
  const [sortBy, setSortBy] = useState('risk');
  const [compact, setCompact] = useState(false);

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

  const filtered = (clients || []).filter(p => {
    const archived = p.status === 'Archived' || p.projectLifecycleStatus === 'Archived';
    if (archived && !showArchived) return false;
    const health = getProjectHealth(p, invoices);
    if (healthFilter !== 'all' && health.label !== healthFilter) return false;
    if (!search) return true;
    return (p.project || p.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.name || '').toLowerCase().includes(search.toLowerCase());
  }).sort((a, b) => {
    if (sortBy === 'stage') return (a.stageId || 1) - (b.stageId || 1);
    if (sortBy === 'value') return parseMoney(b.budget || b.projectTotal || b.amount) - parseMoney(a.budget || a.projectTotal || a.amount);
    const rank = { Blocked: 0, 'Waiting Client': 1, 'On Track': 2 };
    return rank[getProjectHealth(a, invoices).label] - rank[getProjectHealth(b, invoices).label];
  });

  const projectsByCol = {};
  KANBAN_COLS.forEach(col => {
    projectsByCol[col.id] = filtered.filter(p => col.stages.includes(p.stageId || 1));
  });

  const archivedProjects = clients.filter(p => p.status === 'Archived' || p.projectLifecycleStatus === 'Archived').length;
  const totalProjects = clients.length;
  const activeProjects = clients.filter(p => (p.stageId || 1) < 8 && p.status !== 'Archived' && p.projectLifecycleStatus !== 'Archived').length;
  const completedProjects = clients.filter(p => (p.stageId || 1) >= 8 && p.status !== 'Archived' && p.projectLifecycleStatus !== 'Archived').length;
  const healthStats = clients.reduce((acc, p) => {
    if (p.status === 'Archived' || p.projectLifecycleStatus === 'Archived') return acc;
    const label = getProjectHealth(p, invoices).label;
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});
  const capacity = 50;
  const capacityPct = Math.min(100, Math.round((activeProjects / capacity) * 100));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, minHeight: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 32, fontWeight: 400, fontFamily: 'var(--font-heading)', margin: 0 }}>Project Board</h2>
          <p style={{ color: `var(--text-secondary)`, fontSize: 13, margin: '4px 0 0' }}>Command board for stage gates, risk, capacity, assignments, and project movement.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button onClick={() => setShowArchived(p => !p)} style={{ height: 40, borderRadius: 12, border: '1px solid var(--border-color)', background: showArchived ? `var(--accent-secondary)` : '#fff', color: showArchived ? '#fff' : `var(--text-secondary)`, padding: '0 14px', fontSize: 11, fontWeight: 900, cursor: 'pointer' }}>
            {showArchived ? 'Hide Archived' : 'Show Archived'}
          </button>
          <button onClick={() => setViewMode(v => v === 'board' ? 'list' : 'board')} style={{ height: 40, borderRadius: 12, border: '1px solid var(--border-color)', background: '#fff', color: `var(--accent-secondary)`, padding: '0 14px', fontSize: 11, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
            {viewMode === 'board' ? <List size={14} /> : <LayoutGrid size={14} />} {viewMode === 'board' ? 'List View' : 'Board View'}
          </button>
          <button onClick={() => setCompact(c => !c)} style={{ height: 40, borderRadius: 12, border: '1px solid var(--border-color)', background: compact ? `var(--accent-secondary)` : '#fff', color: compact ? '#fff' : `var(--text-secondary)`, padding: '0 14px', fontSize: 11, fontWeight: 900, cursor: 'pointer' }}>
            {compact ? 'Comfort Cards' : 'Compact Cards'}
          </button>
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
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {[
          { label: 'Total', value: totalProjects, color: `var(--accent-secondary)` },
          { label: 'Active', value: activeProjects, color: '#2196F3' },
          { label: 'Blocked', value: blockedProjects, color: '#EF4444' },
          { label: 'Completed', value: completedProjects, color: '#16A34A' },
          { label: 'Blocked', value: healthStats.Blocked || 0, color: '#DC2626' },
          { label: 'Waiting', value: healthStats['Waiting Client'] || 0, color: '#D97706' },
          { label: 'Archived', value: archivedProjects, color: 'var(--muted)' },
        ].map(stat => (
          <div key={stat.label} style={{ padding: '12px 20px', background: '#fff', border: '1px solid var(--border-color)', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: stat.color }} />
            <span style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase' }}>{stat.label}</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: stat.color }}>{stat.value}</span>
          </div>
        ))}
      </div>
      {/* ✅ CRITICAL FIX #7: Responsive layout — stacks on mobile */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'minmax(260px, 1fr) 2fr', // Stacks to single column on mobile
        gap: 16
      }}>
        <div style={{ background: '#fff', border: '1px solid var(--border-color)', borderRadius: 16, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.08em' }}>50 Project Capacity</div>
            <div style={{ fontSize: 12, fontWeight: 900, color: capacityPct > 85 ? '#DC2626' : capacityPct > 70 ? '#D97706' : '#16A34A' }}>{capacityPct}%</div>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: `var(--bg-secondary)`, overflow: 'hidden' }}>
            <div style={{ width: `${capacityPct}%`, height: '100%', background: capacityPct > 85 ? '#DC2626' : capacityPct > 70 ? '#D97706' : '#16A34A' }} />
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: `var(--text-secondary)` }}>{activeProjects} active projects against recommended operating load.</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid var(--border-color)', borderRadius: 16, padding: 18, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Filter size={14} color="var(--text-secondary)" />
          <select className="p-inp" value={healthFilter} onChange={e => setHealthFilter(e.target.value)} style={{ height: 38, width: isMobile ? '100%' : 180, fontSize: 12 }}>
            <option value="all">All health states</option>
            <option value="Blocked">Blocked</option>
            <option value="Waiting Client">Waiting Client</option>
            <option value="On Track">On Track</option>
          </select>
          <select className="p-inp" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ height: 38, width: isMobile ? '100%' : 170, fontSize: 12 }}>
            <option value="risk">Sort by risk</option>
            <option value="stage">Sort by stage</option>
            <option value="value">Sort by value</option>
          </select>
          <div style={{ marginLeft: isMobile ? 0 : 'auto', display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: `var(--text-secondary)`, fontWeight: 800 }}>
            <ShieldCheck size={14} color="#16A34A" /> {filtered.length} visible projects
          </div>
        </div>
      </div>

      {/* Board */}
      {viewMode === 'board' ? (
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
              invoices={invoices}
              compact={compact}
            />
          ))}
        </div>
      ) : (
        <div className="p-card" style={{ overflow: 'hidden', border: '1px solid var(--border-color)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: `var(--bg-secondary)` }}>
              <tr>
                {['Project', 'Client', 'Stage', 'Health', 'Value', 'Next Action'].map(h => (
                  <th key={h} style={{ padding: '14px 18px', textAlign: 'left', fontSize: 10, fontWeight: 900, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.08em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(project => {
                const stage = STAGE_MAP[project.stageId || 1] || CLIENT_PROJECT_STAGES[0];
                const health = getProjectHealth(project, invoices);
                return (
                  <tr key={project.id} onClick={() => setOpenProject(project)} style={{ borderBottom: '1px solid var(--bg-secondary)', cursor: 'pointer' }}>
                    <td style={{ padding: '14px 18px', fontSize: 13, fontWeight: 800, color: `var(--accent-secondary)` }}>{project.project || project.title || 'Untitled'}</td>
                    <td style={{ padding: '14px 18px', fontSize: 12, color: `var(--text-secondary)` }}>{project.name || project.clientName || '—'}</td>
                    <td style={{ padding: '14px 18px', fontSize: 12, fontWeight: 800, color: stage.color }}>{stage.short}</td>
                    <td style={{ padding: '14px 18px' }}><span style={{ fontSize: 10, fontWeight: 900, color: health.color, background: health.bg, padding: '4px 9px', borderRadius: 999 }}>{health.label}</span></td>
                    <td style={{ padding: '14px 18px', fontSize: 12, fontWeight: 800 }}>{project.budget || project.projectTotal || '—'}</td>
                    <td style={{ padding: '14px 18px', fontSize: 12, color: `var(--text-secondary)`, maxWidth: 320 }}>{project.nextAction || health.reason}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {viewMode === 'board' ? (
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
      ) : (
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 18, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.4fr) minmax(160px, .9fr) minmax(150px, .8fr) minmax(180px, 1fr) minmax(150px, .8fr) 90px', gap: 16, padding: '14px 18px', background: '#F9FAFB', color: '#6B7280', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.08em' }}>
            <div>Project</div>
            <div>Stage</div>
            <div>Owner</div>
            <div>Next Action</div>
            <div>Budget</div>
            <div></div>
          </div>
          {filtered.length === 0 ? (
            <div style={{ padding: 36, textAlign: 'center', color: '#6B7280', fontSize: 13 }}>No projects match the current filters.</div>
          ) : filtered.map(project => {
            const stage = STAGE_MAP[project.stageId || 1] || CLIENT_PROJECT_STAGES[0];
            return (
              <button
                key={project.id}
                onClick={() => setOpenProject(project)}
                style={{
                  width: '100%',
                  display: 'grid',
                  gridTemplateColumns: 'minmax(220px, 1.4fr) minmax(160px, .9fr) minmax(150px, .8fr) minmax(180px, 1fr) minmax(150px, .8fr) 90px',
                  gap: 16,
                  padding: '16px 18px',
                  border: 'none',
                  borderTop: '1px solid #E5E7EB',
                  background: '#fff',
                  cursor: 'pointer',
                  alignItems: 'center',
                  textAlign: 'left',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{projectTitle(project)}</div>
                  <div style={{ fontSize: 11, color: '#6B7280', marginTop: 3 }}>{clientName(project)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: stage.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 800, color: stage.color }}>{stage.short}</span>
                </div>
                <div style={{ fontSize: 12, color: '#4B5563', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ownerLabel(project, teamMembers)}</div>
                <div style={{ fontSize: 12, color: isBlocked(project) ? '#EF4444' : '#4B5563', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {project.nextAction || (isWaitingOnClient(project) ? 'Client action required' : 'Internal update due')}
                </div>
                <div style={{ fontSize: 12, color: '#111827', fontWeight: 800 }}>{moneyLabel(project.budget || project.totalAmount)}</div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: ac, fontSize: 11, fontWeight: 900 }}>Open <ChevronRight size={13} /></span>
                </div>
              </button>
            );
          })}
        </div>
      )}

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
          brand={brand}
        />,
        document.body
      )}
    </div>
  );
}
