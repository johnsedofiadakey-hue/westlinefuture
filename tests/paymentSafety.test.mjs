import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Paystack partial payments send the exact expected amount for verification', async () => {
  const source = await readFile(
    new URL('../src/components/UnifiedPaymentGateway.jsx', import.meta.url),
    'utf8'
  );

  assert.equal(
    source.includes('expectedAmountGHS: Number(amountGHS)'),
    true,
    'the callable verifier must receive the actual partial or full checkout amount'
  );
  assert.equal(
    source.includes('const reference     = `WL-${Date.now()}'),
    false,
    'a Paystack reference must not be regenerated during ordinary React renders'
  );
});

test('Paystack verification requires project access and webhook claims references', async () => {
  const source = await readFile(new URL('../functions/index.js', import.meta.url), 'utf8');

  assert.equal(
    source.includes('await assertProjectAccess(request.auth, projectId);'),
    true,
    'authenticated callers must also be assigned to the project or be staff'
  );
  assert.equal(
    source.includes("status: 'processing'") && source.includes("status: 'completed'"),
    true,
    'the webhook must claim and complete a shared idempotency record'
  );
  assert.equal(
    source.includes('Invoice does not belong to project'),
    true,
    'webhook metadata must not update an invoice from another project'
  );
});

test('client finance does not hide quote and deposit invoices before production', async () => {
  const source = await readFile(new URL('../src/pages/ClientPortal.jsx', import.meta.url), 'utf8');

  assert.equal(
    source.includes('if (productionAuthorized) return true'),
    false,
    'invoice visibility must not depend on production authorisation'
  );
  assert.equal(
    source.includes("invoice.clientVisible !== false"),
    true,
    'client-visible invoices should remain available throughout the workflow'
  );
});
