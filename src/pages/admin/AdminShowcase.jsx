import React, { useState, useEffect } from 'react';
import { db, storage } from '../../lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Trash2, Plus, Image as ImageIcon, MapPin, Type, Save, X, PlusCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminShowcase({ brand, notify }) {
  const [scenes, setScenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newScene, setNewScene] = useState({ title: '', location: '', description: '', img: '', hotspots: [] });
  const [uploading, setUploading] = useState(false);

  const ac = brand?.color || `var(--accent-secondary)`;

  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(collection(db, 'showcase'), (snap) => {
      setScenes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !storage) return;
    setUploading(true);
    try {
      const sRef = ref(storage, `showcase/${Date.now()}_${file.name}`);
      await uploadBytes(sRef, file);
      const url = await getDownloadURL(sRef);
      setNewScene(prev => ({ ...prev, img: url }));
      notify('success', 'Image uploaded successfully');
    } catch (err) {
      console.error(err);
      notify('error', 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const saveScene = async () => {
    if (!newScene.img || !newScene.title) return notify('error', 'Title and Image required');
    try {
      await addDoc(collection(db, 'showcase'), { ...newScene, createdAt: serverTimestamp() });
      setShowAdd(false);
      setNewScene({ title: '', location: '', description: '', img: '', hotspots: [] });
      notify('success', 'Scene added to showroom');
    } catch (err) {
      notify('error', 'Save failed');
    }
  };

  const deleteScene = async (scene) => {
    if (!window.confirm("Delete this scene from the showroom?")) return;
    try {
      await deleteDoc(doc(db, 'showcase', scene.id));
      // Optionally delete from storage if we have the path, but URL is enough for now
      notify('success', 'Scene removed');
    } catch (err) {
      notify('error', 'Delete failed');
    }
  };

  const addHotspot = (e) => {
    if (!newScene.img) return notify('error', 'Upload an image first');
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    const h = { x, y, title: 'New Detail', desc: 'Technical specifications...' };
    setNewScene(prev => ({ ...prev, hotspots: [...prev.hotspots, h] }));
  };

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 8px' }}>Showroom Manager</h1>
          <p style={{ color: '#888' }}>Upload and manage immersive scenes for the client showcase.</p>
        </div>
        <button 
          onClick={() => setShowAdd(true)} 
          className="p-btn-gold" 
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 24px' }}
        >
          <PlusCircle size={20} /> Add New Scene
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 100, color: '#888' }}>Loading showroom data...</div>
      ) : scenes.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 24 }}>
          {scenes.map(s => (
            <div key={s.id} className="p-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: 200, position: 'relative' }}>
                <img src={s.img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={s.title} />
                <button 
                  onClick={() => deleteScene(s)}
                  style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(239, 68, 68, 0.9)', color: '#fff', border: 'none', padding: 8, borderRadius: 8, cursor: 'pointer' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div style={{ padding: 20 }}>
                <div style={{ color: ac, fontSize: 10, fontWeight: 900, textTransform: 'uppercase', marginBottom: 4 }}>{s.location}</div>
                <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800 }}>{s.title}</h3>
                <p style={{ fontSize: 12, color: '#666', lineHeight: 1.5, marginBottom: 16 }}>{s.description}</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {s.hotspots?.map((h, i) => (
                    <span key={i} style={{ background: '#F5F5F5', padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700 }}>{h.title}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '80px 20px', background: `var(--bg-secondary)`, borderRadius: 24, border: '1px dashed #DCD7D1' }}>
          <ImageIcon size={48} style={{ color: '#ccc', marginBottom: 16 }} />
          <h3 className="lxfh" style={{ fontSize: 20, marginBottom: 8 }}>No Showroom Scenes Yet</h3>
          <p style={{ color: '#888', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>Add your first immersive cinematic scene to showcase your technical excellence to clients.</p>
          <button onClick={() => setShowAdd(true)} className="p-btn-gold" style={{ padding: '12px 24px' }}>Add First Scene</button>
        </div>
      )}


      {/* ADD MODAL */}
      <AnimatePresence>
        {showAdd && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              style={{ background: '#fff', width: '100%', maxWidth: 800, maxHeight: '90vh', borderRadius: 32, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 40px 100px rgba(0,0,0,0.4)' }}
            >
              {/* FIXED HEADER */}
              <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}>
                <div>
                   <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>Immersive Scene Creator</h2>
                   <div style={{ fontSize: 11, color: `var(--text-secondary)`, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{newScene.hotspots.length} active detail hotspots</div>
                </div>
                <button onClick={() => setShowAdd(false)} style={{ background: `var(--bg-secondary)`, border: 'none', width: 44, height: 44, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
              </div>
              
              {/* SCROLLABLE CONTENT */}
              <div style={{ padding: 32, flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                   <div style={{ marginBottom: 8 }}>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', color: ac, marginBottom: 8 }}>1. Technical Narrative</label>
                      <input value={newScene.title} onChange={e => setNewScene({...newScene, title: e.target.value})} placeholder="Project Title" className="p-inp" style={{ marginBottom: 12 }} />
                      <input value={newScene.location} onChange={e => setNewScene({...newScene, location: e.target.value})} placeholder="Location" className="p-inp" style={{ marginBottom: 12 }} />
                      <textarea value={newScene.description} onChange={e => setNewScene({...newScene, description: e.target.value})} rows={4} className="p-inp" placeholder="Describe the architectural intent and material excellence..." style={{ resize: 'none' }} />
                   </div>

                   <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', color: ac, marginBottom: 12 }}>2. Hotspot Registry</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                         {newScene.hotspots.length === 0 && (
                            <div style={{ padding: 20, border: '1px dashed var(--border-color)', borderRadius: 16, textAlign: 'center', color: `var(--text-secondary)`, fontSize: 12 }}>
                               Click on the image to place your first technical hotspot.
                            </div>
                         )}
                         {newScene.hotspots.map((h, i) => (
                           <div key={i} style={{ padding: 16, background: `var(--bg-secondary)`, borderRadius: 16, border: '1px solid var(--border-color)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                 <div style={{ fontSize: 10, fontWeight: 900, color: ac }}>HOTSPOT #{i+1}</div>
                                 <button onClick={() => {
                                     const updated = [...newScene.hotspots];
                                     updated.splice(i, 1);
                                     setNewScene({...newScene, hotspots: updated});
                                 }} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }}><Trash2 size={14} /></button>
                              </div>
                              <input value={h.title} onChange={e => {
                                const updated = [...newScene.hotspots];
                                updated[i].title = e.target.value;
                                setNewScene({...newScene, hotspots: updated});
                              }} style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid #DCD7D1', fontSize: 14, fontWeight: 700, padding: '4px 0', marginBottom: 8 }} placeholder="Component Name" />
                              <textarea value={h.desc} onChange={e => {
                                const updated = [...newScene.hotspots];
                                updated[i].desc = e.target.value;
                                setNewScene({...newScene, hotspots: updated});
                              }} style={{ width: '100%', background: 'none', border: 'none', fontSize: 12, color: '#625C54', padding: 0, resize: 'none' }} placeholder="Technical detail..." />
                           </div>
                         ))}
                      </div>
                   </div>
                </div>

                <div>
                   <label style={{ display: 'block', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', color: ac, marginBottom: 12 }}>3. Visual Context</label>
                   <div 
                     onClick={newScene.img ? addHotspot : () => document.getElementById('scene-up').click()}
                     style={{ 
                       width: '100%', height: 450, background: `var(--bg-secondary)`, borderRadius: 24, 
                       border: '2px dashed #DCD7D1', position: 'relative', overflow: 'hidden',
                       cursor: newScene.img ? 'crosshair' : 'pointer'
                     }}
                   >
                     {newScene.img ? (
                       <>
                         <img src={newScene.img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                         {newScene.hotspots.map((h, i) => (
                           <div key={i} style={{ 
                             position: 'absolute', left: `${h.x}%`, top: `${h.y}%`, 
                             width: 24, height: 24, background: ac, borderRadius: '50%', 
                             border: '2px solid #fff', transform: 'translate(-50%, -50%)',
                             display: 'flex', alignItems: 'center', justifyContent: 'center',
                             color: '#fff', fontSize: 10, fontWeight: 800, boxShadow: '0 0 20px rgba(0,0,0,0.3)'
                           }}>
                              {i + 1}
                           </div>
                         ))}
                       </>
                     ) : (
                       <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                          <ImageIcon size={40} style={{ color: '#DCD7D1' }} />
                          <div style={{ fontSize: 12, fontWeight: 800, color: `var(--text-secondary)` }}>{uploading ? 'Processing Image...' : 'Upload Scene Plate'}</div>
                       </div>
                     )}
                     <input id="scene-up" type="file" hidden onChange={handleFileUpload} />
                   </div>
                   {newScene.img && (
                      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, color: `var(--text-secondary)` }}>
                         <MapPin size={14} />
                         <span style={{ fontSize: 11, fontWeight: 700 }}>Click anywhere on the image to position a hotspot.</span>
                      </div>
                   )}
                </div>
              </div>

              {/* FIXED FOOTER */}
              <div style={{ padding: '24px 32px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: 12, background: '#fff' }}>
                <button onClick={() => setShowAdd(false)} className="p-btn-light" style={{ flex: 1, height: 56 }}>Discard Draft</button>
                <button onClick={saveScene} className="p-btn-gold" style={{ flex: 2, height: 56, fontSize: 16 }}>Publish Immersive Scene</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
