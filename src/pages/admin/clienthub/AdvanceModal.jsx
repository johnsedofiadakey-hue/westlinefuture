import React, { useState, useContext } from 'react';
import { AppContext } from '../../../context/AppContext';
import { createPortal } from 'react-dom';
import { X, CheckCircle2, AlertCircle, ChevronDown, Loader2 } from 'lucide-react';
import { STAGE_ICONS } from './config.jsx';

// ─── Stage Advance Modal ──────────────────────────────────────────────────────
export function AdvanceModal({ project, stage, nextStage, invoices = [], onClose, onAdvance }) {
  const { user } = useContext(AppContext);
  const [note, setNote] = useState('');
  const [clientVisibleNote, setClientVisibleNote] = useState('');
  const [timelineStatus, setTimelineStatus] = useState(project.timelineStatus || 'On track');
  const [overrideDate, setOverrideDate] = useState('');
  const [approvalOverride, setApprovalOverride] = useState(false);
  const [verbalConsentNote, setVerbalConsentNote] = useState('');
  const [gateOverride, setGateOverride] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const needsApproval = nextStage?.needsClientApproval || nextStage?.whoActs === 'client' || stage?.needsClientApproval;
  const projectInvoices = (invoices || []).filter(inv => inv.parentId === project.id || inv.projectId === project.id);
  const invIsPaid = (status) => ['paid', 'paid in full'].includes(String(status || '').toLowerCase().trim());
  const hasPaidInvoice = (label) => projectInvoices.some(inv => {
    const title = `${inv.title || ''} ${inv.type || ''} ${inv.invoiceType || ''}`.toLowerCase();
    return title.includes(label) && invIsPaid(inv.status);
  });

  const gateChecks = [
    {
      id: 'rendering-fee',
      label: 'Rendering fee paid',
      applies: nextStage.id >= 2 && project.kickoffMode !== 'direct-kickoff',
      ok: !!project.renderingFeePaid,
    },
    {
      id: 'rendering-approved',
      label: 'Rendering/design approved',
      applies: nextStage.id >= 3 && project.kickoffMode !== 'direct-kickoff',
      ok: !!(project.renderingApproved || project.designApproved || project.renderingStatus === 'Approved'),
    },
    {
      id: 'quote-approved',
      label: 'Final quote approved',
      applies: nextStage.id >= 4,
      ok: !!(project.quoteApproved || project.quoteStatus === 'approved' || project.approvedQuoteId || project.depositPaid),
    },
    {
      id: 'contract-signed',
      label: 'Project agreement or specification signed by client',
      applies: nextStage.id >= 4,
      ok: !!(project.contractAccepted || project.quoteSignature || project.specDoc?.status === 'signed'),
    },
    {
      id: 'deposit-paid',
      label: 'Deposit paid',
      applies: nextStage.id >= 4,
      ok: !!(project.depositPaid || project.depositStatus === 'Paid' || hasPaidInvoice('deposit')),
    },
    {
      id: 'post-production-paid',
      label: 'Production milestone payment (30%) cleared by client',
      applies: nextStage.id >= 6,
      ok: !!(
        project.postProductionPaid ||
        projectInvoices.some(inv => {
          const key = (inv.milestoneKey || '').toLowerCase();
          const title = `${inv.title || ''} ${inv.type || ''}`.toLowerCase();
          return (key === 'post-production' || title.includes('production')) && invIsPaid(inv.status);
        })
      ),
    },
    {
      id: 'field-crew',
      label: 'Field crew assigned',
      applies: nextStage.id >= 6 && project.projectType !== 'buy-only',
      ok: (project.assignedWorkers || []).length > 0,
    },
    {
      id: 'final-settlement',
      label: 'Final payment cleared',
      applies: nextStage.id >= 8,
      ok: !!(project.finalPaymentPaid || project.finalSettlementPaid || hasPaidInvoice('final')),
    },
    {
      id: 'spec-doc-signed',
      label: 'Project specification must be client-approved before production',
      applies: nextStage.id >= 4 && !!project.specDoc?.url,
      ok: ['signed', 'approved'].includes(project.specDoc?.status),
    },
    {
      id: 'change-request-pending',
      label: 'Open change request — resolve before advancing',
      applies: !!project.changeRequestPending,
      ok: false,
    },
  ].filter(c => c.applies);

  const blockingChecks = gateChecks.filter(c => !c.ok);
  const allClear = blockingChecks.length === 0;
  const canAdvance = allClear || gateOverride;

  const submit = async () => {
    if (!canAdvance) return;
    setSaving(true);
    const verbalConsentRecord = approvalOverride ? {
      confirmedBy: user?.name || user?.displayName || 'Admin',
      confirmedAt: new Date().toISOString(),
      note: verbalConsentNote.trim() || 'Verbal consent obtained via phone/in-person.',
      method: 'verbal',
    } : null;
    const fullNote = [
      note,
      approvalOverride
        ? `Verbal consent recorded by ${verbalConsentRecord.confirmedBy}. ${verbalConsentRecord.note}`
        : '',
      gateOverride ? `Gate override: ${blockingChecks.map(c => c.label).join(', ')}` : '',
    ].filter(Boolean).join(' ');
    await onAdvance(project.id, nextStage.id, fullNote, {
      overrideDate: overrideDate || null,
      gateOverride,
      gateChecks,
      clientVisibleNote,
      timelineStatus,
      verbalConsent: verbalConsentRecord,
    });
    setSaving(false);
    onClose();
  };

  // Only block on the approval checkbox when data gates haven't passed — if all gates are
  // green, trust the data and don't require a redundant verbal-approval click.
  const isBlocked = (!allClear && !gateOverride) || (!allClear && needsApproval && !approvalOverride);

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 520, position: 'relative', boxShadow: '0 32px 80px rgba(0,0,0,.2)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={13} />
          </button>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>Move project to next stage</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--accent-secondary)' }}>{project.title}</div>
        </div>

        {/* Next Stage Pill */}
        <div style={{ padding: '16px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', background: `${nextStage.color}0D`, borderRadius: 12, border: `1.5px solid ${nextStage.color}30` }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${nextStage.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>
              {STAGE_ICONS[nextStage.id]}
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700, marginBottom: 1 }}>Moving to</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: nextStage.color }}>{nextStage.name}</div>
            </div>
            {allClear && (
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#16A34A' }}>
                <CheckCircle2 size={14} />
                Ready
              </div>
            )}
          </div>
        </div>

        {/* Blockers — only shown when something is wrong */}
        {blockingChecks.length > 0 && (
          <div style={{ padding: '0 28px 16px' }}>
            <div style={{ padding: '14px 16px', background: '#FFF5F5', borderRadius: 12, border: '1.5px solid #FECACA' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#991B1B', marginBottom: 10 }}>
                {blockingChecks.length === 1 ? '1 thing needs attention first' : `${blockingChecks.length} things need attention first`}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {blockingChecks.map(check => (
                  <div key={check.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <AlertCircle size={13} style={{ color: '#EF4444', flexShrink: 0, marginTop: 1 }} />
                    <div style={{ fontSize: 12, color: '#7F1D1D', lineHeight: 1.4 }}>{check.label}</div>
                  </div>
                ))}
              </div>
              <label style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #FECACA', display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={gateOverride} onChange={e => setGateOverride(e.target.checked)} style={{ marginTop: 2, flexShrink: 0, cursor: 'pointer' }} />
                <span style={{ fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>Override and advance anyway — this will be logged</span>
              </label>
            </div>
          </div>
        )}

        {/* Verbal consent panel — shown when client approval is needed */}
        {needsApproval && (
          <div style={{ padding: '0 28px 16px' }}>
            <div style={{ padding: '16px 18px', background: '#FFFBEB', borderRadius: 14, border: '1.5px solid #FDE68A' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 18 }}>📞</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#92400E' }}>Client approval required for this stage</div>
                  <div style={{ fontSize: 11, color: '#B45309', marginTop: 1 }}>If client isn't on the portal, record their verbal consent here</div>
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', marginBottom: approvalOverride ? 12 : 0 }}>
                <input type="checkbox" checked={approvalOverride} onChange={e => setApprovalOverride(e.target.checked)} style={{ marginTop: 3, flexShrink: 0, cursor: 'pointer', accentColor: '#D97706' }} />
                <span style={{ fontSize: 13, color: '#78350F', lineHeight: 1.5, fontWeight: 600 }}>
                  Client has given verbal consent — record and proceed on their behalf
                </span>
              </label>
              {approvalOverride && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 10, borderTop: '1px solid #FDE68A' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#92400E', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                    Consent note <span style={{ color: '#B45309' }}>(required for audit trail)</span>
                  </div>
                  <textarea
                    value={verbalConsentNote}
                    onChange={e => setVerbalConsentNote(e.target.value)}
                    placeholder="e.g. Called client at 3pm on 13 Jun — confirmed happy to proceed. Spoke with Mrs. Mensah."
                    rows={2}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #FCD34D', fontSize: 12, outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6, background: '#FEFCE8', color: '#78350F' }}
                  />
                  <div style={{ fontSize: 11, color: '#B45309', background: '#FEF3C7', borderRadius: 8, padding: '7px 10px', lineHeight: 1.5 }}>
                    This will be permanently logged under: <strong>{user?.name || 'Admin'}</strong> · {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Advanced Options (collapsed by default) */}
        <div style={{ padding: '0 28px 20px' }}>
          <button
            onClick={() => setShowAdvanced(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <ChevronDown size={13} style={{ transform: showAdvanced ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
            {showAdvanced ? 'Hide' : 'Add'} notes &amp; options
          </button>

          {showAdvanced && (
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>Internal note</label>
                <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add context for your team..." rows={2} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6 }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>Message to client</label>
                  <input value={clientVisibleNote} onChange={e => setClientVisibleNote(e.target.value)} placeholder="Optional update..." style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>Timeline</label>
                  <select value={timelineStatus} onChange={e => setTimelineStatus(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff' }}>
                    {['On track', 'At risk', 'Delayed', 'Waiting on client', 'Waiting on payment', 'Waiting on supplier', 'Completed'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>Backdate this transition</label>
                <input type="date" value={overrideDate} onChange={e => setOverrideDate(e.target.value)} max={new Date().toISOString().slice(0, 10)} style={{ padding: '9px 12px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontSize: 13, outline: 'none', fontFamily: 'inherit', color: overrideDate ? 'var(--accent-secondary)' : 'var(--text-secondary)' }} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 28px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ height: 44, paddingInline: 20, borderRadius: 10, border: '1.5px solid var(--border-color)', background: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
          <button
            onClick={submit}
            disabled={saving || isBlocked}
            style={{ flex: 1, height: 44, borderRadius: 10, background: isBlocked ? 'var(--border-color)' : nextStage.color, color: '#fff', border: 'none', fontSize: 14, fontWeight: 800, cursor: isBlocked ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background .15s' }}
          >
            {saving ? <><Loader2 size={14} className="spin" /> Advancing...</> : `Advance → ${nextStage.short}`}
          </button>
        </div>
      </div>
    </div>, document.body
  );
}
