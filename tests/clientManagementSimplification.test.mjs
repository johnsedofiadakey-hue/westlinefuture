import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('client management payments keep add-ons but remove generic invoices and surcharges', async () => {
  const clientHub = await readFile(new URL('../src/pages/admin/ClientHub.jsx', import.meta.url), 'utf8');
  const paymentSchedule = await readFile(new URL('../src/pages/admin/clienthub/PaymentScheduleCard.jsx', import.meta.url), 'utf8');
  const projectDetails = await readFile(new URL('../src/pages/admin/clienthub/ProjectDetailCards.jsx', import.meta.url), 'utf8');
  const clientPortal = await readFile(new URL('../src/pages/ClientPortal.jsx', import.meta.url), 'utf8');
  const renderingManager = await readFile(new URL('../src/components/AdminRenderingManager.jsx', import.meta.url), 'utf8');

  assert.equal(paymentSchedule.includes('Create Invoice'), false);
  assert.equal(paymentSchedule.includes('InvoiceCreatorModal'), false);
  assert.equal(projectDetails.includes('Add Surcharge'), false);
  assert.equal(projectDetails.includes('Price Adjustments'), false);
  assert.equal(clientPortal.includes('project.surcharges'), false);
  assert.equal(renderingManager.includes('Create Invoice & Publish'), false);
  assert.equal(renderingManager.includes('Auto-Create Invoice on Upload'), false);
  assert.equal(clientHub.includes('<AdminAddOnManager'), true);
});

test('project manager sees the scheduled visit date and client note', async () => {
  const source = await readFile(new URL('../src/pages/admin/ClientHub.jsx', import.meta.url), 'utf8');

  assert.equal(source.includes('project.siteVisit.scheduledByName'), true);
  assert.equal(source.includes("project.siteVisit.notes || 'No access instructions were provided.'"), true);
  assert.equal(source.includes('View Appointment'), true);
});

test('rendering and quotation decisions use deployed callable workflow handlers', async () => {
  const functionsSource = await readFile(new URL('../functions/index.js', import.meta.url), 'utf8');
  const stageFunctionsSource = await readFile(new URL('../stage-functions/index.js', import.meta.url), 'utf8');
  const renderingVault = await readFile(new URL('../src/components/ClientRenderingVault.jsx', import.meta.url), 'utf8');
  const clientPortal = await readFile(new URL('../src/pages/ClientPortal.jsx', import.meta.url), 'utf8');

  assert.equal(stageFunctionsSource.includes('exports.submitRenderingDecision = onCall'), true);
  assert.equal(functionsSource.includes('exports.submitRenderingDecision = onCall'), false);
  assert.equal(stageFunctionsSource.includes('exports.approveProjectQuote = onCall'), true);
  assert.equal(stageFunctionsSource.includes('exports.requestProjectQuoteChanges = onCall'), true);
  assert.equal(functionsSource.includes('exports.approveProjectQuote = onCall'), false);
  assert.equal(functionsSource.includes('exports.requestProjectQuoteChanges = onCall'), false);
  assert.equal(renderingVault.includes("httpsCallable(functions, 'submitRenderingDecision')"), true);
  assert.equal(clientPortal.includes("httpsCallable(functions, 'requestProjectQuoteChanges')"), true);
});

test('project manager roles subscribe as staff instead of falling into client queries', async () => {
  const appContext = await readFile(new URL('../src/context/AppContext.jsx', import.meta.url), 'utf8');

  assert.equal(appContext.includes("'project manager'"), true);
  assert.equal(appContext.includes('} else if (isAdminOrStaff) {'), true);
  assert.equal(appContext.includes('if (isAdminOrStaff) {'), true);
});

test('project manager has a dedicated versioned quotation workspace', async () => {
  const clientHub = await readFile(new URL('../src/pages/admin/ClientHub.jsx', import.meta.url), 'utf8');
  const quoteCard = await readFile(new URL('../src/pages/admin/clienthub/QuoteNegotiationCard.jsx', import.meta.url), 'utf8');
  const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');

  assert.equal(clientHub.includes('<QuoteNegotiationCard'), true);
  assert.equal(quoteCard.includes('Quotation & Cost Negotiation'), true);
  assert.equal(quoteCard.includes('Issue Revised Quote'), true);
  assert.equal(app.includes("type: 'Quotation'"), true);
  assert.equal(app.includes("documentKind: 'quotation'"), true);
  assert.equal(app.includes("collection(db, 'quotes')"), false);
});
