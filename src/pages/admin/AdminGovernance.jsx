import React, { useState } from 'react';
import { ShieldCheck, FileText, Clock, CheckCircle, XCircle, AlertCircle, ChevronRight, User } from 'lucide-react';
import { PSBadge } from '../../components/Shared';

export default function AdminGovernance({ approvals = [], projects = [], brand, ...props }) {
  const [filter, setFilter] = useState('pending');
  const ac = brand?.color || `var(--accent-secondary)`;

  const filtered = (approvals || []).filter(a => filter === 'all' || a.status?.toLowerCase() === filter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 className="lxfh" style={{ fontSize: 32, fontWeight: 400, color: `var(--accent-secondary)`, marginBottom: 4 }}>Governance & Approvals</h2>
          <p style={{ fontSize: 13, color: '#666' }}>Critical path sign-offs and change request management</p>
        </div>
        <div style={{ display: 'flex', background: '#eee', padding: 4, borderRadius: 10, gap: 4 }}>
          {['pending', 'approved', 'rejected', 'all'].map(s => (
            <button 
              key={s}
              onClick={() => setFilter(s)}
              style={{ 
                padding: '8px 16px', borderRadius: 8, fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                background: filter === s ? '#fff' : 'none',
                color: filter === s ? `var(--accent-secondary)` : '#888',
                boxShadow: filter === s ? '0 2px 8px rgba(0,0,0,.05)' : 'none',
                border: 'none', cursor: 'pointer'
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="p-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Project / Reference', 'Sign-off Type', 'Stakeholder', 'Date Requested', 'Status', 'Actions'].map(h => (
                <th key={h} className="t-head" style={{ textAlign: 'left', padding: '16px 24px', fontSize: 10, textTransform: 'uppercase', color: '#888', borderBottom: '1px solid #eee' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#999', fontSize: 13 }}>No items matching filter</td></tr>
            ) : filtered.map(a => (
              <tr key={a.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{a.projectTitle || 'General'}</span>
                    <span style={{ fontSize: 10, color: '#999', fontFamily: 'monospace' }}>#{a.id?.slice(-6).toUpperCase()}</span>
                  </div>
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText size={14} color={ac} />
                    <span style={{ fontSize: 12 }}>{a.type || 'Standard Sign-off'}</span>
                  </div>
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={12} color="#888" />
                    </div>
                    <span style={{ fontSize: 12 }}>{a.clientName || 'Client'}</span>
                  </div>
                </td>
                <td style={{ padding: '16px 24px', fontSize: 12, color: '#666' }}>{new Date(a.createdAt).toLocaleDateString()}</td>
                <td style={{ padding: '16px 24px' }}>
                  <PSBadge s={a.status} />
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <button className="p-btn-white" style={{ padding: '6px 12px', fontSize: 11, borderRadius: 6 }}>Review Audit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
