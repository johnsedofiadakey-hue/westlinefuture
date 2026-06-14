/**
 * STAGE ID CONSTANTS
 *
 * Replaces hardcoded magic numbers like `stageId === 3` throughout the codebase.
 * These are the 8 stages in the CLIENT_PROJECT_STAGES system (see App.jsx).
 *
 * DO NOT CHANGE THESE IDs — they are persisted in Firestore on projects.
 * If you need to rename stages, add a new name map rather than changing IDs.
 */

// Stage IDs (1–8)
export const STAGE = {
  SURVEY: 1,
  DESIGN_RENDERING: 2,
  QUOTE_DEPOSIT: 3,
  PRODUCTION: 4,
  SHIPPING: 5,
  INSTALLATION: 6,
  INSPECTION: 7,
  HANDOVER: 8,
};

// Compatibility aliases for older imports. New code should use the canonical names above.
STAGE.INQUIRY_INTAKE = STAGE.SURVEY;
STAGE.QUOTATION = STAGE.DESIGN_RENDERING;
STAGE.DEPOSIT_PAID = STAGE.QUOTE_DEPOSIT;
STAGE.PRE_DELIVERY = STAGE.SHIPPING;
STAGE.COMPLETION = STAGE.HANDOVER;

// Aliases for backward compatibility
export const STAGES = STAGE;

/**
 * Stage metadata — keys match STAGE values
 * Used for UI labels, colors, and business logic checks
 */
export const STAGE_METADATA = {
  [STAGE.SURVEY]: { name: 'Onboarding, Payment & Site Survey', color: '#78716C' },
  [STAGE.DESIGN_RENDERING]: { name: '3D Rendering Review', color: '#9333EA' },
  [STAGE.QUOTE_DEPOSIT]: { name: 'Commercial Approval & Production Authority', color: '#B7791F' },
  [STAGE.PRODUCTION]: { name: 'Procurement & Production', color: '#3E2414' },
  [STAGE.SHIPPING]: { name: 'Shipping & Delivery', color: '#A69282' },
  [STAGE.INSTALLATION]: { name: 'Installation', color: '#3E2414' },
  [STAGE.INSPECTION]: { name: 'Inspection & Sign-off', color: '#B7791F' },
  [STAGE.HANDOVER]: { name: 'Handover & Closeout', color: '#180E06' },
};

/**
 * Common stage check helpers
 */
export const isStageAtOrAfter = (currentStage, threshold) => currentStage >= threshold;
export const isStageBefore = (currentStage, threshold) => currentStage < threshold;

// Common queries
export const isProductionOrAfter = (stage) => isStageAtOrAfter(stage, STAGE.PRODUCTION);
export const isDeliveryOrAfter = (stage) => isStageAtOrAfter(stage, STAGE.SHIPPING);
export const isComplete = (stage) => stage === STAGE.HANDOVER;
