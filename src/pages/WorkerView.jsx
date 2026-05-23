import React, { useState } from 'react';
import { LogOut, Package, Truck, Wrench, CheckCircle, ChevronDown, ChevronUp, Camera, MessageSquare, AlertCircle } from 'lucide-react';
import { CLIENT_PROJECT_STAGES } from '../data';

const DELIVERY_STAGE = 9;
const INSTALLATION_STAGE = 10;
const COMPLETE_STAGE = 11;

function getStageName(stageId) {
  const s = CLIENT_PROJECT_STAGES.find(s => s.id === stageId);
  return s?.name || `Stage ${stageId}`;
}

function ProjectCard({ project, updateProjectStage, addProjectMessage, addProjectDocument, user }) {
  const [note, setNote] = useState('');
  const [noteLoading, setNoteLoading] = useState(false);
  const [stageLoading, setStageLoading] = useState(false);
  const [noteSent, setNoteSent] = useState(false);
  const [stageDone, setStageDone] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoSent, setPhotoSent] = useState(false);

  const isDelivery = project.stageId === DELIVERY_STAGE;
  const isInstall = project.stageId === INSTALLATION_STAGE;
  const isComplete = project.stageId >= COMPLETE_STAGE;

  const handleStageUpdate = async () => {
    if (!updateProjectStage) return;
    setStageLoading(true);
    try {
      const label = isDelivery ? 'Delivered by field team' : 'Installation complete';
      await updateProjectStage(project.id, COMPLETE_STAGE, label);
      setStageDone(true);
    } catch (e) {
      console.error(e);
    }
    setStageLoading(false);
  };

  const handleAddNote = async () => {
    if (!note.trim() || !addProjectMessage) return;
    setNoteLoading(true);
    try {
      await addProjectMessage(project.id, note.trim(), 'worker');
      setNote('');
      setNoteSent(true);
      setTimeout(() => setNoteSent(false), 3000);
    } catch (e) {
      console.error(e);
    }
    setNoteLoading(false);
  };

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !addProjectDocument) return;
    setPhotoLoading(true);
    try {
      await addProjectDocument(project.id, file, {
        uploadedBy: user?.name || user?.displayName || 'worker',
        stageId: project.stageId,
        name: 'Site photo — ' + new Date().toLocaleDateString(),
      });
      setPhotoSent(true);
      setTimeout(() => setPhotoSent(false), 3000);
    } catch (e) {
      console.error(e);
    }
    setPhotoLoading(false);
  };

  return (
    <div style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: `var(--accent-secondary)`, marginBottom: 4, lineHeight: 1.3 }}>
            {project.title || project.name || 'Untitled Project'}
          </div>
          <div style={{ fontSize: 12, color: `var(--text-secondary)` }}>{project.clientName || 'Client'}</div>
        </div>
        <div style={{
          padding: '4px 10px', borderRadius: 100,
          background: isDelivery ? '#EFF6FF' : isInstall ? '#FFF7ED' : '#F0FDF4',
          color: isDelivery ? '#1D4ED8' : isInstall ? '#D97706' : '#16A34A',
          fontSize: 10, fontWeight: 800, marginLeft: 12, whiteSpace: 'nowrap'
        }}>
          {project.type || (isDelivery ? 'Delivery' : isInstall ? 'Installation' : 'Active')}
        </div>
      </div>

      {/* Stage badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: `var(--bg-secondary)`, borderRadius: 10, marginBottom: 20 }}>
        {isDelivery && <Truck size={14} color="#1D4ED8" />}
        {isInstall && <Wrench size={14} color="#D97706" />}
        {isComplete && <CheckCircle size={14} color="#16A34A" />}
        <span style={{ fontSize: 12, fontWeight: 700, color: '#3A3430' }}>{getStageName(project.stageId)}</span>
      </div>

      {/* Stage action */}
      {(isDelivery || isInstall) && !stageDone && (
        <button
          onClick={handleStageUpdate}
          disabled={stageLoading}
          style={{
            width: '100%', padding: '14px', borderRadius: 14, marginBottom: 16,
            background: `var(--accent-secondary)`, color: '#fff', border: 'none',
            fontSize: 14, fontWeight: 700, cursor: stageLoading ? 'default' : 'pointer',
            opacity: stageLoading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
          }}
        >
          {isDelivery && <Truck size={16} />}
          {isInstall && <Wrench size={16} />}
          {stageLoading ? 'Updating...' : isDelivery ? 'Mark as Delivered' : 'Mark as Installed'}
        </button>
      )}
      {stageDone && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: '#F0FDF4', color: '#16A34A', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <CheckCircle size={16} /> Status updated successfully
        </div>
      )}

      {/* Notes */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
          Add a note
        </label>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Describe what you observed, issues encountered, etc."
          rows={3}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E0D8',
            fontSize: 13, fontFamily: 'inherit', resize: 'vertical', color: `var(--accent-secondary)`,
            background: `var(--bg-secondary)`, boxSizing: 'border-box', outline: 'none'
          }}
        />
        <button
          onClick={handleAddNote}
          disabled={noteLoading || !note.trim()}
          style={{
            marginTop: 8, padding: '10px 16px', borderRadius: 10,
            background: note.trim() ? `var(--accent-secondary)` : '#E5E0D8',
            color: note.trim() ? '#fff' : '#9A948E',
            border: 'none', fontSize: 12, fontWeight: 700,
            cursor: note.trim() && !noteLoading ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', gap: 6
          }}
        >
          <MessageSquare size={14} />
          {noteLoading ? 'Sending...' : noteSent ? 'Sent ✓' : 'Add Note'}
        </button>
      </div>

      {/* Photo upload */}
      <div>
        <label style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
          Site photo
        </label>
        <label style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '10px 16px', borderRadius: 10,
          background: photoSent ? '#F0FDF4' : `var(--bg-secondary)`,
          color: photoSent ? '#16A34A' : `var(--accent-secondary)`,
          border: `1px solid ${photoSent ? '#BBF7D0' : '#E5E0D8'}`,
          fontSize: 12, fontWeight: 700, cursor: photoLoading ? 'default' : 'pointer'
        }}>
          <Camera size={14} />
          {photoLoading ? 'Uploading...' : photoSent ? 'Photo uploaded ✓' : 'Take / Upload Photo'}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={handlePhoto}
            disabled={photoLoading}
          />
        </label>
      </div>
    </div>
  );
}

