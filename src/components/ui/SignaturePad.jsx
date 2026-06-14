import React, { useRef, useState, useEffect } from 'react';
import { RotateCcw, Check, Sparkles } from 'lucide-react';

export default function SignaturePad({ onSave, onClose, brand }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const ac = brand?.color || `var(--accent-secondary)`;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Support high-DPI displays
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#272522'; // Dark charcoal signature ink
    ctx.lineWidth = 2.5;
  }, []);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    if (e.touches && e.touches[0]) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setIsEmpty(false);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  };

  const save = () => {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) return;
    
    // Extract base64 high-res PNG image
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(24, 20, 16, 0.65)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ 
        background: '#fff', 
        borderRadius: 28, 
        width: '100%', 
        maxWidth: 500, 
        padding: 32, 
        boxShadow: '0 40px 100px rgba(0,0,0,0.25)',
        border: '1px solid var(--border-color)',
        animation: 'slideInUp 0.3s ease-out'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'inline-flex', width: 44, height: 44, borderRadius: '50%', background: `${ac}12`, color: ac, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Sparkles size={20} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 900, color: `var(--accent-secondary)`, margin: 0 }}>Draw Your Signature</h3>
          <p style={{ fontSize: 13, color: `var(--text-secondary)`, marginTop: 6, marginBottom: 0 }}>Use your finger or stylus to sign on the pad below</p>
        </div>

        {/* Canvas Area */}
        <div style={{ 
          position: 'relative', 
          background: '#FAF9F6', 
          border: '2px dashed var(--border-color)', 
          borderRadius: 20, 
          overflow: 'hidden',
          marginBottom: 20,
          touchAction: 'none'
        }}>
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            style={{
              width: '100%',
              height: 220,
              display: 'block',
              cursor: 'crosshair'
            }}
          />
          {isEmpty && (
            <div style={{ 
              position: 'absolute', 
              inset: 0, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              pointerEvents: 'none',
              fontSize: 12,
              color: '#DFD9D1',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '.06em'
            }}>
              Sign Here
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button 
            onClick={clear}
            disabled={isEmpty}
            style={{ 
              flex: 1, 
              height: 48, 
              borderRadius: 14, 
              border: '1.5px solid var(--border-color)', 
              background: '#fff', 
              color: isEmpty ? `var(--border-color)` : `var(--accent-secondary)`, 
              fontSize: 13, 
              fontWeight: 800, 
              cursor: isEmpty ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s'
            }}
          >
            <RotateCcw size={14} /> Clear
          </button>
          
          <button 
            onClick={save}
            disabled={isEmpty}
            style={{ 
              flex: 2, 
              height: 48, 
              borderRadius: 14, 
              border: 'none', 
              background: isEmpty ? `var(--border-color)` : ac, 
              color: '#fff', 
              fontSize: 14, 
              fontWeight: 900, 
              cursor: isEmpty ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: isEmpty ? 'none' : `0 4px 14px ${ac}40`,
              transition: 'all 0.2s'
            }}
          >
            <Check size={16} /> Confirm Signature
          </button>
        </div>

        {/* Cancel Button */}
        <button 
          onClick={onClose}
          style={{ 
            width: '100%', 
            marginTop: 16, 
            height: 40, 
            borderRadius: 12, 
            border: 'none', 
            background: 'none', 
            color: `var(--text-secondary)`, 
            fontSize: 12, 
            fontWeight: 700, 
            cursor: 'pointer' 
          }}
        >
          Cancel & Close
        </button>

      </div>
    </div>
  );
}
