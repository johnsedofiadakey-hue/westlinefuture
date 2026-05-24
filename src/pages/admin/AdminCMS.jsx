import React, { useState } from 'react';
import {
  Sparkles, Layout, Activity, Smartphone, Image as ImgIcon,
  Users, ThumbsUp, Link2, Upload, X, Trash2, Trash,
  BarChart2, Star, Home, Plus
} from 'lucide-react';
import { FF as PFormField } from '../../components/Shared';
import { uploadFile } from '../../lib/firebase';
import { compressImage } from '../../lib/image-utils';
import AdminShowcase from './AdminShowcase';

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
          <PFormField label="Primary Background"><input type="color" className="p-inp" style={{ height: 44, padding: 4 }} value={f.bgPrimary || '#FDFCFB'} onChange={e => setF({...f, bgPrimary: e.target.value})} /></PFormField>
          <PFormField label="Secondary Surface"><input type="color" className="p-inp" style={{ height: 44, padding: 4 }} value={f.bgSecondary || '#FFFFFF'} onChange={e => setF({...f, bgSecondary: e.target.value})} /></PFormField>
          <PFormField label="Accent Color"><input type="color" className="p-inp" style={{ height: 44, padding: 4 }} value={f.color || '#0F766E'} onChange={e => setF({...f, color: e.target.value})} /></PFormField>
          <PFormField label="Global Text Color"><input type="color" className="p-inp" style={{ height: 44, padding: 4 }} value={f.textColor || '#111827'} onChange={e => setF({...f, textColor: e.target.value})} /></PFormField>
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
                <div className="lxfh" style={{ fontSize: 13, fontWeight: 700, color: f.theme === t.id ? ac : '#111827' }}>{t.n}</div>
                <div className="lxf" style={{ fontSize: 9, color: '#6B7280', marginTop: 2 }}>{t.desc}</div>
              </button>
            ))}
          </div>
        </PFormField>
        <button onClick={() => onSave({ ...brand, ...f })} className="p-btn-dark lxf" style={{ alignSelf: 'flex-start', padding: '12px 32px', marginTop: 12 }}>Save Branding Identity</button>
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
            <div key={s.title || i} className="p-card" style={{ padding: 20, background: '#F9FAFB', border: '1px solid rgba(0,0,0,.04)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr auto', gap: 20, alignItems: 'start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ height: 100, borderRadius: 6, overflow: 'hidden', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {s.img ? <img src={s.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImgIcon size={24} color="#6B7280" />}
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
      <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 32 }}>
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
  const [list, setList] = useState(services || []);

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
         <button onClick={() => setList([...list, { id: Date.now(), name: 'New Service', short: '', desc: '', packages: [], gallery: [], img: '' }])} className="p-btn-gold lxf" style={{ padding: '6px 14px', fontSize: 11 }}>Add Service</button>
       </div>
       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
         {list.map((s, i) => (
           <div key={s.id} className="p-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
             <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ width: 80, height: 80, borderRadius: 8, background: '#F9FAFB', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                   {s.img ? <img src={s.img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}><ImgIcon size={24} /></div>}
                   <input type="file" accept="image/*" onChange={e => onFile(i, e.target.files[0])} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                   <PFormField label="Service Name" nomargin><input className="p-inp" style={{ padding: '6px 10px' }} value={s.name} onChange={e => { const nl = [...list]; nl[i].name = e.target.value; setList(nl); }} /></PFormField>
                </div>
             </div>
             <PFormField label="Description" nomargin><textarea className="p-inp" value={s.desc} rows={3} onChange={e => { const nl = [...list]; nl[i].desc = e.target.value; setList(nl); }} /></PFormField>
             <button onClick={() => setList(list.filter((_, idx) => idx !== i))} style={{ color: '#ff4444', fontSize: 11, background: 'none', border: 'none', padding: 0, marginTop: 'auto', alignSelf: 'flex-start', cursor: 'pointer' }}>Delete Service</button>
           </div>
         ))}
       </div>
       <button onClick={() => onSave(list)} className="p-btn-dark lxf" style={{ alignSelf: 'flex-start', padding: '10px 24px' }}>Save Services</button>
    </div>
  );
}

