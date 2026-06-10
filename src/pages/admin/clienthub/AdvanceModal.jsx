import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { STAGE_ICONS } from './config.jsx';

// ─── Stage Advance Modal ──────────────────────────────────────────────────────
export function AdvanceModal({ project, stage, nextStage, invoices = [], onClose, onAdvance }) {
  const [note, setNote] = useState('');
  const [clientVisibleNote, setClientVisibleNote] = useState('');
  const [timelineStatus, setTimelineStatus] = useState(project.timelineStatus || 'On track');
  const [overrideDate, setOverrideDate] = useState('');
  const [approvalOverride, setApprovalOverride] = useState(false);
  const [gateOverride, setGateOverride] = useState(false);
  const [saving, setSaving] = useState(false);
  const needsApproval = stage?.needsClientApproval || stage?.whoActs === 'client';
  const projectInvoices = (invoices || []).filter(inv => inv.parentId === project.id || inv.projectId === project.id);
  const invIsPaid = (status) => ['paid', 'paid in full'].includes(String(status || '').toLowerCase().trim());
  const hasPaidInvoice = (label) => projectInvoices.some(inv => {
    const title = `${inv.title || ''} ${inv.type || ''} ${inv.invoiceType || ''}`.toLowerCase();
    return title.includes(label) && invIsPaid(inv.status);
  });
  const gateChecks = [
    {
      id: 'rendering-fee',
      label: 'Rendering/CAD fee configured',
      applies: nextStage.id >= 2 && project.kickoffMode !== 'direct-kickoff',
      ok: !!project.renderingFee || !!project.renderingFeeInvoiceId,
    },
    {
      id: 'rendering-approved',
      label: 'Rendering/design approved or admin-confirmed',
      applies: nextStage.id >= 3 && project.kickoffMode !== 'direct-kickoff',
      ok: !!(project.renderingApproved || project.designApproved || project.renderingStatus === 'Approved'),
    },
    {
      id: 'quote-approved',
      label: 'Final quote approved',
      applies: nextStage.id >= 4,
      ok: !!(project.quoteApproved || project.quoteStatus === 'approved' || project.approvedQuoteId),
    },
    {
      id: 'contract-signed',
      label: 'Client contract signed',
      applies: nextStage.id >= 4,
      ok: !!(project.contractAccepted || project.quoteSignature),
    },
    {
      id: 'deposit-paid',
      label: 'Project deposit paid or verified',
      applies: nextStage.id >= 4,
      ok: !!(project.depositPaid || project.depositStatus === 'Paid' || hasPaidInvoice('deposit')),
    },
    {
      id: 'field-crew',
      label: 'Field crew assigned before installation',
      applies: nextStage.id >= 6,
      ok: (project.assignedWorkers || []).length > 0,
    },
    {
      id: 'final-settlement',
      label: 'Final settlement cleared before handover',
      applies: nextStage.id >= 8,
      ok: !!(project.finalPaymentPaid || project.finalSettlementPaid || hasPaidInvoice('final')),
    },
    {
      id: 'spec-doc-pending',
      label: 'Spec/brief document awaiting client approval — client must approve before production begins',
      applies: nextStage.id >= 4 && !!project.specDoc?.url && project.specDoc?.status === 'pending',
      ok: false,
    },
    {
      id: 'change-request-pending',
      label: 'Open change request — resolve all pins and click "Mark Change Complete" before advancing',
      applies: !!project.changeRequestPending,
      ok: false,
    },
  ].filter(c => c.applies);
  const blockingChecks = gateChecks.filter(c => !c.ok);
  const canAdvance = blockingChecks.length === 0 || gateOverride;

  const submit = async () => {
    if (!canAdvance) return;
    setSaving(true);
    const fullNote = [
      note,
      approvalOverride ? 'Client approval confirmed verbally / informally — proceeding by admin override.' : '',
      gateOverride ? `Gate override used for: ${blockingChecks.map(c => c.label).join(', ')}` : '',
    ].filter(Boolean).join(' ');
    await onAdvance(project.id, nextStage.id, fullNote, {
      overrideDate: overrideDate || null,
      gateOverride,
      gateChecks,
      clientVisibleNote,
      timelineStatus,
    });
    setSaving(false);
    onClose();
  };

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 620, padding: 36, position: 'relative', boxShadow: '0 32px 80px rgba(0,0,0,.2)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border-color)', background: `var(--bg-secondary)`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
        <div style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>Advance Stage</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: `var(--accent-secondary)`, marginBottom: 4 }}>{project.title}</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', background: `var(--bg-secondary)`, borderRadius: 14, margin: '20px 0', border: `1px solid ${nextStage.color}30` }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `${nextStage.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {STAGE_ICONS[nextStage.id]}
          </div>
          <div>
            <div style={{ fontSize: 11, color: `var(--text-secondary)`, fontWeight: 700 }}>Moving to</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: nextStage.color }}>{nextStage.name}</div>
            <div style={{ fontSize: 12, color: `var(--text-secondary)`, marginTop: 2 }}>{nextStage.adminPrompt}</div>
          </div>
        </div>

        {gateChecks.length > 0 && (
          <div style={{ marginBottom: 18, padding: '14px 16px', background: '#F8F8FD', borderRadius: 12, border: '1.5px solid var(--border-color)' }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: `var(--accent-secondary)`, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>Stage Gate Review</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {gateChecks.map(check => (
                <div key={check.id} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: check.ok ? '#16A34A' : '#FEF2F2', color: check.ok ? '#fff' : '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {check.ok ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                  </div>
                  <div style={{ fontSize: 12, color: check.ok ? `var(--accent-secondary)` : '#991B1B', fontWeight: check.ok ? 800 : 700 }}>{check.label}</div>
                </div>
              ))}
            </div>
            {blockingChecks.length > 0 && (
              <label style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={gateOverride} onChange={e => setGateOverride(e.target.checked)} style={{ marginTop: 2, width: 16, height: 16, flexShrink: 0, cursor: 'pointer' }} />
                <span style={{ fontSize: 12, color: '#78350F', lineHeight: 1.5, fontWeight: 700 }}>
                  Proceed with admin override. This will be logged on the stage history.
                </span>
              </label>
            )}
          </div>
        )}

        {/* Client approval override (shown when current stage requires client action) */}
        {needsApproval && (
          <div style={{ marginBottom: 18, padding: '14px 16px', background: '#FFFBEB', borderRadius: 12, border: '1.5px solid #FDE68A' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#92400E', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>
              ⚠ This stage normally requires client approval
            </div>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={approvalOverride}
                onChange={e => setApprovalOverride(e.target.checked)}
                style={{ marginTop: 2, width: 16, height: 16, flexShrink: 0, cursor: 'pointer' }}
              />
              <span style={{ fontSize: 13, color: '#78350F', lineHeight: 1.5 }}>
                Client has already approved (verbally or informally). Proceed by admin override and log this in the project record.
              </span>
            </label>
          </div>
        )}

        {/* Internal note */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 8 }}>Internal Note (optional)</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add context for your team about this stage transition..." rows={3} style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid var(--border-color)', fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6 }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 8 }}>Client-visible note</label>
            <input value={clientVisibleNote} onChange={e => setClientVisibleNote(e.target.value)} placeholder="Optional client-friendly update..." style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 8 }}>Timeline status</label>
            <select value={timelineStatus} onChange={e => setTimelineStatus(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff' }}>
              {['On track', 'At risk', 'Delayed', 'Waiting on client', 'Waiting on payment', 'Waiting on supplier', 'Completed'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Backdate this stage transition */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 8 }}>
            <Calendar size={11} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
            Backdate transition (optional)
          </label>
          <input
            type="date"
            value={overrideDate}
            onChange={e => setOverrideDate(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            style={{ padding: '9px 12px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontSize: 13, outline: 'none', fontFamily: 'inherit', color: overrideDate ? `var(--accent-secondary)` : `var(--text-secondary)` }}
          />
          {overrideDate && (
            <div style={{ fontSize: 11, color: `var(--text-secondary)`, marginTop: 5 }}>Stage will be recorded as occurring on {overrideDate}</div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, height: 48, borderRadius: 12, border: '1.5px solid var(--border-color)', background: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
          <button
            onClick={submit}
            disabled={saving || (needsApproval && !approvalOverride) || !canAdvance}
            style={{ flex: 2, height: 48, borderRadius: 12, background: ((needsApproval && !approvalOverride) || !canAdvance) ? `var(--border-color)` : nextStage.color, color: '#fff', border: 'none', fontSize: 14, fontWeight: 800, cursor: ((needsApproval && !approvalOverride) || !canAdvance) ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background .2s' }}
          >
            {saving ? <><Loader2 size={15} className="spin" /> Advancing...</> : `Advance → ${nextStage.short}`}
          </button>
        </div>
      </div>
    </div>, document.body
  );
}
