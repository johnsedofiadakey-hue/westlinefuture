#!/usr/bin/env node

const admin = require('../functions/node_modules/firebase-admin');

const APPLY = process.argv.includes('--apply');
const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'westlinefuture';
const MAX_BATCH_WRITES = 400;

admin.initializeApp({ projectId: PROJECT_ID });

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

async function commitWrites(writes) {
  if (!APPLY || writes.length === 0) return;

  for (let offset = 0; offset < writes.length; offset += MAX_BATCH_WRITES) {
    const batch = db.batch();
    writes.slice(offset, offset + MAX_BATCH_WRITES).forEach(({ ref, data }) => {
      batch.set(ref, data, { merge: true });
    });
    await batch.commit();
  }
}

async function collectProjectTransactions() {
  const projectsSnap = await db.collection('projects').get();
  const writes = [];
  let projectTransactions = 0;
  let alreadyMirrored = 0;
  let collisions = 0;

  for (const projectDoc of projectsSnap.docs) {
    const project = projectDoc.data();
    const transactionsSnap = await projectDoc.ref.collection('transactions').get();

    for (const transactionDoc of transactionsSnap.docs) {
      projectTransactions += 1;
      const transaction = transactionDoc.data();
      let globalRef = db.collection('transactions').doc(transactionDoc.id);
      const existingGlobal = await globalRef.get();

      if (existingGlobal.exists) {
        if (existingGlobal.data().projectId === projectDoc.id) {
          alreadyMirrored += 1;
          continue;
        }
        collisions += 1;
        globalRef = db.collection('transactions').doc(`${projectDoc.id}_${transactionDoc.id}`);
      }

      writes.push({
        ref: globalRef,
        data: {
          ...transaction,
          id: transaction.id || transactionDoc.id,
          projectTransactionId: transactionDoc.id,
          projectId: transaction.projectId || projectDoc.id,
          parentId: transaction.parentId || projectDoc.id,
          clientId: transaction.clientId || project.clientId || '',
          projectManagerId: transaction.projectManagerId || project.projectManagerId || project.assignedStaff?.[0] || null,
          reconciledAt: FieldValue.serverTimestamp(),
          reconciledBy: 'payment-ledger-migration',
        },
      });
    }
  }

  return {
    writes,
    stats: {
      projects: projectsSnap.size,
      projectTransactions,
      missingGlobalTransactions: writes.length,
      alreadyMirrored,
      collisions,
    },
  };
}

async function collectInvoiceNormalizations() {
  const invoicesSnap = await db.collection('invoices').get();
  const writes = [];
  let pendingStatusRepairs = 0;
  let paidFieldRepairs = 0;
  let totalFieldRepairs = 0;
  let lineItemRepairs = 0;
  let balanceFieldRepairs = 0;

  invoicesSnap.docs.forEach(invoiceDoc => {
    const invoice = invoiceDoc.data();
    const update = {};
    const invoiceTotal = Number(invoice.total ?? invoice.amount ?? invoice.amountDue ?? 0) || 0;
    const amountPaid = Number(invoice.amountPaid ?? invoice.paidAmount ?? 0) || 0;

    if (invoice.awaitingConfirmation === true && String(invoice.status || '').toLowerCase() !== 'verification pending') {
      update.status = 'Verification Pending';
      pendingStatusRepairs += 1;
    }

    if (invoice.amountPaid != null && invoice.paidAmount == null) {
      update.paidAmount = Number(invoice.amountPaid) || 0;
      paidFieldRepairs += 1;
    } else if (invoice.paidAmount != null && invoice.amountPaid == null) {
      update.amountPaid = Number(invoice.paidAmount) || 0;
      paidFieldRepairs += 1;
    }

    if (invoiceTotal > 0 && invoice.total == null) {
      update.total = invoiceTotal;
      update.amountDue = invoiceTotal;
      totalFieldRepairs += 1;
    }

    if (invoiceTotal > 0 && (!Array.isArray(invoice.items) || invoice.items.length === 0)) {
      update.items = [{
        desc: invoice.title || 'Project payment',
        notes: invoice.description || '',
        qty: 1,
        rate: invoiceTotal,
        unit: invoice.milestoneKey ? 'stage' : 'item',
        total: invoiceTotal,
      }];
      lineItemRepairs += 1;
    }

    const expectedBalance = Math.max(0, invoiceTotal - amountPaid);
    if (invoiceTotal > 0 && Number(invoice.balanceDue) !== expectedBalance) {
      update.balanceDue = expectedBalance;
      balanceFieldRepairs += 1;
    }

    if (Object.keys(update).length > 0) {
      writes.push({
        ref: invoiceDoc.ref,
        data: {
          ...update,
          reconciledAt: FieldValue.serverTimestamp(),
          reconciledBy: 'payment-ledger-migration',
        },
      });
    }
  });

  return {
    writes,
    stats: {
      invoices: invoicesSnap.size,
      invoicesToNormalize: writes.length,
      pendingStatusRepairs,
      paidFieldRepairs,
      totalFieldRepairs,
      lineItemRepairs,
      balanceFieldRepairs,
    },
  };
}

