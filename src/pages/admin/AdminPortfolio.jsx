import React, { useState } from 'react';
import { Plus, Trash2, Upload } from 'lucide-react';
import { FF as PFormField } from '../../components/Shared';
import { uploadFile } from '../../lib/firebase';
import { compressImage } from '../../lib/image-utils';

export default function AdminPortfolio({ content, syncCMS, brand, notify }) {
  const ac = brand?.color || `var(--accent-secondary)`;
  const portfolio = content?.portfolio || [];
  const [confirmDeleteIdx, setConfirmDeleteIdx] = useState(null);
  
  const onSave = (newList) => {
    if (syncCMS) syncCMS('portfolio', newList);
  };

  const addProject = () => {

    const newProj = {
      id: Date.now(),
      title: 'New Luxury Project',
      cat: 'Residential',
      after: 'https://images.unsplash.com/photo-1616137466211-f939a420be84?w=900&q=80',
      before: '',
      year: new Date().getFullYear().toString(),
      loc: 'International',
      area: 'TBD',
      duration: 'TBD',
      budget: 'TBD',
      style: 'Modern Luxury',
      hasBA: false,
      desc: 'Describe the transformation here...',
      imgs: []
    };
    onSave([newProj, ...portfolio]);
  };


  const updateProj = (idx, fields) => {
    const newP = [...portfolio];
    newP[idx] = { ...newP[idx], ...fields };
    onSave(newP);
  };


  const deleteProj = (idx) => setConfirmDeleteIdx(idx);

  const confirmDeleteProj = () => {
    const newP = portfolio.filter((_, i) => i !== confirmDeleteIdx);
    onSave(newP);
    setConfirmDeleteIdx(null);
  };


  const onFile = async (idx, field, file) => {
    if (file) {
      try {
        const compressed = await compressImage(file, { maxWidth: 1600, quality: 0.7 });
        const url = await uploadFile('assets', `portfolio/${Date.now()}_${field}_${file.name}`, compressed);
        updateProj(idx, { [field]: url, hasBA: field === 'before' ? true : portfolio[idx].hasBA });
      } catch (err) { notify?.('error', 'Upload failed: ' + err.message); }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="lxfh" style={{ fontSize: 32, fontWeight: 400, color: `var(--accent-secondary)` }}>Portfolio Manager</h2>
        <button onClick={addProject} className="p-btn-dark lxf" style={{ padding: '10px 20px', fontSize: 13, gap: 8, display: 'flex', alignItems: 'center' }}><Plus size={16} /> Add New Project</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {portfolio.map((p, i) => (
          <div key={p.id} className="p-card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{ width: 100, height: 60, borderRadius: 6, overflow: 'hidden', background: `var(--bg-secondary)` }}>
                  <img src={p.after} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div>
                  <div className="lxfh" style={{ fontSize: 18 }}>{p.title}</div>
                  <div className="lxf" style={{ fontSize: 12, color: `var(--text-secondary)` }}>{p.cat} • {p.year}</div>
                </div>
              </div>
              <button onClick={() => deleteProj(i)} style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', padding: 8 }}><Trash2 size={18} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <PFormField label="Project Title"><input className="p-inp" value={p.title} onChange={e => updateProj(i, { title: e.target.value })} /></PFormField>
              <PFormField label="Category">
                <select className="p-inp" value={p.cat} onChange={e => updateProj(i, { cat: e.target.value })}>
                  {['Full Interior', 'Kitchen Installation', 'Washroom Setup', 'Office Fit-out', 'Residential Finishing', 'Glass & Aluminum'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </PFormField>
              <PFormField label="After Image (Local Upload)">
                <div style={{ position: 'relative', overflow: 'hidden' }}>
                  <button className="p-btn-light lxf" style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}><Upload size={14} /> {p.after?.startsWith('https') ? 'Static Asset' : 'Select Image'}</button>
                  <input type="file" accept="image/*" onChange={e => onFile(i, 'after', e.target.files[0])} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                </div>
              </PFormField>
              <PFormField label="Before Image (Optional)">
                <div style={{ position: 'relative', overflow: 'hidden' }}>
                  <button className="p-btn-light lxf" style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}><Upload size={14} /> {p.before?.startsWith('https') ? 'Static Asset' : 'Select Image'}</button>
                  <input type="file" accept="image/*" onChange={e => onFile(i, 'before', e.target.files[0])} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                </div>
              </PFormField>
              <PFormField label="Location"><input className="p-inp" value={p.loc} onChange={e => updateProj(i, { loc: e.target.value })} /></PFormField>
              <PFormField label="Style"><input className="p-inp" value={p.style} onChange={e => updateProj(i, { style: e.target.value })} /></PFormField>
            </div>
            
            <div style={{ marginTop: 16 }}>
              <PFormField label="Detailed Description">
                <textarea className="p-inp" rows={2} style={{ resize: 'vertical' }} value={p.desc} onChange={e => updateProj(i, { desc: e.target.value })} />
              </PFormField>
            </div>
          </div>
        ))}
      </div>

      {confirmDeleteIdx !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--bg-primary)', borderRadius: 20, padding: 32, maxWidth: 360, width: '100%', textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>🗑️</div>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>Delete Project?</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>This portfolio entry will be permanently removed from the public showcase.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmDeleteIdx(null)} style={{ flex: 1, height: 44, borderRadius: 12, border: '1.5px solid var(--border-color)', background: 'transparent', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button onClick={confirmDeleteProj} style={{ flex: 1, height: 44, borderRadius: 12, border: 'none', background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
