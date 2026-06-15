#!/usr/bin/env node

const admin = require('../functions/node_modules/firebase-admin');

const APPLY = process.argv.includes('--apply');
const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'westlinefuture';

admin.initializeApp({ projectId: PROJECT_ID });

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

async function main() {
  const projectsSnap = await db.collection('projects').get();
  const writes = [];

  for (const projectDoc of projectsSnap.docs) {
    const project = projectDoc.data();
    const spec = project.specDoc;
    if (!spec?.url || spec.status !== 'signed') continue;

    const version = Number(spec.version || 1);
    const documentRef = projectDoc.ref.collection('documents').doc(`signed-spec-v${version}`);
    const existing = await documentRef.get();
    if (existing.exists) continue;

    writes.push({
      ref: documentRef,
      data: {
        name: spec.name || `Project Specification v${version}`,
        url: spec.url,
        fileType: spec.fileType || 'application/pdf',
        type: 'signed_project_specification',
        documentKind: 'project_specification',
        status: 'signed',
        immutable: true,
        clientVisible: true,
        stageId: 3,
        version,
        projectId: projectDoc.id,
        clientId: project.clientId || '',
        projectTitle: project.title || '',
        signedAt: spec.signedAt || spec.reviewedAt || '',
        signedBy: spec.signedBy || spec.reviewedBy || 'Client',
        signedByUid: spec.signedByUid || '',
        signedByPhone: spec.signedByPhone || '',
        signatureMethod: spec.signatureMethod || 'typed-name',
        signatureStamp: spec.signatureStamp || '',
        acceptanceText: spec.acceptanceText || 'Client approved and signed the final project specification.',
        migratedFromProjectSpec: true,
        createdAt: FieldValue.serverTimestamp(),
      },
    });
  }

  console.log(JSON.stringify({
    mode: APPLY ? 'apply' : 'dry-run',
    projectsScanned: projectsSnap.size,
    signedDocumentsToCreate: writes.length,
  }, null, 2));

  if (!APPLY || writes.length === 0) return;

  const batch = db.batch();
  writes.forEach(({ ref, data }) => batch.set(ref, data));
  await batch.commit();
  console.log(`Created ${writes.length} signed specification document record(s).`);
}

main()
  .catch(error => {
    console.error('Signed specification backfill failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await admin.app().delete();
  });
