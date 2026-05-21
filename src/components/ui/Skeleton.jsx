import React from 'react';

// Inject keyframes once at module load — not on every render
if (typeof document !== 'undefined' && !document.getElementById('skeleton-pulse-css')) {
  const s = document.createElement('style');
  s.id = 'skeleton-pulse-css';
  s.textContent = '@keyframes skeleton-pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }';
  document.head.appendChild(s);
}

function SkeletonBlock({ width = '100%', height = 16, radius = 8, style = {} }) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: 'linear-gradient(90deg, #F0EBE5 25%, #F4F4FA 50%, #F0EBE5 75%)',
      backgroundSize: '200% 100%',
      animation: 'skeleton-pulse 1.5s ease-in-out infinite',
      flexShrink: 0,
      ...style
    }} />
  );
}

export function SkeletonCard({ lines = 3 }) {
  return (
    <div style={{ padding: 20, background: '#fff', borderRadius: 16, border: '1px solid #F0EBE5', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <SkeletonBlock width={40} height={40} radius={12} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SkeletonBlock width="60%" height={14} />
          <SkeletonBlock width="40%" height={11} />
        </div>
      </div>
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <SkeletonBlock key={i} width={i % 2 === 0 ? '90%' : '70%'} height={12} />
      ))}
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 0', borderBottom: '1px solid #F4F4FA' }}>
      <SkeletonBlock width={36} height={36} radius={10} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <SkeletonBlock width="50%" height={13} />
        <SkeletonBlock width="30%" height={10} />
      </div>
      <SkeletonBlock width={60} height={24} radius={8} />
    </div>
  );
}

export function SkeletonList({ rows = 5 }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => <SkeletonRow key={i} />)}
    </div>
  );
}

export function SkeletonGrid({ cols = 3, rows = 2 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16 }}>
      {Array.from({ length: cols * rows }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}

export default SkeletonBlock;
