import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Plus, MessageSquare, AlertCircle, Briefcase,
  User, DollarSign, Phone, Calendar, Loader2,
  Users, UserCheck, ChevronRight, CheckCircle2, RefreshCw, PenTool,
  FileText, Upload, ExternalLink, Trash2, ShieldCheck, X, Camera, Truck
} from 'lucide-react';
import { PAv, PSBadge } from '../../components/Shared';
import { CLIENT_PROJECT_STAGES, PROJECT_TYPES, GLASS_CATALOG_DATA } from '../../data';
import { db, storage } from '../../lib/firebase';
import {
  collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, doc, updateDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import AdminRenderingManager from '../../components/AdminRenderingManager';
import AdminAddOnManager from '../../components/AdminAddOnManager';
import WorldClassChat from '../../components/WorldClassChat';
import { calculateTimeline } from '../sharedHelpers';

import { AC, STAGE_ICONS, SCHEDULE_CONFIGS, PREMIUM_CATALOG, BD_ITEMS_CONFIG } from './clienthub/config.jsx';
import { printInvoiceOrReceipt, printSignedContractDoc } from './clienthub/print';
import { ProjectInvoicesLedger } from './clienthub/ProjectInvoicesLedger';
import { PaymentScheduleCard } from './clienthub/PaymentScheduleCard';
import { NewProjectModal } from './clienthub/NewProjectModal';
import { AdvanceModal } from './clienthub/AdvanceModal';
import { ShippingDetailsCard, ProjectEconomics, DocumentVault } from './clienthub/ProjectDetailCards';
import ClientUploadsTab from '../../components/ClientUploadsTab';
import SecureVault from '../../components/SecureVault';
import RequestPaymentModal from './clienthub/RequestPaymentModal';

function getProjectWorkflowGuidance(project, invoices = [], approvals = [], renderingPackages = []) {
  if (!project) return null;

  const projectInvoices = invoices.filter(i => i.projectId === project.id || i.parentId === project.id);
  const projectApprovals = approvals.filter(a => a.projectId === project.id);
  const projectPackages = renderingPackages.filter(pkg => pkg.projectId === project.id);
  const isPaid = value => ['paid', 'paid in full'].includes(String(value || '').toLowerCase());
  const isQuote = invoice => {
    const descriptor = `${invoice.type || ''} ${invoice.documentKind || ''}`.toLowerCase();
    return descriptor.includes('quotation') || descriptor.includes('quote');
  };

  const renderingInvoice = projectInvoices.find(i =>
    i.id === project.renderingFeeInvoiceId ||
    ['rendering', 'rendering fee', 'design'].includes(String(i.type || '').toLowerCase())
  );
  const renderingPaid = project.renderingFeePaid === true || isPaid(renderingInvoice?.status);
  const renderingFirst = project.kickoffMode === 'rendering-first';
  const agreementSigned = project.contractAccepted === true;
  const renderingApproved = project.designApproved === true ||
    project.renderingApproved === true ||
    projectPackages.some(pkg => String(pkg.status || '').toLowerCase() === 'approved');
  const specUploaded = Boolean(project.specDoc?.url);
  const productionAuthorized = project.productionAuthorized === true || project.specDoc?.status === 'signed';
  const quoteInvoice = projectInvoices.find(isQuote);
  const quoteApproval = projectApprovals.find(a =>
    ['quotation', 'quote'].includes(String(a.type || '').toLowerCase()) &&
    String(a.status || '').toLowerCase() === 'sent'
  );
  const quoteApproved = project.quoteApproved === true ||
    String(quoteInvoice?.status || '').toLowerCase() === 'approved';
  const verificationPending = projectInvoices.find(i =>
    i.awaitingConfirmation === true ||
    String(i.status || '').toLowerCase() === 'verification pending'
  );
  const unpaidInvoice = projectInvoices.find(i =>
    !isQuote(i) && ['sent', 'overdue', 'pending', 'partially paid'].includes(String(i.status || '').toLowerCase())
  );
  const productionMilestoneInvoice = projectInvoices.find(i => {
    const key = String(i.milestoneKey || '').toLowerCase();
    const descriptor = `${i.title || ''} ${i.type || ''}`.toLowerCase();
    return key === 'post-production' || descriptor.includes('30% production') || descriptor.includes('production milestone');
  });
  const productionMilestonePaid = project.postProductionPaid === true ||
    ['paid', 'paid in full'].includes(String(productionMilestoneInvoice?.status || '').toLowerCase());

  const result = (waitingOn, title, summary, client, manager, paymentInvoice = null) => ({
    waitingOn, title, summary, client, manager, paymentInvoice,
  });

  if (renderingFirst && !renderingInvoice) {
    return result(
      'project manager',
      'Issue the rendering fee invoice',
      'The paid design journey cannot begin until a rendering fee invoice is issued.',
      { title: 'No action yet', body: 'The client is waiting for the rendering fee invoice.', action: 'Waiting for Westline' },
      { title: 'Create the rendering fee invoice', body: 'Open Payments, issue the rendering/design fee invoice, and notify the client.', tab: 'financials', action: 'Open Payments' }
    );
  }

  if (renderingFirst && !renderingPaid) {
    return result(
      'client',
      'Rendering fee awaiting payment',
      'The design package remains locked until this invoice is paid and verified.',
      { title: 'Pay the rendering fee', body: 'Open Financials and pay online or submit an offline payment notice.', action: 'Payment required' },
      { title: 'Monitor or verify payment', body: 'Do not unlock the rendering manually. If offline payment is submitted, verify it in Payments.', tab: 'financials', action: 'Review Payments' }
    );
  }

  if (!agreementSigned) {
    return result(
      'client',
      'Project agreement awaiting signature',
      'The client must sign the project agreement before the managed project journey continues.',
      { title: 'Read and sign the agreement', body: 'The client must review the legal terms and complete the electronic signature.', action: 'Signature required' },
      { title: 'Review the agreement status', body: 'Confirm the correct agreement is available, then send the client a reminder from Messages.', tab: 'messages', action: 'Open Messages' }
    );
  }

  if (renderingFirst && projectPackages.length === 0) {
    return result(
      'project manager',
      'Upload the paid rendering package',
      'Payment and agreement are complete. The client now needs the design package for review.',
      { title: 'No action yet', body: 'The client is waiting for the rendering package.', action: 'Waiting for Westline' },
      { title: 'Upload and publish the rendering', body: 'Open Designs, upload the correct version, and make it available for client review.', tab: 'renderings', action: 'Open Designs' }
    );
  }

  if (renderingFirst && !renderingApproved) {
    return result(
      'client',
      'Rendering awaiting client approval',
      'The client must approve the final design or request revisions before the legal specification is finalized.',
      { title: 'Review the rendering', body: 'Approve the final design or place clear revision comments.', action: 'Design review required' },
      { title: 'Monitor design feedback', body: 'Respond to comments, upload revisions, and keep the approved version clearly identified.', tab: 'renderings', action: 'Open Designs' }
    );
  }

  if (!specUploaded) {
    return result(
      'project manager',
      'Prepare the final project specification',
      'The signed specification is the production authorization and must contain final drawings, materials, scope, exclusions, and deliverables.',
      { title: 'No action yet', body: 'The client is waiting for the final specification document.', action: 'Waiting for Westline' },
      { title: 'Upload the final specification', body: 'Open Project Brief, verify the complete legal document, and publish it for signature.', tab: 'spec', action: 'Open Project Brief' }
    );
  }

  if (!productionAuthorized) {
    return result(
      'client',
      'Production authorization awaiting signature',
      'The final quotation remains locked until the client signs the project specification.',
      { title: 'Review and authorise production', body: 'Open the full specification, confirm both legal acknowledgements, and sign.', action: 'Signature required' },
      { title: 'Wait for the client signature', body: 'Review the document status in Project Brief. Use Messages for a specific reminder or clarification.', tab: 'spec', action: 'Open Project Brief' }
    );
  }

  if (!quoteInvoice) {
    return result(
      'project manager',
      'Create and issue the final quotation',
      'Production is authorised. The approved scope can now be priced and issued to the client.',
      { title: 'No action yet', body: 'The client is waiting for the final quotation.', action: 'Waiting for Westline' },
      { title: 'Issue the final quotation', body: 'Create the quote from the authorised scope, check totals and payment schedule, then send it.', tab: 'financials', action: 'Open Payments' }
    );
  }

  if (!quoteApproved || quoteApproval) {
    return result(
      'client',
      'Final quotation awaiting approval',
      'The client must approve the issued quotation before the required project payment is collected.',
      { title: 'Review and approve the quote', body: 'Check scope, exclusions, milestones, and total before confirming approval.', action: 'Approval required' },
      { title: 'Monitor quote approval', body: 'Answer commercial questions and revise the quote if scope changes. Do not record approval manually.', tab: 'financials', action: 'Review Quote' }
    );
  }

  if (verificationPending) {
    const amount = Number(verificationPending.amount || verificationPending.total || 0);
    return result(
      'project manager',
      'Client payment needs verification',
      `The client reported an offline payment${amount ? ` of ${verificationPending.currency || 'GHS'} ${amount.toLocaleString()}` : ''}. The invoice and project gate remain pending until an administrator verifies it.`,
      { title: 'Payment submitted', body: 'The client is waiting for Westline to verify the transfer or cash payment.', action: 'Waiting for confirmation' },
      { title: 'Verify and record the payment', body: 'Match the bank/cash evidence, amount, payer, reference, and date. Then confirm it in Payments.', tab: 'financials', action: 'Verify Payment' },
      verificationPending
    );
  }

  if (Number(project.stageId || 1) >= 5 && !productionMilestonePaid) {
    return result(
      productionMilestoneInvoice ? 'client' : 'project manager',
      productionMilestoneInvoice ? '30% production milestone awaiting payment' : 'Issue the 30% production milestone invoice',
      'Shipping details and ETA remain locked until the full production milestone payment is verified.',
      {
        title: productionMilestoneInvoice ? 'Pay the 30% production milestone' : 'No action yet',
        body: productionMilestoneInvoice ? 'The client should pay online or submit an offline payment notice.' : 'The client is waiting for Westline to issue the milestone invoice.',
        action: productionMilestoneInvoice ? 'Payment required' : 'Waiting for Westline',
      },
      {
        title: productionMilestoneInvoice ? 'Monitor or verify the payment' : 'Create the milestone invoice',
        body: productionMilestoneInvoice ? 'Use Payments to verify offline funds. Shipping information unlocks only after full payment.' : 'Open Payments and issue the 30% Production Milestone invoice.',
        tab: 'financials',
        action: 'Open Payments',
      }
    );
  }

  if (unpaidInvoice) {
    return result(
      'client',
      'Project payment awaiting payment',
      'The quote is approved, but the required invoice must be paid before the next gated stage.',
      { title: 'Pay the outstanding invoice', body: 'Use Paystack or submit an offline payment notice from Financials.', action: 'Payment required' },
      { title: 'Monitor the outstanding invoice', body: 'Review the due date and payment schedule. Use Messages if a reminder is required.', tab: 'financials', action: 'Open Payments' }
    );
  }

  if (Number(project.stageId || 1) < 4 && project.depositPaid === true) {
    return result(
      'project manager',
      'All production gates are complete',
      'Specification, quotation, and required payment are complete. The project manager can now advance the project to production.',
      { title: 'No action required', body: 'The client has completed the current approvals and payment.', action: 'Waiting for Westline' },
      { title: 'Advance to Procurement & Production', body: 'Confirm the assigned team and schedule, then use Advance to begin production.', tab: 'team', action: 'Review Team' }
    );
  }

  if (Number(project.stageId || 1) >= 5 && productionMilestonePaid && !project.shippingDetails?.vesselName) {
    return result(
      'project manager',
      'Add shipping details and ETA',
      'The 30% production milestone is verified, so shipment information can now be released to the client.',
      { title: 'Shipping access unlocked', body: 'The client is waiting for vessel, container, bill of lading, and ETA details.', action: 'Waiting for shipment details' },
      { title: 'Publish shipment information', body: 'Open Shipping, enter the confirmed logistics details and ETA, then save.', tab: 'shipping', action: 'Open Shipping' }
    );
  }

  const stage = CLIENT_PROJECT_STAGES.find(item => item.id === project.stageId);
  return result(
    stage?.whoActs === 'client' ? 'client' : stage?.whoActs === 'worker' ? 'worker' : 'project manager',
    `${stage?.name || 'Project'} is active`,
    stage?.clientMsg || 'The project is moving through its approved workflow.',
    { title: stage?.whoActs === 'client' ? 'Client action required' : 'Track current progress', body: stage?.clientMsg || 'No client action is required right now.', action: stage?.whoActs === 'client' ? 'Action required' : 'No action now' },
    { title: 'Complete the current stage work', body: stage?.adminPrompt || 'Update progress, dates, ownership, and evidence before advancing.', tab: stage?.whoActs === 'worker' ? 'team' : 'timeline', action: stage?.whoActs === 'worker' ? 'Review Team' : 'Open Timeline' }
  );
}

// ─── Stage Scheduler Row ─────────────────────────────────────────────────────
// Extracted so each row has its own local state for the duration input.
// Saves to Firestore only on blur — prevents keystroke race conditions that
// caused the Gantt to show stale intermediate values.
function StageSchedulerRow({ s, idx, stageInfo, selected, applicableStages, updateProject }) {
  const [localDays, setLocalDays] = useState(stageInfo.durationDays || 5);

  // Sync from Firestore when the parent data changes (e.g. another stage was edited)
  useEffect(() => {
    setLocalDays(stageInfo.durationDays || 5);
  }, [stageInfo.durationDays]);

  const isCurrent = s.id === selected.stageId;
  const isPast = (selected.stageId || 1) > s.id;
  const stageHistEntry = (selected.stageHistory || []).find(h => h.stageId === s.id);

  const saveTimeline = async (overrides = {}) => {
    const updatedStageTimeline = {
      ...(selected.timeline || {}),
      [s.id]: { ...(selected.timeline?.[s.id] || {}), ...overrides },
    };
    const newTimeline = calculateTimeline(selected.createdAt || selected.projectDate, updatedStageTimeline, applicableStages);
    const lastStage = applicableStages[applicableStages.length - 1];
    const estComp = newTimeline[lastStage.id]?.endDate || '';
    await updateProject(selected.id, { timeline: newTimeline, estimatedCompletion: estComp });
  };

  return (
    <div style={{ position: 'relative', display: 'flex', gap: 16, marginBottom: idx < applicableStages.length - 1 ? 24 : 0, zIndex: 1 }}>
      <div style={{ position: 'absolute', left: -44, top: 0, width: 34, height: 34, borderRadius: '50%', background: isPast ? s.color : isCurrent ? '#fff' : `var(--bg-secondary)`, border: isPast ? `2px solid ${s.color}` : isCurrent ? `2.5px solid ${s.color}` : '2px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, boxShadow: isCurrent ? `0 0 0 4px ${s.color}20` : 'none', color: isPast ? '#fff' : s.color, transition: 'all .3s' }}>
        {isPast ? <CheckCircle2 size={14} /> : STAGE_ICONS[s.id]}
      </div>

      <div style={{ flex: 1, padding: '16px 20px', borderRadius: 16, background: isCurrent ? `${s.color}04` : isPast ? `var(--bg-secondary)` : '#fff', border: isCurrent ? `1.5px solid ${s.color}40` : '1px solid var(--border-color)', boxShadow: '0 2px 10px rgba(0,0,0,0.01)' }}>

        {/* Row Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 900, color: `var(--accent-secondary)` }}>{s.name}</span>
            {isCurrent && <span style={{ fontSize: 9, fontWeight: 800, color: s.color, background: `${s.color}15`, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase' }}>Active</span>}
            {isPast && <span style={{ fontSize: 9, fontWeight: 700, color: '#16A34A', background: '#F0FDF4', padding: '2px 8px', borderRadius: 20 }}>Done</span>}
          </div>
          {stageHistEntry?.timestamp && (
            <span style={{ fontSize: 11, color: `var(--text-secondary)`, fontWeight: 600 }}>
              {(() => { const d = stageHistEntry.timestamp?.toDate ? stageHistEntry.timestamp.toDate() : new Date(stageHistEntry.timestamp); return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); })()}
              {isCurrent && (() => { const d = stageHistEntry.timestamp?.toDate ? stageHistEntry.timestamp.toDate() : new Date(stageHistEntry.timestamp); const days = Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000)); return <span style={{ fontWeight: 700, color: s.color, marginLeft: 6 }}>({days}d active)</span>; })()}
            </span>
          )}
        </div>

        {/* Scheduler Inputs */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', background: '#fff', padding: 12, borderRadius: 12, border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>

          {/* Start Date */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.04em' }}>Start Date</span>
            <input
              type="date"
              value={stageInfo.startDate || ''}
              onChange={async (e) => {
                await saveTimeline({ startDate: e.target.value, manualOverride: true });
              }}
              style={{ border: '1px solid var(--border-color)', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontFamily: 'inherit', color: `var(--accent-secondary)`, fontWeight: 700 }}
            />
          </div>

          {/* Duration Days — local state, saves on blur */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.04em' }}>Duration</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="number"
                min="1"
                value={localDays}
                onChange={e => setLocalDays(parseInt(e.target.value, 10) || 1)}
                onBlur={async () => {
                  if (localDays !== stageInfo.durationDays) {
                    await saveTimeline({ durationDays: localDays });
                  }
                }}
                style={{ width: 60, border: '1px solid var(--border-color)', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontFamily: 'inherit', color: `var(--accent-secondary)`, fontWeight: 700, textAlign: 'center' }}
              />
              <span style={{ fontSize: 11, color: `var(--text-secondary)`, fontWeight: 600 }}>days</span>
            </div>
          </div>

          {/* End Date (computed, read-only) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.04em' }}>End Date</span>
            <div style={{ fontSize: 12, fontWeight: 700, color: `var(--text-secondary)`, padding: '7px 0' }}>
              {stageInfo.endDate
                ? new Date(stageInfo.endDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                : '—'}
            </div>
          </div>

          {/* Override Badge & Reset */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            {stageInfo.manualOverride ? (
              <>
                <span style={{ fontSize: 9, fontWeight: 800, color: '#D97706', background: '#FEF3C7', padding: '3px 8px', borderRadius: 20, textTransform: 'uppercase' }}>Overridden</span>
                <button
                  onClick={async () => {
                    const updatedStageTimeline = { ...(selected.timeline || {}) };
                    if (updatedStageTimeline[s.id]) {
                      updatedStageTimeline[s.id] = { ...updatedStageTimeline[s.id], manualOverride: false };
                      delete updatedStageTimeline[s.id].startDate;
                    }
                    const newTimeline = calculateTimeline(selected.createdAt || selected.projectDate, updatedStageTimeline, applicableStages);
                    const lastStage = applicableStages[applicableStages.length - 1];
                    const estComp = newTimeline[lastStage.id]?.endDate || '';
                    await updateProject(selected.id, { timeline: newTimeline, estimatedCompletion: estComp });
                  }}
                  style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: 11, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 8 }}
                  title="Restore default sequential schedule"
                >
                  <RefreshCw size={12} /> Auto
                </button>
              </>
            ) : (
              <span style={{ fontSize: 9, fontWeight: 800, color: '#059669', background: '#F0FDF4', padding: '3px 8px', borderRadius: 20, textTransform: 'uppercase' }}>Auto Sequence</span>
            )}
          </div>
        </div>

        {isCurrent && <div style={{ fontSize: 12, color: `var(--text-secondary)`, marginTop: 10, lineHeight: 1.5, padding: '0 4px' }}>{s.adminPrompt}</div>}
      </div>
    </div>
  );
}

// ─── SpecBriefManager ────────────────────────────────────────────────────────
function SpecBriefManager({ project, updateProject, addProjectDocument, notify, brand }) {
  const ac = brand?.color || 'var(--accent-secondary)';
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const spec = project?.specDoc;

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !project?.id) return;
    setUploading(true);
    try {
      let url = '';
      if (storage) {
        const storageRef = ref(storage, `projects/${project.id}/spec/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        url = await getDownloadURL(storageRef);
      } else {
        url = URL.createObjectURL(file);
      }
      await updateDoc(doc(db, 'projects', project.id), {
        specDoc: {
          url,
          name: file.name,
          fileType: file.type,
          version: Number(spec?.version || 0) + 1,
          uploadedAt: new Date().toISOString(),
          uploadedBy: 'admin',
          status: 'pending',
          reviewedAt: null,
          reviewNote: '',
          signedAt: null,
          signedBy: '',
          signedByUid: '',
          signedByPhone: '',
          signatureMethod: '',
          signatureStamp: '',
        }
      });
      // Notify the client that a spec doc is waiting for their review
      if (project?.clientId && db) {
        addDoc(collection(db, 'clients', project.clientId, 'messages'), {
          text: `📄 Project specification v${Number(spec?.version || 0) + 1}, "${file.name}", has been shared for "${project.title || project.project}". After the initial deposit is verified, please review and sign it to authorise production.`,
          senderRole: 'system',
          isInternal: false,
          readByAdmin: true,
          readByClient: false,
          createdAt: serverTimestamp(),
        }).catch(() => {});
      }
      notify?.('success', 'Specification document sent to client for signature');
    } catch (err) {
      console.error(err);
      notify?.('error', 'Upload failed — ' + (err.message || 'Unknown error'));
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleRemove = async () => {
    if (!confirmRemove) { setConfirmRemove(true); return; }
    setConfirmRemove(false);
    setRemoving(true);
    try {
      await updateDoc(doc(db, 'projects', project.id), { specDoc: null });
      notify?.('success', 'Specification document removed');
    } catch (err) {
      notify?.('error', 'Remove failed');
    }
    setRemoving(false);
  };

  const statusMap = {
    pending:  { label: 'Awaiting Client Signature', color: '#D97706', bg: '#FFF7ED', border: '#FDE68A' },
    approved: { label: 'Approved · Signature Required', color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' },
    signed:   { label: 'Signed · Production Authorised ✓', color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0' },
    rejected: { label: 'Changes Requested', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 24 }}>
      {/* Header */}
      <div>
        <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--accent-secondary)', marginBottom: 4 }}>Project Specification & Brief</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Upload the final project specification, scope, deliverables, and approved design outcome. After the initial deposit is verified, the client must review and sign this document before production can begin.
        </div>
      </div>

      {/* Current document */}
      {spec?.url ? (
        <div style={{ padding: '20px 24px', background: '#fff', borderRadius: 16, border: `1.5px solid ${statusMap[spec.status]?.border || 'var(--border-color)'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileText size={20} color="#1D4ED8" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent-secondary)' }}>{spec.name || 'Project Specification'}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Version {Number(spec.version || 1)} · Uploaded {spec.uploadedAt ? new Date(spec.uploadedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
              <a href={spec.url} target="_blank" rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                <ExternalLink size={12} /> View
              </a>
              {confirmRemove ? (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#DC2626', fontWeight: 600 }}>Remove this doc?</span>
                  <button onClick={handleRemove} style={{ padding: '5px 10px', borderRadius: 8, background: '#DC2626', border: 'none', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Yes, remove</button>
                  <button onClick={() => setConfirmRemove(false)} style={{ padding: '5px 10px', borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                </div>
              ) : (
                <button onClick={handleRemove} disabled={removing}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  <Trash2 size={12} /> {removing ? 'Removing…' : 'Remove'}
                </button>
              )}
            </div>
          </div>

          {/* Status */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 20, background: statusMap[spec.status]?.bg || '#f5f5f5', border: `1px solid ${statusMap[spec.status]?.border || '#eee'}` }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusMap[spec.status]?.color || '#999' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: statusMap[spec.status]?.color || '#666' }}>
              {statusMap[spec.status]?.label || spec.status}
            </span>
          </div>

          {/* Client rejection note */}
          {spec.status === 'rejected' && spec.reviewNote && (
            <div style={{ marginTop: 14, padding: '12px 16px', background: '#FEF2F2', borderRadius: 12, border: '1px solid #FECACA' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#DC2626', textTransform: 'uppercase', marginBottom: 4 }}>Client's feedback</div>
              <div style={{ fontSize: 13, color: '#7F1D1D', lineHeight: 1.5 }}>"{spec.reviewNote}"</div>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>
                Responded {spec.reviewedAt ? new Date(spec.reviewedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'} by {spec.reviewedBy || 'Client'}
              </div>
            </div>
          )}

          {spec.status === 'signed' && spec.signedAt && (
            <div style={{ marginTop: 14, padding: '10px 14px', background: '#F0FDF4', borderRadius: 10, border: '1px solid #BBF7D0', fontSize: 12, color: '#15803D', fontWeight: 600 }}>
              Signed on {new Date(spec.signedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} by {spec.signedBy || spec.reviewedBy || 'Client'}
              {spec.signatureStamp && <div style={{ fontSize: 10, color: '#4B5563', marginTop: 4, fontFamily: 'monospace' }}>Audit stamp: {spec.signatureStamp}</div>}
            </div>
          )}

          {/* Replace button */}
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', fontSize: 12, fontWeight: 700, color: 'var(--accent-secondary)', cursor: uploading ? 'default' : 'pointer', opacity: uploading ? 0.6 : 1 }}>
              <Upload size={13} /> {uploading ? 'Uploading…' : 'Replace Document'}
              <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.ppt,.pptx" style={{ display: 'none' }} onChange={handleUpload} disabled={uploading} />
            </label>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8 }}>Uploading a new version invalidates the previous signature and requires the client to sign again.</div>
          </div>
        </div>
      ) : (
        /* Upload zone */
        <label style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 12, padding: '48px 32px', borderRadius: 16,
          border: `2px dashed ${uploading ? ac : 'var(--border-color)'}`,
          background: uploading ? `${ac}08` : 'var(--bg-secondary)',
          cursor: uploading ? 'default' : 'pointer', transition: 'all .2s',
        }}
          onMouseOver={e => { if (!uploading) e.currentTarget.style.borderColor = ac; }}
          onMouseOut={e => { if (!uploading) e.currentTarget.style.borderColor = 'var(--border-color)'; }}
        >
          <div style={{ width: 56, height: 56, borderRadius: 16, background: uploading ? `${ac}20` : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}>
            {uploading ? <Loader2 size={24} color={ac} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={24} color={ac} />}
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--accent-secondary)', marginBottom: 4 }}>
              {uploading ? 'Uploading…' : 'Upload Specification Document'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              PDF, Word, PowerPoint, or Image — max 20 MB
            </div>
          </div>
          <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.ppt,.pptx" style={{ display: 'none' }} onChange={handleUpload} disabled={uploading} />
        </label>
      )}

      {/* Workflow explanation */}
      <div style={{ padding: '16px 20px', background: '#fff', borderRadius: 14, border: '1px solid var(--border-color)' }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>How it works</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { step: '1', text: 'Upload the spec/brief document here' },
            { step: '2', text: "Client sees a highlighted card on their portal with a link to open the document" },
            { step: '3', text: 'Client approves or requests changes with a note' },
            { step: '4', text: 'Status updates here in real time — review their response before proceeding to production' },
          ].map(({ step, text }) => (
            <div key={step} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: `${ac}15`, color: ac, fontSize: 11, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{step}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{text}</div>
            </div>
          ))}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Main ClientHub ───────────────────────────────────────────────────────────
export default function ClientHub({ clientId, dbClients = [], onBack, ...props }) {
  const brand = props.brand || {};
  const ac = brand.color || AC;

  const client = dbClients.find(c => c.id === clientId) || dbClients.find(c => c.phone === clientId);
  const teamMembers = props.teamMembers || [];

  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [settingDate, setSettingDate] = useState(false);
  const [estDate, setEstDate] = useState('');
  const [showClientPreview, setShowClientPreview] = useState(false);
  const [showRequestPaymentModal, setShowRequestPaymentModal] = useState(false);

  useEffect(() => {
    if (!db || !client) { setLoadingProjects(false); return; }
    const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const mine = all.filter(p =>
        p.clientId === client.id || p.clientId === client.phone ||
        (p.clientIds || []).includes(client.id) || (p.clientIds || []).includes(client.phone)
      );
      setProjects(mine);
      setSelectedId(prev => {
        if (!prev && mine.length > 0) return mine[0].id;
        if (prev && mine.length > 0 && !mine.find(p => p.id === prev) && prev !== 'MESSAGES') return mine[0].id;
        return prev;
      });
      setLoadingProjects(false);
    });
    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client?.id]);

  const selected = projects.find(p => p.id === selectedId);

  useEffect(() => {
    if (selected?.estimatedCompletion) {
      const d = selected.estimatedCompletion?.toDate
        ? selected.estimatedCompletion.toDate()
        : new Date(selected.estimatedCompletion);
      if (!isNaN(d)) setEstDate(d.toISOString().slice(0, 10));
    } else {
      setEstDate('');
    }
  }, [selected?.id, selected?.estimatedCompletion]);

  const saveEstDate = async () => {
    if (!db || !selected || !estDate) return;
    setSettingDate(true);
    await updateDoc(doc(db, 'projects', selected.id), { estimatedCompletion: new Date(estDate).toISOString() });
    setSettingDate(false);
  };

  const applicableStages = selected
    ? CLIENT_PROJECT_STAGES.filter(s => {
        const typeStages = PROJECT_TYPES[selected.projectType]?.stages || CLIENT_PROJECT_STAGES.map(s => s.id);
        return typeStages.includes(s.id);
      })
    : [];

  const currentStageObj = applicableStages.find(s => s.id === selected?.stageId);
  const currentIdx = applicableStages.findIndex(s => s.id === selected?.stageId);
  const nextStage = applicableStages[currentIdx + 1];

  // Compute timeline at component level so overview + timeline tab both use the same live data
  const computedTimeline = selected && applicableStages.length > 0
    ? calculateTimeline(selected.createdAt || selected.projectDate, selected.timeline || {}, applicableStages)
    : {};

  // Calendar span: first stage start → last stage end (same calculation the Timeline tab shows)
  // This is the authoritative "total duration" — it reflects actual dates, not just a sum of days.
  const _firstStageId = applicableStages[0]?.id;
  const _lastStageId  = applicableStages[applicableStages.length - 1]?.id;
  const _spanStart    = computedTimeline[_firstStageId]?.startDate;
  const _spanEnd      = computedTimeline[_lastStageId]?.endDate;
  const totalCalendarDays = (_spanStart && _spanEnd)
    ? Math.ceil((new Date(_spanEnd) - new Date(_spanStart)) / (1000 * 60 * 60 * 24))
    : Object.values(computedTimeline).reduce((s, st) => s + (st.durationDays || 0), 0);

  const fmt = v => `GH₵ ${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Tab names aligned with client portal for consistency:
  // Client sees: Progress, Design Vault, Approvals, Photos, Payments, Add-ons, Documents
  // Admin manages: Overview, Spec, Timeline, Payments, Design Vault, Documents, Team
  const TABS = [
    { id: 'overview',   label: 'Overview',   icon: <Briefcase size={14} /> },
    { id: 'spec',       label: 'Project Brief', icon: <FileText size={14} /> },
    { id: 'timeline',   label: 'Timeline',   icon: <Calendar size={14} /> },
    { id: 'financials', label: 'Payments',   icon: <DollarSign size={14} /> },
    { id: 'shipping',   label: 'Shipping',   icon: <Truck size={14} /> },
    { id: 'renderings', label: 'Designs',    icon: <PenTool size={14} /> },
    { id: 'vault',      label: 'Vault',      icon: <ShieldCheck size={14} /> },
    { id: 'uploads',    label: 'Uploads',    icon: <Camera size={14} /> },
    { id: 'team',       label: 'Team',       icon: <Users size={14} /> },
    { id: 'messages',   label: 'Messages',   icon: <MessageSquare size={14} /> }
  ];
  const workflowGuidance = selected
    ? getProjectWorkflowGuidance(selected, props.invoices || [], props.approvals || [], props.renderingPackages || [])
    : null;

  if (!client) return (
    <div style={{ padding: 60, textAlign: 'center' }}>
      <AlertCircle size={40} color="var(--text-secondary)" style={{ marginBottom: 12 }} />
      <div style={{ fontSize: 18, fontWeight: 800, color: `var(--accent-secondary)` }}>Client not found</div>
      <button onClick={onBack} style={{ marginTop: 20, padding: '10px 24px', borderRadius: 12, background: `var(--accent-secondary)`, color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Go Back</button>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', overflow: 'hidden' }}>

      {/* TOP BAR */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0 16px 0', flexShrink: 0, borderBottom: '1px solid var(--border-color)', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={onBack} style={{ width: 38, height: 38, borderRadius: 11, background: `var(--bg-secondary)`, border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ArrowLeft size={16} />
          </button>
          <div style={{ width: 44, height: 44, borderRadius: 13, background: ac, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: `var(--accent-secondary)`, flexShrink: 0 }}>
            {(client.name || 'C').slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: `var(--accent-secondary)`, lineHeight: 1.2 }}>{client.name}</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 2 }}>
              {client.phone && <span style={{ fontSize: 11, color: `var(--text-secondary)`, fontWeight: 600 }}>{client.phone}</span>}
              <PSBadge s={client.status || 'Active'} />
              <span style={{ fontSize: 11, color: `var(--text-secondary)` }}>{projects.length} project{projects.length !== 1 ? 's' : ''}</span>
              <span style={{ fontSize: 11, color: '#16A34A', fontWeight: 700 }}>{projects.filter(p => p.status !== 'Completed').length} active</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {selected && (
            <button onClick={() => setShowClientPreview(true)} title="See what this client sees right now" style={{ height: 40, padding: '0 16px', borderRadius: 12, background: '#fff', color: `var(--accent-secondary)`, border: '1.5px solid var(--border-color)', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              👁 Preview as Client
            </button>
          )}
          <button onClick={() => setShowNewModal(true)} style={{ height: 40, padding: '0 20px', borderRadius: 12, background: `var(--accent-secondary)`, color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={15} /> New Project
          </button>
        </div>
      </div>

      {/* 2-PANEL BODY */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, overflow: 'hidden' }}>

        {/* LEFT SIDEBAR */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
          {(() => {
            const activeProjects = projects.filter(p => p.status !== 'Completed').length;
            const pendingInvoices = (props.invoices || []).filter(i => ['Sent', 'Overdue'].includes(i.status) && i.type !== 'Quotation').length;
            const unsignedQuotes = (props.approvals || []).filter(a => ['Quotation', 'quotation'].includes(a.type) && a.status === 'Sent').length;

            return (
              <div style={{ padding: '16px 18px', background: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(250,250,249,0.5))', backdropFilter: 'blur(10px)', border: '1px solid rgba(200,169,110,0.3)', borderRadius: 20, color: 'var(--accent-secondary)', marginBottom: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Active</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--accent-secondary)' }}>{activeProjects}</div>
                  </div>
                  <div style={{ width: 1, background: 'var(--border-color)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Unpaid</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: pendingInvoices > 0 ? '#DC2626' : 'var(--accent-secondary)' }}>{pendingInvoices}</div>
                  </div>
                  <div style={{ width: 1, background: 'var(--border-color)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Unsigned</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: unsignedQuotes > 0 ? '#D97706' : 'var(--accent-secondary)' }}>{unsignedQuotes}</div>
                  </div>
                </div>
              </div>
            );
          })()}
          <button
            onClick={() => { setSelectedId('MESSAGES'); setActiveTab('chat'); }}
            style={{ width: '100%', textAlign: 'left', padding: '13px 14px', borderRadius: 13, border: `2px solid ${selectedId === 'MESSAGES' ? ac : 'transparent'}`, background: selectedId === 'MESSAGES' ? `${ac}10` : `var(--bg-secondary)`, cursor: 'pointer', transition: 'all .2s', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}
          >
            <MessageSquare size={16} color={selectedId === 'MESSAGES' ? ac : 'var(--text-secondary)'} />
            <div style={{ fontSize: 13, fontWeight: 800, color: selectedId === 'MESSAGES' ? ac : 'var(--text-secondary)' }}>Client Messages</div>
          </button>

          <div style={{ fontSize: 9, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.1em', paddingLeft: 2, paddingBottom: 4 }}>Projects</div>

          {loadingProjects ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2].map(i => <div key={i} style={{ height: 72, borderRadius: 14, background: `var(--bg-secondary)`, animation: 'pulse 1.5s infinite' }} />)}
            </div>
          ) : projects.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', border: '1.5px dashed var(--border-color)', borderRadius: 14 }}>
              <Briefcase size={24} color="var(--border-color)" style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 12, color: `var(--text-secondary)`, fontWeight: 600 }}>No projects yet</div>
              <button onClick={() => setShowNewModal(true)} style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: ac, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>+ Create first project</button>
            </div>
          ) : (() => {
            const sortedProjects = [...projects].sort((a, b) => {
              const aHasUnpaid = (props.invoices || []).some(i => i.projectId === a.id && ['Sent', 'Overdue'].includes(i.status));
              const bHasUnpaid = (props.invoices || []).some(i => i.projectId === b.id && ['Sent', 'Overdue'].includes(i.status));
              if (aHasUnpaid && !bHasUnpaid) return -1;
              if (!aHasUnpaid && bHasUnpaid) return 1;
              return 0;
            });

            return sortedProjects.map(p => {
              const stg = CLIENT_PROJECT_STAGES.find(s => s.id === p.stageId);
              const isActive = p.id === selectedId;
              const hasAction = (props.invoices || []).some(i => i.projectId === p.id && ['Sent', 'Overdue'].includes(i.status));

              return (
                <button key={p.id} onClick={() => { setSelectedId(p.id); setActiveTab('overview'); }}
                  style={{ width: '100%', textAlign: 'left', padding: '14px 16px', borderRadius: 14, border: `1.5px solid ${isActive ? ac : hasAction ? '#FCA5A5' : 'transparent'}`, background: isActive ? `${ac}10` : hasAction ? '#FEF2F2' : `var(--bg-secondary)`, cursor: 'pointer', transition: 'all .2s', position: 'relative', overflow: 'hidden' }}>
                  
                  {hasAction && <div style={{ position: 'absolute', top: 14, right: 14, width: 8, height: 8, borderRadius: '50%', background: '#EF4444', boxShadow: '0 0 8px rgba(239,68,68,0.6)' }} />}
                  
                  <div style={{ fontSize: 13, fontWeight: 800, color: hasAction ? '#991B1B' : `var(--accent-secondary)`, marginBottom: 4, paddingRight: 16 }}>{p.project || p.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={{ fontSize: 9, fontWeight: 800, color: stg?.color || `var(--text-secondary)`, background: `${stg?.color || `var(--text-secondary)`}18`, padding: '3px 8px', borderRadius: 20 }}>{stg?.short || 'Stage 1'}</span>
                    <span style={{ fontSize: 9, color: hasAction ? '#B91C1C' : `var(--text-secondary)` }}>{p.status === 'Completed' ? '✓ Done' : hasAction ? 'Action Required' : 'Active'}</span>
                  </div>
                  <div style={{ height: 4, background: hasAction ? '#FECACA' : `var(--border-color)`, borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${stg?.pct || 5}%`, background: hasAction ? '#EF4444' : (stg?.color || ac), borderRadius: 2 }} />
                  </div>
                </button>
              );
            });
          })()}
        </div>

        {/* RIGHT — Tabbed Main */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {selectedId === 'MESSAGES' ? (
            <div style={{ height: 'calc(100vh - 160px)', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: 16, border: '1px solid var(--border-color)', padding: '16px 20px', minHeight: 400 }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: `var(--accent-secondary)`, marginBottom: 12, flexShrink: 0 }}>Unified Client Chat</div>
              <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <WorldClassChat
                  clientId={client.id}
                  user={props.user}
                  accentColor={ac}
                  addClientMessage={props.addClientMessage}
                  isAdmin={true}
                  height="100%"
                  projects={projects.map(p => ({ id: p.id, title: p.title }))}
                  viewerLanguage={props.lang || 'en'}
                />
              </div>
            </div>
          ) : !selected ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 40 }}>
              <Briefcase size={48} color="var(--border-color)" style={{ marginBottom: 16 }} />
              <div style={{ fontSize: 18, fontWeight: 800, color: `var(--accent-secondary)`, marginBottom: 8 }}>Select a project</div>
              <div style={{ fontSize: 13, color: `var(--text-secondary)` }}>Choose a project from the sidebar or create a new one.</div>
            </div>
          ) : (
            <>
              {/* Project Title Bar */}
              <div key={`title-${selected.id}`} style={{ padding: '14px 20px', background: `var(--bg-secondary)`, borderRadius: 16, border: '1px solid var(--border-color)', marginBottom: 14, flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>
                      {PROJECT_TYPES[selected.projectType]?.label || 'Full Service'} &middot; ID {selected.id.slice(0, 8).toUpperCase()}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: `var(--accent-secondary)`, lineHeight: 1.2 }}>{selected.project || selected.title}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <label style={{ fontSize: 10, fontWeight: 700, color: `var(--text-secondary)`, whiteSpace: 'nowrap' }}>Est. Completion</label>
                      <input type="date" value={estDate} onChange={e => setEstDate(e.target.value)} onBlur={saveEstDate}
                        style={{ padding: '5px 10px', borderRadius: 9, border: '1.5px solid var(--border-color)', fontSize: 12, fontFamily: 'inherit', outline: 'none', color: `var(--accent-secondary)`, background: '#fff', cursor: 'pointer' }} />
                      {settingDate && <Loader2 size={12} color="var(--text-secondary)" style={{ animation: 'spin 1s linear infinite' }} />}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: currentStageObj?.color || ac, background: `${currentStageObj?.color || ac}15`, padding: '5px 12px', borderRadius: 20 }}>
                        {currentStageObj?.pct || 5}% complete
                      </div>
                      {nextStage && (
                        <button onClick={() => setShowAdvanceModal(true)}
                          style={{ height: 34, padding: '0 14px', borderRadius: 10, background: currentStageObj?.color || ac, color: '#fff', border: 'none', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                          Advance <ChevronRight size={13} />
                        </button>
                      )}
                      {!nextStage && <div style={{ fontSize: 11, fontWeight: 800, color: '#16A34A', background: '#F0FDF4', padding: '5px 12px', borderRadius: 20 }}>✓ All Done</div>}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 20, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', alignItems: 'center' }}>
                  {selected.budget && (
                    <div>
                      <div style={{ fontSize: 9, color: `var(--text-secondary)`, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>Budget</div>
                      <div style={{ fontSize: 14, fontWeight: 900, color: `var(--accent-secondary)` }}>{fmt(selected.budget)}</div>
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: 9, color: `var(--text-secondary)`, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>Current Stage</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: currentStageObj?.color || ac }}>{currentStageObj?.name || '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: `var(--text-secondary)`, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>Created</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: `var(--accent-secondary)` }}>
                      {selected.createdAt?.seconds ? new Date(selected.createdAt.seconds * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: `var(--text-secondary)`, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>Total Duration</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: `var(--accent-secondary)` }}>{totalCalendarDays} days</div>
                  </div>
                </div>
                <div style={{ marginTop: 10, height: 5, background: `var(--border-color)`, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${currentStageObj?.pct || 5}%`, background: currentStageObj?.color || ac, borderRadius: 3, transition: 'width 1s ease' }} />
                </div>
              </div>

              {workflowGuidance && (
                <div style={{ marginBottom: 16, padding: 16, borderRadius: 16, background: workflowGuidance.paymentInvoice ? '#EFF6FF' : '#FFFBEB', border: `1.5px solid ${workflowGuidance.paymentInvoice ? '#93C5FD' : '#FDE68A'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start', marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 900, color: workflowGuidance.paymentInvoice ? '#1D4ED8' : '#B45309', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>
                        Workflow Guidance · Waiting on {workflowGuidance.waitingOn}
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--accent-secondary)', marginBottom: 4 }}>{workflowGuidance.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{workflowGuidance.summary}</div>
                    </div>
                    {workflowGuidance.paymentInvoice && (
                      <button onClick={() => setActiveTab('financials')} style={{ flexShrink: 0, padding: '9px 14px', borderRadius: 10, background: '#1D4ED8', color: '#fff', border: 'none', fontSize: 11, fontWeight: 900, cursor: 'pointer' }}>
                        Verify Payment
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 10 }}>
                    {[
                      { label: 'Client should', data: workflowGuidance.client, color: '#B45309' },
                      { label: 'Project manager should', data: workflowGuidance.manager, color: '#1D4ED8' },
                    ].map(item => (
                      <div key={item.label} style={{ padding: 13, borderRadius: 12, background: '#fff', border: '1px solid rgba(0,0,0,.07)' }}>
                        <div style={{ fontSize: 9, fontWeight: 900, color: item.color, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>{item.label}</div>
                        <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--accent-secondary)', marginBottom: 3 }}>{item.data.title}</div>
                        <div style={{ fontSize: 11, lineHeight: 1.5, color: 'var(--text-secondary)', minHeight: 33 }}>{item.data.body}</div>
                        {item.label === 'Project manager should' && (
                          <button onClick={() => setActiveTab(item.data.tab)} style={{ marginTop: 9, border: 'none', background: 'transparent', color: item.color, fontSize: 11, fontWeight: 900, cursor: 'pointer', padding: 0 }}>
                            {item.data.action} <ChevronRight size={11} style={{ verticalAlign: 'middle' }} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab Bar */}
              <div style={{ position: 'sticky', top: -16, zIndex: 10, display: 'flex', gap: 4, marginBottom: 14, flexShrink: 0, background: 'rgba(250, 250, 249, 0.85)', backdropFilter: 'blur(12px)', padding: 6, borderRadius: 14, border: '1px solid var(--border-color)', margin: '0 -4px 14px -4px' }}>
                {TABS.map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    style={{ flex: 1, height: 34, borderRadius: 10, background: activeTab === tab.id ? '#fff' : 'transparent', color: activeTab === tab.id ? `var(--accent-secondary)` : `var(--text-secondary)`, border: activeTab === tab.id ? '1px solid var(--border-color)' : '1px solid transparent', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, transition: 'all .18s', boxShadow: activeTab === tab.id ? '0 1px 4px rgba(0,0,0,.07)' : 'none' }}>
                    {tab.icon}{tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div key={selected.id} style={{ flex: 1, overflowY: 'auto', paddingRight: 2 }}>

                {/* DESIGN VAULT (RENDERINGS) */}
                {activeTab === 'renderings' && (
                  <AdminRenderingManager project={selected} brand={brand} renderingPackages={props.renderingPackages} invoices={props.invoices} notify={props.notify} createInvoice={props.createInvoice} />
                )}

                {/* SPEC & BRIEF */}
                {activeTab === 'spec' && (
                  <SpecBriefManager project={selected} updateProject={props.updateProject} addProjectDocument={props.addProjectDocument} notify={props.notify} brand={brand} />
                )}

                {/* OVERVIEW */}
                {activeTab === 'overview' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {/* ── CLIENT VIEW MIRROR — what the client sees right now ── */}
                    {(() => {
                      const projectInvoices = (props.invoices || []).filter(i => i.projectId === selected.id || i.parentId === selected.id);
                      const projectPackages = (props.renderingPackages || []).filter(pkg => pkg.projectId === selected.id);
                      const projectAddOns = (props.addOns || []).filter(a => a.projectId === selected.id);
                      const isPaid = (s) => ['paid', 'paid in full'].includes(String(s || '').toLowerCase());

                      // Mirror Client Next Action logic exactly
                      const renderingInv = projectInvoices.find(i =>
                        i.id === selected.renderingFeeInvoiceId ||
                        ['rendering', 'design', 'rendering fee'].includes((i.type || '').toLowerCase())
                      );
                      const renderingPaid = !!selected.renderingFeePaid || (renderingInv && isPaid(renderingInv.status));
                      const needsRenderingPayment = selected.kickoffMode === 'rendering-first' && !renderingPaid;
                      const needsContractSign = !selected.contractAccepted && (selected.kickoffMode === 'rendering-first' ? renderingPaid : true);
                      const lockedRendering = projectPackages.find(pkg => {
                        const linkedInv = projectInvoices.find(i => i.id === pkg.linkedInvoiceId);
                        return linkedInv && !isPaid(linkedInv.status) && !pkg.unlocked;
                      });
                      const reviewRendering = projectPackages.find(pkg => {
                        const linkedInv = projectInvoices.find(i => i.id === pkg.linkedInvoiceId);
                        return (pkg.unlocked || isPaid(linkedInv?.status)) && pkg.status !== 'Approved';
                      });
                      const pendingQuote = projectInvoices.find(i =>
                        ['Quotation', 'quote', 'quotation'].includes(i.type || i.documentKind) &&
                        !['approved'].includes(String(i.status || '').toLowerCase()) && !isPaid(i.status)
                      );
                      const pendingAddOn = projectAddOns.find(a => ['Pending', 'Pending Approval', 'Priced'].includes(a.status || a.approvalStatus));
                      const unpaidInvoice = projectInvoices.find(i =>
                        !isPaid(i.status) && i.type !== 'Quotation' && i.documentKind !== 'quotation' &&
                        (i.status === 'Overdue' || i.status === 'Sent' || (i.due != null && i.due !== ''))
                      );
                      const specPending = selected.specDoc?.url && selected.specDoc?.status !== 'signed';

                      // Determine what client is currently being shown
                      let clientSeeing, clientAction, clientWaitingOn, urgency;
                      if (needsRenderingPayment) {
                        clientSeeing = '🚦 Kickoff Gate — Step 1: Pay Rendering Fee';
                        clientAction = renderingInv ? `Pay GH₵ ${Number(renderingInv.amount || 0).toLocaleString()} rendering invoice` : 'Waiting for rendering invoice to be created';
                        clientWaitingOn = renderingInv ? 'Client' : 'Admin (create invoice)';
                        urgency = renderingInv ? '#D97706' : '#DC2626';
                      } else if (needsContractSign) {
                        clientSeeing = '🚦 Kickoff Gate — Step 2: Sign Contract';
                        clientAction = 'Read & sign project agreement';
                        clientWaitingOn = 'Client';
                        urgency = '#D97706';
                      } else if (specPending) {
                        clientSeeing = '📄 Project Specification Signature Required';
                        clientAction = 'Review and sign the final project specification';
                        clientWaitingOn = 'Client';
                        urgency = '#1D4ED8';
                      } else if (lockedRendering) {
                        clientSeeing = '🔒 Locked Rendering Package';
                        clientAction = 'Pay invoice to unlock design package';
                        clientWaitingOn = 'Client';
                        urgency = '#D97706';
                      } else if (reviewRendering) {
                        clientSeeing = '🎨 Review Rendering Package';
                        clientAction = 'Review, leave pins, approve or request changes';
                        clientWaitingOn = 'Client';
                        urgency = AC;
                      } else if (pendingQuote) {
                        clientSeeing = '💰 Quote Awaiting Approval';
                        clientAction = `Review quote: ${pendingQuote.title || pendingQuote.id}`;
                        clientWaitingOn = 'Client';
                        urgency = AC;
                      } else if (pendingAddOn) {
                        clientSeeing = '🎁 Add-on Decision Needed';
                        clientAction = `Approve/reject: ${pendingAddOn.title || pendingAddOn.description}`;
                        clientWaitingOn = 'Client';
                        urgency = '#B45309';
                      } else if (unpaidInvoice) {
                        clientSeeing = '💳 Payment Pending';
                        clientAction = `Pay invoice: ${unpaidInvoice.title || ''} (GH₵ ${Number(unpaidInvoice.amount || 0).toLocaleString()})`;
                        clientWaitingOn = 'Client';
                        urgency = '#16A34A';
                      } else {
                        clientSeeing = `✅ Stage ${selected.stageId}: ${currentStageObj?.name || 'In Progress'}`;
                        clientAction = currentStageObj?.clientMsg || 'Project moving forward — no action required';
                        clientWaitingOn = currentStageObj?.whoActs === 'client' ? 'Client' : currentStageObj?.whoActs === 'worker' ? 'Field Team' : 'Admin/Production';
                        urgency = '#16A34A';
                      }

                      return (
                        <div style={{
                          padding: '18px 22px',
                          background: `linear-gradient(135deg, ${urgency}08 0%, #fff 100%)`,
                          border: `1.5px solid ${urgency}30`,
                          borderRadius: 16,
                          position: 'relative',
                          overflow: 'hidden',
                        }}>
                          <div style={{ position: 'absolute', top: 0, right: 0, padding: '4px 12px', background: urgency, color: '#fff', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', borderBottomLeftRadius: 10 }}>
                            Client's View
                          </div>
                          <div style={{ fontSize: 10, fontWeight: 800, color: urgency, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8, marginTop: 14 }}>
                            What your client sees right now
                          </div>
                          <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--accent-secondary)', marginBottom: 4 }}>
                            {clientSeeing}
                          </div>
                          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>
                            {clientAction}
                          </div>
                          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                            <div style={{
                              padding: '5px 12px',
                              background: clientWaitingOn === 'Client' ? '#FEF3C7' : clientWaitingOn.includes('Admin') ? '#FEE2E2' : '#E0F2FE',
                              color: clientWaitingOn === 'Client' ? '#92400E' : clientWaitingOn.includes('Admin') ? '#991B1B' : '#075985',
                              fontSize: 11,
                              fontWeight: 800,
                              borderRadius: 20,
                            }}>
                              ⏳ Waiting on: {clientWaitingOn}
                            </div>
                            {selected.kickoffGateCleared && (
                              <div style={{ padding: '5px 12px', background: '#F0FDF4', color: '#15803D', fontSize: 11, fontWeight: 800, borderRadius: 20 }}>
                                ✓ Kickoff Complete
                              </div>
                            )}
                            {selected.contractAccepted && (
                              <div style={{ padding: '5px 12px', background: '#F0FDF4', color: '#15803D', fontSize: 11, fontWeight: 800, borderRadius: 20 }}>
                                ✓ Contract Signed
                              </div>
                            )}
                            {renderingPaid && (
                              <div style={{ padding: '5px 12px', background: '#F0FDF4', color: '#15803D', fontSize: 11, fontWeight: 800, borderRadius: 20 }}>
                                ✓ Rendering Fee Paid
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {currentStageObj && selected.status !== 'Completed' && (
                      <div style={{ padding: '18px 22px', background: '#fff', borderRadius: 16, border: `2px solid ${currentStageObj.color}30` }}>
                        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                          <div style={{ width: 48, height: 48, borderRadius: 14, background: `${currentStageObj.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: currentStageObj.color, fontSize: 22 }}>
                            {STAGE_ICONS[currentStageObj.id]}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 10, fontWeight: 800, color: currentStageObj.color, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
                              Active Stage {currentStageObj.id} of {applicableStages.length} &middot; ~{computedTimeline[currentStageObj.id]?.durationDays || currentStageObj.days} days for this stage
                            </div>
                            <div style={{ fontSize: 17, fontWeight: 900, color: `var(--accent-secondary)`, marginBottom: 6 }}>{currentStageObj.name}</div>
                            <div style={{ fontSize: 13, color: `var(--text-secondary)`, lineHeight: 1.5 }}>{currentStageObj.adminPrompt}</div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                              {currentStageObj.whoActs === 'client' && <span style={{ fontSize: 11, fontWeight: 700, color: '#92400E', background: '#FFFBEB', padding: '4px 12px', borderRadius: 20, border: '1px solid #FDE68A' }}>⏳ Waiting on client</span>}
                              {currentStageObj.whoActs === 'worker' && <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', background: '#F0FDF4', padding: '4px 12px', borderRadius: 20, border: '1px solid #A7F3D0' }}>🔧 Field team task</span>}
                              {currentStageObj.whoActs === 'admin' && <span style={{ fontSize: 11, fontWeight: 700, color: `var(--accent-secondary)`, background: `var(--bg-secondary)`, padding: '4px 12px', borderRadius: 20, border: '1px solid var(--border-color)' }}>👤 Admin action needed</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                      {[
                        { label: 'Project Type', value: PROJECT_TYPES[selected.projectType]?.label || 'Full Service', icon: '📋' },
                        { label: 'Quote Status', value: selected.quoteApproved ? '✅ Approved' : '⏳ Pending', icon: '💳' },
                        { label: 'Team', value: `${new Set([...(selected.assignedWorkers || []), ...(selected.assignedStaff || []), ...(selected.projectManagerId ? [selected.projectManagerId] : [])]).size} assigned`, icon: '👥' },
                        { label: 'Spec Document', value: !selected.specDoc?.url ? 'Not uploaded' : selected.specDoc.status === 'signed' ? '✅ Signed' : selected.specDoc.status === 'rejected' ? '🔴 Changes Req.' : '⏳ Signature Required', icon: '📄' },
                        { label: 'Contract', value: selected.contractAccepted ? '✅ Signed' : '⏳ Not signed', icon: '📝' },
                        { label: 'Change Req.', value: selected.changeRequestPending ? '⚠️ Pending' : 'None', icon: '🔄' },
                      ].map(item => (
                        <div key={item.label} style={{ padding: '14px 16px', background: '#fff', borderRadius: 14, border: '1px solid var(--border-color)' }}>
                          <div style={{ fontSize: 20, marginBottom: 6 }}>{item.icon}</div>
                          <div style={{ fontSize: 9, fontWeight: 700, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{item.label}</div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: `var(--accent-secondary)` }}>{item.value}</div>
                        </div>
                      ))}
                    </div>
                    {selected.description && (
                      <div style={{ padding: '16px 20px', background: '#fff', borderRadius: 14, border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: 9, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Description</div>
                        <div style={{ fontSize: 13, color: `var(--text-secondary)`, lineHeight: 1.6 }}>{selected.description}</div>
                      </div>
                    )}

                    {/* ── KICKOFF GATE UNCONFIGURED WARNING ── */}
                    {!selected.kickoffMode && !selected.kickoffGateCleared && (
                      <div style={{ padding: '12px 16px', background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                        <AlertCircle size={16} color="#D97706" style={{ flexShrink: 0 }} />
                        <div>
                          <span style={{ fontWeight: 800, color: '#92400E' }}>Kickoff gate not configured.</span>
                          <span style={{ color: '#B45309', marginLeft: 6 }}>Choose a kickoff mode below or clear the gate to unlock client access.</span>
                        </div>
                      </div>
                    )}

                    {/* ── KICKOFF GATE CONTROLS ── */}
                    <div style={{ padding: '20px 24px', background: '#fff', borderRadius: 14, border: '1.5px solid var(--border-color)' }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>🚦</span> Kickoff Gate
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                        {/* Rendering toggle */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: `var(--accent-secondary)` }}>Requires 3D Rendering</div>
                            <div style={{ fontSize: 11, color: `var(--text-secondary)`, marginTop: 2 }}>
                              Client must pay rendering fee before signing contract
                            </div>
                          </div>
                          <button
                            onClick={() => props.updateProject?.(selected.id, {
                              kickoffMode: selected.kickoffMode === 'rendering-first' ? 'direct-kickoff' : 'rendering-first'
                            })}
                            style={{
                              width: 48, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer',
                              background: selected.kickoffMode === 'rendering-first' ? `var(--accent-secondary)` : '#e5e7eb',
                              position: 'relative', transition: 'background .2s', flexShrink: 0,
                            }}
                          >
                            <div style={{
                              position: 'absolute', top: 3, left: selected.kickoffMode === 'rendering-first' ? 23 : 3,
                              width: 22, height: 22, borderRadius: '50%', background: '#fff',
                              boxShadow: '0 1px 4px rgba(0,0,0,.2)', transition: 'left .2s',
                            }} />
                          </button>
                        </div>

                        {/* Status indicators */}
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          {selected.kickoffMode === 'rendering-first' && (
                            <span style={{
                              fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20,
                              background: selected.renderingFeePaid ? '#F0FDF4' : '#FEF3C7',
                              color: selected.renderingFeePaid ? '#15803D' : '#92400E',
                              border: `1px solid ${selected.renderingFeePaid ? '#BBF7D0' : '#FDE68A'}`,
                            }}>
                              {selected.renderingFeePaid ? '✓ Rendering Paid' : '⏳ Rendering Unpaid'}
                            </span>
                          )}
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20,
                            background: selected.contractAccepted ? '#F0FDF4' : '#FEF3C7',
                            color: selected.contractAccepted ? '#15803D' : '#92400E',
                            border: `1px solid ${selected.contractAccepted ? '#BBF7D0' : '#FDE68A'}`,
                          }}>
                            {selected.contractAccepted ? '✓ Contract Signed' : '⏳ Contract Pending'}
                          </span>
                          {selected.kickoffGateCleared && (
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20, background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
                              🔓 Gate Manually Cleared
                            </span>
                          )}
                        </div>

                        {/* Offline rendering payment recording */}
                        {selected.kickoffMode === 'rendering-first' && !selected.renderingFeePaid && (() => {
                          const renderingInv = (props.invoices || []).find(i =>
                            i.projectId === selected.id &&
                            (i.id === selected.renderingFeeInvoiceId || ['rendering','design','rendering fee','renderingfee'].includes((i.type || '').toLowerCase()))
                          );
                          return (
                            <button
                              onClick={async () => {
                                if (!window.confirm('Confirm that the rendering fee has been received offline (cash / bank transfer)? This will unlock the client\'s design vault.')) return;
                                if (renderingInv?.id) {
                                  const { updateDoc, doc: fsDoc } = await import('firebase/firestore');
                                  const { db: fsDb } = await import('../../lib/firebase');
                                  await updateDoc(fsDoc(fsDb, 'invoices', renderingInv.id), { status: 'Paid', paidAt: new Date().toISOString(), amountPaid: renderingInv.amount || renderingInv.total });
                                }
                                // Also unlock any linked rendering packages
                                const pkgs = (props.renderingPackages || []).filter(p => p.projectId === selected.id);
                                for (const pkg of pkgs) {
                                  const { updateDoc, doc: fsDoc } = await import('firebase/firestore');
                                  const { db: fsDb } = await import('../../lib/firebase');
                                  await updateDoc(fsDoc(fsDb, 'renderingPackages', pkg.id), { unlocked: true, status: 'Paid / Unlocked' });
                                }
                                await props.updateProject?.(selected.id, { renderingFeePaid: true, renderingFeeUnlockedAt: new Date().toISOString() });
                                if (selected.stageId < 2) {
                                  await props.updateProjectStage?.(selected.id, 2, 'Rendering fee paid offline, advancing to Design & Rendering', { silent: true });
                                }
                                props.notify?.('success', 'Rendering fee recorded as paid. Client portal unlocked.');
                              }}
                              style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #BBF7D0', background: '#F0FDF4', color: '#15803D', fontSize: 12, fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-start' }}
                            >
                              ✅ Mark Rendering Fee Paid (Offline)
                            </button>
                          );
                        })()}
                        {/* Manual gate override */}
                        {!selected.kickoffGateCleared ? (
                          <button
                            onClick={() => props.updateProject?.(selected.id, { kickoffGateCleared: true })}
                            style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #BFDBFE', background: '#EFF6FF', color: '#1D4ED8', fontSize: 12, fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-start' }}
                          >
                            🔓 Give full portal access
                          </button>
                        ) : (
                          <button
                            onClick={() => props.updateProject?.(selected.id, { kickoffGateCleared: false })}
                            style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', fontSize: 12, fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-start' }}
                          >
                            🔒 Re-enable Gate
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                )}

                {/* TIMELINE */}
                {activeTab === 'timeline' && (() => {
                  const firstStage = applicableStages[0];
                  const lastStage  = applicableStages[applicableStages.length - 1];
                  const minDateObj = new Date(computedTimeline[firstStage?.id]?.startDate || selected.createdAt);
                  const maxDateObj = new Date(computedTimeline[lastStage?.id]?.endDate   || selected.createdAt);
                  const minDate    = minDateObj.getTime();
                  const maxDate    = maxDateObj.getTime();
                  const totalTime  = maxDate - minDate || 1;
                  // Use the same value as the overview card so they always agree
                  const totalProjectDays = totalCalendarDays;

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 24 }}>
                      {/* STATS STRIP */}
                      <div style={{ padding: '16px 24px', background: `var(--bg-secondary)`, borderRadius: 18, border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 3 }}>Calculated Span</div>
                          <div style={{ fontSize: 22, fontWeight: 900, color: `var(--accent-secondary)` }}>{totalProjectDays} calendar days</div>
                        </div>
                        {estDate && (
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 3 }}>Est. Completion</div>
                            <div style={{ fontSize: 15, fontWeight: 800, color: ac }}>{new Date(estDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                          </div>
                        )}
                      </div>

                      {/* GANTT CHART VISUALIZER */}
                      <div style={{ padding: '24px', background: '#fff', borderRadius: 20, border: '1px solid var(--border-color)', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: `var(--accent-secondary)`, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: ac }} />
                          Gantt Visual Timeline
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'relative' }}>
                          {/* Horizontal Grid Lines */}
                          <div style={{ position: 'absolute', left: '210px', right: 0, top: 0, bottom: 0, display: 'flex', justifyContent: 'space-between', pointerEvents: 'none', zIndex: 0 }}>
                            {[0, 25, 50, 75, 100].map(pct => (
                              <div key={pct} style={{ width: 1, borderLeft: '1px dashed var(--border-color)', height: '100%' }} />
                            ))}
                          </div>

                          {applicableStages.map(s => {
                            const stageInfo = computedTimeline[s.id] || {};
                            const stTime = new Date(stageInfo.startDate).getTime();
                            const enTime = new Date(stageInfo.endDate).getTime();

                            const leftPercent = Math.max(0, Math.min(100, ((stTime - minDate) / totalTime) * 100));
                            const widthPercent = Math.max(2, Math.min(100 - leftPercent, ((enTime - stTime) / totalTime) * 100));

                            const isCurrent = s.id === selected.stageId;
                            const isPast = (selected.stageId || 1) > s.id;

                            return (
                              <div key={s.id} style={{ display: 'flex', alignItems: 'center', height: 28, zIndex: 1 }}>
                                {/* Stage Name Label */}
                                <div style={{ width: 200, fontSize: 11, fontWeight: 800, color: isCurrent ? `var(--accent-secondary)` : `var(--text-secondary)`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 10 }}>
                                  {s.name}
                                </div>
                                {/* Gantt Bar Container */}
                                <div style={{ flex: 1, height: '100%', position: 'relative', background: '#FAFAF9', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                                  <div
                                    style={{
                                      position: 'absolute',
                                      left: `${leftPercent}%`,
                                      width: `${widthPercent}%`,
                                      height: '100%',
                                      background: s.color,
                                      opacity: isCurrent ? 1 : isPast ? 0.6 : 0.25,
                                      borderRadius: 5,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: 9,
                                      fontWeight: 900,
                                      color: '#fff',
                                      boxShadow: isCurrent ? `0 0 12px ${s.color}60` : 'none',
                                      transition: 'all 0.3s'
                                    }}
                                    title={`${s.name}: ${stageInfo.startDate} to ${stageInfo.endDate} (${stageInfo.durationDays} days)`}
                                  >
                                    <span style={{ opacity: widthPercent > 12 ? 1 : 0, transition: 'opacity 0.2s', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                                      {stageInfo.durationDays}d
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Gantt Footer (Dates Timeline) */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: 160, marginTop: 12, fontSize: 9, color: `var(--text-secondary)`, fontWeight: 700 }}>
                          <span>{minDateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                          <span>{new Date(minDate + totalTime * 0.25).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                          <span>{new Date(minDate + totalTime * 0.50).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                          <span>{new Date(minDate + totalTime * 0.75).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                          <span>{maxDateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                        </div>
                      </div>

                      {/* STAGE SCHEDULER & DETAILS LIST */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: `var(--accent-secondary)`, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16A34A' }} />
                          Stage Dates & Schedule Settings
                        </div>

                        <div style={{ position: 'relative', paddingLeft: 44 }}>
                          <div style={{ position: 'absolute', left: 16, top: 12, bottom: 12, width: 2, background: `var(--border-color)`, zIndex: 0 }} />

                          {applicableStages.map((s, idx) => {
                            const isCurrent = s.id === selected.stageId;
                            const isPast = (selected.stageId || 1) > s.id;
                            const stageInfo = computedTimeline[s.id] || {};

                            return (
                              <React.Fragment key={s.id}>
                                <StageSchedulerRow
                                  s={s}
                                  idx={idx}
                                  stageInfo={stageInfo}
                                  selected={selected}
                                  applicableStages={applicableStages}
                                  updateProject={props.updateProject}
                                  invoices={props.invoices}
                                />
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </div>

                    </div>
                  );
                })()}

                {/* FINANCIALS */}
                {activeTab === 'financials' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <PaymentScheduleCard project={selected} createInvoice={props.createInvoice} notify={props.notify} brand={brand} invoices={props.invoices} />
                    <ProjectInvoicesLedger project={selected} client={client} invoices={props.invoices} brand={brand} updateInvoice={props.updateInvoice} deleteInvoice={props.deleteInvoice} notify={props.notify} user={props.user} updateProjectStage={props.updateProjectStage} updateProject={props.updateProject} />
                    <ProjectEconomics project={selected} user={props.user} />
                    <div style={{ height: 1, background: 'var(--border-color)', margin: '16px 0' }} />
                    <AdminAddOnManager project={selected} brand={brand} addOns={props.addOns} invoices={props.invoices} createInvoice={props.createInvoice} />
                  </div>
                )}

                {/* SHIPPING */}
                {activeTab === 'shipping' && (
                  <ShippingDetailsCard
                    project={selected}
                    invoices={props.invoices}
                    updateShippingDetails={props.updateShippingDetails}
                  />
                )}

                {/* VAULT */}
                {activeTab === 'vault' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <DocumentVault project={selected} addProjectDocument={props.addProjectDocument} user={props.user} />
                    <SecureVault 
                      projectId={selected.id} 
                      user={props.user}
                      onAdminUploadVault={async (file) => {
                        const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
                        const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
                        try {
                          const storageRef = ref(storage, `projects/${selected.id}/vault/${Date.now()}_${file.name}`);
                          await uploadBytes(storageRef, file);
                          const url = await getDownloadURL(storageRef);
                          await addDoc(collection(db, 'projects', selected.id, 'vault'), {
                            name: file.name,
                            url,
                            requiresSignature: true,
                            signatureData: null,
                            uploadedAt: serverTimestamp(),
                            uploadedBy: props.user?.name || 'Admin',
                            projectId: selected.id
                          });
                          props.notify?.('Uploaded to Vault', 'success');
                        } catch (e) {
                          console.error('Vault upload error:', e);
                          props.notify?.('Upload failed', 'error');
                        }
                      }}
                    />
                  </div>
                )}

                {/* UPLOADS */}
                {activeTab === 'uploads' && (
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, padding: 24, border: '1px solid var(--border-color)' }}>
                    <ClientUploadsTab projectId={selected.id} user={props.user} brand={props.brand} />
                  </div>
                )}

                {/* TEAM */}
                {activeTab === 'team' && (() => {
                  const assignedIds = new Set([
                    ...(selected.assignedWorkers || []),
                    ...(selected.assignedStaff || []),
                    ...(selected.projectManagerId ? [selected.projectManagerId] : []),
                  ]);
                  const assignedList = teamMembers.filter(m => assignedIds.has(m.uid || m.id?.toString()) || assignedIds.has(m.email));
                  const availList    = teamMembers.filter(m => !assignedIds.has(m.uid || m.id?.toString()) && !assignedIds.has(m.email));
                  const MemberCard = ({ m }) => {
                    const assigned = assignedIds.has(m.uid || m.id?.toString()) || assignedIds.has(m.email);
                    const isWorker = m.role === 'worker' || /worker|installer|field|technician|technical team lead/i.test(m.jobRole || '');
                    const isManager = selected.projectManagerId === (m.uid || m.id);
                    const initials = (m.name || m.email || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                    return (
                      <button onClick={() => props.assignWorkerToProject?.(selected.id, m.uid || m.id?.toString() || m.email)}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderRadius: 14, border: `2px solid ${assigned ? ac : `var(--border-color)`}`, background: assigned ? `${ac}14` : `var(--bg-secondary)`, cursor: 'pointer', transition: 'all .18s', minWidth: 200, textAlign: 'left' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: assigned ? ac : `var(--border-color)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: assigned ? '#fff' : `var(--text-secondary)`, flexShrink: 0 }}>
                          {initials}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: `var(--accent-secondary)`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name || m.email || 'Staff'}</div>
                          <div style={{ fontSize: 10, color: assigned ? ac : `var(--text-secondary)`, fontWeight: 600, marginTop: 1 }}>
                            {m.jobRole || m.role || 'Team Member'} · {isManager ? 'Project Manager' : isWorker ? 'Field Crew' : 'Project Staff'}
                          </div>
                        </div>
                        {assigned && <UserCheck size={15} color={ac} style={{ flexShrink: 0 }} />}
                      </button>
                    );
                  };
                  return (
                    <div style={{ paddingBottom: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {/* Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 900, color: `var(--accent-secondary)` }}>Team Assignment</div>
                          <div style={{ fontSize: 11, color: `var(--text-secondary)`, marginTop: 2 }}>Assignments are role-aware: staff manage the project, while workers receive it in Field Ops.</div>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: ac, background: `${ac}15`, padding: '5px 12px', borderRadius: 8 }}>
                          {assignedList.length} assigned
                        </div>
                      </div>

                      {/* Assigned */}
                      {assignedList.length > 0 && (
                        <div style={{ padding: '16px 18px', background: `${ac}08`, borderRadius: 14, border: `1.5px solid ${ac}30` }}>
                          <div style={{ fontSize: 9, fontWeight: 900, color: ac, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 12 }}>Assigned to this project</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                            {assignedList.map(m => <MemberCard key={m.id || m.email} m={m} />)}
                          </div>
                        </div>
                      )}

                      {/* Available */}
                      <div style={{ padding: '16px 18px', background: '#fff', borderRadius: 14, border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: 9, fontWeight: 900, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 12 }}>
                          {assignedList.length > 0 ? 'Available to add' : 'All team members'}
                        </div>
                        {availList.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                            {availList.map(m => <MemberCard key={m.id || m.email} m={m} />)}
                          </div>
                        ) : (
                          <div style={{ fontSize: 12, color: `var(--text-secondary)`, fontStyle: 'italic' }}>All team members are assigned to this project.</div>
                        )}
                        {teamMembers.length === 0 && (
                          <div style={{ fontSize: 12, color: `var(--text-secondary)` }}>No staff configured yet. Add team members from Staff Accounts.</div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* MESSAGES */}
                {activeTab === 'messages' && (
                  <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--border-color)', overflow: 'hidden', height: 600, display: 'flex', flexDirection: 'column' }}>
                    <WorldClassChat 
                      clientId={selected.clientId} 
                      user={props.user} 
                      isAdmin={true} 
                      accentColor={brand.color || 'var(--accent-secondary)'} 
                      projects={projects.filter(w => w.clientId === selected.clientId)} 
                      viewerLanguage={props.lang || 'en'}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {showNewModal && (
        <NewProjectModal client={client} teamMembers={teamMembers} onClose={() => setShowNewModal(false)} onCreate={props.createClientProject} />
      )}
      {showAdvanceModal && selected && nextStage && (
        <AdvanceModal project={selected} stage={currentStageObj} nextStage={nextStage} invoices={props.invoices || []} onClose={() => setShowAdvanceModal(false)} onAdvance={props.updateProjectStage} />
      )}
      {showRequestPaymentModal && selected && (
        <RequestPaymentModal
          client={client}
          project={selected}
          invoices={props.invoices || []}
          onClose={() => setShowRequestPaymentModal(false)}
          notify={props.notify}
          ac={props.ac}
        />
      )}
      {showClientPreview && selected && (
        <ClientPreviewModal
          project={selected}
          client={client}
          invoices={props.invoices || []}
          renderingPackages={props.renderingPackages || []}
          addOns={props.addOns || []}
          brand={brand}
          onClose={() => setShowClientPreview(false)}
        />
      )}
    </div>
  );
}

// ─── Client Preview Modal — shows admin exactly what the client sees ─────────
function ClientPreviewModal({ project, client, invoices, renderingPackages, addOns, brand, onClose }) {
  const ac = brand?.color || AC;
  const projectInvoices = invoices.filter(i => i.projectId === project.id || i.parentId === project.id);
  const projectPackages = renderingPackages.filter(pkg => pkg.projectId === project.id);
  const projectAddOns = addOns.filter(a => a.projectId === project.id);
  const isPaid = (s) => ['paid', 'paid in full'].includes(String(s || '').toLowerCase());

  // Replicate KickoffGate / Next Action logic
  const renderingInv = projectInvoices.find(i =>
    i.id === project.renderingFeeInvoiceId ||
    ['rendering', 'design', 'rendering fee'].includes((i.type || '').toLowerCase())
  );
  const renderingPaid = !!project.renderingFeePaid || (renderingInv && isPaid(renderingInv.status));
  const requiresRendering = project.kickoffMode === 'rendering-first';
  const contractSigned = !!project.contractAccepted;
  const kickoffActive = (requiresRendering && !renderingPaid) || !contractSigned;

  const currentStage = CLIENT_PROJECT_STAGES.find(s => s.id === project.stageId);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(6px)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#F8F6F3', borderRadius: 24, maxWidth: 480, width: '100%',
        maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 80px rgba(0,0,0,0.4)'
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', background: `var(--accent-secondary)`, color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>👁 Client View Preview</div>
            <div style={{ fontSize: 15, fontWeight: 900 }}>{client?.name} · {project.title}</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} />
          </button>
        </div>

        {/* Phone-frame body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, background: '#EDEAE6' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12, textAlign: 'center' }}>
            This is what your client sees right now
          </div>

          {/* Kickoff Gate Preview */}
          {kickoffActive ? (
            <div style={{ background: 'linear-gradient(135deg, var(--accent-secondary), #4A3B32)', borderRadius: 18, padding: '22px 20px', color: '#fff', marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.7, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.1em' }}>
                🚦 Kickoff Gate
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 6 }}>
                {requiresRendering && !renderingPaid ? '3D Rendering Fee' : 'Sign Your Contract'}
              </div>
              <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.5 }}>
                {requiresRendering && !renderingPaid
                  ? `Pay GH₵ ${Number(renderingInv?.amount || project.renderingFee || 0).toLocaleString()} rendering fee to unlock the portal`
                  : 'Read & sign the project agreement to begin'}
              </div>
              <div style={{ marginTop: 14, fontSize: 11, fontWeight: 700, padding: '6px 10px', background: 'rgba(255,255,255,0.15)', borderRadius: 8, display: 'inline-block' }}>
                Step {requiresRendering && !renderingPaid ? 1 : 2} of {requiresRendering ? 2 : 1}
              </div>
            </div>
          ) : (
            <>
              {/* Project Overview Card */}
              <div style={{ background: '#fff', borderRadius: 18, padding: 18, marginBottom: 14, border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>Project Overview</div>
                <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--accent-secondary)', marginBottom: 4 }}>{project.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
                  Stage {project.stageId} of {CLIENT_PROJECT_STAGES.length} · {currentStage?.short}
                </div>
                {currentStage && (
                  <div style={{ padding: 10, background: `${currentStage.color}10`, borderRadius: 10, fontSize: 12, color: currentStage.color, fontWeight: 700 }}>
                    {currentStage.emoji} {currentStage.clientMsg}
                  </div>
                )}
              </div>

              {/* Visible tabs */}
              <div style={{ background: '#fff', borderRadius: 16, padding: 12, fontSize: 11, color: 'var(--text-secondary)' }}>
                <div style={{ fontWeight: 800, marginBottom: 8 }}>Available Tabs:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {['Progress', project.kickoffMode !== 'direct-kickoff' && 'Designs', 'Approvals', project.stageId >= 6 ? 'Photos' : '🔒Photos', 'Payments', 'Add-ons', 'Documents'].filter(Boolean).map(t => (
                    <span key={t} style={{ padding: '4px 10px', background: 'var(--bg-secondary)', borderRadius: 12, fontSize: 10, fontWeight: 700 }}>{t}</span>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Open real portal link */}
          <div style={{ marginTop: 16, padding: 14, background: '#fff', borderRadius: 14, fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center' }}>
            Need the real portal? Visit <a href="/portal" target="_blank" rel="noreferrer" style={{ color: ac, fontWeight: 700 }}>/portal</a> while logged in as this client.
          </div>
        </div>
      </div>
    </div>
  );
}
