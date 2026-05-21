import React, { useState } from 'react';
import { 
  Check, X, Eye, FileText, Image, 
  ThumbsUp, ThumbsDown, Info, ShoppingCart, 
  ChevronRight, Sparkles, Upload
} from 'lucide-react';
import { PSBadge } from './Shared';

export default function MaterialSelector({ materials = [], onApprove, onReject, isAdmin = false, ac = '#231F78' }) {
  const [filter, setFilter] = useState('All');
  
  const filtered = (materials || []).filter(m => filter === 'All' || m.status === filter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 className="lxfh" style={{ fontSize: 24 }}>Material Selection Gateway</h3>
          <p className="lxf" style={{ color: '#9B99C8', fontSize: 13 }}>Review and approve technical specifications and finishes for your project.</p>
        </div>
        {!isAdmin && (
           <div className="p-card pulse-inner" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 10, background: '#0D0B2E', color: '#fff' }}>
              <Info size={16} color={ac} />
              <span className="lxf" style={{ fontSize: 12, fontWeight: 700 }}>{materials.filter(m => m.status === 'pending').length} Actions Required</span>
           </div>
        )}
        {isAdmin && <button className="p-btn-dark lxf" style={{ padding: '10px 20px' }}><Upload size={16} /> Upload New Sample</button>}
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
         {['All', 'Approved', 'pending', 'Rejected'].map(status => (
           <button 
             key={status} onClick={() => setFilter(status)}
             className={`lxf ${filter === status ? 'active' : ''}`}
             style={{ 
               background: filter === status ? '#0D0B2E' : '#F8F8FD', 
               color: filter === status ? '#fff' : '#0D0B2E',
               border: 'none', padding: '8px 16px', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer' 
             }}
           >{status.charAt(0).toUpperCase() + status.slice(1)}</button>
         ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
        {filtered.map(m => (
          <div key={m.id} className="p-card fade-in" style={{ overflow: 'hidden', padding: 0 }}>
             <div style={{ position: 'relative', height: 240 }}>
                <img src={m.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={m.name} />
                <div style={{ position: 'absolute', top: 12, right: 12 }}>
                   <PSBadge s={m.status} />
                </div>
                <div style={{ position: 'absolute', bottom: 12, left: 12, right: 12, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', padding: 12, borderRadius: 12, transform: 'translateY(100)', transition: 'transform 0.4s' }}>
                   <div style={{ fontSize: 10, fontWeight: 700, color: ac, marginBottom: 4 }}>SPECIFICATION</div>
                   <div className="lxf" style={{ fontSize: 13, fontWeight: 600 }}>{m.specs}</div>
                </div>
             </div>
             <div style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                   <div>
                      <h4 className="lxfh" style={{ fontSize: 18 }}>{m.name}</h4>
                      <div className="lxf" style={{ fontSize: 12, color: '#9B99C8' }}>Unit Ref: {m.ref || 'GTX-001'}</div>
                   </div>
                </div>
                <p className="lxf" style={{ fontSize: 13, color: '#5B5894', lineHeight: 1.6, marginBottom: 20 }}>{m.desc}</p>
                
                {m.status === 'pending' && !isAdmin && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                     <button 
                       onClick={() => onApprove && onApprove(m.id)}
                       className="p-btn-gold" style={{ height: 44, padding: 0 }}
                     ><ThumbsUp size={16} /> Approve & Lock</button>
                     <button 
                       onClick={() => onReject && onReject(m.id)}
                       className="glass-btn" style={{ height: 44, padding: 0 }}
                     ><ThumbsDown size={16} /> Reject / Request Change</button>
                  </div>
                )}

                {isAdmin && (
                   <div style={{ display: 'flex', gap: 10 }}>
                      <button className="p-btn-light" style={{ flex: 1, height: 36, fontSize: 11 }}><Eye size={14} /> Edit Spec</button>
                      <button className="p-btn-light" style={{ width: 36, height: 36, padding: 0 }}><ShoppingCart size={14} /></button>
                   </div>
                )}

                {m.status === 'Approved' && (
                   <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#16A34A', fontSize: 12, fontWeight: 700 }}>
                      <Check size={16} /> Locked into Procurement & Fabrication
                   </div>
                )}
             </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="lxf" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 0', border: '2px dashed #DFD9D1', borderRadius: 20, color: '#9B99C8' }}>No materials match this filter.</div>}
      </div>

      <div className="p-card" style={{ padding: 24, textAlign: 'center', background: '#F8F8FD' }}>
         <Sparkles size={24} color={ac} style={{ marginBottom: 12 }} />
         <h4 className="lxfh" style={{ fontSize: 18 }}>Can't find what you're looking for?</h4>
         <p className="lxf" style={{ color: '#5B5894', fontSize: 13, maxWidth: 600, margin: '0 auto 20px' }}>Our technical team can source custom glass tints, high-performance facade systems, and architectural profiles from our international logistics partners.</p>
         <button className="p-btn-dark lxf" style={{ padding: '12px 24px' }}>Request Custom Sourcing</button>
      </div>
    </div>
  );
}
