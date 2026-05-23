function StaffPasswordModal({ member, ac, onClose, handleSetPassword, notify, pwVisible, setPwVisible, newPwInputs, setNewPwInputs, pwSaving }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 400, boxShadow: '0 32px 80px rgba(0,0,0,.2)', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Manage Password</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="var(--text-secondary)" /></button>
        </div>
        
        {member.tempPassword ? (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', marginBottom: 8 }}>Current Password</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <code style={{
                flex: 1, padding: '10px 14px', borderRadius: 12,
                background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                fontSize: 14, fontFamily: 'monospace', letterSpacing: 1,
                filter: pwVisible[member.id] ? 'none' : 'blur(5px)',
                userSelect: pwVisible[member.id] ? 'text' : 'none',
                transition: 'filter .2s'
              }}>{member.tempPassword}</code>
              <button onClick={() => setPwVisible(s => ({ ...s, [member.id]: !s[member.id] }))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}>
                {pwVisible[member.id] ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              <button onClick={() => { navigator.clipboard.writeText(member.tempPassword); notify?.('success', 'Password copied!'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }} title="Copy">
                <Copy size={18} />
              </button>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: `var(--text-secondary)`, marginBottom: 20, fontStyle: 'italic', padding: 12, background: 'var(--bg-secondary)', borderRadius: 8 }}>No stored password — use the field below to set one.</div>
        )}

        <div style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', marginBottom: 8 }}>Set New Password</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="Min. 6 characters"
            value={newPwInputs[member.id] || ''}
            onChange={e => setNewPwInputs(s => ({ ...s, [member.id]: e.target.value }))}
            style={{
              flex: 1, height: 44, padding: '0 14px', borderRadius: 12,
              border: '2px solid var(--border-color)', fontSize: 14,
              fontFamily: 'monospace', outline: 'none'
            }}
          />
          <button
            onClick={() => handleSetPassword(member, newPwInputs[member.id] || '')}
            disabled={pwSaving[member.id] || (newPwInputs[member.id] || '').length < 6}
            style={{
              height: 44, padding: '0 20px', borderRadius: 12, border: 'none',
              background: (newPwInputs[member.id] || '').length >= 6 ? ac : `var(--border-color)`,
              color: (newPwInputs[member.id] || '').length >= 6 ? `var(--accent-secondary)` : `var(--text-secondary)`,
              fontSize: 13, fontWeight: 800, cursor: 'pointer'
            }}
          >
            {pwSaving[member.id] ? 'Saving…' : 'Set'}
          </button>
        </div>
      </div>
    </div>
  );
}
