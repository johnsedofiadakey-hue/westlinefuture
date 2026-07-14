import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import {
  Sparkles, Layout, Activity, Smartphone, Image as ImgIcon,
  Users, ThumbsUp, Link2, Upload, X, Trash2, Trash,
  BarChart2, Star, Home, Plus,
  MessageSquare, CreditCard, ClipboardList, Ruler, Compass,
  FileImage, FileText, Briefcase, Layers, Palette, FileSpreadsheet,
  Wrench, Camera, ChevronDown, ChevronUp, Check, Save
} from 'lucide-react';
import { FF as PFormField } from '../../components/Shared';
import { uploadFile } from '../../lib/firebase';
import { compressImage } from '../../lib/image-utils';
import AdminShowcase from './AdminShowcase';
import AdminProductSync from './AdminProductSync';
import { DEFAULT_WORKFLOW, ABOUT_DATA, DEFAULT_HOME_SERVICES, DEFAULT_WHY_US, DEFAULT_STATS, ALL_SERVICES } from '../../data';

function CMSBranding({ brand, onSave, ac, notify }) {
  const [f, setF] = useState({ ...brand });

  const handleImageUpload = async (e, field) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const compressed = await compressImage(file, { maxWidth: 1000, quality: 0.8 });
        const url = await uploadFile('assets', `branding/${Date.now()}_${field}_${file.name}`, compressed);
        setF(prev => ({ ...prev, [field]: url }));
      } catch (err) { notify?.('error', 'Upload failed: ' + err.message); }
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <h3 className="lxfh" style={{ fontSize: 20 }}>Identity & Colors</h3>
        <PFormField label="Company Name"><input className="p-inp" value={f.name || ''} onChange={e => setF({...f, name: e.target.value})} /></PFormField>
        <PFormField label="Tagline"><input className="p-inp" value={f.tagline || ''} onChange={e => setF({...f, tagline: e.target.value})} /></PFormField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <PFormField label="Primary Background"><input type="color" className="p-inp" style={{ height: 44, padding: 4 }} value={(f.bgPrimary || '#FDFCFB').substring(0, 7)} onChange={e => setF({...f, bgPrimary: e.target.value})} /></PFormField>
          <PFormField label="Secondary Surface"><input type="color" className="p-inp" style={{ height: 44, padding: 4 }} value={(f.bgSecondary || '#F9F7F4').substring(0, 7)} onChange={e => setF({...f, bgSecondary: e.target.value})} /></PFormField>
          
          <PFormField label="Primary Text"><input type="color" className="p-inp" style={{ height: 44, padding: 4 }} value={(f.textPrimary || '#1A1410').substring(0, 7)} onChange={e => setF({...f, textPrimary: e.target.value})} /></PFormField>
          <PFormField label="Secondary Text"><input type="color" className="p-inp" style={{ height: 44, padding: 4 }} value={(f.textSecondary || '#A8A095').substring(0, 7)} onChange={e => setF({...f, textSecondary: e.target.value})} /></PFormField>
          
          <PFormField label="Primary Accent (Gold)"><input type="color" className="p-inp" style={{ height: 44, padding: 4 }} value={(f.accentPrimary || '#C8A96E').substring(0, 7)} onChange={e => setF({...f, accentPrimary: e.target.value})} /></PFormField>
          <PFormField label="Secondary Accent (Dark)"><input type="color" className="p-inp" style={{ height: 44, padding: 4 }} value={(f.accentSecondary || '#1A1410').substring(0, 7)} onChange={e => setF({...f, accentSecondary: e.target.value})} /></PFormField>
          
          <PFormField label="Border Color"><input type="color" className="p-inp" style={{ height: 44, padding: 4 }} value={(f.borderColor || '#1A1410').substring(0, 7)} onChange={e => setF({...f, borderColor: e.target.value})} /></PFormField>
          <PFormField label="Footer Background"><input type="color" className="p-inp" style={{ height: 44, padding: 4 }} value={(f.footerBg || '#12100E').substring(0, 7)} onChange={e => setF({...f, footerBg: e.target.value})} /></PFormField>
        </div>
        <PFormField label="Site Aesthetic / Theme">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { id: 'classic', n: 'Classic', desc: 'Premium serif & gold' },
              { id: 'minimal', n: 'Minimal', desc: 'Sharp edges & mono' },
              { id: 'avant-garde', n: 'Modern', desc: 'Rounded & vibrant' }
            ].map(t => (
              <button 
                key={t.id}
                onClick={() => setF({...f, theme: t.id})}
                style={{
                  padding: '12px 8px', borderRadius: 8, border: f.theme === t.id ? `2px solid ${ac}` : '1px solid rgba(0,0,0,0.1)',
                  background: f.theme === t.id ? `${ac}10` : '#fff', cursor: 'pointer', transition: 'all .2s', textAlign: 'center'
                }}
              >
                <div className="lxfh" style={{ fontSize: 13, fontWeight: 700, color: f.theme === t.id ? ac : `var(--accent-secondary)` }}>{t.n}</div>
                <div className="lxf" style={{ fontSize: 9, color: `var(--text-secondary)`, marginTop: 2 }}>{t.desc}</div>
              </button>
            ))}
          </div>
        </PFormField>
        <PFormField label="Typography">
          <div style={{
            padding: '16px 20px', borderRadius: 10, border: `2px solid ${ac}`,
            background: `${ac}0D`, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div className="lxfh" style={{ fontSize: 15, fontWeight: 800, color: `var(--accent-secondary)` }}>DM Sans · Professional</div>
              <div className="lxf" style={{ fontSize: 11, color: `var(--text-secondary)`, marginTop: 3 }}>Single font · headings, body, buttons, labels — everything</div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: ac, background: `${ac}20`, padding: '4px 12px', borderRadius: 20 }}>Active</div>
          </div>
        </PFormField>
        <button onClick={() => onSave({ ...brand, ...f, fontFamily: "'DM Sans', sans-serif" })} className="p-btn-dark lxf" style={{ alignSelf: 'flex-start', padding: '12px 32px', marginTop: 12 }}>Save Branding Identity</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <h3 className="lxfh" style={{ fontSize: 20 }}>Logo & Contact</h3>
        <PFormField label="Company Logo">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
             <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'logo')} />
             <input className="p-inp" placeholder="Or paste Image URL" style={{ flex: 1 }} value={f.logo || ''} onChange={e => setF({...f, logo: e.target.value})} />
          </div>
        </PFormField>
        <PFormField label="Official Phone"><input className="p-inp" value={f.phone || ''} onChange={e => setF({...f, phone: e.target.value})} /></PFormField>
        <PFormField label="Official Email"><input className="p-inp" value={f.email || ''} onChange={e => setF({...f, email: e.target.value})} /></PFormField>
        <PFormField label="Website URL"><input className="p-inp" placeholder="e.g. www.westlinefuture.com" value={f.website || ''} onChange={e => setF({...f, website: e.target.value})} /></PFormField>
        <PFormField label="Physical Location"><input className="p-inp" value={f.location || ''} onChange={e => setF({...f, location: e.target.value})} /></PFormField>
        <h3 className="lxfh" style={{ fontSize: 16, marginTop: 8, borderTop: '1px solid rgba(0,0,0,0.07)', paddingTop: 16 }}>Social Media URLs</h3>
        <PFormField label="Instagram"><input className="p-inp" placeholder="https://instagram.com/yourhandle" value={f.instagram || ''} onChange={e => setF({...f, instagram: e.target.value})} /></PFormField>
        <PFormField label="Facebook"><input className="p-inp" placeholder="https://facebook.com/yourpage" value={f.facebook || ''} onChange={e => setF({...f, facebook: e.target.value})} /></PFormField>
        <PFormField label="LinkedIn"><input className="p-inp" placeholder="https://linkedin.com/company/yourco" value={f.linkedin || ''} onChange={e => setF({...f, linkedin: e.target.value})} /></PFormField>
        <PFormField label="TikTok"><input className="p-inp" placeholder="https://tiktok.com/@yourhandle" value={f.tiktok || ''} onChange={e => setF({...f, tiktok: e.target.value})} /></PFormField>
        <PFormField label="YouTube"><input className="p-inp" placeholder="https://youtube.com/@yourchannel" value={f.youtube || ''} onChange={e => setF({...f, youtube: e.target.value})} /></PFormField>
      </div>
    </div>
  );
}

