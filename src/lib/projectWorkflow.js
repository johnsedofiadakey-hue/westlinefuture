export const WORKFLOW_STEP = {
  ONBOARDING: 'onboarding',
  RENDERING_PAYMENT: 'rendering-payment',
  SITE_VISIT_SCHEDULING: 'site-visit-scheduling',
  SITE_SURVEY: 'site-survey',
  RENDERING_REVIEW: 'rendering-review',
  QUOTE_NEGOTIATION: 'quote-negotiation',
  CONTRACT_SIGNING: 'contract-signing',
  INITIAL_PAYMENT: 'initial-payment',
  DELIVERABLES_APPROVAL: 'deliverables-approval',
  PRODUCTION: 'production',
  SHIPPING: 'shipping',
  GHANA_ARRIVAL_PAYMENT: 'ghana-arrival-payment',
  INSTALLATION_PAYMENT: 'installation-payment',
  INSTALLATION: 'installation',
  INSPECTION: 'inspection',
  HANDOVER: 'handover',
};

export const PROJECT_WORKFLOW_STEPS = [
  { id: WORKFLOW_STEP.ONBOARDING, label: 'Client Onboarding', owner: 'project manager', stageId: 1 },
  { id: WORKFLOW_STEP.RENDERING_PAYMENT, label: 'Rendering Fee Payment', owner: 'client', stageId: 1 },
  { id: WORKFLOW_STEP.SITE_VISIT_SCHEDULING, label: 'Schedule Site Visit', owner: 'client or project manager', stageId: 1 },
  { id: WORKFLOW_STEP.SITE_SURVEY, label: 'Site Survey & Measurements', owner: 'technical team', stageId: 1 },
  { id: WORKFLOW_STEP.RENDERING_REVIEW, label: '3D Rendering Review', owner: 'client and design team', stageId: 2 },
  { id: WORKFLOW_STEP.QUOTE_NEGOTIATION, label: 'Quotation & Cost Negotiation', owner: 'client and project manager', stageId: 3 },
  { id: WORKFLOW_STEP.CONTRACT_SIGNING, label: 'Contract Terms & Signature', owner: 'client', stageId: 3 },
  { id: WORKFLOW_STEP.INITIAL_PAYMENT, label: 'Initial Project Payment', owner: 'client and finance', stageId: 3 },
  { id: WORKFLOW_STEP.DELIVERABLES_APPROVAL, label: 'Deliverables & Scope Approval', owner: 'client and project manager', stageId: 3 },
  { id: WORKFLOW_STEP.PRODUCTION, label: 'Procurement & Production', owner: 'project manager', stageId: 4 },
  { id: WORKFLOW_STEP.SHIPPING, label: 'Shipping & Delivery', owner: 'logistics', stageId: 5 },
  { id: WORKFLOW_STEP.GHANA_ARRIVAL_PAYMENT, label: 'Ghana Arrival & Final Goods Payment', owner: 'client and finance', stageId: 5 },
  { id: WORKFLOW_STEP.INSTALLATION_PAYMENT, label: 'Installation Add-on Approval & Payment', owner: 'client and project manager', stageId: 5 },
  { id: WORKFLOW_STEP.INSTALLATION, label: 'Installation', owner: 'field team', stageId: 6 },
  { id: WORKFLOW_STEP.INSPECTION, label: 'Inspection & Sign-off', owner: 'client and project manager', stageId: 7 },
  { id: WORKFLOW_STEP.HANDOVER, label: 'Handover & Closeout', owner: 'project manager', stageId: 8 },
];

export function applicableWorkflowSteps(project = {}) {
  if (project.projectType === 'buy-only') {
    return PROJECT_WORKFLOW_STEPS.filter(step =>
      ![WORKFLOW_STEP.INSTALLATION_PAYMENT, WORKFLOW_STEP.INSTALLATION].includes(step.id)
    );
  }
  return PROJECT_WORKFLOW_STEPS;
}

const isApproved = value => ['approved', 'signed', 'completed'].includes(String(value || '').toLowerCase());

