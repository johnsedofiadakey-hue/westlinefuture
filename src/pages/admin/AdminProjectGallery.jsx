import React, { useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { FF as PFormField } from '../../components/Shared';
import { PROJECT_STAGES } from '../../data';

export default function AdminProjectGallery({ projectId, media = [], uploadMedia, deleteMedia, ac }) {
  const [showAdd, setShowAdd] = useState(false);
  const [nm, setNm] = useState({ stage: 1, file: null, preview: '' });
  const myMedia = media.filter(m => m.parentId === projectId);

  const handleUpload = async () => {
    if (!nm.file) return alert('Select a photo');
    await uploadMedia(projectId, nm.file, parseInt(nm.stage));
    setNm({ stage: 1, file: null, preview: '' });
    setShowAdd(false);
  };

  const onFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setNm({...nm, file, preview: reader.result});
    reader.readAsDataURL(file);
  };

  return (
    <div className="p-card" style={{ padding: 24 }}>
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
         <h3 className="lxfh" style={{ fontSize: 18 }}>Project Progress Photos</h3>
         <button onClick={() => setShowAdd(!showAdd)} className="lxf" style={{ fontSize: 13, background: 'none', border: 'none', color: ac, fontWeight: 600, cursor: 'pointer' }}>+ Add Progress Photo</button>
       </div>

       {showAdd && (
         <div style={{ background: '#F4F4FA', padding: 20, borderRadius: 12, marginBottom: 24, display: 'flex', gap: 20 }}>
            <div style={{ width: 120, height: 120, borderRadius: 12, border: '2px dashed #E4E3F0', overflow: 'hidden', position: 'relative', background: '#fff' }}>
               {nm.preview ? <img src={nm.preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Camera size={24} color="#9B99C8" /></div>}
               <input type="file" accept="image/*" onChange={e => onFile(e.target.files[0])} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
               <PFormField label="Link to Project Stage">
                  <select className="p-inp" value={nm.stage} onChange={e => setNm({...nm, stage: e.target.value})}>
                    {PROJECT_STAGES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
               </PFormField>
               <button onClick={handleUpload} className="p-btn-dark lxf" style={{ alignSelf: 'flex-start', padding: '10px 24px' }}>Upload to Phase</button>
            </div>
         </div>
       )}

       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12 }}>
          {myMedia.map(m => (
            <div key={m.id} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', aspectRatio: '1' }}>
               <img src={m.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="progress" />
               <div style={{ position: 'absolute', top: 6, right: 6 }}>
                  <button onClick={() => deleteMedia(m.id, projectId)} style={{ background: 'rgba(255,255,255,.9)', border: 'none', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ff4444' }}><Trash2 size={12} /></button>
               </div>
               <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '4px 8px', background: 'rgba(0,0,0,.6)', color: '#fff', fontSize: 9 }}>{PROJECT_STAGES.find(s => s.id === m.stageId)?.name}</div>
            </div>
          ))}
          {myMedia.length === 0 && <div className="lxf" style={{ color: '#9B99C8', fontSize: 12, fontStyle: 'italic', gridColumn: '1/-1' }}>No progress photos uploaded yet.</div>}
       </div>
    </div>
  );
}
