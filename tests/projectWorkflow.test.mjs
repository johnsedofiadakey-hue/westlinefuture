import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveWorkflowStep, WORKFLOW_STEP } from '../src/lib/projectWorkflow.js';

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
