/**
 * WorldClassChat — WeChat-style project messaging
 *
 * Features:
 *  • Live Firestore subscription (projects/{id}/messages)
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
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send, Loader2, Globe, ThumbsUp, Heart, Smile, Image as ImageIcon,
  X, ChevronDown, Lock, MessageSquare, StickyNote, CheckCheck, Check,
  RefreshCw, Paperclip
} from 'lucide-react';
import {
  collection, query, orderBy, onSnapshot, addDoc, updateDoc,
  doc, serverTimestamp, setDoc, deleteDoc, getDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { sanitizeText } from '../lib/sanitize';

// ── Language detection ─────────────────────────────────────────────────────────
const CJK_RE = /[一-鿿㐀-䶿！-￯　-〿]/;
export const detectLang = (text) => (CJK_RE.test(text) ? 'zh-CN' : 'en');

// ── Translation (MyMemory API — free, 10k words/day) ──────────────────────────
const translationCache = new Map();
export const translateText = async (text, targetLang) => {
  if (!text?.trim()) return null;
  const srcLang = detectLang(text);
  if (srcLang === targetLang) return null; // already target language
  const cacheKey = `${text}:${targetLang}`;
  if (translationCache.has(cacheKey)) return translationCache.get(cacheKey);
  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 500))}&langpair=${srcLang}|${targetLang}&de=noreply@westlinefuture.com`
    );
    const data = await res.json();
    const translated = data.responseData?.translatedText;
    if (translated && translated !== text) {
      translationCache.set(cacheKey, translated);
      return translated;
    }
    return null;
  } catch {
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
  const d = new Date(ts.seconds * 1000);
  const now = new Date();
  if (sameDay(d, now)) return 'Today';
  const yest = new Date(now); yest.setDate(now.getDate() - 1);
  if (sameDay(d, yest)) return 'Yesterday';
  return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
};

const timeStr = (ts) => {
  if (!ts?.seconds) return '';
  return new Date(ts.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// ── Typing indicator (Firestore presence) ─────────────────────────────────────
const TYPING_TTL = 4000;
const useTyping = (projectId, userId, userName) => {
  const timerRef = useRef(null);
  const setTyping = useCallback((isTyping) => {
    if (!db || !projectId || !userId) return;
    const tRef = doc(db, 'projects', projectId, 'typing', userId);
    if (isTyping) {
      setDoc(tRef, { name: userName || 'Someone', ts: Date.now() }, { merge: true });
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => deleteDoc(tRef).catch(() => {}), TYPING_TTL);
    } else {
      clearTimeout(timerRef.current);
      deleteDoc(tRef).catch(() => {});
    }
  }, [projectId, userId, userName]);
  return setTyping;
};

const useTypingPeers = (projectId, myId) => {
  const [peers, setPeers] = useState([]);
  useEffect(() => {
    if (!db || !projectId) return;
    const unsub = onSnapshot(collection(db, 'projects', projectId, 'typing'), (snap) => {
      const now = Date.now();
      const active = snap.docs
        .filter(d => d.id !== myId && (now - (d.data().ts || 0)) < TYPING_TTL)
        .map(d => d.data().name);
      setPeers(active);
    });
    return unsub;
  }, [projectId, myId]);
  return peers;
};

// ── Reaction emoji set ─────────────────────────────────────────────────────────
const REACTIONS = ['👍', '❤️', '😂', '😮', '🙏', '✅'];

// ── Single message bubble ──────────────────────────────────────────────────────
function Bubble({ msg, isMine, isSystem, accentColor, onReact, viewerLang = 'en' }) {
  const [translation, setTranslation] = useState(null);
  const [translating, setTranslating] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const reactionRef = useRef(null);
  const ac = accentColor || 'var(--accent-secondary)';

  const msgLang = detectLang(msg.text || '');
  const showTranslateBtn = !isSystem && msg.text?.length > 2;
  const canTranslate = msgLang !== viewerLang;

  const handleTranslate = async () => {
    if (translation) { setTranslation(null); return; }
    setTranslating(true);
    const result = await translateText(msg.text, viewerLang);
    setTranslation(result);
    setTranslating(false);
  };

  const reactions = msg.reactions || {};
  const totalReactions = Object.values(reactions).flat().length;

  // Close reaction picker on outside click
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

      {/* Translation */}
      {translation && (
        <div style={{
          maxWidth: '78%', fontSize: 12, color: 'var(--dim)', fontStyle: 'italic',
          background: 'rgba(var(--ac-rgb),0.04)', padding: '6px 12px',
          borderRadius: 10, borderLeft: `2px solid ${ac}60`,
          lineHeight: 1.5,
        }}>
          🌐 {translation}
        </div>
      )}

      {/* Meta row: time + translate + status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: isMine ? 0 : 4, paddingRight: isMine ? 4 : 0 }}>
        <span style={{ fontSize: 10, color: '#B8B6D8' }}>{timeStr(msg.createdAt)}</span>
        {showTranslateBtn && canTranslate && (
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
  project,
  user,
  accentColor,
  addProjectMessage,
  isAdmin = false,
  height = 480,
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

  // viewer language defaults to browser or brand lang
  const viewerLang = detectLang(''); // defaults to 'en'; override per user if needed

  // Typing indicator
  const userId = user?.uid || user?.id || 'anon';
  const userName = user?.name || user?.displayName || (isAdmin ? 'Westline Future' : 'Client');
  const setTyping = useTyping(project?.id, userId, userName);
  const typingPeers = useTypingPeers(project?.id, userId);

  // Live messages
  useEffect(() => {
    if (!db || !project?.id) { setMessages([]); return; }
    const q = query(collection(db, 'projects', project.id, 'messages'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMessages(all);
      // Mark unread
      const myRole = isAdmin ? 'admin' : 'client';
      const unread = all.filter(m => !m.isInternal && m.senderRole !== myRole && !m[`readBy${isAdmin ? 'Admin' : 'Client'}`]).length;
      setUnreadCount(unread);
      if (atBottom) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    });
    return unsub;
  }, [project?.id]);

  // Mark messages as read when scrolled to bottom
  const markRead = useCallback(async () => {
    if (!db || !project?.id || !atBottom) return;
    const myRole = isAdmin ? 'admin' : 'client';
    const readField = isAdmin ? 'readByAdmin' : 'readByClient';
    const toMark = messages.filter(m => !m.isInternal && m.senderRole !== myRole && !m[readField]);
    for (const m of toMark.slice(-5)) { // mark last 5 in batch
      try { await updateDoc(doc(db, 'projects', project.id, 'messages', m.id), { [readField]: true }); } catch (_) {}
    }
  }, [messages, project?.id, atBottom, isAdmin]);

  useEffect(() => { if (atBottom) markRead(); }, [atBottom, messages.length]);

  // Scroll tracking
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const isAt = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    setAtBottom(isAt);
  };

  // Scroll to bottom button
  const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' });

  // Visible messages by tab
  const visible = tab === 'internal'
    ? messages.filter(m => m.isInternal || m.senderRole === 'system')
    : messages.filter(m => !m.isInternal);

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
    const role = isAdmin ? (tab === 'internal' ? 'admin' : 'admin') : 'client';
    await addProjectMessage(project.id, text.trim(), role, tab === 'internal');
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
      const path = `projects/${project.id}/chat/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const imageUrl = await getDownloadURL(storageRef);
      const role = isAdmin ? 'admin' : 'client';
      await addDoc(collection(db, 'projects', project.id, 'messages'), {
        text: '',
        imageUrl,
        senderRole: role,
        senderId: userId,
        senderName: userName,
        isInternal: tab === 'internal',
        createdAt: serverTimestamp(),
      });
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 150);
    } catch (err) {
      console.error('[Chat] Image upload failed:', err.message);
    }
    setUploading(false);
    e.target.value = '';
  };

  // React to message
  const handleReact = async (msgId, emoji) => {
    if (!db || !project?.id) return;
    const msgRef = doc(db, 'projects', project.id, 'messages', msgId);
    const snap = await getDoc(msgRef);
    if (!snap.exists()) return;
    const data = snap.data();
    const reactions = data.reactions || {};
    const users = reactions[emoji] || [];
    const already = users.includes(userId);
    await updateDoc(msgRef, {
      [`reactions.${emoji}`]: already
        ? users.filter(u => u !== userId)
        : [...users, userId],
    });
  };

  const isEmpty = visible.length === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height, fontFamily: 'Inter, sans-serif' }}>

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
              {tab === 'internal' ? 'No internal notes yet' : 'Start the conversation'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, maxWidth: 240 }}>
              {tab === 'internal'
                ? 'Leave notes for your team. Clients cannot see these.'
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
