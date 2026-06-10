import React, { useState, useEffect } from 'react';
import { db, storage } from '../../lib/firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Trash2, Image as ImageIcon, MapPin, X, PlusCircle, Search, Copy, Eye, Star, ShieldCheck, Pencil, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DEFAULT_SCENES } from '../../data.jsx';

const BLANK_SCENE = { title: '', location: '', description: '', img: '', videoUrl: '', hotspots: [], category: 'Residential', audience: 'Client Presentation', status: 'Published', featured: false, clientVisible: true, sortOrder: 99 };

export default function AdminShowcase({ brand, notify }) {
  const [scenes, setScenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // scene being edited (null = add mode)
  const [newScene, setNewScene] = useState(BLANK_SCENE);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState(null); // scene pending delete confirmation
  const [deleting, setDeleting] = useState(false);

  const ac = brand?.color || `var(--accent-secondary)`;

  useEffect(() => {
    if (!db) {
      setScenes(DEFAULT_SCENES.map(s => ({ ...s, status: 'Published', clientVisible: true, category: 'Demo Scene', audience: 'Client Presentation' })));
      setLoading(false);
      return;
    }
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

  const openAdd = () => {
    setEditTarget(null);
    setNewScene(BLANK_SCENE);
    setShowAdd(true);
  };

  const openEdit = (scene) => {
    setEditTarget(scene);
    setNewScene({
      title: scene.title || '',
      location: scene.location || '',
      description: scene.description || '',
      img: scene.img || '',
      videoUrl: scene.videoUrl || '',
      hotspots: scene.hotspots || [],
      category: scene.category || 'Residential',
      audience: scene.audience || 'Client Presentation',
      status: scene.status || 'Published',
      featured: !!scene.featured,
      clientVisible: scene.clientVisible !== false,
      sortOrder: scene.sortOrder ?? 99,
    });
    setShowAdd(true);
  };

  const saveScene = async () => {
    if (!newScene.img || !newScene.title) return notify('error', 'Title and Image required');
    try {
      if (editTarget) {
        // UPDATE existing
        if (!db || String(editTarget.id || '').startsWith('local-') || String(editTarget.id || '').startsWith('def-')) {
          setScenes(prev => prev.map(s => s.id === editTarget.id ? { ...s, ...newScene } : s));
        } else {
          await updateDoc(doc(db, 'showcase', editTarget.id), { ...newScene, updatedAt: serverTimestamp() });
        }
        notify('success', 'Scene updated');
      } else {
        // ADD new
        if (!db) {
          setScenes(prev => [{ ...newScene, id: `local-${Date.now()}`, createdAt: new Date().toISOString() }, ...prev]);
        } else {
          await addDoc(collection(db, 'showcase'), { ...newScene, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        }
        notify('success', 'Scene added to showroom');
      }
      setShowAdd(false);
      setEditTarget(null);
      setNewScene(BLANK_SCENE);
    } catch (err) {
      console.error(err);
      notify('error', editTarget ? 'Update failed' : 'Save failed');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (!db || String(deleteTarget.id || '').startsWith('local-') || String(deleteTarget.id || '').startsWith('def-')) {
        setScenes(prev => prev.filter(s => s.id !== deleteTarget.id));
      } else {
        await deleteDoc(doc(db, 'showcase', deleteTarget.id));
      }
      notify('success', 'Scene removed');
    } catch (err) {
      notify('error', 'Delete failed');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
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

  const filteredScenes = scenes.filter(scene => {
    if (statusFilter !== 'all' && (scene.status || 'Published') !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [scene.title, scene.location, scene.description, scene.category, scene.audience]
      .some(v => String(v || '').toLowerCase().includes(q));
  });

  const stats = {
    total: scenes.length,
    published: scenes.filter(s => (s.status || 'Published') === 'Published').length,
    featured: scenes.filter(s => s.featured).length,
    hotspots: scenes.reduce((acc, s) => acc + (s.hotspots?.length || 0), 0),
  };

  const copyShowcaseLink = async (scene) => {
    const url = `${window.location.origin}/showcase${scene.id ? `?scene=${scene.id}` : ''}`;
    await navigator.clipboard.writeText(url);
    notify?.('success', 'Showcase link copied');
  };

  return (
    <div style={{ padding: 32, maxWidth: 1280, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 8px' }}>Showroom Manager</h1>
          <p style={{ color: '#888', margin: 0 }}>Manage immersive sales scenes, technical hotspots, and client-ready presentation assets.</p>
        </div>
        <button
          onClick={openAdd}
          className="p-btn-gold"
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 24px' }}
        >
          <PlusCircle size={20} /> Add New Scene
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {[
          { label: 'Scenes', value: stats.total, icon: <ImageIcon size={18} />, color: `var(--accent-secondary)` },
          { label: 'Published', value: stats.published, icon: <ShieldCheck size={18} />, color: '#16A34A' },
          { label: 'Featured', value: stats.featured, icon: <Star size={18} />, color: ac },
          { label: 'Hotspots', value: stats.hotspots, icon: <MapPin size={18} />, color: '#7C3AED' },
        ].map(stat => (
          <div key={stat.label} className="p-card" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 14, border: '1px solid var(--border-color)' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: `${stat.color}12`, color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{stat.icon}</div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: 10, fontWeight: 900, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.08em' }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid var(--border-color)', borderRadius: 18, padding: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 280px' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: `var(--text-secondary)` }} />
          <input className="p-inp" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search scenes, location, category..." style={{ width: '100%', height: 40, paddingLeft: 36, boxSizing: 'border-box' }} />
        </div>
        <select className="p-inp" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: 170, height: 40, fontSize: 12 }}>
          <option value="all">All statuses</option>
          <option value="Published">Published</option>
          <option value="Draft">Draft</option>
          <option value="Internal">Internal</option>
        </select>
        <div style={{ fontSize: 11, color: `var(--text-secondary)`, fontWeight: 800 }}>{filteredScenes.length} visible assets</div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 100, color: '#888' }}>Loading showroom data...</div>
      ) : filteredScenes.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 24 }}>
          {filteredScenes.map(s => (
            <div key={s.id} className="p-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: 200, position: 'relative' }}>
                <img src={s.img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={s.title} />
                <div style={{ position: 'absolute', left: 12, top: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ background: (s.status || 'Published') === 'Published' ? '#16A34A' : (s.status || '') === 'Internal' ? '#7C3AED' : '#D97706', color: '#fff', padding: '4px 8px', borderRadius: 999, fontSize: 10, fontWeight: 900 }}>{s.status || 'Published'}</span>
                  {s.featured && <span style={{ background: ac, color: `var(--accent-secondary)`, padding: '4px 8px', borderRadius: 999, fontSize: 10, fontWeight: 900 }}>Featured</span>}
                  {s.videoUrl && <span style={{ background: '#1D4ED8', color: '#fff', padding: '4px 8px', borderRadius: 999, fontSize: 10, fontWeight: 900 }}>🎬 3D Tour</span>}
                </div>
                {/* Actions top-right */}
                <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => openEdit(s)}
                    style={{ background: 'rgba(30,30,30,0.85)', color: '#fff', border: 'none', padding: 8, borderRadius: 8, cursor: 'pointer', backdropFilter: 'blur(8px)' }}
                    title="Edit scene"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(s)}
                    style={{ background: 'rgba(239, 68, 68, 0.9)', color: '#fff', border: 'none', padding: 8, borderRadius: 8, cursor: 'pointer' }}
                    title="Delete scene"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ color: ac, fontSize: 10, fontWeight: 900, textTransform: 'uppercase' }}>{s.location}</div>
                  <div style={{ fontSize: 10, color: `var(--text-secondary)`, fontWeight: 800 }}>{s.category || 'Scene'}</div>
                </div>
                <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800 }}>{s.title}</h3>
                <p style={{ fontSize: 12, color: '#666', lineHeight: 1.5, marginBottom: 16 }}>{s.description}</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {s.hotspots?.map((h, i) => (
                    <span key={i} style={{ background: '#F5F5F5', padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700 }}>{h.title}</span>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 18 }}>
                  <button onClick={() => window.open(`/showcase?scene=${s.id}`, '_blank')} style={{ height: 38, borderRadius: 10, border: '1px solid var(--border-color)', background: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Eye size={13} /> Preview
                  </button>
                  <button onClick={() => copyShowcaseLink(s)} style={{ height: 38, borderRadius: 10, border: '1px solid var(--border-color)', background: `var(--bg-secondary)`, fontSize: 11, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Copy size={13} /> Copy Link
                  </button>
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
          <button onClick={openAdd} className="p-btn-gold" style={{ padding: '12px 24px' }}>Add First Scene</button>
        </div>
      )}


      {/* ── DELETE CONFIRMATION MODAL ── */}
      <AnimatePresence>
        {deleteTarget && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 10001, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{ background: '#fff', borderRadius: 24, padding: 36, width: '100%', maxWidth: 440, boxShadow: '0 40px 80px rgba(0,0,0,0.3)' }}
            >
              <div style={{ width: 52, height: 52, borderRadius: 16, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                <AlertTriangle size={24} color="#EF4444" />
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>Remove Scene?</div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--accent-secondary)' }}>{deleteTarget.title}</strong> will be permanently removed from the showroom. This cannot be undone.
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  style={{ flex: 1, height: 48, borderRadius: 12, border: '1.5px solid var(--border-color)', background: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  style={{ flex: 1, height: 48, borderRadius: 12, border: 'none', background: '#EF4444', color: '#fff', fontSize: 13, fontWeight: 900, cursor: deleting ? 'default' : 'pointer', opacity: deleting ? 0.7 : 1 }}
                >
                  {deleting ? 'Removing…' : 'Remove Scene'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* ── ADD / EDIT MODAL ── */}
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
                   <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>{editTarget ? 'Edit Scene' : 'Immersive Scene Creator'}</h2>
                   <div style={{ fontSize: 11, color: `var(--text-secondary)`, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{newScene.hotspots.length} active detail hotspots</div>
                </div>
                <button onClick={() => { setShowAdd(false); setEditTarget(null); }} style={{ background: `var(--bg-secondary)`, border: 'none', width: 44, height: 44, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
              </div>

              {/* SCROLLABLE CONTENT */}
              <div style={{ padding: 32, flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                   <div style={{ marginBottom: 8 }}>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', color: ac, marginBottom: 8 }}>1. Technical Narrative</label>
                      <input value={newScene.title} onChange={e => setNewScene({...newScene, title: e.target.value})} placeholder="Project Title" className="p-inp" style={{ marginBottom: 12 }} />
                      <input value={newScene.location} onChange={e => setNewScene({...newScene, location: e.target.value})} placeholder="Location" className="p-inp" style={{ marginBottom: 12 }} />
                      <textarea value={newScene.description} onChange={e => setNewScene({...newScene, description: e.target.value})} rows={4} className="p-inp" placeholder="Describe the architectural intent and material excellence..." style={{ resize: 'none' }} />
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
                        <select className="p-inp" value={newScene.category} onChange={e => setNewScene({ ...newScene, category: e.target.value })}>
                          {['Residential', 'Commercial', 'Hospitality', 'Factory', 'Showroom', 'Demo Scene'].map(v => <option key={v}>{v}</option>)}
                        </select>
                        <select className="p-inp" value={newScene.status} onChange={e => setNewScene({ ...newScene, status: e.target.value })}>
                          {['Published', 'Draft', 'Internal'].map(v => <option key={v}>{v}</option>)}
                        </select>
                      </div>
                      <input value={newScene.audience} onChange={e => setNewScene({...newScene, audience: e.target.value})} placeholder="Audience, e.g. Client Presentation" className="p-inp" style={{ marginTop: 12 }} />
                      <input value={newScene.videoUrl} onChange={e => setNewScene({...newScene, videoUrl: e.target.value})} placeholder="🎬 3D Tour / Embed URL (optional — Kujiale, Matterport, etc.)" className="p-inp" style={{ marginTop: 12 }} />
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Display Order (1 = first on site):</label>
                        <input type="number" min={1} max={99} value={newScene.sortOrder ?? 99} onChange={e => setNewScene({ ...newScene, sortOrder: parseInt(e.target.value) || 99 })} className="p-inp" style={{ width: 80 }} />
                      </div>
                      <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 800, color: `var(--text-secondary)` }}>
                          <input type="checkbox" checked={newScene.clientVisible} onChange={e => setNewScene({ ...newScene, clientVisible: e.target.checked })} /> Client visible
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 800, color: `var(--text-secondary)` }}>
                          <input type="checkbox" checked={newScene.featured} onChange={e => setNewScene({ ...newScene, featured: e.target.checked })} /> Featured
                        </label>
                      </div>
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
                         {/* Replace image button */}
                         <button
                           onClick={e => { e.stopPropagation(); document.getElementById('scene-up').click(); }}
                           style={{ position: 'absolute', bottom: 12, right: 12, background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 11, fontWeight: 800, cursor: 'pointer', backdropFilter: 'blur(8px)' }}
                         >
                           Replace Image
                         </button>
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
                <button onClick={() => { setShowAdd(false); setEditTarget(null); }} className="p-btn-light" style={{ flex: 1, height: 56 }}>Discard</button>
                <button onClick={saveScene} className="p-btn-gold" style={{ flex: 2, height: 56, fontSize: 16 }}>
                  {editTarget ? 'Save Changes' : 'Publish Immersive Scene'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
