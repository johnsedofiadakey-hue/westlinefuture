import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('client management payments keep add-ons but remove generic invoices and surcharges', async () => {
  const clientHub = await readFile(new URL('../src/pages/admin/ClientHub.jsx', import.meta.url), 'utf8');
  const paymentSchedule = await readFile(new URL('../src/pages/admin/clienthub/PaymentScheduleCard.jsx', import.meta.url), 'utf8');
  const projectDetails = await readFile(new URL('../src/pages/admin/clienthub/ProjectDetailCards.jsx', import.meta.url), 'utf8');
  const clientPortal = await readFile(new URL('../src/pages/ClientPortal.jsx', import.meta.url), 'utf8');

  assert.equal(paymentSchedule.includes('Create Invoice'), false);
  assert.equal(paymentSchedule.includes('InvoiceCreatorModal'), false);
  assert.equal(projectDetails.includes('Add Surcharge'), false);
  assert.equal(projectDetails.includes('Price Adjustments'), false);
  assert.equal(clientPortal.includes('project.surcharges'), false);
  assert.equal(clientHub.includes('<AdminAddOnManager'), true);
});

test('project manager sees the scheduled visit date and client note', async () => {
  const source = await readFile(new URL('../src/pages/admin/ClientHub.jsx', import.meta.url), 'utf8');

  assert.equal(source.includes('project.siteVisit.scheduledByName'), true);
  assert.equal(source.includes("project.siteVisit.notes || 'No access instructions were provided.'"), true);
  assert.equal(source.includes('View Appointment'), true);
});
