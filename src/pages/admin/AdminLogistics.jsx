import React, { useState } from 'react';
import { 
  Plus, Truck, Package, ChevronDown, ChevronUp, X,
  Wrench, Scan, MapPin, Box, Anchor, Ship, ShieldAlert,
  Download, ExternalLink, Share2, FileText, CheckCircle2, Clock
} from 'lucide-react';
import { FF as PFormField, PSBadge, isPaidStatus } from '../../components/Shared';
import EmptyState from '../../components/ui/EmptyState';

const LOGISTICS_MILESTONES = [
  { id: 'Dispatched', label: 'Supplier', icon: <Package size={14} /> },
  { id: 'Warehouse', label: 'Warehouse', icon: <Box size={14} /> },
  { id: 'Sea', label: 'On Sea', icon: <Ship size={14} /> },
  { id: 'Customs', label: 'Customs', icon: <Anchor size={14} /> },
  { id: 'Local', label: 'Local Hub', icon: <MapPin size={14} /> }
];

const BLANK_CONTAINER = { shipmentRef: '', supplier: '', eta: '', value: '', items: [], notes: '' };

export default function AdminLogistics({ containers = [], workOrders = [], clients = [], brand, ...props }) {
  const ac = brand.color || `var(--accent-secondary)`;
  const [activeTab, setActiveTab] = useState('containers');
  const [showAddContainer, setShowAddContainer] = useState(false);
  const [newContainer, setNewContainer] = useState(BLANK_CONTAINER);
  const [saving, setSaving] = useState(false);

  const warehouseCount = containers.filter(c => c.status === 'Warehouse').length;
  const warehouseItems = containers.filter(c => c.status === 'Warehouse').reduce((acc, c) => acc + (c.items?.length || 0), 0);
  const atRiskCount = containers.filter(c => c.atRisk || c.status === 'Customs').length;
  const localReadyCount = containers.filter(c => c.status === 'Local').length;
  const linkedWorkOrderCount = workOrders.filter(wo => wo.logisticsStatus && wo.logisticsStatus !== 'Local').length;

  const handleCreateContainer = async () => {
    if (!newContainer.shipmentRef.trim()) { props.notify?.('error', 'Shipment reference required'); return; }
    setSaving(true);
    try {
      await props.addContainer?.({ ...newContainer, status: 'Dispatched', createdAt: new Date().toISOString() });
      setNewContainer(BLANK_CONTAINER);
      setShowAddContainer(false);
      props.notify?.('success', 'Container added');
    } catch (e) {
      props.notify?.('error', 'Failed to add container');
    } finally {
      setSaving(false);
    }
  };

  const assets = [
    { id: 'SC-101', name: 'Spider Crane', siteId: '1', status: 'In Use', user: 'KB' },
    { id: 'VT-442', name: 'Vacuum Lifter', siteId: '2', status: 'In Use', user: 'AD' },
    { id: 'LS-991', name: 'Laser Scanner', siteId: '3', status: 'Idle', user: 'SM' }
  ];

  const generateWhatsAppLink = (items) => {
     const text = `*WESTLINE FUTURE PROCUREMENT LIST*\n\nItems to source:\n${items.map(i => `- ${i.title || i.name}`).join('\n')}\n\nPlease provide Pro-Forma for these items.`;
     return `https://wa.me/${brand.whatsapp?.replace(/\+/g, '')}?text=${encodeURIComponent(text)}`;
  };

  const handleUpdateContainerStatus = async (id, status) => {
     const container = containers.find(c => c.id === id);
     
     // Financial gatekeeper: linked work orders must be settled before dispatching or clearing.
     if (['Sea', 'Customs', 'Local'].includes(status)) {
        const linkedWorkOrders = workOrders.filter(wo => container?.items?.includes(wo.id));
        const unpaidItems = linkedWorkOrders.filter(wo => {
           const woInv = (props.invoices || []).find(inv =>
             inv.parentId === wo.id || inv.parentId === container.id ||
             inv.projectId === wo.id || inv.projectId === container.id
           );
           return woInv && !isPaidStatus(woInv.status);
        });

        if (unpaidItems.length > 0) {
           props.notify('error', `FINANCIAL BLOCK: ${unpaidItems.length} items have unsettled invoices. Dispatch restricted.`);
           return;
        }
     }

     await props.updateContainer(id, { status, updatedAt: new Date().toISOString() });
     
     // Propagate to linked work orders
     if (container?.items) {
        for (const woId of container.items) {
           await props.updateWorkOrder(woId, { logisticsStatus: status });
        }
     }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
           <h2 className="lxfh" style={{ fontSize: 28, fontWeight: 700, color: `var(--accent-secondary)` }}>Logistics Switchboard</h2>
           <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
              {[
                { id: 'containers', label: 'Shipments' },
                { id: 'procurement', label: 'Procurement Lists' },
              ].map(t => (
                <button 
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  style={{ 
                    background: 'none', border: 'none', padding: '0 0 8px', 
                    fontSize: 12, fontWeight: 800, color: activeTab === t ? ac : `var(--text-secondary)`,
                    borderBottom: `2px solid ${activeTab === t ? ac : 'transparent'}`,
                    cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1
                  }}
                >
                  {t.label}
                </button>
              ))}
           </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
           <button className="p-btn-light" style={{ fontSize: 11, padding: '8px 16px' }}><Download size={14} /> Export Manifest</button>
           <button onClick={() => setShowAddContainer(true)} className="p-btn-dark" style={{ fontSize: 11, padding: '8px 16px' }}><Plus size={14} /> New Container</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        {[
          { label: 'Active Shipments', value: containers.length, color: '#111827', icon: <Ship size={20} /> },
          { label: 'At Risk / Customs', value: atRiskCount, color: '#EF4444', icon: <ShieldAlert size={20} /> },
          { label: 'Local Ready', value: localReadyCount, color: '#16A34A', icon: <MapPin size={20} /> },
          { label: 'Open Work Orders', value: linkedWorkOrderCount, color: ac, icon: <Package size={20} /> },
        ].map(stat => (
          <div key={stat.label} className="p-card" style={{ padding: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="lxf" style={{ fontSize: 10, color: '#6B7280', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.08em' }}>{stat.label}</div>
              <div className="lxfh" style={{ fontSize: 28, color: stat.color, marginTop: 4 }}>{stat.value}</div>
            </div>
            <div style={{ color: stat.color }}>{stat.icon}</div>
          </div>
        ))}
      </div>

      {activeTab === 'containers' && (
         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 24 }}>
            {containers.length === 0 && (
              <div style={{ gridColumn: '1 / -1' }}>
                <EmptyState
                  icon={<Ship size={28} />}
                  title="No shipments tracked"
                  description="Add a shipment to start tracking supplier dispatch, warehouse arrival, customs, local hub, and site delivery."
                  action={{ label: '+ New Container', onClick: () => setShowAddContainer(true) }}
                />
              </div>
            )}
            {containers.map(c => (
              <div key={c.id} className="p-card" style={{ padding: 24, border: c.atRisk ? '1px solid #EF4444' : '1px solid var(--border)' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <div>
                       <div style={{ fontSize: 10, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase' }}>Shipment Ref</div>
                       <div style={{ fontSize: 15, fontWeight: 700 }}>{c.shipmentRef}</div>
                    </div>
                    {c.atRisk && (
                       <div style={{ background: '#FEF2F2', color: '#EF4444', padding: '4px 12px', borderRadius: 20, fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <ShieldAlert size={12} /> AT RISK
                       </div>
                    )}
                 </div>

                 {/* MILESTONE TOGGLE */}
                 <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', marginBottom: 32, padding: '0 10px' }}>
                    <div style={{ position: 'absolute', top: 12, left: 20, right: 20, height: 2, background: `var(--border-color)`, zIndex: 0 }} />
                    {LOGISTICS_MILESTONES.map((m, idx) => {
                       const isPast = LOGISTICS_MILESTONES.findIndex(x => x.id === c.status) >= idx;
                       const isCurrent = c.status === m.id;
                       return (
                         <button 
                           key={m.id}
                           onClick={() => handleUpdateContainerStatus(c.id, m.id)}
                           style={{ 
                             zIndex: 1, background: isPast ? ac : '#fff', border: `2px solid ${isPast ? ac : `var(--border-color)`}`, 
                             width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                             color: isPast ? '#fff' : `var(--text-secondary)`, cursor: 'pointer', transition: 'all 0.3s'
                           }}
                         >
                            {isPast ? <CheckCircle2 size={12} /> : idx + 1}
                            <div style={{ position: 'absolute', top: 32, fontSize: 9, fontWeight: 800, color: isPast ? `var(--accent-secondary)` : `var(--text-secondary)`, whiteSpace: 'nowrap' }}>{m.label}</div>
                         </button>
                       );
                    })}
                 </div>

                 <div style={{ background: `var(--bg-secondary)`, padding: 16, borderRadius: 16, marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                       <div style={{ fontSize: 11, color: '#625C54' }}>Linked Work Orders:</div>
                       <div style={{ fontSize: 11, fontWeight: 700 }}>{c.items?.length || 0} Items</div>
                    </div>
                    {c.items?.map(woId => {
                       const wo = workOrders.find(w => w.id === woId);
                       return (
                         <div key={woId} style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: ac }} />
                            {wo?.title || woId}
                         </div>
                       );
                    })}
                 </div>

                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: `var(--text-secondary)` }}>
                       <Clock size={14} />
                       <span style={{ fontSize: 12 }}>ETA: {c.eta}</span>
                    </div>
                    <button className="p-btn-light" style={{ padding: '6px 12px', fontSize: 10 }}><FileText size={12} /> Manifest</button>
                 </div>

                 {c.atRisk && (
                    <div style={{ marginTop: 16, padding: 12, background: '#FEF2F2', borderRadius: 12, border: '1px solid #FEE2E2' }}>
                       <div style={{ fontSize: 11, fontWeight: 700, color: '#991B1B' }}>Delay Alert: {c.riskReason}</div>
                       <div style={{ fontSize: 10, color: '#B91C1C', marginTop: 4 }}>Affected clients will be notified via WhatsApp.</div>
                    </div>
                 )}
              </div>
            ))}
         </div>
      )}

      {activeTab === 'procurement' && (
         <div className="p-card" style={{ padding: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
               <div>
                  <h3 className="lxfh" style={{ fontSize: 20 }}>Digital Pro-Forma Engine</h3>
                  <p className="lxf" style={{ fontSize: 13, color: `var(--text-secondary)` }}>Convert customer requirements into China-ready shopping lists.</p>
               </div>
               <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={() => window.open(generateWhatsAppLink(workOrders.filter(w => w.status === 'Pending')), '_blank')} className="p-btn-gold" style={{ background: '#25D366', border: 'none', color: '#fff' }}>
                     <Share2 size={16} /> Share via WhatsApp
                  </button>
                  <button className="p-btn-dark">
                     <FileText size={16} /> Generate PDF
                  </button>
               </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
               <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                     <th style={{ padding: 16, fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase' }}>Work Order</th>
                     <th style={{ padding: 16, fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase' }}>Client</th>
                     <th style={{ padding: 16, fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase' }}>Budget</th>
                     <th style={{ padding: 16, fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase' }}>Procurement Status</th>
                     <th style={{ padding: 16 }}></th>
                  </tr>
               </thead>
               <tbody>
                  {workOrders.map(wo => (
                     <tr key={wo.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: 16 }}>
                           <div style={{ fontSize: 14, fontWeight: 700 }}>{wo.title}</div>
                           <div style={{ fontSize: 11, color: `var(--text-secondary)` }}>ID: {wo.id}</div>
                        </td>
                        <td style={{ padding: 16, fontSize: 13 }}>{clients.find(c => c.id === wo.clientId)?.name || 'Guest'}</td>
                        <td style={{ padding: 16, fontSize: 13, fontWeight: 700 }}>{wo.budget || '—'}</td>
                        <td style={{ padding: 16 }}>
                           <span style={{ 
                             padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 800, 
                             background: wo.logisticsStatus === 'Local' ? '#DCFCE7' : '#FEF3C7',
                             color: wo.logisticsStatus === 'Local' ? '#166534' : '#92400E'
                           }}>
                              {wo.logisticsStatus || 'To Buy'}
                           </span>
                        </td>
                        <td style={{ padding: 16, textAlign: 'right' }}>
                           <button className="p-btn-light" style={{ padding: 8 }}><ExternalLink size={14} /></button>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      )}

      {/* RIGHT: ASSET ALLOCATION */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 32, marginTop: 40 }}>
         <div /> {/* Spacer */}
         <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="p-card" style={{ padding: 24, background: `var(--accent-secondary)`, color: '#fff', borderRadius: 32 }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <h3 className="lxfh" style={{ fontSize: 18, color: '#fff' }}>Site Equipment Pulse</h3>
                  <Scan size={20} color={ac} />
               </div>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {assets.map(a => (
                    <div key={a.id} style={{ borderBottom: '1px solid rgba(255,255,255,.05)', paddingBottom: 16 }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 14, fontWeight: 700 }}>{a.name}</span>
                          <span style={{ fontSize: 9, color: ac, fontWeight: 800 }}>{a.id}</span>
                       </div>
                       <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255,255,255,.4)', marginBottom: 12 }}>
                          <MapPin size={12} /> {clients.find(p => p.id === a.siteId)?.project || 'Global Site'}
                       </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                           <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 24, height: 24, borderRadius: '50%', background: ac, color: `var(--accent-secondary)`, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, border: '2px solid rgba(255,255,255,0.2)' }}>{a.user}</div>
                              <span style={{ fontSize: 11, color: 'rgba(255,255,255,.7)' }}>Lead Allocation</span>
                           </div>
                           <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {a.status === 'In Use' && <div className="luxe-pulse" style={{ background: '#16A34A', width: 6, height: 6, borderRadius: '50%' }} />}
                              <PSBadge s={a.status} />
                           </div>
                        </div>
                    </div>
                  ))}
               </div>
               <button className="glass-btn" style={{ width: '100%', marginTop: 20, padding: 12 }}><Wrench size={14} /> Global Inventory Audit</button>
            </div>

            <div className="p-card" style={{ padding: 24, textAlign: 'center', border: `1px dashed ${ac}`, borderRadius: 24 }}>
               <Box size={32} color={ac} style={{ marginBottom: 12, opacity: 0.5 }} />
               <div className="lxfh" style={{ fontSize: 16, marginBottom: 4 }}>Warehouse Pulse</div>
               {warehouseCount > 0 ? (
                 <p style={{ fontSize: 12, color: `var(--text-secondary)`, lineHeight: 1.6 }}>
                   <strong style={{ color: `var(--accent-secondary)` }}>{warehouseCount}</strong> shipment{warehouseCount !== 1 ? 's' : ''} ({warehouseItems} items) at central warehouse awaiting site deployment.
                 </p>
               ) : (
                 <p style={{ fontSize: 12, color: `var(--text-secondary)`, lineHeight: 1.6 }}>No shipments currently at the warehouse.</p>
               )}
            </div>
         </div>
      </div>
      {activeTab === 'procurement' && workOrders.length === 0 && (
        <EmptyState
          icon={<Package size={28} />}
          title="No work orders yet"
          description="Work orders are created from client project hubs when sourcing is required."
        />
      )}

      {/* NEW CONTAINER MODAL */}
      {showAddContainer && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(92, 58, 33,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setShowAddContainer(false)}>
          <div style={{ background: '#fff', borderRadius: 28, padding: 40, width: '100%', maxWidth: 560, boxShadow: '0 40px 80px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
              <div>
                <h2 className="lxfh" style={{ fontSize: 22, margin: 0 }}>New Shipment</h2>
                <p className="lxf" style={{ fontSize: 13, color: `var(--text-secondary)`, marginTop: 4 }}>Track a new container or sea freight</p>
              </div>
              <button onClick={() => setShowAddContainer(false)} style={{ background: `var(--bg-secondary)`, border: 'none', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <PFormField label="Shipment Reference *">
                <input className="p-inp" placeholder="e.g. GT-CN-2026-001" value={newContainer.shipmentRef} onChange={e => setNewContainer({ ...newContainer, shipmentRef: e.target.value })} />
              </PFormField>
              <PFormField label="Supplier / Factory">
                <input className="p-inp" placeholder="e.g. Shenzhen Glass Co." value={newContainer.supplier} onChange={e => setNewContainer({ ...newContainer, supplier: e.target.value })} />
              </PFormField>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <PFormField label="Expected Arrival (ETA)">
                  <input className="p-inp" type="date" value={newContainer.eta} onChange={e => setNewContainer({ ...newContainer, eta: e.target.value })} />
                </PFormField>
                <PFormField label="Cargo Value (GH₵)">
                  <input className="p-inp" type="number" placeholder="0.00" value={newContainer.value} onChange={e => setNewContainer({ ...newContainer, value: parseFloat(e.target.value) || '' })} />
                </PFormField>
              </div>
              <PFormField label="Notes / Description">
                <textarea className="p-inp" placeholder="Glass type, dimensions, special handling..." value={newContainer.notes} onChange={e => setNewContainer({ ...newContainer, notes: e.target.value })} style={{ minHeight: 80, resize: 'vertical' }} />
              </PFormField>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
              <button onClick={() => setShowAddContainer(false)} style={{ flex: 1, padding: 16, borderRadius: 14, background: `var(--bg-secondary)`, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleCreateContainer} disabled={saving} style={{ flex: 2, padding: 16, borderRadius: 14, background: `var(--accent-secondary)`, border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Adding...' : 'Add Shipment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
