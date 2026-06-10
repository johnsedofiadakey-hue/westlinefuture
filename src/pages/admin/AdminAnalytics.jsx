import React, { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download, TrendingUp, Users, DollarSign, Activity, Receipt, FileText } from 'lucide-react';
import { CLIENT_PROJECT_STAGES } from '../../data';
import { isPaidStatus } from '../../components/Shared';

// Format money values to fit inside narrow KPI cards
// ≥1M → "1.2M", ≥1k → "222.5k", else full number
function fmtMoney(val) {
  const n = Number(val) || 0;
  if (n >= 1_000_000) return `GH₵${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000)    return `GH₵${(n / 1_000).toFixed(1)}k`;
  if (n >= 1_000)     return `GH₵${(n / 1_000).toFixed(2)}k`;
  return `GH₵${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function exportCSV(rows, filename) {
  const header = Object.keys(rows[0] || {}).join(',');
  const body = rows.map(r => Object.values(r).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([header + '\n' + body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function AdminAnalytics({ invoices = [], transactions = [], clients = [], proposals = [], teamMembers = [], brand }) {
  const ac = brand?.color || `var(--accent-secondary)`;

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
      const isPaid = transactions.length > 0 ? true : isPaidStatus(row.status);
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
    : invoices.filter(i => isPaidStatus(i.status)).reduce((a, b) => a + (parseFloat(String(b.amount || '0').replace(/[^0-9.]/g, '')) || 0), 0);

  const pendingRevenue = clients
    .filter(p => p.budget && (p.stageId || 0) < 7)
    .reduce((a, b) => {
      const budget = parseFloat(String(b.budget || '0').replace(/[^0-9.]/g, '')) || 0;
      const paid = parseFloat(String(b.paidAmount || '0').replace(/[^0-9.]/g, '')) || 0;
      return a + Math.max(0, budget - paid);
    }, 0);

  const moneyValue = (row) => parseFloat(String(row?.total ?? row?.amount ?? '0').replace(/[^0-9.]/g, '')) || 0;
  const oneTimeRevenue = invoices
    .filter(i => i.oneTimeClient || i.customerType === 'one-time' || (!i.projectId && !i.parentId && (i.type === 'Receipt' || i.documentKind === 'receipt')))
    .reduce((a, b) => a + moneyValue(b), 0);
  const projectRevenue = Math.max(0, totalRevenue - oneTimeRevenue);
  const openQuoteValue = proposals
    .filter(p => String(p.status || '').toLowerCase() === 'pending')
    .reduce((a, b) => a + moneyValue(b), 0);
  const paidInvoices = invoices.filter(i => String(i.status || '').toLowerCase() === 'paid').length;
  const quoteConversion = proposals.length ? Math.round((paidInvoices / Math.max(1, proposals.length)) * 100) : 0;
  const activeStaff = teamMembers.filter(m => m.status !== 'Inactive').length;
  const workers = teamMembers.filter(m => m.role === 'worker' || ['Field Worker', 'Technician', 'Senior Technician'].includes(m.jobRole)).length;
  const revenueMix = [
    { name: 'Project Revenue', value: projectRevenue },
    { name: 'One-Time Sales', value: oneTimeRevenue },
  ].filter(row => row.value > 0);

  const COLORS = [ac, `var(--accent-secondary)`, `var(--text-secondary)`, `var(--text-secondary)`, '#607D8B', '#16A34A'];

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
          <h2 className="lxfh" style={{ fontSize: 28, fontWeight: 700, color: `var(--accent-secondary)` }}>Business Analytics</h2>
          <p className="lxf" style={{ color: `var(--text-secondary)`, fontSize: 13, marginTop: 4 }}>Revenue trends, project pipeline, and operational metrics.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            style={{ height: 38, borderRadius: 10, border: '1px solid var(--border-color)', padding: '0 12px', fontSize: 12, fontWeight: 700, background: '#fff', color: `var(--accent-secondary)`, cursor: 'pointer' }}
          >
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <div style={{ display: 'flex', borderRadius: 10, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            {['All', 'Q1', 'Q2', 'Q3', 'Q4'].map(q => (
              <button
                key={q}
                onClick={() => setSelectedQuarter(q)}
                style={{ padding: '8px 14px', border: 'none', borderRight: q !== 'Q4' ? '1px solid var(--border-color)' : 'none', background: selectedQuarter === q ? `var(--accent-secondary)` : '#fff', color: selectedQuarter === q ? '#fff' : `var(--text-secondary)`, fontSize: 11, fontWeight: 800, cursor: 'pointer' }}
              >{q}</button>
            ))}
          </div>
          <button onClick={handleExportRevenue} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#fff', border: '1px solid var(--border-color)', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', color: `var(--accent-secondary)` }}>
            <Download size={14} /> Revenue CSV
          </button>
          <button onClick={handleExportInvoices} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: `var(--accent-secondary)`, border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#fff' }}>
            <Download size={14} /> Invoice Export
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Total Revenue',    value: fmtMoney(totalRevenue),                               raw: totalRevenue,    icon: <DollarSign size={18} />, dark: true },
          { label: 'Outstanding',      value: fmtMoney(pendingRevenue),                             raw: pendingRevenue,  icon: <TrendingUp size={18} /> },
          { label: 'Active Projects',  value: clients.filter(c => (c.stageId || 0) < 7).length,    raw: null,            icon: <Users size={18} /> },
          { label: 'Open Quotes',      value: fmtMoney(openQuoteValue),                             raw: openQuoteValue,  icon: <FileText size={18} /> },
          { label: 'One-Time Sales',   value: fmtMoney(oneTimeRevenue),                             raw: oneTimeRevenue,  icon: <Receipt size={18} /> },
          { label: 'Active Staff',     value: activeStaff,                                           raw: null,            icon: <Users size={18} /> },
          { label: 'Field Workers',    value: workers,                                               raw: null,            icon: <Activity size={18} /> },
        ].map(card => (
          <div
            key={card.label}
            className="p-card"
            title={card.raw != null ? `GH₵${Number(card.raw).toLocaleString()}` : undefined}
            style={{
              padding: '18px 16px', minWidth: 0, overflow: 'hidden',
              border: '1px solid var(--border-color)',
              background: card.dark ? `var(--accent-secondary)` : '#fff',
              color: card.dark ? '#fff' : `var(--accent-secondary)`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 4 }}>
              <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', opacity: card.dark ? 0.55 : 0.6, lineHeight: 1.3 }}>{card.label}</div>
              <div style={{ color: ac, flexShrink: 0 }}>{card.icon}</div>
            </div>
            <div
              className="lxfh"
              style={{
                fontSize: 'clamp(17px, 1.6vw, 26px)',
                fontWeight: 900,
                color: card.dark ? ac : `var(--accent-secondary)`,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                letterSpacing: '-0.02em',
              }}
            >
              {card.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 32 }}>
        {/* REVENUE CHART */}
        <div className="p-card" style={{ padding: 24, border: '1px solid var(--border-color)', background: '#fff' }}>
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
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="month" stroke="var(--text-secondary)" fontSize={11} />
                <YAxis stroke="var(--text-secondary)" fontSize={11} tickFormatter={v => `GH₵${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => [`GH₵${v.toLocaleString()}`, 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke={ac} strokeWidth={2} fillOpacity={1} fill="url(#revGrad)" />
                <Area type="monotone" dataKey="paid" stroke="#16A34A" strokeWidth={2} strokeDasharray="4 2" fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', gap: 20, marginTop: 12, fontSize: 11, color: `var(--text-secondary)` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 12, height: 2, background: ac }} /> Total Invoiced</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 12, height: 2, background: '#16A34A', borderTop: '2px dashed #16A34A' }} /> Paid</div>
          </div>
        </div>

        {/* REVENUE MIX */}
        <div className="p-card" style={{ padding: 24, border: '1px solid var(--border-color)', background: '#fff' }}>
          <h3 className="lxfh" style={{ fontSize: 16, marginBottom: 20 }}>Revenue Mix</h3>
          {revenueMix.length > 0 ? (
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={revenueMix} cx="50%" cy="50%" innerRadius={65} outerRadius={105} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {revenueMix.map((_, index) => <Cell key={index} fill={index === 0 ? ac : '#16A34A'} />)}
                  </Pie>
                  <Tooltip formatter={(v) => `GH₵${Number(v).toLocaleString()}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: `var(--text-secondary)`, fontSize: 13 }}>
              No paid revenue mix yet
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <div style={{ padding: 14, background: `var(--bg-secondary)`, borderRadius: 12, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase' }}>Quote Conversion</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: `var(--accent-secondary)`, marginTop: 4 }}>{quoteConversion}%</div>
            </div>
            <div style={{ padding: 14, background: `var(--bg-secondary)`, borderRadius: 12, minWidth: 0, overflow: 'hidden' }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase' }}>Open Quote Value</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: `var(--accent-secondary)`, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={`GH₵${openQuoteValue.toLocaleString()}`}>
                {fmtMoney(openQuoteValue)}
              </div>
            </div>
          </div>
        </div>

        {/* PROJECTS BY STAGE */}
        <div className="p-card" style={{ padding: 24, border: '1px solid var(--border-color)', background: '#fff' }}>
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
            <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: `var(--text-secondary)`, fontSize: 13 }}>
              No project data yet
            </div>
          )}
        </div>
      </div>

      {/* INVOICE TABLE */}
      <div className="p-card" style={{ border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="lxfh" style={{ fontSize: 16, margin: 0 }}>Invoice Ledger</h3>
          <button onClick={handleExportInvoices} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: `var(--bg-secondary)`, border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
            <Download size={13} /> Export CSV
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: `var(--bg-secondary)` }}>
              <tr>
                {['Reference', 'Client', 'Date', 'Amount', 'Status'].map(h => (
                  <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: 10, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.1em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.slice(0, 10).map(inv => (
                <tr key={inv.id} style={{ borderBottom: '1px solid var(--bg-secondary)' }}>
                  <td style={{ padding: '14px 20px', fontSize: 12, fontWeight: 800 }}>{inv.id}</td>
                  <td style={{ padding: '14px 20px', fontSize: 13 }}>{inv.client || inv.clientName || '—'}</td>
                  <td style={{ padding: '14px 20px', fontSize: 12, color: `var(--text-secondary)` }}>{inv.date || '—'}</td>
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
                <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: `var(--text-secondary)`, fontSize: 13 }}>No invoices to display</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
