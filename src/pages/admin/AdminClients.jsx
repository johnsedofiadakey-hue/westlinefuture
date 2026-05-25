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
  const [wizardStep, setWizardStep] = useState(1);
  const [editingClient, setEditingClient] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null); 
  const [newC, setNewC] = useState({ name: '', email: '', phone: '', company: '', taxId: '', address: '', clientType: 'Corporate', source: '' });
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const PHONE_RE = /^\+?[\d\s\-().]{7,20}$/;

  const ac = brand.color || `var(--accent-secondary)`;
  const { invoices = [], workOrders = [] } = props;

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selectedIds.length === filtered.length) setSelectedIds([]);
    else setSelectedIds(filtered.map(c => c.id));
  };

  const resetForm = () => {
    setNewC({ name: '', email: '', phone: '', company: '', taxId: '', address: '', clientType: 'Corporate', source: '' });
    setWizardStep(1);
    setEditingClient(null);
    setShowAdd(false);
    setFormErrors({});
  };

  const handleNextStep = () => {
    const errs = {};
    if (wizardStep === 1) {
       if (!newC.name.trim()) errs.name = 'Full name is required';
       if (!newC.phone.trim()) errs.phone = 'Phone number is required';
       else if (!PHONE_RE.test(newC.phone.trim())) errs.phone = 'Invalid phone format';
    }
    
    setFormErrors(errs);
    if (Object.keys(errs).length === 0) {
       setWizardStep(prev => prev + 1);
    }
  };

  const handleSubmit = async () => {
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
    setNewC({ 
       name: c.name || '', email: c.email || '', phone: c.phone || '', 
       company: c.company || '', taxId: c.taxId || '', address: c.address || '', 
       clientType: c.clientType || 'Corporate', source: c.source || '' 
    });
    setWizardStep(1);
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
          <h2 className="lxfh" style={{ fontSize: 28, fontWeight: 700, color: `var(--accent-secondary)` }}>Client Directory</h2>
          <p className="lxf" style={{ color: `var(--text-secondary)`, fontSize: 13, marginTop: 4 }}>Manage your clients and track their project status.</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {selectedIds.length > 0 && (
            <button onClick={() => setConfirmDelete({ type: 'multi' })} className="p-btn-dark" style={{ background: '#EF4444', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 24px' }}>
              <Trash2 size={18} /> Delete Selected
            </button>
          )}
          <button onClick={() => setConfirmDelete({ type: 'all' })} className="p-btn-dark" style={{ background: `var(--accent-secondary)`, color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 24px', opacity: 0.5 }}>
            <AlertCircle size={18} /> Delete All
          </button>
          <button onClick={() => setShowAdd(true)} className="p-btn-dark" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 24px' }}>
            <UserPlus size={18} /> Add New Client
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 32, display: 'flex', gap: 16 }}>
         <div style={{ flex: 1, position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: `var(--text-secondary)` }} size={18} />
            <input 
               className="p-inp" 
               style={{ paddingLeft: 48, height: 56, borderRadius: 16, background: `var(--bg-secondary)`, border: '1px solid var(--border-color)' }} 
               placeholder="Find client..." 
               value={search}
               onChange={e => setSearch(e.target.value)}
            />
         </div>
         <select 
           value={props.currency} 
           onChange={e => props.setCurrency(e.target.value)}
           style={{ height: 56, padding: '0 20px', borderRadius: 16, border: '1px solid var(--border-color)', background: '#fff', fontSize: 14, fontWeight: 700 }}
         >
           <option value="GHS">GHS (₵)</option>
           <option value="USD">USD ($)</option>
         </select>
      </div>

      <div className="p-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: `var(--bg-secondary)`, borderBottom: '1px solid var(--border-color)' }}>
            <tr>
              <th style={{ padding: '16px 24px', width: 40 }}>
                <button onClick={toggleAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: selectedIds.length === filtered.length ? ac : `var(--text-secondary)` }}>
                   {selectedIds.length === filtered.length ? <CheckSquare size={20} /> : <Square size={20} />}
                </button>
              </th>
              <th style={{ padding: '16px 24px', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: `var(--text-secondary)` }}>Stakeholder / Entity</th>
              <th style={{ padding: '16px 24px', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: `var(--text-secondary)` }}>Health</th>
              <th style={{ padding: '16px 24px', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: `var(--text-secondary)` }}>Operational Pulse</th>
              <th style={{ padding: '16px 24px', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: `var(--text-secondary)` }}>Next Action</th>
              <th style={{ padding: '16px 24px', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: `var(--text-secondary)` }}>Outstanding</th>
              <th style={{ padding: '16px 24px', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: `var(--text-secondary)`, textAlign: 'right' }}>Actions</th>
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
              const clientInvoices = invoices.filter(inv => inv.clientId === client.id);
              const totalOwed = clientInvoices.reduce((sum, inv) => {
                if (inv.status === 'Paid') return sum;
                return sum + ((inv.amount || 0) - (inv.amountPaid || 0));
              }, 0);
              
              const unpaidCount = clientInvoices.filter(i => i.status !== 'Paid').length;
              let healthScore = 'Green'; // Green, Yellow, Red
              let healthText = 'On Track';
              let nextAction = 'Ready for Intake';
              let healthColor = '#10B981';

              if (unpaidCount > 0) {
                 healthScore = 'Yellow';
                 healthText = 'Awaiting Payment';
                 healthColor = '#F59E0B';
                 nextAction = 'Client Payment Required';
              }
              
              if (latestProject) {
                 if (latestProject.status === 'Installation') nextAction = 'Awaiting Worker Photos';
                 else if (latestProject.status === 'Inspection') nextAction = 'Awaiting Inspection Sign-off';
                 else if (latestProject.status === 'Completed') {
                    nextAction = 'Project Closed';
                    healthScore = 'Green';
                    healthText = 'Completed';
                 } else nextAction = `Advance ${latestProject.title}`;
              }

              if (totalOwed > 10000) {
                 healthScore = 'Red';
                 healthText = 'High Outstanding Balance';
                 healthColor = '#EF4444';
              }

              const isSelected = selectedIds.includes(client.id);

              return (
                <tr key={client.id} style={{ borderBottom: '1px solid var(--bg-secondary)', background: isSelected ? `${ac}08` : 'transparent' }} className="table-row-hover">
                  <td style={{ padding: '20px 24px' }}>
                    <button onClick={() => toggleSelect(client.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: isSelected ? ac : `var(--text-secondary)` }}>
                       {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                    </button>
                  </td>
                  <td style={{ padding: '20px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <PAv i={client.name?.[0]} s={40} c={ac} />
                      <div>
                        <div className="lxfh" style={{ fontSize: 15, fontWeight: 700 }}>{client.name}</div>
                        <div style={{ fontSize: 12, color: `var(--text-secondary)` }}>{client.company || 'Private Portfolio'} • {client.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '20px 24px' }}>
                     <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: `${healthColor}15`, color: healthColor, padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: healthColor }} />
                        {healthText}
                     </div>
                  </td>
                  <td style={{ padding: '20px 24px' }}>
                    {latestProject ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span className="lxfh" style={{ fontSize: 14 }}>{latestProject.title}</span>
                        <span style={{ fontSize: 11, color: `var(--text-secondary)` }}>Stage: {latestProject.status || 'Initiation'}</span>
                      </div>
                    ) : (
                      <span className="lxf" style={{ fontSize: 12, color: `var(--text-secondary)` }}>Standby</span>
                    )}
                  </td>
                  <td style={{ padding: '20px 24px' }}>
                     <div style={{ fontSize: 13, fontWeight: 600, color: `var(--text-secondary)` }}>{nextAction}</div>
                  </td>
                  <td style={{ padding: '20px 24px' }}>
                     <div style={{ fontSize: 14, fontWeight: 700, color: totalOwed > 0 ? '#EF4444' : `var(--text-secondary)` }}>
                        {totalOwed > 0 ? `${props.currency === 'USD' ? '$' : '₵'}${totalOwed.toLocaleString()}` : '-'}
                     </div>
                  </td>
                  <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button onClick={() => props.onSelectClient?.(client.id)} className="p-btn-dark" style={{ height: 36, padding: '0 16px', fontSize: 11 }}>Hub</button>
                      <button onClick={() => startEdit(client)} style={{ background: `var(--bg-secondary)`, border: 'none', padding: 10, borderRadius: 8, color: `var(--accent-secondary)`, cursor: 'pointer' }}><Edit2 size={16} /></button>
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
        <div className="overlay-modal" style={{ background: 'rgba(92, 58, 33,0.9)', backdropFilter: 'blur(20px)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
           <div className="modal-box" style={{ background: '#fff', width: '100%', maxWidth: 400, borderRadius: 24, padding: 32, textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#FFF1F1', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                 <AlertTriangle size={32} />
              </div>
              <h3 className="lxfh" style={{ fontSize: 20, marginBottom: 8 }}>Confirm Deletion</h3>
              <p style={{ fontSize: 14, color: `var(--text-secondary)`, marginBottom: 32 }}>
                 {confirmDelete.type === 'all' ? 'Are you sure you want to delete ALL clients? This is a master reset.' : 
                  confirmDelete.type === 'multi' ? `Are you sure you want to delete ${selectedIds.length} selected clients?` :
                  'Are you sure you want to remove this client? This action is permanent.'}
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                 <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, height: 50, borderRadius: 12, border: '1px solid var(--border-color)', background: 'none', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
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
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                <div>
                   <h3 className="lxfh" style={{ fontSize: 24, margin: 0 }}>{editingClient ? 'Modify Stakeholder' : 'Register Stakeholder'}</h3>
                   <div style={{ fontSize: 12, color: `var(--text-secondary)`, marginTop: 4 }}>Step {wizardStep} of 3</div>
                </div>
                <button onClick={resetForm} style={{ background: 'none', border: 'none', color: `var(--text-secondary)`, cursor: 'pointer' }}><X size={24} /></button>
             </div>

             <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
                {[1, 2, 3].map(st => (
                   <div key={st} style={{ flex: 1, height: 4, borderRadius: 2, background: wizardStep >= st ? ac : `var(--border-color)` }} />
                ))}
             </div>
             
             <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minHeight: 280 }}>
                {wizardStep === 1 && (
                   <>
                      <div className="p-field">
                         <label style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 800, color: `var(--text-secondary)`, marginBottom: 8, display: 'block' }}>Client Type</label>
                         <div style={{ display: 'flex', gap: 12 }}>
                            {['Corporate', 'Individual'].map(type => (
                               <button 
                                  key={type}
                                  onClick={() => setNewC({...newC, clientType: type})}
                                  style={{ flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${newC.clientType === type ? ac : 'var(--border-color)'}`, background: newC.clientType === type ? `${ac}10` : 'transparent', color: newC.clientType === type ? ac : `var(--text-secondary)`, fontWeight: 700, cursor: 'pointer' }}
                               >
                                  {type}
                               </button>
                            ))}
                         </div>
                      </div>
                      <div className="p-field">
                         <label style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 800, color: `var(--text-secondary)`, marginBottom: 8, display: 'block' }}>Full Legal Name</label>
                         <input className="p-inp" value={newC.name} onChange={e => setNewC({...newC, name: e.target.value})} placeholder="e.g. Samuel Amissah" style={{ borderColor: formErrors.name ? '#EF4444' : undefined }} />
                         {formErrors.name && <div style={{ color: '#DC2626', fontSize: 11, marginTop: 4 }}>{formErrors.name}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: 16 }}>
                         <div className="p-field" style={{ flex: 1 }}>
                            <label style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 800, color: `var(--text-secondary)`, marginBottom: 8, display: 'block' }}>Direct Phone</label>
                            <input className="p-inp" value={newC.phone} onChange={e => setNewC({...newC, phone: e.target.value})} placeholder="+233 24 000 0000" style={{ borderColor: formErrors.phone ? '#EF4444' : undefined }} />
                            {formErrors.phone && <div style={{ color: '#DC2626', fontSize: 11, marginTop: 4 }}>{formErrors.phone}</div>}
                         </div>
                         <div className="p-field" style={{ flex: 1 }}>
                            <label style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 800, color: `var(--text-secondary)`, marginBottom: 8, display: 'block' }}>Email Address</label>
                            <input type="email" className="p-inp" value={newC.email} onChange={e => setNewC({...newC, email: e.target.value})} placeholder="samuel@example.com" style={{ borderColor: formErrors.email ? '#EF4444' : undefined }} />
                            {formErrors.email && <div style={{ color: '#DC2626', fontSize: 11, marginTop: 4 }}>{formErrors.email}</div>}
                         </div>
                      </div>
                   </>
                )}

                {wizardStep === 2 && (
                   <>
                      <div className="p-field">
                         <label style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 800, color: `var(--text-secondary)`, marginBottom: 8, display: 'block' }}>Company / Entity Name</label>
                         <input className="p-inp" value={newC.company} onChange={e => setNewC({...newC, company: e.target.value})} placeholder="e.g. Amissah Developments" style={{ borderColor: formErrors.company ? '#EF4444' : undefined }} />
                         {formErrors.company && <div style={{ color: '#DC2626', fontSize: 11, marginTop: 4 }}>{formErrors.company}</div>}
                      </div>
                      <div className="p-field">
                         <label style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 800, color: `var(--text-secondary)`, marginBottom: 8, display: 'block' }}>Tax ID / VAT Registration</label>
                         <input className="p-inp" value={newC.taxId} onChange={e => setNewC({...newC, taxId: e.target.value})} placeholder="Optional for individuals" />
                      </div>
                      <div className="p-field">
                         <label style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 800, color: `var(--text-secondary)`, marginBottom: 8, display: 'block' }}>Billing / Registered Address</label>
                         <textarea className="p-inp" value={newC.address} onChange={e => setNewC({...newC, address: e.target.value})} placeholder="123 Corporate Ave..." style={{ minHeight: 80, resize: 'none' }} />
                      </div>
                   </>
                )}

                {wizardStep === 3 && (
                   <>
                      <div className="p-field">
                         <label style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 800, color: `var(--text-secondary)`, marginBottom: 8, display: 'block' }}>Lead Source</label>
                         <select className="p-inp" value={newC.source} onChange={e => setNewC({...newC, source: e.target.value})} style={{ background: '#f5f5f5', border: '1px solid var(--border-color)', height: 50, borderRadius: 12, padding: '0 16px' }}>
                            <option value="">Select Source...</option>
                            <option value="Website">Website Inquiry</option>
                            <option value="Referral">Client Referral</option>
                            <option value="Walk-in">Walk-in</option>
                            <option value="Social Media">Social Media</option>
                            <option value="Other">Other</option>
                         </select>
                      </div>
                      <div style={{ background: `${ac}10`, padding: 20, borderRadius: 16, marginTop: 20, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                         <div style={{ color: ac }}><Info size={24} /></div>
                         <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: ac, marginBottom: 4 }}>Almost Done!</div>
                            <div style={{ fontSize: 12, color: `var(--text-secondary)`, lineHeight: 1.5 }}>
                               Saving this profile will create a secure portal for the client. They will automatically receive an invitation email containing their access credentials.
                            </div>
                         </div>
                      </div>
                   </>
                )}
             </div>

             <div style={{ display: 'flex', gap: 12, marginTop: 40 }}>
                {wizardStep > 1 && (
                   <button 
                      onClick={() => setWizardStep(prev => prev - 1)}
                      className="p-btn-dark" 
                      style={{ flex: 1, background: 'transparent', color: `var(--text-secondary)`, border: '1px solid var(--border-color)', height: 60, fontSize: 16, borderRadius: 20 }}
                   >
                      Back
                   </button>
                )}
                {wizardStep < 3 ? (
                   <button 
                      onClick={handleNextStep}
                      className="p-btn-dark" 
                      style={{ flex: 2, height: 60, fontSize: 16, borderRadius: 20 }}
                   >
                      Continue to Step {wizardStep + 1}
                   </button>
                ) : (
                   <button 
                      onClick={handleSubmit}
                      disabled={loading}
                      className="p-btn-dark" 
                      style={{ flex: 2, height: 60, fontSize: 16, borderRadius: 20, opacity: loading ? 0.5 : 1 }}
                   >
                      {loading ? 'Processing...' : (editingClient ? 'Finalize Modifications' : 'Initialize Account')}
                   </button>
                )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
