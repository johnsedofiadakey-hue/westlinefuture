import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const PulseTargetCard = ({ 
  label, 
  value, 
  target, 
  unit = '', 
  icon, 
  sub, 
  color = '#0F766E',
  trend = 0 
}) => {
  // Simple heuristic to extract numeric value for achievement calculation
  const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.]/g, '')) : value;
  const achievement = target ? Math.round((numericValue / target) * 100) : null;
  
  return (
    <div className="glass-card pulse-glow" style={{ padding: '24px', minHeight: '140px', display: 'flex', flexDirection: 'column' }}>
      <div className="pulse-inner" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="lxf" style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#6B7280' }}>{label}</span>
            <div className="lxfh" style={{ fontSize: 28, marginBottom: 0, color: '#111827' }}>{value}{unit}</div>
          </div>
          <div style={{ 
            width: 40, height: 40, borderRadius: 12, background: `${color}15`, 
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: color 
          }}>
            {icon}
          </div>
        </div>

        <div style={{ marginTop: 'auto' }}>
          {achievement !== null && (
            <div style={{ marginBottom: trend !== 0 ? 12 : 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span className="lxf" style={{ fontSize: 10, color: '#6B7280', fontWeight: 600 }}>ACHIEVEMENT</span>
                <span className="lxf" style={{ fontSize: 10, fontWeight: 800, color: achievement >= 100 ? '#16A34A' : color }}>{achievement}%</span>
              </div>
              <div className="prog" style={{ height: 4, background: 'rgba(0,0,0,.04)', overflow: 'visible' }}>
                <div className="prog-f" style={{ 
                  width: `${Math.min(achievement, 100)}%`, 
                  background: achievement >= 100 ? '#16A34A' : color,
                  boxShadow: achievement >= 80 ? `0 0 12px ${achievement >= 100 ? 'rgba(22,163,74,0.4)' : `${color}40`}` : 'none',
                  position: 'relative'
                }}>
                  {achievement >= 90 && (
                    <div className="pulse" style={{ 
                      position: 'absolute', right: -4, top: -2, width: 8, height: 8, 
                      borderRadius: '50%', background: achievement >= 100 ? '#16A34A' : color,
                      boxShadow: `0 0 8px ${achievement >= 100 ? '#16A34A' : color}`
                    }} />
                  )}
                </div>
              </div>
            </div>
          )}
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {sub && (
              <div className="lxf" style={{ fontSize: 11, color: '#16A34A', display: 'flex', alignItems: 'center', gap: 6 }}>
                <div className="pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: '#16A34A' }} />
                {sub}
              </div>
            )}
            
            {trend !== 0 && (
              <div style={{ 
                display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', 
                borderRadius: 6, background: trend > 0 ? 'rgba(22,163,74,0.08)' : 'rgba(239,68,68,0.08)',
                color: trend > 0 ? '#16A34A' : '#EF4444',
                marginLeft: 'auto'
              }}>
                {trend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                <span className="lxf" style={{ fontSize: 11, fontWeight: 700 }}>{Math.abs(trend)}%</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PulseTargetCard;
