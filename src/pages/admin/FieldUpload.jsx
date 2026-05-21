import React, { useState } from 'react';
import { Camera, Send, CheckCircle, Package, ArrowLeft, Loader2 } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { PAv } from '../../components/Shared';

export default function FieldUpload({ dbClients, clients, handleMediaUpload, ...props }) {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [selectedProjectId, setSelectedProjectId] = useState(projectId || '');
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  const activeProject = clients.find(p => p.id === selectedProjectId);

  const onFileChange = (e) => {
    if (e.target.files[0]) setFile(e.target.files[0]);
  };

  const onSubmit = async () => {
    if (!file || !selectedProjectId) return;
    setUploading(true);
    try {
      await handleMediaUpload({
        file,
        parentId: selectedProjectId,
        caption: caption || `Site update for ${activeProject?.project}`,
        type: 'site_progress'
      });
      setDone(true);
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  if (done) return (
    <div style={{ height: '100vh', background: '#16A34A', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center' }}>
       <CheckCircle size={80} style={{ marginBottom: 24 }} />
       <h1 style={{ fontSize: 32, fontWeight: 900 }}>Upload Successful</h1>
       <p style={{ opacity: 0.8, marginBottom: 40 }}>The client has been notified of the update.</p>
       <button onClick={() => { setDone(false); setFile(null); setCaption(''); }} style={{ background: '#fff', color: '#16A34A', border: 'none', padding: '16px 40px', borderRadius: 12, fontWeight: 800 }}>Upload Another</button>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#F8F8FD', padding: '20px' }}>
       <div style={{ maxWidth: 500, margin: '0 auto' }}>
          <header style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
             <button onClick={() => navigate(-1)} style={{ background: '#fff', border: 'none', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ArrowLeft size={20}/></button>
             <h1 style={{ fontSize: 20, fontWeight: 800 }}>Field Command</h1>
          </header>

          <div style={{ background: '#fff', padding: 24, borderRadius: 32, boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
             <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', color: '#9B99C8', display: 'block', marginBottom: 8 }}>Select Project</label>
                <select 
                  value={selectedProjectId} 
                  onChange={e => setSelectedProjectId(e.target.value)}
                  style={{ width: '100%', height: 56, borderRadius: 16, border: '1px solid #E8E6F5', background: '#F8F8FD', padding: '0 16px', fontSize: 16, fontWeight: 600 }}
                >
                   <option value="">Choose Project...</option>
                   {clients.map(p => (
                     <option key={p.id} value={p.id}>{p.project} ({p.name})</option>
                   ))}
                </select>
             </div>

             <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', color: '#9B99C8', display: 'block', marginBottom: 8 }}>Snap or Select Photo</label>
                <div style={{ position: 'relative', width: '100%', height: 200, background: '#F8F8FD', border: '2px dashed #E8E6F5', borderRadius: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                   {file ? (
                     <img src={URL.createObjectURL(file)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                   ) : (
                     <>
                        <Camera size={48} color="#9B99C8" />
                        <span style={{ fontSize: 12, color: '#9B99C8', marginTop: 8 }}>Tap to Open Camera</span>
                     </>
                   )}
                   <input type="file" accept="image/*" capture="environment" onChange={onFileChange} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                </div>
             </div>

             <div style={{ marginBottom: 32 }}>
                <label style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', color: '#9B99C8', display: 'block', marginBottom: 8 }}>Work Summary</label>
                <textarea 
                  value={caption} 
                  onChange={e => setCaption(e.target.value)}
                  placeholder="e.g. 'Installation of 12mm Tempered Glass Partition complete.'"
                  style={{ width: '100%', height: 120, borderRadius: 16, border: '1px solid #E8E6F5', background: '#F8F8FD', padding: 16, fontSize: 14, resize: 'none' }}
                />
             </div>

             <button 
               onClick={onSubmit}
               disabled={!file || !selectedProjectId || uploading}
               style={{ 
                 width: '100%', height: 64, borderRadius: 20, background: '#0D0B2E', color: '#fff', 
                 border: 'none', fontSize: 18, fontWeight: 800, display: 'flex', alignItems: 'center', 
                 justifyContent: 'center', gap: 12, opacity: (!file || !selectedProjectId || uploading) ? 0.5 : 1
               }}
             >
                {uploading ? <Loader2 className="spin" size={24} /> : <><Send size={20} /> Publish Update</>}
             </button>
          </div>
       </div>
    </div>
  );
}
