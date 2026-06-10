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
  INQUIRY_INTAKE: 1,
  QUOTATION: 2,
  DEPOSIT_PAID: 3,
  PRODUCTION: 4,
  PRE_DELIVERY: 5,
  INSTALLATION: 6,
  INSPECTION: 7,
  COMPLETION: 8,
};

// Aliases for backward compatibility
export const STAGES = STAGE;

/**
 * Stage metadata — keys match STAGE values
 * Used for UI labels, colors, and business logic checks
 */
export const STAGE_METADATA = {
  [STAGE.INQUIRY_INTAKE]: { name: 'Inquiry & Intake', color: '#3B82F6' },
  [STAGE.QUOTATION]: { name: 'Quotation', color: '#8B5CF6' },
  [STAGE.DEPOSIT_PAID]: { name: 'Quote Approved', color: '#EC4899' },
  [STAGE.PRODUCTION]: { name: 'Production', color: '#F59E0B' },
  [STAGE.PRE_DELIVERY]: { name: 'Pre-Delivery', color: '#10B981' },
  [STAGE.INSTALLATION]: { name: 'Installation', color: '#14B8A6' },
  [STAGE.INSPECTION]: { name: 'Inspection', color: '#06B6D4' },
  [STAGE.COMPLETION]: { name: 'Completion', color: '#6366F1' },
};

/**
 * Common stage check helpers
 */
export const isStageAtOrAfter = (currentStage, threshold) => currentStage >= threshold;
export const isStageBefore = (currentStage, threshold) => currentStage < threshold;

// Common queries
export const isProductionOrAfter = (stage) => isStageAtOrAfter(stage, STAGE.PRODUCTION);
export const isDeliveryOrAfter = (stage) => isStageAtOrAfter(stage, STAGE.INSTALLATION);
export const isComplete = (stage) => stage === STAGE.COMPLETION;
