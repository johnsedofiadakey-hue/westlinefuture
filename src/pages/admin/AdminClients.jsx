import React, { useState } from 'react';
import { 
  Search, Plus, X, UserPlus, Trash2, Edit2, Mail, Phone, 
  Info, ChevronRight, ShieldCheck, Building, Shield, Command,
  Zap, Globe, Settings, Folder, DollarSign, Activity, AlertCircle,
  Key, MoreVertical, Briefcase, CheckSquare, Square, AlertTriangle
} from 'lucide-react';
import { PAv, PSBadge } from '../../components/Shared';
import EmptyState from '../../components/ui/EmptyState';
import { Users as UsersIcon } from 'lucide-react';

export default function AdminClients({ dbClients, createClient, updateClient, deleteClient, deleteSelectedClients, deleteAllClients, resetUserPassword, brand, ...props }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null); 
  const [newC, setNewC] = useState({ name: '', email: '', phone: '', company: '' });
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const PHONE_RE = /^\+?[\d\s\-().]{7,20}$/;

  const ac = brand.color || '#231F78';
  const { invoices = [], workOrders = [] } = props;

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selectedIds.length === filtered.length) setSelectedIds([]);
    else setSelectedIds(filtered.map(c => c.id));
  };

  const resetForm = () => {
    setNewC({ name: '', email: '', phone: '', company: '' });
    setEditingClient(null);
    setShowAdd(false);
  };

  const handleSubmit = async () => {
    const errs = {};
    if (!newC.name.trim()) errs.name = 'Full name is required';
    if (!newC.phone.trim()) errs.phone = 'Phone number is required';
    else if (!PHONE_RE.test(newC.phone.trim())) errs.phone = 'Invalid phone format (e.g. +233 24 000 0000)';
    setFormErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      if (editingClient) await updateClient(editingClient.id, newC);
      else await createClient(newC);
      resetForm();
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (c) => {
    setEditingClient(c);
    setNewC({ name: c.name || '', email: c.email || '', phone: c.phone || '', company: c.company || '' });
    setShowAdd(true);
  };

  const handleConfirmedDelete = async () => {
    if (!confirmDelete) return;
    if (confirmDelete.type === 'single') await deleteClient(confirmDelete.id);
    else if (confirmDelete.type === 'multi') await deleteSelectedClients(selectedIds);
    else if (confirmDelete.type === 'all') await deleteAllClients();
    
    setConfirmDelete(null);
    setSelectedIds([]);
  };

  const filtered = (dbClients || []).filter(c => 
    c.name?.toLowerCase().includes(search.toLowerCase()) || 
    c.company?.toLowerCase().includes(search.toLowerCase()) ||
    c.username?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.replace(/\D/g, '').includes(search.replace(/\D/g, ''))
  );

  return (
    <div className="p-fade admin-clients-container" style={{ padding: '20px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 }}>
        <div>
          <h2 className="lxfh" style={{ fontSize: 28, fontWeight: 700, color: '#0D0B2E' }}>Client Directory</h2>
          <p className="lxf" style={{ color: '#9B99C8', fontSize: 13, marginTop: 4 }}>Manage your clients and track their project status.</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {selectedIds.length > 0 && (
            <button onClick={() => setConfirmDelete({ type: 'multi' })} className="p-btn-dark" style={{ background: '#EF4444', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 24px' }}>
              <Trash2 size={18} /> Delete Selected
            </button>
          )}
          <button onClick={() => setConfirmDelete({ type: 'all' })} className="p-btn-dark" style={{ background: '#0D0B2E', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 24px', opacity: 0.5 }}>
            <AlertCircle size={18} /> Delete All
          </button>
          <button onClick={() => setShowAdd(true)} className="p-btn-dark" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 24px' }}>
            <UserPlus size={18} /> Add New Client
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 32, display: 'flex', gap: 16 }}>
         <div style={{ flex: 1, position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#9B99C8' }} size={18} />
            <input 
               className="p-inp" 
               style={{ paddingLeft: 48, height: 56, borderRadius: 16, background: '#F8F8FD', border: '1px solid #E8E6F5' }} 
               placeholder="Find client..." 
               value={search}
               onChange={e => setSearch(e.target.value)}
            />
         </div>
         <select 
           value={props.currency} 
           onChange={e => props.setCurrency(e.target.value)}
           style={{ height: 56, padding: '0 20px', borderRadius: 16, border: '1px solid #E8E6F5', background: '#fff', fontSize: 14, fontWeight: 700 }}
         >
           <option value="GHS">GHS (₵)</option>
           <option value="USD">USD ($)</option>
         </select>
      </div>

      <div className="p-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid #E8E6F5' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: '#F8F8FD', borderBottom: '1px solid #E8E6F5' }}>
            <tr>
              <th style={{ padding: '16px 24px', width: 40 }}>
                <button onClick={toggleAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: selectedIds.length === filtered.length ? ac : '#9B99C8' }}>
                   {selectedIds.length === filtered.length ? <CheckSquare size={20} /> : <Square size={20} />}
                </button>
              </th>
              <th style={{ padding: '16px 24px', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: '#9B99C8' }}>Stakeholder</th>
              <th style={{ padding: '16px 24px', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: '#9B99C8' }}>Entity / Company</th>
              <th style={{ padding: '16px 24px', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: '#9B99C8' }}>Operational Pulse</th>
              <th style={{ padding: '16px 24px', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: '#9B99C8', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={5}>
                <EmptyState
                  icon={<UsersIcon size={28} />}
                  title={search ? 'No clients match your search' : 'No clients yet'}
                  description={search ? 'Try a different name or phone number.' : 'Register your first client to get started.'}
                  action={!search ? { label: 'Add Client', onClick: () => setShowAdd(true) } : undefined}
                />
              </td></tr>
            )}
            {filtered.map(client => {
              const myProjects = (workOrders || []).filter(wo => wo.clientId === client.id);
              const latestProject = myProjects[myProjects.length - 1];
              const isSelected = selectedIds.includes(client.id);
              return (
                <tr key={client.id} style={{ borderBottom: '1px solid #F8F8FD', background: isSelected ? `${ac}08` : 'transparent' }} className="table-row-hover">
                  <td style={{ padding: '20px 24px' }}>
                    <button onClick={() => toggleSelect(client.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: isSelected ? ac : '#9B99C8' }}>
                       {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                    </button>
                  </td>
                  <td style={{ padding: '20px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <PAv i={client.name?.[0]} s={40} c={ac} />
                      <div>
                        <div className="lxfh" style={{ fontSize: 15, fontWeight: 700 }}>{client.name}</div>
                        <div style={{ fontSize: 11, color: '#9B99C8' }}>{client.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '20px 24px' }}>
                     <div style={{ fontSize: 14, fontWeight: 600 }}>{client.company || 'Private Portfolio'}</div>

                  </td>
                  <td style={{ padding: '20px 24px' }}>
                    {latestProject ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: ac }} />
                        <span className="lxf" style={{ fontSize: 13 }}>{latestProject.title}</span>
                      </div>
                    ) : (
                      <span className="lxf" style={{ fontSize: 12, color: '#9B99C8' }}>Standby</span>
                    )}
                  </td>
                  <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button onClick={() => props.onSelectClient?.(client.id)} className="p-btn-dark" style={{ height: 36, padding: '0 16px', fontSize: 11 }}>Hub</button>
                      <button onClick={() => startEdit(client)} style={{ background: '#F8F8FD', border: 'none', padding: 10, borderRadius: 8, color: '#0D0B2E', cursor: 'pointer' }}><Edit2 size={16} /></button>
                      <button onClick={() => setConfirmDelete({ type: 'single', id: client.id })} style={{ background: '#FFF1F1', border: 'none', padding: 10, borderRadius: 8, color: '#EF4444', cursor: 'pointer' }}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      {confirmDelete && (
        <div className="overlay-modal" style={{ background: 'rgba(13,11,46,0.9)', backdropFilter: 'blur(20px)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
           <div className="modal-box" style={{ background: '#fff', width: '100%', maxWidth: 400, borderRadius: 24, padding: 32, textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#FFF1F1', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                 <AlertTriangle size={32} />
              </div>
              <h3 className="lxfh" style={{ fontSize: 20, marginBottom: 8 }}>Confirm Deletion</h3>
              <p style={{ fontSize: 14, color: '#9B99C8', marginBottom: 32 }}>
                 {confirmDelete.type === 'all' ? 'Are you sure you want to delete ALL clients? This is a master reset.' : 
                  confirmDelete.type === 'multi' ? `Are you sure you want to delete ${selectedIds.length} selected clients?` :
                  'Are you sure you want to remove this client? This action is permanent.'}
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                 <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, height: 50, borderRadius: 12, border: '1px solid #E8E6F5', background: 'none', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                 <button onClick={handleConfirmedDelete} style={{ flex: 1, height: 50, borderRadius: 12, border: 'none', background: '#EF4444', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Delete</button>
              </div>
           </div>
        </div>
      )}

      {showAdd && (
        <div className="overlay-modal" style={{ background: 'rgba(18,18,18,0.8)', backdropFilter: 'blur(20px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-box" style={{ 
            background: '#fff', width: '100%', maxWidth: 500, borderRadius: 32, padding: 40,
            boxShadow: '0 40px 100px rgba(0,0,0,0.5)'
          }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 32 }}>
                <h3 className="lxfh" style={{ fontSize: 24, margin: 0 }}>{editingClient ? 'Modify Stakeholder' : 'Register Stakeholder'}</h3>
                <button onClick={resetForm} style={{ background: 'none', border: 'none', color: '#9B99C8', cursor: 'pointer' }}><X size={24} /></button>
             </div>
             
             <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className="p-field">
                   <label style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 800, color: '#9B99C8', marginBottom: 8, display: 'block' }}>Full Legal Name</label>
                   <input className="p-inp" value={newC.name} onChange={e => setNewC({...newC, name: e.target.value})} placeholder="e.g. Samuel Amissah" style={{ borderColor: formErrors.name ? '#EF4444' : undefined }} />
                   {formErrors.name && <div style={{ color: '#DC2626', fontSize: 11, marginTop: 4 }}>{formErrors.name}</div>}
                </div>

                <div className="p-field">
                   <label style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 800, color: '#9B99C8', marginBottom: 8, display: 'block' }}>Direct Phone (Primary ID)</label>
                   <input className="p-inp" value={newC.phone} onChange={e => setNewC({...newC, phone: e.target.value})} placeholder="e.g. +233 24 000 0000" style={{ borderColor: formErrors.phone ? '#EF4444' : undefined }} />
                   {formErrors.phone && <div style={{ color: '#DC2626', fontSize: 11, marginTop: 4 }}>{formErrors.phone}</div>}
                </div>
                <div className="p-field">
                   <label style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 800, color: '#9B99C8', marginBottom: 8, display: 'block' }}>Company / Entity</label>
                   <input className="p-inp" value={newC.company} onChange={e => setNewC({...newC, company: e.target.value})} placeholder="e.g. Amissah Developments" />
                </div>
             </div>

             <button 
                onClick={handleSubmit}
                disabled={loading}
                className="p-btn-dark" 
                style={{ width: '100%', marginTop: 40, height: 60, fontSize: 16, borderRadius: 20, opacity: loading ? 0.5 : 1 }}
             >
                {loading ? 'Processing...' : (editingClient ? 'Finalize Modifications' : 'Initialize Account')}
             </button>
          </div>
        </div>
      )}
    </div>
  );
}
