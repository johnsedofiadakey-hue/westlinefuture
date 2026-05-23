import React, { useState } from 'react';
import { 
  Plus, Search, ShoppingCart, Truck,
  MapPin, CheckCircle, Package, Globe,
  MoreVertical, FileText, AlertTriangle, Printer
} from 'lucide-react';
import { PAv, SBadge, Modal } from '../../components/Shared';
import SignaturePad from '../../components/SignaturePad';

export default function ProjectProcurement({ clients = [], procurements = [], brand, ...props }) {
  const ac = brand.color || `var(--accent-secondary)`;
  const [activeProjectId, setActiveProjectId] = useState(clients[0]?.id);
  const [filter, setFilter] = useState('All');
  const [selectedIds, setSelectedIds] = useState([]);
  const [showPO, setShowPO] = useState(false);
  const [handoverItem, setHandoverItem] = useState(null);

  const [myProcs, setMyProcs] = useState((procurements || []).map(p => ({
    ...p,
    unitCost: p.unitCost || (Math.random() * 500 + 100).toFixed(2),
    containerId: p.containerId || 'C-101'
  })));

  const activeProcs = myProcs.filter(p => p.parentId === activeProjectId);
  const filtered = activeProcs.filter(p => filter === 'All' || p.status === filter);

  const handleToggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const stats = [
    { label: 'To Order', count: myProcs.filter(p => p.status === 'To Buy').length, color: `var(--text-secondary)` },
    { label: 'In Transit', count: myProcs.filter(p => p.status === 'Shipped' || p.status === 'In Transit').length, color: ac },
    { label: 'At Site', count: myProcs.filter(p => p.status === 'Received').length, color: '#16A34A' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
           <h2 className="lxfh" style={{ fontSize: 32, fontWeight: 400 }}>Operational Procurement</h2>
           <p className="lxf" style={{ color: `var(--text-secondary)`, fontSize: 13 }}>Tracking every component from global source to final site arrival.</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
           <select 
             className="p-inp" style={{ width: 240, height: 44, fontSize: 13, fontWeight: 600 }}
             value={activeProjectId} onChange={e => setActiveProjectId(e.target.value)}
           >
              {clients.map(p => <option key={p.id} value={p.id}>{p.project || p.title}</option>)}
           </select>
           {selectedIds.length > 0 && (
             <button onClick={() => setShowPO(true)} className="p-btn-gold lxf" style={{ padding: '10px 20px', borderRadius: 12 }}>
                <FileText size={16} /> Generate PO ({selectedIds.length})
             </button>
           )}
           <button className="p-btn-dark lxf" style={{ padding: '10px 20px' }}><Plus size={16} /> New Item</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
         {stats.map(s => (
           <div key={s.label} className="p-card" style={{ padding: 20, textAlign: 'center' }}>
              <div className="lxf" style={{ fontSize: 11, color: `var(--text-secondary)`, textTransform: 'uppercase', marginBottom: 4 }}>{s.label}</div>
              <div className="lxfh" style={{ fontSize: 32, fontWeight: 400, color: s.color }}>{s.count}</div>
           </div>
         ))}
      </div>

      <div className="p-card" style={{ overflow: 'hidden' }}>
         <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 12 }}>
               {['All', 'To Buy', 'Ordered', 'Shipped', 'Received'].map(f => (
                 <button 
                   key={f} onClick={() => setFilter(f)} 
                   className={`lxf ${filter === f ? 'active' : ''}`}
                   style={{ background: 'none', border: 'none', fontSize: 12, fontWeight: 600, color: filter === f ? ac : `var(--text-secondary)`, cursor: 'pointer', paddingBottom: 4, borderBottom: filter === f ? `2px solid ${ac}` : '2px solid transparent' }}
                 >{f}</button>
               ))}
            </div>
            <div style={{ position: 'relative' }}>
               <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: `var(--text-secondary)` }} />
               <input className="p-inp" placeholder="Search items..." style={{ paddingLeft: 30, height: 32, fontSize: 12, width: 180 }} />
            </div>
         </div>
         <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th className="t-head" style={{ width: 40 }}></th>
              {['Component', 'Unit Cost', 'Origin/Vendor', 'Logistics Type', 'Status', 'Site Arrival', 'Action'].map(h => <th key={h} className="t-head">{h}</th>)}
            </tr></thead>
            <tbody>
               {filtered.map(p => (
                 <tr key={p.id} className="t-row">
                    <td style={{ padding: '14px 16px' }}>
                       <input 
                         type="checkbox" 
                         checked={selectedIds.includes(p.id)} 
                         onChange={() => handleToggleSelect(p.id)}
                         style={{ width: 16, height: 16, cursor: 'pointer' }}
                       />
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                       <div className="lxf" style={{ fontSize: 13, fontWeight: 600 }}>{p.item || p.itemName}</div>
                       <div style={{ fontSize: 11, color: `var(--text-secondary)` }}>ID: {p.id.slice(-6).toUpperCase()}</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                       <div className="lxf" style={{ fontSize: 13, fontWeight: 700 }}>${p.unitCost}</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}><div className="lxf" style={{ fontSize: 12 }}>{p.supplier || p.source}</div></td>
                    <td style={{ padding: '14px 16px' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {p.type === 'International' ? <Globe size={12} color={ac} /> : <ShoppingCart size={12} color="#16A34A" />}
                          <span className="lxf" style={{ fontSize: 12 }}>{p.type || 'Local'}</span>
                       </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}><SBadge s={p.status} /></td>
                    <td style={{ padding: '14px 16px' }}>
                       <div className="lxf" style={{ fontSize: 12, color: `var(--accent-secondary)`, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Truck size={14} color="var(--text-secondary)" /> {p.eta || 'TBD'}
                       </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                       <button 
                         onClick={() => p.status === 'Shipped' ? setHandoverItem(p) : null}
                         className="lxf" style={{ background: 'none', border: 'none', color: ac, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                       >
                         {p.status === 'Shipped' ? 'Mark Received' : 'Update Status'}
                       </button>
                    </td>
                 </tr>
               ))}
               {filtered.length === 0 && <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: `var(--text-secondary)` }}>No procurement items listed for this project.</td></tr>}
            </tbody>
         </table>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 400px', gap: 20 }}>
         <div className="p-card" style={{ padding: 24, borderLeft: `4px solid ${ac}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
               <AlertTriangle size={24} color={ac} />
               <h3 className="lxfh" style={{ fontSize: 18 }}>Lead Time Advisory</h3>
            </div>
            <p className="lxf" style={{ fontSize: 14, color: `var(--text-secondary)`, lineHeight: 1.6 }}>Based on current shipping congestion in the Gulf of Guinea, all <b>International Glass Components</b> should be ordered at least 45 days before the completion of "Production" phase to ensure site readiness.</p>
         </div>
         <div className="p-card" style={{ padding: 24 }}>
            <h4 className="lxf" style={{ fontSize: 13, textTransform: 'uppercase', color: `var(--text-secondary)`, marginBottom: 16 }}>Logistics Signature Logs</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
               {[
                 { time: '2 hrs ago', text: 'Abena M. received 4x Glass Hinges at Site 10A.', actor: 'AD' },
                 { time: 'Yesterday', text: 'Main facade panels cleared customs.', actor: 'KO' }
               ].map((log, i) => (
                 <div key={i} style={{ display: 'flex', gap: 12 }}>
                    <PAv i={log.actor} s={24} c={ac} />
                    <div>
                       <div style={{ fontSize: 12, fontWeight: 500 }}>{log.text}</div>
                       <div style={{ fontSize: 10, color: `var(--text-secondary)` }}>{log.time}</div>
                    </div>
                 </div>
               ))}
            </div>
         </div>
      </div>

      {/* PO MODAL */}
      {showPO && (
        <div className="overlay-modal" onClick={() => setShowPO(false)}>
           <div className="modal-box lxf" style={{ maxWidth: 800, padding: 48 }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--accent-secondary)', paddingBottom: 20, marginBottom: 40 }}>
                 <div>
                    <h1 className="lxfh" style={{ fontSize: 32 }}>PURCHASE ORDER</h1>
                    <div style={{ fontSize: 12, color: `var(--text-secondary)` }}>WESTLINE FUTURE GLOBAL TRADING CO., LTD.</div>
                 </div>
                 <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800 }}>PO-{Math.floor(Math.random() * 100000)}</div>
                    <div style={{ fontSize: 12 }}>DATE: {new Date().toLocaleDateString()}</div>
                 </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginBottom: 40 }}>
                 <div>
                    <div style={{ fontSize: 10, color: `var(--text-secondary)`, textTransform: 'uppercase', marginBottom: 8 }}>Internal/Supplier</div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{activeProcs.find(i => selectedIds.includes(i.id))?.supplier || 'Multiple Vendors'}</div>
                 </div>
                 <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: `var(--text-secondary)`, textTransform: 'uppercase', marginBottom: 8 }}>Project Reference</div>
                    <div style={{ fontSize: 14 }}>{clients.find(c => c.id === activeProjectId)?.project}</div>
                 </div>
              </div>
              <table style={{ width: '100%', marginBottom: 40 }}>
                 <thead style={{ background: `var(--bg-secondary)` }}><tr style={{ textAlign: 'left' }}><th style={{ padding: 12 }}>Component List</th><th style={{ padding: 12, textAlign: 'right' }}>Specs</th><th style={{ padding: 12, textAlign: 'right' }}>Unit Cost</th></tr></thead>
                 <tbody>
                    {activeProcs.filter(p => selectedIds.includes(p.id)).map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: 12 }}>{p.item}</td><td style={{ padding: 12, textAlign: 'right' }}>{p.type}</td><td style={{ padding: 12, textAlign: 'right', fontWeight: 700 }}>${p.unitCost}</td></tr>
                    ))}
                    <tr style={{ background: `var(--bg-secondary)` }}>
                       <td colSpan={2} style={{ padding: 12, fontWeight: 800 }}>TOTAL (USD)</td>
                       <td style={{ padding: 12, textAlign: 'right', fontWeight: 800 }}>${activeProcs.filter(p => selectedIds.includes(p.id)).reduce((acc, curr) => acc + parseFloat(curr.unitCost), 0).toFixed(2)}</td>
                    </tr>
                 </tbody>
              </table>
              <div style={{ fontSize: 11, color: `var(--text-secondary)`, lineHeight: 1.6 }}><b>Terms:</b> Prices for internal operational tracking. Lead times to follow the standard contract agreement (45 days).</div>
              <button className="p-btn-dark lxf" style={{ marginTop: 40, width: '100%', padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }} onClick={() => window.print()}><Printer size={16} /> Print/Save as PDF</button>
           </div>
        </div>
      )}

      {/* HANDOVER MODAL */}
      {handoverItem && (
        <div className="overlay-modal" onClick={() => setHandoverItem(null)}>
           <div className="modal-box lxf" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
              <h3 className="lxfh" style={{ fontSize: 24, marginBottom: 8 }}>Site Handover</h3>
              <p className="lxf" style={{ color: `var(--text-secondary)`, fontSize: 14, marginBottom: 24 }}>Confirm delivery of <b>{handoverItem.item}</b> at site. Signature required for custody transfer.</p>
              <SignaturePad 
                onSave={(sig) => {
                  setMyProcs(myProcs.map(p => p.id === handoverItem.id ? { ...p, status: 'Received', signature: sig, handoverAt: new Date().toISOString() } : p));
                  setHandoverItem(null);
                }}
                onClear={() => {}}
                ac={ac}
              />
           </div>
        </div>
      )}
    </div>
  );
}