function CMSProducts({ products, categories, onSave, ac, syncCMS, notify }) {
  const [list, setList] = useState(products || []);
  const [cats, setCats] = useState(categories || []);
  const [isAdding, setIsAdding] = useState(false);
  const [isManagingCats, setIsManagingCats] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', desc: '', img: '', cat: cats?.[0]?.id || 'casement', specs: '', fobPrice: '', landedCost: '', status: 'Available', stock: 10, threshold: 2 });
  const [newCat, setNewCat] = useState({ id: '', label: '', icon: '📦', groupId: 'aluminum', desc: '' });

  const [uploading, setUploading] = useState(false);

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

  const handleAddProduct = () => {
    if (!newItem.name || !newItem.img) { notify?.('error', 'Name and Image are required.'); return; }
    const newList = [{ ...newItem, id: Date.now() }, ...list];
    setList(newList);
    onSave(newList);
    setNewItem({ name: '', desc: '', img: '', cat: cats?.[0]?.id || '', specs: '', fobPrice: '', landedCost: '', status: 'Available' });
    setIsAdding(false);
  };

  const handleAddCategory = () => {
    if (!newCat.id || !newCat.label) { notify?.('error', 'ID and Label are required.'); return; }
    const exists = cats.find(c => c.id === newCat.id);
    if (exists) { notify?.('error', 'Category ID already exists.'); return; }
    
    const newCats = [...cats, newCat];
    setCats(newCats);
    if (syncCMS) syncCMS('categories', newCats);
    setNewCat({ id: '', label: '', icon: '📦', groupId: 'aluminum', desc: '' });
  };

  const handleRemoveCategory = (id) => {
    const newCats = cats.filter(c => c.id !== id);
    setCats(newCats);
    if (syncCMS) syncCMS('categories', newCats);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, position: 'relative' }}>
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
         <h3 className="lxfh" style={{ fontSize: 24, color: '#111827' }}>Marketplace Assets</h3>
         <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => setIsManagingCats(true)} style={{ padding: '10px 20px', background: '#fff', border: '1px solid #ddd', borderRadius: 100, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Manage Categories</button>
            <button onClick={() => setIsAdding(true)} className="p-btn-gold lxf" style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 100 }}>
              <Upload size={16} /> Add Asset
            </button>
         </div>
       </div>

       {isManagingCats && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(13,11,9,0.7)', backdropFilter: 'blur(8px)' }} onClick={() => setIsManagingCats(false)} />
            <div className="fade-in" style={{ position: 'relative', width: '100%', maxWidth: 800, background: '#fff', borderRadius: 24, overflow: 'hidden', boxShadow: '0 32px 64px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '24px 32px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F9FAFB' }}>
                <h4 className="lxfh" style={{ fontSize: 20 }}>Category & Group Manager</h4>
                <button onClick={() => setIsManagingCats(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}><X size={20} /></button>
              </div>
              <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24, maxHeight: '70vh', overflowY: 'auto' }}>
                
                {/* Add Category Form */}
                <div style={{ background: '#F9FAFB', padding: 20, borderRadius: 16, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: 12, alignItems: 'flex-end' }}>
                  <PFormField label="Cat ID (Slug)"><input className="p-inp" placeholder="e.g. casement" value={newCat.id} onChange={e => setNewCat({...newCat, id: e.target.value.toLowerCase().replace(/\s/g, '-')})} /></PFormField>
                  <PFormField label="Label Name"><input className="p-inp" placeholder="e.g. Casement Windows" value={newCat.label} onChange={e => setNewCat({...newCat, label: e.target.value})} /></PFormField>
                  <PFormField label="Group">
                    <select className="p-inp" value={newCat.groupId} onChange={e => setNewCat({...newCat, groupId: e.target.value})}>
                      {GROUPS.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                    </select>
                  </PFormField>
                  <PFormField label="Icon"><input className="p-inp" placeholder="Emoji" value={newCat.icon} onChange={e => setNewCat({...newCat, icon: e.target.value})} /></PFormField>
                  <button onClick={handleAddCategory} className="p-btn-dark" style={{ height: 44, borderRadius: 12, padding: '0 20px' }}>Add</button>
                </div>

                {/* Categories List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {GROUPS.map(g => (
                    <div key={g.id} style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', color: ac, letterSpacing: '0.1em', marginBottom: 12 }}>{g.label}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {cats.filter(c => c.groupId === g.id).map(c => (
                          <div key={c.id} style={{ padding: '8px 12px', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>{c.icon}</span>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{c.label}</span>
                            <button onClick={() => handleRemoveCategory(c.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ff4444', display: 'flex', padding: 0 }}><Trash size={14} /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
       )}

       {isAdding && (
         <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
           <div style={{ position: 'absolute', inset: 0, background: 'rgba(13,11,9,0.7)', backdropFilter: 'blur(8px)' }} onClick={() => setIsAdding(false)} />
           <div className="fade-in" style={{ position: 'relative', width: '100%', maxWidth: 700, background: '#fff', borderRadius: 24, overflow: 'hidden', boxShadow: '0 32px 64px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column' }}>
             <div style={{ padding: '24px 32px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F9FAFB' }}>
               <h4 className="lxfh" style={{ fontSize: 20 }}>Create New Asset</h4>
               <button onClick={() => setIsAdding(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}><X size={20} /></button>
             </div>
             
             <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24, maxHeight: '70vh', overflowY: 'auto' }}>
               {/* Image Uploader */}
               <div>
                 <div className="lxf" style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Asset Image</div>
                 <div style={{ height: 200, background: newItem.img ? '#fff' : '#F9FAFB', border: newItem.img ? '1px solid #E5E7EB' : '2px dashed #DCD7D1', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                   {uploading ? (
                     <div className="lxf" style={{ color: ac, fontWeight: 600 }}>Uploading...</div>
                   ) : newItem.img ? (
                     <img src={newItem.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', mixBlendMode: 'multiply' }} />
                   ) : (
                     <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#6B7280' }}>
                       <Upload size={32} style={{ marginBottom: 12 }} />
                       <div className="lxf" style={{ fontSize: 13, fontWeight: 600 }}>Click to browse or drag image here</div>
                     </div>
                   )}
                   <input type="file" accept="image/*" onChange={handleImageUpload} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} disabled={uploading} />
                 </div>
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                 <div>
                   <div className="lxf" style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Asset Name</div>
                   <input className="p-inp" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} style={{ width: '100%' }} />
                 </div>
                  <div>
                    <div className="lxf" style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Category</div>
                    <select className="p-inp" value={newItem.cat} onChange={e => setNewItem({...newItem, cat: e.target.value})} style={{ width: '100%' }}>
                       {(cats || []).map(c => (
                         <option key={c.id || c} value={c.id || c}>{c.label || c}</option>
                       ))}
                    </select>
                  </div>
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                 <div>
                   <div className="lxf" style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>FOB Price</div>
                   <input className="p-inp" placeholder="$0.00" value={newItem.fobPrice} onChange={e => setNewItem({...newItem, fobPrice: e.target.value})} style={{ width: '100%' }} />
                 </div>
                 <div>
                   <div className="lxf" style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Landed Cost</div>
                   <input className="p-inp" placeholder="$0.00" value={newItem.landedCost} onChange={e => setNewItem({...newItem, landedCost: e.target.value})} style={{ width: '100%' }} />
                 </div>
                 <div>
                   <div className="lxf" style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Status</div>
                   <select className="p-inp" value={newItem.status} onChange={e => setNewItem({...newItem, status: e.target.value})} style={{ width: '100%' }}>
                     <option value="Available">Available</option>
                     <option value="Pre-order">Pre-order</option>
                     <option value="Sold Out">Sold Out</option>
                   </select>
                 </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <div className="lxf" style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Stock Quantity</div>
                    <input type="number" className="p-inp" value={newItem.stock} onChange={e => setNewItem({...newItem, stock: parseInt(e.target.value)})} style={{ width: '100%' }} />
                  </div>
                  <div>
                    <div className="lxf" style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Low Stock Threshold</div>
                    <input type="number" className="p-inp" value={newItem.threshold} onChange={e => setNewItem({...newItem, threshold: parseInt(e.target.value)})} style={{ width: '100%' }} />
                  </div>
                </div>
               </div>

               <div>
                 <div className="lxf" style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Technical Description</div>
                 <textarea className="p-inp" rows={3} value={newItem.desc} onChange={e => setNewItem({...newItem, desc: e.target.value})} style={{ width: '100%' }} />
               </div>
             </div>

             <div style={{ padding: '24px 32px', background: '#F9FAFB', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
               <button onClick={() => setIsAdding(false)} className="p-btn-outline lxf" style={{ padding: '12px 24px', borderRadius: 8 }}>Cancel</button>
               <button onClick={handleAddProduct} className="p-btn-gold lxf" style={{ padding: '12px 32px', borderRadius: 8 }}>Create Asset</button>
             </div>
           </div>
         </div>
       )}

       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
         {list.map(p => (
           <div key={p.id} className="p-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: 180, background: '#F9FAFB', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #E5E7EB' }}>
                {p.img ? <img src={p.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', mixBlendMode: 'multiply', padding: 24 }} /> : <div style={{ color: '#6B7280' }}>No Image</div>}
                <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.9)', padding: '4px 10px', borderRadius: 100, fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: p.status === 'Pre-order' ? '#D97706' : '#059669', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  {p.status}
                </div>
              </div>
              
              <div style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div className="lxf" style={{ fontSize: 10, color: ac, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>{p.cat}</div>
                <div className="lxfh" style={{ fontSize: 18, marginBottom: 12, color: '#111827' }}>{p.name}</div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: '#FDFCFB', padding: 12, borderRadius: 8, border: '1px solid #E5E7EB', marginBottom: 20 }}>
                  <div><div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', fontWeight: 700 }}>FOB</div><div style={{ fontSize: 13, fontWeight: 600 }}>{p.fobPrice || '-'}</div></div>
                  <div><div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', fontWeight: 700 }}>Landed</div><div style={{ fontSize: 13, fontWeight: 600, color: ac }}>{p.landedCost || '-'}</div></div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto', borderTop: '1px solid #E5E7EB', paddingTop: 16 }}>
                  <button onClick={() => setList(list.filter(x => x.id !== p.id))} style={{ color: '#ff4444', fontSize: 12, background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}><Trash size={14} /> Remove</button>
                  <button className="lxf" style={{ color: '#111827', fontSize: 12, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 600 }}>Edit</button>
                </div>
              </div>
           </div>
         ))}
       </div>
       <button onClick={() => onSave(list)} className="p-btn-dark lxf" style={{ alignSelf: 'flex-start', padding: '12px 32px', borderRadius: 100, marginTop: 12 }}>Update Catalog Data</button>
    </div>
  );
}

function CMSAbout({ about, onSave, ac, notify }) {
  const [f, setF] = useState(about || {});

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
        <PFormField label="Managing Director"><input className="p-inp" value={f.founder || ''} onChange={e => setF({...f, founder: e.target.value})} /></PFormField>
        <PFormField label="Role / Title"><input className="p-inp" value={f.role || 'Managing Director'} onChange={e => setF({...f, role: e.target.value})} /></PFormField>
        <PFormField label="Story Headline"><input className="p-inp" value={f.storyTitle || ''} onChange={e => setF({...f, storyTitle: e.target.value})} /></PFormField>
        <PFormField label="Mission Summary"><textarea className="p-inp" rows={3} value={f.story || ''} onChange={e => setF({...f, story: e.target.value})} /></PFormField>
        <PFormField label="Full Biography"><textarea className="p-inp" rows={5} value={f.bio || ''} onChange={e => setF({...f, bio: e.target.value})} /></PFormField>

        <button onClick={() => onSave(f)} className="p-btn-dark lxf" style={{ alignSelf: 'flex-start', padding: '10px 24px' }}>Save About Page</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <h3 className="lxfh" style={{ fontSize: 20 }}>About Page Image</h3>
        <div style={{ height: 300, background: '#F9FAFB', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
          {f.image ? <img src={f.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No Image</div>}
          <div style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}>
             <input type="file" accept="image/*" onChange={handleImageUpload} style={{ width: '100%', height: '100%', cursor: 'pointer' }} />
          </div>
        </div>
        <div className="lxf" style={{ fontSize: 11, color: '#6B7280', textAlign: 'center' }}>Click the container above to change image</div>
      </div>
    </div>
  );
}

function CMSShowroom({ showcase, onSave, ac, notify }) {
  const [url, setUrl] = useState(showcase?.videoUrl || '');
  const extractId = (u) => {
    const m = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
    return m ? m[1] : (/^[A-Za-z0-9_-]{11}$/.test(u.trim()) ? u.trim() : null);
  };
  const previewId = extractId(url) || 'YoC_LlaOdAI';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div>
        <h3 className="lxfh" style={{ fontSize: 20, marginBottom: 8 }}>Showroom Video</h3>
        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 24 }}>
          Paste any YouTube URL or video ID below. The showroom page will automatically embed it as the walkthrough tour.
        </p>
        <PFormField label="YouTube URL or Video ID">
          <input
            className="p-inp"
            placeholder="e.g. https://www.youtube.com/watch?v=YoC_LlaOdAI"
            value={url}
            onChange={e => setUrl(e.target.value)}
          />
        </PFormField>
        {url && !extractId(url) && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#EF4444', fontWeight: 700 }}>⚠ Could not detect a valid YouTube video ID from that URL.</div>
        )}
        <button
          onClick={() => {
            if (url && !extractId(url)) { notify?.('error', 'Invalid YouTube URL'); return; }
            onSave({ ...showcase, videoUrl: url });
            notify?.('success', 'Showroom video updated');
          }}
          className="p-btn-dark lxf"
          style={{ marginTop: 20, alignSelf: 'flex-start', padding: '10px 28px' }}
        >
          Save Video
        </button>
      </div>

      <div>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Live Preview</div>
        <div style={{ aspectRatio: '16/9', borderRadius: 16, overflow: 'hidden', border: '1px solid #E5E7EB', maxWidth: 700 }}>
          <iframe
            key={previewId}
            src={`https://www.youtube.com/embed/${previewId}?rel=0&modestbranding=1&controls=1`}
            title="Showroom preview"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: '#6B7280' }}>Video ID: <code>{previewId}</code></div>
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
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
       <h3 className="lxfh" style={{ fontSize: 20 }}>Footer Information</h3>
       <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
         <div className="lxf" style={{ fontSize: 13, fontWeight: 600 }}>Policy Links</div>
         {links.map((l, i) => (
           <div key={l._id} style={{ display: 'flex', gap: 12 }}>
             <input className="p-inp" placeholder="Label" value={l.label} onChange={e => { const nl = [...links]; nl[i].label = e.target.value; setLinks(nl); }} />
             <input className="p-inp" placeholder="URL" value={l.url} onChange={e => { const nl = [...links]; nl[i].url = e.target.value; setLinks(nl); }} />
             <button onClick={() => setLinks(links.filter((_, idx) => idx !== i))} style={{ color: '#ff4444', border: 'none', background: 'none', cursor: 'pointer' }}><X size={16} /></button>
           </div>
         ))}
         <button onClick={() => setLinks([...links, { _id: newId(), label: '', url: '#' }])} className="lxf" style={{ fontSize: 11, color: ac, background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', fontWeight: 600 }}>+ Add Link</button>
       </div>
       <button onClick={() => onSave({ links })} className="p-btn-dark lxf" style={{ alignSelf: 'flex-start', padding: '10px 24px' }}>Save Footer</button>
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
       <div className="lxf" style={{ fontSize: 12, color: '#6B7280', marginBottom: -10 }}>Manage the technical projects displayed on your architectural profile.</div>
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
  const [items, setItems] = useState(withId(stats && stats.length ? stats : [
    { value: '200+', label: 'Projects Delivered', labelMob: 'Projects' },
    { value: '12+',  label: 'Years Experience',   labelMob: 'Years' },
    { value: '98%',  label: 'Client Satisfaction', labelMob: 'Satisfaction' },
    { value: '8',    label: 'Countries Served',    labelMob: 'Countries' },
  ]));

  const update = (i, key, val) => { const n = [...items]; n[i] = { ...n[i], [key]: val }; setItems(n); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 className="lxfh" style={{ fontSize: 20 }}>Homepage Stats Bar</h3>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>The dark strip of numbers between the hero and services sections.</div>
        </div>
        <button onClick={() => setItems([...items, { _id: newId(), value: '', label: '', labelMob: '' }])} className="p-btn-gold lxf" style={{ padding: '8px 16px', fontSize: 12 }}><Plus size={14} style={{ marginRight: 6 }} />Add Stat</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((s, i) => (
          <div key={s._id} style={{ display: 'grid', gridTemplateColumns: '130px 1fr 130px auto', gap: 12, alignItems: 'center', background: '#F9FAFB', padding: '16px 20px', borderRadius: 12 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: 6 }}>Number / Value</div>
              <input className="p-inp" placeholder="e.g. 200+" value={s.value} onChange={e => update(i, 'value', e.target.value)} />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: 6 }}>Desktop Label</div>
              <input className="p-inp" placeholder="e.g. Projects Delivered" value={s.label} onChange={e => update(i, 'label', e.target.value)} />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: 6 }}>Mobile Label</div>
              <input className="p-inp" placeholder="e.g. Projects" value={s.labelMob || ''} onChange={e => update(i, 'labelMob', e.target.value)} />
            </div>
            <button onClick={() => setItems(items.filter((_, idx) => idx !== i))} style={{ color: '#ff4444', border: 'none', background: 'none', cursor: 'pointer', padding: 4 }}><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
      {/* Live preview */}
      <div style={{ background: '#111827', borderRadius: 16, padding: '28px 32px', display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: 16 }}>
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
  const [items, setItems] = useState(withId(whyUs && whyUs.length ? whyUs : [
    { emoji: '🛡️', title: 'Guaranteed Quality',    desc: 'Every installation backed by a 2-year workmanship warranty and certified materials from vetted manufacturers.' },
    { emoji: '⏱️', title: 'On-Time Delivery',      desc: 'Our dedicated logistics team tracks every shipment. 94% of projects completed on or ahead of schedule.' },
    { emoji: '🌍', title: 'Direct China Sourcing', desc: 'We cut out middlemen. Factory-direct procurement means premium glass at 20–35% below market rates.' },
    { emoji: '🔧', title: 'Technical Expertise',   desc: 'CNC precision, sub-millimeter tolerances. Our engineers have handled façades, curtain walls, and interior systems for 12+ years.' },
  ]));

  const update = (i, key, val) => { const n = [...items]; n[i] = { ...n[i], [key]: val }; setItems(n); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 className="lxfh" style={{ fontSize: 20 }}>Why Choose Us</h3>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Reason cards displayed in the "Built to a higher standard" section.</div>
        </div>
        <button onClick={() => setItems([...items, { _id: newId(), emoji: '✅', title: 'New Reason', desc: '' }])} className="p-btn-gold lxf" style={{ padding: '8px 16px', fontSize: 12 }}><Plus size={14} style={{ marginRight: 6 }} />Add Card</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {items.map((r, i) => (
          <div key={r._id} className="p-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: `${ac}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{r.emoji || '✅'}</div>
                <div style={{ fontSize: 12, color: '#4B5563', fontWeight: 600 }}>Pick icon:</div>
              </div>
              <button onClick={() => setItems(items.filter((_, idx) => idx !== i))} style={{ color: '#ff4444', border: 'none', background: 'none', cursor: 'pointer', padding: 4 }}><Trash2 size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {EMOJI_OPTIONS.map(em => (
                <button key={em} onClick={() => update(i, 'emoji', em)}
                  style={{ fontSize: 18, padding: '4px 6px', borderRadius: 8, cursor: 'pointer', border: r.emoji === em ? `2px solid ${ac}` : '1px solid #E5E7EB', background: r.emoji === em ? `${ac}12` : '#fff', lineHeight: 1 }}
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
  const [items, setItems] = useState(homeServices && homeServices.length ? homeServices : [
    { id: 'glass',    emoji: '🏗️', name: 'Glass Engineering',  short: 'Custom structural glazing, balustrades, and washroom systems.' },
    { id: 'interior', emoji: '🪑', name: 'Interior Fit-out',   short: 'Luxury finishing, kitchen systems, and custom cabinetry.' },
    { id: 'sourcing', emoji: '📦', name: 'China Sourcing',     short: 'Direct procurement and logistics for premium materials.' },
  ]);

  const update = (i, key, val) => { const n = [...items]; n[i] = { ...n[i], [key]: val }; setItems(n); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 className="lxfh" style={{ fontSize: 20 }}>Homepage Service Cards</h3>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>The 3-card preview grid under "Structural Precision." Up to 6 cards shown.</div>
        </div>
        <button onClick={() => setItems([...items, { id: Date.now().toString(), emoji: '🏗️', name: 'New Service', short: '' }])} className="p-btn-gold lxf" style={{ padding: '8px 16px', fontSize: 12 }}><Plus size={14} style={{ marginRight: 6 }} />Add Card</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((s, i) => (
          <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '56px 1fr 1fr auto', gap: 16, alignItems: 'center', background: '#F9FAFB', padding: '16px 20px', borderRadius: 12 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 4 }}>{s.emoji || '🏗️'}</div>
              <select value={s.emoji || '🏗️'} onChange={e => update(i, 'emoji', e.target.value)} style={{ fontSize: 10, border: '1px solid #ddd', borderRadius: 4, padding: '2px 0', width: '100%' }}>
                {EMOJI_OPTIONS.map(em => <option key={em} value={em}>{em}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: 6 }}>Card Title</div>
              <input className="p-inp" placeholder="Service name" value={s.name} onChange={e => update(i, 'name', e.target.value)} />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: 6 }}>Short Description</div>
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

export default function AdminCMS({ content, syncCMS, brand, onPreview, notify, ...props }) {
  const [sub, setSub] = useState('branding');
  const ac = brand.color || '#0F766E';
  
  const tabs = [
    { id: 'branding',     label: 'Branding',     icon: <Sparkles size={16} /> },
    { id: 'homepage',     label: 'Hero & CTA',   icon: <Layout size={16} /> },
    { id: 'stats',        label: 'Stats Bar',    icon: <BarChart2 size={16} /> },
    { id: 'homeservices', label: 'Svc Cards',    icon: <Home size={16} /> },
    { id: 'whyus',        label: 'Why Us',       icon: <Star size={16} /> },
    { id: 'services',     label: 'Services',     icon: <Activity size={16} /> },
    { id: 'products',     label: 'Products',     icon: <Smartphone size={16} /> },
    { id: 'gallery',      label: 'Portfolio',    icon: <ImgIcon size={16} /> },
    { id: 'showroom',     label: 'Showroom',     icon: <Sparkles size={16} /> },
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
      case 'gallery':      return <CMSGallery portfolio={content?.portfolio} onSave={val => syncCMS('portfolio', val)} ac={ac} notify={notify} />;
      case 'showroom':     return <CMSShowroom showcase={content?.showcase} onSave={val => syncCMS('showcase', val)} ac={ac} notify={notify} />;
      case 'about':        return <CMSAbout about={content?.about} onSave={val => syncCMS('about', val)} ac={ac} notify={notify} />;
      case 'testimonials': return <CMSTestimonials list={content?.testimonials} onSave={val => syncCMS('testimonials', val)} ac={ac} />;
      case 'footer':       return <CMSFooter data={content?.footer} onSave={val => syncCMS('footer', val)} ac={ac} />;
      default: return null;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="lxfh" style={{ fontSize: 32, fontWeight: 400 }}>Website CMS</h2>
        <button onClick={onPreview} className="p-btn-gold lxf" style={{ padding: '8px 16px' }}>View Live Site</button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, background: '#F9FAFB', padding: 6, borderRadius: 14 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setSub(t.id)}
            className="lxf"
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none',
              background: sub === t.id ? '#fff' : 'transparent', color: sub === t.id ? ac : '#4B5563',
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
