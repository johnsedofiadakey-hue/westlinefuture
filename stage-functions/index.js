const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { TranslationServiceClient } = require('@google-cloud/translate').v3;

initializeApp();
const translationClient = new TranslationServiceClient();

const CORS_OPTS = {
  cors: [
    'https://westlinedecor.com',
    'https://www.westlinedecor.com',
    'https://westlinefuture.web.app',
    'https://westlinefuture.firebaseapp.com',
  ],
  invoker: 'public',
};

const normalizePhone = value => String(value || '').replace(/\D/g, '');
const parseMoney = value => {
  const parsed = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};
const isPaid = status => ['paid', 'paid in full'].includes(String(status || '').toLowerCase().trim());
const isInitialDeposit = invoice => {
  const title = `${invoice.title || ''} ${invoice.type || ''} ${invoice.documentKind || ''}`.toLowerCase();
  return ['initial-deposit', 'post-rendering'].includes(invoice.milestoneKey)
    || title.includes('deposit')
    || title.includes('first instalment')
    || title.includes('first installment');
};
const isGoodsBalance = invoice => {
  const title = `${invoice.milestoneKey || ''} ${invoice.title || ''} ${invoice.type || ''}`.toLowerCase();
  return invoice.milestoneKey === 'pre-installation-balance'
    || title.includes('goods balance')
    || title.includes('ghana arrival')
    || title.includes('final goods');
};
const isInstallationInvoice = invoice => {
  const title = `${invoice.title || ''} ${invoice.type || ''}`.toLowerCase();
  return invoice.isInstallationInvoice === true
    || invoice.paymentPurpose === 'installation'
    || title.includes('installation service')
    || title.includes('installation add-on');
};

const userOwnsProject = (auth, project) => {
  const authPhone = normalizePhone(auth.token.phone_number);
  const clientIds = [
    project.clientId,
    ...(Array.isArray(project.clientIds) ? project.clientIds : []),
  ].map(normalizePhone);

  return auth.uid === project.clientId
    || clientIds.includes(normalizePhone(auth.uid))
    || (authPhone && clientIds.includes(authPhone));
};

const getUserRole = async (db, auth) => {
  const userSnap = await db.collection('users').doc(auth.uid).get();
  return String(userSnap.data()?.role || auth.token.role || '').toLowerCase();
};

const isPrivilegedRole = role => [
  'admin',
  'staff',
  'project manager',
  'project_manager',
  'finance manager',
  'operations manager',
].includes(role);

const decodeTranslationEntities = value => String(value || '')
  .replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'")
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>');

