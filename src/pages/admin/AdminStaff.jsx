import React, { useState } from 'react';
import { Plus, Trash2, ShieldCheck, Award, HardHat, Heart, UserPlus, Eye, EyeOff, Copy, Check, X, Users, Mail, UserCog, Search } from 'lucide-react';
import { PAv, PSBadge } from '../../components/Shared';
import { getAuth } from 'firebase/auth';
import { db, functions } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

const BADGES = [
  { id: 'safety', label: 'Height Safety', icon: <HardHat size={12} />, color: '#FF9800' },
  { id: 'glazing', label: 'Glazing Pro', icon: <Award size={12} />, color: '#16A34A' },
  { id: 'machinery', label: 'Machinery', icon: <ShieldCheck size={12} />, color: '#2196F3' },
  { id: 'firstaid', label: 'First Aid', icon: <Heart size={12} />, color: '#EF4444' }
];

const STAFF_ROLES = ['Project Manager', 'Senior Technician', 'Technician', 'Field Worker', 'Site Supervisor'];

function genPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ─── Assign Clients Modal ─────────────────────────────────────────────────────
function AssignClientsModal({ member, clients, onClose }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set(member.assignedClients || []));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    return (c.name || '').toLowerCase().includes(q) || (c.phone || '').includes(q);
  });

  const toggle = id => {
    setSelected(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
    setSaved(false);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const arr = Array.from(selected);
      if (db && member.id) {
        await updateDoc(doc(db, 'team', member.id), { assignedClients: arr });
      }
      setSaved(true);
      setTimeout(onClose, 700);
    } catch (e) {
      if (import.meta.env.DEV) console.error('[AssignClients]', e);
    }
    setSaving(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 480, boxShadow: '0 32px 80px rgba(0,0,0,.2)', display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>
        {/* Header */}
        <div style={{ padding: '28px 28px 20px', borderBottom: '1px solid #E8E6F5', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#231F78', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>Client Assignment</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#0D0B2E' }}>{member.name}</div>
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #E8E6F5', background: '#F8F8FD', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
          </div>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9B99C8' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search clients..."
              style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 10, border: '1.5px solid #E8E6F5', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
          </div>
        </div>

        {/* Client list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#9B99C8', fontSize: 13 }}>No clients found</div>
          ) : filtered.map(c => {
            const isSelected = selected.has(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggle(c.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', borderRadius: 12, marginBottom: 6,
                  background: isSelected ? '#F0F9FF' : '#F8F8FD',
                  border: `1.5px solid ${isSelected ? '#0284C7' : 'transparent'}`,
                  cursor: 'pointer', textAlign: 'left', transition: 'all .15s',
                }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: isSelected ? '#0284C7' : '#E8E6F5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: isSelected ? '#fff' : '#9B99C8', flexShrink: 0 }}>
                  {(c.name || 'C')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0D0B2E' }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: '#9B99C8' }}>{c.phone || c.email || '—'}</div>
                </div>
                {isSelected && <Check size={14} color="#0284C7" />}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 28px 24px', borderTop: '1px solid #E8E6F5', flexShrink: 0, display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, height: 46, borderRadius: 12, border: '1.5px solid #E8E6F5', background: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ flex: 2, height: 46, borderRadius: 12, background: saved ? '#16A34A' : '#0D0B2E', color: '#fff', border: 'none', fontSize: 13, fontWeight: 800, cursor: 'pointer', transition: 'background .2s' }}
          >
            {saving ? 'Saving…' : saved ? `✓ Saved — ${selected.size} assigned` : `Assign ${selected.size} Client${selected.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminStaff({ team = [], brand, createStaffAccount, clients = [], dbClients = [], notify, ...props }) {
  const allClients = dbClients.length > 0 ? dbClients : clients;
  const ac = brand.color || '#231F78';
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'Technician' });
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(null);
  const [showPw, setShowPw] = useState(false);
  const [copied, setCopied] = useState(false);
  const [assignTarget, setAssignTarget] = useState(null);
  const [resetStates, setResetStates] = useState({});
  const [showRepair, setShowRepair] = useState(false);
  const [repairForm, setRepairForm] = useState({ email: '', name: '', role: 'Technician' });
  const [repairing, setRepairing] = useState(false);
  const [repairResult, setRepairResult] = useState(null);

  const updateM = (id, fields) => {
    if (props.updateMember) props.updateMember(id, fields);
    else if (props.onUpdateMember) props.onUpdateMember(id, fields);
  };

  const deleteM = (id) => {
    if (window.confirm('Remove this staff member?')) {
      if (props.deleteMember) props.deleteMember(id);
      else if (props.onDeleteMember) props.onDeleteMember(id);
    }
  };

  const toggleBadge = (m, badgeId) => {
    const cur = m.certs || [];
    const next = cur.includes(badgeId) ? cur.filter(x => x !== badgeId) : [...cur, badgeId];
    updateM(m.id, { certs: next });
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setCreating(true);
    const tempPw = genPassword();
    try {
      await createStaffAccount?.({ ...form, password: tempPw });
      setCreated({ name: form.name, email: form.email, password: tempPw });
      setForm({ name: '', email: '', role: 'Technician' });
    } catch (e) {
      notify?.('error', e.message || 'Failed to create account');
    }
    setCreating(false);
  };

  const copyCredentials = () => {
    const text = `Staff Portal Access\nName: ${created.name}\nEmail: ${created.email}\nTemporary Password: ${created.password}\nLogin at: ${window.location.origin}/login`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePasswordReset = async (m) => {
    if (!m.email) { notify?.('error', 'No email address on file for this staff member.'); return; }
    if (!m.phone) { notify?.('error', 'No phone number on file. Cannot send reset link via SMS.'); return; }
    setResetStates(s => ({ ...s, [m.id]: 'sending' }));
    try {
      const fn = httpsCallable(functions, 'resetStaffPasswordBySMS');
      await fn({ email: m.email, phone: m.phone });
      setResetStates(s => ({ ...s, [m.id]: 'sent' }));
      setTimeout(() => setResetStates(s => ({ ...s, [m.id]: null })), 5000);
    } catch (e) {
      notify?.('error', e.message || 'Failed to send reset link');
      setResetStates(s => ({ ...s, [m.id]: null }));
    }
  };

  const handleRepair = async () => {
    if (!repairForm.email.trim()) return;
    setRepairing(true);
    setRepairResult(null);
    try {
      const fn = httpsCallable(functions, 'repairStaffAccount');
      const res = await fn({ email: repairForm.email.trim(), name: repairForm.name.trim(), jobRole: repairForm.role });
      setRepairResult({ success: true, name: res.data.name, role: res.data.role });
    } catch (e) {
      setRepairResult({ success: false, error: e.message });
    }
    setRepairing(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="lxfh" style={{ fontSize: 32, fontWeight: 400, color: '#0D0B2E' }}>Staff Governance</h2>
          <p className="lxf" style={{ color: '#9B99C8', fontSize: 13, marginTop: 4 }}>Manage team accounts, certifications, and client assignments.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => { setShowRepair(true); setRepairResult(null); setRepairForm({ email: '', name: '', role: 'Technician' }); }}
            style={{ padding: '10px 16px', fontSize: 13, gap: 8, display: 'flex', alignItems: 'center', borderRadius: 12, border: '1.5px solid #E8E6F5', background: '#F8F8FD', cursor: 'pointer', fontWeight: 700, color: '#5B5894', fontFamily: 'inherit' }}
          >
            <Search size={14} /> Recover Account
          </button>
          <button onClick={() => { setShowModal(true); setCreated(null); }} className="p-btn-dark lxf" style={{ padding: '10px 20px', fontSize: 13, gap: 8, display: 'flex', alignItems: 'center' }}>
            <UserPlus size={16} /> Create Staff Account
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {[
          { label: 'Total Staff', value: team.length, color: '#0D0B2E' },
          { label: 'Active', value: team.filter(m => m.status !== 'Inactive').length, color: '#16A34A' },
          { label: 'Assigned Clients', value: team.reduce((acc, m) => acc + (m.assignedClients?.length || 0), 0), color: ac },
        ].map(s => (
          <div key={s.label} className="p-card" style={{ padding: 20, textAlign: 'center' }}>
            <div className="lxfh" style={{ fontSize: 28, fontWeight: 900, color: s.color, marginBottom: 4 }}>{s.value}</div>
            <div className="lxf" style={{ fontSize: 11, color: '#9B99C8', textTransform: 'uppercase', letterSpacing: '.08em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="p-card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Staff', 'Role', 'Certifications', 'Clients', 'Status', 'Actions'].map(h => <th key={h} className="t-head" style={{ padding: '16px' }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {(team || []).map(m => (
              <tr key={m.id} className="t-row">
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <PAv i={m.av || m.name?.charAt(0)} s={40} c={ac} />
                    <div>
                      <div className="lxf" style={{ fontSize: 14, fontWeight: 600, color: '#0D0B2E' }}>{m.name}</div>
                      <div className="lxf" style={{ fontSize: 11, color: '#9B99C8' }}>{m.email || m.phone || '—'}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '16px' }}>
                  <div className="lxf" style={{ fontSize: 13, color: '#0D0B2E' }}>{m.role || m.jobRole || '—'}</div>
                </td>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {BADGES.map(b => (
                      <button key={b.id} onClick={() => toggleBadge(m, b.id)} style={{
                        display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20,
                        border: `1.5px solid ${(m.certs || []).includes(b.id) ? b.color : '#E8E6F5'}`,
                        background: (m.certs || []).includes(b.id) ? `${b.color}15` : 'none',
                        color: (m.certs || []).includes(b.id) ? b.color : '#9B99C8',
                        fontSize: 10, fontWeight: 700, cursor: 'pointer',
                      }}>
                        {b.icon} {b.label}
                      </button>
                    ))}
                  </div>
                </td>
                <td style={{ padding: '16px' }}>
                  <button
                    onClick={() => setAssignTarget(m)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: '#F8F8FD', border: '1px solid #E8E6F5', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#5B5894' }}
                  >
                    <UserCog size={13} />
                    {(m.assignedClients?.length || 0)} assigned
                  </button>
                </td>
                <td style={{ padding: '16px' }}>
                  <select
                    value={m.status || 'Active'}
                    onChange={e => updateM(m.id, { status: e.target.value })}
                    style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #E8E6F5', fontSize: 12, fontWeight: 700, background: '#fff', cursor: 'pointer' }}
                  >
                    {['Active', 'On Leave', 'Inactive'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </td>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {/* Password reset */}
                    <button
                      onClick={() => handlePasswordReset(m)}
                      disabled={resetStates[m.id] === 'sending'}
                      title="Send password reset link via SMS"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 8,
                        background: resetStates[m.id] === 'sent' ? '#F0FDF4' : '#F8F8FD',
                        border: `1px solid ${resetStates[m.id] === 'sent' ? '#16A34A40' : '#E8E6F5'}`,
                        fontSize: 11, fontWeight: 700, cursor: 'pointer',
                        color: resetStates[m.id] === 'sent' ? '#16A34A' : '#5B5894',
                      }}
                    >
                      <Mail size={12} />
                      {resetStates[m.id] === 'sending' ? 'Sending…' : resetStates[m.id] === 'sent' ? 'Sent ✓' : 'Reset'}
                    </button>
                    {/* Delete */}
                    <button onClick={() => deleteM(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9B99C8', padding: 6 }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {team.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 48, textAlign: 'center', color: '#9B99C8' }}>
                <Users size={40} color="#E8E6F5" style={{ marginBottom: 12 }} />
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>No staff accounts yet</div>
                <div style={{ fontSize: 12 }}>Create a staff account to get started.</div>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ASSIGN CLIENTS MODAL */}
      {assignTarget && (
        <AssignClientsModal
          member={assignTarget}
          clients={allClients}
          onClose={() => setAssignTarget(null)}
        />
      )}

      {/* RECOVER ACCOUNT MODAL */}
      {showRepair && (
        <div className="overlay-modal" onClick={() => !repairing && setShowRepair(false)}>
          <div className="modal-box lxf" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 className="lxfh" style={{ fontSize: 22, marginBottom: 4 }}>Recover Staff Account</h3>
                <p className="lxf" style={{ color: '#9B99C8', fontSize: 13 }}>Re-links a Firebase Auth account that's missing from the staff register. Use this for accounts created before the system update.</p>
              </div>
              <button onClick={() => setShowRepair(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9B99C8', flexShrink: 0 }}><X size={20} /></button>
            </div>

            {repairResult ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                {repairResult.success ? (
                  <>
                    <div style={{ width: 56, height: 56, borderRadius: 16, background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                      <Check size={24} color="#16A34A" />
                    </div>
                    <div className="lxfh" style={{ fontSize: 18, marginBottom: 8 }}>Account Recovered</div>
                    <p className="lxf" style={{ color: '#5B5894', fontSize: 13, marginBottom: 20 }}>
                      <strong>{repairResult.name}</strong> now appears in the staff register as a <strong>{repairResult.role}</strong>. They can log in with their existing password.
                    </p>
                    <button onClick={() => setShowRepair(false)} className="p-btn-dark" style={{ width: '100%', padding: 14 }}>Done</button>
                  </>
                ) : (
                  <>
                    <div style={{ width: 56, height: 56, borderRadius: 16, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                      <X size={24} color="#DC2626" />
                    </div>
                    <div className="lxfh" style={{ fontSize: 18, marginBottom: 8 }}>Recovery Failed</div>
                    <p className="lxf" style={{ color: '#DC2626', fontSize: 13, marginBottom: 20 }}>{repairResult.error}</p>
                    <button onClick={() => setRepairResult(null)} className="p-btn-dark" style={{ width: '100%', padding: 14 }}>Try Again</button>
                  </>
                )}
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label className="lxf" style={{ fontSize: 11, fontWeight: 800, color: '#9B99C8', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Email Address *</label>
                    <input className="p-inp" type="email" value={repairForm.email} onChange={e => setRepairForm(f => ({ ...f, email: e.target.value }))} placeholder="existing@email.com" style={{ width: '100%', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label className="lxf" style={{ fontSize: 11, fontWeight: 800, color: '#9B99C8', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Full Name (if missing)</label>
                    <input className="p-inp" value={repairForm.name} onChange={e => setRepairForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Kofi Mensah" style={{ width: '100%', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label className="lxf" style={{ fontSize: 11, fontWeight: 800, color: '#9B99C8', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Role</label>
                    <select className="p-inp" value={repairForm.role} onChange={e => setRepairForm(f => ({ ...f, role: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }}>
                      {STAFF_ROLES.map(r => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleRepair}
                  disabled={repairing || !repairForm.email.trim()}
                  className="p-btn-dark lxf"
                  style={{ width: '100%', marginTop: 24, padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: (repairing || !repairForm.email.trim()) ? 0.6 : 1 }}
                >
                  {repairing ? 'Searching & Recovering…' : <><Search size={15} /> Find & Recover Account</>}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* CREATE STAFF MODAL */}
      {showModal && (
        <div className="overlay-modal" onClick={() => !creating && setShowModal(false)}>
          <div className="modal-box lxf" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            {!created ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <div>
                    <h3 className="lxfh" style={{ fontSize: 22, marginBottom: 4 }}>Create Staff Account</h3>
                    <p className="lxf" style={{ color: '#9B99C8', fontSize: 13 }}>Staff can log in and manage their assigned clients.</p>
                  </div>
                  <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9B99C8' }}><X size={20} /></button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label className="lxf" style={{ fontSize: 11, fontWeight: 800, color: '#9B99C8', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Full Name *</label>
                    <input className="p-inp" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Kofi Mensah" style={{ width: '100%', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label className="lxf" style={{ fontSize: 11, fontWeight: 800, color: '#9B99C8', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Email Address *</label>
                    <input className="p-inp" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="staff@company.com" style={{ width: '100%', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label className="lxf" style={{ fontSize: 11, fontWeight: 800, color: '#9B99C8', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Role</label>
                    <select className="p-inp" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }}>
                      {STAFF_ROLES.map(r => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleCreate}
                  disabled={creating || !form.name.trim() || !form.email.trim()}
                  className="p-btn-dark lxf"
                  style={{ width: '100%', marginTop: 24, padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: (creating || !form.name.trim() || !form.email.trim()) ? 0.6 : 1 }}
                >
                  {creating ? 'Creating Account…' : <><UserPlus size={16} /> Create Account & Generate Credentials</>}
                </button>
              </>
            ) : (
              <>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <div style={{ width: 64, height: 64, borderRadius: 18, background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <Check size={28} color="#16A34A" />
                  </div>
                  <h3 className="lxfh" style={{ fontSize: 22, marginBottom: 6 }}>Account Created</h3>
                  <p className="lxf" style={{ color: '#9B99C8', fontSize: 13 }}>Share these credentials with <strong>{created.name}</strong>. They must change their password on first login.</p>
                </div>
                <div style={{ background: '#F8F8FD', borderRadius: 14, padding: 20, marginBottom: 20 }}>
                  {[
                    { label: 'Name', value: created.name },
                    { label: 'Email / Login', value: created.email },
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid #E8E6F5' }}>
                      <span className="lxf" style={{ fontSize: 12, color: '#9B99C8', fontWeight: 700 }}>{row.label}</span>
                      <span className="lxf" style={{ fontSize: 13, fontWeight: 700, color: '#0D0B2E' }}>{row.value}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="lxf" style={{ fontSize: 12, color: '#9B99C8', fontWeight: 700 }}>Temp Password</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span className="lxf" style={{ fontSize: 13, fontWeight: 800, color: '#0D0B2E', fontFamily: 'monospace', letterSpacing: 1 }}>
                        {showPw ? created.password : '●'.repeat(created.password.length)}
                      </span>
                      <button onClick={() => setShowPw(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9B99C8', padding: 0 }}>
                        {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={copyCredentials} className="p-btn-gold lxf" style={{ flex: 1, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    {copied ? <><Check size={15} /> Copied!</> : <><Copy size={15} /> Copy Credentials</>}
                  </button>
                  <button onClick={() => { setCreated(null); setShowModal(false); }} className="p-btn-dark lxf" style={{ flex: 1, padding: 12 }}>Done</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
