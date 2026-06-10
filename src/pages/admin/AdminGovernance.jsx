import React, { useState } from 'react';
import { FileText, User, Plus, X } from 'lucide-react';
import { PSBadge } from '../../components/Shared';

const APPROVAL_TYPES = [
  'Design Sign-off',
  'Material Selection',
  'Site Inspection',
  'Structural Change',
  'Scope Adjustment',
  'Final Handover',
  'Custom',
];

export default function AdminGovernance({ approvals = [], projects = [], brand, projectId, createApproval, updateApproval, ...props }) {
  const [filter, setFilter] = useState('pending');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: APPROVAL_TYPES[0], title: '', description: '' });
  const [saving, setSaving] = useState(false);
  const ac = brand?.color || `var(--accent-secondary)`;

  const visible = projectId
    ? (approvals || []).filter(a => a.projectId === projectId)
    : (approvals || []);

  const filtered = visible.filter(a => filter === 'all' || a.status?.toLowerCase() === filter);

  const handleCreate = async () => {
    if (!form.title.trim() || !projectId || !createApproval) return;
    setSaving(true);
    try {
      await createApproval(projectId, {
        type: form.type === 'Custom' ? form.title.trim() : form.type,
        title: form.title.trim(),
        description: form.description.trim(),
      });
      setForm({ type: APPROVAL_TYPES[0], title: '', description: '' });
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = async (id, status, apvProjectId) => {
    if (!updateApproval) return;
    await updateApproval(id, { status }, apvProjectId);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 className="lxfh" style={{ fontSize: 28, fontWeight: 400, color: `var(--accent-secondary)`, marginBottom: 4 }}>Approvals & Sign-offs</h2>
          <p style={{ fontSize: 13, color: '#666' }}>Request client sign-offs and track approval gates</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: '#eee', padding: 4, borderRadius: 10, gap: 4 }}>
            {['pending', 'approved', 'rejected', 'all'].map(s => (
              <button key={s} onClick={() => setFilter(s)} style={{ padding: '8px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', background: filter === s ? '#fff' : 'none', color: filter === s ? `var(--accent-secondary)` : '#888', boxShadow: filter === s ? '0 2px 8px rgba(0,0,0,.05)' : 'none', border: 'none', cursor: 'pointer' }}>{s}</button>
            ))}
          </div>
          {projectId && createApproval && (
            <button onClick={() => setShowForm(v => !v)} className="p-btn-dark" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', fontSize: 12 }}>
              <Plus size={14} /> New Approval Request
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <div className="p-card" style={{ padding: 24, border: `1.5px solid ${ac}30`, background: `${ac}06` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: `var(--accent-secondary)` }}>New Approval Request</div>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}><X size={16} /></button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: 6 }}>Type</div>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontSize: 13, background: '#fff', color: `var(--accent-secondary)` }}>
                {APPROVAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: 6 }}>Title / Reference</div>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Approve bedroom wardrobe design" style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: 6 }}>Description (optional)</div>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Additional context for the client..." rows={3} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowForm(false)} className="p-btn-light" style={{ padding: '10px 18px', fontSize: 13 }}>Cancel</button>
              <button onClick={handleCreate} disabled={saving || !form.title.trim()} className="p-btn-dark" style={{ padding: '10px 18px', fontSize: 13, opacity: saving || !form.title.trim() ? 0.6 : 1 }}>
                {saving ? 'Sending…' : 'Send to Client'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Reference', 'Type', 'Client', 'Date Requested', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '14px 20px', fontSize: 10, textTransform: 'uppercase', color: '#888', borderBottom: '1px solid #eee', fontWeight: 700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 48, textAlign: 'center', color: '#999', fontSize: 13 }}>
                {filter === 'pending' ? 'No pending approvals. Click "New Approval Request" to send one to the client.' : 'No items match this filter.'}
              </td></tr>
            ) : filtered.map(a => (
              <tr key={a.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                <td style={{ padding: '14px 20px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: `var(--accent-secondary)` }}>{a.title || a.projectTitle || 'General'}</div>
                  {a.description && <div style={{ fontSize: 11, color: '#999', marginTop: 2, maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.description}</div>}
                  <div style={{ fontSize: 10, color: '#bbb', fontFamily: 'monospace', marginTop: 2 }}>#{a.id?.slice(-6).toUpperCase()}</div>
                </td>
                <td style={{ padding: '14px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText size={13} color={ac} />
                    <span style={{ fontSize: 12 }}>{a.type || 'Sign-off'}</span>
                  </div>
                </td>
                <td style={{ padding: '14px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={12} color="#888" />
                    </div>
                    <span style={{ fontSize: 12 }}>{a.clientName || 'Client'}</span>
                  </div>
                </td>
                <td style={{ padding: '14px 20px', fontSize: 12, color: '#666' }}>
                  {a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                </td>
                <td style={{ padding: '14px 20px' }}>
                  <PSBadge s={a.status} />
                  {a.clientNote && (
                    <div style={{ fontSize: 11, color: '#666', marginTop: 4, fontStyle: 'italic', maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>"{a.clientNote}"</div>
                  )}
                </td>
                <td style={{ padding: '14px 20px' }}>
                  {a.status === 'pending' && updateApproval ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => handleStatus(a.id, 'approved', a.projectId)} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #BBF7D0', background: '#F0FDF4', color: '#15803D', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Approve</button>
                      <button onClick={() => handleStatus(a.id, 'rejected', a.projectId)} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Reject</button>
                    </div>
                  ) : (
                    <span style={{ fontSize: 11, color: '#999' }}>{a.status === 'approved' ? '✓ Done' : a.status === 'rejected' ? '✗ Rejected' : '—'}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
