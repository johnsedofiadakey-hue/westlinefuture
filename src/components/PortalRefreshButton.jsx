import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';

export default function PortalRefreshButton({ bottomOffset = 24, align = 'right' }) {
  const [loading, setLoading] = useState(false);

  const handleRefresh = () => {
    if (loading) return;
    setLoading(true);
    setTimeout(() => window.location.reload(), 800);
  };

  const side = align === 'left' ? { left: 20 } : { right: 20 };

  return (
    <>
      <style>{`
        @keyframes prb-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes prb-bar  { from { width: 0%; } to   { width: 85%; } }
        .prb-icon-spin { animation: prb-spin 0.7s linear infinite; }
        .prb-btn:hover  { opacity: 1 !important; transform: scale(1.08); }
        .prb-btn:active { transform: scale(0.94); }
        .prb-bar-fill   { animation: prb-bar 0.75s cubic-bezier(.4,0,.2,1) forwards; }
      `}</style>

      {/* Thin top progress bar — only shows while loading */}
      {loading && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: 3,
          background: 'var(--border-color, #E5E0D8)',
          zIndex: 99999, overflow: 'hidden',
        }}>
          <div className="prb-bar-fill" style={{
            height: '100%',
            background: 'linear-gradient(90deg, var(--accent-primary, #C5A880), var(--accent-secondary, #4A3B32))',
            borderRadius: '0 2px 2px 0',
          }} />
        </div>
      )}

      <button
        className="prb-btn"
        onClick={handleRefresh}
        title="Refresh"
        style={{
          position: 'fixed',
          bottom: bottomOffset,
          ...side,
          zIndex: 9000,
          width: 38,
          height: 38,
          borderRadius: '50%',
          border: '1.5px solid var(--border-color, #E5E0D8)',
          background: 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.09)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: loading ? 'default' : 'pointer',
          opacity: 0.65,
          transition: 'opacity .2s, transform .15s',
          padding: 0,
        }}
      >
        <RefreshCw
          size={15}
          color="var(--accent-secondary, #4A3B32)"
          className={loading ? 'prb-icon-spin' : ''}
          style={{ flexShrink: 0 }}
        />
      </button>
    </>
  );
}
