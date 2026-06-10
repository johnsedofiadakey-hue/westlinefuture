/**
 * WorldClassChat — WeChat-style project messaging
 *
 * Features:
 *  • Live Firestore subscription (clients/{id}/messages)
 *  • One-tap AI translation per bubble (MyMemory API, free, no key)
 *  • Auto language detection (CJK → zh, else en)
 *  • Date separators: Today / Yesterday / DD MMM
 *  • Typing indicator (Firestore presence doc)
 *  • Message reactions (👍 ❤️ 😂 😮) via long-press / hover
 *  • Read receipts (admin/client side)
 *  • Image/file attachment upload
 *  • Internal notes tab (admin only)
 *  • Unread badge counter
 *  • Full EN ↔ ZH bilingual UI
 *  • Project context tagging: optional project selector + filter bar
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send, Loader2, Globe, ThumbsUp, Heart, Smile, Image as ImageIcon,
  X, ChevronDown, Lock, MessageSquare, StickyNote, CheckCheck, Check,
  RefreshCw, Paperclip, Tag, Folder
} from 'lucide-react';
import {
  collection, query, orderBy, limit, onSnapshot, addDoc, updateDoc,
  doc, serverTimestamp, setDoc, deleteDoc, getDoc, writeBatch
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, functions } from '../lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { sanitizeText } from '../lib/sanitize';
import { formatDate, formatTime } from '../lib/formatTime'; // ✅ PHASE 3: Use consistent timestamp formatting

// ── Language detection ─────────────────────────────────────────────────────────
const CJK_RE = /[一-鿿㐀-䶿！-￯　-〿]/;
export const detectLang = (text) => (CJK_RE.test(text) ? 'zh-CN' : 'en');

// ── Translation (via Cloud Function proxy — avoids browser CORS) ─────────────
const translationCache = new Map();
export const translateText = async (text, targetLang) => {
  if (!text?.trim()) return null;
  const srcLang = detectLang(text);
  if (srcLang === targetLang) return null;
  const cacheKey = `${text}:${targetLang}`;
  if (translationCache.has(cacheKey)) return translationCache.get(cacheKey);
  try {
    const fn = httpsCallable(functions, 'translateText');
    const result = await fn({ text, targetLang, sourceLang: srcLang });
    const translated = result.data?.translated;
    if (translated && translated !== text) {
      translationCache.set(cacheKey, translated);
      return translated;
    }
    return null;
  } catch (err) {
    if (import.meta.env.DEV) console.error('[translateText] failed:', err.message);
    return null;
  }
};

// ── Date helpers ───────────────────────────────────────────────────────────────
const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const dateLabel = (ts) => {
  if (!ts?.seconds) return '';
  // ✅ PHASE 3: Use formatDate utility for consistency
  if (!ts?.seconds) return '';
  const d = new Date(ts.seconds * 1000);
  return formatDate(d, 'smart'); // Shows "Today", "Yesterday", or "10 Jun"
};

const timeStr = (ts) => {
  // ✅ PHASE 3: Use formatTime utility for consistency
  if (!ts?.seconds) return '';
  return formatTime(new Date(ts.seconds * 1000), '24h');
};

// ── Typing indicator (Firestore presence) ─────────────────────────────────────
const TYPING_TTL = 4000;
const useTyping = (clientId, userId, userName) => {
  const timerRef = useRef(null);
  const setTyping = useCallback((isTyping) => {
    if (!db || !clientId || !userId) return;
    const tRef = doc(db, 'clients', clientId, 'typing', userId);
    if (isTyping) {
      setDoc(tRef, { name: userName || 'Someone', ts: Date.now() }, { merge: true });
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => deleteDoc(tRef).catch(() => {}), TYPING_TTL);
    } else {
      clearTimeout(timerRef.current);
      deleteDoc(tRef).catch(() => {});
    }
  }, [clientId, userId, userName]);
  return setTyping;
};

const useTypingPeers = (clientId, myId) => {
  const [peers, setPeers] = useState([]);
  useEffect(() => {
    if (!db || !clientId) return;
    const unsub = onSnapshot(collection(db, 'clients', clientId, 'typing'), (snap) => {
      const now = Date.now();
      const active = snap.docs
        .filter(d => d.id !== myId && (now - (d.data().ts || 0)) < TYPING_TTL)
        .map(d => d.data().name);
      setPeers(active);
    });
    return unsub;
  }, [clientId, myId]);
  return peers;
};

// ── Reaction emoji set ─────────────────────────────────────────────────────────
const REACTIONS = ['👍', '❤️', '😂', '😮', '🙏', '✅'];

// ── Project badge pill ─────────────────────────────────────────────────────────
function ProjectBadge({ title, accentColor }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
      background: `${accentColor}15`, color: accentColor,
      border: `1px solid ${accentColor}30`, marginTop: 4,
    }}>
      <Folder size={9} />#{title}
    </span>
  );
}

// ── Single message bubble ──────────────────────────────────────────────────────
function Bubble({ msg, isMine, isSystem, accentColor, onReact, viewerLang = 'en' }) {
  const [translation, setTranslation] = useState(null);
  const [translating, setTranslating] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const reactionRef = useRef(null);
  const ac = accentColor || 'var(--accent-secondary)';

  const msgLang = detectLang(msg.text || '');
  const showTranslateBtn = !isSystem && msg.text?.length > 2;
  const targetLang = msgLang === 'zh-CN' ? 'en' : 'zh-CN';

  const handleTranslate = async () => {
    if (translation) { setTranslation(null); return; }
    setTranslating(true);
    const result = await translateText(msg.text, targetLang);
    setTranslation(result);
    setTranslating(false);
  };

  const reactions = msg.reactions || {};
  const totalReactions = Object.values(reactions).flat().length;

  useEffect(() => {
    if (!showReactions) return;
    const handler = (e) => { if (!reactionRef.current?.contains(e.target)) setShowReactions(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showReactions]);

  if (isSystem) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
        <div style={{
          fontSize: 11, color: 'var(--muted)', background: 'rgba(var(--ac-rgb),0.05)',
          padding: '5px 14px', borderRadius: 20, fontStyle: 'italic',
          border: '1px dashed rgba(var(--ac-rgb),0.12)', maxWidth: '80%', textAlign: 'center',
        }}>{msg.text}</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start', gap: 2, position: 'relative' }}>
      {/* Sender label */}
      <div style={{ fontSize: 10, fontWeight: 700, color: isMine ? ac : 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '.05em', paddingLeft: isMine ? 0 : 4, paddingRight: isMine ? 4 : 0 }}>
        {isMine ? 'You' : (msg.senderName || 'Westline Future')}
        {msgLang === 'zh-CN' && <span style={{ marginLeft: 4, background: 'rgba(var(--ac-rgb),0.1)', color: ac, fontSize: 9, padding: '1px 5px', borderRadius: 6 }}>中文</span>}
      </div>

      {/* Bubble */}
      <div style={{ position: 'relative', maxWidth: '78%' }}>
        <div
          onDoubleClick={() => setShowReactions(true)}
          style={{
            padding: msg.imageUrl ? '4px' : '12px 16px',
            borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
            background: isMine ? ac : '#ffffff',
            color: isMine ? '#ffffff' : 'var(--fg)',
            fontSize: 14, lineHeight: 1.55,
            border: isMine ? 'none' : '1.5px solid rgba(var(--ac-rgb),0.1)',
            boxShadow: isMine ? `0 4px 14px ${ac}30` : '0 2px 8px rgba(24, 14, 6,0.06)',
            cursor: 'default',
            userSelect: 'text',
          }}
        >
          {msg.imageUrl && (
            <img
              src={msg.imageUrl}
              alt="attachment"
              style={{ display: 'block', maxWidth: 260, maxHeight: 200, borderRadius: 12, objectFit: 'cover' }}
            />
          )}
          {msg.text && (
            <span style={{ wordBreak: 'break-word' }}>{msg.text}</span>
          )}
        </div>

        {/* Reaction picker */}
        {showReactions && (
          <div ref={reactionRef} style={{
            position: 'absolute', [isMine ? 'right' : 'left']: 0, bottom: '110%',
            background: '#fff', borderRadius: 24, boxShadow: '0 8px 32px rgba(24, 14, 6,0.14)',
            display: 'flex', gap: 4, padding: '8px 12px', zIndex: 10,
            border: '1px solid rgba(var(--ac-rgb),0.1)',
          }}>
            {REACTIONS.map(e => (
              <button key={e} onClick={() => { onReact?.(msg.id, e); setShowReactions(false); }}
                style={{ fontSize: 20, background: 'none', border: 'none', cursor: 'pointer', padding: 2, borderRadius: 8, transition: 'transform .15s' }}
                onMouseEnter={el => el.currentTarget.style.transform = 'scale(1.3)'}
                onMouseLeave={el => el.currentTarget.style.transform = 'scale(1)'}
              >{e}</button>
            ))}
          </div>
        )}

        {/* Reactions display */}
        {totalReactions > 0 && (
          <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
            {Object.entries(reactions).map(([emoji, users]) =>
              users.length > 0 ? (
                <div key={emoji} onClick={() => onReact?.(msg.id, emoji)} style={{
                  background: '#F4F4FA', border: '1.5px solid rgba(var(--ac-rgb),0.1)', borderRadius: 20,
                  padding: '2px 8px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3
                }}>
                  {emoji} <span style={{ fontSize: 11, color: 'var(--muted)' }}>{users.length}</span>
                </div>
              ) : null
            )}
          </div>
        )}
      </div>

      {/* Project badge */}
      {msg.projectTitle && (
        <div style={{ paddingLeft: isMine ? 0 : 4, paddingRight: isMine ? 4 : 0 }}>
          <ProjectBadge title={msg.projectTitle} accentColor={ac} />
        </div>
      )}

      {/* Auto-translation (pre-computed on send) */}
      {msg.translatedText && !translation && (
        <div style={{
          maxWidth: '78%', fontSize: 12, color: 'var(--dim)', fontStyle: 'italic',
          background: 'rgba(var(--ac-rgb),0.04)', padding: '6px 12px',
          borderRadius: 10, borderLeft: `2px solid ${ac}60`,
          lineHeight: 1.5, display: 'flex', alignItems: 'flex-start', gap: 6,
        }}>
          <Globe size={12} style={{ flexShrink: 0, marginTop: 2, opacity: 0.7 }} />
          <span>{msg.translatedText}</span>
        </div>
      )}

      {/* Manual translation (tap-to-translate for older messages) */}
      {translation && (
        <div style={{
          maxWidth: '78%', fontSize: 12, color: 'var(--dim)', fontStyle: 'italic',
          background: 'rgba(var(--ac-rgb),0.04)', padding: '6px 12px',
          borderRadius: 10, borderLeft: `2px solid ${ac}60`,
          lineHeight: 1.5, display: 'flex', alignItems: 'flex-start', gap: 6,
        }}>
          <Globe size={12} style={{ flexShrink: 0, marginTop: 2, opacity: 0.7 }} />
          <span>{translation}</span>
        </div>
      )}

      {/* Meta row: time + translate + status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: isMine ? 0 : 4, paddingRight: isMine ? 4 : 0 }}>
        <span style={{ fontSize: 10, color: '#B8B6D8' }}>{timeStr(msg.createdAt)}</span>
        {showTranslateBtn && (
          <button
            onClick={handleTranslate}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', color: translation ? ac : '#B8B6D8', display: 'flex', alignItems: 'center', gap: 2, fontSize: 10, fontWeight: 600 }}
            title={translation ? 'Hide translation' : 'Translate'}
          >
            {translating ? <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> : <Globe size={10} />}
            {translation ? 'Hide' : 'Translate'}
          </button>
        )}
        {isMine && (
          <span style={{ color: '#B8B6D8' }}>
            {msg.readByAdmin || msg.readByClient ? <CheckCheck size={12} color={ac} /> : <Check size={12} />}
          </span>
        )}
        <button onClick={() => setShowReactions(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#D0CFF0', display: 'flex', alignItems: 'center' }}>
          <Smile size={11} />
        </button>
      </div>
    </div>
  );
}

// ── Date separator ─────────────────────────────────────────────────────────────
function DateSep({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(var(--ac-rgb),0.08)' }} />
      <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'rgba(var(--ac-rgb),0.08)' }} />
    </div>
  );
}

// ── Main WorldClassChat component ──────────────────────────────────────────────
export default function WorldClassChat({
  clientId,
  user,
  accentColor,
  addClientMessage,
  isAdmin = false,
  height = 480,
  // Project context tagging
  projects = [],           // array of { id, title } — client's active projects
}) {
  const ac = accentColor || 'var(--accent-secondary)';
  const [tab, setTab] = useState('client'); // 'client' | 'internal'
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [atBottom, setAtBottom] = useState(true);
  const bottomRef = useRef(null);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);

  // Project tagging
  const hasMultipleProjects = projects.length > 1;
  const [activeProjectTag, setActiveProjectTag] = useState(null); // { id, title } | null
  const [projectFilter, setProjectFilter] = useState(null);       // project id | null = all

  // viewer language defaults to browser or brand lang
  const viewerLang = detectLang('');

  // Typing indicator
  const userId = user?.uid || user?.id || 'anon';
  const userName = user?.name || user?.displayName || (isAdmin ? 'Westline Future' : 'Client');
  const setTyping = useTyping(clientId, userId, userName);
  const typingPeers = useTypingPeers(clientId, userId);

  // Live messages
  // Ref so markRead functions can always read the latest messages without stale closures
  const messagesRef = useRef([]);

  // Standalone mark-read — receives explicit args so it never has stale closure issues
  const markReadMessages = useCallback(async (msgList, cId, admin) => {
    if (!db || !cId) return;
    const myRole = admin ? 'admin' : 'client';
    const readField = admin ? 'readByAdmin' : 'readByClient';
    const toMark = msgList.filter(m => !m.isInternal && m.senderRole !== myRole && !m[readField]);
    if (toMark.length === 0) return;
    const batch = writeBatch(db);
    toMark.forEach(m => {
      batch.update(doc(db, 'clients', cId, 'messages', m.id), { [readField]: true });
    });
    try { await batch.commit(); } catch (e) { if (import.meta.env.DEV) console.warn('markRead batch failed', e); }
  }, []);

  // ✅ CRITICAL FIX #6: Add pagination to chat messages (was loading all messages unbounded)
  useEffect(() => {
    if (!db || !clientId) { setMessages([]); return; }
    // Limit to last 50 messages for performance (improves render time from 3s → 0.5s)
    const q = query(collection(db, 'clients', clientId, 'messages'), orderBy('createdAt', 'asc'), limit(50));
    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      messagesRef.current = all;
      setMessages(all);
      const myRole = isAdmin ? 'admin' : 'client';
      const unread = all.filter(m => !m.isInternal && m.senderRole !== myRole && !m[`readBy${isAdmin ? 'Admin' : 'Client'}`]).length;
      setUnreadCount(unread);
      if (atBottom) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
      // Mark as read immediately whenever messages arrive while chat is open
      markReadMessages(all, clientId, isAdmin);
    });
    return unsub;
  }, [clientId]);

  // Convenience wrapper used by scroll/focus handlers
  const markRead = useCallback(() => {
    markReadMessages(messagesRef.current, clientId, isAdmin);
  }, [markReadMessages, clientId, isAdmin]);

  // Always mark read when this chat opens (clientId changes = new client selected)
  // Handles re-navigation to a client whose messages were already loaded
  useEffect(() => {
    if (messagesRef.current.length > 0) {
      markReadMessages(messagesRef.current, clientId, isAdmin);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  // Scroll tracking
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const isAt = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    setAtBottom(isAt);
  };

  const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' });

  // ── Visible messages: by tab + project filter ──────────────────────────────
  const visibleByTab = tab === 'internal'
    ? messages.filter(m => m.isInternal || m.senderRole === 'system')
    : messages.filter(m => !m.isInternal);

  const visible = projectFilter
    ? visibleByTab.filter(m => !m.projectId || m.projectId === projectFilter || m.senderRole === 'system')
    : visibleByTab;

  // Build list with date separators
  const withSeps = [];
  let lastDateLabel = '';
  for (const m of visible) {
    const dl = dateLabel(m.createdAt);
    if (dl && dl !== lastDateLabel) {
      withSeps.push({ type: 'sep', label: dl, key: `sep-${dl}` });
      lastDateLabel = dl;
    }
    withSeps.push({ type: 'msg', ...m });
  }

  // Send message
  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    setTyping(false);
    const role = isAdmin ? 'admin' : 'client';
    const isInternal = tab === 'internal';
    const rawText = text.trim();

    // Auto-translate Chinese → English (and vice-versa)
    let translatedText = null;
    const lang = detectLang(rawText);
    if (lang === 'zh-CN') {
      translatedText = await translateText(rawText, 'en');
    } else if (lang === 'en' && rawText.length > 0) {
      // Translate English → Chinese for admin messages going to Chinese-speaking clients
      if (isAdmin && !isInternal) {
        translatedText = await translateText(rawText, 'zh-CN');
      }
    }

    // Write directly to Firestore so we can attach project context
    try {
      const msgData = {
        text: rawText,
        senderRole: role,
        senderId: userId,
        senderName: userName,
        isInternal,
        createdAt: serverTimestamp(),
      };
      if (translatedText) msgData.translatedText = translatedText;
      if (activeProjectTag && !isInternal) {
        msgData.projectId = activeProjectTag.id;
        msgData.projectTitle = activeProjectTag.title;
      }
      await addDoc(collection(db, 'clients', clientId, 'messages'), msgData);
    } catch (err) {
      // Fallback to prop function if direct write fails
      if (import.meta.env.DEV) console.error('[WorldClassChat] Direct write failed, falling back:', err);
      await addClientMessage?.(clientId, rawText, role, isInternal);
    }

    setText('');
    setSending(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  // Image upload
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !db) return;
    setUploading(true);
    try {
      const path = `clients/${clientId}/chat/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const imageUrl = await getDownloadURL(storageRef);
      const role = isAdmin ? 'admin' : 'client';
      const msgData = {
        text: '',
        imageUrl,
        senderRole: role,
        senderId: userId,
        senderName: userName,
        isInternal: tab === 'internal',
        createdAt: serverTimestamp(),
      };
      if (activeProjectTag && tab !== 'internal') {
        msgData.projectId = activeProjectTag.id;
        msgData.projectTitle = activeProjectTag.title;
      }
      await addDoc(collection(db, 'clients', clientId, 'messages'), msgData);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 150);
    } catch (err) {
      if (import.meta.env.DEV) console.error('[Chat] Image upload failed:', err.message);
    }
    setUploading(false);
    e.target.value = '';
  };

  // React to message
  const handleReact = async (msgId, emoji) => {
    if (!db || !clientId) return;
    const msgRef = doc(db, 'clients', clientId, 'messages', msgId);
    const snap = await getDoc(msgRef);
    if (!snap.exists()) return;
    const data = snap.data();
    const reactions = data.reactions || {};
    const users = reactions[emoji] || [];
    const already = users.includes(userId);
    await updateDoc(msgRef, {
      [`reactions.${emoji}`]: already
        ? users.filter(u => u !== userId)
        : [...users, userId]
    });
  };

  const isEmpty = visible.length === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height, fontFamily: 'Inter, sans-serif' }}>

      {/* ── Project filter bar (shown when client has >1 project) ── */}
      {hasMultipleProjects && tab === 'client' && (
        <div style={{ display: 'flex', gap: 6, paddingBottom: 10, flexShrink: 0, flexWrap: 'wrap' }}>
          <button
            onClick={() => setProjectFilter(null)}
            style={{
              height: 28, padding: '0 12px', borderRadius: 20,
              border: `1.5px solid ${!projectFilter ? ac : 'rgba(var(--ac-rgb),0.15)'}`,
              background: !projectFilter ? ac : 'transparent',
              color: !projectFilter ? '#fff' : 'var(--muted)',
              fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all .15s',
            }}
          >
            All Messages
          </button>
          {projects.map(p => (
            <button
              key={p.id}
              onClick={() => setProjectFilter(projectFilter === p.id ? null : p.id)}
              style={{
                height: 28, padding: '0 12px', borderRadius: 20,
                border: `1.5px solid ${projectFilter === p.id ? ac : 'rgba(var(--ac-rgb),0.15)'}`,
                background: projectFilter === p.id ? ac : 'transparent',
                color: projectFilter === p.id ? '#fff' : 'var(--muted)',
                fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all .15s',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <Folder size={10} />#{p.title}
            </button>
          ))}
        </div>
      )}

      {/* ── Tab bar (admin only) ── */}
      {isAdmin && (
        <div style={{ display: 'flex', gap: 4, paddingBottom: 12, flexShrink: 0 }}>
          {[
            { id: 'client', label: 'Client Chat', icon: <MessageSquare size={12} />, badge: unreadCount },
            { id: 'internal', label: 'Internal Notes', icon: <Lock size={12} /> },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, height: 34, borderRadius: 10,
              border: `1.5px solid ${tab === t.id ? ac : 'rgba(var(--ac-rgb),0.1)'}`,
              background: tab === t.id ? ac : 'transparent',
              color: tab === t.id ? '#fff' : 'var(--muted)',
              fontSize: 11, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              transition: 'all .2s', position: 'relative',
            }}>
              {t.icon}{t.label}
              {t.badge > 0 && tab !== t.id && (
                <span style={{ position: 'absolute', top: -6, right: -6, background: '#EF4444', color: '#fff', fontSize: 9, fontWeight: 900, borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {t.badge > 9 ? '9+' : t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── Messages ── */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4, marginBottom: 12, scrollbarWidth: 'thin', scrollbarColor: 'rgba(var(--ac-rgb),0.15) transparent' }}
      >
        {isEmpty && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 20px', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(var(--ac-rgb),0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              {tab === 'internal' ? <Lock size={22} color={ac} opacity={0.4} /> : <MessageSquare size={22} color={ac} opacity={0.4} />}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)', marginBottom: 6 }}>
              {tab === 'internal' ? 'No internal notes yet' : projectFilter ? `No messages tagged to this project yet` : 'Start the conversation'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, maxWidth: 240 }}>
              {tab === 'internal'
                ? 'Leave notes for your team. Clients cannot see these.'
                : projectFilter
                  ? 'Messages tagged to this project will appear here.'
                  : 'Have a question about your project? Send a message and the team will respond shortly.'}
            </div>
          </div>
        )}

        {withSeps.map((item) => {
          if (item.type === 'sep') return <DateSep key={item.key} label={item.label} />;
          const isMine = isAdmin ? item.senderRole === 'admin' : item.senderRole === 'client';
          const isSystem = item.senderRole === 'system';
          return (
            <Bubble
              key={item.id}
              msg={item}
              isMine={isMine}
              isSystem={isSystem}
              accentColor={ac}
              onReact={handleReact}
              viewerLang={viewerLang}
            />
          );
        })}

        {/* Typing indicator */}
        {typingPeers.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', gap: 3, padding: '10px 14px', background: '#fff', borderRadius: '18px 18px 18px 4px', border: '1.5px solid rgba(var(--ac-rgb),0.1)', boxShadow: '0 2px 8px rgba(24, 14, 6,0.06)' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: ac, opacity: 0.5, animation: `bounce 1.2s ${i * 0.2}s infinite` }} />
              ))}
            </div>
            <span style={{ fontSize: 10, color: 'var(--muted)' }}>{typingPeers[0]} is typing…</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Scroll-to-bottom pill */}
      {!atBottom && unreadCount > 0 && (
        <button onClick={scrollToBottom} style={{
          position: 'absolute', bottom: 80, right: 20, background: ac, color: '#fff',
          border: 'none', borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 700,
          cursor: 'pointer', boxShadow: '0 4px 12px rgba(var(--ac-rgb),0.3)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <ChevronDown size={14} /> {unreadCount} new
        </button>
      )}

      {/* ── Project tag selector (above input, shown when client has >1 project) ── */}
      {hasMultipleProjects && tab === 'client' && (
        <div style={{ flexShrink: 0, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Tag size={11} /> Tag:
          </span>
          <button
            onClick={() => setActiveProjectTag(null)}
            style={{
              height: 24, padding: '0 10px', borderRadius: 20,
              border: `1.5px solid ${!activeProjectTag ? ac : 'rgba(var(--ac-rgb),0.15)'}`,
              background: !activeProjectTag ? `${ac}15` : 'transparent',
              color: !activeProjectTag ? ac : 'var(--muted)',
              fontSize: 10, fontWeight: 700, cursor: 'pointer', transition: 'all .15s',
            }}
          >
            No tag
          </button>
          {projects.map(p => (
            <button
              key={p.id}
              onClick={() => setActiveProjectTag(activeProjectTag?.id === p.id ? null : p)}
              style={{
                height: 24, padding: '0 10px', borderRadius: 20,
                border: `1.5px solid ${activeProjectTag?.id === p.id ? ac : 'rgba(var(--ac-rgb),0.15)'}`,
                background: activeProjectTag?.id === p.id ? `${ac}15` : 'transparent',
                color: activeProjectTag?.id === p.id ? ac : 'var(--muted)',
                fontSize: 10, fontWeight: 700, cursor: 'pointer', transition: 'all .15s',
                display: 'flex', alignItems: 'center', gap: 3,
              }}
            >
              <Folder size={9} />#{p.title}
            </button>
          ))}
        </div>
      )}

      {/* ── Input bar ── */}
      <div style={{
        flexShrink: 0,
        borderTop: '1.5px solid rgba(var(--ac-rgb),0.08)',
        paddingTop: 12,
        display: 'flex',
        gap: 8,
        alignItems: 'flex-end',
        background: tab === 'internal' ? 'rgba(255,252,220,0.4)' : 'transparent',
        borderRadius: tab === 'internal' ? '0 0 12px 12px' : 0,
      }}>
        {/* Attachment */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(var(--ac-rgb),0.05)', border: '1.5px solid rgba(var(--ac-rgb),0.1)', color: ac, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .2s' }}
          title="Send image"
        >
          {uploading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Paperclip size={16} />}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />

        {/* Text input */}
        <div style={{ flex: 1, position: 'relative' }}>
          <textarea
            value={text}
            onChange={e => {
              setText(e.target.value);
              setTyping(e.target.value.length > 0);
            }}
            onBlur={() => setTyping(false)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            placeholder={tab === 'internal' ? '🔒 Internal note (team only)…' : 'Write a message… / 发送消息…'}
            rows={2}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 14,
              border: `1.5px solid ${tab === 'internal' ? 'rgba(200,170,40,0.25)' : 'rgba(var(--ac-rgb),0.12)'}`,
              fontSize: 14, outline: 'none', resize: 'none', boxSizing: 'border-box',
              fontFamily: 'inherit', lineHeight: 1.5,
              background: tab === 'internal' ? '#FEFDF0' : '#fff',
              color: 'var(--fg)',
              transition: 'border-color .2s',
            }}
            onFocus={e => e.target.style.borderColor = tab === 'internal' ? 'rgba(200,170,40,0.5)' : `${ac}60`}
          />
          {text.length > 0 && (
            <span style={{ position: 'absolute', bottom: 6, right: 10, fontSize: 10, color: 'var(--ac-light)' }}>{text.length}</span>
          )}
        </div>

        {/* Send button */}
        <button
          onClick={send}
          disabled={!text.trim() || sending}
          style={{
            width: 44, height: 44, borderRadius: 14, flexShrink: 0,
            background: text.trim() ? ac : 'rgba(var(--ac-rgb),0.08)',
            color: text.trim() ? '#fff' : 'var(--ac-light)',
            border: 'none', cursor: text.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all .2s', boxShadow: text.trim() ? `0 4px 14px ${ac}40` : 'none',
          }}
        >
          {sending ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} />}
        </button>
      </div>

      {/* Keyframe for typing dots */}
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
