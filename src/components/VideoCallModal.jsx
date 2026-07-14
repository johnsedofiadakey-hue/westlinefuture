import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Loader } from 'lucide-react';
import { functions } from '../lib/firebase';
import { httpsCallable } from 'firebase/functions';

export default function VideoCallModal({ meeting, user, onClose, brand }) {
  const ac = brand?.color || 'var(--accent-secondary)';
  const clientRef = useRef(null);
  const localTracksRef = useRef({ audio: null, video: null });
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const [status, setStatus] = useState('connecting');
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [remoteJoined, setRemoteJoined] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const cleanup = useCallback(async () => {
    const client = clientRef.current;
    const { audio, video } = localTracksRef.current;
    try {
      if (audio) { audio.stop(); audio.close(); }
      if (video) { video.stop(); video.close(); }
      if (client) await client.leave();
    } catch (_) {}
    localTracksRef.current = { audio: null, video: null };
    clientRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function join() {
      try {
        // Dynamic import — keeps Agora out of the initial bundle
        const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
        AgoraRTC.setLogLevel(4);

        const fn = httpsCallable(functions, 'generateAgoraToken');
        const result = await fn({ channelName: meeting.channelName, uid: user.uid, role: 'publisher' });
        if (cancelled) return;
        const { token, appId, channelName, uid } = result.data;

        const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        clientRef.current = client;

        client.on('user-published', async (remoteUser, mediaType) => {
          await client.subscribe(remoteUser, mediaType);
          if (mediaType === 'video' && remoteVideoRef.current) {
            remoteUser.videoTrack?.play(remoteVideoRef.current);
          }
          if (mediaType === 'audio') remoteUser.audioTrack?.play();
          setRemoteJoined(true);
        });

        client.on('user-unpublished', (_, mediaType) => {
          if (mediaType === 'video') setRemoteJoined(false);
        });

        client.on('user-left', () => setRemoteJoined(false));

        await client.join(appId, channelName, token, uid);
        if (cancelled) { await client.leave(); return; }

        const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
        localTracksRef.current = { audio: audioTrack, video: videoTrack };

        if (localVideoRef.current) videoTrack.play(localVideoRef.current);
        await client.publish([audioTrack, videoTrack]);

        setStatus('live');
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          setErrorMsg(err.message || 'Could not connect to call.');
        }
      }
    }

    join();
    return () => { cancelled = true; cleanup(); };
  }, [meeting.channelName, user.uid, cleanup]);

  async function toggleMic() {
    const track = localTracksRef.current.audio;
    if (!track) return;
    await track.setEnabled(muted);
    setMuted(!muted);
  }

  async function toggleCam() {
    const track = localTracksRef.current.video;
    if (!track) return;
    await track.setEnabled(camOff);
    setCamOff(!camOff);
  }

  async function endCall() {
    setStatus('ended');
    await cleanup();
    onClose();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: '#0a0a0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>

      <div ref={remoteVideoRef} style={{ position: 'absolute', inset: 0, background: '#111' }} />

      {status === 'live' && !remoteJoined && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', gap: 16 }}>
          <Loader size={32} style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ fontSize: 16, fontWeight: 600, opacity: 0.7 }}>Waiting for the other person to join…</p>
        </div>
      )}

      {status === 'connecting' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', gap: 16 }}>
          <Loader size={32} style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ fontSize: 16, fontWeight: 600, opacity: 0.7 }}>Connecting…</p>
        </div>
      )}

      {status === 'error' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', gap: 16 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#f87171' }}>Failed to connect</p>
          <p style={{ fontSize: 13, opacity: 0.6, maxWidth: 320, textAlign: 'center' }}>{errorMsg}</p>
          <button onClick={onClose} style={{ marginTop: 8, padding: '10px 24px', borderRadius: 12, background: '#fff', color: '#111', fontWeight: 700, border: 'none', cursor: 'pointer' }}>Close</button>
        </div>
      )}

      <div ref={localVideoRef} style={{ position: 'absolute', top: 20, right: 20, width: 140, height: 100, borderRadius: 14, overflow: 'hidden', background: '#222', border: '2px solid rgba(255,255,255,0.15)', zIndex: 10 }} />

      <div style={{ position: 'absolute', top: 20, left: 20, color: '#fff', zIndex: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 800, opacity: 0.9 }}>{meeting.title || 'Video Call'}</div>
        <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>Westline Future</div>
      </div>

      {(status === 'live' || status === 'connecting') && (
        <div style={{ position: 'absolute', bottom: 40, display: 'flex', gap: 16, zIndex: 10 }}>
          <button onClick={toggleMic} title={muted ? 'Unmute' : 'Mute'} style={{ width: 56, height: 56, borderRadius: '50%', background: muted ? '#ef4444' : 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
            {muted ? <MicOff size={22} /> : <Mic size={22} />}
          </button>
          <button onClick={endCall} title="End call" style={{ width: 64, height: 64, borderRadius: '50%', background: '#ef4444', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PhoneOff size={26} />
          </button>
          <button onClick={toggleCam} title={camOff ? 'Turn camera on' : 'Turn camera off'} style={{ width: 56, height: 56, borderRadius: '50%', background: camOff ? '#ef4444' : 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
            {camOff ? <VideoOff size={22} /> : <Video size={22} />}
          </button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
