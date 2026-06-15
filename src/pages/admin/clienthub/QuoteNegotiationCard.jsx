import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, FileText, Loader2, RefreshCw, Send } from 'lucide-react';

const quoteStatusColor = status => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'approved') return { background: '#F0FDF4', color: '#15803D', border: '#BBF7D0' };
  if (normalized === 'changes requested') return { background: '#FFF7ED', color: '#9A3412', border: '#FED7AA' };
  if (normalized === 'superseded') return { background: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' };
  return { background: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' };
};

const parseMoney = value => Number(String(value || '').replace(/[^0-9.]/g, '')) || 0;

export default function QuoteNegotiationCard({
  project,
  invoices = [],
  changeRequests = [],
  createQuoteVersion,
  notify,
}) {
  const quotations = useMemo(() => invoices
    .filter(invoice => {
      if (invoice.projectId !== project?.id && invoice.parentId !== project?.id) return false;
      const descriptor = `${invoice.type || ''} ${invoice.documentKind || ''}`.toLowerCase();
      return descriptor.includes('quotation') || descriptor.includes('quote');
    })
    .sort((a, b) => Number(b.version || 0) - Number(a.version || 0)), [invoices, project?.id]);

  const activeQuote = quotations.find(quote => quote.id === project?.activeQuoteId) || quotations[0] || null;
  const pendingRequest = changeRequests
    .filter(request =>
      request.projectId === project?.id &&
      String(request.type || '').toLowerCase() === 'quotation' &&
      String(request.status || '').toLowerCase() === 'pending'
    )
    .sort((a, b) => {
      const aTime = a.createdAt?.seconds || Date.parse(a.createdAt || 0) || 0;
      const bTime = b.createdAt?.seconds || Date.parse(b.createdAt || 0) || 0;
      return bTime - aTime;
    })[0];

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    total: '',
    title: '',
    scopeSummary: '',
    negotiationNote: '',
    paymentSchedule: project?.paymentSchedule || 'standard',
  });

  useEffect(() => {
    setForm({
      total: activeQuote?.total || activeQuote?.amount || project?.budget || project?.projectTotal || '',
      title: activeQuote
        ? `${project?.title || 'Project'} Quotation v${Number(activeQuote.version || 1) + 1}`
        : `${project?.title || 'Project'} Quotation`,
      scopeSummary: activeQuote?.scopeSummary || project?.description || '',
      negotiationNote: pendingRequest?.note || '',
      paymentSchedule: activeQuote?.paymentSchedule || project?.paymentSchedule || 'standard',
    });
  }, [
    activeQuote?.id,
    activeQuote?.version,
    pendingRequest?.id,
    project?.id,
    project?.budget,
    project?.projectTotal,
    project?.description,
    project?.paymentSchedule,
    project?.title,
  ]);

  const canIssue = project?.kickoffMode === 'direct-kickoff' ||
    project?.renderingApproved === true ||
    project?.designApproved === true ||
    String(project?.renderingStatus || '').toLowerCase() === 'approved';

  const submit = async () => {
    if (saving || !createQuoteVersion) return;
    const total = parseMoney(form.total);
    if (total <= 0) {
      notify?.('error', 'Enter the negotiated project total.');
      return;
    }
    if (!form.scopeSummary.trim()) {
      notify?.('error', 'Add a clear scope summary before sending the quotation.');
      return;
    }

    setSaving(true);
    try {
      const quoteId = await createQuoteVersion(project.id, {
        total,
        title: form.title.trim(),
        scopeSummary: form.scopeSummary.trim(),
        negotiationNote: form.negotiationNote.trim(),
        paymentSchedule: form.paymentSchedule,
      });
      if (quoteId) setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section style={{ padding: '22px 24px', background: '#fff', border: '1px solid var(--border-color)', borderRadius: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: '#F4EFE6', color: 'var(--accent-secondary)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <FileText size={18} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--accent-secondary)' }}>Quotation & Cost Negotiation</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55, marginTop: 3, maxWidth: 650 }}>
              Agree the project cost with the client, record the agreed scope, and issue a versioned quotation. Client approval unlocks the contract.
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowForm(value => !value)}
          disabled={!canIssue}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            padding: '10px 16px',
            borderRadius: 10,
            border: 'none',
            background: canIssue ? 'var(--accent-secondary)' : '#E5E7EB',
            color: canIssue ? '#fff' : '#9CA3AF',
            fontSize: 12,
            fontWeight: 800,
            cursor: canIssue ? 'pointer' : 'not-allowed',
          }}
        >
          {activeQuote ? <RefreshCw size={14} /> : <Send size={14} />}
          {activeQuote ? 'Issue Revised Quote' : 'Create Quotation'}
        </button>
      </div>

      {!canIssue && (
        <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 12, background: '#FFF7ED', border: '1px solid #FED7AA', color: '#9A3412', fontSize: 12, lineHeight: 1.5 }}>
          The final 3D rendering must be approved before commercial negotiation begins.
        </div>
      )}

      {pendingRequest && (
        <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: 14, background: '#FFF7ED', border: '1.5px solid #FDBA74' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#9A3412', fontSize: 12, fontWeight: 900, marginBottom: 6 }}>
            <RefreshCw size={14} /> Client requested a quotation revision
          </div>
          <div style={{ color: '#7C2D12', fontSize: 13, lineHeight: 1.55 }}>{pendingRequest.note}</div>
          <div style={{ color: '#9A3412', fontSize: 11, marginTop: 7 }}>
            Review the feedback, update the negotiated amount or scope, then issue a revised quotation.
          </div>
        </div>
      )}

      {activeQuote && (
        <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: 14, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--accent-secondary)' }}>
              {activeQuote.title || `Quotation v${activeQuote.version || 1}`}
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-secondary)' }}>
              Version {activeQuote.version || 1} · GHS {parseMoney(activeQuote.total || activeQuote.amount).toLocaleString()}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {String(activeQuote.status || '').toLowerCase() === 'approved' ? <CheckCircle2 size={15} color="#16A34A" /> : <Clock size={15} color="#2563EB" />}
            <span style={{ ...quoteStatusColor(activeQuote.status), borderStyle: 'solid', borderWidth: 1, borderRadius: 999, padding: '5px 10px', fontSize: 11, fontWeight: 900 }}>
              {activeQuote.status || 'Sent'}
            </span>
          </div>
        </div>
      )}

      {!activeQuote && canIssue && !showForm && (
        <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: 14, background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF', fontSize: 12, lineHeight: 1.55 }}>
          Start here: confirm the negotiated project total and scope, then send quotation v1 to the client.
        </div>
      )}

      {showForm && (
        <div style={{ marginTop: 18, padding: 18, borderRadius: 16, background: '#FCFAF7', border: '1px solid var(--border-color)', display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(180px, .7fr)', gap: 12 }}>
            <label style={{ display: 'grid', gap: 5, fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)' }}>
              QUOTATION TITLE
              <input className="p-inp" value={form.title} onChange={event => setForm(current => ({ ...current, title: event.target.value }))} />
            </label>
            <label style={{ display: 'grid', gap: 5, fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)' }}>
              NEGOTIATED TOTAL (GHS)
              <input className="p-inp" type="number" min="0" value={form.total} onChange={event => setForm(current => ({ ...current, total: event.target.value }))} />
            </label>
          </div>
          <label style={{ display: 'grid', gap: 5, fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)' }}>
            AGREED SCOPE SUMMARY
            <textarea
              className="p-inp"
              rows={4}
              value={form.scopeSummary}
              onChange={event => setForm(current => ({ ...current, scopeSummary: event.target.value }))}
              placeholder="Summarise the products, rooms, quantities, finishes, exclusions, and commercial assumptions covered by this amount."
              style={{ resize: 'vertical' }}
            />
          </label>
          <label style={{ display: 'grid', gap: 5, fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)' }}>
            NEGOTIATION NOTE
            <input
              className="p-inp"
              value={form.negotiationNote}
              onChange={event => setForm(current => ({ ...current, negotiationNote: event.target.value }))}
              placeholder="Record agreed discounts, exclusions, or the reason for this revision."
            />
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={() => setShowForm(false)} style={{ padding: '10px 15px', borderRadius: 10, border: '1px solid var(--border-color)', background: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={saving}
              style={{ padding: '10px 17px', borderRadius: 10, border: 'none', background: 'var(--accent-secondary)', color: '#fff', fontSize: 12, fontWeight: 900, cursor: saving ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, opacity: saving ? .7 : 1 }}
            >
              {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
              {activeQuote ? 'Send Revised Quotation' : 'Send Quotation'}
            </button>
          </div>
        </div>
      )}

      {quotations.length > 1 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--text-secondary)', letterSpacing: '.07em', marginBottom: 8 }}>VERSION HISTORY</div>
          <div style={{ display: 'grid', gap: 7 }}>
            {quotations.map(quote => (
              <div key={quote.id} style={{ padding: '9px 11px', borderRadius: 10, border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 11 }}>
                <span style={{ fontWeight: 800, color: 'var(--accent-secondary)' }}>v{quote.version || 1} · GHS {parseMoney(quote.total || quote.amount).toLocaleString()}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{quote.status || 'Sent'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
