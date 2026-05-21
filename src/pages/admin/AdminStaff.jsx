import React from 'react';
import { Plus, Trash2, ShieldCheck, Award, HardHat, Heart } from 'lucide-react';
import { PAv, PSBadge } from '../../components/Shared';

const BADGES = [
  { id: 'safety', label: 'Height Safety', icon: <HardHat size={12} />, color: '#FF9800' },
  { id: 'glazing', label: 'Glazing Pro', icon: <Award size={12} />, color: '#16A34A' },
  { id: 'machinery', label: 'Machinery', icon: <ShieldCheck size={12} />, color: '#2196F3' },
  { id: 'firstaid', label: 'First Aid', icon: <Heart size={12} />, color: '#EF4444' }
];

export default function AdminStaff({ team = [], brand, ...props }) {
  const ac = brand.color || '#231F78';
  
  const addMember = () => {
    alert('Invite new staff via Firebase Console to enable login.');
  };

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="lxfh" style={{ fontSize: 32, fontWeight: 400, color: '#0D0B2E' }}>Staff Governance</h2>
        <button onClick={addMember} className="p-btn-dark lxf" style={{ padding: '10px 20px', fontSize: 13, gap: 8, display: 'flex', alignItems: 'center' }}><Plus size={16} /> Add Staff</button>
      </div>

      <div className="p-card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Staff', 'Role', 'Certifications & Badges', 'Status', 'Actions'].map(h => <th key={h} className="t-head" style={{ padding: '16px' }}>{h}</th>)}
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
                      <div className="lxf" style={{ fontSize: 11, color: '#9B99C8' }}>{m.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '16px' }}>
                  <select className="lxf" style={{ fontSize: 13, border: 'none', background: 'none', color: '#0D0B2E', cursor: 'pointer', fontWeight: 600 }} value={m.role} onChange={e => updateM(m.id, { role: e.target.value })}>
                    {['Admin', 'Project Manager', 'Technical Lead', 'Installer', 'CAD Engineer'].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                     {BADGES.map(b => {
                       const has = (m.certs || []).includes(b.id);
                       return (
                         <div 
                           key={b.id} 
                           onClick={() => toggleBadge(m, b.id)}
                           title={b.label}
                           style={{ 
                             width: 28, height: 28, borderRadius: '50%', background: has ? b.color : 'rgba(0,0,0,.05)', 
                             color: has ? '#fff' : '#9B99C8', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                             cursor: 'pointer', transition: 'all .2s', opacity: has ? 1 : 0.4
                           }}
                         >
                            {b.icon}
                         </div>
                       );
                     })}
                  </div>
                </td>
                <td style={{ padding: '16px' }}>
                  <button onClick={() => updateM(m.id, { status: m.status === 'Active' ? 'Inactive' : 'Active' })} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    <PSBadge s={m.status} />
                  </button>
                </td>
                <td style={{ padding: '16px' }}>
                  <button onClick={() => deleteM(m.id)} style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', padding: 8 }}><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