exports.signProjectAgreement = onCall(CORS_OPTS, async request => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in before signing the project agreement.');
  }

  const projectId = String(request.data?.projectId || '').trim();
  const typedName = String(request.data?.typedName || '').trim().replace(/\s+/g, ' ');
  const signatureData = String(request.data?.signatureData || '');
  const legalConsent = request.data?.legalConsent === true;
  const userAgent = String(request.data?.userAgent || '').trim().slice(0, 500);

  if (!projectId || typedName.length < 3 || typedName.length > 120) {
    throw new HttpsError('invalid-argument', 'Project and full legal name are required.');
  }
  if (!legalConsent || !signatureData.startsWith('data:image/png;base64,') || signatureData.length > 350000) {
    throw new HttpsError('invalid-argument', 'A valid signature and legal consent are required.');
  }

  const db = getFirestore();
  const projectRef = db.collection('projects').doc(projectId);
  const projectSnap = await projectRef.get();
  if (!projectSnap.exists) {
    throw new HttpsError('not-found', 'Project not found.');
  }

  const project = projectSnap.data();
  if (!userOwnsProject(request.auth, project)) {
    throw new HttpsError('permission-denied', 'This project is not assigned to your account.');
  }
  if (project.quoteApproved !== true && !project.approvedQuoteId) {
    throw new HttpsError('failed-precondition', 'Approve the final negotiated quotation before signing the project agreement.');
  }

  const signedAt = new Date().toISOString();
  const signerPhone = request.auth.token.phone_number || '';
  const currentStageId = Number(project.stageId || 1);
  const signatureStamp = `${projectId}:${request.auth.uid}:${signedAt}`;
  const agreementVersion = Number(project.contractVersion || 1);
  const acceptanceText = 'I have reviewed the approved quotation and accept the project contract and terms and conditions, including payment milestones, confidentiality, intellectual property, warranty, change-order, dispute-resolution, and governing-law terms. I understand that the final drawings, bill of materials, scope, exclusions, deliverables, and outcomes will be issued after the initial payment and must be signed before production begins.';
  const rawForwardedFor = request.rawRequest?.headers?.['x-forwarded-for'];
  const ipAddress = String(Array.isArray(rawForwardedFor) ? rawForwardedFor[0] : rawForwardedFor || request.rawRequest?.ip || '')
    .split(',')[0]
    .trim()
    .slice(0, 80);

  const [byProjectId, byParentId] = await Promise.all([
    db.collection('invoices').where('projectId', '==', projectId).get(),
    db.collection('invoices').where('parentId', '==', projectId).get(),
  ]);
  const allInvoices = [...byProjectId.docs, ...byParentId.docs]
    .map(invoiceDoc => ({ id: invoiceDoc.id, ref: invoiceDoc.ref, ...invoiceDoc.data() }));
  const approvedQuote = allInvoices
    .filter(invoice => {
      const descriptor = `${invoice.type || ''} ${invoice.documentKind || ''}`.toLowerCase();
      return descriptor.includes('quotation') || descriptor === 'quote';
    })
    .sort((a, b) => Number(b.version || 0) - Number(a.version || 0))[0];
  const existingDepositInvoice = allInvoices.find(isInitialDeposit);
  const quoteTotal = parseMoney(approvedQuote?.total || approvedQuote?.amount || project.projectTotal || project.budget);
  const configuredDeposit = parseMoney(project.milestones?.find?.(item =>
    ['initial-deposit', 'post-rendering'].includes(item.milestoneKey || item.key)
  )?.amount);
  const initialDepositAmount = configuredDeposit > 0 ? configuredDeposit : quoteTotal * 0.60;
  const depositInvoiceRef = existingDepositInvoice?.ref || db.collection('invoices').doc();
  const depositInvoiceId = existingDepositInvoice?.id || depositInvoiceRef.id;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7);

  const batch = db.batch();
  batch.set(projectRef, {
    contractAccepted: true,
    contractSignedName: typedName,
    quoteSignature: signatureData,
    quoteSignedAt: FieldValue.serverTimestamp(),
    quoteSignedByUid: request.auth.uid,
    quoteSignedByPhone: signerPhone,
    quoteVerificationStamp: {
      ipAddress,
      userAgent,
      timestamp: signedAt,
      signatureStamp,
    },
    kickoffGateCleared: true,
    workflowStep: 'initial-payment',
    initialDepositInvoiceId: depositInvoiceId,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  batch.set(depositInvoiceRef, {
    projectId,
    parentId: projectId,
    clientId: project.clientId || '',
    clientEmail: project.clientEmail || project.email || '',
    quoteId: approvedQuote?.id || project.approvedQuoteId || '',
    title: 'Contract Signed — Initial Project Payment',
    type: 'Milestone',
    documentKind: 'invoice',
    milestoneKey: 'initial-deposit',
    paymentPurpose: 'initial_deposit',
    amount: initialDepositAmount,
    total: initialDepositAmount,
    amountPaid: Number(existingDepositInvoice?.amountPaid || 0),
    currency: approvedQuote?.currency || 'GHS',
    status: isPaid(existingDepositInvoice?.status) ? existingDepositInvoice.status : 'Sent',
    due: dueDate.toISOString().slice(0, 10),
    activatedAt: FieldValue.serverTimestamp(),
    activatedAtStage: 3,
    autoGenerated: !existingDepositInvoice,
    createdAt: existingDepositInvoice?.createdAt || FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  const signedDocumentRef = projectRef.collection('documents').doc(`signed-project-agreement-v${agreementVersion}`);
  batch.set(signedDocumentRef, {
    name: `Project Agreement v${agreementVersion}`,
    type: 'signed_project_agreement',
    documentKind: 'project_agreement',
    status: 'signed',
    immutable: true,
    clientVisible: true,
    stageId: 3,
    version: agreementVersion,
    projectId,
    clientId: project.clientId || '',
    projectTitle: project.title || '',
    signedAt,
    signedBy: typedName,
    signedByUid: request.auth.uid,
    signedByPhone: signerPhone,
    signatureMethod: 'electronic-signature',
    signatureData,
    signatureStamp,
    acceptanceText,
    legalConsent: true,
    verification: {
      ipAddress,
      userAgent,
    },
    createdAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  const activityRef = projectRef.collection('activityLogs').doc();
  batch.set(activityRef, {
    actor: 'client',
    actorId: request.auth.uid,
    actorName: typedName,
    actionType: 'project_agreement_signed',
    actionDescription: 'Signed the project contract and terms. The initial project payment is now due.',
    agreementVersion,
    legalConsent: true,
    signatureMethod: 'electronic-signature',
    signatureStamp,
    stageAdvancedTo: null,
    timestamp: FieldValue.serverTimestamp(),
  });

  const recipients = [...new Set([
    'admin',
    project.projectManagerId,
    ...(Array.isArray(project.assignedStaff) ? project.assignedStaff : []),
  ].filter(Boolean))];
  recipients.forEach(userId => {
    const notificationRef = db.collection('notifications').doc();
    batch.set(notificationRef, {
      userId,
      title: 'Project agreement signed',
      message: `${typedName} signed the agreement for "${project.title || 'project'}". Monitor or verify the initial project payment.`,
      msg: `${typedName} signed the project agreement.`,
      type: 'contract_signed',
      link: '/admin/client-hub',
      projectId,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  if (project.clientId) {
    const clientMessageRef = db.collection('clients').doc(project.clientId).collection('messages').doc();
    batch.set(clientMessageRef, {
      text: `Project agreement signed successfully. Your initial project payment of GHS ${initialDepositAmount.toLocaleString()} is now due. Once verified, Westline Future will issue the final deliverables and scope document for signature.`,
      senderRole: 'system',
      isInternal: false,
      readByAdmin: false,
      readByClient: true,
      projectId,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();

  return {
    signed: true,
    stageAdvanced: false,
    stageId: currentStageId,
    depositInvoiceId,
    signedAt,
    signatureStamp,
  };
});

exports.scheduleProjectSiteVisit = onCall(CORS_OPTS, async request => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in before scheduling a site visit.');
  }

  const projectId = String(request.data?.projectId || '').trim();
  const startAt = new Date(String(request.data?.startAt || ''));
  const durationMinutes = Math.min(480, Math.max(30, Number(request.data?.durationMinutes || 120)));
  const source = ['client_portal', 'phone', 'admin'].includes(request.data?.source)
    ? request.data.source
    : 'client_portal';
  const notes = String(request.data?.notes || '').trim().slice(0, 1000);
  if (!projectId || Number.isNaN(startAt.getTime()) || startAt.getTime() < Date.now() + 30 * 60 * 1000) {
    throw new HttpsError('invalid-argument', 'Choose a valid future date and time for the site visit.');
  }

  const db = getFirestore();
  const projectRef = db.collection('projects').doc(projectId);
  const projectSnap = await projectRef.get();
  if (!projectSnap.exists) throw new HttpsError('not-found', 'Project not found.');
  const project = projectSnap.data();
  const role = await getUserRole(db, request.auth);
  const privileged = isPrivilegedRole(role);
  if (!privileged && !userOwnsProject(request.auth, project)) {
    throw new HttpsError('permission-denied', 'This project is not assigned to your account.');
  }
  if (project.kickoffMode !== 'direct-kickoff' && project.renderingFeePaid !== true) {
    throw new HttpsError('failed-precondition', 'The rendering fee must be verified before scheduling the technical site visit.');
  }
  if (project.siteVisit?.status === 'completed') {
    throw new HttpsError('failed-precondition', 'This technical site visit is already completed.');
  }
  if (!privileged && source !== 'client_portal') {
    throw new HttpsError('permission-denied', 'Only staff can record phone or admin-arranged appointments.');
  }

  const endAt = new Date(startAt.getTime() + durationMinutes * 60000);
  const scheduledAt = new Date().toISOString();
  const actorName = String(request.data?.actorName || request.auth.token.name || role || 'Client').slice(0, 120);
  const siteVisit = {
    status: 'scheduled',
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    durationMinutes,
    timezone: String(request.data?.timezone || 'Africa/Accra').slice(0, 80),
    source: privileged ? source : 'client_portal',
    notes,
    scheduledBy: request.auth.uid,
    scheduledByName: actorName,
    scheduledAt,
    completedAt: null,
  };

  const batch = db.batch();
  batch.set(projectRef, {
    siteVisit,
    workflowStep: 'site-survey',
    nextAction: 'Technical team completes the scheduled site survey and uploads measurements and photos',
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  const activityRef = projectRef.collection('activityLogs').doc();
  batch.set(activityRef, {
    actor: privileged ? 'staff' : 'client',
    actorId: request.auth.uid,
    actorName,
    actionType: 'site_visit_scheduled',
    actionDescription: `Scheduled the technical site visit for ${startAt.toISOString()}.`,
    siteVisit,
    timestamp: FieldValue.serverTimestamp(),
  });

  const recipients = [...new Set([
    'admin',
    project.projectManagerId,
    ...(Array.isArray(project.assignedStaff) ? project.assignedStaff : []),
    ...(Array.isArray(project.assignedWorkers) ? project.assignedWorkers : []),
    project.clientId,
  ].filter(Boolean))];
  recipients.forEach(userId => {
    const notificationRef = db.collection('notifications').doc();
    const appointmentMessage = `The technical site visit for "${project.title || 'project'}" is scheduled for ${startAt.toLocaleString('en-GB', { timeZone: siteVisit.timezone })}.`;
    batch.set(notificationRef, {
      userId,
      clientId: userId === project.clientId ? project.clientId : null,
      title: 'Site visit scheduled',
      message: notes ? `${appointmentMessage} Access note: ${notes}` : appointmentMessage,
      msg: notes ? `Site visit confirmed. Note: ${notes}` : 'Site visit appointment confirmed.',
      type: 'site_visit_scheduled',
      link: userId === project.clientId
        ? `/portal?projectId=${encodeURIComponent(projectId)}&tab=overview`
        : `/admin/operations?client=${encodeURIComponent(project.clientId || '')}&project=${encodeURIComponent(projectId)}&tab=overview`,
      projectId,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
  await batch.commit();
  return { scheduled: true, siteVisit };
});

exports.completeProjectSiteVisit = onCall(CORS_OPTS, async request => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in before completing a site visit.');
  }
  const projectId = String(request.data?.projectId || '').trim();
  const notes = String(request.data?.notes || '').trim().slice(0, 2000);
  const evidenceUrls = Array.isArray(request.data?.evidenceUrls)
    ? request.data.evidenceUrls.filter(url => String(url).startsWith('https://')).slice(0, 30)
    : [];
  if (!projectId) throw new HttpsError('invalid-argument', 'Project is required.');

  const db = getFirestore();
  const projectRef = db.collection('projects').doc(projectId);
  const projectSnap = await projectRef.get();
  if (!projectSnap.exists) throw new HttpsError('not-found', 'Project not found.');
  const project = projectSnap.data();
  const role = await getUserRole(db, request.auth);
  const assignedWorker = Array.isArray(project.assignedWorkers) && project.assignedWorkers.includes(request.auth.uid);
  if (!isPrivilegedRole(role) && !assignedWorker) {
    throw new HttpsError('permission-denied', 'Only assigned technical workers or project staff can complete this visit.');
  }
  if (project.siteVisit?.status !== 'scheduled') {
    throw new HttpsError('failed-precondition', 'Schedule the site visit before marking it complete.');
  }

  const completedAt = new Date().toISOString();
  const batch = db.batch();
  batch.set(projectRef, {
    siteVisit: {
      ...project.siteVisit,
      status: 'completed',
      completedAt,
      completedBy: request.auth.uid,
      completionNotes: notes,
      evidenceUrls,
    },
    siteSurveyCompleted: true,
    siteSurveyCompletedAt: FieldValue.serverTimestamp(),
    stageId: Math.max(Number(project.stageId || 1), 2),
    progress: Math.max(Number(project.progress || 0), 20),
    workflowStep: 'rendering-review',
    nextAction: 'Design team prepares and uploads the 3D rendering for client review',
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  const activityRef = projectRef.collection('activityLogs').doc();
  batch.set(activityRef, {
    actor: assignedWorker ? 'worker' : 'staff',
    actorId: request.auth.uid,
    actionType: 'site_visit_completed',
    actionDescription: 'Completed the technical site survey, measurements, and evidence capture.',
    notes,
    evidenceUrls,
    timestamp: FieldValue.serverTimestamp(),
  });
  const recipients = [...new Set([
    'admin',
    project.projectManagerId,
    ...(Array.isArray(project.assignedStaff) ? project.assignedStaff : []),
    project.clientId,
  ].filter(Boolean))];
  recipients.forEach(userId => {
    const notificationRef = db.collection('notifications').doc();
    batch.set(notificationRef, {
      userId,
      clientId: userId === project.clientId ? project.clientId : null,
      title: 'Site survey completed',
      message: userId === project.clientId
        ? `The technical visit for "${project.title || 'project'}" is complete. The design team is now preparing your 3D rendering.`
        : `The technical visit for "${project.title || 'project'}" is complete. Prepare and upload the 3D rendering.`,
      msg: 'Site survey completed.',
      type: 'site_visit_completed',
      link: userId === project.clientId ? '/portal?tab=overview' : '/admin/client-hub',
      projectId,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
  await batch.commit();
  return { completed: true, completedAt };
});

exports.translateChatMessage = onCall(CORS_OPTS, async request => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in before translating a message.');
  }

  const text = String(request.data?.text || '').trim();
  const requestedSource = String(request.data?.sourceLang || '').trim();
  const requestedTarget = String(request.data?.targetLang || '').trim();
  const supported = new Set(['en', 'zh-CN']);
  if (!text || text.length > 5000 || !supported.has(requestedTarget)) {
    throw new HttpsError('invalid-argument', 'Text and a supported target language are required.');
  }

  const sourceLang = supported.has(requestedSource)
    ? requestedSource
    : /[\u3400-\u9fff]/.test(text) ? 'zh-CN' : 'en';
  if (sourceLang === requestedTarget) {
    return { translated: text, sourceLanguage: sourceLang, targetLanguage: requestedTarget };
  }

  try {
    const projectId = await translationClient.getProjectId();
    const [response] = await translationClient.translateText({
      parent: `projects/${projectId}/locations/global`,
      contents: [text],
      mimeType: 'text/plain',
      sourceLanguageCode: sourceLang,
      targetLanguageCode: requestedTarget,
    });
    const translated = decodeTranslationEntities(response.translations?.[0]?.translatedText);
    if (!translated) throw new Error('Translation provider returned no text.');
    return { translated, sourceLanguage: sourceLang, targetLanguage: requestedTarget };
  } catch (error) {
    console.error('[translateChatMessage] Google Cloud Translation failed', error);
    throw new HttpsError('unavailable', 'Translation is temporarily unavailable. Please try again.');
  }
});

exports.registerProjectUpload = onCall(CORS_OPTS, async request => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in before registering an upload.');
  }

  const projectId = String(request.data?.projectId || '').trim();
  const fileName = String(request.data?.fileName || '').trim().slice(0, 180);
  const fileUrl = String(request.data?.fileUrl || '').trim();
  const fileType = String(request.data?.fileType || 'application/octet-stream').trim().slice(0, 120);
  const size = Number(request.data?.size || 0);
  if (!projectId || !fileName || !fileUrl.startsWith('https://') || !Number.isFinite(size) || size < 0 || size > 15 * 1024 * 1024) {
    throw new HttpsError('invalid-argument', 'Valid project and uploaded file details are required.');
  }

  const db = getFirestore();
  const projectRef = db.collection('projects').doc(projectId);
  const projectSnap = await projectRef.get();
  if (!projectSnap.exists) throw new HttpsError('not-found', 'Project not found.');
  const project = projectSnap.data();
  const role = await getUserRole(db, request.auth);
  const permitted = userOwnsProject(request.auth, project) || isPrivilegedRole(role);
  if (!permitted) {
    throw new HttpsError('permission-denied', 'You do not have upload access to this project.');
  }

  const uploaderName = String(request.data?.uploadedBy || request.auth.token.name || 'Project user').trim().slice(0, 120);
  const actorRole = userOwnsProject(request.auth, project) ? 'client' : 'staff';
  const batch = db.batch();
  const uploadRef = projectRef.collection('inspiration').doc();
  batch.set(uploadRef, {
    fileName,
    fileUrl,
    fileType,
    size,
    uploadedBy: uploaderName,
    uploaderId: request.auth.uid,
    actorRole,
    projectId,
    createdAt: FieldValue.serverTimestamp(),
  });
  const activityRef = projectRef.collection('activityLogs').doc();
  batch.set(activityRef, {
    actor: actorRole,
    actorId: request.auth.uid,
    actorName: uploaderName,
    actionType: 'upload',
    actionDescription: `Uploaded a new file: ${fileName}`,
    fileUrl,
    timestamp: FieldValue.serverTimestamp(),
  });

  if (actorRole === 'client') {
    const recipients = [...new Set([
      'admin',
      project.projectManagerId,
      ...(Array.isArray(project.assignedStaff) ? project.assignedStaff : []),
    ].filter(Boolean))];
    recipients.forEach(userId => {
      const notificationRef = db.collection('notifications').doc();
      batch.set(notificationRef, {
        userId,
        title: 'New client upload',
        message: `${uploaderName} uploaded "${fileName}" to "${project.title || 'project'}".`,
        msg: `${uploaderName} uploaded "${fileName}".`,
        type: 'client_upload',
        link: '/admin/client-hub',
        projectId,
        uploadId: uploadRef.id,
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });
    });
  }

  await batch.commit();
  return { registered: true, uploadId: uploadRef.id };
});

exports.signVaultDocument = onCall(CORS_OPTS, async request => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in before signing a vault document.');
  }

  const projectId = String(request.data?.projectId || '').trim();
  const documentId = String(request.data?.documentId || '').trim();
  const signatureData = String(request.data?.signatureData || '');
  const legalConsent = request.data?.legalConsent === true;
  if (!projectId || !documentId || !legalConsent || !signatureData.startsWith('data:image/png;base64,') || signatureData.length > 350000) {
    throw new HttpsError('invalid-argument', 'A valid signature and legal consent are required.');
  }

  const db = getFirestore();
  const projectRef = db.collection('projects').doc(projectId);
  const documentRef = projectRef.collection('vault').doc(documentId);
  const [projectSnap, documentSnap] = await Promise.all([projectRef.get(), documentRef.get()]);
  if (!projectSnap.exists || !documentSnap.exists) {
    throw new HttpsError('not-found', 'Project or vault document not found.');
  }
  const project = projectSnap.data();
  const vaultDocument = documentSnap.data();
  if (!userOwnsProject(request.auth, project)) {
    throw new HttpsError('permission-denied', 'This project is not assigned to your account.');
  }
  if (!vaultDocument.requiresSignature) {
    throw new HttpsError('failed-precondition', 'This document does not require a signature.');
  }
  if (vaultDocument.signatureData || vaultDocument.signedAt) {
    throw new HttpsError('already-exists', 'This document has already been signed.');
  }

  const signerName = String(request.data?.signerName || request.auth.token.name || 'Client').trim().slice(0, 120);
  const signedAt = new Date().toISOString();
  const batch = db.batch();
  batch.set(documentRef, {
    signatureData,
    signedAt,
    signedAtServer: FieldValue.serverTimestamp(),
    signedBy: signerName,
    signedByUid: request.auth.uid,
    signedByPhone: request.auth.token.phone_number || '',
    signatureMethod: 'drawn-electronic-signature',
    legalConsent: true,
    immutable: true,
  }, { merge: true });
  const activityRef = projectRef.collection('activityLogs').doc();
  batch.set(activityRef, {
    actor: 'client',
    actorId: request.auth.uid,
    actorName: signerName,
    actionType: 'vault_document_signed',
    actionDescription: `Signed vault document: ${vaultDocument.name || 'Document'}`,
    documentId,
    legalConsent: true,
    timestamp: FieldValue.serverTimestamp(),
  });
  const recipients = [...new Set([
    'admin',
    project.projectManagerId,
    ...(Array.isArray(project.assignedStaff) ? project.assignedStaff : []),
  ].filter(Boolean))];
  recipients.forEach(userId => {
    const notificationRef = db.collection('notifications').doc();
    batch.set(notificationRef, {
      userId,
      title: 'Vault document signed',
      message: `${signerName} signed "${vaultDocument.name || 'a project document'}".`,
      msg: `${signerName} signed "${vaultDocument.name || 'a project document'}".`,
      type: 'vault_document_signed',
      link: '/admin/client-hub',
      projectId,
      documentId,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
  await batch.commit();
  return { signed: true, signedAt };
});

exports.toggleProjectTeamAssignment = onCall(CORS_OPTS, async request => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in before changing project assignments.');
  }

  const projectId = String(request.data?.projectId || '').trim();
  const memberId = String(request.data?.memberId || '').trim();
  if (!projectId || !memberId) {
    throw new HttpsError('invalid-argument', 'Project and team member are required.');
  }

  const db = getFirestore();
  const callerRole = await getUserRole(db, request.auth);
  if (!isPrivilegedRole(callerRole)) {
    throw new HttpsError('permission-denied', 'Your account cannot change project assignments.');
  }

  const projectRef = db.collection('projects').doc(projectId);
  const memberRef = db.collection('users').doc(memberId);
  const result = await db.runTransaction(async transaction => {
    const [projectSnap, memberSnap] = await Promise.all([
      transaction.get(projectRef),
      transaction.get(memberRef),
    ]);
    if (!projectSnap.exists) throw new HttpsError('not-found', 'Project not found.');
    if (!memberSnap.exists) throw new HttpsError('not-found', 'Team member not found.');

    const project = projectSnap.data();
    const member = memberSnap.data();
    const roleText = `${member.role || ''} ${member.jobRole || ''}`.toLowerCase();
    const isWorker = /worker|installer|field|technician|technical team lead/.test(roleText);
    const isProjectManager = !isWorker && /project manager|account manager/.test(roleText);
    const currentWorkers = Array.isArray(project.assignedWorkers) ? project.assignedWorkers : [];
    const currentStaff = Array.isArray(project.assignedStaff) ? project.assignedStaff : [];
    const isAssigned = currentWorkers.includes(memberId)
      || currentStaff.includes(memberId)
      || project.projectManagerId === memberId;

    const assignedWorkers = currentWorkers.filter(id => id !== memberId);
    const assignedStaff = currentStaff.filter(id => id !== memberId);
    if (!isAssigned) {
      (isWorker ? assignedWorkers : assignedStaff).push(memberId);
    }

    const projectUpdate = {
      assignedWorkers: [...new Set(assignedWorkers)],
      assignedStaff: [...new Set(assignedStaff)],
      updatedAt: FieldValue.serverTimestamp(),
      lastAssignmentUpdatedBy: request.auth.uid,
    };
    if (isProjectManager && !isAssigned) {
      projectUpdate.projectManagerId = memberId;
    } else if (project.projectManagerId === memberId && isAssigned) {
      projectUpdate.projectManagerId = null;
    }
    transaction.set(projectRef, projectUpdate, { merge: true });

    const assignedProjects = Array.isArray(member.assignedProjects) ? member.assignedProjects : [];
    transaction.set(memberRef, {
      assignedProjects: isAssigned
        ? assignedProjects.filter(id => id !== projectId)
        : [...new Set([...assignedProjects, projectId])],
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    const activityRef = projectRef.collection('activityLogs').doc();
    transaction.set(activityRef, {
      actor: 'staff',
      actorId: request.auth.uid,
      actionType: isAssigned ? 'team_unassigned' : 'team_assigned',
      actionDescription: `${member.name || member.email || 'Team member'} ${isAssigned ? 'removed from' : 'assigned to'} project as ${isWorker ? 'worker' : isProjectManager ? 'project manager' : 'staff'}.`,
      memberId,
      timestamp: FieldValue.serverTimestamp(),
    });

    if (!isAssigned) {
      const notificationRef = db.collection('notifications').doc();
      transaction.set(notificationRef, {
        userId: memberId,
        title: 'New project assignment',
        message: `You were assigned to "${project.title || project.project || 'a project'}" as ${member.jobRole || (isWorker ? 'Field Worker' : 'Project Team')}.`,
        msg: `You were assigned to "${project.title || project.project || 'a project'}".`,
        type: 'project_assignment',
        link: isWorker ? '/work' : '/admin/client-hub',
        projectId,
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    return {
      assigned: !isAssigned,
      isWorker,
      isProjectManager,
      memberName: member.name || member.email || 'Team member',
    };
  });

  return result;
});

exports.submitOfflinePayment = onCall(CORS_OPTS, async request => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in before submitting an offline payment.');
  }

  const invoiceId = String(request.data?.invoiceId || '').trim();
  const method = String(request.data?.method || '').trim().toLowerCase();
  const submittedAmount = Number(request.data?.amount || 0);
  const reference = String(request.data?.reference || '').trim().slice(0, 160);
  if (!invoiceId || !['bank', 'cash'].includes(method) || !Number.isFinite(submittedAmount) || submittedAmount <= 0) {
    throw new HttpsError('invalid-argument', 'Invoice, payment method, and a valid submitted amount are required.');
  }

  const db = getFirestore();
  const invoiceRef = db.collection('invoices').doc(invoiceId);
  const invoiceSnap = await invoiceRef.get();
  if (!invoiceSnap.exists) {
    throw new HttpsError('not-found', 'Invoice not found.');
  }

  const invoice = invoiceSnap.data();
  const projectId = String(invoice.projectId || invoice.parentId || request.data?.projectId || '').trim();
  let project = null;
  let projectRef = null;
  if (projectId) {
    projectRef = db.collection('projects').doc(projectId);
    const projectSnap = await projectRef.get();
    project = projectSnap.exists ? projectSnap.data() : null;
  }

  const authPhone = normalizePhone(request.auth.token.phone_number);
  const invoiceClientId = normalizePhone(invoice.clientId);
  const ownsInvoice = (project && userOwnsProject(request.auth, project))
    || request.auth.uid === invoice.clientId
    || (authPhone && invoiceClientId && authPhone === invoiceClientId);
  if (!ownsInvoice) {
    throw new HttpsError('permission-denied', 'This invoice is not assigned to your account.');
  }

  const invoiceTotal = Number(invoice.total ?? invoice.amount ?? 0) || 0;
  const alreadyPaid = Number(invoice.amountPaid ?? invoice.paidAmount ?? 0) || 0;
  const outstanding = Math.max(0, invoiceTotal - alreadyPaid);
  if (outstanding > 0 && submittedAmount > outstanding + 0.01) {
    throw new HttpsError('invalid-argument', 'The submitted amount is greater than the invoice balance.');
  }

  const submittedAt = new Date().toISOString();
  const methodLabel = method === 'bank' ? 'Bank Transfer' : 'Cash / In-Person';
  const submissionRef = db.collection('offlinePaymentSubmissions').doc();
  const batch = db.batch();
  batch.set(invoiceRef, {
    awaitingConfirmation: true,
    status: 'Verification Pending',
    paymentMethodSubmitted: method,
    paymentSubmittedAmount: submittedAmount,
    paymentSubmittedReference: reference,
    paymentSubmittedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  batch.set(submissionRef, {
    invoiceId,
    projectId,
    clientId: invoice.clientId || project?.clientId || '',
    clientUid: request.auth.uid,
    amount: submittedAmount,
    currency: invoice.currency || 'GHS',
    method,
    methodLabel,
    reference,
    status: 'pending_verification',
    submittedAt,
    createdAt: FieldValue.serverTimestamp(),
  });

  const recipients = [...new Set([
    'admin',
    project?.projectManagerId,
    ...(Array.isArray(project?.assignedStaff) ? project.assignedStaff : []),
  ].filter(Boolean))];
  const message = `${methodLabel} payment submitted for ${invoice.title || 'invoice'}: ${invoice.currency || 'GHS'} ${submittedAmount.toLocaleString()}. Verify receipt before marking it paid.`;
  recipients.forEach(userId => {
    const notificationRef = db.collection('notifications').doc();
    batch.set(notificationRef, {
      userId,
      title: 'Offline payment awaiting verification',
      message,
      msg: message,
      type: 'offline_payment_submitted',
      link: '/admin/client-hub',
      projectId,
      invoiceId,
      submissionId: submissionRef.id,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  if (project?.clientId) {
    const clientMessageRef = db.collection('clients').doc(project.clientId).collection('messages').doc();
    batch.set(clientMessageRef, {
      text: `🏦 **Payment submitted for verification**\n${methodLabel} — **${invoice.currency || 'GHS'} ${submittedAmount.toLocaleString()}**\nOur finance team will verify receipt and update your invoice.`,
      senderRole: 'system',
      senderId: 'system',
      senderName: 'Westline Future Billing',
      isInternal: false,
      readByAdmin: true,
      readByClient: false,
      projectId,
      invoiceId,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();
  return { submitted: true, submissionId: submissionRef.id, invoiceId, status: 'Verification Pending' };
});

exports.submitWorkerFieldReport = onCall(CORS_OPTS, async request => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in before submitting a field report.');
  }

  const projectId = String(request.data?.projectId || '').trim();
  const nextStage = Number(request.data?.nextStage || 0);
  const note = String(request.data?.note || '').trim().slice(0, 500);
  const qaReport = request.data?.qaReport;
  if (!projectId || !qaReport || ![6, 7].includes(nextStage)) {
    throw new HttpsError('invalid-argument', 'Project, QA report, and valid next stage are required.');
  }

  const db = getFirestore();
  const projectRef = db.collection('projects').doc(projectId);
  const projectSnap = await projectRef.get();
  if (!projectSnap.exists) throw new HttpsError('not-found', 'Project not found.');
  const project = projectSnap.data();
  const assignedWorkers = Array.isArray(project.assignedWorkers) ? project.assignedWorkers : [];
  if (!assignedWorkers.includes(request.auth.uid)) {
    throw new HttpsError('permission-denied', 'You are not assigned to this project.');
  }

  const currentStage = Number(project.stageId || 1);
  const allowedNextStage = currentStage === 5 ? 6 : currentStage === 6 ? 7 : null;
  if (allowedNextStage !== nextStage) {
    throw new HttpsError('failed-precondition', 'This field report does not match the project’s current stage.');
  }

  if (qaReport.devBypassed === true) {
    throw new HttpsError('failed-precondition', 'Development location bypasses cannot be submitted.');
  }
  const checklist = qaReport.checkedItems && typeof qaReport.checkedItems === 'object'
    ? Object.values(qaReport.checkedItems)
    : [];
  if (checklist.length === 0 || checklist.some(value => value !== true)) {
    throw new HttpsError('failed-precondition', 'Complete every required field checklist item before advancing.');
  }
  if (!String(qaReport.photoUrl || '').startsWith('http')) {
    throw new HttpsError('failed-precondition', 'Upload photographic evidence before completing this field stage.');
  }
  const projectHasCoordinates = Number.isFinite(Number(project.latitude)) && Number.isFinite(Number(project.longitude));
  const submittedDistance = Number(qaReport.siteDistanceMeters);
  if (projectHasCoordinates && (!Number.isFinite(submittedDistance) || submittedDistance > 100)) {
    throw new HttpsError('failed-precondition', 'The field report must be submitted within 100 metres of the project site.');
  }

  if (currentStage === 5) {
    const [byProjectId, byParentId] = await Promise.all([
      db.collection('invoices').where('projectId', '==', projectId).get(),
      db.collection('invoices').where('parentId', '==', projectId).get(),
    ]);
    const projectInvoices = [...byProjectId.docs, ...byParentId.docs].map(invoiceDoc => invoiceDoc.data());
    const goodsBalancePaid = project.goodsBalancePaid === true ||
      project.postProductionPaid === true ||
      projectInvoices.some(invoice => isGoodsBalance(invoice) && isPaid(invoice.status));
    const installationPaid = project.installationFeePaid === true ||
      projectInvoices.some(invoice => isInstallationInvoice(invoice) && isPaid(invoice.status));
    if (project.goodsArrivedInGhana !== true) {
      throw new HttpsError('failed-precondition', 'Confirm that the goods have arrived in Ghana before installation can begin.');
    }
    if (!goodsBalancePaid) {
      throw new HttpsError('failed-precondition', 'The final goods balance must be verified before installation can begin.');
    }
    if (project.projectType !== 'buy-only' && !installationPaid) {
      throw new HttpsError('failed-precondition', 'The separate installation-service invoice must be approved and paid before installation can begin.');
    }
  }

  const completedAt = new Date().toISOString();
  const batch = db.batch();
  batch.set(projectRef, {
    fieldQAReport: {
      ...qaReport,
      workerUid: request.auth.uid,
      verifiedAt: completedAt,
    },
    previousStageId: currentStage,
    stageId: nextStage,
    progress: nextStage === 6 ? 70 : 85,
    status: 'Active',
    lastStageAdvancedAt: FieldValue.serverTimestamp(),
    lastStageAdvancedBy: request.auth.uid,
    stageHistory: FieldValue.arrayUnion({
      stageId: nextStage,
      timestamp: completedAt,
      note: note || 'Field QA report completed by assigned worker.',
      source: 'worker-field-report',
      workerUid: request.auth.uid,
    }),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  const activityRef = projectRef.collection('activityLogs').doc();
  batch.set(activityRef, {
    actor: 'worker',
    actorId: request.auth.uid,
    actorName: qaReport.workerName || 'Field Worker',
    actionType: 'field_stage_completed',
    actionDescription: note || `Completed field requirements and advanced project to stage ${nextStage}.`,
    stageAdvancedFrom: currentStage,
    stageAdvancedTo: nextStage,
    qaReport,
    timestamp: FieldValue.serverTimestamp(),
  });

  const recipients = [...new Set([
    'admin',
    project.projectManagerId,
    ...(Array.isArray(project.assignedStaff) ? project.assignedStaff : []),
  ].filter(Boolean))];
  recipients.forEach(userId => {
    const notificationRef = db.collection('notifications').doc();
    batch.set(notificationRef, {
      userId,
      title: 'Field stage completed',
      message: `${qaReport.workerName || 'Assigned worker'} completed field QA for "${project.title || 'project'}".`,
      msg: `${qaReport.workerName || 'Assigned worker'} completed field QA and advanced the project.`,
      type: 'worker_stage_update',
      link: '/admin/client-hub',
      projectId,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
  return { submitted: true, projectId, stageId: nextStage };
});

exports.markGoodsArrivedInGhana = onCall(CORS_OPTS, async request => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in before confirming goods arrival.');
  }

  const projectId = String(request.data?.projectId || '').trim();
  const arrivalNote = String(request.data?.arrivalNote || '').trim().slice(0, 1000);
  if (!projectId) throw new HttpsError('invalid-argument', 'Project is required.');

  const db = getFirestore();
  const role = await getUserRole(db, request.auth);
  if (!isPrivilegedRole(role)) {
    throw new HttpsError('permission-denied', 'Only authorized staff can confirm goods arrival.');
  }

  const projectRef = db.collection('projects').doc(projectId);
  const projectSnap = await projectRef.get();
  if (!projectSnap.exists) throw new HttpsError('not-found', 'Project not found.');
  const project = projectSnap.data();
  if (Number(project.stageId || 1) < 5) {
    throw new HttpsError('failed-precondition', 'The project must be in Shipping & Delivery before goods arrival can be confirmed.');
  }

  const [byProjectId, byParentId] = await Promise.all([
    db.collection('invoices').where('projectId', '==', projectId).get(),
    db.collection('invoices').where('parentId', '==', projectId).get(),
  ]);
  const existingInvoice = [...byProjectId.docs, ...byParentId.docs]
    .map(invoiceDoc => ({ id: invoiceDoc.id, ref: invoiceDoc.ref, ...invoiceDoc.data() }))
    .find(isGoodsBalance);
  const projectTotal = parseMoney(project.projectTotal || project.budget);
  const configuredBalance = parseMoney(project.milestones?.find?.(item =>
    ['pre-installation-balance', 'post-production', 'post-shipping'].includes(item.milestoneKey || item.key)
  )?.amount);
  const balanceAmount = configuredBalance > 0 ? configuredBalance : projectTotal * 0.40;
  const invoiceRef = existingInvoice?.ref || db.collection('invoices').doc();
  const invoiceId = existingInvoice?.id || invoiceRef.id;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7);

  const batch = db.batch();
  batch.set(invoiceRef, {
    projectId,
    parentId: projectId,
    clientId: project.clientId || '',
    clientEmail: project.clientEmail || project.email || '',
    title: 'Goods Arrived in Ghana — Final Goods Balance',
    type: 'Milestone',
    documentKind: 'invoice',
    milestoneKey: 'pre-installation-balance',
    paymentPurpose: 'goods_balance',
    amount: balanceAmount,
    total: balanceAmount,
    amountPaid: Number(existingInvoice?.amountPaid || 0),
    currency: existingInvoice?.currency || 'GHS',
    status: isPaid(existingInvoice?.status) ? existingInvoice.status : 'Sent',
    due: dueDate.toISOString().slice(0, 10),
    activatedAt: FieldValue.serverTimestamp(),
    activatedAtStage: 5,
    autoGenerated: !existingInvoice,
    createdAt: existingInvoice?.createdAt || FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  batch.set(projectRef, {
    goodsArrivedInGhana: true,
    goodsArrivedInGhanaAt: FieldValue.serverTimestamp(),
    goodsArrivalConfirmedBy: request.auth.uid,
    goodsArrivalNote: arrivalNote,
    goodsBalanceInvoiceId: invoiceId,
    timelineStatus: isPaid(existingInvoice?.status) ? 'On track' : 'Waiting on payment',
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  const activityRef = projectRef.collection('activityLogs').doc();
  batch.set(activityRef, {
    actor: 'staff',
    actorId: request.auth.uid,
    actionType: 'goods_arrived_in_ghana',
    actionDescription: `Goods arrival in Ghana confirmed. Final goods balance invoice ${invoiceId} activated.`,
    invoiceId,
    note: arrivalNote,
    timestamp: FieldValue.serverTimestamp(),
  });

  if (project.clientId && !isPaid(existingInvoice?.status)) {
    const notificationRef = db.collection('notifications').doc();
    batch.set(notificationRef, {
      userId: project.clientId,
      clientId: project.clientId,
      title: 'Your goods have arrived in Ghana',
      message: `Your goods are in Ghana. Pay the final goods balance of GHS ${balanceAmount.toLocaleString()} before delivery to site and installation.`,
      msg: 'Final goods balance payment is required before installation.',
      type: 'payment_due',
      link: `/portal?projectId=${encodeURIComponent(projectId)}&tab=financials&invoiceId=${encodeURIComponent(invoiceId)}`,
      projectId,
      invoiceId,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();
  return { confirmed: true, invoiceId, amount: balanceAmount };
});

exports.submitProjectSignoff = onCall(CORS_OPTS, async request => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in before approving the final inspection.');
  }

  const projectId = String(request.data?.projectId || '').trim();
  const approverName = String(request.data?.approverName || '').trim().replace(/\s+/g, ' ').slice(0, 120);
  const legalConsent = request.data?.legalConsent === true;
  if (!projectId || approverName.length < 3 || !legalConsent) {
    throw new HttpsError('invalid-argument', 'Project, full legal name, and sign-off consent are required.');
  }

  const db = getFirestore();
  const projectRef = db.collection('projects').doc(projectId);
  const projectSnap = await projectRef.get();
  if (!projectSnap.exists) throw new HttpsError('not-found', 'Project not found.');
  const project = projectSnap.data();
  if (!userOwnsProject(request.auth, project)) {
    throw new HttpsError('permission-denied', 'This project is not assigned to your account.');
  }
  if (Number(project.stageId || 1) !== 7) {
    throw new HttpsError('failed-precondition', 'Final inspection sign-off is only available during Inspection & Sign-off.');
  }

  const signedAt = new Date().toISOString();
  const batch = db.batch();
  batch.set(projectRef, {
    signOffApproved: true,
    signOffApprovedAt: FieldValue.serverTimestamp(),
    signOffApprovedBy: request.auth.uid,
    signOffApprovedByName: approverName,
    signOffLegalConsent: true,
    previousStageId: 7,
    stageId: 8,
    progress: 100,
    status: 'Completed',
    timelineStatus: 'Completed',
    lastStageAdvancedAt: FieldValue.serverTimestamp(),
    lastStageAdvancedBy: request.auth.uid,
    stageHistory: FieldValue.arrayUnion({
      stageId: 8,
      timestamp: signedAt,
      note: 'Client signed off the final inspection. Project moved to handover and closeout.',
      source: 'client-inspection-signoff',
    }),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  const activityRef = projectRef.collection('activityLogs').doc();
  batch.set(activityRef, {
    actor: 'client',
    actorId: request.auth.uid,
    actorName: approverName,
    actionType: 'inspection_signed_off',
    actionDescription: 'Approved final inspection; project advanced to handover and closeout.',
    legalConsent: true,
    timestamp: FieldValue.serverTimestamp(),
  });

  const recipients = [...new Set([
    'admin',
    project.projectManagerId,
    ...(Array.isArray(project.assignedStaff) ? project.assignedStaff : []),
  ].filter(Boolean))];
  recipients.forEach(userId => {
    const notificationRef = db.collection('notifications').doc();
    batch.set(notificationRef, {
      userId,
      title: 'Final inspection signed off',
      message: `${approverName} signed off "${project.title || 'the project'}". The project moved to handover and closeout.`,
      msg: `${approverName} completed final inspection sign-off.`,
      type: 'inspection_signoff',
      link: '/admin/client-hub',
      projectId,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
  return {
    signedOff: true,
    advancedToHandover: true,
    finalPaymentRequired: false,
  };
});

exports.respondToProjectAddOn = onCall(CORS_OPTS, async request => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in before responding to an add-on.');
  }

  const addOnId = String(request.data?.addOnId || '').trim();
  const decision = String(request.data?.decision || '').trim().toLowerCase();
  const note = String(request.data?.note || '').trim().slice(0, 1000);
  if (!addOnId || !['approve', 'reject'].includes(decision)) {
    throw new HttpsError('invalid-argument', 'Add-on and decision are required.');
  }

  const db = getFirestore();
  const addOnRef = db.collection('addOns').doc(addOnId);

  const result = await db.runTransaction(async transaction => {
    const addOnSnap = await transaction.get(addOnRef);
    if (!addOnSnap.exists) throw new HttpsError('not-found', 'Add-on not found.');
    const addOn = addOnSnap.data();
    const projectRef = db.collection('projects').doc(addOn.projectId);
    const projectSnap = await transaction.get(projectRef);
    if (!projectSnap.exists) throw new HttpsError('not-found', 'Project not found.');
    const project = projectSnap.data();

    if (!userOwnsProject(request.auth, project)) {
      throw new HttpsError('permission-denied', 'This project is not assigned to your account.');
    }
    if (!['pending approval', 'pending', 'draft'].includes(String(addOn.status || '').toLowerCase())) {
      throw new HttpsError('failed-precondition', 'This add-on has already been answered.');
    }

    if (decision === 'reject') {
      transaction.set(addOnRef, {
        status: 'Changes Requested',
        clientDecision: 'rejected',
        clientNote: note,
        respondedAt: FieldValue.serverTimestamp(),
        respondedBy: request.auth.uid,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      return { approved: false, project, addOn, invoiceId: null };
    }

    const amount = Number(addOn.amount || addOn.price || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new HttpsError('failed-precondition', 'The add-on must have a valid price before approval.');
    }
    const invoiceRef = db.collection('invoices').doc();
    const installationInvoice = addOn.isInstallationInvoice === true || addOn.category === 'installation';
    transaction.set(invoiceRef, {
      projectId: addOn.projectId,
      parentId: addOn.projectId,
      clientId: project.clientId || addOn.clientId || '',
      clientEmail: project.clientEmail || project.email || '',
      addOnId,
      title: `Add-On: ${addOn.title || 'Project variation'}`,
      type: 'Add-On Invoice',
      documentKind: 'invoice',
      paymentPurpose: installationInvoice ? 'installation' : 'add_on',
      isInstallationInvoice: installationInvoice,
      addOnCategory: addOn.category || 'general',
      amount,
      total: amount,
      amountPaid: 0,
      currency: 'GHS',
      status: 'Sent',
      items: [{
        desc: addOn.title || addOn.description || 'Project add-on',
        qty: 1,
        rate: amount,
        total: amount,
      }],
      createdAt: FieldValue.serverTimestamp(),
      approvedByClientAt: FieldValue.serverTimestamp(),
    });
    transaction.set(addOnRef, {
      linkedInvoiceId: invoiceRef.id,
      status: 'Pending Payment',
      clientDecision: 'approved',
      clientNote: note,
      approvedAt: FieldValue.serverTimestamp(),
      approvedBy: request.auth.uid,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    transaction.set(projectRef, {
      approvedAddOnsTotal: FieldValue.increment(amount),
      projectTotal: FieldValue.increment(amount),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return { approved: true, project, addOn, invoiceId: invoiceRef.id };
  });

  const batch = db.batch();
  const recipients = [...new Set([
    'admin',
    result.project.projectManagerId,
    ...(Array.isArray(result.project.assignedStaff) ? result.project.assignedStaff : []),
  ].filter(Boolean))];
  recipients.forEach(userId => {
    const notificationRef = db.collection('notifications').doc();
    batch.set(notificationRef, {
      userId,
      title: result.approved ? 'Add-on approved' : 'Add-on changes requested',
      message: result.approved
        ? `The client approved "${result.addOn.title}". Invoice ${result.invoiceId} is now due.`
        : `The client requested changes to "${result.addOn.title}".${note ? ` Note: ${note}` : ''}`,
      type: result.approved ? 'add_on_approved' : 'add_on_changes_requested',
      link: '/admin/client-hub',
      projectId: result.addOn.projectId,
      addOnId,
      invoiceId: result.invoiceId,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
  await batch.commit();
  return { approved: result.approved, invoiceId: result.invoiceId };
});

const requireAssignedWorkerProject = async (db, auth, projectId) => {
  const projectRef = db.collection('projects').doc(projectId);
  const projectSnap = await projectRef.get();
  if (!projectSnap.exists) throw new HttpsError('not-found', 'Project not found.');
  const project = projectSnap.data();
  const assignedWorkers = Array.isArray(project.assignedWorkers) ? project.assignedWorkers : [];
  if (!assignedWorkers.includes(auth.uid)) {
    throw new HttpsError('permission-denied', 'You are not assigned to this project.');
  }
  return { projectRef, project };
};

exports.submitWorkerProjectNote = onCall(CORS_OPTS, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in before posting a field update.');
  const projectId = String(request.data?.projectId || '').trim();
  const text = String(request.data?.text || '').trim().slice(0, 2000);
  if (!projectId || !text) throw new HttpsError('invalid-argument', 'Project and update text are required.');

  const db = getFirestore();
  const { projectRef, project } = await requireAssignedWorkerProject(db, request.auth, projectId);
  const batch = db.batch();
  const messageRef = projectRef.collection('messages').doc();
  batch.set(messageRef, {
    text,
    senderRole: 'worker',
    senderId: request.auth.uid,
    senderName: request.data?.workerName || 'Field Worker',
    isInternal: false,
    createdAt: FieldValue.serverTimestamp(),
  });
  const activityRef = projectRef.collection('activityLogs').doc();
  batch.set(activityRef, {
    actor: 'worker',
    actorId: request.auth.uid,
    actorName: request.data?.workerName || 'Field Worker',
    actionType: 'field_note',
    actionDescription: text,
    timestamp: FieldValue.serverTimestamp(),
  });
  const recipients = [...new Set(['admin', project.projectManagerId, ...(project.assignedStaff || [])].filter(Boolean))];
  recipients.forEach(userId => {
    const notificationRef = db.collection('notifications').doc();
    batch.set(notificationRef, {
      userId,
      title: 'New field update',
      message: `${request.data?.workerName || 'Assigned worker'} posted an update on "${project.title || 'project'}".`,
      msg: text,
      type: 'worker_note',
      link: '/admin/client-hub',
      projectId,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
  await batch.commit();
  return { submitted: true };
});

exports.registerWorkerProjectDocument = onCall(CORS_OPTS, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in before registering a field document.');
  const projectId = String(request.data?.projectId || '').trim();
  const url = String(request.data?.url || '').trim();
  const name = String(request.data?.name || 'Field document').trim().slice(0, 180);
  if (!projectId || !url.startsWith('https://')) {
    throw new HttpsError('invalid-argument', 'Project and uploaded file URL are required.');
  }

  const db = getFirestore();
  const { projectRef } = await requireAssignedWorkerProject(db, request.auth, projectId);
  const documentRef = projectRef.collection('documents').doc();
  await documentRef.set({
    name,
    url,
    fileType: String(request.data?.fileType || 'application/octet-stream'),
    size: Number(request.data?.size || 0),
    stageId: Number(request.data?.stageId || 0) || null,
    docType: request.data?.docType || 'field_document',
    uploadedBy: request.data?.workerName || 'Field Worker',
    uploadedById: request.auth.uid,
    createdAt: FieldValue.serverTimestamp(),
  });
  return { registered: true, documentId: documentRef.id, fileUrl: url };
});

exports.signProjectSpecification = onCall(CORS_OPTS, async request => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in before signing the project specification.');
  }

  const projectId = String(request.data?.projectId || '').trim();
  const typedName = String(request.data?.typedName || '').trim().replace(/\s+/g, ' ');
  const documentVersion = Number(request.data?.documentVersion || 0);
  const documentAccepted = request.data?.documentAccepted === true;
  const legalConsent = request.data?.legalConsent === true;
  if (!projectId || typedName.length < 3 || typedName.length > 120) {
    throw new HttpsError('invalid-argument', 'Project and full legal name are required.');
  }
  if (!documentAccepted || !legalConsent) {
    throw new HttpsError('failed-precondition', 'Document review and legally binding signature consent are required.');
  }

  const db = getFirestore();
  const projectRef = db.collection('projects').doc(projectId);
  const projectSnap = await projectRef.get();
  if (!projectSnap.exists) {
    throw new HttpsError('not-found', 'Project not found.');
  }

  const project = projectSnap.data();
  if (!userOwnsProject(request.auth, project)) {
    throw new HttpsError('permission-denied', 'This project is not assigned to your account.');
  }
  if (project.contractAccepted !== true) {
    throw new HttpsError('failed-precondition', 'Sign the project contract and terms before signing the project brief.');
  }
  if (project.depositPaid !== true && project.initialDepositPaid !== true) {
    throw new HttpsError('failed-precondition', 'The initial project payment must be verified before signing the final deliverables document.');
  }
  if (
    project.kickoffMode === 'rendering-first' &&
    project.renderingApproved !== true &&
    project.designApproved !== true &&
    String(project.renderingStatus || '').toLowerCase() !== 'approved'
  ) {
    throw new HttpsError('failed-precondition', 'Approve the final rendering before signing the project brief.');
  }
  if (!project.specDoc?.url) {
    throw new HttpsError('failed-precondition', 'The project specification has not been uploaded.');
  }
  if (project.specDoc.status === 'rejected') {
    throw new HttpsError('failed-precondition', 'A revised specification must be uploaded before signing.');
  }
  const currentVersion = Number(project.specDoc.version || 1);
  if (documentVersion !== currentVersion) {
    throw new HttpsError('failed-precondition', 'This document has been revised. Reload and review the latest version before signing.');
  }

  const signedAt = new Date().toISOString();
  const signerPhone = request.auth.token.phone_number || '';
  const version = currentVersion;
  const currentStageId = Number(project.stageId || 1);
  const shouldAdvance = currentStageId < 4;
  const signatureStamp = `${projectId}:${version}:${request.auth.uid}:${signedAt}`;
  const acceptanceText = `I reviewed and accept project brief version ${version}, including its final drawings, bill of materials, quantities, specifications, scope, exclusions, deliverables, and expected outcomes. I intend this electronic signature to be legally binding and authorise Westline Future to begin procurement and production under the approved quotation and signed contract.`;

  const signedSpec = {
    ...project.specDoc,
    status: 'signed',
    version,
    reviewedAt: signedAt,
    reviewedBy: typedName,
    reviewNote: '',
    signedAt,
    signedBy: typedName,
    signedByUid: request.auth.uid,
    signedByPhone: signerPhone,
    signatureMethod: 'typed-name',
    signatureStamp,
    documentAccepted: true,
    legalConsent: true,
    signedDocumentName: project.specDoc.name || 'Project Specification',
    signedDocumentUrl: project.specDoc.url,
    acceptanceText,
  };

  const batch = db.batch();
  batch.set(projectRef, {
    specDoc: signedSpec,
    productionAuthorized: true,
    productionAuthorizedAt: FieldValue.serverTimestamp(),
    productionAuthorizedBy: request.auth.uid,
    ...(shouldAdvance ? {
      previousStageId: currentStageId,
      stageId: 4,
      workflowStep: 'production',
      progress: 45,
      status: 'Active',
      lastStageAdvancedAt: FieldValue.serverTimestamp(),
      lastStageAdvancedBy: request.auth.uid,
      stageHistory: FieldValue.arrayUnion({
        stageId: 4,
        timestamp: signedAt,
        note: 'Client signed the final deliverables document and authorised procurement and production.',
        source: 'client-spec-signature',
      }),
    } : {}),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  const signedDocumentRef = projectRef.collection('documents').doc(`signed-spec-v${version}`);
  batch.set(signedDocumentRef, {
    name: project.specDoc.name || `Project Specification v${version}`,
    url: project.specDoc.url,
    fileType: project.specDoc.fileType || 'application/pdf',
    type: 'signed_project_specification',
    documentKind: 'project_specification',
    status: 'signed',
    immutable: true,
    clientVisible: true,
    stageId: 4,
    version,
    projectId,
    clientId: project.clientId || '',
    projectTitle: project.title || '',
    signedAt,
    signedBy: typedName,
    signedByUid: request.auth.uid,
    signedByPhone: signerPhone,
    signatureMethod: 'typed-name',
    signatureStamp,
    acceptanceText,
    productionAuthorized: true,
    createdAt: FieldValue.serverTimestamp(),
  });

  const activityRef = projectRef.collection('activityLogs').doc();
  batch.set(activityRef, {
    actor: 'client',
    actorId: request.auth.uid,
    actorName: typedName,
    actionType: 'spec_signed',
    actionDescription: `Signed project brief version ${version} and authorised procurement and production.`,
    documentName: project.specDoc.name || 'Project Specification',
    documentVersion: version,
    documentUrl: project.specDoc.url,
    acceptanceText,
    legalConsent: true,
    signatureMethod: 'typed-name',
    signatureStamp,
    stageAdvancedTo: shouldAdvance ? 4 : null,
    timestamp: FieldValue.serverTimestamp(),
  });

  const notificationRecipients = [...new Set([
    'admin',
    project.projectManagerId,
    ...(Array.isArray(project.assignedStaff) ? project.assignedStaff : []),
  ].filter(Boolean))];
  notificationRecipients.forEach(userId => {
    const notificationRef = db.collection('notifications').doc();
    batch.set(notificationRef, {
      userId,
      title: 'Project brief signed',
      message: `${typedName} signed "${project.specDoc.name || 'Project Brief'}". Procurement and production are now authorised.`,
      msg: `${typedName} approved the final deliverables and authorised production.`,
      type: 'spec_signed',
      link: '/admin/client-hub',
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();

  return {
    signed: true,
    stageAdvanced: shouldAdvance,
    stageId: shouldAdvance ? 4 : currentStageId,
    productionAuthorized: true,
    productionUnlocked: true,
    signedAt,
    signatureStamp,
  };
});

exports.submitRenderingDecision = onCall(CORS_OPTS, async request => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in before responding to the rendering.');
  }

  const projectId = String(request.data?.projectId || '').trim();
  const packageId = String(request.data?.packageId || '').trim();
  const action = String(request.data?.action || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  const note = String(request.data?.note || '').trim().slice(0, 2000);
  const coordinates = request.data?.coordinates;
  if (!projectId || !packageId || !['approve', 'request_changes'].includes(action)) {
    throw new HttpsError('invalid-argument', 'Project, rendering package, and a valid decision are required.');
  }
  if (action === 'request_changes' && note.length < 3) {
    throw new HttpsError('invalid-argument', 'Describe the rendering changes you need.');
  }

  const db = getFirestore();
  const projectRef = db.collection('projects').doc(projectId);
  const packageRef = db.collection('renderingPackages').doc(packageId);
  const [projectSnap, packageSnap] = await Promise.all([projectRef.get(), packageRef.get()]);
  if (!projectSnap.exists || !packageSnap.exists) {
    throw new HttpsError('not-found', 'Project or rendering package not found.');
  }
  const project = projectSnap.data();
  const renderingPackage = packageSnap.data();
  if (!userOwnsProject(request.auth, project)) {
    throw new HttpsError('permission-denied', 'This project is not assigned to your account.');
  }
  if (renderingPackage.projectId !== projectId) {
    throw new HttpsError('permission-denied', 'This rendering package does not belong to the selected project.');
  }

  const clientName = project.clientName || request.auth.token?.name || 'Client';
  const batch = db.batch();
  const activityRef = projectRef.collection('activityLogs').doc();
  const notificationRef = db.collection('notifications').doc();
  let changeRequestId = null;

  if (action === 'approve') {
    batch.set(packageRef, {
      status: 'Approved',
      approvedAt: FieldValue.serverTimestamp(),
      approvedBy: request.auth.uid,
      approvalComment: note,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    batch.set(projectRef, {
      stageId: Math.max(Number(project.stageId || 1), 3),
      progress: Math.max(Number(project.progress || 0), 33),
      renderingApproved: true,
      renderingApprovedAt: FieldValue.serverTimestamp(),
      renderingStatus: 'approved',
      changeRequestPending: false,
      workflowStep: 'quote-negotiation',
      nextAction: 'Project manager prepares and issues the negotiated quotation',
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    batch.set(notificationRef, {
      userId: 'admin',
      title: '3D rendering approved',
      message: `${clientName} approved "${renderingPackage.title || project.title || 'the project rendering'}". Prepare the quotation.`,
      type: 'rendering_approved',
      link: '/admin/client-hub',
      projectId,
      clientId: project.clientId,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
    batch.set(activityRef, {
      actor: 'client',
      actorId: request.auth.uid,
      actorName: clientName,
      actionType: 'rendering_approved',
      actionDescription: `Approved "${renderingPackage.title || 'the 3D rendering'}".`,
      renderingPackageId: packageId,
      timestamp: FieldValue.serverTimestamp(),
    });
  } else {
    const revisionNumber = Number(renderingPackage.usedRevisions || 0) + 1;
    const changeRequestRef = db.collection('change_requests').doc();
    changeRequestId = changeRequestRef.id;
    batch.set(packageRef, {
      status: 'Changes Requested',
      usedRevisions: revisionNumber,
      changeRequestedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    batch.set(projectRef, {
      stageId: Number(project.stageId || 1) <= 3 ? 2 : Number(project.stageId || 1),
      progress: Number(project.stageId || 1) <= 3 ? 25 : Number(project.progress || 0),
      renderingApproved: false,
      renderingStatus: 'changes_requested',
      changeRequestPending: true,
      workflowStep: 'rendering-review',
      nextAction: 'Design team reviews feedback and uploads a revised 3D rendering',
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    batch.set(changeRequestRef, {
      projectId,
      clientId: project.clientId,
      renderingPackageId: packageId,
      type: 'rendering',
      status: 'pending',
      note,
      revisionNumber,
      requestedBy: request.auth.uid,
      requestedByName: clientName,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    if (
      coordinates &&
      Number.isFinite(Number(coordinates.x)) &&
      Number.isFinite(Number(coordinates.y))
    ) {
      const markupRef = projectRef.collection('markups').doc();
      batch.set(markupRef, {
        packageId,
        changeRequestId,
        x: Math.max(0, Math.min(100, Number(coordinates.x))),
        y: Math.max(0, Math.min(100, Number(coordinates.y))),
        note,
        authorName: clientName,
        authorRole: 'client',
        status: 'Open',
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    batch.set(notificationRef, {
      userId: 'admin',
      title: '3D rendering changes requested',
      message: `${clientName} requested revision ${revisionNumber}: ${note}`,
      type: 'change_request',
      link: '/admin/client-hub',
      projectId,
      clientId: project.clientId,
      changeRequestId,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
    batch.set(activityRef, {
      actor: 'client',
      actorId: request.auth.uid,
      actorName: clientName,
      actionType: 'rendering_changes_requested',
      actionDescription: `Requested changes to "${renderingPackage.title || 'the 3D rendering'}".`,
      renderingPackageId: packageId,
      changeRequestId,
      note,
      timestamp: FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();
  return {
    success: true,
    status: action === 'approve' ? 'approved' : 'changes_requested',
    changeRequestId,
  };
});

exports.approveProjectQuote = onCall(CORS_OPTS, async request => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in before approving the final quote.');
  }

  const projectId = String(request.data?.projectId || '').trim();
  const requestedQuoteId = String(request.data?.quoteId || '').trim();
  if (!projectId) {
    throw new HttpsError('invalid-argument', 'Project is required.');
  }

  const db = getFirestore();
  const projectRef = db.collection('projects').doc(projectId);
  const projectSnap = await projectRef.get();
  if (!projectSnap.exists) {
    throw new HttpsError('not-found', 'Project not found.');
  }

  const project = projectSnap.data();
  if (!userOwnsProject(request.auth, project)) {
    throw new HttpsError('permission-denied', 'This project is not assigned to your account.');
  }
  let renderingApproved = project.kickoffMode === 'direct-kickoff' ||
    project.renderingApproved === true ||
    project.designApproved === true ||
    String(project.renderingStatus || '').toLowerCase() === 'approved';

  // Fallback: check if any rendering package for this project is approved
  if (!renderingApproved) {
    const pkgSnap = await db.collection('renderingPackages')
      .where('projectId', '==', projectId).get();
    renderingApproved = pkgSnap.docs.some(d =>
      String(d.data().status || '').toLowerCase() === 'approved'
    );
    // If a package is approved, sync the flag back to the project doc
    if (renderingApproved) {
      db.collection('projects').doc(projectId).update({
        renderingApproved: true,
        renderingStatus: 'approved',
        updatedAt: FieldValue.serverTimestamp(),
      }).catch(() => {});
    }
  }

  if (!renderingApproved) {
    throw new HttpsError('failed-precondition', 'Approve the final rendering before approving the quotation.');
  }

  const [byProjectId, byParentId] = await Promise.all([
    db.collection('invoices').where('projectId', '==', projectId).get(),
    db.collection('invoices').where('parentId', '==', projectId).get(),
  ]);
  const quotes = new Map();
  [...byProjectId.docs, ...byParentId.docs].forEach(quoteDoc => {
    const quote = quoteDoc.data();
    const descriptor = `${quote.type || ''} ${quote.documentKind || ''}`.toLowerCase();
    if (descriptor.includes('quotation') || descriptor === 'quote') {
      quotes.set(quoteDoc.id, { id: quoteDoc.id, ref: quoteDoc.ref, ...quote });
    }
  });

  const quote = requestedQuoteId
    ? quotes.get(requestedQuoteId)
    : [...quotes.values()]
      .filter(item => !['cancelled', 'superseded', 'rejected'].includes(String(item.status || '').toLowerCase()))
      .sort((a, b) => Number(b.version || 0) - Number(a.version || 0))[0];

  if (!quote) {
    throw new HttpsError('failed-precondition', 'No final quotation has been issued for this project yet.');
  }
  if (String(quote.status || '').toLowerCase() === 'approved' && project.quoteApproved === true) {
    return { approved: true, quoteId: quote.id, alreadyApproved: true };
  }

  const approvedAt = new Date().toISOString();
  const approverName = String(request.data?.approverName || request.auth.token.name || project.clientName || 'Client').trim().slice(0, 120);
  const batch = db.batch();
  batch.set(projectRef, {
    stageId: Math.max(Number(project.stageId || 1), 3),
    progress: Math.max(Number(project.progress || 0), 38),
    quoteApproved: true,
    quoteApprovedAt: FieldValue.serverTimestamp(),
    quoteApprovedBy: request.auth.uid,
    activeQuoteId: quote.id,
    activeQuoteVersion: Number(quote.version || 1),
    approvedQuoteId: quote.id,
    quoteStatus: 'approved',
    quoteChangeRequested: false,
    quoteChangeRequestPending: false,
    quoteChangeRequestNote: '',
    workflowStep: 'contract-signing',
    nextAction: 'Client reviews and signs the project contract and terms',
    quoteSentAt: project.quoteSentAt || quote.createdAt || approvedAt,
    budget: String(Number(quote.total || quote.amount || project.budget || 0)),
    projectTotal: Number(quote.total || quote.amount || project.projectTotal || 0),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  batch.set(quote.ref, {
    status: 'Approved',
    approvedAt: FieldValue.serverTimestamp(),
    approvedBy: request.auth.uid,
    approvedByName: approverName,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  const activityRef = projectRef.collection('activityLogs').doc();
  batch.set(activityRef, {
    actor: 'client',
    actorId: request.auth.uid,
    actorName: approverName,
    actionType: 'quote_approved',
    actionDescription: `Approved final quotation "${quote.title || quote.id}".`,
    quoteId: quote.id,
    quoteVersion: Number(quote.version || 1),
    timestamp: FieldValue.serverTimestamp(),
  });

  const recipients = [...new Set([
    'admin',
    project.projectManagerId,
    ...(Array.isArray(project.assignedStaff) ? project.assignedStaff : []),
  ].filter(Boolean))];
  recipients.forEach(userId => {
    const notificationRef = db.collection('notifications').doc();
    batch.set(notificationRef, {
      userId,
      title: 'Final quote approved',
      message: `${approverName} approved "${quote.title || 'the final quotation'}" for "${project.title || 'project'}".`,
      msg: `${approverName} approved the final quote.`,
      type: 'quote_approved',
      link: '/admin/client-hub',
      projectId,
      quoteId: quote.id,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  if (project.clientId) {
    const clientNotificationRef = db.collection('notifications').doc();
    batch.set(clientNotificationRef, {
      userId: project.clientId,
      clientId: project.clientId,
      title: 'Project contract is ready',
      message: 'Your final quotation is approved. Review and sign the project contract and terms to unlock the initial project payment.',
      msg: 'Your project contract is ready for signature.',
      type: 'contract_signature_required',
      link: `/portal?projectId=${encodeURIComponent(projectId)}&tab=documents`,
      projectId,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();

  // ── Generate 60 / 30 / 10 milestone invoices ─────────────────────────────
  const approvedTotal = Number(quote.total || quote.amount || 0);
  const clientId      = project.clientId;
  const currency      = quote.currency || 'GHS';
  const today         = new Date().toISOString().split('T')[0];
  const depositDue    = (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().split('T')[0]; })();
  const quoteTitle    = quote.title || `Quotation v${quote.version || 1}`;
  const paymentSchedule = quote.paymentSchedule || project.paymentSchedule || 'standard';

  if (approvedTotal > 0) {
    // Delete any stale auto-generated milestone invoices first
    const staleKeys = ['initial-deposit', 'production-balance', 'pre-installation-balance'];
    const staleSnaps = await Promise.all(
      staleKeys.map(key =>
        db.collection('invoices').where('projectId', '==', projectId)
          .where('milestoneKey', '==', key).where('autoGenerated', '==', true).get()
      )
    );
    const delBatch = db.batch();
    staleSnaps.forEach(snap => snap.docs.forEach(d => delBatch.delete(d.ref)));
    await delBatch.commit();

    const invoiceBatch = db.batch();
    const milestones = [
      { milestoneKey: 'initial-deposit',          title: `60% Initial Project Deposit — ${quoteTitle}`,      pct: 0.60, status: 'Sent',  due: depositDue, stageId: 3 },
      { milestoneKey: 'production-balance',       title: `30% Production Balance — ${quoteTitle}`,           pct: 0.30, status: 'Draft', due: null,        stageId: 4 },
      { milestoneKey: 'pre-installation-balance', title: `10% Final Arrival Balance — ${quoteTitle}`,        pct: 0.10, status: 'Draft', due: null,        stageId: 5 },
    ];
    milestones.forEach(m => {
      invoiceBatch.set(db.collection('invoices').doc(), {
        projectId,  parentId: projectId,  clientId,
        clientName:  project.clientName || '',
        clientEmail: project.clientEmail || project.email || '',
        clientPhone: project.clientPhone || project.phone || '',
        sourceQuoteId: quote.id,  quoteVersion: Number(quote.version || 1),
        title: m.title,  type: 'Milestone',  invoiceType: 'milestone',  documentKind: 'invoice',
        milestoneKey: m.milestoneKey,  pct: m.pct,
        amount:    parseFloat((approvedTotal * m.pct).toFixed(2)),
        total:     parseFloat((approvedTotal * m.pct).toFixed(2)),
        amountDue: parseFloat((approvedTotal * m.pct).toFixed(2)),
        amountPaid: 0,  paidAmount: 0,  currency,
        status: m.status,  date: today,  due: m.due,
        stageId: m.stageId,  paymentSchedule,  autoGenerated: true,
        createdAt: FieldValue.serverTimestamp(),  updatedAt: FieldValue.serverTimestamp(),
      });
    });
    await invoiceBatch.commit();

    // Notify client of the deposit due
    const fmt = n => Number(n).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    await Promise.allSettled([
      db.collection('clients').doc(clientId).collection('messages').add({
        text: `✅ Quotation approved: ${currency} ${fmt(approvedTotal)}. Your 60/30/10 payment schedule is now active. Initial deposit of ${currency} ${fmt(approvedTotal * 0.6)} is due by ${depositDue}. Please sign the project contract to proceed.`,
        senderRole: 'system', senderId: 'system', senderName: 'Westline Future',
        isInternal: false, readByAdmin: true, readByClient: false,
        projectId, createdAt: FieldValue.serverTimestamp(),
      }),
    ]);
  }

  return { approved: true, quoteId: quote.id, contractUnlocked: true, approvedAt };
});

exports.requestProjectQuoteChanges = onCall(CORS_OPTS, async request => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in before requesting quotation changes.');
  }
  const projectId = String(request.data?.projectId || '').trim();
  const quoteId = String(request.data?.quoteId || '').trim();
  const note = String(request.data?.note || '').trim().slice(0, 2000);
  if (!projectId || !quoteId || note.length < 3) {
    throw new HttpsError('invalid-argument', 'Project, quotation, and a clear change request are required.');
  }

  const db = getFirestore();
  const projectRef = db.collection('projects').doc(projectId);
  const quoteRef = db.collection('invoices').doc(quoteId);
  const [projectSnap, quoteSnap] = await Promise.all([projectRef.get(), quoteRef.get()]);
  if (!projectSnap.exists || !quoteSnap.exists) throw new HttpsError('not-found', 'Project or quotation not found.');
  const project = projectSnap.data();
  if (!userOwnsProject(request.auth, project)) {
    throw new HttpsError('permission-denied', 'This project is not assigned to your account.');
  }
  const quote = quoteSnap.data();
  if (![projectId].includes(quote.projectId) && ![projectId].includes(quote.parentId)) {
    throw new HttpsError('permission-denied', 'This quotation does not belong to the selected project.');
  }

  const batch = db.batch();
  const changeRequestRef = db.collection('change_requests').doc();
  batch.set(quoteRef, {
    status: 'Changes Requested',
    changeRequestNote: note,
    changesRequestedAt: FieldValue.serverTimestamp(),
    changesRequestedBy: request.auth.uid,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  batch.set(projectRef, {
    quoteApproved: false,
    approvedQuoteId: FieldValue.delete(),
    quoteStatus: 'changes_requested',
    quoteChangeRequested: true,
    quoteChangeRequestPending: true,
    quoteChangeRequestNote: note,
    changeRequestPending: true,
    workflowStep: 'quote-negotiation',
    nextAction: 'Project manager revises the quotation and issues a new version',
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  batch.set(changeRequestRef, {
    projectId,
    clientId: project.clientId,
    quoteId,
    type: 'quotation',
    status: 'pending',
    note,
    quoteVersion: Number(quote.version || 1),
    requestedBy: request.auth.uid,
    requestedByName: project.clientName || request.auth.token?.name || 'Client',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  const activityRef = projectRef.collection('activityLogs').doc();
  batch.set(activityRef, {
    actor: 'client',
    actorId: request.auth.uid,
    actionType: 'quote_changes_requested',
    actionDescription: `Requested changes to quotation "${quote.title || quoteId}".`,
    quoteId,
    note,
    timestamp: FieldValue.serverTimestamp(),
  });
  const recipients = [...new Set([
    'admin',
    project.projectManagerId,
    ...(Array.isArray(project.assignedStaff) ? project.assignedStaff : []),
  ].filter(Boolean))];
  recipients.forEach(userId => {
    const notificationRef = db.collection('notifications').doc();
    batch.set(notificationRef, {
      userId,
      title: 'Quotation changes requested',
      message: `${project.clientName || 'Client'} requested changes to "${quote.title || 'the quotation'}": ${note}`,
      msg: 'Client requested a revised quotation.',
      type: 'quote_changes_requested',
      link: '/admin/client-hub',
      projectId,
      quoteId,
      changeRequestId: changeRequestRef.id,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
  await batch.commit();
  return { requested: true, quoteId, changeRequestId: changeRequestRef.id };
});