function isPaidStatus(status) {
  return ['paid', 'paid in full'].includes(String(status || '').toLowerCase().trim());
}

function isInitialDeposit(invoice) {
  const descriptor = `${invoice.title || ''} ${invoice.type || ''} ${invoice.documentKind || ''}`.toLowerCase();
  return invoice.milestoneKey === 'post-rendering'
    || descriptor.includes('deposit')
    || descriptor.includes('first instalment')
    || descriptor.includes('first installment');
}

async function collectProjectDepositRepairs() {
  const [projectsSnap, invoicesSnap] = await Promise.all([
    db.collection('projects').get(),
    db.collection('invoices').get(),
  ]);
  const paidDepositsByProject = new Map();

  invoicesSnap.docs.forEach(invoiceDoc => {
    const invoice = invoiceDoc.data();
    const projectId = invoice.projectId || invoice.parentId;
    if (projectId && isInitialDeposit(invoice) && isPaidStatus(invoice.status)) {
      paidDepositsByProject.set(projectId, invoiceDoc.id);
    }
  });

  const writes = [];
  projectsSnap.docs.forEach(projectDoc => {
    const invoiceId = paidDepositsByProject.get(projectDoc.id);
    if (!invoiceId || projectDoc.data().depositPaid === true) return;
    writes.push({
      ref: projectDoc.ref,
      data: {
        depositPaid: true,
        depositPaidAt: FieldValue.serverTimestamp(),
        initialDepositInvoiceId: invoiceId,
        reconciledAt: FieldValue.serverTimestamp(),
        reconciledBy: 'payment-ledger-migration',
      },
    });
  });

  return {
    writes,
    stats: {
      projectDepositRepairs: writes.length,
    },
  };
}

async function main() {
  const [transactions, invoices, deposits] = await Promise.all([
    collectProjectTransactions(),
    collectInvoiceNormalizations(),
    collectProjectDepositRepairs(),
  ]);

  const summary = {
    mode: APPLY ? 'apply' : 'dry-run',
    projectId: PROJECT_ID,
    ...transactions.stats,
    ...invoices.stats,
    ...deposits.stats,
    totalWrites: transactions.writes.length + invoices.writes.length + deposits.writes.length,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (!APPLY) {
    console.log('\nDry run only. Re-run with --apply after reviewing the counts.');
    return;
  }

  await commitWrites([...transactions.writes, ...invoices.writes, ...deposits.writes]);
  console.log(`\nApplied ${summary.totalWrites} reconciliation writes.`);
}

main()
  .catch(error => {
    console.error('Payment ledger reconciliation failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await admin.app().delete();
  });
