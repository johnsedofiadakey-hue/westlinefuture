import React, { useState } from 'react';
import { Mail, Briefcase, User, MapPin, DollarSign, ShieldCheck, ChevronRight, X, Package, Search, Inbox, ArrowRight } from 'lucide-react';
import { PSBadge, PModal, FF as PFormField } from '../../components/Shared';

// Handle both Firestore Timestamp objects and plain strings/numbers
function formatDate(val) {
  if (!val) return '—';
  try {
    const d = val?.toDate ? val.toDate() : new Date(val);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return '—'; }
}

export default function AdminEmailCenter({ emails = [], projects = [], brand, ...props }) {
  const [convertTarget, setConvertTarget] = useState(null);
  const [conversionData, setConversionData] = useState({ title: '', site: '', budget: '', type: 'Commercial' });
  const [converting, setConverting] = useState(false);
  const [search, setSearch] = useState('');
  const ac = brand?.color || `var(--accent-secondary)`;

  const filtered = (emails || []).filter(e => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (e.fromName || '').toLowerCase().includes(q)
      || (e.fromEmail || '').toLowerCase().includes(q)
      || (e.subject || '').toLowerCase().includes(q)
      || (e.type || '').toLowerCase().includes(q);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="lxfh" style={{ fontSize: 32, fontWeight: 400, color: `var(--accent-secondary)`, marginBottom: 4 }}>Inquiry Pipeline</h2>
          <p className="lxf" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {emails.length} lead{emails.length !== 1 ? 's' : ''} — convert any inquiry into a live client project
          </p>
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input className="p-inp" placeholder="Search leads…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 34, width: 220 }} />
        </div>
      </div>

      <div className="p-card" style={{ overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '60px 40px', textAlign: 'center' }}>
            <Inbox size={40} color="var(--border-color)" style={{ marginBottom: 16 }} />
            <div className="lxfh" style={{ fontSize: 18, marginBottom: 8 }}>
              {emails.length === 0 ? 'No inquiries yet' : 'No results match your search'}
            </div>
            <p className="lxf" style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 360, margin: '0 auto' }}>
              {emails.length === 0
                ? 'Inquiries submitted via the Contact page or Products hub will appear here. You can convert any lead into a live project with one click.'
                : 'Try a different name, email, or subject.'}
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1.5px solid var(--border-color)' }}>
                {['Type', 'From', 'Subject', 'Status', 'Date', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px 20px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--text-secondary)', fontWeight: 800 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {e.type === 'Marketplace Order' || e.type === 'Material Inquiry'
                        ? <Package size={14} color="#16A34A" />
                        : <Mail size={14} color={ac} />}
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-secondary)' }}>{e.type || 'Inquiry'}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{e.fromName || '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{e.fromEmail || e.email || '—'}</div>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 13, maxWidth: 260 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.subject || '—'}</div>
                    {e.message && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.message}</div>}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <PSBadge s={e.status || 'New'} />
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {formatDate(e.createdAt)}
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    {e.status !== 'Converted' ? (
                      <button
                        onClick={() => {
                          setConvertTarget(e);
                          setConversionData({ title: e.subject?.replace(/inquiry:|enquiry:/gi, '').trim() || 'New Project', site: e.location || '', budget: '', type: 'Commercial' });
                        }}
                        className="p-btn-gold"
                        style={{ padding: '7px 14px', fontSize: 11, borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        Convert to Project <ArrowRight size={12} />
                      </button>
                    ) : (
                      <span style={{ fontSize: 11, color: '#16A34A', fontWeight: 800 }}>✓ Converted</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {convertTarget && (
        <PModal open={!!convertTarget} title="Convert Inquiry to Project" onClose={() => !converting && setConvertTarget(null)} w={820}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 32 }}>
            {/* Left — form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Lead identity */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 12, background: 'var(--bg-secondary)', border: '1.5px solid var(--border-color)' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: ac, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <User color="#fff" size={20} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>{convertTarget.fromName || 'Unknown'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{convertTarget.fromEmail || convertTarget.email || '—'}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <PFormField label="Project Title *">
                  <input className="p-inp" value={conversionData.title} onChange={e => setConversionData(d => ({ ...d, title: e.target.value }))} placeholder="e.g. Spintex Office Fit-out" />
                </PFormField>
                <PFormField label="Scope Type">
                  <select className="p-inp" value={conversionData.type} onChange={e => setConversionData(d => ({ ...d, type: e.target.value }))}>
                    {['Commercial', 'Residential', 'Industrial', 'Interior', 'Renovation'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </PFormField>
              </div>

              <PFormField label="Site Address / Location">
                <div style={{ position: 'relative' }}>
                  <MapPin size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input className="p-inp" style={{ paddingLeft: 34 }} placeholder="e.g. Spintex Road, Accra" value={conversionData.site} onChange={e => setConversionData(d => ({ ...d, site: e.target.value }))} />
                </div>
              </PFormField>

              <PFormField label="Estimated Budget (GH₵)">
                <input className="p-inp" type="number" placeholder="0.00" value={conversionData.budget} onChange={e => setConversionData(d => ({ ...d, budget: e.target.value }))} />
              </PFormField>

              {convertTarget.message && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--text-secondary)', marginBottom: 8 }}>Original Message</div>
                  <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--accent-secondary)', background: 'var(--bg-secondary)', padding: '14px 16px', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                    {convertTarget.message}
                  </div>
                </div>
              )}
            </div>

            {/* Right — what happens */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ padding: 20, borderRadius: 16, background: 'var(--accent-secondary)', color: '#fff' }}>
                <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.06em', marginBottom: 14, color: ac }}>WHAT HAPPENS NEXT</div>
                {[
                  { icon: <ShieldCheck size={16} color="#4ADE80" />, text: 'A client record is created and linked to this inquiry.' },
                  { icon: <Briefcase size={16} color={ac} />, text: 'A project is opened at Stage 1 with the details you entered.' },
                  { icon: <Mail size={16} color={ac} />, text: 'This inquiry is marked as Converted.' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'flex-start' }}>
                    {item.icon}
                    <div style={{ fontSize: 12, opacity: 0.85, lineHeight: 1.5 }}>{item.text}</div>
                  </div>
                ))}

                <button
                  onClick={async () => {
                    if (!conversionData.title.trim()) return;
                    setConverting(true);
                    try {
                      if (props.convertInquiry) {
                        await props.convertInquiry(convertTarget, conversionData.title, conversionData);
                      }
                      setConvertTarget(null);
                    } catch (e) {
                      console.error('Convert failed:', e);
                    } finally {
                      setConverting(false);
                    }
                  }}
                  disabled={converting || !conversionData.title.trim()}
                  style={{ width: '100%', marginTop: 8, padding: '13px 0', borderRadius: 12, border: 'none', background: ac, color: 'var(--accent-secondary)', fontSize: 14, fontWeight: 900, cursor: converting || !conversionData.title.trim() ? 'default' : 'pointer', opacity: converting || !conversionData.title.trim() ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  {converting ? 'Converting…' : <><ChevronRight size={16} /> Create Project</>}
                </button>
              </div>
            </div>
          </div>
        </PModal>
      )}
    </div>
  );
}
