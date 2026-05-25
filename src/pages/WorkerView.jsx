import React, { useState, useEffect, useCallback } from 'react';
import { LogOut, Package, Truck, Wrench, CheckCircle, ChevronDown, ChevronUp, Camera, MessageSquare, AlertCircle, RefreshCw, CheckSquare, Square, MapPin } from 'lucide-react';
import { db } from '../lib/firebase';
import { updateDoc, doc, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { CLIENT_PROJECT_STAGES } from '../data';

// Map to our Phase 1 normalized 7-stage pipeline
const DELIVERY_STAGE = 5;       // Shipping & Delivery
const INSTALLATION_STAGE = 6;     // Installation
const INSPECTION_SIGN_OFF = 7;    // Inspection & Sign-off

function getStageName(stageId) {
  const s = CLIENT_PROJECT_STAGES.find(s => s.id === stageId);
  return s?.name || `Stage ${stageId}`;
}

// Haversine Distance Formula (calculates distance in meters between two points)
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

function ProjectCard({ project, updateProjectStage, addProjectMessage, addProjectDocument, user, renderingPackages = [] }) {
  const [note, setNote] = useState('');
  const [noteLoading, setNoteLoading] = useState(false);
  const [stageLoading, setStageLoading] = useState(false);
  const [noteSent, setNoteSent] = useState(false);
  const [stageDone, setStageDone] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState('');

  // Geolocation states
  const [workerCoords, setWorkerCoords] = useState(null);
  const [locating, setLocating] = useState(true);
  const [locationError, setLocationError] = useState('');
  const [distance, setDistance] = useState(null);
  const [devBypass, setDevBypass] = useState(false);

  // QA checklist states
  const [checkedItems, setCheckedItems] = useState({});
  const [isOfflineCached, setIsOfflineCached] = useState(false);

  useEffect(() => {
    const cached = localStorage.getItem('westline_offline_qa_' + project.id);
    if (cached) {
      setIsOfflineCached(true);
      setStageDone(true);
      try {
        const parsed = JSON.parse(cached);
        setCheckedItems(parsed.qaReport?.checkedItems || {});
      } catch (err) {
        console.error(err);
      }
    } else {
      setIsOfflineCached(false);
      setStageDone(false);
    }
  }, [project.id]);

  const isDelivery = project.stageId === DELIVERY_STAGE;
  const isInstall = project.stageId === INSTALLATION_STAGE;
  const isComplete = project.stageId >= INSPECTION_SIGN_OFF;

  const projectRenderings = renderingPackages.filter(r => r.projectId === project.id && (r.status === 'Approved' || r.status === 'Unlocked'));

  // Dynamic Checklist based on project category.
  // Falls back to title keyword scan for legacy projects that predate the cat field.
  const _catField  = project.cat || project.workCategory || '';
  const _titleFall = project.title || project.project || '';
  const projCat    = (_catField ? _catField : _titleFall).toLowerCase();
  
  const baseDeliveryChecklist = [
    { key: 'pkg_intact', label: 'Cargo inspected and crate packaging intact' },
  ];
  
  const baseInstallChecklist = [
    { key: 'cleanup_done', label: 'Site cleaned and protective films fully removed' },
    { key: 'supervisor_sign', label: 'Handover checklist verified with site supervisor' }
  ];

  let deliveryChecklist = [...baseDeliveryChecklist];
  let installChecklist = [];

  if (projCat.includes('glass') || projCat.includes('shower') || projCat.includes('partition') || projCat.includes('balustrade')) {
    deliveryChecklist.push(
      { key: 'glass_qty', label: 'All tempered glass profiles accounted for' },
      { key: 'fittings_check', label: 'Fittings, rubber gaskets, and accessories verified' }
    );
    installChecklist.push(
      { key: 'align_check', label: 'Glass panels aligned, plumb, and level checked' },
      { key: 'sealant_check', label: 'Structural grade silicone sealant applied evenly' },
      ...baseInstallChecklist
    );
  } else if (projCat.includes('pergola') || projCat.includes('canopy')) {
    deliveryChecklist.push(
      { key: 'alum_qty', label: 'Aluminum beams and louvers accounted for' },
      { key: 'motor_check', label: 'Motor mechanisms and sensors verified' }
    );
    installChecklist.push(
      { key: 'struct_check', label: 'Main columns and beams securely anchored' },
      { key: 'motor_test', label: 'Motor operation and drainage tested' },
      ...baseInstallChecklist
    );
  } else if (projCat.includes('cladding') || projCat.includes('acp')) {
    deliveryChecklist.push(
      { key: 'panel_qty', label: 'All composite panels accounted for' },
      { key: 'subframe_check', label: 'Sub-framing materials verified' }
    );
    installChecklist.push(
      { key: 'subframe_install', label: 'Sub-framing installed securely and level' },
      { key: 'panel_align', label: 'Panels aligned with correct expansion gaps' },
      ...baseInstallChecklist
    );
  } else {
    // Default
    deliveryChecklist.push(
      { key: 'mat_qty', label: 'All primary materials accounted for' },
      { key: 'acc_check', label: 'Fittings and accessories verified' }
    );
    installChecklist.push(
      { key: 'align_check', label: 'Installation aligned, plumb, and secure' },
      { key: 'sealant_check', label: 'Joints sealed appropriately' },
      ...baseInstallChecklist
    );
  }

  const activeChecklist = isDelivery ? deliveryChecklist : isInstall ? installChecklist : [];

  // Default target coordinate fallbacks ( Accra Westline Office ) if not set
  const targetLat = Number(project.latitude) || 5.6037;
  const targetLng = Number(project.longitude) || -0.1870;

  // Retrieve current location
  const getWorkerLocation = () => {
    setLocating(true);
    setLocationError('');
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      setLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setWorkerCoords(coords);
        const dist = getDistanceMeters(coords.latitude, coords.longitude, targetLat, targetLng);
        setDistance(dist);
        setLocating(false);
      },
      (err) => {
        console.error("[WorkerView Geolocation Error]:", err);
        setLocationError("Failed to obtain location. Please grant browser permissions.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    if (!isComplete) {
      getWorkerLocation();
    }
  }, [project.id]);

  const toggleCheck = (key) => {
    setCheckedItems(p => ({ ...p, [key]: !p[key] }));
  };

  const allChecked = activeChecklist.every(item => checkedItems[item.key]);
  const checkInLocked = !devBypass && (distance === null || distance > 100);

  const handleStageUpdate = async () => {
    if (!updateProjectStage || checkInLocked || !allChecked) return;
    
    const nextStage = isDelivery ? StageSixFallback() : INSPECTION_SIGN_OFF;
    const label = isDelivery 
      ? 'Logistics Complete: Materials delivered on-site. QA verified.'
      : 'Installation Complete: QA checklists submitted by field team.';

    // Save QA Checklist report meta
    const qaReport = {
      checkedItems,
      photoUrl: uploadedPhotoUrl || null,
      workerName: user?.name || user?.email || 'Worker',
      verifiedAt: new Date().toISOString(),
      siteDistanceMeters: distance || 0,
      siteCoordinates: workerCoords ? { lat: workerCoords.latitude, lng: workerCoords.longitude } : null,
      devBypassed: devBypass
    };

    if (!navigator.onLine) {
      // Offline mode caching!
      const cachePayload = {
        projectId: project.id,
        qaReport,
        nextStage,
        label,
        cachedAt: new Date().toISOString()
      };
      localStorage.setItem('westline_offline_qa_' + project.id, JSON.stringify(cachePayload));
      setIsOfflineCached(true);
      setStageDone(true);
      // Dispatch storage event to trigger top status banner update
      window.dispatchEvent(new Event('storage'));
      return;
    }

    setStageLoading(true);
    try {
      await updateDoc(doc(db, 'projects', project.id), {
        fieldQAReport: qaReport,
        updatedAt: serverTimestamp()
      });

      // Update the stage in Firestore
      await updateProjectStage(project.id, nextStage, label);
      setStageDone(true);
    } catch (e) {
      console.error("[WorkerView Submit Error]:", e);
    } finally {
      setStageLoading(false);
    }
  };

  const StageSixFallback = () => {
    // If Delivery is done, advance to Stage 6 (Installation)
    return INSTALLATION_STAGE;
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
      const result = await addProjectDocument(project.id, file, {
        uploadedBy: user?.name || user?.displayName || 'worker',
        stageId: project.stageId,
        name: 'Field QA photo — ' + new Date().toLocaleDateString(),
      });
      setPhotoUploaded(true);
      setUploadedPhotoUrl(result?.fileUrl || '');
      setTimeout(() => setPhotoUploaded(false), 3000);
    } catch (e) {
      console.error(e);
    }
    setPhotoLoading(false);
  };

  return (
    <div style={{ background: '#fff', borderRadius: 24, padding: 24, boxShadow: '0 4px 20px rgba(92,58,33,0.06)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: `var(--accent-secondary)`, marginBottom: 4, lineHeight: 1.3 }}>
            {project.title || project.name || 'Untitled Project'}
          </div>
          <div style={{ fontSize: 12, color: `var(--text-secondary)`, fontWeight: 500 }}>{project.clientName || 'Client'}</div>
        </div>
        <div style={{
          padding: '4px 10px', borderRadius: 100,
          background: isDelivery ? '#F4EFE6' : isInstall ? '#FFF7ED' : '#F0FDF4',
          color: isDelivery ? 'var(--accent-primary)' : isInstall ? '#D97706' : '#16A34A',
          fontSize: 10, fontWeight: 800, marginLeft: 12, whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '.04em'
        }}>
          {isDelivery ? 'Delivery' : isInstall ? 'Installation' : 'Active'}
        </div>
      </div>

      {/* Stage badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: `var(--bg-secondary)`, borderRadius: 12 }}>
        {isDelivery && <Truck size={14} color="var(--accent-primary)" />}
        {isInstall && <Wrench size={14} color="#D97706" />}
        {isComplete && <CheckCircle size={14} color="#16A34A" />}
        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent-secondary)' }}>{getStageName(project.stageId)}</span>
      </div>

      {/* Project Blueprints & Renderings */}
      {projectRenderings.length > 0 && (
        <div style={{ padding: '16px', background: '#F8F6F3', borderRadius: 16, border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileText size={14} /> Approved Blueprints
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {projectRenderings.map(r => (
              <a key={r.id} href={r.fileUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: '#fff', borderRadius: 10, textDecoration: 'none', border: '1px solid var(--border-color)' }}>
                <img src={r.fileUrl} style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover', background: 'var(--border-color)' }} onError={(e) => e.target.style.display='none'} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Click to view full size</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Geo-fencing site coordinates checking indicator */}
      {!isComplete && (
        <div style={{ 
          padding: 16, 
          borderRadius: 16, 
          background: checkInLocked ? '#FFFBEB' : '#F0FDF4',
          border: `1.5px solid ${checkInLocked ? '#F59E0B30' : '#10B98130'}`,
          display: 'flex',
          flexDirection: 'column',
          gap: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MapPin size={16} color={checkInLocked ? '#D97706' : '#16A34A'} />
              <span style={{ fontSize: 12, fontWeight: 900, color: checkInLocked ? '#92400E' : '#065F46' }}>
                {checkInLocked ? "Site Check-in Locked" : "Site Check-in Active ✓"}
              </span>
            </div>
            <button 
              onClick={getWorkerLocation}
              disabled={locating}
              style={{ background: 'none', border: 'none', color: 'var(--accent-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700 }}
            >
              <RefreshCw size={11} className={locating ? "spin" : ""} style={{ animation: locating ? 'spin 1s linear infinite' : 'none' }} /> Refresh
            </button>
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            {locating ? (
              "Verifying coordinates via carrier satellites..."
            ) : locationError ? (
              <span style={{ color: '#DC2626', fontWeight: 700 }}>{locationError}</span>
            ) : (
              `You are currently ${distance ? (distance > 1000 ? `${(distance/1000).toFixed(2)} km` : `${Math.round(distance)} meters`) : '—'} away from site coordinates.`
            )}
          </div>

          {checkInLocked && !locating && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#D97706', fontWeight: 700 }}>
              <AlertCircle size={12} /> Must be within 100 meters to log stage completions.
            </div>
          )}

          {/* Dev Bypass Switch */}
          {import.meta.env.DEV && (
            <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>🔧 Dev Geofence Bypass</span>
              <button 
                onClick={() => setDevBypass(p => !p)}
                style={{
                  padding: '4px 10px', borderRadius: 20, border: 'none',
                  background: devBypass ? 'var(--accent-secondary)' : 'var(--border-color)',
                  color: '#fff', fontSize: 10, fontWeight: 800, cursor: 'pointer'
                }}
              >
                {devBypass ? "BYPASSED" : "OFF"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* QA Inspection Checklist Form */}
      {!isComplete && !stageDone && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Site QA Checklist Form
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activeChecklist.map(item => {
              const checked = !!checkedItems[item.key];
              return (
                <div 
                  key={item.key} 
                  onClick={() => toggleCheck(item.key)}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: 10, 
                    padding: '12px 14px', borderRadius: 12, 
                    background: checked ? '#FDFBF7' : 'var(--bg-secondary)',
                    border: `1.5px solid ${checked ? 'var(--accent-secondary)30' : 'var(--border-color)'}`,
                    cursor: 'pointer', transition: 'all 0.15s'
                  }}
                >
                  {checked ? <CheckSquare size={16} color="var(--accent-secondary)" /> : <Square size={16} color="var(--text-secondary)" />}
                  <span style={{ fontSize: 12, fontWeight: 600, color: checked ? 'var(--accent-secondary)' : 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Photo upload camera */}
      {!isComplete && !stageDone && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Field photo QA proof
          </label>
          <label style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '14px', borderRadius: 14,
            background: photoUploaded ? '#F0FDF4' : `var(--bg-secondary)`,
            color: photoUploaded ? '#16A34A' : `var(--accent-secondary)`,
            border: `1px dashed ${photoUploaded ? '#10B981' : 'var(--border-color)'}`,
            fontSize: 13, fontWeight: 800, cursor: photoLoading ? 'default' : 'pointer'
          }}>
            <Camera size={16} />
            {photoLoading ? 'Uploading QA photo...' : photoUploaded ? 'Photo uploaded ✓' : 'Take / Upload Site Photo'}
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
      )}

      {/* Stage action submit */}
      {(isDelivery || isInstall) && !stageDone && (
        <button
          onClick={handleStageUpdate}
          disabled={stageLoading || checkInLocked || !allChecked}
          style={{
            width: '100%', padding: '14px', borderRadius: 14,
            background: (checkInLocked || !allChecked) ? 'var(--border)' : `var(--accent-secondary)`,
            color: '#fff', border: 'none',
            fontSize: 14, fontWeight: 800, cursor: (stageLoading || checkInLocked || !allChecked) ? 'default' : 'pointer',
            opacity: stageLoading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.2s', marginTop: 10
          }}
        >
          {isDelivery && <Truck size={16} />}
          {isInstall && <Wrench size={16} />}
          {stageLoading ? 'Updating...' : isDelivery ? 'Mark as Delivered (QA Approved)' : 'Mark as Installed (QA Approved)'}
        </button>
      )}
      
      {stageDone && (
        <div style={{
          padding: '12px 16px', borderRadius: 12,
          background: isOfflineCached ? '#FFFBEB' : '#F0FDF4',
          color: isOfflineCached ? '#D97706' : '#16A34A',
          fontSize: 13, fontWeight: 700, display: 'flex',
          alignItems: 'center', gap: 8
        }}>
          <CheckCircle size={16} />
          {isOfflineCached 
            ? 'Report cached offline (will sync once online)'
            : 'Status and QA report updated successfully'}
        </div>
      )}

      {/* Notes */}
      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
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
    </div>
  );
}

function AllProjectsAccordion({ projects, user, renderingPackages, updateProjectStage, addProjectMessage, addProjectDocument }) {
  const [open, setOpen] = useState(false);
  if (!projects || projects.length === 0) return null;

  return (
    <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)' }}>
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
            <div key={p.id} style={{ padding: '12px 16px', background: `var(--bg-secondary)`, borderRadius: 12, border: '1px solid var(--border-color)' }}>
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

export default function WorkerView({ user, onLogout, clients, updateStage, logs, ...props }) {
  const { renderingPackages = [] } = props;
  const { updateProjectStage, addProjectMessage, addProjectDocument, brand } = props;
  const ac = brand?.color || `var(--accent-secondary)`;

  const [syncingOffline, setSyncingOffline] = useState(false);
  const [offlineSyncMessage, setOfflineSyncMessage] = useState('');
  const [cachedCount, setCachedCount] = useState(0);
  const [onlineStatus, setOnlineStatus] = useState(navigator.onLine);

  const updateCachedCount = useCallback(() => {
    const keys = Object.keys(localStorage);
    const qaKeys = keys.filter(k => k.startsWith('westline_offline_qa_'));
    setCachedCount(qaKeys.length);
  }, []);

  const syncOfflinePayloads = useCallback(async () => {
    if (!navigator.onLine) return;
    const keys = Object.keys(localStorage);
    const qaKeys = keys.filter(k => k.startsWith('westline_offline_qa_'));
    if (qaKeys.length === 0) return;

    setSyncingOffline(true);
    setOfflineSyncMessage(`Syncing ${qaKeys.length} cached field reports...`);
    try {
      for (const key of qaKeys) {
        const cachedStr = localStorage.getItem(key);
        if (!cachedStr) continue;
        const payload = JSON.parse(cachedStr);
        const { projectId, qaReport, nextStage, label } = payload;
        
        // Sync to Firestore
        await updateDoc(doc(db, 'projects', projectId), {
          fieldQAReport: qaReport,
          updatedAt: serverTimestamp()
        });
        await updateProjectStage(projectId, nextStage, label);
        
        // Remove from cache
        localStorage.removeItem(key);
      }
      setOfflineSyncMessage('All offline reports synced successfully!');
      updateCachedCount();
      setTimeout(() => {
        setOfflineSyncMessage('');
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error("[Offline Sync Error]:", error);
      setOfflineSyncMessage('Failed to sync some reports. Retrying later.');
    } finally {
      setSyncingOffline(false);
    }
  }, [updateProjectStage, updateCachedCount]);

  useEffect(() => {
    updateCachedCount();

    const handleOnline = () => {
      setOnlineStatus(true);
      syncOfflinePayloads();
    };
    const handleOffline = () => {
      setOnlineStatus(false);
    };
    const handleStorageChange = () => {
      updateCachedCount();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('storage', handleStorageChange);
    
    // Auto-sync on mount if online
    if (navigator.onLine) {
      syncOfflinePayloads();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [syncOfflinePayloads, updateCachedCount]);

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
        height: 60, boxShadow: '0 2px 20px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wrench size={16} color="var(--accent-secondary)" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1 }}>Field View</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{workerName}</div>
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

      {/* Offline Status Banner */}
      {(!onlineStatus || cachedCount > 0) && (
        <div style={{
          background: !onlineStatus ? '#FEF3C7' : '#ECFDF5',
          borderBottom: `1px solid ${!onlineStatus ? '#F59E0B' : '#10B981'}`,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} color={!onlineStatus ? '#D97706' : '#16A34A'} />
            <span style={{ fontSize: 12, fontWeight: 700, color: !onlineStatus ? '#92400E' : '#065F46' }}>
              {!onlineStatus 
                ? `Offline Mode Active${cachedCount > 0 ? ` (${cachedCount} report cached locally)` : ''}`
                : `${cachedCount} cached reports ready to sync.`}
            </span>
          </div>
          {onlineStatus && cachedCount > 0 && (
            <button
              onClick={syncOfflinePayloads}
              disabled={syncingOffline}
              style={{
                padding: '4px 10px', borderRadius: 6, border: 'none',
                background: '#10B981', color: '#fff', fontSize: 11, fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              {syncingOffline ? 'Syncing...' : 'Sync Now'}
            </button>
          )}
        </div>
      )}
      {offlineSyncMessage && (
        <div style={{ background: '#ECFDF5', color: '#065F46', padding: '10px 16px', textAlign: 'center', fontSize: 12, fontWeight: 700, borderBottom: '1px solid #10B981' }}>
          {offlineSyncMessage}
        </div>
      )}

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
              boxShadow: '0 2px 12px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)'
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
                  renderingPackages={renderingPackages}
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
            <AllProjectsAccordion projects={allAssigned} user={user} renderingPackages={renderingPackages} updateProjectStage={updateProjectStage} addProjectMessage={props.addProjectMessage} addProjectDocument={props.addProjectDocument} />
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 11, color: `var(--text-secondary)` }}>
          {brand?.name || 'Westline Future'} Field App
        </div>
      </div>
    </div>
  );
}
