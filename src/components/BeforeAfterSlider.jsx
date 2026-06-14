import React, { useState, useRef, useEffect } from 'react';

export default function BeforeAfterSlider({ before, after, labelBefore = "Before", labelAfter = "After", height = "400px" }) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef(null);

  const handleMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const newPos = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setPosition(newPos);
  };

  const handleMouseDown = () => {
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseUp = () => {
    window.removeEventListener('mousemove', handleMove);
    window.removeEventListener('mouseup', handleMouseUp);
  };

  const handleTouchStart = () => {
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleTouchEnd);
  };

  const handleTouchEnd = () => {
    window.removeEventListener('touchmove', handleMove);
    window.removeEventListener('touchend', handleTouchEnd);
  };

  return (
    <div 
      ref={containerRef}
      style={{ 
        position: 'relative', width: '100%', height, overflow: 'hidden', 
        borderRadius: 24, cursor: 'ew-resize', userSelect: 'none',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* AFTER IMAGE (Background) */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${after})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
      
      {/* BEFORE IMAGE (Foreground Clip) */}
      <div style={{ 
        position: 'absolute', inset: 0, backgroundImage: `url(${before})`, backgroundSize: 'cover', backgroundPosition: 'center',
        width: `${position}%`, borderRight: '2px solid #fff'
      }} />

      {/* LABELS */}
      <div style={{ position: 'absolute', left: 20, bottom: 20, background: 'rgba(0,0,0,0.5)', color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>{labelBefore}</div>
      <div style={{ position: 'absolute', right: 20, bottom: 20, background: 'rgba(92, 58, 33, 0.8)', color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>{labelAfter}</div>

      {/* SLIDER HANDLE */}
      <div style={{ 
        position: 'absolute', left: `${position}%`, top: 0, bottom: 0, width: 2, background: '#fff', 
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, transform: 'translateX(-50%)'
      }}>
         <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(0,0,0,0.2)' }}>
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: `var(--accent-secondary)`, margin: '0 2px' }} />
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: `var(--accent-secondary)`, margin: '0 2px' }} />
         </div>
      </div>
    </div>
  );
}
