import React, { useState } from 'react';
import { Plus, Trash2, ShieldCheck, Award, HardHat, Heart, UserPlus, Eye, EyeOff, Copy, Check, X, Users, UserCog, Search, KeyRound } from 'lucide-react';
import { PAv, PSBadge, CountryPicker, COUNTRIES } from '../../components/Shared';
import { db, firebaseConfig, functions } from '../../lib/firebase';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, updatePassword, sendPasswordResetEmail } from 'firebase/auth';
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
function AssignClientsModal({ member, clients, onClose, updateMember }) {
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
        await updateDoc(doc(db, 'users', member.id), { assignedClients: arr });
        if (typeof updateMember === 'function') updateMember(member.id, { assignedClients: arr });
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
        <div style={{ padding: '28px 28px 20px', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: `var(--accent-secondary)`, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>Client Assignment</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: `var(--accent-secondary)` }}>{member.name}</div>
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border-color)', background: `var(--bg-secondary)`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
          </div>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: `var(--text-secondary)` }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search clients..."
              style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
          </div>
        </div>

        {/* Client list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: `var(--text-secondary)`, fontSize: 13 }}>No clients found</div>
          ) : filtered.map(c => {
            const isSelected = selected.has(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggle(c.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', borderRadius: 12, marginBottom: 6,
                  background: isSelected ? '#F0F9FF' : `var(--bg-secondary)`,
                  border: `1.5px solid ${isSelected ? `var(--text-secondary)` : 'transparent'}`,
                  cursor: 'pointer', textAlign: 'left', transition: 'all .15s',
                }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: isSelected ? `var(--text-secondary)` : `var(--border-color)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: isSelected ? '#fff' : `var(--text-secondary)`, flexShrink: 0 }}>
                  {(c.name || 'C')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: `var(--accent-secondary)` }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: `var(--text-secondary)` }}>{c.phone || c.email || '—'}</div>
                </div>
                {isSelected && <Check size={14} color="var(--text-secondary)" />}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 28px 24px', borderTop: '1px solid var(--border-color)', flexShrink: 0, display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, height: 46, borderRadius: 12, border: '1.5px solid var(--border-color)', background: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ flex: 2, height: 46, borderRadius: 12, background: saved ? '#16A34A' : `var(--accent-secondary)`, color: '#fff', border: 'none', fontSize: 13, fontWeight: 800, cursor: 'pointer', transition: 'background .2s' }}
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
  const ac = brand.color || `var(--accent-secondary)`;
  const [showModal, setShowModal] = useState(false);
  const defaultCountry = COUNTRIES.find(c => c.code === '+233') || COUNTRIES[0];
  const [form, setForm] = useState({ name: '', username: '', role: 'Technician' });
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
  // Password management per staff member
  const [pwPanel, setPwPanel] = useState(null);      // member id whose panel is open
  const [pwVisible, setPwVisible] = useState({});     // { [id]: true } if revealed
  const [newPwInputs, setNewPwInputs] = useState({}); // { [id]: 'newpassword' }
  const [pwSaving, setPwSaving] = useState({});       // { [id]: true } if saving

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
    if (!form.name.trim() || !form.username.trim()) return;
    setCreating(true);
    const tempPw = genPassword();
    const cleanUsername = form.username.toLowerCase().replace(/\s+/g, '');
    try {
      await createStaffAccount?.({ ...form, username: cleanUsername, password: tempPw });
      setCreated({ name: form.name, username: cleanUsername, password: tempPw });
      setForm({ name: '', username: '', role: 'Technician' });
    } catch (e) {
      notify?.('error', e.message || 'Failed to create account');
    }
    setCreating(false);
  };

  const copyCredentials = () => {
    const text = `Staff Portal Access\nName: ${created.name}\nUsername: ${created.username}\nTemporary Password: ${created.password}\nLogin at: ${window.location.origin}/login`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSetPassword = async (m, newPw) => {
    if (!m.id) { notify?.('error', 'Cannot identify staff account.'); return; }
    if (!newPw || newPw.trim().length < 6) { notify?.('error', 'Password must be at least 6 characters.'); return; }
    
    setPwSaving(s => ({ ...s, [m.id]: true }));
    let secondaryApp;
    try {
      if (!m.tempPassword) {
        throw new Error("Missing initial password in database. Cannot reset without cloud function.");
      }
      
      // Try to update using a secondary client instance (old reliable method)
      secondaryApp = initializeApp(firebaseConfig, 'PwReset_' + Date.now());
      const secondaryAuth = getAuth(secondaryApp);
      const cred = await signInWithEmailAndPassword(secondaryAuth, m.email, m.tempPassword);
      await updatePassword(cred.user, newPw.trim());
      await updateDoc(doc(db, 'users', m.id), {
        tempPassword: newPw.trim(),
        passwordUpdatedAt: new Date().toISOString(),
      }).catch(() => {});
      
      notify?.('success', `Password updated for ${m.name}`);
      setNewPwInputs(s => ({ ...s, [m.id]: '' }));
      setPwPanel(null);
    } catch (e) {
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        notify?.('error', "Initial password mismatch. You may need to delete and recreate this account.");
      } else {
        notify?.('error', e.message || 'Failed to update password');
      }
    } finally {
      if (secondaryApp) await deleteApp(secondaryApp).catch(() => {});
      setPwSaving(s => ({ ...s, [m.id]: false }));
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
          <h2 className="lxfh" style={{ fontSize: 32, fontWeight: 400, color: `var(--accent-secondary)` }}>Staff Governance</h2>
          <p className="lxf" style={{ color: `var(--text-secondary)`, fontSize: 13, marginTop: 4 }}>Manage team accounts, certifications, and client assignments.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => { setShowRepair(true); setRepairResult(null); setRepairForm({ email: '', name: '', role: 'Technician' }); }}
            style={{ padding: '10px 16px', fontSize: 13, gap: 8, display: 'flex', alignItems: 'center', borderRadius: 12, border: '1.5px solid var(--border-color)', background: `var(--bg-secondary)`, cursor: 'pointer', fontWeight: 700, color: `var(--text-secondary)`, fontFamily: 'inherit' }}
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
          { label: 'Total Staff', value: team.length, color: `var(--accent-secondary)` },
          { label: 'Active', value: team.filter(m => m.status !== 'Inactive').length, color: '#16A34A' },
          { label: 'Assigned Clients', value: team.reduce((acc, m) => acc + (m.assignedClients?.length || 0), 0), color: ac },
        ].map(s => (
          <div key={s.label} className="p-card" style={{ padding: 20, textAlign: 'center' }}>
            <div className="lxfh" style={{ fontSize: 28, fontWeight: 900, color: s.color, marginBottom: 4 }}>{s.value}</div>
            <div className="lxf" style={{ fontSize: 11, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.08em' }}>{s.label}</div>
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
                      <div className="lxf" style={{ fontSize: 14, fontWeight: 600, color: `var(--accent-secondary)` }}>{m.name}</div>
                      <div className="lxf" style={{ fontSize: 11, color: `var(--text-secondary)` }}>{m.username || m.email || m.phone || '—'}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '16px' }}>
                  <div className="lxf" style={{ fontSize: 13, color: `var(--accent-secondary)` }}>{m.role || m.jobRole || '—'}</div>
                </td>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {BADGES.map(b => (
                      <button key={b.id} onClick={() => toggleBadge(m, b.id)} style={{
                        display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20,
                        border: `1.5px solid ${(m.certs || []).includes(b.id) ? b.color : `var(--border-color)`}`,
                        background: (m.certs || []).includes(b.id) ? `${b.color}15` : 'none',
                        color: (m.certs || []).includes(b.id) ? b.color : `var(--text-secondary)`,
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
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: `var(--bg-secondary)`, border: '1px solid var(--border-color)', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: `var(--text-secondary)` }}
                  >
                    <UserCog size={13} />
                    {(m.assignedClients?.length || 0)} assigned
                  </button>
                </td>
                <td style={{ padding: '16px' }}>
                  <select
                    value={m.status || 'Active'}
                    onChange={e => updateM(m.id, { status: e.target.value })}
                    style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: 12, fontWeight: 700, background: '#fff', cursor: 'pointer' }}
                  >
                    {['Active', 'On Leave', 'Inactive'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </td>
                <td style={{ padding: '16px', maxWidth: 260 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Password manage button */}
                    <button
                      onClick={() => setPwPanel(pwPanel === m.id ? null : m.id)}
                      title="View / reset password"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 8,
                        background: pwPanel === m.id ? `${ac}15` : `var(--bg-secondary)`,
                        border: `1px solid ${pwPanel === m.id ? ac : `var(--border-color)`}`,
                        fontSize: 11, fontWeight: 700, cursor: 'pointer',
                        color: pwPanel === m.id ? ac : `var(--text-secondary)`,
                      }}
                    >
                      <Eye size={12} />
                      Password
                    </button>
                    {/* Delete */}
                    <button onClick={() => deleteM(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: `var(--text-secondary)`, padding: 6 }}>
                      <Trash2 size={16} />
                    </button>
                  </div>


                </td>
              </tr>
            ))}
            {team.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 48, textAlign: 'center', color: `var(--text-secondary)` }}>
                <Users size={40} color="var(--border-color)" style={{ marginBottom: 12 }} />
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
          updateMember={updateM}
        />
      )}

      {/* RECOVER ACCOUNT MODAL */}
      {showRepair && (
        <div className="overlay-modal" onClick={() => !repairing && setShowRepair(false)}>
          <div className="modal-box lxf" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 className="lxfh" style={{ fontSize: 22, marginBottom: 4 }}>Recover Staff Account</h3>
                <p className="lxf" style={{ color: `var(--text-secondary)`, fontSize: 13 }}>Re-links a Firebase Auth account that's missing from the staff register. Use this for accounts created before the system update.</p>
              </div>
              <button onClick={() => setShowRepair(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: `var(--text-secondary)`, flexShrink: 0 }}><X size={20} /></button>
            </div>

            {repairResult ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                {repairResult.success ? (
                  <>
                    <div style={{ width: 56, height: 56, borderRadius: 16, background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                      <Check size={24} color="#16A34A" />
                    </div>
                    <div className="lxfh" style={{ fontSize: 18, marginBottom: 8 }}>Account Recovered</div>
                    <p className="lxf" style={{ color: `var(--text-secondary)`, fontSize: 13, marginBottom: 20 }}>
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
                    <label className="lxf" style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Email Address *</label>
                    <input className="p-inp" type="email" value={repairForm.email} onChange={e => setRepairForm(f => ({ ...f, email: e.target.value }))} placeholder="existing@email.com" style={{ width: '100%', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label className="lxf" style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Full Name (if missing)</label>
                    <input className="p-inp" value={repairForm.name} onChange={e => setRepairForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Kofi Mensah" style={{ width: '100%', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label className="lxf" style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Role</label>
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
                    <p className="lxf" style={{ color: `var(--text-secondary)`, fontSize: 13 }}>Staff can log in and manage their assigned clients.</p>
                  </div>
                  <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: `var(--text-secondary)` }}><X size={20} /></button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label className="lxf" style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Full Name *</label>
                    <input className="p-inp" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Kofi Mensah" style={{ width: '100%', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label className="lxf" style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Username *</label>
                    <input className="p-inp" type="text" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="e.g. johnsmith" style={{ width: '100%', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label className="lxf" style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Role</label>
                    <select className="p-inp" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }}>
                      {STAFF_ROLES.map(r => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleCreate}
                  disabled={creating || !form.name.trim() || !form.username.trim()}
                  className="p-btn-dark lxf"
                  style={{ width: '100%', marginTop: 24, padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: (creating || !form.name.trim() || !form.username.trim()) ? 0.6 : 1 }}
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
                  <p className="lxf" style={{ color: `var(--text-secondary)`, fontSize: 13 }}>Share these credentials with <strong>{created.name}</strong>. They must change their password on first login.</p>
                </div>
                <div style={{ background: `var(--bg-secondary)`, borderRadius: 14, padding: 20, marginBottom: 20 }}>
                  {[
                    { label: 'Name', value: created.name },
                    { label: 'Username', value: created.username },
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid var(--border-color)' }}>
                      <span className="lxf" style={{ fontSize: 12, color: `var(--text-secondary)`, fontWeight: 700 }}>{row.label}</span>
                      <span className="lxf" style={{ fontSize: 13, fontWeight: 700, color: `var(--accent-secondary)` }}>{row.value}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="lxf" style={{ fontSize: 12, color: `var(--text-secondary)`, fontWeight: 700 }}>Temp Password</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span className="lxf" style={{ fontSize: 13, fontWeight: 800, color: `var(--accent-secondary)`, fontFamily: 'monospace', letterSpacing: 1 }}>
                        {showPw ? created.password : '●'.repeat(created.password.length)}
                      </span>
                      <button onClick={() => setShowPw(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: `var(--text-secondary)`, padding: 0 }}>
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

      {/* ── Password Reset Modal ── */}
      {pwPanel && (
        <StaffPasswordModal
          member={team.find(m => m.id === pwPanel)}
          ac={ac}
          onClose={() => setPwPanel(null)}
          handleSetPassword={handleSetPassword}
          notify={notify}
          pwVisible={pwVisible}
          setPwVisible={setPwVisible}
          newPwInputs={newPwInputs}
          setNewPwInputs={setNewPwInputs}
          pwSaving={pwSaving}
        />
      )}
    </div>
  );
}
function StaffPasswordModal({ member, ac, onClose, handleSetPassword, notify, pwVisible, setPwVisible, newPwInputs, setNewPwInputs, pwSaving }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 400, boxShadow: '0 32px 80px rgba(0,0,0,.2)', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Manage Password</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="var(--text-secondary)" /></button>
        </div>
        
        {member.tempPassword ? (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', marginBottom: 8 }}>Current Password</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <code style={{
                flex: 1, padding: '10px 14px', borderRadius: 12,
                background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                fontSize: 14, fontFamily: 'monospace', letterSpacing: 1,
                filter: pwVisible[member.id] ? 'none' : 'blur(5px)',
                userSelect: pwVisible[member.id] ? 'text' : 'none',
                transition: 'filter .2s'
              }}>{member.tempPassword}</code>
              <button onClick={() => setPwVisible(s => ({ ...s, [member.id]: !s[member.id] }))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}>
                {pwVisible[member.id] ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              <button onClick={() => { navigator.clipboard.writeText(member.tempPassword); notify?.('success', 'Password copied!'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }} title="Copy">
                <Copy size={18} />
              </button>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: `var(--text-secondary)`, marginBottom: 20, fontStyle: 'italic', padding: 12, background: 'var(--bg-secondary)', borderRadius: 8 }}>No stored password — use the field below to set one.</div>
        )}

        <div style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', marginBottom: 8 }}>Set New Password</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="Min. 6 characters"
            value={newPwInputs[member.id] || ''}
            onChange={e => setNewPwInputs(s => ({ ...s, [member.id]: e.target.value }))}
            style={{
              flex: 1, height: 44, padding: '0 14px', borderRadius: 12,
              border: '2px solid var(--border-color)', fontSize: 14,
              fontFamily: 'monospace', outline: 'none'
            }}
          />
          <button
            onClick={() => handleSetPassword(member, newPwInputs[member.id] || '')}
            disabled={pwSaving[member.id] || (newPwInputs[member.id] || '').length < 6}
            style={{
              height: 44, padding: '0 20px', borderRadius: 12, border: 'none',
              background: (newPwInputs[member.id] || '').length >= 6 ? ac : `var(--border-color)`,
              color: (newPwInputs[member.id] || '').length >= 6 ? `var(--accent-secondary)` : `var(--text-secondary)`,
              fontSize: 13, fontWeight: 800, cursor: 'pointer'
            }}
          >
            {pwSaving[member.id] ? 'Saving…' : 'Set'}
          </button>
        </div>
      </div>
    </div>
  );
}
