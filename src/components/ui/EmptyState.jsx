import React from 'react';

export default function EmptyState({ icon, title, description, action, style = {} }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '60px 24px', textAlign: 'center', gap: 16, ...style
    }}>
      {icon && (
        <div style={{
          width: 64, height: 64, borderRadius: 20, background: 'color-mix(in srgb, var(--ac, var(--accent-secondary)) 8%, transparent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ac, var(--accent-secondary))', marginBottom: 4
        }}>
          {icon}
        </div>
      )}
      <div>
        <div className="lxfh" style={{ fontSize: 16, fontWeight: 700, color: `var(--accent-secondary)`, marginBottom: 6 }}>{title}</div>
        {description && <div className="lxf" style={{ fontSize: 13, color: `var(--text-secondary)`, lineHeight: 1.6, maxWidth: 320 }}>{description}</div>}
      </div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          style={{
            marginTop: 8, padding: '10px 20px', background: `var(--accent-secondary)`, color: '#fff',
            border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8
          }}
        >
          {action.icon && action.icon}
          {action.label}
        </button>
      )}
    </div>
  );
}
