import React, { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download, TrendingUp, Users, DollarSign, Activity } from 'lucide-react';
import { CLIENT_PROJECT_STAGES } from '../../data';

function exportCSV(rows, filename) {
  const header = Object.keys(rows[0] || {}).join(',');
  const body = rows.map(r => Object.values(r).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([header + '\n' + body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function AdminAnalytics({ invoices = [], transactions = [], clients = [], brand }) {
  const ac = brand?.color || '#0F766E';

  const currentYear = new Date().getFullYear();
  const availableYears = useMemo(() => {
    const years = new Set([currentYear]);
    [...transactions, ...invoices].forEach(row => {
      const date = row.createdAt?.toDate?.() || (row.date ? new Date(row.date) : null);
      if (date && !isNaN(date)) years.add(date.getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [invoices, transactions, currentYear]);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedQuarter, setSelectedQuarter] = useState('All');

  const quarterMonths = { 'Q1': [0,1,2], 'Q2': [3,4,5], 'Q3': [6,7,8], 'Q4': [9,10,11] };

  const revenueData = useMemo(() => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const map = {};
    const paymentRows = transactions.length > 0 ? transactions : invoices;
    paymentRows.forEach(row => {
      const date = row.createdAt?.toDate?.() || (row.date ? new Date(row.date) : null);
      if (!date || isNaN(date)) return;
      if (date.getFullYear() !== selectedYear) return;
      const monthIdx = date.getMonth();
      if (selectedQuarter !== 'All' && !quarterMonths[selectedQuarter].includes(monthIdx)) return;
      const key = months[monthIdx];
      const amount = parseFloat(String(row.amount || '0').replace(/[^0-9.]/g, '')) || 0;
      if (!map[key]) map[key] = { month: key, revenue: 0, paid: 0 };
      map[key].revenue += amount;
      const isPaid = transactions.length > 0 ? true : row.status === 'Paid';
      if (isPaid) map[key].paid += amount;
    });
    const filtered = selectedQuarter !== 'All' ? quarterMonths[selectedQuarter].map(i => months[i]) : months;
    return filtered.map(m => map[m] || { month: m, revenue: 0, paid: 0 });
  }, [invoices, transactions, selectedYear, selectedQuarter]);

  const stageData = useMemo(() => {
    const map = {};
    clients.forEach(c => {
      const stageObj = CLIENT_PROJECT_STAGES.find(s => s.id === (c.stageId || 0));
      const stage = stageObj?.short || stageObj?.name || c.stage || c.status || 'No Stage';
      map[stage] = (map[stage] || 0) + 1;
    });
    // Sort by stage order
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => {
        const ai = CLIENT_PROJECT_STAGES.findIndex(s => s.short === a.name || s.name === a.name);
        const bi = CLIENT_PROJECT_STAGES.findIndex(s => s.short === b.name || s.name === b.name);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      });
  }, [clients]);

  // Use actual received payments (transactions) when available, else fall back to paid invoices
  const totalRevenue = transactions.length > 0
    ? transactions.reduce((a, b) => a + (parseFloat(String(b.amount || '0').replace(/[^0-9.]/g, '')) || 0), 0)
    : invoices.filter(i => i.status === 'Paid').reduce((a, b) => a + (parseFloat(String(b.amount || '0').replace(/[^0-9.]/g, '')) || 0), 0);

  const pendingRevenue = clients
    .filter(p => p.budget && (p.stageId || 0) < 7)
    .reduce((a, b) => {
      const budget = parseFloat(String(b.budget || '0').replace(/[^0-9.]/g, '')) || 0;
      const paid = parseFloat(String(b.paidAmount || '0').replace(/[^0-9.]/g, '')) || 0;
      return a + Math.max(0, budget - paid);
    }, 0);

  const COLORS = [ac, '#111827', '#6B7280', '#4B5563', '#607D8B', '#16A34A'];

  const handleExportRevenue = () => {
    exportCSV(revenueData, 'revenue_by_month.csv');
  };

  const handleExportInvoices = () => {
    if (!invoices.length) return;
    exportCSV(invoices.map(inv => ({
      id: inv.id || '',
      client: inv.client || inv.clientName || '',
      date: inv.date || '',
      currency: inv.currency || 'GHS',
      amount: inv.amount || '',
      status: inv.status || '',
      type: inv.type || 'Invoice'
    })), 'invoices_export.csv');
  };

  return (
    <div className="fade-in" style={{ padding: '20px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
        <div>
          <h2 className="lxfh" style={{ fontSize: 28, fontWeight: 700, color: '#111827' }}>Business Analytics</h2>
          <p className="lxf" style={{ color: '#6B7280', fontSize: 13, marginTop: 4 }}>Revenue trends, project pipeline, and operational metrics.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            style={{ height: 38, borderRadius: 10, border: '1px solid #E5E7EB', padding: '0 12px', fontSize: 12, fontWeight: 700, background: '#fff', color: '#111827', cursor: 'pointer' }}
          >
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <div style={{ display: 'flex', borderRadius: 10, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
            {['All', 'Q1', 'Q2', 'Q3', 'Q4'].map(q => (
              <button
                key={q}
                onClick={() => setSelectedQuarter(q)}
                style={{ padding: '8px 14px', border: 'none', borderRight: q !== 'Q4' ? '1px solid #E5E7EB' : 'none', background: selectedQuarter === q ? '#111827' : '#fff', color: selectedQuarter === q ? '#fff' : '#4B5563', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}
              >{q}</button>
            ))}
          </div>
          <button onClick={handleExportRevenue} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#111827' }}>
            <Download size={14} /> Revenue CSV
          </button>
          <button onClick={handleExportInvoices} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#111827', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#fff' }}>
            <Download size={14} /> Invoice Export
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20, marginBottom: 32 }}>
        {[
          { label: 'Total Revenue', value: `GH₵${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: <DollarSign size={20} />, dark: true },
          { label: 'Outstanding', value: `GH₵${pendingRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: <TrendingUp size={20} /> },
          { label: 'Active Projects', value: clients.filter(c => (c.stageId || 0) < 7).length, icon: <Users size={20} /> },
          { label: 'Total Projects', value: clients.length, icon: <Activity size={20} /> },
        ].map(card => (
          <div key={card.label} className="p-card" style={{ padding: 20, border: '1px solid #E5E7EB', background: card.dark ? '#111827' : '#fff', color: card.dark ? '#fff' : '#111827' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', opacity: card.dark ? 0.5 : 0.6 }}>{card.label}</div>
              <div style={{ color: ac }}>{card.icon}</div>
            </div>
            <div className="lxfh" style={{ fontSize: 28, fontWeight: 900, color: card.dark ? ac : '#111827' }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 32 }}>
        {/* REVENUE CHART */}
        <div className="p-card" style={{ padding: 24, border: '1px solid #E5E7EB', background: '#fff' }}>
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
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" stroke="#6B7280" fontSize={11} />
                <YAxis stroke="#6B7280" fontSize={11} tickFormatter={v => `GH₵${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => [`GH₵${v.toLocaleString()}`, 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke={ac} strokeWidth={2} fillOpacity={1} fill="url(#revGrad)" />
                <Area type="monotone" dataKey="paid" stroke="#16A34A" strokeWidth={2} strokeDasharray="4 2" fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', gap: 20, marginTop: 12, fontSize: 11, color: '#6B7280' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 12, height: 2, background: ac }} /> Total Invoiced</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 12, height: 2, background: '#16A34A', borderTop: '2px dashed #16A34A' }} /> Paid</div>
          </div>
        </div>

        {/* PROJECTS BY STAGE */}
        <div className="p-card" style={{ padding: 24, border: '1px solid #E5E7EB', background: '#fff' }}>
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
            <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', fontSize: 13 }}>
              No project data yet
            </div>
          )}
        </div>
      </div>

      {/* INVOICE TABLE */}
      <div className="p-card" style={{ border: '1px solid #E5E7EB', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="lxfh" style={{ fontSize: 16, margin: 0 }}>Invoice Ledger</h3>
          <button onClick={handleExportInvoices} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
            <Download size={13} /> Export CSV
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#F9FAFB' }}>
              <tr>
                {['Reference', 'Client', 'Date', 'Amount', 'Status'].map(h => (
                  <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: 10, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.1em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.slice(0, 10).map(inv => (
                <tr key={inv.id} style={{ borderBottom: '1px solid #F9FAFB' }}>
                  <td style={{ padding: '14px 20px', fontSize: 12, fontWeight: 800 }}>{inv.id}</td>
                  <td style={{ padding: '14px 20px', fontSize: 13 }}>{inv.client || inv.clientName || '—'}</td>
                  <td style={{ padding: '14px 20px', fontSize: 12, color: '#6B7280' }}>{inv.date || '—'}</td>
                  <td style={{ padding: '14px 20px', fontSize: 14, fontWeight: 700 }}>{inv.amount ? (String(inv.amount).startsWith('GH') || String(inv.amount).startsWith('$') ? inv.amount : `GH₵${Number(inv.amount).toLocaleString()}`) : '—'}</td>
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
                <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#6B7280', fontSize: 13 }}>No invoices to display</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
