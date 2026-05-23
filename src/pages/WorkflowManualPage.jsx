import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageSquare, CreditCard, ClipboardList, Ruler, Layout, Compass, 
  FileImage, FileText, Briefcase, Layers, Palette, FileSpreadsheet, 
  Wrench, Camera, ChevronRight, ChevronLeft, Check, ArrowRight, ArrowLeft,
  Image, Compass as CompassIcon, Sliders
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PubNav, Footer } from '../components/PubLayout';
import { AppContext } from '../context/AppContext';
import { useWindowWidth, isMob, DARK_TEXT, AC } from './sharedHelpers';
import { DEFAULT_WORKFLOW } from '../data';

/* ── Lucide icon name → component map ── */
const ICON_MAP = {
  MessageSquare, CreditCard, ClipboardList, Ruler, Layout, Compass,
  FileImage, FileText, Briefcase, Layers, Palette, FileSpreadsheet,
  Wrench, Camera, Image, Sliders,
};

function resolveIcon(iconKey) {
  if (!iconKey) return MessageSquare;
  if (typeof iconKey === 'string') return ICON_MAP[iconKey] || MessageSquare;
  return iconKey; 
}

const PHASES = [
  "All Phases",
  "Sourcing Consultation & Intention",
  "Architectural Site Surveys",
  "Design, Layout & Renderings",
  "Sourcing & Material Procurement",
  "Styling, Installation & Shoot"
];

