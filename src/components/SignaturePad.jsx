import React, { useRef, useState, useEffect } from 'react';
import { Trash2, CheckCircle, PenTool } from 'lucide-react';

export default function SignaturePad({ onSave, onClear, saveLabel = "Save & Verify", disabled = false, ac = `var(--accent-secondary)` }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [ctx, setCtx] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.strokeStyle = `var(--accent-secondary)`;
    context.lineWidth = 2.5;
    context.lineCap = 'round';
    setCtx(context);

    // Adjust for High DPI
    const ratio = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    context.scale(ratio, ratio);
  }, []);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDrawing = (e) => {
    if (disabled) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    e.preventDefault();
  };

  const draw = (e) => {
    if (!isDrawing || disabled) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    e.preventDefault();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    ctx.closePath();
  };

  const clear = () => {
    if (disabled) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    onClear && onClear();
  };

  const save = () => {
    if (disabled) return;
    // Check if the canvas is blank
    const canvas = canvasRef.current;
    const blank = document.createElement('canvas');
    blank.width = canvas.width;
    blank.height = canvas.height;
    if (canvas.toDataURL() === blank.toDataURL()) {
      alert("Please provide your signature before saving.");
      return;
    }
    const image = canvas.toDataURL('image/png');
    onSave && onSave(image);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ 
        border: '1px dashed var(--border)', 
        borderRadius: 16, 
        background: '#fff', 
        height: 240, 
        position: 'relative',
        overflow: 'hidden',
        cursor: disabled ? 'not-allowed' : 'crosshair',
        touchAction: 'none'
      }}>
        <canvas 
          ref={canvasRef}
          style={{ width: '100%', height: '100%' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        <div style={{ position: 'absolute', bottom: 12, right: 12, color: 'var(--muted)', fontSize: 10, pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
           <PenTool size={10} /> SIGN WITHIN THIS AREA
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button 
          onClick={clear}
          className="p-btn-light" 
          disabled={disabled}
          style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: disabled ? 'default' : 'pointer' }}
        >
          <Trash2 size={16} /> Clear Signature
        </button>
        <button 
          onClick={save}
          className="p-btn-dark"
          disabled={disabled}
          style={{ padding: '8px 24px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, borderRadius: 100, background: disabled ? 'var(--border)' : 'var(--accent-secondary)', color: '#fff', border: 'none', cursor: disabled ? 'default' : 'pointer' }}
        >
          <CheckCircle size={16} /> {saveLabel}
        </button>
      </div>
    </div>
  );
}
