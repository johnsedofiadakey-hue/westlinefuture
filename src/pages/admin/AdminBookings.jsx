import React from 'react';
import { PAv, PSBadge } from '../../components/Shared';

export default function AdminBookings({ bookings = [], brand }) {
  const ac = brand.color || `var(--accent-secondary)`;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h2 className="lxfh" style={{ fontSize: 32, fontWeight: 400, color: `var(--accent-secondary)` }}>Bookings</h2>
      <div className="p-card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['ID', 'Client', 'Type', 'Date', 'Time', 'Status'].map(h => <th key={h} className="t-head">{h}</th>)}</tr></thead>
          <tbody>
            {bookings.map(b => (
              <tr key={b.id} className="t-row">
                <td style={{ padding: '12px 16px' }}><span style={{ fontFamily: 'monospace', color: ac }}>{b.id}</span></td>
                <td style={{ padding: '12px 16px' }}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><PAv i={b.av} s={28} c={ac} /><span className="lxf" style={{ fontSize: 13 }}>{b.client}</span></div></td>
                <td style={{ padding: '12px 16px' }}><span className="lxf" style={{ fontSize: 13 }}>{b.type}</span></td>
                <td style={{ padding: '12px 16px' }}><span className="lxf" style={{ fontSize: 13 }}>{b.date}</span></td>
                <td style={{ padding: '12px 16px' }}><span className="lxf" style={{ fontSize: 13 }}>{b.time}</span></td>
                <td style={{ padding: '12px 16px' }}><PSBadge s={b.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
