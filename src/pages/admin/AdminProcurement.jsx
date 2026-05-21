import React, { useState } from 'react';
import { FF as PFormField } from '../../components/Shared';
import { PROCUREMENT_STAGES } from '../../data';
import { Camera, Package, Truck, CheckCircle, Factory, Warehouse } from 'lucide-react';

export default function AdminProcurement({ projectId, procurements = [], createProcurement, updateProcurement, deleteProcurement, brand, notify }) {
  const ac = brand.color || '#231F78';
  const myProcs = (procurements || []).filter(p => p.parentId === projectId);
  
  const [showAdd, setShowAdd] = useState(false);
  const [na, setNa] = useState({ 
    itemName: '', source: '', estimatedCost: '', actualCost: '', 
    status: 'to-buy', type: 'Local', isShipment: false, trackingId: '', eta: '', factoryPhoto: ''
  });

  const totalEst = myProcs.reduce((acc, p) => acc + (parseFloat(p.estimatedCost) || 0), 0);
  const totalAct = myProcs.reduce((acc, p) => acc + (parseFloat(p.actualCost) || 0), 0);

  const handleAdd = async () => {
    if (!na.itemName || !na.estimatedCost) { notify?.('error', 'Name and Estimated Cost required'); return; };
    if (createProcurement) {
      await createProcurement(projectId, {
        itemName: na.itemName, source: na.source, estimatedCost: na.estimatedCost, 
        actualCost: na.actualCost, status: na.status, 
        type: na.type, isShipment: na.isShipment, trackingId: na.trackingId, eta: na.eta,
        factoryPhoto: na.factoryPhoto,
        createdAt: new Date().toISOString()
      });
      setNa({ 
        itemName: '', source: '', estimatedCost: '', actualCost: '', 
        status: 'to-buy', type: 'Local', isShipment: false, trackingId: '', eta: '', factoryPhoto: ''
      });
      setShowAdd(false);
    }
  };

  return (
    <div className="p-card" style={{ padding: 24 }}>
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
         <h3 className="lxfh" style={{ fontSize: 18 }}>Procurement Tracker</h3>
         <button onClick={() => setShowAdd(!showAdd)} className="lxf" style={{ fontSize: 13, background: 'none', border: 'none', color: ac, fontWeight: 600, cursor: 'pointer' }}>+ Add Item</button>
       </div>
       
       <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div style={{ background: '#F8F8FD', borderRadius: 8, padding: 12 }}>
             <div className="lxf" style={{ fontSize: 11, color: '#9B99C8', textTransform: 'uppercase' }}>Total Estimated</div>
             <div className="lxf" style={{ fontSize: 18, fontWeight: 700 }}>${totalEst.toLocaleString()}</div>
          </div>
          <div style={{ background: '#F8F8FD', borderRadius: 8, padding: 12 }}>
             <div className="lxf" style={{ fontSize: 11, color: '#9B99C8', textTransform: 'uppercase' }}>Actual Spent</div>
             <div className="lxf" style={{ fontSize: 18, fontWeight: 700, color: totalAct > totalEst ? '#ff4444' : '#16A34A' }}>${totalAct.toLocaleString()}</div>
          </div>
       </div>

       {showAdd && (
         <div style={{ padding: 16, border: '1px solid rgba(0,0,0,.05)', borderRadius: 8, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
             <PFormField label="Item Name"><input className="p-inp" placeholder="e.g. Dining Chairs (x6)" value={na.itemName} onChange={e => setNa({...na, itemName: e.target.value})} /></PFormField>
             <PFormField label="Source/Vendor"><input className="p-inp" placeholder="e.g. Foshan, China" value={na.source} onChange={e => setNa({...na, source: e.target.value})} /></PFormField>
           </div>
           
           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <PFormField label="Source Type">
                <select className="p-inp" value={na.type} onChange={e => setNa({...na, type: e.target.value})}>
                  <option>Local</option><option>International</option>
                </select>
              </PFormField>
              <PFormField label="Est. Cost ($)"><input type="number" className="p-inp" value={na.estimatedCost} onChange={e => setNa({...na, estimatedCost: e.target.value})} /></PFormField>
              <PFormField label="Status">
                <select className="p-inp" value={na.status} onChange={e => setNa({...na, status: e.target.value})}>
                  {PROCUREMENT_STAGES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </PFormField>
           </div>

           {na.status === 'production' && (
             <div className="fade-in" style={{ padding: 12, background: '#0D0B2E', color: '#fff', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 12 }}><Factory size={14} style={{ marginRight: 8 }} /> In Production</div>
                <div style={{ display: 'flex', gap: 8 }}>
                   <input className="p-inp" placeholder="Factory Photo URL" value={na.factoryPhoto} onChange={e => setNa({...na, factoryPhoto: e.target.value})} style={{ background: 'rgba(255,255,255,.1)', color: '#fff', fontSize: 11, border: 'none' }} />
                   <button className="glass-btn" style={{ padding: '4px 10px', fontSize: 10 }}><Camera size={12} /></button>
                </div>
             </div>
           )}

           <div style={{ padding: '12px', background: '#F8F8FD', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
               <label className="lxf" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  <input type="checkbox" checked={na.isShipment} onChange={e => setNa({...na, isShipment: e.target.checked})} />
                  Track as Shipment (Logistics Gateway)
               </label>
               {na.isShipment && (
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="fade-in">
                    <PFormField label="Tracking ID"><input className="p-inp" placeholder="e.g. MSKU123456" value={na.trackingId} onChange={e => setNa({...na, trackingId: e.target.value})} /></PFormField>
                    <PFormField label="Est. Arrival (ETA)"><input className="p-inp" placeholder="e.g. May 24, 2026" value={na.eta} onChange={e => setNa({...na, eta: e.target.value})} /></PFormField>
                 </div>
               )}
            </div>

           <button onClick={handleAdd} className="p-btn-dark lxf" style={{ marginTop: 8 }}>Save Item</button>
         </div>
       )}

       <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
         {myProcs.map(p => {
            const stage = PROCUREMENT_STAGES.find(s => s.id === p.status) || PROCUREMENT_STAGES[0];
            return (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, border: '1px solid rgba(0,0,0,.05)', borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                   <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F8F8FD', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                      {stage.icon}
                   </div>
                   <div>
                     <div className="lxf" style={{ fontSize: 13, fontWeight: 600 }}>{p.itemName}</div>
                     <div className="lxf" style={{ fontSize: 11, color: '#9B99C8' }}>{p.source} · <span style={{ color: stage.color, fontWeight: 700 }}>{stage.name}</span></div>
                   </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                   <div className="lxf" style={{ fontSize: 13, fontWeight: 600 }}>${parseFloat(p.actualCost || p.estimatedCost).toLocaleString()}</div>
                   {p.factoryPhoto && <div style={{ fontSize: 9, color: ac, fontWeight: 800 }}><Camera size={10} /> PHOTO PROOF</div>}
                </div>
              </div>
            );
         })}
         {myProcs.length === 0 && <div className="lxf" style={{ fontSize: 12, color: '#9B99C8', fontStyle: 'italic' }}>No procurement items tracked yet.</div>}
       </div>
    </div>
  );
}