export function deriveWorkflowStep(project = {}, { invoices = [], renderingPackages = [] } = {}) {
  const projectInvoices = invoices.filter(invoice =>
    invoice.projectId === project.id || invoice.parentId === project.id
  );
  const descriptor = invoice =>
    `${invoice.milestoneKey || ''} ${invoice.title || ''} ${invoice.type || ''}`.toLowerCase();
  const paid = matcher => projectInvoices.some(invoice =>
    matcher(descriptor(invoice), invoice) &&
    ['paid', 'paid in full'].includes(String(invoice.status || '').toLowerCase())
  );
  const renderingPaid = project.renderingFeePaid || paid(text => text.includes('rendering') || text.includes('design'));
  const siteVisit = project.siteVisit || {};
  const renderingApproved = project.renderingApproved || project.designApproved ||
    isApproved(project.renderingStatus) ||
    renderingPackages.some(pkg => pkg.projectId === project.id && isApproved(pkg.status));
  const quoteApproved = project.quoteApproved || project.approvedQuoteId;
  const depositPaid = project.depositPaid || project.initialDepositPaid ||
    paid(text => text.includes('initial-deposit') || text.includes('deposit') || text.includes('first instal'));
  const deliverablesSigned = project.productionAuthorized || project.specDoc?.status === 'signed';
  const installationPaid = project.installationPaid || project.installationFeePaid || paid(text =>
    text.includes('installation') || text.includes('install add-on') || text.includes('installation add-on')
  );
  const renderingChangesPending = project.changeRequestPending === true && (
    String(project.renderingStatus || '').toLowerCase() === 'changes_requested' ||
    renderingPackages.some(pkg =>
      pkg.projectId === project.id &&
      String(pkg.status || '').toLowerCase() === 'changes requested'
    )
  );
  const quoteChangesPending = project.quoteChangeRequested === true ||
    projectInvoices.some(invoice =>
      (descriptor(invoice).includes('quotation') || descriptor(invoice).includes('quote')) &&
      String(invoice.status || '').toLowerCase() === 'changes requested'
    );

  if (Number(project.stageId || 1) >= 8) return WORKFLOW_STEP.HANDOVER;
  if (Number(project.stageId || 1) >= 7) return WORKFLOW_STEP.INSPECTION;
  if (Number(project.stageId || 1) >= 6) return WORKFLOW_STEP.INSTALLATION;
  if (Number(project.stageId || 1) >= 5) {
    if (project.goodsArrivedInGhana && !project.goodsBalancePaid) {
      return WORKFLOW_STEP.GHANA_ARRIVAL_PAYMENT;
    }
    if (project.projectType !== 'buy-only' && project.goodsBalancePaid && !installationPaid) {
      return WORKFLOW_STEP.INSTALLATION_PAYMENT;
    }
    return WORKFLOW_STEP.SHIPPING;
  }
  if (Number(project.stageId || 1) >= 4 || deliverablesSigned) return WORKFLOW_STEP.PRODUCTION;
  if (depositPaid) return WORKFLOW_STEP.DELIVERABLES_APPROVAL;
  if (project.contractAccepted) return WORKFLOW_STEP.INITIAL_PAYMENT;
  if (quoteApproved) return WORKFLOW_STEP.CONTRACT_SIGNING;
  if (quoteChangesPending) return WORKFLOW_STEP.QUOTE_NEGOTIATION;
  if (renderingChangesPending) return WORKFLOW_STEP.RENDERING_REVIEW;
  if (renderingApproved) return WORKFLOW_STEP.QUOTE_NEGOTIATION;
  if (siteVisit.status === 'completed' || project.siteSurveyCompleted) return WORKFLOW_STEP.RENDERING_REVIEW;
  if (siteVisit.status === 'scheduled') return WORKFLOW_STEP.SITE_SURVEY;
  if (renderingPaid) return WORKFLOW_STEP.SITE_VISIT_SCHEDULING;
  if (project.kickoffMode === 'direct-kickoff') return WORKFLOW_STEP.QUOTE_NEGOTIATION;
  return project.workflowStep ||
    (project.renderingFeeInvoiceId ? WORKFLOW_STEP.RENDERING_PAYMENT : WORKFLOW_STEP.ONBOARDING);
}

export function workflowStepIndex(step, steps = PROJECT_WORKFLOW_STEPS) {
  return steps.findIndex(item => item.id === step);
}

export function workflowProgress(project, context) {
  const steps = applicableWorkflowSteps(project);
  const step = deriveWorkflowStep(project, context);
  const index = Math.max(0, workflowStepIndex(step, steps));
  return {
    step,
    index,
    total: steps.length,
    percent: Math.round(((index + 1) / steps.length) * 100),
    meta: steps[index],
    steps,
  };
}

export function clientPortalGateState(
  project = {},
  { renderingPaid = false, renderingPaymentConfirmedLocally = false } = {}
) {
  const renderingAccessConfirmed = renderingPaid || renderingPaymentConfirmedLocally;
  const needsRenderingPayment = project.kickoffMode === 'rendering-first' && !renderingAccessConfirmed;
  const needsContractSignature = project.quoteApproved === true && project.contractAccepted !== true;

  return {
    active: needsRenderingPayment || needsContractSignature,
    needsRenderingPayment,
    needsContractSignature,
  };
}
