import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download, TrendingUp, Users, DollarSign, Activity } from 'lucide-react';

function exportCSV(rows, filename) {
  const header = Object.keys(rows[0] || {}).join(',');
  const body = rows.map(r => Object.values(r).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([header + '\n' + body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function AdminAnalytics({ invoices = [], clients = [], brand }) {
  const ac = brand?.color || '#231F78';

  const revenueData = useMemo(() => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const map = {};
    invoices.forEach(inv => {
      const date = inv.createdAt?.toDate?.() || (inv.date ? new Date(inv.date) : null);
      if (!date) return;
      const key = months[date.getMonth()];
      const amount = parseFloat(String(inv.amount || '0').replace(/[^0-9.]/g, '')) || 0;
      if (!map[key]) map[key] = { month: key, revenue: 0, paid: 0 };
      map[key].revenue += amount;
      if (inv.status === 'Paid') map[key].paid += amount;
    });
    const result = months.map(m => map[m] || { month: m, revenue: 0, paid: 0 });
    const lastNonZero = result.reduce((last, r, i) => r.revenue > 0 ? i : last, -1);
    return lastNonZero >= 0 ? result.slice(0, lastNonZero + 1) : result.slice(0, 6);
  }, [invoices]);

  const stageData = useMemo(() => {
    const map = {};
    clients.forEach(c => {
      const stage = c.stage || c.status || 'Unknown';
      map[stage] = (map[stage] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [clients]);

  const totalRevenue = invoices.filter(i => i.status === 'Paid')
    .reduce((a, b) => a + (parseFloat(String(b.amount || '0').replace(/[^0-9.]/g, '')) || 0), 0);

  const pendingRevenue = invoices.filter(i => i.status === 'Pending')
    .reduce((a, b) => a + (parseFloat(String(b.amount || '0').replace(/[^0-9.]/g, '')) || 0), 0);

  const COLORS = [ac, '#0D0B2E', '#9B99C8', '#5B5894', '#607D8B', '#16A34A'];

  const handleExportRevenue = () => {
    exportCSV(revenueData, 'revenue_by_month.csv');
  };

  const handleExportInvoices = () => {
    if (!invoices.length) return;
    exportCSV(invoices.map(inv => ({
      id: inv.id || '',
      client: inv.client || inv.clientName || '',
      date: inv.date || '',
      currency: inv.currency || 'USD',
      amount: inv.amount || '',
      status: inv.status || '',
      type: inv.type || 'Invoice'
    })), 'invoices_export.csv');
  };

  return (
    <div className="fade-in" style={{ padding: '20px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
        <div>
          <h2 className="lxfh" style={{ fontSize: 28, fontWeight: 700, color: '#0D0B2E' }}>Business Analytics</h2>
          <p className="lxf" style={{ color: '#9B99C8', fontSize: 13, marginTop: 4 }}>Revenue trends, project pipeline, and operational metrics.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleExportRevenue} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#fff', border: '1px solid #F0EBE5', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#0D0B2E' }}>
            <Download size={14} /> Revenue CSV
          </button>
          <button onClick={handleExportInvoices} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#0D0B2E', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#fff' }}>
            <Download size={14} /> Invoice Export
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20, marginBottom: 32 }}>
        {[
          { label: 'Total Revenue', value: `$${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: <DollarSign size={20} />, dark: true },
          { label: 'Pending Invoices', value: `$${pendingRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: <TrendingUp size={20} /> },
          { label: 'Active Clients', value: clients.length, icon: <Users size={20} /> },
          { label: 'Total Invoices', value: invoices.length, icon: <Activity size={20} /> },
        ].map(card => (
          <div key={card.label} className="p-card" style={{ padding: 20, border: '1px solid #F0EBE5', background: card.dark ? '#0D0B2E' : '#fff', color: card.dark ? '#fff' : '#0D0B2E' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', opacity: card.dark ? 0.5 : 0.6 }}>{card.label}</div>
              <div style={{ color: ac }}>{card.icon}</div>
            </div>
            <div className="lxfh" style={{ fontSize: 28, fontWeight: 900, color: card.dark ? ac : '#0D0B2E' }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 32 }}>
        {/* REVENUE CHART */}
        <div className="p-card" style={{ padding: 24, border: '1px solid #F0EBE5', background: '#fff' }}>
          <h3 className="lxfh" style={{ fontSize: 16, marginBottom: 20 }}>Revenue by Month</h3>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={ac} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={ac} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0EBE5" />
                <XAxis dataKey="month" stroke="#9B99C8" fontSize={11} />
                <YAxis stroke="#9B99C8" fontSize={11} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => [`$${v.toLocaleString()}`, 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke={ac} strokeWidth={2} fillOpacity={1} fill="url(#revGrad)" />
                <Area type="monotone" dataKey="paid" stroke="#16A34A" strokeWidth={2} strokeDasharray="4 2" fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', gap: 20, marginTop: 12, fontSize: 11, color: '#9B99C8' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 12, height: 2, background: ac }} /> Total Invoiced</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 12, height: 2, background: '#16A34A', borderTop: '2px dashed #16A34A' }} /> Paid</div>
          </div>
        </div>

        {/* PROJECTS BY STAGE */}
        <div className="p-card" style={{ padding: 24, border: '1px solid #F0EBE5', background: '#fff' }}>
          <h3 className="lxfh" style={{ fontSize: 16, marginBottom: 20 }}>Projects by Stage</h3>
          {stageData.length > 0 ? (
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={stageData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {stageData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9B99C8', fontSize: 13 }}>
              No project data yet
            </div>
          )}
        </div>
      </div>

      {/* INVOICE TABLE */}
      <div className="p-card" style={{ border: '1px solid #F0EBE5', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #F0EBE5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="lxfh" style={{ fontSize: 16, margin: 0 }}>Invoice Ledger</h3>
          <button onClick={handleExportInvoices} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#F4F4FA', border: '1px solid #F0EBE5', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
            <Download size={13} /> Export CSV
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#F4F4FA' }}>
              <tr>
                {['Reference', 'Client', 'Date', 'Amount', 'Status'].map(h => (
                  <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: 10, color: '#9B99C8', textTransform: 'uppercase', letterSpacing: '.1em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.slice(0, 10).map(inv => (
                <tr key={inv.id} style={{ borderBottom: '1px solid #F4F4FA' }}>
                  <td style={{ padding: '14px 20px', fontSize: 12, fontWeight: 800 }}>{inv.id}</td>
                  <td style={{ padding: '14px 20px', fontSize: 13 }}>{inv.client || inv.clientName || '—'}</td>
                  <td style={{ padding: '14px 20px', fontSize: 12, color: '#9B99C8' }}>{inv.date || '—'}</td>
                  <td style={{ padding: '14px 20px', fontSize: 14, fontWeight: 700 }}>{inv.amount || '—'}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 800,
                      background: inv.status === 'Paid' ? '#DCFCE7' : inv.status === 'Pending' ? '#FEF9C3' : '#F3F4F6',
                      color: inv.status === 'Paid' ? '#16A34A' : inv.status === 'Pending' ? '#CA8A04' : '#6B7280'
                    }}>{inv.status}</span>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#9B99C8', fontSize: 13 }}>No invoices to display</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
