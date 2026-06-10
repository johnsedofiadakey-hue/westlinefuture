import React, { useState } from 'react';
import { Plus, Trash2, ShieldCheck, Award, HardHat, Heart, UserPlus, Eye, EyeOff, Copy, Check, X, Users, UserCog, Search, KeyRound, MessageCircle, AlertTriangle, Loader2 } from 'lucide-react';
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

const STAFF_ROLES = ['Project Manager', 'Site Supervisor', 'Technical Team Lead', 'Field Installer', 'Finance Officer', 'Procurement Lead', 'Admin Assistant', 'Senior Technician', 'Technician', 'Field Worker'];

const ROLE_PROFILES = {
  'Project Manager': {
    description: 'Owns client communication, approvals, stage movement, timelines, and delivery health.',
    accessScope: 'Assigned projects and assigned clients',
    modules: ['Client Hubs', 'Projects', 'Approvals', 'Timeline', 'Messages', 'Documents'],
    onboarding: ['Assign active projects', 'Confirm escalation phone', 'Review stage gate policy'],
    systemRole: 'staff'
  },
  'Site Supervisor': {
    description: 'Coordinates site execution, installation readiness, worker photos, and inspection prep.',
    accessScope: 'Assigned installation projects',
    modules: ['Installations', 'Work Orders', 'Checklists', 'Photos', 'Messages'],
    onboarding: ['Assign work orders', 'Attach field crew', 'Review photo evidence rules'],
    systemRole: 'staff'
  },
  'Technical Team Lead': {
    description: 'Handles advanced technical work, measurements, quality checks, and field notes.',
    accessScope: 'Assigned projects and work orders',
    modules: ['Installations', 'Work Orders', 'Technical Notes', 'Photos'],
    onboarding: ['Assign certifications', 'Assign supervisor', 'Review checklist standards'],
    systemRole: 'worker'
  },
  'Field Installer': {
    description: 'Completes field tasks, uploads progress evidence, and updates assigned work orders.',
    accessScope: 'Assigned work orders only',
    modules: ['Work Orders', 'Checklists', 'Photo Uploads'],
    onboarding: ['Assign supervisor', 'Confirm site safety badge', 'Review mobile upload flow'],
    systemRole: 'worker'
  },
  'Senior Technician': {
    description: 'Handles advanced technical work, measurements, quality checks, and field notes.',
    accessScope: 'Assigned projects and work orders',
    modules: ['Installations', 'Work Orders', 'Technical Notes', 'Photos'],
    onboarding: ['Assign certifications', 'Assign supervisor', 'Review checklist standards'],
    systemRole: 'worker'
  },
  Technician: {
    description: 'Completes field tasks, uploads progress evidence, and updates assigned work orders.',
    accessScope: 'Assigned work orders only',
    modules: ['Work Orders', 'Checklists', 'Photo Uploads'],
    onboarding: ['Assign supervisor', 'Confirm site safety badge', 'Review mobile upload flow'],
    systemRole: 'worker'
  },
  'Field Worker': {
    description: 'Limited installer account for task input, field photos, notes, and completion status.',
    accessScope: 'Assigned tasks and assigned projects only',
    modules: ['Assigned Tasks', 'Installation Notes', 'Photo Uploads'],
    onboarding: ['Assign first work order', 'Confirm phone number', 'Explain restricted permissions'],
    systemRole: 'worker'
  },
  'Finance Officer': {
    description: 'Manages invoices, receipts, quotes, payment status, and finance exports.',
    accessScope: 'Financial records and client billing context',
    modules: ['Financials', 'Invoices', 'Receipts', 'Quotes', 'Reports'],
    onboarding: ['Review invoice numbering', 'Confirm bank/payment settings', 'Test receipt creation'],
    systemRole: 'staff'
  },
  'Procurement Lead': {
    description: 'Tracks supplier orders, procurement status, logistics milestones, and delivery blockers.',
    accessScope: 'Procurement and logistics records',
    modules: ['Procurement', 'Logistics', 'Supplier Notes', 'Documents'],
    onboarding: ['Assign supplier list', 'Review delivery statuses', 'Confirm escalation process'],
    systemRole: 'staff'
  },
  'Admin Assistant': {
    description: 'Supports intake, document uploads, client records, and internal admin coordination.',
    accessScope: 'CRM and assigned admin tasks',
    modules: ['Clients', 'Documents', 'Messages', 'Activity Logs'],
    onboarding: ['Review intake checklist', 'Assign manager', 'Confirm client data rules'],
    systemRole: 'staff'
  }
};

function genPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ─── Assign Clients Modal ─────────────────────────────────────────────────────
function AssignClientsModal({ member, clients, onClose, updateMember, notify }) {
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
      notify?.('error', e.message || 'Failed to save client assignments');
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
  const [directoryTab, setDirectoryTab] = useState('managers'); // 'managers' or 'technical'
  const defaultCountry = COUNTRIES.find(c => c.code === '+233') || COUNTRIES[0];
  const [form, setForm] = useState({
    name: '',
    username: '',
    role: 'Project Manager',
    countryCode: defaultCountry.code,
    phone: '',
    department: 'Operations',
    accessScope: 'assigned',
    notes: ''
  });
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
  const [pwPanel, setPwPanel]       = useState(null);
  const [pwVisible, setPwVisible]   = useState({});
  const [newPwInputs, setNewPwInputs] = useState({});
  const [pwSaving, setPwSaving]     = useState({});

  // Delete / deactivate confirmation modal
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Bulk Import ───────────────────────────────────────────────────────────
  const [showBulkImport, setShowBulkImport]   = useState(false);
  const [bulkRows, setBulkRows]               = useState([]);   // { name, email, username, role, password, status, error }
  const [bulkRunning, setBulkRunning]         = useState(false);
  const [bulkDone, setBulkDone]               = useState(false);
  const [bulkCredsCopied, setBulkCredsCopied] = useState(false);

  const parseBulkEmails = (raw) => {
    return raw
      .split(/[\n,]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e.includes('@'))
      .map(email => {
        const local    = email.split('@')[0];
        const name     = local.charAt(0).toUpperCase() + local.slice(1);
        const username = local.replace(/[^a-z0-9]/g, '');
        return { name, email, username, role: 'Technician', password: genPassword(), status: 'pending', error: null };
      });
  };

  const openBulkImport = () => {
    const preset = [
      'andy@westlinedecor.com',
      'summer@westlinedecor.com',
      'amy@westlinedecor.com',
      'nancy@westlinedecor.com',
      'hannah@westlinedecor.com',
      'daniel@westlinedecor.com',
      'info@westlinedecor.com',
      'Anna@westlinedecor.com',
      'Richard@westlinedecor.com',
      'Lucas@westlinedecor.com',
    ].join('\n');
    setBulkRows(parseBulkEmails(preset));
    setBulkRunning(false);
    setBulkDone(false);
    setBulkCredsCopied(false);
    setShowBulkImport(true);
  };

  const runBulkImport = async () => {
    if (!createStaffAccount) { notify?.('error', 'createStaffAccount not available'); return; }
    setBulkRunning(true);
    const updated = [...bulkRows];
    for (let i = 0; i < updated.length; i++) {
      const row = updated[i];
      if (row.status === 'success') continue;
      setBulkRows(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'creating' } : r));
      try {
        const roleProfile = ROLE_PROFILES[row.role] || ROLE_PROFILES.Technician;
        await createStaffAccount({
          name:               row.name,
          email:              row.email,
          username:           row.username,
          role:               row.role,
          password:           row.password,
          phone:              '',
          department:         'Operations',
          accessScope:        'assigned',
          notes:              '',
          systemRole:         roleProfile.systemRole,
          accessModules:      roleProfile.modules,
          onboardingChecklist: roleProfile.onboarding.map(item => ({ item, done: false })),
          requiresPasswordReset: true,
        });
        updated[i] = { ...row, status: 'success' };
        setBulkRows([...updated]);
      } catch (e) {
        const msg = e?.message || 'Failed';
        updated[i] = { ...row, status: 'error', error: msg.includes('already exists') ? 'Email already in use' : msg };
        setBulkRows([...updated]);
      }
    }
    setBulkRunning(false);
    setBulkDone(true);
  };

  const copyBulkCredentials = () => {
    const lines = bulkRows
      .filter(r => r.status === 'success')
      .map(r => `Name: ${r.name} | Email: ${r.email} | Password: ${r.password} | Role: ${r.role}`)
      .join('\n');
    navigator.clipboard.writeText(`Staff Credentials — Westline Future\n\n${lines}\n\nLogin: ${window.location.origin}/login`);
    setBulkCredsCopied(true);
    setTimeout(() => setBulkCredsCopied(false), 3000);
  };

  const updateM = (id, fields) => {
    if (props.updateMember) props.updateMember(id, fields);
    else if (props.onUpdateMember) props.onUpdateMember(id, fields);
  };

  // Opens the modal — no window.confirm (blocked by ad blockers → ERR_BLOCKED_BY_CLIENT)
  const deleteM = (member) => {
    if (!member?.id) return;
    setDeleteConfirm(member);
  };

  const handleDeactivate = async () => {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    try {
      await updateM(deleteConfirm.id, {
        status: 'Inactive',
        deactivatedAt: new Date().toISOString(),
        deactivationReason: 'Deactivated from Staff Governance',
      });
      notify?.('success', `${deleteConfirm.name || 'Staff member'} deactivated`);
      setDeleteConfirm(null);
    } catch (e) {
      notify?.('error', e.message || 'Failed to deactivate account');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    try {
      if (props.deleteMember) {
        await props.deleteMember(deleteConfirm.id);
      } else {
        // Fallback: just deactivate if deleteMember isn't wired
        await updateM(deleteConfirm.id, { status: 'Inactive', deactivatedAt: new Date().toISOString() });
        notify?.('success', `${deleteConfirm.name || 'Staff member'} deactivated`);
      }
      setDeleteConfirm(null);
    } catch (e) {
      notify?.('error', e.message || 'Failed to delete account');
    } finally {
      setDeleteLoading(false);
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
    const roleProfile = ROLE_PROFILES[form.role] || ROLE_PROFILES.Technician;
    const phoneDigits = String(form.phone || '').replace(/\D/g, '');
    const normalizedPhone = phoneDigits ? `${form.countryCode}${phoneDigits}` : '';
    try {
      await createStaffAccount?.({
        ...form,
        username: cleanUsername,
        phone: normalizedPhone,
        password: tempPw,
        systemRole: roleProfile.systemRole,
        accessModules: roleProfile.modules,
        onboardingChecklist: roleProfile.onboarding.map(item => ({ item, done: false })),
        requiresPasswordReset: true,
        accessScope: form.accessScope
      });
      setCreated({ name: form.name, username: cleanUsername, password: tempPw, role: form.role, modules: roleProfile.modules, phone: normalizedPhone });
      setForm({ name: '', username: '', role: 'Project Manager', countryCode: defaultCountry.code, phone: '', department: 'Operations', accessScope: 'assigned', notes: '' });
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
    try {
      // Use setStaffPassword cloud function — updates Firebase Auth via Admin SDK.
      // Password is never stored in Firestore.
      const fn = httpsCallable(functions, 'setStaffPassword');
      await fn({ uid: m.id, newPassword: newPw.trim() });

      notify?.('success', `Password updated for ${m.name}`);
      setNewPwInputs(s => ({ ...s, [m.id]: '' }));
      setPwPanel(null);
    } catch (e) {
        notify?.('error', e.message || 'Failed to update password');
    } finally {
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
            onClick={() => { setShowRepair(true); setRepairResult(null); setRepairForm({ email: '', name: '', role: 'Field Installer' }); }}
            style={{ padding: '10px 16px', fontSize: 13, gap: 8, display: 'flex', alignItems: 'center', borderRadius: 12, border: '1.5px solid var(--border-color)', background: `var(--bg-secondary)`, cursor: 'pointer', fontWeight: 700, color: `var(--text-secondary)`, fontFamily: 'inherit' }}
          >
            <Search size={14} /> Recover Account
          </button>
          <button onClick={() => { setForm(f => ({ ...f, role: 'Field Installer', department: 'Installations' })); setShowModal(true); setCreated(null); }} style={{ padding: '10px 20px', fontSize: 13, gap: 8, display: 'flex', alignItems: 'center', borderRadius: 12, border: '1px solid var(--border-color)', background: '#fff', cursor: 'pointer', fontWeight: 700, color: `var(--accent-secondary)`, fontFamily: 'inherit' }}>
            <HardHat size={16} /> Add Technical Team
          </button>
          <button onClick={openBulkImport} style={{ padding: '10px 18px', fontSize: 13, gap: 8, display: 'flex', alignItems: 'center', borderRadius: 12, border: '1.5px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: 'pointer', fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'inherit' }}>
            <Users size={15} /> Bulk Import
          </button>
          <button onClick={() => { setForm(f => ({ ...f, role: 'Project Manager', department: 'Operations' })); setShowModal(true); setCreated(null); }} className="p-btn-dark lxf" style={{ padding: '10px 20px', fontSize: 13, gap: 8, display: 'flex', alignItems: 'center' }}>
            <UserPlus size={16} /> Create Staff Account
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[
          { label: 'Total Staff', value: team.length, color: `var(--accent-secondary)` },
          { label: 'Active', value: team.filter(m => m.status !== 'Inactive').length, color: '#16A34A' },
          { label: 'Project Managers', value: team.filter(m => (m.jobRole || m.role) === 'Project Manager').length, color: 'var(--accent-primary)' },
          { label: 'Assigned Clients', value: team.reduce((acc, m) => acc + (m.assignedClients?.length || 0), 0), color: ac },
        ].map(s => (
          <div key={s.label} className="p-card" style={{ padding: 20, textAlign: 'center' }}>
            <div className="lxfh" style={{ fontSize: 28, fontWeight: 900, color: s.color, marginBottom: 4 }}>{s.value}</div>
            <div className="lxf" style={{ fontSize: 11, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.08em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Directory Tabs */}
      <div style={{ display: 'flex', gap: 12, borderBottom: '2px solid var(--border-color)', marginBottom: -10 }}>
        <button
          onClick={() => setDirectoryTab('managers')}
          style={{ padding: '12px 24px', background: 'none', border: 'none', borderBottom: directoryTab === 'managers' ? `3px solid ${ac}` : '3px solid transparent', color: directoryTab === 'managers' ? ac : `var(--text-secondary)`, fontSize: 14, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <UserCog size={16} /> Account Managers
        </button>
        <button
          onClick={() => setDirectoryTab('technical')}
          style={{ padding: '12px 24px', background: 'none', border: 'none', borderBottom: directoryTab === 'technical' ? `3px solid ${ac}` : '3px solid transparent', color: directoryTab === 'technical' ? ac : `var(--text-secondary)`, fontSize: 14, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <HardHat size={16} /> Technical / Field Team
        </button>
      </div>

      <div className="p-card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Staff', 'Role', 'Certifications', 'Clients', 'Status', 'Actions'].map(h => <th key={h} className="t-head" style={{ padding: '16px' }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {(team || []).filter(m => {
              const systemRole = (ROLE_PROFILES[m.role || m.jobRole] || ROLE_PROFILES.Technician).systemRole;
              if (directoryTab === 'managers') return systemRole === 'staff';
              return systemRole === 'worker';
            }).map(m => (
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
                      title="Set or reset password"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 8,
                        background: pwPanel === m.id ? `${ac}15` : `var(--bg-secondary)`,
                        border: `1px solid ${pwPanel === m.id ? ac : `var(--border-color)`}`,
                        fontSize: 11, fontWeight: 700, cursor: 'pointer',
                        color: pwPanel === m.id ? ac : `var(--text-secondary)`,
                      }}
                    >
                      <KeyRound size={12} />
                      Set Password
                    </button>
                    {/* Delete */}
                    <button onClick={() => deleteM(m)} title="Deactivate staff account" style={{ background: 'none', border: 'none', cursor: 'pointer', color: `var(--text-secondary)`, padding: 6 }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {team.filter(m => {
              const systemRole = (ROLE_PROFILES[m.role || m.jobRole] || ROLE_PROFILES.Technician).systemRole;
              if (directoryTab === 'managers') return systemRole === 'staff';
              return systemRole === 'worker';
            }).length === 0 && (
              <tr><td colSpan={6} style={{ padding: 48, textAlign: 'center', color: `var(--text-secondary)` }}>
                <Users size={40} color="var(--border-color)" style={{ marginBottom: 12 }} />
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>No {directoryTab === 'managers' ? 'account managers' : 'technical team members'} found</div>
                <div style={{ fontSize: 12 }}>Create an account to get started.</div>
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
          notify={notify}
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

      {/* ── BULK IMPORT MODAL ────────────────────────────────────────────────── */}
      {showBulkImport && (
        <div className="overlay-modal" onClick={() => !bulkRunning && setShowBulkImport(false)} style={{ zIndex: 9999, alignItems: 'flex-start', paddingTop: 32 }}>
          <div className="modal-box lxf" style={{ maxWidth: 860, width: '100%', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexShrink: 0 }}>
              <div>
                <h3 className="lxfh" style={{ fontSize: 22, marginBottom: 4 }}>Bulk Import Staff</h3>
                <p className="lxf" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {bulkDone
                    ? `${bulkRows.filter(r => r.status === 'success').length} of ${bulkRows.length} accounts created successfully`
                    : 'Set the right role for each person — roles control where they log in and what they can see.'}
                </p>
              </div>
              {!bulkRunning && (
                <button onClick={() => setShowBulkImport(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', flexShrink: 0 }}>
                  <X size={20} />
                </button>
              )}
            </div>

            {/* Role access guide — only shown before running */}
            {!bulkDone && !bulkRunning && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16, flexShrink: 0 }}>
                <div style={{ padding: '11px 14px', borderRadius: 10, background: '#EFF6FF', border: '1.5px solid #BFDBFE' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#1E40AF', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>🏢 Office / Management Portal</div>
                  <div style={{ fontSize: 12, color: '#1D4ED8', lineHeight: 1.6 }}>
                    <strong>Project Manager · Finance Officer · Procurement Lead · Site Supervisor · Admin Assistant</strong><br />
                    → Log in to the <em>Admin Portal</em>. Can manage assigned clients, projects, invoices and messages.
                  </div>
                </div>
                <div style={{ padding: '11px 14px', borderRadius: 10, background: '#F0FDF4', border: '1.5px solid #BBF7D0' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>🔧 Field / Worker Portal</div>
                  <div style={{ fontSize: 12, color: '#15803D', lineHeight: 1.6 }}>
                    <strong>Technician · Senior Technician · Field Installer · Technical Team Lead · Field Worker</strong><br />
                    → Log in to the <em>Worker Portal</em>. Can only see their assigned jobs, tasks, and work orders.
                  </div>
                </div>
              </div>
            )}

            {/* Table */}
            <div style={{ flex: 1, overflowY: 'auto', borderRadius: 12, border: '1.5px solid var(--border-color)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1.5px solid var(--border-color)', position: 'sticky', top: 0 }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-secondary)' }}>Name</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-secondary)' }}>Login Email</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-secondary)' }}>Role</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-secondary)' }}>Access</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-secondary)' }}>Temp Password</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-secondary)' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkRows.map((row, i) => {
                    const roleProfile = ROLE_PROFILES[row.role] || ROLE_PROFILES.Technician;
                    const isWorkerRole = roleProfile.systemRole === 'worker';
                    return (
                      <tr key={row.email} style={{ borderBottom: '1px solid var(--border-color)', background: row.status === 'success' ? '#F0FDF4' : row.status === 'error' ? '#FFF8F0' : 'transparent' }}>
                        {/* Name — editable */}
                        <td style={{ padding: '8px 14px' }}>
                          <input
                            value={row.name}
                            disabled={bulkRunning || bulkDone}
                            onChange={e => setBulkRows(prev => prev.map((r, idx) => idx === i ? { ...r, name: e.target.value } : r))}
                            style={{ border: '1px solid var(--border-color)', borderRadius: 8, padding: '5px 9px', fontSize: 13, fontWeight: 700, width: 88, background: 'transparent', fontFamily: 'inherit' }}
                          />
                        </td>
                        {/* Email — shown as-is, this is the login email */}
                        <td style={{ padding: '8px 14px', color: 'var(--text-secondary)', fontSize: 12 }}>{row.email}</td>
                        {/* Role dropdown */}
                        <td style={{ padding: '8px 14px' }}>
                          <select
                            value={row.role}
                            disabled={bulkRunning || bulkDone}
                            onChange={e => setBulkRows(prev => prev.map((r, idx) => idx === i ? { ...r, role: e.target.value } : r))}
                            style={{ border: '1px solid var(--border-color)', borderRadius: 8, padding: '5px 9px', fontSize: 12, fontWeight: 700, background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', minWidth: 160 }}
                          >
                            <optgroup label="— Office / Management">
                              {['Project Manager','Site Supervisor','Finance Officer','Procurement Lead','Admin Assistant'].map(r => <option key={r} value={r}>{r}</option>)}
                            </optgroup>
                            <optgroup label="— Field / Technical">
                              {['Technical Team Lead','Senior Technician','Technician','Field Installer','Field Worker'].map(r => <option key={r} value={r}>{r}</option>)}
                            </optgroup>
                          </select>
                        </td>
                        {/* Access level badge */}
                        <td style={{ padding: '8px 14px' }}>
                          <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: isWorkerRole ? '#F0FDF4' : '#EFF6FF', color: isWorkerRole ? '#16A34A' : '#1D4ED8' }}>
                            {isWorkerRole ? '🔧 Worker Portal' : '🏢 Admin Portal'}
                          </span>
                        </td>
                        {/* Password */}
                        <td style={{ padding: '8px 14px' }}>
                          <code style={{ fontSize: 11, background: 'var(--bg-secondary)', padding: '3px 7px', borderRadius: 6, letterSpacing: '.04em' }}>
                            {row.password}
                          </code>
                        </td>
                        {/* Status */}
                        <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                          {row.status === 'pending'  && <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700 }}>—</span>}
                          {row.status === 'creating' && <Loader2 size={15} style={{ animation: 'spin 1s linear infinite', color: ac }} />}
                          {row.status === 'success'  && <span style={{ fontSize: 11, color: '#16A34A', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><Check size={13} /> Created</span>}
                          {row.status === 'error'    && <span style={{ fontSize: 11, color: '#DC2626', fontWeight: 700 }} title={row.error}>✗ {row.error?.includes('already') ? 'Already exists' : 'Failed'}</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div style={{ flexShrink: 0, paddingTop: 16, display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
              {!bulkDone && !bulkRunning && (
                <p className="lxf" style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>
                  Staff log in with their email and the temp password shown. You can change roles any time after.
                </p>
              )}
              {bulkDone && (
                <button
                  onClick={copyBulkCredentials}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 12, border: '1.5px solid var(--border-color)', background: 'var(--bg-secondary)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  {bulkCredsCopied ? <><Check size={14} color="#16A34A" /> Copied!</> : <><Copy size={14} /> Copy All Credentials</>}
                </button>
              )}
              {!bulkDone && (
                <button
                  onClick={runBulkImport}
                  disabled={bulkRunning || bulkRows.length === 0}
                  className="p-btn-dark lxf"
                  style={{ padding: '11px 28px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 8, opacity: bulkRunning ? 0.7 : 1 }}
                >
                  {bulkRunning
                    ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Creating accounts…</>
                    : <><UserPlus size={15} /> Create {bulkRows.length} Accounts</>}
                </button>
              )}
              {bulkDone && (
                <button onClick={() => setShowBulkImport(false)} className="p-btn-dark lxf" style={{ padding: '11px 28px', fontSize: 13 }}>
                  Done
                </button>
              )}
            </div>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* DELETE / DEACTIVATE CONFIRMATION MODAL */}
      {deleteConfirm && (
        <div
          className="overlay-modal"
          onClick={() => !deleteLoading && setDeleteConfirm(null)}
          style={{ zIndex: 9999 }}
        >
          <div
            className="modal-box lxf"
            style={{ maxWidth: 420 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Icon */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={26} color="#DC2626" />
              </div>
            </div>

            <h3 className="lxfh" style={{ fontSize: 20, textAlign: 'center', marginBottom: 8 }}>
              Remove Staff Member?
            </h3>
            <p className="lxf" style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 24, lineHeight: 1.6 }}>
              You're about to remove <strong>{deleteConfirm.name || 'this staff member'}</strong>.
              Choose how to remove the account:
            </p>

            {/* Option cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {/* Deactivate */}
              <div style={{ padding: '14px 16px', borderRadius: 12, background: '#FFFBEB', border: '1.5px solid #FDE68A' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#92400E', marginBottom: 3 }}>Deactivate Account</div>
                <div style={{ fontSize: 12, color: '#B45309', lineHeight: 1.5 }}>
                  Account is marked inactive. Login is blocked. All history, assignments, and data are kept. Can be re-activated later.
                </div>
                <button
                  onClick={handleDeactivate}
                  disabled={deleteLoading}
                  style={{ marginTop: 12, padding: '9px 18px', borderRadius: 9, border: 'none', background: '#92400E', color: '#fff', fontSize: 12, fontWeight: 800, cursor: deleteLoading ? 'default' : 'pointer', opacity: deleteLoading ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  {deleteLoading ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Working…</> : 'Deactivate Only'}
                </button>
              </div>

              {/* Permanent delete */}
              <div style={{ padding: '14px 16px', borderRadius: 12, background: '#FEF2F2', border: '1.5px solid #FECACA' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#991B1B', marginBottom: 3 }}>Permanently Delete</div>
                <div style={{ fontSize: 12, color: '#B91C1C', lineHeight: 1.5 }}>
                  Removes the account from the staff register and Firebase Auth. Login is permanently revoked. <strong>This cannot be undone.</strong>
                </div>
                <button
                  onClick={handlePermanentDelete}
                  disabled={deleteLoading}
                  style={{ marginTop: 12, padding: '9px 18px', borderRadius: 9, border: 'none', background: '#DC2626', color: '#fff', fontSize: 12, fontWeight: 800, cursor: deleteLoading ? 'default' : 'pointer', opacity: deleteLoading ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  {deleteLoading ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Working…</> : <><Trash2 size={12} /> Delete Permanently</>}
                </button>
              </div>
            </div>

            <button
              onClick={() => setDeleteConfirm(null)}
              disabled={deleteLoading}
              style={{ width: '100%', padding: '12px 0', borderRadius: 12, border: '1.5px solid var(--border-color)', background: 'var(--bg-secondary)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label className="lxf" style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Role</label>
                      <select className="p-inp" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }}>
                        {STAFF_ROLES.map(r => <option key={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="lxf" style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Department</label>
                      <select className="p-inp" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }}>
                        {['Operations', 'Finance', 'Procurement', 'Installations', 'Admin'].map(d => <option key={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="lxf" style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Phone</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 8 }}>
                      <select className="p-inp" value={form.countryCode} onChange={e => setForm(f => ({ ...f, countryCode: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }}>
                        {COUNTRIES.map(c => <option key={`${c.code}-${c.name}`} value={c.code}>{c.flag} {c.code}</option>)}
                      </select>
                      <input className="p-inp" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="24 000 0000" style={{ width: '100%', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                  <div>
                    <label className="lxf" style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Access Scope</label>
                    <select className="p-inp" value={form.accessScope} onChange={e => setForm(f => ({ ...f, accessScope: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }}>
                      <option value="assigned">Assigned projects and clients only</option>
                      <option value="department">Department workspace</option>
                      <option value="finance">Finance workspace</option>
                      <option value="operations">Operations workspace</option>
                    </select>
                  </div>
                  {(() => {
                    const profile = ROLE_PROFILES[form.role] || ROLE_PROFILES.Technician;
                    return (
                      <div style={{ padding: 16, background: `var(--bg-secondary)`, borderRadius: 14, border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: 11, fontWeight: 900, color: `var(--accent-secondary)`, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Permission Preview</div>
                        <div style={{ fontSize: 13, color: `var(--text-secondary)`, lineHeight: 1.5, marginBottom: 12 }}>{profile.description}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {profile.modules.map(module => (
                            <span key={module} style={{ padding: '5px 9px', borderRadius: 999, background: '#fff', border: '1px solid var(--border-color)', color: `var(--accent-secondary)`, fontSize: 10, fontWeight: 800 }}>{module}</span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                  <div>
                    <label className="lxf" style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Internal Notes</label>
                    <textarea className="p-inp" rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Onboarding notes, supervisor, branch, or access constraints..." style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }} />
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
                    { label: 'Role', value: created.role },
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
                <div style={{ background: '#F8FAFC', border: '1px solid var(--border-color)', borderRadius: 14, padding: 16, marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 900, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>Initial Access Modules</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(created.modules || []).map(module => (
                      <span key={module} style={{ padding: '5px 9px', borderRadius: 999, background: '#fff', border: '1px solid var(--border-color)', fontSize: 10, fontWeight: 800, color: `var(--accent-secondary)` }}>{module}</span>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={copyCredentials} className="p-btn-gold lxf" style={{ flex: 1, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      {copied ? <><Check size={15} /> Copied!</> : <><Copy size={15} /> Copy Credentials</>}
                    </button>
                    <button
                      onClick={() => {
                        const msg = encodeURIComponent(
                          `*Westline Future — Staff Portal Access*\n\nName: ${created.name}\nUsername: ${created.username}\nTemp Password: ${created.password}\nLogin: ${window.location.origin}/login\n\n_Change your password after first login._`
                        );
                        const phone = (created.phone || '').replace(/\D/g, '');
                        window.open(phone ? `https://wa.me/${phone}?text=${msg}` : `https://wa.me/?text=${msg}`, '_blank');
                      }}
                      style={{
                        flex: 1, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        borderRadius: 12, border: 'none', background: '#25D366', color: '#fff',
                        fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      <MessageCircle size={15} /> Send via WhatsApp
                    </button>
                  </div>
                  <button onClick={() => { setCreated(null); setShowModal(false); }} className="p-btn-dark lxf" style={{ width: '100%', padding: 12 }}>Done</button>
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
  const [showPw, setShowPw] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedPw, setSavedPw] = useState('');
  const [waCopied, setWaCopied] = useState(false);

  const currentPw = newPwInputs[member?.id] || '';
  const pwReady = currentPw.length >= 6;

  const doGenerate = () => {
    const pw = genPassword();
    setNewPwInputs(s => ({ ...s, [member.id]: pw }));
    setShowPw(true); // reveal so admin can see + share
    setSaved(false);
  };

  const doSet = async () => {
    if (!pwReady || pwSaving[member?.id]) return;
    // Capture before the parent clears it
    const pwToSave = currentPw;
    await handleSetPassword(member, pwToSave);
    // Show the share row
    setSavedPw(pwToSave);
    setSaved(true);
  };

  const shareViaWhatsApp = () => {
    const msg = encodeURIComponent(
      `*Westline Future — Staff Portal Access*\n\nName: ${member.name}\nUsername: ${member.username || member.email || '—'}\nNew Password: ${savedPw}\nLogin: ${window.location.origin}/login`
    );
    const phone = (member.phone || '').replace(/\D/g, '');
    window.open(phone ? `https://wa.me/${phone}?text=${msg}` : `https://wa.me/?text=${msg}`, '_blank');
  };

  const copySavedPw = () => {
    navigator.clipboard.writeText(savedPw);
    setWaCopied(true);
    setTimeout(() => setWaCopied(false), 2000);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 420, boxShadow: '0 32px 80px rgba(0,0,0,.2)', padding: 24 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-secondary)' }}>Set Password</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{member?.name}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="var(--text-secondary)" /></button>
        </div>

        {/* Security note */}
        <div style={{ marginBottom: 20, padding: '12px 14px', borderRadius: 12, background: '#F0FDF4', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ fontSize: 18, flexShrink: 0 }}>🔒</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#15803D', marginBottom: 2 }}>Never stored in database</div>
            <div style={{ fontSize: 11, color: '#166534', lineHeight: 1.5 }}>
              Set a password below, then share it with the staff member in person or via WhatsApp. Firebase Auth holds the credential — not Firestore.
            </div>
          </div>
        </div>

        {/* Password input row */}
        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>New Password</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="Min. 6 characters"
              value={currentPw}
              onChange={e => { setNewPwInputs(s => ({ ...s, [member.id]: e.target.value })); setSaved(false); }}
              style={{
                width: '100%', height: 44, padding: '0 40px 0 14px', borderRadius: 12,
                border: '2px solid var(--border-color)', fontSize: 14,
                fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box',
              }}
            />
            <button
              onClick={() => setShowPw(p => !p)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-secondary)' }}
            >
              {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {/* Generate */}
          <button
            onClick={doGenerate}
            style={{
              height: 44, padding: '0 14px', borderRadius: 12,
              border: '1.5px solid var(--border-color)', background: 'var(--bg-secondary)',
              fontSize: 12, fontWeight: 700, cursor: 'pointer', color: 'var(--accent-secondary)',
              whiteSpace: 'nowrap', fontFamily: 'inherit',
            }}
          >
            Generate
          </button>
          {/* Set */}
          <button
            onClick={doSet}
            disabled={pwSaving[member?.id] || !pwReady}
            style={{
              height: 44, padding: '0 20px', borderRadius: 12, border: 'none',
              background: pwReady ? ac : 'var(--border-color)',
              color: pwReady ? 'var(--accent-secondary)' : 'var(--text-secondary)',
              fontSize: 13, fontWeight: 800, cursor: pwReady ? 'pointer' : 'default',
              fontFamily: 'inherit',
            }}
          >
            {pwSaving[member?.id] ? 'Saving…' : 'Set'}
          </button>
        </div>

        {/* Share row — shown after successful set */}
        {saved && savedPw && (
          <div style={{ padding: 16, borderRadius: 14, background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#15803D', marginBottom: 10 }}>
              ✓ Password updated — share it now
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 800, color: 'var(--accent-secondary)', letterSpacing: 1, marginBottom: 12 }}>
              {savedPw}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={shareViaWhatsApp}
                style={{
                  flex: 1, height: 40, borderRadius: 10, border: 'none', background: '#25D366', color: '#fff',
                  fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'inherit',
                }}
              >
                <MessageCircle size={14} /> Send via WhatsApp
              </button>
              <button
                onClick={copySavedPw}
                style={{
                  flex: 1, height: 40, borderRadius: 10, border: '1.5px solid var(--border-color)', background: '#fff', color: 'var(--accent-secondary)',
                  fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'inherit',
                }}
              >
                {waCopied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy</>}
              </button>
            </div>
          </div>
        )}

        {/* Done */}
        {saved && (
          <button onClick={onClose} className="p-btn-dark lxf" style={{ width: '100%', marginTop: 12, padding: 12 }}>Done</button>
        )}
      </div>
    </div>
  );
}
