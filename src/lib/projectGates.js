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

import { STAGE } from './stageConstants.js';

export const checkStageGates = (project, nextStageId, { invoices = [], changeRequests = [] }) => {
  const gates = [];
  const projectInvoices = invoices.filter(
    invoice => invoice.projectId === project?.id || invoice.parentId === project?.id
  );
  const descriptor = invoice => `${invoice.milestoneKey || ''} ${invoice.title || ''} ${invoice.type || ''}`.toLowerCase();
  const hasPaidInvoice = matcher => projectInvoices.some(
    invoice => matcher(descriptor(invoice), invoice) && isPaidStatus(invoice.status)
  );
  const addGate = (id, label, message, applies, ok, priority = 'error') => {
    if (!applies) return;
    gates.push({ id, label, message, ok: Boolean(ok), priority });
  };

  addGate(
    'rendering-fee',
    'Rendering fee paid',
    'The rendering fee must be verified before the site visit can be scheduled.',
    nextStageId >= STAGE.DESIGN_RENDERING && project?.kickoffMode === 'rendering-first',
    project?.renderingFeePaid || hasPaidInvoice(text => text.includes('rendering') || text.includes('design'))
  );

  addGate(
    'site-visit-completed',
    'Site visit completed',
    'The technical site visit, measurements, and evidence must be completed before rendering review begins.',
    nextStageId >= STAGE.DESIGN_RENDERING && project?.kickoffMode !== 'direct-kickoff',
    project?.siteVisit?.status === 'completed' || project?.siteSurveyCompleted === true
  );

  addGate(
    'rendering-approved',
    'Rendering/design approved',
    'The client must approve the final rendering before quotation and cost negotiation.',
    nextStageId >= STAGE.QUOTE_DEPOSIT,
    project?.renderingApproved || project?.designApproved || project?.renderingStatus === 'Approved' || project?.kickoffMode === 'direct-kickoff'
  );

  addGate(
    'quote-approved',
    'Final quote approved',
    'The client must approve the negotiated quotation before signing the project contract.',
    nextStageId >= STAGE.QUOTE_DEPOSIT,
    project?.quoteApproved || project?.approvedQuoteId
  );

  addGate(
    'agreement-signed',
    'Project agreement signed',
    'The client must sign the contract and terms after approving the final quotation.',
    nextStageId >= STAGE.PRODUCTION,
    project?.contractAccepted || project?.kickoffMode === 'direct-kickoff'
  );

  addGate(
    'deposit-paid',
    'Initial project payment cleared',
    'The required first project instalment must be verified before the deliverables document can be signed.',
    nextStageId >= STAGE.PRODUCTION,
    project?.depositPaid || hasPaidInvoice(text =>
      text.includes('post-rendering') || text.includes('deposit') || text.includes('first instal')
    )
  );

  addGate(
    'production-authorised',
    'Project deliverables signed',
    'The client must sign the final drawings, bill of materials, scope, and deliverables before production begins.',
    nextStageId >= STAGE.PRODUCTION,
    project?.productionAuthorized || project?.specDoc?.status === 'signed'
  );

  addGate(
    'goods-arrived-in-ghana',
    'Goods arrived in Ghana',
    'Confirm that the goods have arrived in Ghana before installation can begin.',
    nextStageId >= STAGE.INSTALLATION,
    project?.goodsArrivedInGhana === true
  );

  addGate(
    'goods-balance-paid',
    'Final goods balance cleared',
    'The final goods balance must be verified before the goods move to site or installation begins.',
    nextStageId >= STAGE.INSTALLATION,
    project?.goodsBalancePaid || project?.postProductionPaid || hasPaidInvoice(text =>
      text.includes('pre-installation-balance') ||
      text.includes('goods balance') ||
      text.includes('ghana arrival') ||
      text.includes('final goods')
    )
  );

  addGate(
    'installation-invoice-paid',
    'Installation service paid',
    'Create, approve, and fully pay the installation add-on invoice before installation begins.',
    nextStageId >= STAGE.INSTALLATION && project?.projectType !== 'buy-only',
    project?.installationFeePaid || hasPaidInvoice((text, invoice) =>
      invoice?.isInstallationInvoice === true ||
      invoice?.paymentPurpose === 'installation' ||
      text.includes('installation service') ||
      text.includes('installation add-on')
    )
  );

  addGate(
    'field-crew-assigned',
    'Field crew assigned',
    'Assign at least one worker before installation begins.',
    nextStageId >= STAGE.INSTALLATION && project?.projectType !== 'buy-only',
    Array.isArray(project?.assignedWorkers) && project.assignedWorkers.length > 0
  );

  addGate(
    'inspection-signed-off',
    'Client inspection sign-off recorded',
    'The client must sign off the inspection before handover.',
    nextStageId >= STAGE.HANDOVER,
    project?.signOffApproved
  );

  addGate(
    'change-request-pending',
    'Open change request',
    'Resolve the open change request before advancing.',
    Boolean(
      project?.changeRequestPending ||
      changeRequests.some(item =>
        item.projectId === project?.id &&
        String(item.status || '').toLowerCase() === 'pending'
      )
    ),
    false
  );

  return {
    canAdvance: gates.every(gate => gate.ok || gate.priority !== 'error'),
    gates,
    blockers: gates.filter(g => g.priority === 'error' && !g.ok),
    warnings: gates.filter(g => g.priority === 'warn' && !g.ok),
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
