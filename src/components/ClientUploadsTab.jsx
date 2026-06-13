import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, Image as ImageIcon, File as FileIcon, Loader } from 'lucide-react';
import { db, functions, uploadFile } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

export default function ClientUploadsTab({ projectId, user, brand }) {
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const ac = brand?.color || 'var(--accent-secondary)';

  useEffect(() => {
    if (!db || !projectId) {
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, 'projects', projectId, 'inspiration'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
      setUploads(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [projectId]);

  const handleUpload = async (file) => {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      alert("File is too large. Please select a file smaller than 15MB.");
      return;
    }
    
    try {
      setUploading(true);
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-]/g, '_');
      const ts = Date.now();
      const path = `${projectId}/inspiration/${ts}_${safeName}`;
      
      const downloadUrl = await uploadFile('projects', path, file);
      if (!downloadUrl?.startsWith('https://')) {
        throw new Error('Cloud upload did not return a secure file URL.');
      }

      const registerUpload = httpsCallable(functions, 'registerProjectUpload');
      await registerUpload({
        projectId,
        fileName: file.name,
        fileUrl: downloadUrl,
        fileType: file.type,
        size: file.size,
        uploadedBy: user?.name || 'Client',
      });
      
    } catch (e) {
      console.error("Upload failed:", e);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Upload Zone */}
      <div 
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        style={{
          border: dragActive ? `2px dashed ${ac}` : '2px dashed var(--border-color)',
          borderRadius: 20, padding: 32, textAlign: 'center',
          background: dragActive ? `${ac}08` : '#FAFAF9',
          transition: 'all .2s', cursor: uploading ? 'wait' : 'pointer'
        }}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <input 
          type="file" ref={fileInputRef} style={{ display: 'none' }}
          accept="image/*,.pdf"
          onChange={(e) => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); }}
        />
        {uploading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: ac }}>
            <Loader size={32} className="lx-spin" />
            <div style={{ fontSize: 14, fontWeight: 700 }}>Uploading securely...</div>
          </div>
        ) : (
          <>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: '#fff', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: ac, boxShadow: '0 4px 12px rgba(0,0,0,.04)' }}>
              <UploadCloud size={28} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent-secondary)', marginBottom: 8 }}>Upload Site Photos & Inspiration</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 300, margin: '0 auto' }}>
              Drag & drop images or PDFs here, or click to browse. Max size 15MB.
            </div>
          </>
        )}
      </div>

      {/* Gallery */}
      {uploads.length > 0 && <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent-secondary)', marginTop: 8 }}>Uploaded Files</div>}
      
      {loading ? (
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto' }}>
          {[1,2,3].map(i => <div key={i} style={{ minWidth: 140, height: 140, borderRadius: 16, background: 'var(--border-color)', animation: 'pulse 1.5s infinite' }} />)}
        </div>
      ) : uploads.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', background: '#FAFAF9', borderRadius: 16, border: '1px solid var(--border-color)' }}>
          <ImageIcon size={32} color="var(--border-color)" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent-secondary)', marginBottom: 4 }}>Your Inspiration Vault is Empty</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 300, margin: '0 auto' }}>Upload reference photos, site plans, or sketches here so your project manager can review them.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 16 }}>
          {uploads.map(file => {
            const isImage = file.fileType?.startsWith('image/');
            return (
              <a 
                key={file.id} href={file.fileUrl} target="_blank" rel="noreferrer"
                style={{ 
                  display: 'flex', flexDirection: 'column', textDecoration: 'none',
                  background: '#fff', borderRadius: 16, border: '1px solid var(--border-color)', overflow: 'hidden',
                  transition: 'all .2s', boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                }}
              >
                <div style={{ height: 120, background: '#FAFAF9', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid var(--border-color)', position: 'relative' }}>
                  {isImage ? (
                    <img src={file.fileUrl} alt={file.fileName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <FileIcon size={32} color="var(--text-secondary)" />
                  )}
                </div>
                <div style={{ padding: '10px 12px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
                    {file.fileName}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>
                    {file.size ? (file.size / (1024*1024)).toFixed(1) + ' MB' : 'Uploaded File'}
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
