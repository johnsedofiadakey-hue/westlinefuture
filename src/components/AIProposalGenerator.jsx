import React, { useState, useEffect } from 'react';
import { 
  Sparkles, ArrowRight, ArrowLeft, Check, 
  Layers, Ruler, Palette, FileText, Send 
} from 'lucide-react';
import { PModal, FF as PFormField, Spinner } from './Shared';
import { AIEngine } from '../lib/AIEngine';

const PROJECT_TYPES = [
  { id: 'glass-partition', name: 'Glass Partitioning', base: 450, desc: 'Office or residential spatial separation' },
  { id: 'balustrade', name: 'Glass Balustrade', base: 600, desc: 'Staircase or balcony safety glass' },
  { id: 'shower', name: 'Luxury Shower Enclosure', base: 850, desc: 'Frameless custom shower solutions' },
  { id: 'skylight', name: 'Architectural Skylight', base: 1200, desc: 'Walk-on or overhead glazing' },
];

const FINISHES = [
  { id: 'std', name: 'Standard Clear', multi: 1 },
  { id: 'tint', name: 'Smoked / Bronze Tint', multi: 1.25 },
  { id: 'frosted', name: 'Acid Etched / Frosted', multi: 1.15 },
  { id: 'low-iron', name: 'Ultra-Clear (Low Iron)', multi: 1.4 },
];