function AllProjectsAccordion({ projects, user }) {
  const [open, setOpen] = useState(false);
  if (!projects || projects.length === 0) return null;

  return (
    <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'transparent', border: 'none', cursor: 'pointer', borderBottom: open ? '1px solid var(--border-color)' : 'none'
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 700, color: `var(--accent-secondary)` }}>All Assigned Projects ({projects.length})</span>
        {open ? <ChevronUp size={18} color="var(--text-secondary)" /> : <ChevronDown size={18} color="var(--text-secondary)" />}
      </button>
      {open && (
        <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {projects.map(p => (
            <div key={p.id} style={{ padding: '12px 16px', background: `var(--bg-secondary)`, borderRadius: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: `var(--accent-secondary)` }}>{p.title || p.name || 'Untitled'}</div>
              <div style={{ fontSize: 11, color: `var(--text-secondary)`, marginTop: 4 }}>
                {p.clientName || ''} · {getStageName(p.stageId)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function WorkerView({ user, onLogout, clients, updateProjectStage, addProjectMessage, addProjectDocument, brand }) {
  const ac = brand?.color || `var(--accent-secondary)`;

  // Determine worker identifier — could be uid or email
  const workerId = user?.uid || user?.id;
  const workerEmail = user?.email;

  const isAssigned = (project) => {
    const workers = project.assignedWorkers || [];
    return workers.includes(workerId) || workers.includes(workerEmail) || workers.includes(user?.id);
  };

  const allAssigned = (clients || []).filter(isAssigned);

  const todayProjects = allAssigned.filter(
    p => p.stageId === DELIVERY_STAGE || p.stageId === INSTALLATION_STAGE
  );

  const workerName = user?.name || user?.displayName || user?.email || 'Worker';

  return (
    <div style={{ minHeight: '100vh', background: '#F8F6F3', fontFamily: "'Inter', 'Satoshi', sans-serif" }}>
      {/* Top bar */}
      <div style={{
        background: `var(--accent-secondary)`, color: '#fff',
        padding: '0 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
        height: 60, boxShadow: '0 2px 20px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: ac, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wrench size={16} color="var(--accent-secondary)" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1 }}>Field View</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{workerName}</div>
          </div>
        </div>
        <button
          onClick={onLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 10,
            background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none',
            fontSize: 12, fontWeight: 600, cursor: 'pointer'
          }}
        >
          <LogOut size={14} /> Sign out
        </button>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Today's jobs */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: `var(--text-secondary)` }}>
              Today's Jobs
            </div>
            {todayProjects.length > 0 && (
              <div style={{ background: `var(--accent-secondary)`, color: '#fff', padding: '2px 8px', borderRadius: 100, fontSize: 10, fontWeight: 800 }}>
                {todayProjects.length}
              </div>
            )}
          </div>

          {todayProjects.length === 0 ? (
            <div style={{
              background: '#fff', borderRadius: 20, padding: '40px 24px', textAlign: 'center',
              boxShadow: '0 2px 12px rgba(0,0,0,0.05)'
            }}>
              <AlertCircle size={36} color="#D97706" style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 15, fontWeight: 700, color: `var(--accent-secondary)`, marginBottom: 8 }}>
                No jobs assigned for today.
              </div>
              <div style={{ fontSize: 13, color: `var(--text-secondary)` }}>Contact your supervisor for your assignment.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {todayProjects.map(project => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  updateProjectStage={updateProjectStage}
                  addProjectMessage={addProjectMessage}
                  addProjectDocument={addProjectDocument}
                  user={user}
                />
              ))}
            </div>
          )}
        </div>

        {/* All assigned projects accordion */}
        {allAssigned.length > 0 && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: `var(--text-secondary)`, marginBottom: 16 }}>
              All Assignments
            </div>
            <AllProjectsAccordion projects={allAssigned} user={user} />
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 11, color: `var(--text-secondary)` }}>
          {brand?.name || 'WestlineFuture'} Field App
        </div>
      </div>
    </div>
  );
}
