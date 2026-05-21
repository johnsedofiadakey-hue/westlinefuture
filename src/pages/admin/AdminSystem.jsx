import React, { useState } from 'react';
import { Database, RefreshCw, ShieldAlert, Archive, Terminal, CheckCircle } from 'lucide-react';

export default function AdminSystem({ onReset, syncCatalog, brand }) {
  const ac = brand.color || '#231F78';
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    setLoading(true);
    await onReset();
    setLoading(false);
    setConfirm(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 800 }}>
       <div>
          <h2 className="lxfh" style={{ fontSize: 32, fontWeight: 400, color: '#0D0B2E' }}>System Maintenance</h2>
          <p className="lxf" style={{ color: '#9B99C8', fontSize: 14 }}>Global environment controls and data synchronization tools.</p>
       </div>

        <div className="p-card" style={{ padding: 32, border: confirm ? `2px solid #EF4444` : '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: 24 }}>
             <div style={{ width: 64, height: 64, borderRadius: 20, background: confirm ? '#FEF2F2' : '#F4F4FA', display: 'flex', alignItems: 'center', justifyContent: 'center', color: confirm ? '#EF4444' : ac }}>
                <Database size={32} />
             </div>
             <div style={{ flex: 1 }}>
                <h3 className="lxfh" style={{ fontSize: 20, marginBottom: 8 }}>Initialize / Reset Production Data</h3>
                <p className="lxf" style={{ fontSize: 13, color: '#5B5894', lineHeight: 1.6, marginBottom: 24 }}>
                   This action will synchronize the Firestore database with the master production template. 
                   It will re-seed default projects, materials, and assets. 
                   <br/><strong>Note:</strong> Existing account profiles will be merged, not deleted.
                </p>

                <div style={{ display: 'flex', gap: 12 }}>
                  {!confirm ? (
                    <>
                      <button onClick={() => setConfirm(true)} className="p-btn-dark lxf" style={{ background: '#0D0B2E', padding: '12px 24px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <RefreshCw size={16} /> Re-seed Ecosystem
                      </button>
                      <button onClick={async () => { setLoading(true); await syncCatalog(); setLoading(false); }} disabled={loading} className="p-btn-gold lxf" style={{ padding: '12px 24px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <RefreshCw size={16} /> {loading ? 'Syncing...' : 'Sync Catalog Only'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={handleReset} disabled={loading} className="p-btn-gold lxf" style={{ background: '#EF4444', padding: '12px 24px', fontSize: 13 }}>
                        {loading ? 'Initializing...' : 'Confirm Deep Reset'}
                      </button>
                      <button onClick={() => setConfirm(false)} className="p-btn-light lxf" style={{ padding: '12px 24px', fontSize: 13 }}>Cancel</button>
                    </>
                  )}
                </div>
             </div>
          </div>
       </div>

       <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div className="p-card" style={{ padding: 24 }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ color: '#16A34A' }}><ShieldAlert size={20} /></div>
                <h4 className="lxf" style={{ fontWeight: 700, fontSize: 15 }}>Environment Audit</h4>
             </div>
             <p className="lxf" style={{ fontSize: 12, color: '#9B99C8', marginBottom: 20 }}>Verify Firestore rules and storage bucket permissions.</p>
             <button className="p-btn-light lxf" style={{ width: '100%', fontSize: 12 }}>Run Diagnostics</button>
          </div>

          <div className="p-card" style={{ padding: 24 }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ color: ac }}><Archive size={20} /></div>
                <h4 className="lxf" style={{ fontWeight: 700, fontSize: 15 }}>Backup Management</h4>
             </div>
             <p className="lxf" style={{ fontSize: 12, color: '#9B99C8', marginBottom: 20 }}>Export current database snapshot to JSON format.</p>
             <button className="p-btn-light lxf" style={{ width: '100%', fontSize: 12 }}>Generate Backup</button>
          </div>
       </div>

       <div className="p-card" style={{ padding: 32, background: '#0D0B2E', color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
             <Terminal size={20} color={ac} />
             <h3 className="lxfh" style={{ fontSize: 18, color: '#fff' }}>System Status</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
             {[
               { label: 'Cloud Infrastructure', status: 'Optimal' },
               { label: 'OTP Gateway (Twilio)', status: 'Active' },
               { label: 'Real-time Listeners', status: 'Connected' },
               { label: 'CDN Edge Delivery', status: 'Online' }
             ].map(s => (
               <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 10 }}>
                  <span className="lxf" style={{ fontSize: 13, opacity: 0.7 }}>{s.label}</span>
                  <span className="lxf" style={{ fontSize: 11, fontWeight: 700, color: '#16A34A', display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle size={12} /> {s.status}</span>
               </div>
             ))}
          </div>
       </div>
    </div>
  );
}