export default function AIProposalGenerator({ open, onClose, onSubmit, brand, initialData = {} }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    type: 'glass-partition',
    dims: { width: 5, height: 2.5 },
    finish: 'std',
    hardware: 'premium-black',
    clientName: initialData.clientName || '',
    projectTitle: initialData.projectTitle || '',
    projectId: initialData.projectId || null
  });
  
  // Update data when initialData changes (if modal is reused)
  useEffect(() => {
    if (open && initialData) {
      setData(prev => ({
        ...prev,
        clientName: initialData.clientName || prev.clientName,
        projectTitle: initialData.projectTitle || prev.projectTitle,
        projectId: initialData.projectId || prev.projectId
      }));
    }
  }, [open, initialData]);

  const [isGenerating, setIsGenerating] = useState(false);

  const selectedType = PROJECT_TYPES.find(t => t.id === data.type);
  const selectedFinish = FINISHES.find(f => f.id === data.finish);
  
  const estimatedCost = (selectedType?.base || 0) * (data.dims.width * data.dims.height) * (selectedFinish?.multi || 1);
  const ac = brand.color || '#0F766E';

  const handleNext = () => setStep(step + 1);
  const handleBack = () => setStep(step - 1);

  const generateProposal = async () => {
    setIsGenerating(true);
    
    // Construct a project profile for the AI
    const projectProfile = {
      title: data.projectTitle,
      type: data.type.includes('commercial') ? 'Commercial' : 'Residential',
      specs: {
        glassType: selectedFinish.name,
        dimensions: `${data.dims.width}m x ${data.dims.height}m`
      }
    };

    const aiText = await AIEngine.generateProposal(projectProfile);
    
    onSubmit({
      title: data.projectTitle || `${selectedType.name} Project`,
      client: data.clientName,
      amount: `$${estimatedCost.toLocaleString(undefined, {minimumFractionDigits: 2})}`,
      category: selectedType.name,
      description: aiText,
      items: [
        { desc: `${selectedType.name} - ${selectedFinish.name} Finish`, qty: (data.dims.width * data.dims.height).toFixed(1), rate: `$${((selectedType.base * selectedFinish.multi)).toFixed(2)}`, total: `$${estimatedCost.toLocaleString()}` }
      ],
      status: 'pending',
      date: new Date().toLocaleDateString()
    });
    
    setIsGenerating(false);
    onClose();
    setStep(1); // Reset for next time
  };

  return (
    <PModal open={open} onClose={onClose} title="AI Smart Proposal Genesis" w={640}>
      <div style={{ padding: '8px 0' }}>
        
        {/* PROGRESS MINI */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 32 }}>
          {[1,2,3].map(s => (
            <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: step >= s ? ac : '#E5E7EB', transition: 'all .3s' }} />
          ))}
        </div>

        {step === 1 && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
               <div style={{ width: 40, height: 40, borderRadius: 10, background: `${ac}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: ac }}><Layers size={20} /></div>
               <div>
                  <h4 className="lxfh" style={{ fontSize: 18, color: '#111827' }}>What are we building today?</h4>
                  <p className="lxf" style={{ fontSize: 12, color: '#6B7280' }}>Select a project primary typology</p>
               </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
               {PROJECT_TYPES.map(t => (
                 <div 
                   key={t.id} 
                   onClick={() => setData({...data, type: t.id})}
                   style={{ 
                     padding: 16, borderRadius: 12, border: `1.5px solid ${data.type === t.id ? ac : '#E5E0DA'}`, 
                     background: data.type === t.id ? `${ac}08` : '#fff', cursor: 'pointer', transition: 'all .2s'
                   }}
                 >
                    <div className="lxf" style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{t.name}</div>
                    <div className="lxf" style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>{t.desc}</div>
                 </div>
               ))}
            </div>
            <button onClick={handleNext} className="p-btn-dark lxf" style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>Next: Technical Specs <ArrowRight size={16} /></button>
          </div>
        )}

        {step === 2 && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
               <div style={{ width: 40, height: 40, borderRadius: 10, background: `${ac}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: ac }}><Ruler size={20} /></div>
               <div>
                  <h4 className="lxfh" style={{ fontSize: 18, color: '#111827' }}>Technical Specifications</h4>
                  <p className="lxf" style={{ fontSize: 12, color: '#6B7280' }}>Dimensions and material finishing</p>
               </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
               <PFormField label="Width (meters)"><input className="p-inp" type="number" step="0.1" value={data.dims.width} onChange={e => setData({...data, dims: {...data.dims, width: parseFloat(e.target.value)}})} /></PFormField>
               <PFormField label="Height (meters)"><input className="p-inp" type="number" step="0.1" value={data.dims.height} onChange={e => setData({...data, dims: {...data.dims, height: parseFloat(e.target.value)}})} /></PFormField>
            </div>
            <div className="lxf" style={{ fontSize: 10, textTransform: 'uppercase', color: '#6B7280', letterSpacing: '.1em', marginTop: 4 }}>Glass Finishing</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
               {FINISHES.map(f => (
                 <button 
                  key={f.id}
                  onClick={() => setData({...data, finish: f.id})}
                  className="lxf"
                  style={{ 
                    padding: '8px 12px', borderRadius: 8, fontSize: 11, 
                    border: `1px solid ${data.finish === f.id ? ac : '#E5E0DA'}`,
                    background: data.finish === f.id ? ac : '#fff',
                    color: data.finish === f.id ? '#fff' : '#111827',
                    cursor: 'pointer'
                  }}
                 >{f.name}</button>
               ))}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
               <button onClick={handleBack} className="p-btn-light" style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ArrowLeft size={18} /></button>
               <button onClick={handleNext} className="p-btn-dark lxf" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>Finalizing Proposal <ArrowRight size={16} /></button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
               <div style={{ width: 40, height: 40, borderRadius: 10, background: '#16A34A15', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16A34A' }}><Sparkles size={20} /></div>
               <div>
                  <h4 className="lxfh" style={{ fontSize: 18, color: '#111827' }}>Genesis Complete</h4>
                  <p className="lxf" style={{ fontSize: 12, color: '#6B7280' }}>Ready to generate professional documentation</p>
               </div>
            </div>
            <div className="p-card" style={{ padding: 20, background: '#111827', color: '#fff' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' }}>
                  <div className="lxf" style={{ fontSize: 11, color: ac, fontWeight: 700, letterSpacing: '.1em' }}>SMART ESTIMATION</div>
                  <div className="lxf" style={{ fontSize: 24, fontWeight: 700 }}>${estimatedCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
               </div>
               <div className="lxf" style={{ fontSize: 13, borderTop: '1px solid rgba(255,255,255,.08)', paddingTop: 12, lineHeight: 1.6, opacity: 0.8 }}>
                  Our AI engine has matched your specs against current material benchmarks. This includes the {selectedType.name} base configuration with a {selectedFinish.name} texture multi-pass.
               </div>
            </div>
            <PFormField label="Client Full Name"><input className="p-inp" value={data.clientName} onChange={e => setData({...data, clientName: e.target.value})} placeholder="e.g. Ama Serwaa" /></PFormField>
            <PFormField label="Project / Lead Title"><input className="p-inp" value={data.projectTitle} onChange={e => setData({...data, projectTitle: e.target.value})} placeholder="e.g. Ridge Penthouse Partitioning" /></PFormField>
            
            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
               <button onClick={handleBack} disabled={isGenerating} className="p-btn-light" style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ArrowLeft size={18} /></button>
               <button onClick={generateProposal} disabled={isGenerating} className="p-btn-gold lxf" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: ac, border: 'none', color: '#fff' }}>
                 {isGenerating ? <><Spinner /> AI Drafting Output...</> : <><Send size={16} /> Generate & Review Proposal</>}
               </button>
            </div>
          </div>
        )}

      </div>
    </PModal>
  );
}
