/**
 * PROJECT STAGE GATES - Fixes: Issue #13 (Stage validation scattered)
 *
 * Single source of truth for stage advancement logic.
 * Fixes duplication between App.jsx updateStage and AdvanceModal.
 *
 * Usage:
 *   const gates = checkStageGates(project, nextStage, { invoices, changeRequests });
 *   if (!gates.canAdvance) {
 *     gates.blockers.forEach(b => notify('error', b.message));
 *   }
 */

import { STAGE } from './stageConstants';

export const checkStageGates = (project, nextStageId, { invoices = [], changeRequests = [] }) => {
  const gates = [];
  let canAdvance = true;

  // ✅ GATE 1: Unpaid invoices block advancement
  if (nextStageId >= STAGE.PRODUCTION) {
    const unpaidInvoices = invoices.filter(
      i => (i.projectId === project.id || i.parentId === project.id)
        && ['sent', 'overdue', 'verification pending'].includes(String(i.status || '').toLowerCase().trim())
        && !isPaidStatus(i.status)
    );
    if (unpaidInvoices.length > 0) {
      gates.push({
        id: 'unpaid-invoices',
        label: 'Unpaid Invoices',
        message: `Cannot advance: ${unpaidInvoices.length} invoices still unpaid`,
        ok: false,
        priority: 'error',
      });
      canAdvance = false;
    }
  }

  // ✅ GATE 2: Pending change requests block advancement
  if (project.changeRequestPending) {
    gates.push({
      id: 'change-request-pending',
      label: 'Pending Change Request',
      message: 'A change request is awaiting client decision — resolve before advancing',
      ok: false,
      priority: 'error',
    });
    canAdvance = false;
  }

  // ✅ GATE 3: A signed specification/scope is mandatory before production.
  if (nextStageId >= STAGE.PRODUCTION && (!project.specDoc?.url || project.specDoc?.status !== 'signed')) {
    gates.push({
      id: 'spec-doc-unsigned',
      label: 'Project Specification Unsigned',
      message: 'Client must sign the final project specification before production begins',
      ok: false,
      priority: 'error',
    });
    canAdvance = false;
  }

  // ✅ GATE 4: Contract not signed blocks advancement
  if (nextStageId >= STAGE.QUOTATION && !project.contractAccepted && project.specDoc?.status !== 'signed') {
    gates.push({
      id: 'contract-not-signed',
      label: 'Contract Unsigned',
      message: 'Client must sign the contract before advancing',
      ok: false,
      priority: 'warn',
    });
    // Don't block, just warn
  }

  // ✅ GATE 5: Kickoff not cleared blocks phase 2
  if (nextStageId >= STAGE.DEPOSIT_PAID && !project.kickoffGateCleared && project.kickoffMode) {
    gates.push({
      id: 'kickoff-not-cleared',
      label: 'Kickoff Gate Not Cleared',
      message: 'Complete kickoff (rendering fee payment + contract) before advancing',
      ok: false,
      priority: 'error',
    });
    canAdvance = false;
  }

  return {
    canAdvance,
    gates,
    blockers: gates.filter(g => g.priority === 'error'),
    warnings: gates.filter(g => g.priority === 'warn'),
  };
};

/**
 * APPLY TO:
 * 1. App.jsx updateStage() - line 801
 * 2. AdvanceModal.jsx - line 200+
 * 3. ClientHub.jsx stage advancement
 *
 * BEFORE:
 *   if (project.changeRequestPending) throw new Error(...);
 *   if (!invoices.every(i => isPaid(i.status))) throw new Error(...);
 *
 * AFTER:
 *   const result = checkStageGates(project, nextStage, { invoices });
 *   if (!result.canAdvance) {
 *     result.blockers.forEach(b => notify('error', b.message));
 *     return;
 *   }
 */

const isPaidStatus = (status) =>
  ['paid', 'paid in full'].includes(String(status || '').toLowerCase().trim());