export default function WorkflowManualPage({ brand, user, onPortal, setPage, navigate: propNavigate, content: propContent }) {
  const navigate = propNavigate || useNavigate();
  const context = useContext(AppContext) || {};
  const actualBrand = brand || context.brand || {};
  const actualUser = user || context.user;
  const content = propContent || context.content || {};

  const [activeStep, setActiveStep] = useState(0);
  const [selectedPhase, setSelectedPhase] = useState("All Phases");
  const [menuOpen, setMenuOpen] = useState(false);
  const [displayMode, setDisplayMode] = useState("manual");

  const winW = useWindowWidth();
  const mob = isMob(winW);

  const rawSteps = (content?.workflow && content.workflow.length > 0)
    ? content.workflow
    : DEFAULT_WORKFLOW;

  const WORKFLOW_STEPS = rawSteps.map(s => ({
    ...s,
    icon: resolveIcon(s.icon)
  }));

  useEffect(() => {
    if (setPage) setPage('workflow');
  }, [setPage]);

  const filteredSteps = WORKFLOW_STEPS.filter(
    s => selectedPhase === "All Phases" || s.phase === selectedPhase
  );

  useEffect(() => {
    if (filteredSteps.length > 0) {
      const idxInFiltered = filteredSteps.findIndex(s => s.step === WORKFLOW_STEPS[activeStep]?.step);
      if (idxInFiltered === -1) {
        const match = filteredSteps.find(s => s.step >= WORKFLOW_STEPS[activeStep]?.step) || filteredSteps[filteredSteps.length - 1];
        const newIdx = WORKFLOW_STEPS.findIndex(s => s.step === match.step);
        setActiveStep(newIdx);
      }
    }
  }, [selectedPhase]);

  const currentStep = WORKFLOW_STEPS[activeStep] || WORKFLOW_STEPS[0];

  const handleNext = () => {
    const nextIdx = filteredSteps.findIndex(s => s.step === currentStep.step) + 1;
    if (nextIdx < filteredSteps.length) {
      const originalIdx = WORKFLOW_STEPS.findIndex(s => s.step === filteredSteps[nextIdx].step);
      setActiveStep(originalIdx);
    }
  };

  const handlePrev = () => {
    const prevIdx = filteredSteps.findIndex(s => s.step === currentStep.step) - 1;
    if (prevIdx >= 0) {
      const originalIdx = WORKFLOW_STEPS.findIndex(s => s.step === filteredSteps[prevIdx].step);
      setActiveStep(originalIdx);
    }
  };

  const currentPosInFiltered = filteredSteps.findIndex(s => s.step === currentStep?.step);
  const isFirst = currentPosInFiltered === 0;
  const isLast  = currentPosInFiltered === filteredSteps.length - 1;

  return (
    <div style={{ 
      background: 'var(--bg-primary)', 
      minHeight: '100vh', 
      fontFamily: 'var(--font-primary, "Satoshi", "Inter", sans-serif)',
      color: 'var(--text-primary)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <PubNav 
        brand={actualBrand} 
        setPage={setPage} 
        activePage="workflow" 
        onPortal={onPortal} 
        user={actualUser} 
        menuOpen={menuOpen} 
        setMenuOpen={setMenuOpen} 
        navigate={navigate} 
      />

      {/* ── HERO BANNER ── */}
      <section style={{ 
        padding: mob ? '100px 24px 60px' : '160px 8vw 80px', 
        background: 'var(--bg-secondary)',
        textAlign: 'center',
        borderBottom: `1px solid var(--border-color)`
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <motion.span 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            style={{ 
              color: 'var(--accent-primary)', 
              fontSize: '11px', 
              fontWeight: 800, 
              letterSpacing: '0.4em', 
              textTransform: 'uppercase',
              display: 'block',
              marginBottom: '16px'
            }}
          >
            Westline Turnkey Engineering
          </motion.span>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }}
            style={{ 
              fontSize: mob ? '40px' : '64px', 
              fontWeight: 900, 
              letterSpacing: '-0.03em', 
              lineHeight: 1.1,
              margin: '0 0 24px',
              color: 'var(--text-primary)'
            }}
          >
            How We <span style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--accent-primary)' }}>Work</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.2 }}
            style={{ 
              fontSize: mob ? '15px' : '18px', 
              color: 'var(--text-secondary)', 
              maxWidth: '600px', 
              margin: '0 auto', 
              lineHeight: 1.7,
              fontWeight: 400
            }}
          >
            A high-fidelity layout showcasing our official 15-step Overall Case Design service workflow. Explore our blueprints, material checklists, and technical execution.
          </motion.p>
        </div>
      </section>

      {/* ── PHASE FILTER BAR ── */}
      <section style={{ 
        background: 'var(--bg-primary)', 
        padding: '16px 24px', 
        position: 'sticky', 
        top: mob ? '64px' : '80px', 
        zIndex: 90, 
        borderBottom: `1px solid var(--border-color)`,
        overflowX: 'auto',
        whiteSpace: 'nowrap'
      }}>
        <div style={{ 
          maxWidth: '1400px', 
          margin: '0 auto', 
          display: 'flex', 
          justifyContent: mob ? 'flex-start' : 'center', 
          gap: '8px',
          paddingBottom: mob ? '4px' : '0'
        }}>
          {PHASES.map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPhase(p)}
              style={{
                padding: '10px 20px',
                borderRadius: '30px',
                border: selectedPhase === p ? `1.5px solid var(--accent-primary)` : `1px solid var(--border-color)`,
                background: selectedPhase === p ? 'var(--bg-secondary)' : 'transparent',
                color: selectedPhase === p ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                flexShrink: 0
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </section>

      {/* ── MAIN INTERACTIVE CONTAINER ── */}
      <section style={{ 
        flex: 1,
        maxWidth: '1400px', 
        width: '100%', 
        margin: '0 auto', 
        padding: mob ? '32px 16px' : '80px 4vw',
        boxSizing: 'border-box'
      }}>
        {filteredSteps.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
            No steps found matching this phase filter.
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: mob ? '1fr' : '400px 1fr', 
            gap: mob ? '40px' : '60px',
            alignItems: 'start'
          }}>
            
            {/* ── LEFT COLUMN: STEP LIST ── */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px',
              maxHeight: mob ? 'auto' : 'calc(100vh - 280px)',
              overflowY: mob ? 'visible' : 'auto',
              paddingRight: mob ? '0' : '16px',
            }}>
              {filteredSteps.map((stepItem) => {
                const originalIndex = WORKFLOW_STEPS.findIndex(s => s.step === stepItem.step);
                const isSelected = activeStep === originalIndex;
                const IconComponent = stepItem.icon;
                
                return (
                  <motion.div
                    key={stepItem.step}
                    onClick={() => setActiveStep(originalIndex)}
                    whileHover={{ scale: 1.01 }}
                    style={{
                      padding: '16px 20px',
                      borderRadius: '16px',
                      background: isSelected ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                      border: isSelected ? `1.5px solid var(--accent-primary)` : `1px solid var(--border-color)`,
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      boxShadow: isSelected ? `0 10px 30px rgba(0,0,0,0.05)` : 'none'
                    }}
                  >
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: isSelected ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                      color: isSelected ? 'var(--bg-primary)' : 'var(--text-secondary)',
                      fontWeight: 800,
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {stepItem.step}
                    </div>

                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ 
                        fontSize: '10px', 
                        fontWeight: 800, 
                        color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)', 
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        marginBottom: '4px'
                      }}>
                        Phase {PHASES.indexOf(stepItem.phase)}
                      </div>
                      <div style={{ 
                        fontSize: '15px', 
                        fontWeight: 700, 
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {stepItem.title}
                      </div>
                    </div>

                    <div style={{ color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)', flexShrink: 0 }}>
                      <IconComponent size={20} />
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* ── RIGHT COLUMN: ACTIVE DETAILS PANEL ── */}
            <div style={{ position: mob ? 'relative' : 'sticky', top: mob ? '0' : '200px' }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep.step}
                  initial={{ opacity: 0, scale: 0.98, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: -10 }}
                  transition={{ duration: 0.4 }}
                  style={{
                    background: 'var(--bg-primary)',
                    borderRadius: '24px',
                    border: `1px solid var(--border-color)`,
                    overflow: 'hidden',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.06)'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    background: 'var(--bg-secondary)',
                    padding: '16px 24px',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: `1px solid var(--border-color)`
                  }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      Visual Output
                    </span>
                    <div style={{ display: 'flex', background: 'var(--bg-primary)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                      <button
                        onClick={() => setDisplayMode("manual")}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 16px',
                          border: 'none',
                          borderRadius: '8px',
                          background: displayMode === "manual" ? 'var(--accent-primary)' : 'transparent',
                          color: displayMode === "manual" ? 'var(--bg-primary)' : 'var(--text-secondary)',
                          fontSize: '11px',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          cursor: 'pointer',
                          transition: 'all 0.3s'
                        }}
                      >
                        <CompassIcon size={14} /> Schematic
                      </button>
                      <button
                        onClick={() => setDisplayMode("render")}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 16px',
                          border: 'none',
                          borderRadius: '8px',
                          background: displayMode === "render" ? 'var(--accent-primary)' : 'transparent',
                          color: displayMode === "render" ? 'var(--bg-primary)' : 'var(--text-secondary)',
                          fontSize: '11px',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          cursor: 'pointer',
                          transition: 'all 0.3s'
                        }}
                      >
                        <Image size={14} /> Render
                      </button>
                    </div>
                  </div>

                  {/* IMAGE CONTAINER */}
                  <div style={{ 
                    position: 'relative', 
                    height: mob ? '280px' : '480px', 
                    overflow: 'hidden',
                    background: displayMode === 'manual' ? '#fff' : 'var(--bg-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderBottom: '1px solid var(--border-color)'
                  }}>
                    <AnimatePresence mode="wait">
                      {displayMode === "manual" ? (
                        <motion.img 
                          key="pdf"
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          src={currentStep.pdfImg} 
                          alt={currentStep.title} 
                          style={{ 
                            maxWidth: '100%', 
                            maxHeight: '100%', 
                            objectFit: 'contain',
                            padding: '24px',
                            display: 'block'
                          }}
                        />
                      ) : (
                        <motion.img 
                          key="render"
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          src={currentStep.renderImg} 
                          alt={currentStep.title} 
                          style={{ 
                            width: '100%', 
                            height: '100%', 
                            objectFit: 'cover',
                            display: 'block'
                          }}
                        />
                      )}
                    </AnimatePresence>

                    {/* Gradient Overlay for Render Mode */}
                    {displayMode === "render" && (
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: `linear-gradient(to bottom, rgba(0,0,0,0) 40%, rgba(0,0,0,0.7) 100%)`
                      }} />
                    )}

                    <div style={{
                      position: 'absolute',
                      bottom: '24px',
                      left: '24px',
                      right: '24px'
                    }}>
                      <div style={{ 
                        fontSize: mob ? '22px' : '32px', 
                        fontWeight: 900, 
                        color: displayMode === "render" ? '#fff' : 'var(--text-primary)', 
                        letterSpacing: '-0.02em', 
                        textShadow: displayMode === "render" ? '0 4px 12px rgba(0,0,0,0.5)' : 'none'
                      }}>
                        Step {currentStep.step}: {currentStep.title}
                      </div>
                    </div>
                  </div>

                  {/* DETAILS TEXT */}
                  <div style={{ padding: mob ? '24px' : '40px' }}>
                    <p style={{
                      fontSize: mob ? '15px' : '17px',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.8,
                      marginBottom: '32px',
                      fontWeight: 400,
                      whiteSpace: 'pre-line'
                    }}>
                      {currentStep.desc}
                    </p>

                    <div style={{ 
                      borderTop: `1px solid var(--border-color)`, 
                      paddingTop: '32px',
                      marginBottom: '24px'
                    }}>
                      <h4 style={{ 
                        fontSize: '12px', 
                        fontWeight: 800, 
                        color: 'var(--accent-primary)', 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.15em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <Check size={16} strokeWidth={3} /> Key Deliverables & Process
                      </h4>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {currentStep.deliverables.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: 'var(--accent-primary)',
                            marginTop: '6px',
                            flexShrink: 0
                          }} />
                          <span style={{ 
                            fontSize: '15px', 
                            color: 'var(--text-primary)',
                            lineHeight: 1.5,
                            fontWeight: 500
                          }}>
                            {item}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* PREV / NEXT CONTROLS */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      marginTop: '48px',
                      paddingTop: '32px',
                      borderTop: `1px solid var(--border-color)`
                    }}>
                      <button
                        onClick={handlePrev}
                        disabled={isFirst}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: isFirst ? 'var(--border-color)' : 'var(--text-secondary)',
                          cursor: isFirst ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '13px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          transition: 'all 0.3s'
                        }}
                      >
                        <ArrowLeft size={18} /> Back
                      </button>

                      {isLast ? (
                        <button
                          onClick={() => navigate('/?page=contact')}
                          style={{
                            background: 'var(--accent-secondary)',
                            color: '#fff',
                            border: 'none',
                            padding: '14px 28px',
                            borderRadius: '12px',
                            fontWeight: 800,
                            fontSize: '12px',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            transition: 'all 0.3s',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
                          }}
                          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                          Book Consultation <ArrowRight size={16} />
                        </button>
                      ) : (
                        <button
                          onClick={handleNext}
                          style={{
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)',
                            padding: '10px 20px',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '12px',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            transition: 'all 0.3s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--border-color)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                        >
                          Next Step <ArrowRight size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        )}
      </section>

      <Footer 
        brand={actualBrand} 
        setPage={setPage} 
        onPortal={onPortal} 
        navigate={navigate} 
      />
    </div>
  );
}
