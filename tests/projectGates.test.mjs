import test from 'node:test';
import assert from 'node:assert/strict';
import { checkStageGates } from '../src/lib/projectGates.js';

const baseProject = {
  id: 'project-a',
  kickoffMode: 'rendering-first',
  renderingFeePaid: true,
  siteVisit: { status: 'completed' },
  contractAccepted: true,
  renderingApproved: true,
  productionAuthorized: true,
  specDoc: { status: 'signed' },
  quoteApproved: true,
  depositPaid: true,
  goodsArrivedInGhana: true,
  goodsBalancePaid: true,
  postProductionPaid: true,
  installationFeePaid: true,
  assignedWorkers: ['worker-1'],
  signOffApproved: true,
  finalSettlementPaid: true,
};

test('design stage requires rendering payment and a completed site visit', () => {
  const result = checkStageGates({
    ...baseProject,
    renderingFeePaid: false,
    siteVisit: { status: 'scheduled' },
  }, 2, { invoices: [] });

  assert.equal(result.canAdvance, false);
  assert.deepEqual(
    result.blockers.map(gate => gate.id).sort(),
    ['rendering-fee', 'site-visit-completed']
  );
});

test('quote stage requires the approved rendering and final quotation', () => {
  const result = checkStageGates({
    ...baseProject,
    renderingApproved: false,
    quoteApproved: false,
  }, 3, { invoices: [] });

  assert.equal(result.canAdvance, false);
  assert.deepEqual(
    result.blockers.map(gate => gate.id).sort(),
    ['quote-approved', 'rendering-approved']
  );
});

test('production requires contract, initial payment, and signed deliverables', () => {
  const result = checkStageGates({
    ...baseProject,
    contractAccepted: false,
    depositPaid: false,
    productionAuthorized: false,
    specDoc: { status: 'pending' },
  }, 4, { invoices: [] });

  assert.equal(result.canAdvance, false);
  assert.deepEqual(
    result.blockers.map(gate => gate.id).sort(),
    ['agreement-signed', 'deposit-paid', 'production-authorised']
  );
});

test('installation requires Ghana arrival, goods balance, installation payment, and field crew', () => {
  const result = checkStageGates({
    ...baseProject,
    postProductionPaid: false,
    goodsArrivedInGhana: false,
    goodsBalancePaid: false,
    installationFeePaid: false,
    assignedWorkers: [],
  }, 6, { invoices: [] });

  assert.equal(result.canAdvance, false);
  assert.deepEqual(
    result.blockers.map(gate => gate.id).sort(),
    ['field-crew-assigned', 'goods-arrived-in-ghana', 'goods-balance-paid', 'installation-invoice-paid']
  );
});

test('handover requires inspection sign-off only', () => {
  const result = checkStageGates({
    ...baseProject,
    signOffApproved: false,
  }, 8, { invoices: [] });

  assert.equal(result.canAdvance, false);
  assert.deepEqual(
    result.blockers.map(gate => gate.id).sort(),
    ['inspection-signed-off']
  );
});

test('a pending change request only blocks its own project', () => {
  const unrelated = checkStageGates(baseProject, 4, {
    changeRequests: [{ projectId: 'project-b', status: 'pending' }],
  });
  const related = checkStageGates(baseProject, 4, {
    changeRequests: [{ projectId: 'project-a', status: 'pending' }],
  });

  assert.equal(unrelated.canAdvance, true);
  assert.equal(related.canAdvance, false);
  assert.deepEqual(related.blockers.map(gate => gate.id), ['change-request-pending']);
});
