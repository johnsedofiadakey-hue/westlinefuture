import React, { useState } from 'react';
import { CheckCircle, Trash2 } from 'lucide-react';
import { FF as PFormField } from '../../components/Shared';
import { PROJECT_STAGES } from '../../data';

export default function AdminTasks({ projectId, projectTitle, tasks, createTask, deleteTask, updateTask, teamMembers, brand }) {
  const ac = brand.color || '#231F78';
  const [showAdd, setShowAdd] = useState(false);
  const [nt, setNt] = useState({ title: '', desc: '', assignedTo: '', stage: 1, dueDate: '' });
  
  const [fStage, setFStage] = useState('all');
  const [fUser, setFUser] = useState('all');
  const [fStatus, setFStatus] = useState('all');

  const projectTasks = (tasks || []).filter(t => {
    const isProj = t.parentId === projectId;
    const isStage = fStage === 'all' || String(t.stage) === fStage;
    const isUser = fUser === 'all' || t.assignedTo === fUser;
    const isStatus = fStatus === 'all' || t.status === fStatus;
    return isProj && isStage && isUser && isStatus;
  });

  const handleAdd = async () => {
    if (!nt.title || !nt.assignedTo) return alert('Title and Assignee required');
    await createTask({
      project_id: projectId,
      project_title: projectTitle,
      title: nt.title,
      description: nt.desc,
      assignedTo: nt.assignedTo,
      stage: parseInt(nt.stage),
      status: 'pending',
      dueDate: nt.dueDate
    });
    setNt({ title: '', desc: '', assignedTo: '', stage: 1, dueDate: '' });
    setShowAdd(false);
  };

  return (
    <div className="p-card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 className="lxfh" style={{ fontSize: 18 }}>Tasks</h3>
        <button onClick={() => setShowAdd(!showAdd)} className="lxf" style={{ fontSize: 13, background: 'none', border: 'none', color: ac, fontWeight: 600, cursor: 'pointer' }}>+ New Task</button>
      </div>

      {showAdd && (
        <div style={{ background: '#F4F4FA', padding: 16, borderRadius: 8, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <PFormField label="Task Title"><input className="p-inp" value={nt.title} onChange={e => setNt({...nt, title: e.target.value})} /></PFormField>
            <PFormField label="Assign To">
              <select className="p-inp" value={nt.assignedTo} onChange={e => setNt({...nt, assignedTo: e.target.value})}>
                <option value="">Select Staff</option>
                {(teamMembers || []).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </PFormField>
            <PFormField label="Stage">
              <select className="p-inp" value={nt.stage} onChange={e => setNt({...nt, stage: e.target.value})}>
                {PROJECT_STAGES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </PFormField>
            <button onClick={handleAdd} className="p-btn-dark lxf">Create Task</button>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <select className="p-inp" style={{ fontSize: 10, padding: '4px 8px' }} value={fStage} onChange={e => setFStage(e.target.value)}>
          <option value="all">All Stages</option>
          {PROJECT_STAGES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="p-inp" style={{ fontSize: 10, padding: '4px 8px' }} value={fStatus} onChange={e => setFStatus(e.target.value)}>
          <option value="all">Status</option>
          <option value="pending">Pending</option>
          <option value="completed">Done</option>
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {projectTasks.length === 0 && <div className="lxf" style={{ color: '#9B99C8', fontSize: 12, textAlign: 'center', padding: '10px 0' }}>No tasks found</div>}
        {projectTasks.map(t => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px', background: '#F4F4FA', borderRadius: 8 }}>
             <button onClick={() => updateTask(t.id, { status: t.status === 'completed' ? 'pending' : 'completed' }, projectId)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.status === 'completed' ? '#16A34A' : '#E4E3F0' }}>
                <CheckCircle size={18} />
             </button>
             <div style={{ flex: 1 }}>
                <div className="lxf" style={{ fontSize: 13, fontWeight: 500, textDecoration: t.status === 'completed' ? 'line-through' : 'none', color: t.status === 'completed' ? '#9B99C8' : '#0D0B2E' }}>{t.title}</div>
                <div className="lxf" style={{ fontSize: 10, color: '#9B99C8' }}>{teamMembers.find(m=>m.id === t.assignedTo)?.name || 'Unassigned'} • Stage {t.stage}</div>
             </div>
             <button onClick={() => deleteTask && deleteTask(t.id, projectId)} style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', opacity: 0.4 }}><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
