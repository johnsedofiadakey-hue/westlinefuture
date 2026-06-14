import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applicableWorkflowSteps,
  deriveWorkflowStep,
  workflowProgress,
  WORKFLOW_STEP
} from '../src/lib/projectWorkflow.js';

test('rendering payment moves a legacy project to site visit scheduling', () => {
  assert.equal(
    deriveWorkflowStep({
      id: 'p1',
      stageId: 1,
      kickoffMode: 'rendering-first',
      renderingFeePaid: true,
      siteVisit: { status: 'not_scheduled' },
    }),
    WORKFLOW_STEP.SITE_VISIT_SCHEDULING
  );
});

test('scheduled and completed visits derive the correct next work', () => {
  assert.equal(
    deriveWorkflowStep({ id: 'p1', stageId: 1, renderingFeePaid: true, siteVisit: { status: 'scheduled' } }),
    WORKFLOW_STEP.SITE_SURVEY
  );
  assert.equal(
    deriveWorkflowStep({ id: 'p1', stageId: 1, renderingFeePaid: true, siteVisit: { status: 'completed' } }),
    WORKFLOW_STEP.RENDERING_REVIEW
  );
});

test('commercial flags derive contract, payment, and deliverables sequence', () => {
  assert.equal(
    deriveWorkflowStep({ id: 'p1', stageId: 3, renderingApproved: true, quoteApproved: true }),
    WORKFLOW_STEP.CONTRACT_SIGNING
  );
  assert.equal(
    deriveWorkflowStep({ id: 'p1', stageId: 3, renderingApproved: true, quoteApproved: true, contractAccepted: true }),
    WORKFLOW_STEP.INITIAL_PAYMENT
  );
  assert.equal(
    deriveWorkflowStep({
      id: 'p1',
      stageId: 3,
      renderingApproved: true,
      quoteApproved: true,
      contractAccepted: true,
      depositPaid: true,
    }),
    WORKFLOW_STEP.DELIVERABLES_APPROVAL
  );
});

test('signed deliverables derive production for legacy records', () => {
  assert.equal(
    deriveWorkflowStep({
      id: 'p1',
      stageId: 3,
      productionAuthorized: true,
      specDoc: { status: 'signed' },
    }),
    WORKFLOW_STEP.PRODUCTION
  );
});

test('admin workflow progress includes every operational gate', () => {
  const progress = workflowProgress({
    id: 'p1',
    stageId: 3,
    renderingApproved: true,
    quoteApproved: true,
    contractAccepted: true,
  });

  assert.equal(progress.step, WORKFLOW_STEP.INITIAL_PAYMENT);
  assert.equal(progress.meta.label, 'Initial Project Payment');
  assert.equal(progress.total, 16);
});

test('buy-only workflow omits installation', () => {
  const steps = applicableWorkflowSteps({ projectType: 'buy-only' });

  assert.equal(steps.some(step => step.id === WORKFLOW_STEP.INSTALLATION), false);
  assert.equal(steps.some(step => step.id === WORKFLOW_STEP.INSTALLATION_PAYMENT), false);
  assert.equal(steps.length, 14);
});

test('Ghana arrival exposes goods balance then installation payment', () => {
  assert.equal(
    deriveWorkflowStep({
      id: 'p1',
      stageId: 5,
      projectType: 'full-service',
      goodsArrivedInGhana: true,
      goodsBalancePaid: false,
    }),
    WORKFLOW_STEP.GHANA_ARRIVAL_PAYMENT
  );

  assert.equal(
    deriveWorkflowStep({
      id: 'p1',
      stageId: 5,
      projectType: 'full-service',
      goodsArrivedInGhana: true,
      goodsBalancePaid: true,
    }),
    WORKFLOW_STEP.INSTALLATION_PAYMENT
  );
});

test('current payment flags override a stale persisted workflow step', () => {
  assert.equal(
    deriveWorkflowStep({
      id: 'p1',
      stageId: 3,
      workflowStep: WORKFLOW_STEP.QUOTE_NEGOTIATION,
      renderingApproved: true,
      quoteApproved: true,
      contractAccepted: true,
      initialDepositPaid: true,
    }),
    WORKFLOW_STEP.DELIVERABLES_APPROVAL
  );
});

test('installation fee flag clears the installation payment gate', () => {
  assert.equal(
    deriveWorkflowStep({
      id: 'p1',
      stageId: 5,
      projectType: 'full-service',
      goodsArrivedInGhana: true,
      goodsBalancePaid: true,
      installationFeePaid: true,
    }),
    WORKFLOW_STEP.SHIPPING
  );
});
