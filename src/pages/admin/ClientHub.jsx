import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft, Plus, MessageSquare, AlertCircle, Briefcase,
  User, DollarSign, Phone, Calendar, Loader2,
  Users, UserCheck, ChevronRight, CheckCircle2, RefreshCw, PenTool,
  FileText, Upload, ExternalLink, Trash2, ShieldCheck, X, Camera, Truck, Award,
  Video, Clock, CheckCheck, Smartphone, Monitor, FastForward, HelpCircle
} from 'lucide-react';
import { PAv, PSBadge } from '../../components/Shared';
import { CLIENT_PROJECT_STAGES, PROJECT_TYPES, GLASS_CATALOG_DATA } from '../../data';
import { db, storage, functions } from '../../lib/firebase';
import { httpsCallable } from 'firebase/functions';
import {
  collection, onSnapshot, query, orderBy, where, addDoc, serverTimestamp, doc, updateDoc, arrayUnion, deleteDoc, setDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import AdminRenderingManager from '../../components/AdminRenderingManager';
import AdminAddOnManager from '../../components/AdminAddOnManager';
import WorldClassChat from '../../components/WorldClassChat';
import { calculateTimeline, minimumAppointmentDateTime } from '../sharedHelpers';

import VideoCallModal from '../../components/VideoCallModal';
import { AC, STAGE_ICONS, SCHEDULE_CONFIGS, PREMIUM_CATALOG, BD_ITEMS_CONFIG } from './clienthub/config.jsx';

// ─── Offline Stage Jump feature announcement ─────────────────────────────────
// Shows up to 3 times (or until explicitly skipped), and stops on its own after
// 5 days from the first time it was shown — after that the same explanation
// stays available forever via the small "?" icon next to the Fast-Forward
// button and the Starting Stage picker (i.e. it "moves to support").
const OFFLINE_JUMP_TUT_KEY = 'wl_tut_offlineStageJump';
const OFFLINE_JUMP_TUT_MAX_SHOWS = 3;
const OFFLINE_JUMP_TUT_MAX_DAYS = 5;
function readOfflineJumpTutState() {
  try {
    const raw = JSON.parse(localStorage.getItem(OFFLINE_JUMP_TUT_KEY));
    if (raw && typeof raw === 'object') return raw;
  } catch {}
  return { count: 0, firstSeenAt: null, skipped: false };
}
function offlineJumpTutShouldShow(s) {
  if (s.skipped) return false;
  if (s.count >= OFFLINE_JUMP_TUT_MAX_SHOWS) return false;
  if (s.firstSeenAt && (Date.now() - new Date(s.firstSeenAt).getTime()) > OFFLINE_JUMP_TUT_MAX_DAYS * 24 * 60 * 60 * 1000) return false;
  return true;
}
import { printInvoiceOrReceipt, printSignedContractDoc } from './clienthub/print';
import { ProjectInvoicesLedger } from './clienthub/ProjectInvoicesLedger';
import { PaymentScheduleCard } from './clienthub/PaymentScheduleCard';
import QuoteNegotiationCard from './clienthub/QuoteNegotiationCard';
import { NewProjectModal } from './clienthub/NewProjectModal';
import { AdvanceModal } from './clienthub/AdvanceModal';
import { ShippingDetailsCard, ProjectEconomics, DocumentVault } from './clienthub/ProjectDetailCards';
import ClientUploadsTab from '../../components/ClientUploadsTab';
import SecureVault from '../../components/SecureVault';
import RequestPaymentModal from './clienthub/RequestPaymentModal';
import {
  applicableWorkflowSteps,
  deriveWorkflowStep,
  workflowProgress,
  WORKFLOW_STEP
} from '../../lib/projectWorkflow';

function getProjectWorkflowGuidance(project, invoices = [], approvals = [], renderingPackages = [], addOns = [], changeRequests = []) {
  if (!project) return null;

  const projectInvoices = invoices.filter(i => i.projectId === project.id || i.parentId === project.id);
  const projectPackages = renderingPackages.filter(pkg => pkg.projectId === project.id);
  const projectAddOns = addOns.filter(item => item.projectId === project.id);
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
  const quoteInvoices = projectInvoices
    .filter(isQuote)
    .sort((a, b) => Number(b.version || 0) - Number(a.version || 0));
  const quoteInvoice = quoteInvoices.find(invoice => invoice.id === project.activeQuoteId) || quoteInvoices[0];
  const quoteApproved = project.quoteApproved === true ||
    String(quoteInvoice?.status || '').toLowerCase() === 'approved';
  const quoteChangesRequested = project.quoteChangeRequested === true ||
    String(quoteInvoice?.status || '').toLowerCase() === 'changes requested';
  const verificationPending = projectInvoices.find(i =>
    i.awaitingConfirmation === true ||
    String(i.status || '').toLowerCase() === 'verification pending'
  );
  const unpaidInvoice = projectInvoices.find(i =>
    !isQuote(i) && ['sent', 'overdue', 'pending', 'partially paid'].includes(String(i.status || '').toLowerCase())
  );
  const result = (waitingOn, title, summary, client, manager, paymentInvoice = null) => ({
    waitingOn, title, summary, client, manager, paymentInvoice,
  });

  const stageId = Number(project.stageId || 1);

  // Rendering fee + site visit — only relevant while project is still in Stage 1
  if (renderingFirst && stageId < 2) {
    if (!renderingInvoice) {
      return result(
        'project manager',
        'Issue the rendering fee invoice',
        'The paid design journey cannot begin until a rendering fee invoice is issued.',
        { title: 'No action yet', body: 'The client is waiting for the rendering fee invoice.', action: 'Waiting for Westline' },
        { title: 'Create the rendering fee invoice', body: 'Open Payments, issue the rendering/design fee invoice, and notify the client.', tab: 'financials', action: 'Open Payments' }
      );
    }

    if (!renderingPaid) {
      return result(
        'client',
        'Rendering fee awaiting payment',
        'The design package remains locked until this invoice is paid and verified.',
        { title: 'Pay the rendering fee', body: 'Open Financials and pay online or submit an offline payment notice.', action: 'Payment required' },
        { title: 'Monitor or verify payment', body: 'Do not unlock the rendering manually. If offline payment is submitted, verify it in Payments.', tab: 'financials', action: 'Review Payments' }
      );
    }

    if (project.siteVisit?.status !== 'scheduled' && project.siteVisit?.status !== 'completed') {
      return result(
        'client or project manager',
        'Schedule the technical site visit',
        'Rendering payment is complete. Measurements and site photos must be captured before the design team prepares the 3D rendering.',
        { title: 'Choose an appointment', body: 'Select a suitable date and time for the technical visit.', action: 'Schedule visit' },
        { title: 'Help schedule the visit', body: 'If the client arranged it by phone, record the confirmed date below so the project is not blocked.', tab: 'overview', action: 'Schedule Visit' }
      );
    }

    if (project.siteVisit?.status === 'scheduled') {
      const appointment = project.siteVisit.startAt
        ? new Date(project.siteVisit.startAt).toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' })
        : 'the confirmed appointment time';
      const visitNote = project.siteVisit.notes ? ` Client note: ${project.siteVisit.notes}` : '';
      return result(
        'technical team',
        'Complete the scheduled site survey',
        `The visit is confirmed for ${appointment}.${visitNote}`,
        { title: 'Site visit confirmed', body: `The appointment is set for ${appointment}.`, action: 'Appointment confirmed' },
        { title: 'Coordinate the technical team', body: `Confirm worker assignment and site access.${visitNote} After the visit, mark it complete and record measurements and evidence.`, tab: 'overview', action: 'View Appointment' }
      );
    }
  }

  // Rendering review — only relevant while project is still in Stage 2
  if (renderingFirst && stageId < 3) {
    if (project.siteVisit?.status === 'completed' && projectPackages.length === 0) {
      return result(
        'project manager',
        'Prepare and upload the 3D rendering',
        'The survey is complete. The design team can now produce the rendering from verified site measurements.',
        { title: 'Rendering in preparation', body: 'The client will be notified when the design is ready for review.', action: 'Waiting for Westline' },
        { title: 'Upload the rendering package', body: 'Open Designs, upload the correct version, and publish it for client review.', tab: 'renderings', action: 'Open Designs' }
      );
    }

    if (project.changeRequestPending) {
      const renderingRequest = changeRequests
        .filter(request =>
          request.projectId === project.id &&
          String(request.type || '').toLowerCase() === 'rendering' &&
          String(request.status || '').toLowerCase() === 'pending'
        )
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))[0];
      return result(
        'project manager',
        'Client requested changes to the 3D rendering',
        renderingRequest?.note || 'The design is on hold until a revised rendering is uploaded.',
        { title: 'Revision requested', body: 'The client is waiting for the updated design package.', action: 'Waiting for Westline' },
        { title: 'Upload the revised rendering', body: 'Open Designs, review the client note or pins, upload the corrected version, and return it for approval.', tab: 'renderings', action: 'Resolve Revision' }
      );
    }

    if (!renderingApproved) {
      return result(
        'client',
        'Rendering awaiting client approval',
        'The client must approve the final design or request revisions before the legal specification is finalized.',
        { title: 'Review the rendering', body: 'Approve the final design or place clear revision comments.', action: 'Design review required' },
        { title: 'Monitor design feedback', body: 'Respond to comments, upload revisions, and keep the approved version clearly identified.', tab: 'renderings', action: 'Open Designs' }
      );
    }
  }

  if (!quoteInvoice) {
    return result(
      'project manager',
      'Prepare the negotiated quotation',
      'The rendering is approved. Price the agreed scope and issue the quotation for client review.',
      { title: 'No action yet', body: 'The client is waiting for the project quotation.', action: 'Waiting for Westline' },
      { title: 'Create quotation v1', body: 'Open the negotiation workspace, enter the agreed scope and total, choose the payment schedule, then send it.', tab: 'financials', action: 'Open Negotiation' }
    );
  }

  if (quoteChangesRequested) {
    return result(
      'project manager',
      'Client requested a revised quotation',
      project.quoteChangeRequestNote || quoteInvoice?.changeRequestNote || 'The client has requested changes to the commercial terms.',
      { title: 'Revision submitted', body: 'The client is waiting for the project manager to issue a revised quotation.', action: 'Waiting for Westline' },
      { title: 'Review feedback and issue the next version', body: 'Open the negotiation workspace, update the amount or scope, and send a revised quotation.', tab: 'financials', action: 'Revise Quotation' }
    );
  }

  if (!quoteApproved) {
    return result(
      'client',
      'Quotation awaiting approval or change request',
      'This is the commercial negotiation step. The client can approve the cost or request a revised quotation.',
      { title: 'Review the quotation', body: 'Approve the total or request changes with clear comments.', action: 'Decision required' },
      { title: 'Monitor the negotiation', body: 'The quotation has been sent. Answer questions; if the client requests changes, issue a new version here.', tab: 'financials', action: 'Open Negotiation' }
    );
  }

  if (!agreementSigned) {
    return result(
      'client',
      'Project contract awaiting signature',
      'The negotiated quotation is approved. The client must now sign the contract and terms.',
      { title: 'Read and sign the contract', body: 'Review the legal terms and complete the electronic signature.', action: 'Signature required' },
      { title: 'Monitor the contract signature', body: 'The initial project payment activates automatically after signing.', tab: 'messages', action: 'Open Messages' }
    );
  }

  if (verificationPending) {
    const amount = Number(verificationPending.amount || verificationPending.total || 0);
    return result(
      'project manager',
      'Client payment needs verification',
      `The client reported an offline payment${amount ? ` of ${verificationPending.currency || 'GHS'} ${amount.toLocaleString()}` : ''}. The deliverables gate remains pending until an administrator verifies it.`,
      { title: 'Payment submitted', body: 'The client is waiting for Westline to verify the transfer or cash payment.', action: 'Waiting for confirmation' },
      { title: 'Verify and record the payment', body: 'Match the bank/cash evidence, amount, payer, reference, and date. Then confirm it in Payments.', tab: 'financials', action: 'Verify Payment' },
      verificationPending
    );
  }

  const initialDepositInvoice = projectInvoices.find(i => {
    const text = `${i.milestoneKey || ''} ${i.title || ''} ${i.type || ''}`.toLowerCase();
    return text.includes('initial-deposit') || text.includes('deposit') || text.includes('first instal');
  });
  const initialDepositPaid = project.depositPaid === true || project.initialDepositPaid === true || isPaid(initialDepositInvoice?.status);
  if (!initialDepositPaid) {
    return result(
      'client',
      'Initial project payment awaiting payment',
      'The contract is signed. The first project payment must clear before the final deliverables document is issued.',
      { title: 'Pay the initial project invoice', body: 'Pay online or submit an offline payment notice from Financials.', action: 'Payment required' },
      { title: 'Monitor or verify the payment', body: 'If offline payment is submitted, verify it in Payments before uploading the final deliverables.', tab: 'financials', action: 'Open Payments' }
    );
  }

  if (!specUploaded) {
    return result(
      'project manager',
      'Prepare the final deliverables document',
      'Payment is verified. Upload the legally binding final drawings, bill of materials, quantities, scope, exclusions, deliverables, and outcomes.',
      { title: 'No action yet', body: 'The client is waiting for the final deliverables document.', action: 'Waiting for Westline' },
      { title: 'Upload final deliverables', body: 'Open Project Brief, verify the complete document, and publish it for signature.', tab: 'spec', action: 'Open Project Brief' }
    );
  }

  if (!productionAuthorized) {
    return result(
      'client',
      'Final deliverables awaiting signature',
      'Production remains locked until the client signs the final drawings, bill of materials, scope, and deliverables.',
      { title: 'Review and sign the deliverables', body: 'Verify every section, acknowledge the legal effect, and sign to authorise production.', action: 'Signature required' },
      { title: 'Wait for the client signature', body: 'Review status in Project Brief and answer any requested changes.', tab: 'spec', action: 'Open Project Brief' }
    );
  }

  const goodsBalanceInvoice = projectInvoices.find(i => {
    const descriptor = `${i.milestoneKey || ''} ${i.title || ''} ${i.type || ''}`.toLowerCase();
    return descriptor.includes('pre-installation-balance') || descriptor.includes('goods balance') || descriptor.includes('ghana arrival');
  });
  const goodsBalancePaid = project.goodsBalancePaid === true || project.postProductionPaid === true || isPaid(goodsBalanceInvoice?.status);
  const installationAddOn = projectAddOns?.find?.(item => item.category === 'installation' || item.isInstallationInvoice === true);
  const installationInvoice = projectInvoices.find(i =>
    i.isInstallationInvoice === true || i.paymentPurpose === 'installation' || i.id === installationAddOn?.linkedInvoiceId
  );
  const installationPaid = project.installationFeePaid === true || isPaid(installationInvoice?.status);

  if (Number(project.stageId || 1) >= 5 && !project.shippingDetails?.vesselName) {
    return result(
      'project manager',
      'Add shipping details and ETA',
      'The initial deposit has funded production. Publish the confirmed vessel, container, bill of lading, and ETA for the client.',
      {
        title: 'Shipping is being prepared',
        body: 'The client is waiting for confirmed tracking and ETA.',
        action: 'Waiting for Westline',
      },
      {
        title: 'Publish shipment information',
        body: 'Open Shipping, enter the confirmed logistics details and ETA, then save.',
        tab: 'shipping',
        action: 'Open Shipping',
      }
    );
  }

  if (Number(project.stageId || 1) >= 5 && !project.goodsArrivedInGhana) {
    return result(
      'project manager',
      'Track shipment until Ghana arrival',
      'Keep the client updated. Once the goods physically arrive in Ghana, confirm arrival to issue the final goods balance automatically.',
      { title: 'Track the shipment', body: 'Vessel, container, and ETA information remain available during transit.', action: 'No payment due yet' },
      { title: 'Confirm arrival only when verified', body: 'Open Shipping and use Mark Arrived in Ghana after customs or warehouse confirmation.', tab: 'shipping', action: 'Open Shipping' }
    );
  }

  if (Number(project.stageId || 1) >= 5 && !goodsBalancePaid) {
    return result(
      goodsBalanceInvoice ? 'client' : 'project manager',
      goodsBalanceInvoice ? 'Final goods balance awaiting payment' : 'Issue the final goods balance',
      'Goods are in Ghana. The core balance must be verified before delivery to site or installation.',
      { title: goodsBalanceInvoice ? 'Pay the final goods balance' : 'Waiting for invoice', body: 'Pay online or submit an offline payment for verification.', action: goodsBalanceInvoice ? 'Payment required' : 'Waiting for Westline' },
      { title: 'Monitor or verify the goods payment', body: 'Open Payments and confirm cleared funds. Do not move goods to site before verification.', tab: 'financials', action: 'Open Payments' }
    );
  }

  if (Number(project.stageId || 1) >= 5 && project.projectType !== 'buy-only' && !installationAddOn) {
    return result(
      'project manager',
      'Prepare the installation service add-on',
      'Installation is billed separately from the project quotation.',
      { title: 'No action yet', body: 'The client is waiting for the installation proposal.', action: 'Waiting for Westline' },
      { title: 'Create installation add-on', body: 'Open Payments, create an Installation Service add-on, and send it for client approval.', tab: 'financials', action: 'Create Add-On' }
    );
  }

  if (Number(project.stageId || 1) >= 5 && project.projectType !== 'buy-only' && !installationPaid) {
    return result(
      installationInvoice ? 'client' : 'client',
      installationInvoice ? 'Installation invoice awaiting payment' : 'Installation add-on awaiting approval',
      'The separate installation service must be approved and fully paid before installation begins.',
      { title: installationInvoice ? 'Pay the installation invoice' : 'Approve the installation add-on', body: 'Open Financials to review and complete this action.', action: installationInvoice ? 'Payment required' : 'Approval required' },
      { title: 'Monitor installation approval and payment', body: 'Use Payments to verify offline funds when submitted.', tab: 'financials', action: 'Open Payments' }
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


  const stage = CLIENT_PROJECT_STAGES.find(item => item.id === project.stageId);
  return result(
    stage?.whoActs === 'client' ? 'client' : stage?.whoActs === 'worker' ? 'worker' : 'project manager',
    `${stage?.name || 'Project'} is active`,
    stage?.clientMsg || 'The project is moving through its approved workflow.',
    { title: stage?.whoActs === 'client' ? 'Client action required' : 'Track current progress', body: stage?.clientMsg || 'No client action is required right now.', action: stage?.whoActs === 'client' ? 'Action required' : 'No action now' },
    { title: 'Complete the current stage work', body: stage?.adminPrompt || 'Update progress, dates, ownership, and evidence before advancing.', tab: stage?.whoActs === 'worker' ? 'team' : 'timeline', action: stage?.whoActs === 'worker' ? 'Review Team' : 'Open Timeline' }
  );
}

function AdminSiteVisitCard({ project, notify }) {
  const [startAt, setStartAt] = useState('');
  const [notes, setNotes] = useState(project?.siteVisit?.notes || '');
  const [completionNotes, setCompletionNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const workflowStep = deriveWorkflowStep(project);
  if (![WORKFLOW_STEP.SITE_VISIT_SCHEDULING, WORKFLOW_STEP.SITE_SURVEY, WORKFLOW_STEP.RENDERING_REVIEW].includes(workflowStep)) return null;

  const scheduled = project.siteVisit?.status === 'scheduled';
  const completed = project.siteVisit?.status === 'completed';
  const schedule = async () => {
    if (!startAt || busy) return;
    const appointment = new Date(startAt);
    if (Number.isNaN(appointment.getTime()) || appointment.getTime() < Date.now() + 30 * 60 * 1000) {
      notify?.('error', 'Choose a date and time at least 30 minutes from now.');
      return;
    }
    setBusy(true);
    try {
      const scheduleSiteVisit = httpsCallable(functions, 'scheduleProjectSiteVisit');
      await scheduleSiteVisit({
        projectId: project.id,
        startAt: appointment.toISOString(),
        durationMinutes: 120,
        timezone: 'Africa/Accra',
        source: 'phone',
        actorName: 'Project Manager',
        notes,
      });
      notify?.('success', 'Site visit recorded and the client, project manager, and assigned workers were notified.');
    } catch (e) {
      notify?.('error', e?.message || 'Could not schedule the site visit.');
    } finally {
      setBusy(false);
    }
  };
  const complete = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const completeSiteVisit = httpsCallable(functions, 'completeProjectSiteVisit');
      await completeSiteVisit({ projectId: project.id, notes: completionNotes, evidenceUrls: [] });
      notify?.('success', 'Site survey completed. The design team is now prompted to prepare the rendering.');
    } catch (e) {
      notify?.('error', e?.message || 'Could not complete the site visit.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: 20, borderRadius: 16, background: '#fff', border: '1.5px solid #BFDBFE', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ width: 40, height: 40, borderRadius: 11, background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Calendar size={18} /></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--accent-secondary)' }}>
            {completed ? 'Technical site survey completed' : scheduled ? 'Technical site visit scheduled' : 'Schedule the technical site visit'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: 3 }}>
            {completed
              ? 'Measurements are complete. Prepare and upload the 3D rendering.'
              : scheduled
                ? `${new Date(project.siteVisit.startAt).toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' })} · Source: ${project.siteVisit.source || 'portal'}`
                : 'Use this when the client calls or WhatsApps instead of scheduling from the portal.'}
          </div>
          {scheduled && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginTop: 10 }}>
              <div style={{ padding: '9px 11px', borderRadius: 10, background: '#EFF6FF', border: '1px solid #DBEAFE' }}>
                <div style={{ fontSize: 9, fontWeight: 900, color: '#1D4ED8', textTransform: 'uppercase', marginBottom: 3 }}>Scheduled by</div>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent-secondary)' }}>{project.siteVisit.scheduledByName || (project.siteVisit.source === 'client_portal' ? 'Client' : 'Project Manager')}</div>
              </div>
              <div style={{ padding: '9px 11px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 9, fontWeight: 900, color: '#475569', textTransform: 'uppercase', marginBottom: 3 }}>Client note</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-secondary)', whiteSpace: 'pre-wrap' }}>{project.siteVisit.notes || 'No access instructions were provided.'}</div>
              </div>
            </div>
          )}
        </div>
      </div>
      {!scheduled && !completed && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, .8fr) 1.2fr auto', gap: 10 }}>
          <input type="datetime-local" value={startAt} min={minimumAppointmentDateTime()} onChange={e => setStartAt(e.target.value)} style={{ padding: '11px 13px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontFamily: 'inherit' }} />
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Access instructions or phone arrangement note" style={{ padding: '11px 13px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontFamily: 'inherit' }} />
          <button onClick={schedule} disabled={!startAt || busy} style={{ padding: '11px 16px', borderRadius: 10, border: 'none', background: startAt ? '#2563EB' : 'var(--border-color)', color: '#fff', fontWeight: 800, cursor: startAt ? 'pointer' : 'default' }}>{busy ? 'Saving...' : 'Record Visit'}</button>
        </div>
      )}
      {scheduled && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
          <input value={completionNotes} onChange={e => setCompletionNotes(e.target.value)} placeholder="Measurement summary, access issues, and evidence location" style={{ padding: '11px 13px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontFamily: 'inherit' }} />
          <button onClick={complete} disabled={busy} style={{ padding: '11px 16px', borderRadius: 10, border: 'none', background: '#15803D', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>{busy ? 'Completing...' : 'Mark Survey Complete'}</button>
        </div>
      )}
    </div>
  );
}

function DetailedWorkflowProgress({ project, invoices, renderingPackages }) {
  const progress = workflowProgress(project, { invoices, renderingPackages });
  const workflowSteps = progress.steps;
  const currentIndex = progress.index;
  const percent = currentIndex >= workflowSteps.length - 1
    ? 100
    : Math.round((currentIndex / (workflowSteps.length - 1)) * 100);

  return (
    <div style={{ padding: 22, background: '#fff', borderRadius: 18, border: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 5 }}>
            Complete operational workflow
          </div>
          <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--accent-secondary)' }}>
            Step {currentIndex + 1} of {workflowSteps.length}: {progress.meta?.label}
          </div>
          <div style={{ marginTop: 5, fontSize: 12, color: 'var(--text-secondary)' }}>
            Current owner: <strong style={{ color: 'var(--accent-secondary)' }}>{progress.meta?.owner || 'project manager'}</strong>
          </div>
        </div>
        <div style={{ minWidth: 150, textAlign: 'right' }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--accent-secondary)' }}>{percent}%</div>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Workflow progress</div>
        </div>
      </div>

      <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 20, overflow: 'hidden', marginBottom: 18 }}>
        <div style={{ width: `${percent}%`, height: '100%', background: 'var(--accent-secondary)', borderRadius: 20, transition: 'width .35s ease' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
        {workflowSteps.map((step, index) => {
          const isDone = index < currentIndex;
          const isCurrent = index === currentIndex;
          const stage = CLIENT_PROJECT_STAGES.find(item => item.id === step.stageId);
          return (
            <div
              key={step.id}
              style={{
                minHeight: 70,
                padding: '11px 12px',
                borderRadius: 10,
                border: isCurrent ? `2px solid ${stage?.color || 'var(--accent-secondary)'}` : '1px solid var(--border-color)',
                background: isDone ? '#F0FDF4' : isCurrent ? `${stage?.color || '#1A1410'}08` : '#fff',
                display: 'flex',
                gap: 9,
                alignItems: 'flex-start',
              }}
            >
              <div style={{
                width: 23,
                height: 23,
                borderRadius: '50%',
                flexShrink: 0,
                display: 'grid',
                placeItems: 'center',
                background: isDone ? '#16A34A' : isCurrent ? (stage?.color || 'var(--accent-secondary)') : 'var(--bg-secondary)',
                color: isDone || isCurrent ? '#fff' : 'var(--text-secondary)',
                fontSize: 10,
                fontWeight: 900,
              }}>
                {isDone ? <CheckCircle2 size={13} /> : index + 1}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: isCurrent ? (stage?.color || 'var(--accent-secondary)') : 'var(--accent-secondary)', lineHeight: 1.3 }}>
                  {step.label}
                </div>
                <div style={{ marginTop: 3, fontSize: 9, color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                  Stage {step.stageId} · {step.owner}
                </div>
                {isCurrent && (
                  <div style={{ marginTop: 5, fontSize: 9, fontWeight: 900, color: stage?.color || 'var(--accent-secondary)', textTransform: 'uppercase' }}>
                    Current action
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Stage Scheduler Row ─────────────────────────────────────────────────────
// Extracted so each row has its own local state for the duration input.
// Saves to Firestore only on blur — prevents keystroke race conditions that
// caused the Gantt to show stale intermediate values.
function StageSchedulerRow({ s, idx, stageInfo, earliestStartDate, selected, applicableStages, updateProject }) {
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
              min={earliestStartDate || undefined}
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
        },
        workflowStep: 'deliverables-approval',
        nextAction: 'Client reviews and signs the final deliverables document',
      });
      // Notify the client that a spec doc is waiting for their review
      if (project?.clientId && db) {
        addDoc(collection(db, 'clients', project.clientId, 'messages'), {
          text: `📄 Final deliverables document v${Number(spec?.version || 0) + 1}, "${file.name}", has been shared for "${project.title || project.project}". Please review the final drawings, bill of materials, quantities, scope, exclusions, deliverables, and outcomes, then sign it to authorise procurement and production.`,
          senderRole: 'system',
          isInternal: false,
          readByAdmin: true,
          readByClient: false,
          createdAt: serverTimestamp(),
        }).catch(() => {});
      }
      notify?.('success', 'Final deliverables document sent to the client for production authorisation');
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

  const client = dbClients.find(c => c.id === clientId) || dbClients.find(c => c.phone === clientId) || (() => {
    const p = (props.clients || []).find(p => p.clientId === clientId);
    if (!p) return undefined;
    return { id: clientId, name: p.clientName || p.name || 'Client', phone: p.clientPhone || p.phone || '', email: p.clientEmail || p.email || '', company: p.clientCompany || p.company || '' };
  })();
  const teamMembers = props.teamMembers || [];

  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  // Newest project stays pinned to the top by default — admin can switch to
  // action-required-first or oldest-first, and hide completed projects.
  const [projectSortMode, setProjectSortMode] = useState('newest');
  const [projectFilterMode, setProjectFilterMode] = useState('all');
  const [showNewModal, setShowNewModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showStageJumpModal, setShowStageJumpModal] = useState(false);
  const [showOfflineJumpTut, setShowOfflineJumpTut] = useState(() => offlineJumpTutShouldShow(readOfflineJumpTutState()));
  const [showOfflineJumpHelp, setShowOfflineJumpHelp] = useState(false);
  useEffect(() => {
    if (!showOfflineJumpTut) return;
    const s = readOfflineJumpTutState();
    localStorage.setItem(OFFLINE_JUMP_TUT_KEY, JSON.stringify({
      count: s.count + 1,
      firstSeenAt: s.firstSeenAt || new Date().toISOString(),
      skipped: false,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const dismissOfflineJumpTut = (skip) => {
    const s = readOfflineJumpTutState();
    localStorage.setItem(OFFLINE_JUMP_TUT_KEY, JSON.stringify({ ...s, skipped: !!skip }));
    setShowOfflineJumpTut(false);
  };
  const [activeTab, setActiveTab] = useState('overview');
  const [settingDate, setSettingDate] = useState(false);
  const [estDate, setEstDate] = useState('');
  const [showClientPreview, setShowClientPreview] = useState(false);
  const [showRequestPaymentModal, setShowRequestPaymentModal] = useState(false);
  const [handoverNotes, setHandoverNotes] = useState('');
  const [meetings, setMeetings] = useState([]);
  const [meetingForm, setMeetingForm] = useState({ title: '', scheduledAt: '', durationMinutes: 30, notes: '' });
  const [savingMeeting, setSavingMeeting] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showTabMore, setShowTabMore] = useState(false);
  const [activeCallMeeting, setActiveCallMeeting] = useState(null);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const [handoverIssuing, setHandoverIssuing] = useState(false);
  const [renderingFeeInput, setRenderingFeeInput] = useState('');
  const [savingRenderingFee, setSavingRenderingFee] = useState(false);

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

  // Load meetings for selected project
  useEffect(() => {
    if (!selected?.id) { setMeetings([]); return; }
    const q = query(collection(db, 'projects', selected.id, 'meetings'), orderBy('scheduledAt', 'desc'));
    const unsub = onSnapshot(q, snap => setMeetings(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return unsub;
  }, [selected?.id]);

  // Unread message count for PM (messages from client not yet read by admin)
  useEffect(() => {
    if (!client?.id) { setUnreadMsgCount(0); return; }
    const unsub = onSnapshot(collection(db, 'clients', client.id, 'messages'), snap => {
      const count = snap.docs.filter(d => {
        const m = d.data();
        return !m.isInternal && m.senderRole !== 'admin' && !m.readByAdmin;
      }).length;
      setUnreadMsgCount(count);
    });
    return unsub;
  }, [client?.id]);

  // Incoming call listener — fires when client initiates a call
  const [incomingCall, setIncomingCall] = useState(null);
  useEffect(() => {
    if (!selected?.id) { setIncomingCall(null); return; }
    const q = query(collection(db, 'projects', selected.id, 'meetings'), where('status', '==', 'live'));
    const unsub = onSnapshot(q, snap => {
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      const call = snap.docs.map(d => ({ id: d.id, ...d.data() })).find(m => {
        const created = m.createdAt?.toDate ? m.createdAt.toDate() : new Date(m.createdAt || 0);
        // Only surface calls NOT created by this admin (i.e. client-initiated)
        return created > twoMinutesAgo && m.createdBy !== props.user?.uid;
      });
      if (call && !activeCallMeeting) setIncomingCall(c => c ? c : call);
      else if (!call) setIncomingCall(null);
    });
    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

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

  const selectedWorkflowProgress = selected
    ? workflowProgress(selected, {
        invoices: props.invoices || [],
        renderingPackages: props.renderingPackages || [],
      })
    : null;
  const effectiveStageId = Math.max(
    Number(selected?.stageId || 1),
    Number(selectedWorkflowProgress?.meta?.stageId || 1)
  );
  const actualStageObj = applicableStages.find(s => s.id === selected?.stageId);
  const currentStageObj = applicableStages.find(s => s.id === effectiveStageId);
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
  const PRIMARY_TABS = [
    { id: 'overview',   label: 'Overview',  icon: <Briefcase size={14} /> },
    { id: 'financials', label: 'Payments',  icon: <DollarSign size={14} /> },
    { id: 'renderings', label: 'Designs',   icon: <PenTool size={14} /> },
    { id: 'messages',   label: 'Messages',  icon: <MessageSquare size={14} /> },
    { id: 'timeline',   label: 'Timeline',  icon: <Calendar size={14} /> },
  ];
  const MORE_TABS = [
    { id: 'spec',      label: 'Project Brief', icon: <FileText size={14} /> },
    { id: 'shipping',  label: 'Shipping',      icon: <Truck size={14} /> },
    { id: 'vault',     label: 'Vault',         icon: <ShieldCheck size={14} /> },
    { id: 'uploads',   label: 'Uploads',       icon: <Camera size={14} /> },
    { id: 'team',      label: 'Team',          icon: <Users size={14} /> },
  ];
  const TABS = [...PRIMARY_TABS, ...MORE_TABS];
  const workflowGuidance = selected
    ? getProjectWorkflowGuidance(selected, props.invoices || [], props.approvals || [], props.renderingPackages || [], props.addOns || [], props.changeRequests || [])
    : null;
  const selectedWorkflowSteps = selected ? applicableWorkflowSteps(selected) : [];
  const selectedWorkflowPercent = selectedWorkflowProgress
    ? (selectedWorkflowProgress.index >= selectedWorkflowSteps.length - 1
        ? 100
        : Math.round((selectedWorkflowProgress.index / (selectedWorkflowSteps.length - 1)) * 100))
    : 0;

  if (!client) return (
    <div style={{ padding: 60, textAlign: 'center' }}>
      <AlertCircle size={40} color="var(--text-secondary)" style={{ marginBottom: 12 }} />
      <div style={{ fontSize: 18, fontWeight: 800, color: `var(--accent-secondary)` }}>Client not found</div>
      <button onClick={onBack} style={{ marginTop: 20, padding: '10px 24px', borderRadius: 12, background: `var(--accent-secondary)`, color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Go Back</button>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', overflow: 'hidden' }}>

      {showOfflineJumpTut && (
        <div style={{ flexShrink: 0, marginBottom: 12, padding: '14px 16px', borderRadius: 14, background: '#EFF6FF', border: '1.5px solid #BFDBFE', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <FastForward size={18} color="#2563EB" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#1E3A8A', marginBottom: 3 }}>New: Fast-Forward projects that already progressed offline</div>
            <div style={{ fontSize: 12, color: '#1D4ED8', lineHeight: 1.5 }}>
              If a client already paid a deposit, signed a contract, or reached a later stage before you added them here, you can now set that directly — look for "Starting Stage" when creating a project, or the "Fast-Forward" button on an existing one. Westline will mark the earlier stages complete and record matching paid invoices automatically.
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
            <button onClick={() => dismissOfflineJumpTut(false)} style={{ background: 'none', border: 'none', color: '#1D4ED8', cursor: 'pointer', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>Got it</button>
            <button onClick={() => dismissOfflineJumpTut(true)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: 10, whiteSpace: 'nowrap' }}>Don't show again</button>
          </div>
        </div>
      )}
      {showOfflineJumpHelp && (
        <div className="overlay-modal" onClick={() => setShowOfflineJumpHelp(false)} style={{ zIndex: 10600 }}>
          <div className="modal-box lxf" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <h3 className="lxfh" style={{ fontSize: 15, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FastForward size={16} color="#2563EB" /> Fast-Forward Stage — how it works
              </h3>
              <button onClick={() => setShowOfflineJumpHelp(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={18} /></button>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              Use this when a client already progressed through some stages offline — e.g. rendering approved, deposit paid, contract signed — before their project was fully tracked here. Pick the stage they've actually reached; Westline marks everything before it as done and creates matching paid invoice/transaction records so financials stay accurate. It only moves projects forward, and every use is logged in the project's activity log.
            </p>
          </div>
        </div>
      )}

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

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 2, paddingBottom: 6 }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.1em' }}>Projects</div>
          </div>

          {projects.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
              <select
                value={projectSortMode}
                onChange={e => setProjectSortMode(e.target.value)}
                style={{ width: '100%', fontSize: 11, fontWeight: 700, padding: '7px 8px', borderRadius: 9, border: '1px solid var(--border-color)', background: '#fff', color: 'var(--accent-secondary)', cursor: 'pointer' }}
              >
                <option value="newest">Sort: Newest First</option>
                <option value="oldest">Sort: Oldest First</option>
                <option value="action">Sort: Needs Action First</option>
              </select>
              <select
                value={projectFilterMode}
                onChange={e => setProjectFilterMode(e.target.value)}
                style={{ width: '100%', fontSize: 11, fontWeight: 700, padding: '7px 8px', borderRadius: 9, border: '1px solid var(--border-color)', background: '#fff', color: 'var(--accent-secondary)', cursor: 'pointer' }}
              >
                <option value="all">Show: All Projects</option>
                <option value="active">Show: Active Only</option>
                <option value="completed">Show: Completed Only</option>
              </select>
            </div>
          )}

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
            const projectAddedMs = (p) => {
              const raw = p.createdAt;
              if (!raw) return 0;
              const d = raw?.toDate ? raw.toDate() : new Date(raw);
              return isNaN(d.getTime()) ? 0 : d.getTime();
            };
            const hasUnpaidInvoice = (p) => (props.invoices || []).some(i => i.projectId === p.id && ['Sent', 'Overdue'].includes(i.status));

            const filteredProjects = projects.filter(p => {
              if (projectFilterMode === 'active') return p.status !== 'Completed';
              if (projectFilterMode === 'completed') return p.status === 'Completed';
              return true;
            });

            const sortedProjects = [...filteredProjects].sort((a, b) => {
              if (projectSortMode === 'action') {
                const aHasUnpaid = hasUnpaidInvoice(a);
                const bHasUnpaid = hasUnpaidInvoice(b);
                if (aHasUnpaid !== bHasUnpaid) return aHasUnpaid ? -1 : 1;
                return projectAddedMs(b) - projectAddedMs(a);
              }
              if (projectSortMode === 'oldest') return projectAddedMs(a) - projectAddedMs(b);
              // 'newest' (default) — the most recently added project is always pinned to the top.
              return projectAddedMs(b) - projectAddedMs(a);
            });

            return sortedProjects.map(p => {
              const stg = CLIENT_PROJECT_STAGES.find(s => s.id === p.stageId);
              const isActive = p.id === selectedId;
              const hasAction = hasUnpaidInvoice(p);
              const addedMs = projectAddedMs(p);
              const budgetVal = Number(p.budget || p.projectTotal || 0);

              return (
                <button key={p.id} onClick={() => { setSelectedId(p.id); setActiveTab('overview'); }}
                  style={{ width: '100%', textAlign: 'left', padding: '14px 16px', borderRadius: 14, border: `1.5px solid ${isActive ? ac : hasAction ? '#FCA5A5' : 'transparent'}`, background: isActive ? `${ac}10` : hasAction ? '#FEF2F2' : `var(--bg-secondary)`, cursor: 'pointer', transition: 'all .2s', position: 'relative', overflow: 'hidden' }}>

                  {hasAction && <div style={{ position: 'absolute', top: 14, right: 14, width: 8, height: 8, borderRadius: '50%', background: '#EF4444', boxShadow: '0 0 8px rgba(239,68,68,0.6)' }} />}

                  <div style={{ fontSize: 13, fontWeight: 800, color: hasAction ? '#991B1B' : `var(--accent-secondary)`, marginBottom: 4, paddingRight: 16 }}>{p.project || p.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 9, fontWeight: 800, color: stg?.color || `var(--text-secondary)`, background: `${stg?.color || `var(--text-secondary)`}18`, padding: '3px 8px', borderRadius: 20 }}>{stg?.short || 'Stage 1'}</span>
                    <span style={{ fontSize: 9, color: hasAction ? '#B91C1C' : `var(--text-secondary)` }}>{p.status === 'Completed' ? '✓ Done' : hasAction ? 'Action Required' : 'Active'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 9, color: hasAction ? '#B91C1C' : 'var(--text-secondary)' }}>
                    <span>{addedMs ? `Added ${new Date(addedMs).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Date unknown'}</span>
                    {budgetVal > 0 && <span>· GH₵{budgetVal.toLocaleString()}</span>}
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
                        {selectedWorkflowPercent}% complete
                      </div>
                      <button onClick={async () => {
                        const now2 = new Date();
                        const mtgRef = doc(collection(db, 'projects', selected.id, 'meetings'));
                        await setDoc(mtgRef, {
                          title: 'Instant Video Call', scheduledAt: now2, durationMinutes: 60,
                          notes: '', status: 'live', channelName: `meeting_${mtgRef.id}`,
                          createdBy: props.user?.uid || 'admin', createdAt: serverTimestamp(),
                          projectId: selected.id, clientId: selected.clientId,
                        });
                        await addDoc(collection(db, 'clients', selected.clientId, 'messages'), {
                          text: '📞 Your project manager is calling — open your portal to join the video call.',
                          senderRole: 'admin', senderId: props.user?.uid || 'admin',
                          senderName: props.user?.name || 'Project Manager',
                          isInternal: false, createdAt: serverTimestamp(),
                          projectId: selected.id, projectTitle: selected.project || selected.title || '',
                          readByAdmin: true, readByClient: false,
                        });
                        await addDoc(collection(db, 'notifications'), {
                          userId: selected.clientId, title: 'Incoming Video Call',
                          message: 'Your project manager is calling. Open your portal to answer.',
                          type: 'incoming_call', read: false, createdAt: serverTimestamp(),
                          clientId: selected.clientId, projectId: selected.id,
                        });
                        setActiveCallMeeting({ id: mtgRef.id, title: 'Instant Video Call', channelName: `meeting_${mtgRef.id}`, status: 'live' });
                      }} style={{ height: 34, padding: '0 14px', borderRadius: 10, background: '#22c55e', color: '#fff', border: 'none', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Video size={13} /> Call
                      </button>
                      <button onClick={() => setShowScheduleModal(true)} style={{ height: 34, padding: '0 14px', borderRadius: 10, background: ac, color: '#fff', border: 'none', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Calendar size={13} /> Schedule
                      </button>
                      {nextStage && (
                        <button onClick={() => setShowAdvanceModal(true)}
                          style={{ height: 34, padding: '0 14px', borderRadius: 10, background: currentStageObj?.color || ac, color: '#fff', border: 'none', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                          Advance <ChevronRight size={13} />
                        </button>
                      )}
                      {!nextStage && <div style={{ fontSize: 11, fontWeight: 800, color: '#16A34A', background: '#F0FDF4', padding: '5px 12px', borderRadius: 20 }}>✓ All Done</div>}
                      {(selected.stageId || 1) < 8 && (
                        <button onClick={() => setShowStageJumpModal(true)} title="Client already reached a later stage offline — set it directly"
                          style={{ height: 34, padding: '0 12px', borderRadius: 10, background: '#fff', color: '#2563EB', border: '1.5px solid #BFDBFE', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <FastForward size={13} /> Fast-Forward
                        </button>
                      )}
                      <button onClick={() => setShowOfflineJumpHelp(true)} title="What does Fast-Forward do?"
                        style={{ width: 34, height: 34, borderRadius: 10, background: 'none', color: 'var(--text-secondary)', border: '1.5px solid var(--border-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <HelpCircle size={14} />
                      </button>
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
                  <div style={{ height: '100%', width: `${selectedWorkflowPercent}%`, background: currentStageObj?.color || ac, borderRadius: 3, transition: 'width 1s ease' }} />
                </div>
              </div>

              {/* Tab Bar */}
              <div style={{ position: 'sticky', top: -16, zIndex: 10, display: 'flex', gap: 4, flexShrink: 0, background: 'rgba(250, 250, 249, 0.95)', backdropFilter: 'blur(12px)', padding: 6, borderRadius: 14, border: '1px solid var(--border-color)', margin: '0 -4px 14px -4px' }}>
                {PRIMARY_TABS.map(tab => (
                  <button key={tab.id} onClick={() => { setActiveTab(tab.id); setShowTabMore(false); }}
                    style={{ flex: 1, height: 34, borderRadius: 10, background: activeTab === tab.id ? '#fff' : 'transparent', color: activeTab === tab.id ? `var(--accent-secondary)` : `var(--text-secondary)`, border: activeTab === tab.id ? '1px solid var(--border-color)' : '1px solid transparent', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, transition: 'all .18s', boxShadow: activeTab === tab.id ? '0 1px 4px rgba(0,0,0,.07)' : 'none', padding: '0 10px', whiteSpace: 'nowrap', minWidth: 0 }}>
                    {tab.icon}{tab.label}
                    {tab.id === 'messages' && unreadMsgCount > 0 && (
                      <span style={{ background: '#EF4444', color: '#fff', fontSize: 9, fontWeight: 800, height: 16, minWidth: 16, borderRadius: 8, padding: '0 3px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {unreadMsgCount > 9 ? '9+' : unreadMsgCount}
                      </span>
                    )}
                  </button>
                ))}
                {/* More dropdown */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <button onClick={() => setShowTabMore(v => !v)}
                    style={{ height: 34, padding: '0 12px', borderRadius: 10, background: MORE_TABS.some(t => t.id === activeTab) ? '#fff' : 'transparent', color: MORE_TABS.some(t => t.id === activeTab) ? `var(--accent-secondary)` : `var(--text-secondary)`, border: MORE_TABS.some(t => t.id === activeTab) ? '1px solid var(--border-color)' : '1px solid transparent', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                    {MORE_TABS.find(t => t.id === activeTab)?.label || 'More'} <ChevronRight size={12} style={{ transform: showTabMore ? 'rotate(90deg)' : 'none', transition: 'transform .18s' }} />
                  </button>
                  {showTabMore && (
                    <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: '#fff', border: '1px solid var(--border-color)', borderRadius: 14, padding: 6, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 100, minWidth: 160 }}>
                      {MORE_TABS.map(tab => (
                        <button key={tab.id} onClick={() => { setActiveTab(tab.id); setShowTabMore(false); }}
                          style={{ width: '100%', height: 36, borderRadius: 9, background: activeTab === tab.id ? `var(--bg-secondary)` : 'transparent', color: activeTab === tab.id ? `var(--accent-secondary)` : `var(--text-secondary)`, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', textAlign: 'left' }}>
                          {tab.icon}{tab.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Tab Content */}
              <div key={selected.id} style={{ flex: 1, overflowY: 'auto', paddingRight: 2 }}>

                {/* DESIGN VAULT (RENDERINGS) */}
                {activeTab === 'renderings' && (
                  <AdminRenderingManager
                    project={selected}
                    brand={brand}
                    renderingPackages={props.renderingPackages}
                    invoices={props.invoices}
                    changeRequests={props.changeRequests}
                    notify={props.notify}
                  />
                )}

                {/* SPEC & BRIEF */}
                {activeTab === 'spec' && (
                  <SpecBriefManager project={selected} updateProject={props.updateProject} addProjectDocument={props.addProjectDocument} notify={props.notify} brand={brand} />
                )}

                {/* OVERVIEW */}
                {activeTab === 'overview' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {workflowGuidance && (
                      <div style={{ padding: 16, borderRadius: 16, background: workflowGuidance.paymentInvoice ? '#EFF6FF' : '#FFFBEB', border: `1.5px solid ${workflowGuidance.paymentInvoice ? '#93C5FD' : '#FDE68A'}` }}>
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
                    <AdminSiteVisitCard project={selected} notify={props.notify} />

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
                      const renderingApproved = selected.renderingApproved === true ||
                        selected.designApproved === true ||
                        projectPackages.some(pkg => String(pkg.status || '').toLowerCase() === 'approved');
                      const needsContractSign = selected.quoteApproved === true && !selected.contractAccepted;
                      const lockedRendering = projectPackages.find(pkg => {
                        const linkedInv = projectInvoices.find(i => i.id === pkg.linkedInvoiceId);
                        return linkedInv && !isPaid(linkedInv.status) && !pkg.unlocked;
                      });
                      const reviewRendering = projectPackages.find(pkg => {
                        const linkedInv = projectInvoices.find(i => i.id === pkg.linkedInvoiceId);
                        return (pkg.unlocked || isPaid(linkedInv?.status)) && pkg.status !== 'Approved';
                      });
                      const quoteRecords = projectInvoices
                        .filter(i => ['Quotation', 'quote', 'quotation'].includes(i.type || i.documentKind))
                        .sort((a, b) => Number(b.version || 0) - Number(a.version || 0));
                      const pendingQuote = quoteRecords.find(quote => quote.id === selected.activeQuoteId) ||
                        quoteRecords.find(quote => !['approved', 'superseded', 'cancelled'].includes(String(quote.status || '').toLowerCase()));
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
                      } else if (selected.changeRequestPending) {
                        clientSeeing = '🔄 Rendering Revision Requested';
                        clientAction = 'Waiting for the design team to upload the revised 3D rendering';
                        clientWaitingOn = 'Design Team';
                        urgency = '#D97706';
                      } else if (reviewRendering) {
                        clientSeeing = '🎨 Review Rendering Package';
                        clientAction = 'Review, leave pins, approve or request changes';
                        clientWaitingOn = 'Client';
                        urgency = AC;
                      } else if (pendingQuote && String(pendingQuote.status || '').toLowerCase() === 'changes requested') {
                        clientSeeing = '🔄 Quotation Revision Requested';
                        clientAction = 'Waiting for the project manager to issue the next quotation version';
                        clientWaitingOn = 'Project Manager';
                        urgency = '#D97706';
                      } else if (pendingQuote) {
                        clientSeeing = '💰 Quotation Awaiting Decision';
                        clientAction = `Approve or request changes: ${pendingQuote.title || pendingQuote.id}`;
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
                        clientSeeing = `✅ Stage ${effectiveStageId}: ${currentStageObj?.name || 'In Progress'}`;
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
                        { label: 'Team', value: `${new Set([...(selected.assignedWorkers || []), ...(selected.assignedStaff || []), ...(selected.projectManagerIds || []), ...(selected.projectManagerId ? [selected.projectManagerId] : [])]).size} assigned`, icon: '👥' },
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
                              Client pays the fee, schedules the site visit, reviews the rendering, then negotiates the quotation before contract signing
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
                                props.notify?.('success', 'Rendering fee recorded as paid. Schedule the technical site visit before preparing the 3D rendering.');
                              }}
                              style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #BBF7D0', background: '#F0FDF4', color: '#15803D', fontSize: 12, fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-start' }}
                            >
                              ✅ Mark Rendering Fee Paid (Offline)
                            </button>
                          );
                        })()}

                        {/* Set / edit rendering fee — projects created with the fee left blank
                            had no way to add it afterward; unpaid fees can also be corrected here. */}
                        {selected.kickoffMode === 'rendering-first' && !selected.renderingFeePaid && (() => {
                          const renderingInv = (props.invoices || []).find(i =>
                            (i.projectId === selected.id || i.parentId === selected.id) &&
                            (i.id === selected.renderingFeeInvoiceId || ['rendering','design','rendering fee','renderingfee','rendering_fee'].includes((i.type || '').toLowerCase()))
                          );
                          const invIsPaid = ['paid', 'paid in full'].includes(String(renderingInv?.status || '').toLowerCase());
                          if (invIsPaid) return null;
                          const currentFee = parseFloat(String(selected.renderingFee || '').replace(/[^0-9.]/g, '')) || 0;
                          const saveFee = async () => {
                            if (savingRenderingFee) return;
                            const fee = parseFloat(String(renderingFeeInput).replace(/[^0-9.]/g, '')) || 0;
                            if (fee <= 0) { props.notify?.('error', 'Enter a rendering fee amount greater than zero.'); return; }
                            setSavingRenderingFee(true);
                            try {
                              if (renderingInv?.id) {
                                await updateDoc(doc(db, 'invoices', renderingInv.id), { amount: fee, total: fee, updatedAt: serverTimestamp() });
                                await props.updateProject?.(selected.id, {
                                  renderingFee: fee,
                                  ...(selected.renderingFeeInvoiceId ? {} : { renderingFeeInvoiceId: renderingInv.id }),
                                });
                                props.notify?.('success', `Rendering fee updated to GH₵ ${fee.toLocaleString()}. The client's invoice reflects the new amount.`);
                              } else {
                                const invRef = await addDoc(collection(db, 'invoices'), {
                                  parentId: selected.id,
                                  projectId: selected.id,
                                  clientId: selected.clientId,
                                  clientEmail: selected.clientEmail || selected.email || '',
                                  title: 'Design & Rendering Fee',
                                  amount: fee,
                                  date: new Date().toISOString().split('T')[0],
                                  due: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                                  status: 'Pending',
                                  type: 'Design',
                                  autoGenerated: true,
                                  createdAt: serverTimestamp(),
                                });
                                await props.updateProject?.(selected.id, {
                                  renderingFee: fee,
                                  renderingFeeInvoiceId: invRef.id,
                                  nextAction: 'Client pays rendering fee, then schedules the technical site visit',
                                });
                                props.notify?.('success', `Rendering fee set — GH₵ ${fee.toLocaleString()} invoice issued to the client.`);
                              }
                              setRenderingFeeInput('');
                            } catch (e) {
                              props.notify?.('error', 'Failed to save rendering fee: ' + e.message);
                            }
                            setSavingRenderingFee(false);
                          };
                          return (
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>
                                Rendering fee: {currentFee > 0 ? `GH₵ ${currentFee.toLocaleString()}` : 'Not set'}
                              </span>
                              <input
                                type="number"
                                value={renderingFeeInput}
                                onChange={e => setRenderingFeeInput(e.target.value)}
                                placeholder={currentFee > 0 ? 'New amount' : 'e.g. 1500'}
                                style={{ width: 120, height: 36, borderRadius: 10, border: '1px solid var(--border-color)', padding: '0 10px', fontSize: 12, outline: 'none' }}
                              />
                              <button
                                onClick={saveFee}
                                disabled={savingRenderingFee}
                                style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--accent-secondary)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: savingRenderingFee ? 'wait' : 'pointer' }}
                              >
                                {savingRenderingFee ? 'Saving…' : renderingInv ? 'Update Fee & Invoice' : 'Set Fee & Issue Invoice'}
                              </button>
                            </div>
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

                    {/* ── HANDOVER CERTIFICATE ── */}
                    {(selected.stageId === 8 || selected.status === 'Completed') && (() => {
                      const cert = selected.handoverCertificate;
                      if (cert) {
                        return (
                          <div style={{ padding: '20px 24px', background: '#F0FDF4', borderRadius: 14, border: '1.5px solid #BBF7D0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                              <Award size={18} color="#15803D" />
                              <div style={{ fontSize: 13, fontWeight: 800, color: '#15803D' }}>Handover Certificate Issued</div>
                            </div>
                            <div style={{ fontSize: 12, color: '#166534', lineHeight: 1.6, marginBottom: 4 }}>
                              Issued on {cert.issuedAt?.toDate ? cert.issuedAt.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                              {cert.issuedBy ? ` by ${cert.issuedBy}` : ''}
                            </div>
                            {cert.acknowledgedAt && (
                              <div style={{ fontSize: 12, color: '#166534' }}>
                                ✓ Acknowledged by client on {cert.acknowledgedAt.toDate ? cert.acknowledgedAt.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                              </div>
                            )}
                            {!cert.acknowledgedAt && (
                              <div style={{ fontSize: 12, color: '#92400E', marginTop: 4 }}>⏳ Awaiting client acknowledgement</div>
                            )}
                          </div>
                        );
                      }
                      return (
                        <div style={{ padding: '20px 24px', background: '#fff', borderRadius: 14, border: '1.5px solid var(--border-color)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <Award size={18} color={`var(--accent-secondary)`} />
                            <div style={{ fontSize: 13, fontWeight: 800, color: `var(--accent-secondary)` }}>Issue Handover Certificate</div>
                          </div>
                          <div style={{ fontSize: 12, color: `var(--text-secondary)`, marginBottom: 14 }}>
                            Generates a Certificate of Completion visible to the client in their Documents tab. The client will acknowledge receipt.
                          </div>
                          <textarea
                            placeholder="Describe what was delivered — e.g. full aluminium glass partition system, 3 sliding doors, powder-coated frames in matte black, installed and signed off."
                            value={handoverNotes}
                            onChange={e => setHandoverNotes(e.target.value)}
                            rows={3}
                            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontSize: 12, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', outline: 'none', color: `var(--accent-secondary)` }}
                          />
                          <button
                            disabled={!handoverNotes.trim() || handoverIssuing}
                            onClick={async () => {
                              if (!handoverNotes.trim() || handoverIssuing) return;
                              setHandoverIssuing(true);
                              try {
                                const certData = {
                                  issuedAt: serverTimestamp(),
                                  issuedBy: props.user?.displayName || props.user?.email || 'Project Manager',
                                  issuedByUid: props.user?.uid || null,
                                  deliveryNotes: handoverNotes.trim(),
                                  status: 'issued',
                                };
                                await Promise.all([
                                  updateDoc(doc(db, 'projects', selected.id), { handoverCertificate: certData }),
                                  addDoc(collection(db, 'projects', selected.id, 'documents'), {
                                    type: 'handover',
                                    name: 'Certificate of Completion',
                                    clientVisible: true,
                                    projectTitle: selected.title || 'Interior Design Project',
                                    clientName: client?.name || client?.displayName || '',
                                    projectType: PROJECT_TYPES[selected.projectType]?.label || 'Interior Design & Installation',
                                    handoverDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
                                    deliveryNotes: handoverNotes.trim(),
                                    issuedBy: props.user?.displayName || props.user?.email || 'Project Manager',
                                    createdAt: serverTimestamp(),
                                  }),
                                ]);
                                setHandoverNotes('');
                              } catch (e) {
                                console.error(e);
                              } finally {
                                setHandoverIssuing(false);
                              }
                            }}
                            style={{
                              marginTop: 10, padding: '10px 20px', borderRadius: 10,
                              background: !handoverNotes.trim() || handoverIssuing ? '#e5e7eb' : '#15803D',
                              color: !handoverNotes.trim() || handoverIssuing ? '#9CA3AF' : '#fff',
                              fontSize: 12, fontWeight: 800, border: 'none',
                              cursor: !handoverNotes.trim() || handoverIssuing ? 'not-allowed' : 'pointer',
                              display: 'flex', alignItems: 'center', gap: 6,
                            }}
                          >
                            {handoverIssuing ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Issuing…</> : <><Award size={13} /> Issue Certificate</>}
                          </button>
                        </div>
                      );
                    })()}

                  </div>
                )}

                {/* TIMELINE */}
                {activeTab === 'timeline' && (() => {
                  // Use the same value as the overview card so they always agree
                  const totalProjectDays = totalCalendarDays;

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 24 }}>
                      <DetailedWorkflowProgress
                        project={selected}
                        invoices={props.invoices || []}
                        renderingPackages={props.renderingPackages || []}
                      />

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

                      {/* STAGE SCHEDULER & DETAILS LIST */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ padding: '16px 18px', borderRadius: 14, background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' }}>
                          <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 4 }}>Working schedule</div>
                          <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                            Automatic dates are planning estimates. Set a stage start date to confirm it; later stages will resequence from that decision.
                          </div>
                        </div>

                        <div style={{ position: 'relative', paddingLeft: 44 }}>
                          <div style={{ position: 'absolute', left: 16, top: 12, bottom: 12, width: 2, background: `var(--border-color)`, zIndex: 0 }} />

                          {applicableStages.map((s, idx) => {
                            const isCurrent = s.id === selected.stageId;
                            const isPast = (selected.stageId || 1) > s.id;
                            const stageInfo = computedTimeline[s.id] || {};
                            const previousStage = applicableStages[idx - 1];
                            const previousEnd = previousStage ? computedTimeline[previousStage.id]?.endDate : null;
                            const earliestStartDate = previousEnd
                              ? new Date(new Date(`${previousEnd}T00:00:00`).getTime() + 86400000).toISOString().slice(0, 10)
                              : null;

                            return (
                              <React.Fragment key={s.id}>
                                <StageSchedulerRow
                                  s={s}
                                  idx={idx}
                                  stageInfo={stageInfo}
                                  earliestStartDate={earliestStartDate}
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
                    <QuoteNegotiationCard
                      project={selected}
                      invoices={props.invoices}
                      changeRequests={props.changeRequests}
                      createQuoteVersion={props.createQuoteVersion}
                      notify={props.notify}
                    />
                    <PaymentScheduleCard project={selected} notify={props.notify} brand={brand} invoices={props.invoices} />
                    <ProjectInvoicesLedger project={selected} client={client} invoices={props.invoices} brand={brand} updateInvoice={props.updateInvoice} deleteInvoice={props.deleteInvoice} notify={props.notify} user={props.user} updateProjectStage={props.updateProjectStage} updateProject={props.updateProject} />
                    <ProjectEconomics project={selected} />
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
                    notify={props.notify}
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
                    ...(selected.projectManagerIds || []),
                    ...(selected.projectManagerId ? [selected.projectManagerId] : []),
                  ]);
                  const pmIds = selected.projectManagerIds?.length
                    ? selected.projectManagerIds
                    : (selected.projectManagerId ? [selected.projectManagerId] : []);
                  const assignedList = teamMembers.filter(m => assignedIds.has(m.uid || m.id?.toString()) || assignedIds.has(m.email));
                  const availList    = teamMembers.filter(m => !assignedIds.has(m.uid || m.id?.toString()) && !assignedIds.has(m.email));
                  const MemberCard = ({ m }) => {
                    const assigned = assignedIds.has(m.uid || m.id?.toString()) || assignedIds.has(m.email);
                    const isWorker = m.role === 'worker' || /worker|installer|field|technician|technical team lead/i.test(m.jobRole || '');
                    const isManager = pmIds.includes(m.uid) || pmIds.includes(m.id);
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
                {activeTab === 'messages' && (() => {
                  const now = new Date();
                  const fmtMtg = (ts) => {
                    if (!ts) return '';
                    const d = ts.toDate ? ts.toDate() : new Date(ts);
                    return d.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                  };
                  const upcomingMtgs = meetings.filter(m => {
                    if (m.status === 'cancelled' || m.status === 'completed') return false;
                    const d = m.scheduledAt?.toDate ? m.scheduledAt.toDate() : new Date(m.scheduledAt || 0);
                    return d > now;
                  });
                  const pastMtgs = meetings.filter(m => {
                    const d = m.scheduledAt?.toDate ? m.scheduledAt.toDate() : new Date(m.scheduledAt || 0);
                    return m.status === 'completed' || m.status === 'cancelled' || d <= now;
                  });
                  async function scheduleMeeting() {
                    if (!meetingForm.title.trim() || !meetingForm.scheduledAt) return;
                    setSavingMeeting(true);
                    try {
                      const scheduledAt = new Date(meetingForm.scheduledAt);
                      const mtgRef = doc(collection(db, 'projects', selected.id, 'meetings'));
                      await setDoc(mtgRef, {
                        title: meetingForm.title.trim(),
                        scheduledAt,
                        durationMinutes: meetingForm.durationMinutes,
                        notes: meetingForm.notes.trim(),
                        status: 'scheduled',
                        channelName: `meeting_${mtgRef.id}`,
                        createdBy: props.user?.uid || 'admin',
                        createdAt: serverTimestamp(),
                        projectId: selected.id,
                        clientId: selected.clientId,
                      });
                      const dateStr = scheduledAt.toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
                      await addDoc(collection(db, 'clients', selected.clientId, 'messages'), {
                        text: `📅 Video call scheduled: "${meetingForm.title.trim()}" on ${dateStr} (${meetingForm.durationMinutes} min). Open your client portal to join.`,
                        senderRole: 'admin', senderId: props.user?.uid || 'admin',
                        senderName: props.user?.name || 'Project Manager',
                        isInternal: false, createdAt: serverTimestamp(),
                        projectId: selected.id, projectTitle: selected.project || selected.title || '',
                        readByAdmin: true, readByClient: false,
                      });
                      await addDoc(collection(db, 'notifications'), {
                        userId: selected.clientId, title: 'Video Call Scheduled',
                        message: `${meetingForm.title.trim()} — ${dateStr}`,
                        type: 'meeting_scheduled', read: false, createdAt: serverTimestamp(),
                        clientId: selected.clientId, projectId: selected.id,
                      });
                      setMeetingForm({ title: '', scheduledAt: '', durationMinutes: 30, notes: '' });
                      setShowScheduleForm(false);
                    } catch (err) { console.error('Schedule meeting error:', err); }
                    setSavingMeeting(false);
                  }

                  const statusBadge = (s) => {
                    const map = { scheduled: ['#DBEAFE','#1D4ED8','Scheduled'], live: ['#DCFCE7','#15803D','Live'], completed: ['#F0FDF4','#166534','Done'], cancelled: ['#FEF2F2','#991B1B','Cancelled'] };
                    const [bg, color, label] = map[s] || ['#F3F4F6','#374151', s];
                    return <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 20, background: bg, color }}>{label}</span>;
                  };

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {upcomingMtgs.length > 0 && (
                        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--border-color)', padding: '14px 18px' }}>
                          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                            <Video size={13} /> Upcoming Calls
                            <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 20, background: '#DBEAFE', color: '#1D4ED8' }}>{upcomingMtgs.length}</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {upcomingMtgs.map(mtg => (
                              <div key={mtg.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 11, border: '1px solid var(--border-color)', background: '#FAFAFA' }}>
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-secondary)' }}>{mtg.title}</span>
                                    {statusBadge(mtg.status)}
                                  </div>
                                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 3 }}><Calendar size={10} />{fmtMtg(mtg.scheduledAt)}</span>
                                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={10} />{mtg.durationMinutes} min</span>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button onClick={() => setActiveCallMeeting(mtg)} style={{ height: 32, padding: '0 12px', borderRadius: 9, background: ac, color: '#fff', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <Video size={12} /> Start
                                  </button>
                                  <button onClick={() => { if (window.confirm(`Cancel "${mtg.title}"?`)) updateDoc(doc(db, 'projects', selected.id, 'meetings', mtg.id), { status: 'cancelled' }); }} style={{ height: 32, width: 32, borderRadius: 9, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <X size={13} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Chat */}
                      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--border-color)', overflow: 'hidden', height: 550, display: 'flex', flexDirection: 'column' }}>
                        <WorldClassChat
                          clientId={selected.clientId}
                          user={props.user}
                          isAdmin={true}
                          accentColor={brand.color || 'var(--accent-secondary)'}
                          projects={projects.filter(w => w.clientId === selected.clientId)}
                          viewerLanguage={props.lang || 'en'}
                        />
                      </div>
                    </div>
                  );
                })()}
              </div>
            </>
          )}
        </div>
      </div>

      {showNewModal && (
        <NewProjectModal client={client} teamMembers={teamMembers} onClose={() => setShowNewModal(false)} onCreate={props.createClientProject} />
      )}
      {showAdvanceModal && selected && nextStage && (
        <AdvanceModal project={selected} stage={actualStageObj} nextStage={nextStage} invoices={props.invoices || []} onClose={() => setShowAdvanceModal(false)} onAdvance={props.updateProjectStage} />
      )}
      {showStageJumpModal && selected && (
        <StageJumpModal project={selected} onClose={() => setShowStageJumpModal(false)} onJump={props.applyOfflineStageJump} />
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
          projects={projects}
          brand={brand}
          onClose={() => setShowClientPreview(false)}
        />
      )}
      {showScheduleModal && selected && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={e => { if (e.target === e.currentTarget) setShowScheduleModal(false); }}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}><Calendar size={16} /> Schedule Video Call</div>
              <button onClick={() => setShowScheduleModal(false)} style={{ width: 32, height: 32, borderRadius: 9, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={15} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>TITLE</label>
                <input value={meetingForm.title} onChange={e => setMeetingForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Project Review, Design Walkthrough" style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-color)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>DATE & TIME</label>
                  <input type="datetime-local" value={meetingForm.scheduledAt} onChange={e => setMeetingForm(f => ({ ...f, scheduledAt: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-color)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>DURATION</label>
                  <select value={meetingForm.durationMinutes} onChange={e => setMeetingForm(f => ({ ...f, durationMinutes: Number(e.target.value) }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-color)', fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>60 min</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>NOTES (optional)</label>
                <textarea value={meetingForm.notes} onChange={e => setMeetingForm(f => ({ ...f, notes: e.target.value }))} placeholder="Topics to cover..." rows={3} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-color)', fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
              </div>
              <button onClick={async () => {
                if (!meetingForm.title.trim() || !meetingForm.scheduledAt) return;
                setSavingMeeting(true);
                try {
                  const scheduledAt = new Date(meetingForm.scheduledAt);
                  const mtgRef = doc(collection(db, 'projects', selected.id, 'meetings'));
                  await setDoc(mtgRef, {
                    title: meetingForm.title.trim(), scheduledAt, durationMinutes: meetingForm.durationMinutes,
                    notes: meetingForm.notes.trim(), status: 'scheduled', channelName: `meeting_${mtgRef.id}`,
                    createdBy: props.user?.uid || 'admin', createdAt: serverTimestamp(),
                    projectId: selected.id, clientId: selected.clientId,
                  });
                  const dateStr = scheduledAt.toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
                  await addDoc(collection(db, 'clients', selected.clientId, 'messages'), {
                    text: `📅 Video call scheduled: "${meetingForm.title.trim()}" on ${dateStr} (${meetingForm.durationMinutes} min). Open your client portal to join.`,
                    senderRole: 'admin', senderId: props.user?.uid || 'admin', senderName: props.user?.name || 'Project Manager',
                    isInternal: false, createdAt: serverTimestamp(), projectId: selected.id,
                    projectTitle: selected.project || selected.title || '', readByAdmin: true, readByClient: false,
                  });
                  await addDoc(collection(db, 'notifications'), {
                    userId: selected.clientId, title: 'Video Call Scheduled',
                    message: `${meetingForm.title.trim()} — ${dateStr}`, type: 'meeting_scheduled',
                    read: false, createdAt: serverTimestamp(), clientId: selected.clientId, projectId: selected.id,
                  });
                  setMeetingForm({ title: '', scheduledAt: '', durationMinutes: 30, notes: '' });
                  setShowScheduleModal(false);
                } catch (err) { console.error('Schedule meeting error:', err); }
                setSavingMeeting(false);
              }} disabled={savingMeeting || !meetingForm.title.trim() || !meetingForm.scheduledAt}
                style={{ height: 42, borderRadius: 11, background: ac, color: '#fff', border: 'none', fontSize: 13, fontWeight: 800, cursor: 'pointer', opacity: (!meetingForm.title.trim() || !meetingForm.scheduledAt) ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {savingMeeting ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Calendar size={15} />}
                Schedule & Notify Client
              </button>
            </div>
          </div>
        </div>
      )}

      {incomingCall && !activeCallMeeting && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99998, display: 'flex', justifyContent: 'center', padding: '16px 20px' }}>
          <div style={{ background: '#111', border: '1.5px solid rgba(255,255,255,0.12)', borderRadius: 18, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', animation: 'ringPulse 1.4s ease-in-out infinite', maxWidth: 420, width: '100%' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #22c55e, #16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>Incoming Video Call</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{incomingCall.title || 'Client is calling…'}</div>
            </div>
            <button onClick={() => { setActiveCallMeeting(incomingCall); setIncomingCall(null); }} style={{ height: 36, padding: '0 16px', borderRadius: 10, background: '#22c55e', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>Answer</button>
            <button onClick={() => setIncomingCall(null)} style={{ height: 36, padding: '0 14px', borderRadius: 10, background: 'rgba(255,255,255,0.08)', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>Dismiss</button>
          </div>
          <style>{`@keyframes ringPulse { 0%,100%{box-shadow:0 8px 32px rgba(0,0,0,0.5),0 0 0 0 rgba(34,197,94,0.4)} 50%{box-shadow:0 8px 32px rgba(0,0,0,0.5),0 0 0 10px rgba(34,197,94,0)} }`}</style>
        </div>
      )}
      {activeCallMeeting && (
        <VideoCallModal
          meeting={activeCallMeeting}
          user={props.user}
          brand={brand}
          onClose={() => setActiveCallMeeting(null)}
        />
      )}
    </div>
  );
}

// ─── Stage Jump Modal — backfill a project to a later stage when the client already ──
// progressed offline before being added, or was under-recorded after creation. Only
// offers stages ahead of the current one; calls the shared applyOfflineStageJump so
// this and the New Project "Starting Stage" picker can never disagree on what a given
// stage implies.
function StageJumpModal({ project, onClose, onJump }) {
  const currentStageId = project.stageId || 1;
  const jumpableStages = CLIENT_PROJECT_STAGES.filter(s => s.id > currentStageId);
  const [targetStageId, setTargetStageId] = useState(jumpableStages[0]?.id || currentStageId + 1);
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  const targetStage = CLIENT_PROJECT_STAGES.find(s => s.id === targetStageId);
  const skippedStages = CLIENT_PROJECT_STAGES.filter(s => s.id > currentStageId && s.id <= targetStageId);

  const handleConfirm = async () => {
    setSaving(true);
    await onJump?.(project.id, targetStageId, note.trim());
    setSaving(false);
    onClose();
  };

  return createPortal(
    <div className="overlay-modal" onClick={onClose} style={{ zIndex: 10500 }}>
      <div className="modal-box lxf" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <h3 className="lxfh" style={{ fontSize: 17, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FastForward size={17} color="#2563EB" /> Fast-Forward Stage
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
        </div>

        {!confirming ? (
          <>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
              Use this when the client already reached a later stage offline — e.g. deposit already paid, contract already signed — before this was fully tracked in the system.
            </p>
            <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 8 }}>Set stage to</label>
            <select
              value={targetStageId}
              onChange={e => setTargetStageId(Number(e.target.value))}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontSize: 13, outline: 'none', fontFamily: 'inherit', marginBottom: 12, boxSizing: 'border-box' }}
            >
              {jumpableStages.map(s => <option key={s.id} value={s.id}>{s.id}. {s.name}</option>)}
            </select>
            <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 8 }}>Note (kept for the record)</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Client paid deposit via bank transfer before onboarding — confirmed on WhatsApp."
              rows={2}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontSize: 13, outline: 'none', fontFamily: 'inherit', resize: 'vertical', marginBottom: 16, boxSizing: 'border-box' }}
            />
            <button
              disabled={!jumpableStages.length}
              onClick={() => setConfirming(true)}
              className="p-btn-dark lxf"
              style={{ width: '100%', padding: 12, opacity: jumpableStages.length ? 1 : 0.5 }}
            >
              Continue
            </button>
          </>
        ) : (
          <>
            <div style={{ padding: 14, borderRadius: 12, background: '#FFFBEB', border: '1.5px solid #FDE68A', marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#92400E', marginBottom: 8 }}>This will mark the following as complete:</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#92400E', lineHeight: 1.7 }}>
                {skippedStages.map(s => <li key={s.id}>{s.name}</li>)}
              </ul>
              <div style={{ fontSize: 11, color: '#92400E', marginTop: 8 }}>Any deposit, rendering fee, or goods-balance payment implied by reaching <strong>{targetStage?.name}</strong> will be recorded as paid. This can't be automatically undone — reversing it means manually editing the project.</div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirming(false)} className="p-btn-light" style={{ flex: 1, padding: 12 }}>Back</button>
              <button disabled={saving} onClick={handleConfirm} className="p-btn-dark lxf" style={{ flex: 1, padding: 12, opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Applying…' : 'Confirm & Apply'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

// ─── Client Preview Modal — the REAL client portal, read-only, in a device frame ─
// Loads the live ClientPortal (via the /portal-preview route) inside an iframe so
// the PM sees byte-for-byte what the client sees. Phone frame by default since most
// clients are on mobile; a Desktop toggle is available. All actions are blocked
// inside the portal itself (previewMode) — the iframe cannot mutate anything.
function ClientPreviewModal({ project, client, projects = [], brand, onClose }) {
  const ac = brand?.color || AC;
  const [device, setDevice] = useState('phone'); // 'phone' | 'desktop'
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(1);

  const clientId = client?.id || project?.clientId || '';
  const previewUrl = `/portal-preview?clientId=${encodeURIComponent(clientId)}&projectId=${encodeURIComponent(project?.id || '')}`;

  // Phone frame is a fixed 390×800 device; scale it down to fit shorter screens.
  const PHONE_W = 390, PHONE_H = 800, BEZEL = 12;
  useEffect(() => {
    if (device !== 'phone') { setScale(1); return; }
    const recompute = () => {
      const availH = window.innerHeight - 150; // header + outer padding
      const availW = window.innerWidth - 60;
      const frameH = PHONE_H + BEZEL * 2;
      const frameW = PHONE_W + BEZEL * 2;
      const s = Math.min(1, availH / frameH, availW / frameW);
      setScale(Math.max(0.45, s));
    };
    recompute();
    window.addEventListener('resize', recompute);
    return () => window.removeEventListener('resize', recompute);
  }, [device]);

  useEffect(() => { setLoading(true); }, [device, refreshKey]);

  const scaledFrameH = device === 'phone' ? (PHONE_H + BEZEL * 2) * scale : undefined;
  const scaledFrameW = device === 'phone' ? (PHONE_W + BEZEL * 2) * scale : undefined;

  const toggleBtn = (val, Icon, label) => (
    <button
      onClick={() => setDevice(val)}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px',
        borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
        background: device === val ? '#fff' : 'transparent',
        color: device === val ? 'var(--accent-secondary)' : 'rgba(255,255,255,0.75)',
      }}
    >
      <Icon size={14} /> {label}
    </button>
  );

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.66)',
      backdropFilter: 'blur(6px)', zIndex: 9999,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '18px 20px 24px',
    }} onClick={onClose}>
      {/* Header bar */}
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 1240, background: 'var(--accent-secondary)', color: '#fff',
        borderRadius: 16, padding: '12px 16px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.3)', flexWrap: 'wrap',
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 800, opacity: 0.65, textTransform: 'uppercase', letterSpacing: '.12em' }}>👁 Read-only client preview</div>
          <div style={{ fontSize: 14, fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{client?.name || 'Client'} · {project?.title || 'Project'}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'rgba(0,0,0,0.22)', borderRadius: 11, padding: 3 }}>
            {toggleBtn('phone', Smartphone, 'Phone')}
            {toggleBtn('desktop', Monitor, 'Desktop')}
          </div>
          <button title="Reload preview" onClick={() => setRefreshKey(k => k + 1)} style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw size={15} />
          </button>
          <a title="Open in a new tab" href={previewUrl} target="_blank" rel="noreferrer" style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ExternalLink size={15} />
          </a>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Device stage */}
      <div onClick={e => e.stopPropagation()} style={{ flex: 1, minHeight: 0, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 18, overflow: 'auto' }}>
        {device === 'phone' ? (
          <div style={{ position: 'relative', width: scaledFrameW, height: scaledFrameH, flexShrink: 0 }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, width: PHONE_W + BEZEL * 2, height: PHONE_H + BEZEL * 2,
              transform: `scale(${scale})`, transformOrigin: 'top left',
              background: '#111', borderRadius: 46, padding: BEZEL,
              boxShadow: '0 24px 70px rgba(0,0,0,0.5)',
            }}>
              {/* Notch */}
              <div style={{ position: 'absolute', top: BEZEL + 6, left: '50%', transform: 'translateX(-50%)', width: 130, height: 22, background: '#111', borderRadius: 14, zIndex: 3 }} />
              <div style={{ position: 'relative', width: PHONE_W, height: PHONE_H, borderRadius: 36, overflow: 'hidden', background: '#EDEAE6' }}>
                {loading && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10, color: 'var(--text-secondary)', zIndex: 2, background: '#EDEAE6' }}>
                    <Loader2 size={26} className="lx-spin" style={{ animation: 'spin 1s linear infinite' }} />
                    <div style={{ fontSize: 12, fontWeight: 700 }}>Loading client view…</div>
                  </div>
                )}
                <iframe
                  key={`phone-${refreshKey}`}
                  title="Client portal preview"
                  src={previewUrl}
                  onLoad={() => setLoading(false)}
                  style={{ width: PHONE_W, height: PHONE_H, border: 'none', background: '#EDEAE6', display: 'block' }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div style={{ width: '100%', maxWidth: 1240, height: '100%', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 70px rgba(0,0,0,0.5)' }}>
            <div style={{ height: 34, background: '#E9E6E1', display: 'flex', alignItems: 'center', gap: 7, padding: '0 14px', flexShrink: 0 }}>
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#FF5F57' }} />
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#FEBC2E' }} />
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#28C840' }} />
              <div style={{ marginLeft: 12, flex: 1, height: 20, background: '#fff', borderRadius: 6, fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', padding: '0 10px' }}>portal.westlinedecor.com</div>
            </div>
            <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
              {loading && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10, color: 'var(--text-secondary)', zIndex: 2, background: '#F8F6F3' }}>
                  <Loader2 size={26} style={{ animation: 'spin 1s linear infinite' }} />
                  <div style={{ fontSize: 12, fontWeight: 700 }}>Loading client view…</div>
                </div>
              )}
              <iframe
                key={`desktop-${refreshKey}`}
                title="Client portal preview"
                src={previewUrl}
                onLoad={() => setLoading(false)}
                style={{ width: '100%', height: '100%', border: 'none', background: '#F8F6F3', display: 'block' }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