function CMSHomepage({ hero, onSave, ac, notify }) {
  const [slides, setSlides] = useState(hero?.slides || []);
  const [cta, setCta] = useState(hero?.cta || {
    heading: "Ready to build something remarkable?",
    sub:     "From concept to installation — our team handles every detail.",
    btn1:    "Request a Quote",
    btn2:    "View Portfolio",
  });

  const onFile = async (idx, file) => {
    if (file) {
      try {
        const compressed = await compressImage(file, { maxWidth: 1600, quality: 0.8 });
        const url = await uploadFile('assets', `homepage/${Date.now()}_slide_${idx}_${file.name}`, compressed);
        const ns = [...slides];
        ns[idx].img = url;
        setSlides(ns);
      } catch (err) { notify?.('error', 'Upload failed: ' + err.message); }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
      {/* Hero Carousel */}
      <div>
        <h3 className="lxfh" style={{ fontSize: 20, marginBottom: 20 }}>Hero Carousel</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {slides.map((s, i) => (
            <div key={s.title || i} className="p-card" style={{ padding: 20, background: `var(--bg-secondary)`, border: '1px solid rgba(0,0,0,.04)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr auto', gap: 20, alignItems: 'start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ height: 100, borderRadius: 6, overflow: 'hidden', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {s.img ? <img src={s.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImgIcon size={24} color="var(--text-secondary)" />}
                  </div>
                  <div style={{ position: 'relative', overflow: 'hidden' }}>
                    <button className="p-btn-light lxf" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '6px 0', fontSize: 10 }}><Upload size={12} /> Change Image</button>
                    <input type="file" accept="image/*" onChange={e => onFile(i, e.target.files[0])} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <input className="p-inp" placeholder="Headline" value={s.title} onChange={e => { const ns = [...slides]; ns[i].title = e.target.value; setSlides(ns); }} />
                  <textarea className="p-inp" placeholder="Sub-text" rows={2} value={s.sub} onChange={e => { const ns = [...slides]; ns[i].sub = e.target.value; setSlides(ns); }} />
                </div>
                <button onClick={() => setSlides(slides.filter((_, idx) => idx !== i))} style={{ color: '#ff4444', border: 'none', background: 'none', cursor: 'pointer', padding: 4, marginTop: 4 }}><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
          <button onClick={() => setSlides([...slides, { img: '', title: 'New Slide', sub: '' }])} className="p-btn-gold lxf" style={{ alignSelf: 'flex-start', padding: '8px 20px', fontSize: 12 }}><Plus size={14} style={{ marginRight: 6 }} />Add Slide</button>
        </div>
      </div>

      {/* CTA Section */}
      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 32 }}>
        <h3 className="lxfh" style={{ fontSize: 20, marginBottom: 20 }}>Bottom CTA Section</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <PFormField label="Heading"><input className="p-inp" value={cta.heading} onChange={e => setCta({ ...cta, heading: e.target.value })} /></PFormField>
          <PFormField label="Sub-text"><textarea className="p-inp" rows={2} value={cta.sub} onChange={e => setCta({ ...cta, sub: e.target.value })} /></PFormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <PFormField label="Primary Button Label"><input className="p-inp" value={cta.btn1} onChange={e => setCta({ ...cta, btn1: e.target.value })} /></PFormField>
            <PFormField label="Secondary Button Label"><input className="p-inp" value={cta.btn2} onChange={e => setCta({ ...cta, btn2: e.target.value })} /></PFormField>
          </div>
        </div>
      </div>

      <button onClick={() => onSave({ slides, cta })} className="p-btn-dark lxf" style={{ alignSelf: 'flex-start', padding: '10px 24px' }}>Save Homepage</button>
    </div>
  );
}

function CMSServices({ services, onSave, ac, notify }) {
  const [list, setList] = useState(services?.length > 0 ? services : ALL_SERVICES);

  const onFile = async (idx, file) => {
    if (file) {
      try {
        const compressed = await compressImage(file, { maxWidth: 1000, quality: 0.8 });
        const url = await uploadFile('assets', `services/${Date.now()}_img_${idx}_${file.name}`, compressed);
        const nl = [...list];
        nl[idx].img = url;
        setList(nl);
      } catch (err) { notify?.('error', 'Upload failed: ' + err.message); }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
         <h3 className="lxfh" style={{ fontSize: 20 }}>Service Offerings</h3>
         <button onClick={() => setList([...list, { id: Date.now(), name: 'New Service', tagline: '', desc: '', items: [], img: '' }])} className="p-btn-gold lxf" style={{ padding: '6px 14px', fontSize: 11 }}>Add Service</button>
       </div>
       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
         {list.map((s, i) => (
           <div key={s.id} className="p-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
             <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ width: 80, height: 80, borderRadius: 8, background: `var(--bg-secondary)`, overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                   {s.img ? <img src={s.img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: `var(--text-secondary)` }}><ImgIcon size={24} /></div>}
                   <input type="file" accept="image/*" onChange={e => onFile(i, e.target.files[0])} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                   <PFormField label="Service Name" nomargin><input className="p-inp" style={{ padding: '6px 10px' }} value={s.name} onChange={e => { const nl = [...list]; nl[i].name = e.target.value; setList(nl); }} /></PFormField>
                   <PFormField label="Tagline" nomargin><input className="p-inp" style={{ padding: '6px 10px' }} value={s.tagline || s.short || ''} onChange={e => { const nl = [...list]; nl[i].tagline = e.target.value; setList(nl); }} /></PFormField>
                </div>
             </div>
             <PFormField label="Description" nomargin><textarea className="p-inp" value={s.desc} rows={3} onChange={e => { const nl = [...list]; nl[i].desc = e.target.value; setList(nl); }} /></PFormField>
             <PFormField label="What we cover (comma separated)" nomargin>
                <textarea className="p-inp" value={(s.items || s.packages || []).join(', ')} rows={2} onChange={e => { const nl = [...list]; nl[i].items = e.target.value.split(',').map(v=>v.trim()).filter(Boolean); setList(nl); }} />
             </PFormField>
             <button onClick={() => setList(list.filter((_, idx) => idx !== i))} style={{ color: '#ff4444', fontSize: 11, background: 'none', border: 'none', padding: 0, marginTop: 'auto', alignSelf: 'flex-start', cursor: 'pointer' }}>Delete Service</button>
           </div>
         ))}
       </div>
       <button 
         onClick={() => {
           // Strip React Component before saving to Firestore to prevent errors
           const safeList = list.map(({ Icon, ...rest }) => rest);
           onSave(safeList);
           notify?.('success', 'Services saved');
         }} 
         className="p-btn-dark lxf" style={{ alignSelf: 'flex-start', padding: '10px 24px' }}>
         Save Services
       </button>
    </div>
  );
}function CMSProducts({ ac, notify }) {
  const [list, setList] = useState([]);
  const [cats, setCats] = useState([]);
  const [view, setView] = useState('list'); // 'list', 'add', 'cats'
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteProductId, setConfirmDeleteProductId] = useState(null);

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form states
  const [newItem, setNewItem] = useState({
    name: '', tagline: '', desc: '', img: '', cat: '', specs: '',
    fobPrice: '', landedCost: '', retailPrice: '', status: 'Available', stock: 10, threshold: 2,
    colors: '', options: ''
  });
  const [newCat, setNewCat] = useState({ id: '', label: '', icon: '📦', groupId: 'aluminum', desc: '' });

  const GROUPS = [
    { id: 'aluminum',   label: 'Aluminium & Glass' },
    { id: 'washroom',   label: 'Bathrooms' },
    { id: 'kitchen',    label: 'Kitchens' },
    { id: 'wardrobe',   label: 'Wardrobes' },
    { id: 'tiles',      label: 'Tiles & Flooring' },
    { id: 'doors',      label: 'Doors' },
    { id: 'interior',   label: 'Interior Finishing' },
    { id: 'electrical', label: 'Electrical' },
    { id: 'plumbing',   label: 'Plumbing' },
  ];

  useEffect(() => {
    if (!db) { setLoading(false); return; }
    const unsubProducts = onSnapshot(collection(db, 'products'), (snap) => {
      setList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    const unsubCats = onSnapshot(collection(db, 'categories'), (snap) => {
      const dbCats = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCats(dbCats);
      if (dbCats.length > 0 && !newItem.cat) {
         setNewItem(prev => ({ ...prev, cat: dbCats[0].id }));
      }
    });
    return () => { unsubProducts(); unsubCats(); };
  }, []);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploading(true);
      try {
        const compressed = await compressImage(file, { maxWidth: 1000, quality: 0.8 });
        const url = await uploadFile('assets', `products/${Date.now()}_${file.name}`, compressed);
        setNewItem(prev => ({ ...prev, img: url }));
      } catch (err) { notify?.('error', 'Upload failed: ' + err.message); }
      setUploading(false);
    }
  };

  const handleEditClick = (p) => {
    setIsEditing(true);
    setEditingId(p.id);

    // Format specs to string if it is an object
    let specsStr = '';
    if (p.specs) {
      if (typeof p.specs === 'object') {
        specsStr = Object.entries(p.specs).map(([k, v]) => `${k}: ${v}`).join('\n');
      } else {
        specsStr = String(p.specs);
      }
    }

    setNewItem({
      name: p.name || '',
      tagline: p.tagline || '',
      desc: p.desc || '',
      img: p.img || '',
      cat: p.cat || '',
      specs: specsStr,
      fobPrice: p.fobPrice || '',
      landedCost: p.landedCost || '',
      retailPrice: p.retailPrice || '',
      status: p.status || 'Available',
      stock: p.stock || 10,
      threshold: p.threshold || 2,
      colors: Array.isArray(p.colors) ? p.colors.join(', ') : '',
      options: Array.isArray(p.options) ? p.options.join(', ') : ''
    });

    setView('add');
  };

  const handleBackToList = () => {
    setNewItem({ 
      name: '', tagline: '', desc: '', img: cats?.[0]?.id || '', cat: '', specs: '', 
      fobPrice: '', landedCost: '', retailPrice: '', status: 'Available', stock: 10, threshold: 2,
      colors: '', options: ''
    });
    setIsEditing(false);
    setEditingId(null);
    setView('list');
  };

  const saveProduct = async () => {
    if (!newItem.name || !newItem.img) { notify?.('error', 'Name and Image are required.'); return; }
    if (!db) { notify?.('error', 'Database offline.'); return; }
    
    // Parse specs from string to clean object
    const parsedSpecs = {};
    String(newItem.specs || '').split('\n').forEach(line => {
      const idx = line.indexOf(':');
      if (idx !== -1) {
        parsedSpecs[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
      }
    });

    const parsedColors = String(newItem.colors || '').split(',').map(c => c.trim()).filter(Boolean);
    const parsedOptions = String(newItem.options || '').split(',').map(o => o.trim()).filter(Boolean);

    const docId = isEditing ? editingId : `PROD-${Date.now()}`;
    const productPayload = {
      name: newItem.name,
      tagline: newItem.tagline || '',
      desc: newItem.desc || '',
      img: newItem.img,
      cat: newItem.cat,
      specs: parsedSpecs,
      colors: parsedColors.length > 0 ? parsedColors : null,
      options: parsedOptions.length > 0 ? parsedOptions : null,
      fobPrice: newItem.fobPrice || '',
      landedCost: newItem.landedCost || '',
      retailPrice: newItem.retailPrice || '',
      status: newItem.status,
      stock: Number(newItem.stock || 0),
      threshold: Number(newItem.threshold || 2),
      updatedAt: serverTimestamp()
    };

    if (!isEditing) {
      productPayload.id = docId;
      productPayload.createdAt = serverTimestamp();
    }

    await setDoc(doc(db, 'products', docId), productPayload, { merge: true });
    notify?.('success', isEditing ? 'Asset updated live!' : 'Asset created live!');

    // Reset states
    setNewItem({ 
      name: '', tagline: '', desc: '', img: cats?.[0]?.id || '', cat: '', specs: '', 
      fobPrice: '', landedCost: '', retailPrice: '', status: 'Available', stock: 10, threshold: 2,
      colors: '', options: ''
    });
    setIsEditing(false);
    setEditingId(null);
    setView('list');
  };

  const removeProduct = (id) => setConfirmDeleteProductId(id);

  const confirmDeleteProduct = async () => {
    const id = confirmDeleteProductId;
    setConfirmDeleteProductId(null);
    if (!db) return;
    await deleteDoc(doc(db, 'products', id));
    notify?.('success', 'Asset deleted');
  };

  const saveCategory = async () => {
    if (!newCat.id || !newCat.label) { notify?.('error', 'ID and Label are required.'); return; }
    if (!db) return;
    await setDoc(doc(db, 'categories', newCat.id), newCat);
    notify?.('success', 'Category created!');
    setNewCat({ id: '', label: '', icon: '📦', groupId: 'aluminum', desc: '' });
  };

  const removeCategory = async (id) => {
    if (!db) return;
    await deleteDoc(doc(db, 'categories', id));
  };

  const seedDemoData = async () => {
    if (!db) return;
    notify?.('pending', 'Seeding demo catalog...');
    import('../../catalog.jsx').then(async (m) => {
      const batch = writeBatch(db);
      m.GLASS_CATALOG_CATEGORIES.forEach(c => {
         batch.set(doc(db, 'categories', c.id), c);
      });
      m.GLASS_CATALOG_DATA.forEach(p => {
         batch.set(doc(db, 'products', p.id), p);
      });
      await batch.commit();
      notify?.('success', 'Demo catalog synced to real-time database!');
    });
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: `var(--text-secondary)` }}>Loading live catalog...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
         <h3 className="lxfh" style={{ fontSize: 24, color: `var(--accent-secondary)` }}>Live Catalog Manager</h3>
         <div style={{ display: 'flex', gap: 12 }}>
            {view !== 'list' && <button onClick={handleBackToList} className="p-btn-outline lxf" style={{ padding: '10px 20px', borderRadius: 100 }}>Back to List</button>}
            {view === 'list' && (
               <>
                 <button onClick={() => setView('cats')} style={{ padding: '10px 20px', background: '#fff', border: '1px solid #ddd', borderRadius: 100, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Manage Categories</button>
                 <button onClick={() => setView('add')} className="p-btn-gold lxf" style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 100 }}>
                   <Upload size={16} /> Add Asset
                 </button>
               </>
            )}
         </div>
       </div>

       <div style={{ padding: 18, background: 'linear-gradient(135deg, rgba(24,14,6,0.04), rgba(197,168,128,0.12))', border: '1px solid var(--border-color)', borderRadius: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
         <div>
           <div className="lxfh" style={{ fontSize: 16, color: `var(--accent-secondary)`, marginBottom: 4 }}>Supplier Website Scraping</div>
           <div style={{ fontSize: 12, color: `var(--text-secondary)`, lineHeight: 1.6 }}>
             Add Meijia VIP or future supplier links in Product Sync, then run the Cloud Run worker to populate this catalog.
           </div>
         </div>
         <button onClick={() => window.location.assign('/admin/product-sync')} className="p-btn-gold lxf" style={{ padding: '11px 18px', borderRadius: 12, fontSize: 12, fontWeight: 900 }}>
           Open Product Sync Settings
         </button>
       </div>

       {view === 'cats' && (
         <div className="fade-in" style={{ background: '#fff', borderRadius: 24, padding: 32, border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: 32 }}>
           <div>
             <h4 className="lxfh" style={{ fontSize: 20, marginBottom: 16 }}>Create New Category</h4>
             <div style={{ background: `var(--bg-secondary)`, padding: 24, borderRadius: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, alignItems: 'flex-end' }}>
                <PFormField label="Cat ID (Slug)"><input className="p-inp" placeholder="e.g. casement" value={newCat.id} onChange={e => setNewCat({...newCat, id: e.target.value.toLowerCase().replace(/\s/g, '-')})} /></PFormField>
                <PFormField label="Label Name"><input className="p-inp" placeholder="e.g. Casement Windows" value={newCat.label} onChange={e => setNewCat({...newCat, label: e.target.value})} /></PFormField>
                <PFormField label="Group">
                  <select className="p-inp" value={newCat.groupId} onChange={e => setNewCat({...newCat, groupId: e.target.value})}>
                    {GROUPS.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                  </select>
                </PFormField>
                <PFormField label="Icon"><input className="p-inp" placeholder="Emoji" value={newCat.icon} onChange={e => setNewCat({...newCat, icon: e.target.value})} /></PFormField>
                <button onClick={saveCategory} className="p-btn-dark lxf" style={{ height: 44, borderRadius: 12 }}>Save Category</button>
             </div>
           </div>
           
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
             {GROUPS.map(g => {
                const groupCats = cats.filter(c => c.groupId === g.id);
                if (!groupCats.length) return null;
                return (
                  <div key={g.id}>
                    <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', color: ac, letterSpacing: '0.1em', marginBottom: 12 }}>{g.label}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {groupCats.map(c => (
                        <div key={c.id} style={{ padding: '12px 16px', background: `var(--bg-secondary)`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontSize: 20 }}>{c.icon}</span>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: `var(--text-primary)` }}>{c.label}</div>
                              <div style={{ fontSize: 11, color: `var(--text-secondary)` }}>ID: {c.id}</div>
                            </div>
                          </div>
                          <button onClick={() => removeCategory(c.id)} style={{ color: '#ff4444', background: 'none', border: 'none', cursor: 'pointer' }}><Trash size={16} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
             })}
           </div>
         </div>
       )}

       {view === 'add' && (
         <div className="fade-in" style={{ background: '#fff', borderRadius: 24, padding: 32, border: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: '300px 1fr', gap: 40 }}>
           <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
             <div className="lxf" style={{ fontSize: 14, fontWeight: 700 }}>Product Image</div>
             <div style={{ height: 280, background: newItem.img ? '#fff' : `var(--bg-secondary)`, border: newItem.img ? '1px solid var(--border-color)' : '2px dashed #DCD7D1', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
               {uploading ? (
                 <div className="lxf" style={{ color: ac, fontWeight: 600 }}>Uploading...</div>
               ) : newItem.img ? (
                 <img src={newItem.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', mixBlendMode: 'multiply' }} />
               ) : (
                 <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: `var(--text-secondary)` }}>
                   <Upload size={32} style={{ marginBottom: 12 }} />
                   <div className="lxf" style={{ fontSize: 13, fontWeight: 600 }}>Drag image here</div>
                 </div>
               )}
               <input type="file" accept="image/*" onChange={handleImageUpload} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} disabled={uploading} />
             </div>
           </div>

           <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
             <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr', gap: 16 }}>
               <PFormField label="Product Name"><input className="p-inp" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} /></PFormField>
               <PFormField label="Product Tagline"><input className="p-inp" placeholder="e.g. Premium Aluminium Systems" value={newItem.tagline} onChange={e => setNewItem({...newItem, tagline: e.target.value})} /></PFormField>
               <PFormField label="Category">
                 <select className="p-inp" value={newItem.cat} onChange={e => setNewItem({...newItem, cat: e.target.value})}>
                    {(cats || []).map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                 </select>
               </PFormField>
             </div>

             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
               <PFormField label="FOB Price USD (China cost — internal)" sub="Cost from factory in China, USD"><input className="p-inp" placeholder="USD 0.00" value={newItem.fobPrice} onChange={e => setNewItem({...newItem, fobPrice: e.target.value})} /></PFormField>
               <PFormField label="Landed Cost GH₵ (after duties — internal)" sub="Total cost after shipping & import duties"><input className="p-inp" placeholder="GH₵ 0.00" value={newItem.landedCost} onChange={e => setNewItem({...newItem, landedCost: e.target.value})} /></PFormField>
               <PFormField label="Retail Price GHS (Public)" sub="Shown to clients — enables Buy Now">
                 <input className="p-inp" placeholder="GH₵ 0.00" value={newItem.retailPrice} onChange={e => setNewItem({...newItem, retailPrice: e.target.value})} />
               </PFormField>
               <PFormField label="Stock Qty"><input type="number" className="p-inp" value={newItem.stock} onChange={e => setNewItem({...newItem, stock: parseInt(e.target.value)})} /></PFormField>
               <PFormField label="Status">
                 <select className="p-inp" value={newItem.status} onChange={e => setNewItem({...newItem, status: e.target.value})}>
                   <option value="Available">Available</option>
                   <option value="Pre-order">Pre-order</option>
                   <option value="Sold Out">Sold Out</option>
                 </select>
               </PFormField>
             </div>

             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
               <PFormField label="Finish Colors (Comma separated)" hint="e.g. Anodized Black, Satin Bronze, Matt White">
                 <input className="p-inp" placeholder="Anodized Black, Satin Bronze..." value={newItem.colors || ''} onChange={e => setNewItem({...newItem, colors: e.target.value})} />
               </PFormField>
               <PFormField label="Structural Options (Comma separated)" hint="e.g. Standard, Double Glazed DGU, Low-E Laminated">
                 <input className="p-inp" placeholder="Standard, Double Glazed..." value={newItem.options || ''} onChange={e => setNewItem({...newItem, options: e.target.value})} />
               </PFormField>
             </div>

             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
               <PFormField label="Product Overview Description (Public page summary)">
                  <textarea 
                    className="p-inp" 
                    rows={6} 
                    placeholder="Provide a premium, structured overview.&#10;Use bullet points (-) for key features:&#10;- Feature 1&#10;- Feature 2"
                    value={newItem.desc} 
                    onChange={e => setNewItem({...newItem, desc: e.target.value})} 
                  />
               </PFormField>
               <PFormField label="Technical Specifications (Format: Key: Value per line)" hint="e.g. Glass Thickness: 24mm DGU\nWind Resistance: Grade 8">
                  <textarea 
                    className="p-inp" 
                    rows={6} 
                    placeholder="Glass Thickness: 24mm DGU&#10;Solar Heat Gain: 0.28&#10;Clarity: 92%&#10;Warranty: 10 Years"
                    value={newItem.specs} 
                    onChange={e => setNewItem({...newItem, specs: e.target.value})} 
                  />
               </PFormField>
             </div>

             <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid var(--border-color)', gap: 12 }}>
               {isEditing && <button onClick={handleBackToList} className="p-btn-outline lxf" style={{ padding: '14px 30px', borderRadius: 12, fontSize: 16 }}>Cancel Edit</button>}
               <button onClick={saveProduct} className="p-btn-gold lxf" style={{ padding: '14px 40px', borderRadius: 12, fontSize: 16 }}>
                 {isEditing ? 'Save Product Changes' : 'Publish to Live Catalog'}
               </button>
             </div>
           </div>
         </div>
       )}

       {view === 'list' && (
         <>
           {list.length === 0 && (
             <div style={{ padding: 60, textAlign: 'center', background: `var(--bg-secondary)`, borderRadius: 24, border: '1px dashed var(--border-color)' }}>
               <div style={{ fontSize: 18, fontWeight: 700, color: `var(--text-primary)`, marginBottom: 12 }}>Your Catalog is Empty</div>
               <div style={{ fontSize: 14, color: `var(--text-secondary)`, marginBottom: 24 }}>Scale instantly by syncing the demonstration catalog.</div>
               <button onClick={seedDemoData} className="p-btn-dark lxf" style={{ padding: '12px 32px', borderRadius: 100 }}>Seed Demo Database</button>
             </div>
           )}

           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
             {list.map(p => (
               <div key={p.id} className="p-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ height: 180, background: `var(--bg-secondary)`, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid var(--border-color)' }}>
                    {p.img ? <img src={p.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', mixBlendMode: 'multiply', padding: 24 }} /> : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#EF4444' }}><div style={{ fontSize: 24, marginBottom: 4 }}>⚠️</div><div style={{ fontSize: 11, fontWeight: 700 }}>MISSING IMAGE</div></div>}
                    <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.9)', padding: '4px 10px', borderRadius: 100, fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: p.status === 'Pre-order' ? '#D97706' : '#059669', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                      {p.status}
                    </div>
                  </div>
                  <div style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div className="lxf" style={{ fontSize: 10, color: ac, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>{p.cat}</div>
                    <div className="lxfh" style={{ fontSize: 18, marginBottom: 12, color: `var(--accent-secondary)` }}>{p.name}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: `var(--bg-primary)`, padding: 12, borderRadius: 8, border: '1px solid var(--border-color)', marginBottom: 20 }}>
                      <div><div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', fontWeight: 700 }}>FOB</div><div style={{ fontSize: 13, fontWeight: 600 }}>{p.fobPrice || '-'}</div></div>
                      <div><div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', fontWeight: 700 }}>Landed</div><div style={{ fontSize: 13, fontWeight: 600, color: ac }}>{p.landedCost || '-'}</div></div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
                      <button onClick={() => removeProduct(p.id)} style={{ color: '#ff4444', fontSize: 12, background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}><Trash size={14} /> Remove</button>
                      <button onClick={() => handleEditClick(p)} style={{ color: ac, fontSize: 12, background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}><Palette size={14} /> Edit</button>
                    </div>
                  </div>
               </div>
             ))}
           </div>
         </>
       )}

      {confirmDeleteProductId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--bg-primary)', borderRadius: 20, padding: 32, maxWidth: 360, width: '100%', textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>🗑️</div>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>Delete Asset?</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>This product will be permanently removed from the catalog.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmDeleteProductId(null)} style={{ flex: 1, height: 44, borderRadius: 12, border: '1.5px solid var(--border-color)', background: 'transparent', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button onClick={confirmDeleteProduct} style={{ flex: 1, height: 44, borderRadius: 12, border: 'none', background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CMSAbout({ about, onSave, ac, notify }) {
  const [f, setF] = useState(about?.title ? about : ABOUT_DATA);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const compressed = await compressImage(file, { maxWidth: 1200, quality: 0.8 });
        const url = await uploadFile('assets', `about/${Date.now()}_${file.name}`, compressed);
        setF(prev => ({ ...prev, image: url }));
      } catch (err) { notify?.('error', 'Upload failed: ' + err.message); }
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 40 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <h3 className="lxfh" style={{ fontSize: 20 }}>Leadership & Story</h3>
        <PFormField label="Managing Director — Name"><input className="p-inp" value={f.founder || ''} onChange={e => setF({...f, founder: e.target.value})} /></PFormField>
        <PFormField label="Managing Director — Role / Title"><input className="p-inp" value={f.role || 'Managing Director'} onChange={e => setF({...f, role: e.target.value})} /></PFormField>
        <PFormField label="Managing Director — Biography"><textarea className="p-inp" rows={5} value={f.bio || ''} onChange={e => setF({...f, bio: e.target.value})} /></PFormField>
        <PFormField label="Founding Partner — Name"><input className="p-inp" value={f.coFounder || ''} onChange={e => setF({...f, coFounder: e.target.value})} /></PFormField>
        <PFormField label="Founding Partner — Role / Title"><input className="p-inp" value={f.coFounderRole || 'Founding Partner'} onChange={e => setF({...f, coFounderRole: e.target.value})} /></PFormField>
        <PFormField label="Founding Partner — Biography"><textarea className="p-inp" rows={5} value={f.coFounderBio || ''} onChange={e => setF({...f, coFounderBio: e.target.value})} /></PFormField>
        <PFormField label="Story Headline"><input className="p-inp" value={f.storyTitle || ''} onChange={e => setF({...f, storyTitle: e.target.value})} /></PFormField>
        <PFormField label="Mission Summary"><textarea className="p-inp" rows={3} value={f.story || ''} onChange={e => setF({...f, story: e.target.value})} /></PFormField>

        <button onClick={() => onSave(f)} className="p-btn-dark lxf" style={{ alignSelf: 'flex-start', padding: '10px 24px' }}>Save About Page</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <h3 className="lxfh" style={{ fontSize: 20 }}>About Page Image</h3>
        <div style={{ height: 300, background: `var(--bg-secondary)`, borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
          {f.image ? <img src={f.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No Image</div>}
          <div style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}>
             <input type="file" accept="image/*" onChange={handleImageUpload} style={{ width: '100%', height: '100%', cursor: 'pointer' }} />
          </div>
        </div>
        <div className="lxf" style={{ fontSize: 11, color: `var(--text-secondary)`, textAlign: 'center' }}>Click the container above to change image</div>
      </div>
    </div>
  );
}

function CMSShowroom({ showcase, onSave, ac, notify }) {
  // Fallback URL — only shown on the public Showroom page if there are NO scenes
  // with a videoUrl in the Showcase Hub. Full scene management is in Showcase Hub.
  const [url, setUrl] = useState(showcase?.videoUrl || '');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h3 className="lxfh" style={{ fontSize: 20, marginBottom: 4 }}>Showroom Settings</h3>

      {/* Primary info card */}
      <div style={{ padding: '20px 24px', borderRadius: 16, background: `${ac}10`, border: `1.5px solid ${ac}30`, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: ac, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>🎬</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent-secondary)', marginBottom: 6 }}>Scenes are managed in Showcase Hub</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            To add, edit, reorder, or delete 3D tour scenes on the public Showroom page, go to <strong>Showcase Hub</strong> in the left sidebar.<br />
            Each scene has a <strong>Display Order</strong> field — set it to <strong>1</strong> to make that scene appear first.
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href="/admin/showcase" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 10, background: ac, color: '#fff', textDecoration: 'none', fontSize: 12, fontWeight: 700 }}>
              Open Showcase Hub →
            </a>
            <a href="/showcase" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--accent-secondary)', textDecoration: 'none', fontSize: 12, fontWeight: 700 }}>
              Preview Public Showroom ↗
            </a>
          </div>
        </div>
      </div>

      {/* Fallback URL — only used if Showcase Hub has no scenes with videoUrl */}
      <div style={{ padding: '16px 20px', borderRadius: 14, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Fallback Embed URL <span style={{ fontWeight: 400, fontSize: 11 }}>(only shown if Showcase Hub has no 3D scenes)</span></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            className="p-inp"
            placeholder="https://yun.kujiale.com/design/..."
            value={url}
            onChange={e => setUrl(e.target.value)}
            style={{ flex: 1 }}
          />
          <button
            onClick={() => { onSave({ ...showcase, videoUrl: url }); notify?.('success', 'Fallback URL saved'); }}
            className="p-btn-dark lxf" style={{ padding: '10px 20px', whiteSpace: 'nowrap' }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function CMSTestimonials({ list, onSave, ac }) {
  const [items, setItems] = useState(withId(list || []));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
       <h3 className="lxfh" style={{ fontSize: 20 }}>Client Testimonials</h3>
       <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
         {items.map((t, i) => (
           <div key={t._id} className="p-card" style={{ padding: 20, display: 'flex', gap: 20, alignItems: 'center' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: ac, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>{t.name?.[0] || 'C'}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                  <input className="p-inp" placeholder="Name" value={t.name} style={{ width: 200 }} onChange={e => { const ni = [...items]; ni[i].name = e.target.value; setItems(ni); }} />
                  <input className="p-inp" placeholder="Role" value={t.role} style={{ width: 200 }} onChange={e => { const ni = [...items]; ni[i].role = e.target.value; setItems(ni); }} />
                </div>
                <textarea className="p-inp" value={t.text} rows={2} onChange={e => { const ni = [...items]; ni[i].text = e.target.value; setItems(ni); }} />
              </div>
              <button onClick={() => setItems(items.filter((_, idx) => idx !== i))} style={{ color: '#ff4444', border: 'none', background: 'none', cursor: 'pointer' }}><Trash2 size={18} /></button>
           </div>
         ))}
       </div>
       <button onClick={() => setItems([...items, { _id: newId(), name: 'New Client', role: 'Developer', text: '', rating: 5 }])} className="p-btn-gold lxf" style={{ alignSelf: 'flex-start', padding: '8px 20px' }}>Add Testimonial</button>
       <button onClick={() => onSave(items)} className="p-btn-dark lxf" style={{ alignSelf: 'flex-start', padding: '10px 24px' }}>Save Testimonials</button>
    </div>
  );
}

function CMSFooter({ data, onSave, ac }) {
  const [links, setLinks] = useState(withId(data?.links || []));
  const [description, setDescription] = useState(data?.description || '');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
       <h3 className="lxfh" style={{ fontSize: 20 }}>Footer Information</h3>

       {/* Footer description */}
       <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
         <div className="lxf" style={{ fontSize: 13, fontWeight: 600 }}>Footer Description</div>
         <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Shown beneath the logo in the footer. Leave blank to use the company tagline from Branding settings.</div>
         <textarea
           className="p-inp"
           rows={3}
           placeholder="e.g. Global precision meets local delivery. Premium interior solutions..."
           value={description}
           onChange={e => setDescription(e.target.value)}
           style={{ resize: 'vertical', fontFamily: 'inherit' }}
         />
       </div>

       {/* Policy links */}
       <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
         <div className="lxf" style={{ fontSize: 13, fontWeight: 600 }}>Policy Links</div>
         <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Links shown in the footer bottom bar (e.g. Privacy Policy, Terms of Service).</div>
         {links.map((l, i) => (
           <div key={l._id} style={{ display: 'flex', gap: 12 }}>
             <input className="p-inp" placeholder="Label (e.g. Privacy Policy)" value={l.label} onChange={e => { const nl = [...links]; nl[i].label = e.target.value; setLinks(nl); }} />
             <input className="p-inp" placeholder="URL" value={l.url} onChange={e => { const nl = [...links]; nl[i].url = e.target.value; setLinks(nl); }} />
             <button onClick={() => setLinks(links.filter((_, idx) => idx !== i))} style={{ color: '#ff4444', border: 'none', background: 'none', cursor: 'pointer' }}><X size={16} /></button>
           </div>
         ))}
         <button onClick={() => setLinks([...links, { _id: newId(), label: '', url: '#' }])} className="lxf" style={{ fontSize: 11, color: ac, background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', fontWeight: 600 }}>+ Add Link</button>
       </div>
       <button onClick={() => onSave({ description, links })} className="p-btn-dark lxf" style={{ alignSelf: 'flex-start', padding: '10px 24px' }}>Save Footer</button>
    </div>
  );
}

function CMSGallery({ portfolio, onSave, ac, notify }) {
  const [list, setList] = useState(portfolio || []);

  const onFile = async (idx, field, file) => {
    if (file) {
      try {
        const compressed = await compressImage(file, { maxWidth: 1600, quality: 0.8 });
        const url = await uploadFile('assets', `portfolio/${Date.now()}_${field}_${file.name}`, compressed);
        const nl = [...list];
        nl[idx][field] = url;
        setList(nl);
      } catch (err) { notify?.('error', 'Upload failed: ' + err.message); }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
       <h3 className="lxfh" style={{ fontSize: 20 }}>Showcase Project Settings</h3>
       <div className="lxf" style={{ fontSize: 12, color: `var(--text-secondary)`, marginBottom: -10 }}>Manage the technical projects displayed on your architectural profile.</div>
       <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
         {list.map((p, i) => (
           <div key={p.id} className="p-card" style={{ padding: 20 }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
               <div className="lxfh" style={{ fontSize: 18 }}>{p.title || 'Untitled Project'}</div>
               <button onClick={() => setList(list.filter((_, idx) => idx !== i))} style={{ color: '#ff4444', border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}><Trash2 size={18} /></button>
             </div>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
               <PFormField label="Project Title"><input className="p-inp" value={p.title || ''} onChange={e => { const nl = [...list]; nl[i].title = e.target.value; setList(nl); }} /></PFormField>
               <PFormField label="Category">
                 <select className="p-inp" value={p.cat || 'Full Interior'} onChange={e => { const nl = [...list]; nl[i].cat = e.target.value; setList(nl); }}>
                   <option>Full Interior</option><option>Kitchen Installation</option><option>Washroom Setup</option>
                   <option>Office Fit-out</option><option>Residential Finishing</option><option>Glass & Aluminum</option>
                 </select>
               </PFormField>
               <PFormField label="After Image (Main)">
                  <div style={{ position: 'relative', overflow: 'hidden' }}>
                    <button className="p-btn-light lxf" style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}><Upload size={14} /> {p.after?.startsWith('https') ? 'Uploaded Asset' : 'Select Image'}</button>
                    <input type="file" accept="image/*" onChange={e => onFile(i, 'after', e.target.files[0])} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                  </div>
               </PFormField>
               <PFormField label="Before Image (Optional)">
                  <div style={{ position: 'relative', overflow: 'hidden' }}>
                    <button className="p-btn-light lxf" style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}><Upload size={14} /> {p.before?.startsWith('https') ? 'Uploaded Asset' : 'Select Image'}</button>
                    <input type="file" accept="image/*" onChange={e => onFile(i, 'before', e.target.files[0])} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                  </div>
               </PFormField>
               <PFormField label="Location"><input className="p-inp" value={p.loc || ''} onChange={e => { const nl = [...list]; nl[i].loc = e.target.value; setList(nl); }} /></PFormField>
             </div>
           </div>
         ))}
         <button onClick={() => setList([...list, { id: Date.now(), title: 'New Project', cat: 'Full Interior', year: new Date().getFullYear().toString(), loc: '', desc: '', before: '', after: '' }])} className="p-btn-gold lxf" style={{ alignSelf: 'flex-start', padding: '8px 24px', borderRadius: 8 }}>+ Add Project</button>
       </div>
       <button onClick={() => onSave(list)} className="p-btn-dark lxf" style={{ alignSelf: 'flex-start', padding: '10px 24px' }}>Save Showcase</button>
    </div>
  );
}

const EMOJI_OPTIONS = ['🛡️','⏱️','🌍','🔧','🏆','💎','🤝','📦','🔬','⚡','✅','🎯','🏗️','🪑','🌿','🔒','🏅','🌟','🎨','📐','🔑','💡','🚀','🌐'];
const withId = arr => (arr || []).map(item => item._id ? item : { ...item, _id: `${Date.now()}-${Math.random().toString(36).slice(2)}` });
const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function CMSStats({ stats, onSave, ac }) {
  const [items, setItems] = useState(stats?.length > 0 ? stats : DEFAULT_STATS);

  const update = (i, key, val) => { const n = [...items]; n[i] = { ...n[i], [key]: val }; setItems(n); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 className="lxfh" style={{ fontSize: 20 }}>Homepage Stats Bar</h3>
          <div style={{ fontSize: 12, color: `var(--text-secondary)`, marginTop: 4 }}>The dark strip of numbers between the hero and services sections.</div>
        </div>
        <button onClick={() => setItems([...items, { _id: newId(), value: '', label: '', labelMob: '' }])} className="p-btn-gold lxf" style={{ padding: '8px 16px', fontSize: 12 }}><Plus size={14} style={{ marginRight: 6 }} />Add Stat</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((s, i) => (
          <div key={s._id} style={{ display: 'grid', gridTemplateColumns: '130px 1fr 130px auto', gap: 12, alignItems: 'center', background: `var(--bg-secondary)`, padding: '16px 20px', borderRadius: 12 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: `var(--text-secondary)`, textTransform: 'uppercase', marginBottom: 6 }}>Number / Value</div>
              <input className="p-inp" placeholder="e.g. 200+" value={s.value} onChange={e => update(i, 'value', e.target.value)} />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: `var(--text-secondary)`, textTransform: 'uppercase', marginBottom: 6 }}>Desktop Label</div>
              <input className="p-inp" placeholder="e.g. Projects Delivered" value={s.label} onChange={e => update(i, 'label', e.target.value)} />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: `var(--text-secondary)`, textTransform: 'uppercase', marginBottom: 6 }}>Mobile Label</div>
              <input className="p-inp" placeholder="e.g. Projects" value={s.labelMob || ''} onChange={e => update(i, 'labelMob', e.target.value)} />
            </div>
            <button onClick={() => setItems(items.filter((_, idx) => idx !== i))} style={{ color: '#ff4444', border: 'none', background: 'none', cursor: 'pointer', padding: 4 }}><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
      {/* Live preview */}
      <div style={{ background: `var(--accent-secondary)`, borderRadius: 16, padding: '28px 32px', display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: 16 }}>
        {items.map((s, i) => (
          <div key={s._id} style={{ textAlign: 'center', borderRight: i < items.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none', padding: '0 12px' }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: ac, lineHeight: 1 }}>{s.value || '—'}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label || 'Label'}</div>
          </div>
        ))}
      </div>
      <button onClick={() => onSave(items)} className="p-btn-dark lxf" style={{ alignSelf: 'flex-start', padding: '10px 24px' }}>Save Stats Bar</button>
    </div>
  );
}

function CMSWhyUs({ whyUs, onSave, ac }) {
  const [items, setItems] = useState(whyUs?.length > 0 ? whyUs : DEFAULT_WHY_US);

  const update = (i, key, val) => { const n = [...items]; n[i] = { ...n[i], [key]: val }; setItems(n); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 className="lxfh" style={{ fontSize: 20 }}>Why Choose Us</h3>
          <div style={{ fontSize: 12, color: `var(--text-secondary)`, marginTop: 4 }}>Reason cards displayed in the "Built to a higher standard" section.</div>
        </div>
        <button onClick={() => setItems([...items, { _id: newId(), emoji: '✅', title: 'New Reason', desc: '' }])} className="p-btn-gold lxf" style={{ padding: '8px 16px', fontSize: 12 }}><Plus size={14} style={{ marginRight: 6 }} />Add Card</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {items.map((r, i) => (
          <div key={r._id} className="p-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: `${ac}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{r.emoji || '✅'}</div>
                <div style={{ fontSize: 12, color: `var(--text-secondary)`, fontWeight: 600 }}>Pick icon:</div>
              </div>
              <button onClick={() => setItems(items.filter((_, idx) => idx !== i))} style={{ color: '#ff4444', border: 'none', background: 'none', cursor: 'pointer', padding: 4 }}><Trash2 size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {EMOJI_OPTIONS.map(em => (
                <button key={em} onClick={() => update(i, 'emoji', em)}
                  style={{ fontSize: 18, padding: '4px 6px', borderRadius: 8, cursor: 'pointer', border: r.emoji === em ? `2px solid ${ac}` : '1px solid var(--border-color)', background: r.emoji === em ? `${ac}12` : '#fff', lineHeight: 1 }}
                >{em}</button>
              ))}
            </div>
            <PFormField label="Title" nomargin><input className="p-inp" value={r.title} onChange={e => update(i, 'title', e.target.value)} /></PFormField>
            <PFormField label="Description" nomargin><textarea className="p-inp" rows={3} value={r.desc} onChange={e => update(i, 'desc', e.target.value)} /></PFormField>
          </div>
        ))}
      </div>
      <button onClick={() => onSave(items)} className="p-btn-dark lxf" style={{ alignSelf: 'flex-start', padding: '10px 24px' }}>Save Why Us</button>
    </div>
  );
}

function CMSHomeServices({ homeServices, onSave, ac }) {
  const [items, setItems] = useState(homeServices?.length > 0 ? homeServices : DEFAULT_HOME_SERVICES);

  const update = (i, key, val) => { const n = [...items]; n[i] = { ...n[i], [key]: val }; setItems(n); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 className="lxfh" style={{ fontSize: 20 }}>Homepage Service Cards</h3>
          <div style={{ fontSize: 12, color: `var(--text-secondary)`, marginTop: 4 }}>The 3-card preview grid under "Structural Precision." Up to 6 cards shown.</div>
        </div>
        <button onClick={() => setItems([...items, { id: Date.now().toString(), emoji: '🏗️', name: 'New Service', short: '' }])} className="p-btn-gold lxf" style={{ padding: '8px 16px', fontSize: 12 }}><Plus size={14} style={{ marginRight: 6 }} />Add Card</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((s, i) => (
          <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '56px 1fr 1fr auto', gap: 16, alignItems: 'center', background: `var(--bg-secondary)`, padding: '16px 20px', borderRadius: 12 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 4 }}>{s.emoji || '🏗️'}</div>
              <select value={s.emoji || '🏗️'} onChange={e => update(i, 'emoji', e.target.value)} style={{ fontSize: 10, border: '1px solid #ddd', borderRadius: 4, padding: '2px 0', width: '100%' }}>
                {EMOJI_OPTIONS.map(em => <option key={em} value={em}>{em}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: `var(--text-secondary)`, textTransform: 'uppercase', marginBottom: 6 }}>Card Title</div>
              <input className="p-inp" placeholder="Service name" value={s.name} onChange={e => update(i, 'name', e.target.value)} />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: `var(--text-secondary)`, textTransform: 'uppercase', marginBottom: 6 }}>Short Description</div>
              <input className="p-inp" placeholder="One-line description" value={s.short} onChange={e => update(i, 'short', e.target.value)} />
            </div>
            <button onClick={() => setItems(items.filter((_, idx) => idx !== i))} style={{ color: '#ff4444', border: 'none', background: 'none', cursor: 'pointer', padding: 4 }}><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
      <button onClick={() => onSave(items)} className="p-btn-dark lxf" style={{ alignSelf: 'flex-start', padding: '10px 24px' }}>Save Homepage Services</button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   CMS WORKFLOW EDITOR
───────────────────────────────────────────── */
const ICON_OPTIONS = [
  { key: 'MessageSquare', label: 'Chat / Consultation' },
  { key: 'CreditCard',    label: 'Payment / Deposit' },
  { key: 'ClipboardList', label: 'Requirements List' },
  { key: 'Ruler',         label: 'Measurement / Survey' },
  { key: 'Layout',        label: 'Floor Plan / Layout' },
  { key: 'Compass',       label: 'Conceptual Design' },
  { key: 'FileImage',     label: '3D Rendering / Image' },
  { key: 'FileText',      label: 'Construction Drawing' },
  { key: 'Briefcase',     label: 'Material Selection' },
  { key: 'Layers',        label: 'Material Connection' },
  { key: 'Palette',       label: 'Soft Furnishing Design' },
  { key: 'FileSpreadsheet', label: 'Sourcing List' },
  { key: 'Wrench',        label: 'Installation Guide' },
  { key: 'Camera',        label: 'Photo Shoot' },
];

const PHASE_OPTIONS = [
  'Sourcing Consultation & Intention',
  'Architectural Site Surveys',
  'Design, Layout & Renderings',
  'Sourcing & Material Procurement',
  'Styling, Installation & Shoot',
];

function CMSWorkflow({ workflow, onSave, ac, notify }) {
  const [steps, setSteps] = useState(
    (workflow && workflow.length > 0) ? workflow.map(s => ({ ...s })) : DEFAULT_WORKFLOW.map(s => ({ ...s, icon: s.icon || 'MessageSquare' }))
  );
  const [openIdx, setOpenIdx] = useState(null);
  const [saving, setSaving] = useState(false);

  const update = (idx, field, val) => {
    const next = [...steps];
    next[idx] = { ...next[idx], [field]: val };
    setSteps(next);
  };

  const updateDeliverable = (sIdx, dIdx, val) => {
    const next = [...steps];
    const del = [...(next[sIdx].deliverables || ['', '', ''])];
    del[dIdx] = val;
    next[sIdx] = { ...next[sIdx], deliverables: del };
    setSteps(next);
  };

  const handleImageUpload = async (idx, field, file) => {
    if (!file) return;
    try {
      const compressed = await compressImage(file, { maxWidth: 1400, quality: 0.82 });
      const path = `workflow/step_${idx + 1}_${field}_${Date.now()}_${file.name}`;
      const url = await uploadFile('assets', path, compressed);
      update(idx, field, url);
      notify?.('success', 'Image uploaded successfully.');
    } catch (err) {
      notify?.('error', 'Image upload failed: ' + err.message);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Serialize: store icon as string key
      const serialized = steps.map(s => ({
        ...s,
        icon: typeof s.icon === 'string' ? s.icon : 'MessageSquare'
      }));
      await onSave(serialized);
      notify?.('success', 'Workflow manual saved to Firestore.');
    } catch (err) {
      notify?.('error', 'Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div>
          <h3 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>How We Work — Workflow Manual</h3>
          <p style={{ fontSize: 12, color: `var(--text-secondary)`, margin: '4px 0 0' }}>Edit all 15 steps of the client journey. Changes sync live to the public site.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 28px', background: ac, color: '#fff',
            border: 'none', borderRadius: 12, fontWeight: 800,
            fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1, transition: 'all 0.2s'
          }}
        >
          <Save size={15} /> {saving ? 'Saving…' : 'Save Workflow'}
        </button>
      </div>

      {steps.map((step, idx) => (
        <div
          key={step.step || idx}
          style={{
            border: '1px solid rgba(0,0,0,0.07)',
            borderRadius: 16,
            overflow: 'hidden',
            background: '#fff'
          }}
        >
          {/* ACCORDION HEADER */}
          <div
            onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
            style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '16px 20px', cursor: 'pointer',
              background: openIdx === idx ? `${ac}08` : '#fff',
              borderBottom: openIdx === idx ? '1px solid rgba(0,0,0,0.06)' : 'none',
              transition: 'background 0.2s'
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: ac, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 13, flexShrink: 0
            }}>
              {step.step || idx + 1}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {step.phase || 'Phase'}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: `var(--accent-secondary)` }}>
                {step.title || `Step ${idx + 1}`}
              </div>
            </div>
            {openIdx === idx ? <ChevronUp size={18} color="var(--text-secondary)" /> : <ChevronDown size={18} color="var(--text-secondary)" />}
          </div>

          {/* ACCORDION BODY */}
          {openIdx === idx && (
            <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Title */}
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: `var(--text-secondary)`, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Step Title</label>
                  <input className="p-inp" value={step.title || ''} onChange={e => update(idx, 'title', e.target.value)} placeholder="Step title" />
                </div>
                {/* Phase */}
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: `var(--text-secondary)`, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Phase</label>
                  <select className="p-inp" value={step.phase || ''} onChange={e => update(idx, 'phase', e.target.value)}>
                    {PHASE_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              {/* Icon Picker */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: `var(--text-secondary)`, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Step Icon</label>
                <select className="p-inp" value={typeof step.icon === 'string' ? step.icon : 'MessageSquare'} onChange={e => update(idx, 'icon', e.target.value)}>
                  {ICON_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
              </div>

              {/* Description */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: `var(--text-secondary)`, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Description</label>
                <textarea
                  className="p-inp"
                  value={step.desc || ''}
                  onChange={e => update(idx, 'desc', e.target.value)}
                  rows={4}
                  style={{ resize: 'vertical', minHeight: 80 }}
                  placeholder="Full step description…"
                />
              </div>

              {/* Deliverables */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: `var(--text-secondary)`, textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>Key Deliverables (3 items)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[0, 1, 2].map(dIdx => (
                    <div key={dIdx} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: ac, flexShrink: 0 }} />
                      <input
                        className="p-inp"
                        value={(step.deliverables || [])[dIdx] || ''}
                        onChange={e => updateDeliverable(idx, dIdx, e.target.value)}
                        placeholder={`Deliverable ${dIdx + 1}`}
                        style={{ flex: 1 }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Image Uploads */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Blueprint Drawing */}
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: `var(--text-secondary)`, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Technical Blueprint / Drawing</label>
                  <div style={{ background: `var(--bg-secondary)`, borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {step.pdfImg && (
                      <img src={step.pdfImg} alt="" style={{ width: '100%', height: 80, objectFit: 'contain', borderRadius: 6, background: '#fff' }} />
                    )}
                    <div style={{ position: 'relative' }}>
                      <button className="p-btn-light lxf" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 0', fontSize: 10 }}>
                        <Upload size={12} /> Upload Blueprint
                      </button>
                      <input type="file" accept="image/*" onChange={e => handleImageUpload(idx, 'pdfImg', e.target.files[0])} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                    </div>
                    <input
                      className="p-inp"
                      value={step.pdfImg || ''}
                      onChange={e => update(idx, 'pdfImg', e.target.value)}
                      placeholder="Or paste image URL"
                      style={{ fontSize: 10 }}
                    />
                  </div>
                </div>

                {/* Render / Photo */}
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: `var(--text-secondary)`, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Design Render / Photo</label>
                  <div style={{ background: `var(--bg-secondary)`, borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {step.renderImg && (
                      <img src={step.renderImg} alt="" style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 6 }} />
                    )}
                    <div style={{ position: 'relative' }}>
                      <button className="p-btn-light lxf" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 0', fontSize: 10 }}>
                        <Upload size={12} /> Upload Render
                      </button>
                      <input type="file" accept="image/*" onChange={e => handleImageUpload(idx, 'renderImg', e.target.files[0])} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                    </div>
                    <input
                      className="p-inp"
                      value={step.renderImg || ''}
                      onChange={e => update(idx, 'renderImg', e.target.value)}
                      placeholder="Or paste image URL"
                      style={{ fontSize: 10 }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* SAVE BOTTOM */}
      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '14px 40px', background: ac, color: '#fff',
          border: 'none', borderRadius: 14, fontWeight: 800,
          fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? 0.7 : 1, transition: 'all 0.2s',
          alignSelf: 'flex-start', marginTop: 8
        }}
      >
        <Save size={16} /> {saving ? 'Saving to Firestore…' : 'Save Workflow Manual'}
      </button>
    </div>
  );
}

export default function AdminCMS({ content, syncCMS, brand, onPreview, notify, ...props }) {
  const [sub, setSub] = useState('branding');
  const ac = brand.color || `var(--accent-secondary)`;
  
  const tabs = [
    { id: 'branding',     label: 'Branding',     icon: <Sparkles size={16} /> },
    { id: 'homepage',     label: 'Hero & CTA',   icon: <Layout size={16} /> },
    { id: 'stats',        label: 'Stats Bar',    icon: <BarChart2 size={16} /> },
    { id: 'homeservices', label: 'Svc Cards',    icon: <Home size={16} /> },
    { id: 'whyus',        label: 'Why Us',       icon: <Star size={16} /> },
    { id: 'services',     label: 'Services',     icon: <Activity size={16} /> },
    { id: 'products',     label: 'Products',     icon: <Smartphone size={16} /> },
    { id: 'productSync',  label: 'Product Sync', icon: <Layers size={16} /> },
    { id: 'gallery',      label: 'Portfolio',    icon: <ImgIcon size={16} /> },
    { id: 'showroom',     label: 'Showroom',     icon: <Sparkles size={16} /> },
    { id: 'workflow',     label: 'How We Work',  icon: <ClipboardList size={16} /> },
    { id: 'about',        label: 'Leadership',   icon: <Users size={16} /> },
    { id: 'testimonials', label: 'Testimonials', icon: <ThumbsUp size={16} /> },
    { id: 'footer',       label: 'Footer',       icon: <Link2 size={16} /> },
  ];

  const renderCMS = () => {
    switch(sub) {
      case 'branding':     return <CMSBranding brand={content?.brand || brand} onSave={val => syncCMS('brand', val)} ac={ac} notify={notify} />;
      case 'homepage':     return <CMSHomepage hero={content?.hero} onSave={val => syncCMS('hero', val)} ac={ac} notify={notify} />;
      case 'stats':        return <CMSStats stats={content?.stats} onSave={val => syncCMS('stats', val)} ac={ac} />;
      case 'homeservices': return <CMSHomeServices homeServices={content?.homeServices} onSave={val => syncCMS('homeServices', val)} ac={ac} />;
      case 'whyus':        return <CMSWhyUs whyUs={content?.whyUs} onSave={val => syncCMS('whyUs', val)} ac={ac} />;
      case 'services':     return <CMSServices services={content?.services} onSave={val => syncCMS('services', val)} ac={ac} notify={notify} />;
      case 'products':     return <CMSProducts products={content?.products} categories={content?.categories} onSave={val => syncCMS('products', val)} ac={ac} syncCMS={syncCMS} notify={notify} />;
      case 'productSync':  return <AdminProductSync brand={brand} notify={notify} user={props.user} />;
      case 'gallery':      return <CMSGallery portfolio={content?.portfolio} onSave={val => syncCMS('portfolio', val)} ac={ac} notify={notify} />;
      case 'showroom':     return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          <CMSShowroom showcase={content?.showcase} onSave={val => syncCMS('showcase', val)} ac={ac} notify={notify} />
          <div style={{ borderTop: '1.5px solid var(--border-color)', paddingTop: 40 }}>
            <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-secondary)', marginBottom: 20 }}>Scene Library</div>
            <AdminShowcase brand={brand} notify={notify} />
          </div>
        </div>
      );
      case 'about':        return <CMSAbout about={content?.about} onSave={val => syncCMS('about', val)} ac={ac} notify={notify} />;
      case 'testimonials': return <CMSTestimonials list={content?.testimonials} onSave={val => syncCMS('testimonials', val)} ac={ac} />;
      case 'footer':       return <CMSFooter data={content?.footer} onSave={val => syncCMS('footer', val)} ac={ac} />;
      case 'workflow':     return <CMSWorkflow workflow={content?.workflow} onSave={val => syncCMS('workflow', val)} ac={ac} notify={notify} />;
      default: return null;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="lxfh" style={{ fontSize: 32, fontWeight: 400 }}>Website CMS</h2>
        <button onClick={onPreview} className="p-btn-gold lxf" style={{ padding: '8px 16px' }}>View Live Site</button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, background: `var(--bg-secondary)`, padding: 6, borderRadius: 14 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setSub(t.id)}
            className="lxf"
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none',
              background: sub === t.id ? '#fff' : 'transparent', color: sub === t.id ? ac : `var(--text-secondary)`,
              fontSize: 11, fontWeight: sub === t.id ? 700 : 400, cursor: 'pointer', transition: 'all .2s',
              boxShadow: sub === t.id ? '0 2px 8px rgba(0,0,0,.06)' : 'none', whiteSpace: 'nowrap'
            }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="p-card" style={{ padding: 28 }}>
        {renderCMS()}
      </div>
    </div>
  );
}
