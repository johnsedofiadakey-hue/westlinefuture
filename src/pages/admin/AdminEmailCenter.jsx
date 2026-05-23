import React, { useState } from 'react';
import { Mail, Briefcase, User, MapPin, DollarSign, ShieldCheck, ChevronRight, X, Package, Search } from 'lucide-react';
import { PSBadge, PModal, FF as PFormField } from '../../components/Shared';

export default function AdminEmailCenter({ emails = [], projects = [], brand, ...props }) {
  const [convertTarget, setConvertTarget] = useState(null);
  const [conversionData, setConversionData] = useState({ title: '', site: '', budget: '', type: 'Commercial' });
  const ac = brand?.color || `var(--accent-secondary)`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 className="lxfh" style={{ fontSize: 32, fontWeight: 400, color: `var(--accent-secondary)`, marginBottom: 4 }}>Inquiry Pipeline</h2>
          <p style={{ fontSize: 13, color: '#666' }}>Lead-to-Project provisioning dashboard</p>
        </div>
      </div>

      <div className="p-card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['ID', 'Type', 'To/From', 'Subject', 'Status', 'Sent At', 'Actions'].map(h => (
                <th key={h} className="t-head" style={{ textAlign: 'left', padding: '16px 20px', fontSize: 10, textTransform: 'uppercase', color: '#888', borderBottom: '1px solid #eee' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(emails || []).map(e => (
              <tr key={e.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                <td style={{ padding: '16px 20px', fontSize: 11, color: '#999', fontFamily: 'monospace' }}>{e.id?.slice(-6).toUpperCase()}</td>
                <td style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {e.type === 'Marketplace Order' ? <Package size={14} color="#16A34A" /> : <Mail size={14} color="var(--accent-secondary)" />}
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{e.type || 'Inquiry'}</span>
                  </div>
                </td>
                <td style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{e.fromName}</span>
                    <span style={{ fontSize: 11, color: '#666' }}>{e.fromEmail}</span>
                  </div>
                </td>
                <td style={{ padding: '16px 20px', fontSize: 13 }}>{e.subject}</td>
                <td style={{ padding: '16px 20px' }}>
                  <PSBadge s={e.status} />
                </td>
                <td style={{ padding: '16px 20px', fontSize: 12, color: '#666' }}>{new Date(e.createdAt).toLocaleDateString()}</td>
                <td style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {e.status !== 'Converted' && (
                      <button 
                        onClick={() => {
                          setConvertTarget(e);
                          setConversionData({ ...conversionData, title: e.subject?.replace('Inquiry: ', '') || 'New Project' });
                        }}
                        className="p-btn-gold" 
                        style={{ padding: '6px 12px', fontSize: 11, borderRadius: 6 }}
                      >
                        Provision Project
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {convertTarget && (
        <PModal open={!!convertTarget} title="Industrial Lead Provisioning" onClose={() => setConvertTarget(null)} w={1000}>
           <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 40 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                 <div style={{ background: `var(--bg-secondary)`, padding: 24, borderRadius: 20, border: '1px solid #C5C3EC' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                       <div style={{ width: 40, height: 40, borderRadius: 12, background: `var(--accent-secondary)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <User color="var(--accent-secondary)" size={20} />
                       </div>
                       <div>
                          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: '#888' }}>Lead Identity</div>
                          <div style={{ fontSize: 16, fontWeight: 700 }}>{convertTarget.fromName}</div>
                       </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                       <PFormField label="Project Title">
                          <input className="p-inp" value={conversionData.title} onChange={v => setConversionData({...conversionData, title: v.target.value})} />
                       </PFormField>
                       <PFormField label="Scope Type">
                          <select className="p-inp" value={conversionData.type} onChange={v => setConversionData({...conversionData, type: v.target.value})}>
                             {['Commercial', 'Residential', 'Industrial', 'Interior'].map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                       </PFormField>
                    </div>
                    <PFormField label="Site Address / Location">
                       <div style={{ position: 'relative' }}>
                          <MapPin size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                          <input className="p-inp" style={{ paddingLeft: 40 }} placeholder="e.g. Spintex Road, Accra" value={conversionData.site} onChange={v => setConversionData({...conversionData, site: v.target.value})} />
                       </div>
                    </PFormField>
                 </div>

                 <div style={{ padding: '0 12px' }}>
                    <h5 style={{ fontSize: 12, fontWeight: 700, marginBottom: 12 }}>INQUIRY CONTEXT</h5>
                    <div style={{ fontSize: 13, lineHeight: 1.6, color: '#444', background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #eee' }}>
                       {convertTarget.message || 'No additional message provided.'}
                    </div>
                 </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                 <div className="p-card" style={{ padding: 24, background: `var(--accent-secondary)`, color: '#fff', borderRadius: 24 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 800, marginBottom: 16, color: ac }}>AUTOMATION TRIGGER</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                       {[
                         { icon: <ShieldCheck size={18} color="#16A34A" />, text: 'Secure B2B Client Portal will be provisioned instantly.' },
                         { icon: <Mail size={18} color={ac} />, text: 'Onboarding email with login credentials will be dispatched.' },
                         { icon: <Briefcase size={18} color={ac} />, text: 'Project folder & initial procurement pipeline created.' }
                       ].map((item, idx) => (
                         <div key={idx} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                            {item.icon}
                            <div style={{ fontSize: 11, opacity: 0.7 }}>{item.text}</div>
                         </div>
                       ))}
                    </div>
                    <button 
                       onClick={async () => {
                          if (props.convertInquiry) {
                             await props.convertInquiry(convertTarget, conversionData.title, conversionData);
                          }
                          setConvertTarget(null);
                       }}
                       className="p-btn-gold" 
                       style={{ width: '100%', marginTop: 24, padding: 14, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
                    >
                       Initialize Ecosystem <ChevronRight size={18} />
                    </button>
                 </div>
              </div>
           </div>
        </PModal>
      )}
    </div>
  );
}
