# Westline Future Production Architecture

This document defines the canonical production model for the Westline Future platform. It is intended to guide future implementation work across React, Firebase Auth, Firestore, Storage, Cloud Functions, admin operations, client portal, worker view, payments, messaging, procurement, and logistics.

The core principle is simple: keep client-facing project progress clean and stable, while allowing operational detail to live in separate sub-statuses and subcollections.

## 1. Identity Model

Westline Future should use one canonical identity shape across the product.

### Canonical IDs

- Client ID: normalized phone number without `+`, for example `233241234567`.
- Admin/staff/worker ID: Firebase Auth UID.
- Project ID: generated Firestore document ID or stable project code.
- Auth UID for clients: Firebase Phone Auth UID, used for audit only, not as the primary client ID.

### Why client ID should be phone-based

Clients authenticate by phone. Their business identity is the phone number Westline Future registers for them. Firebase Phone Auth creates a UID, but that UID is not predictable and does not match the existing business record unless explicitly mapped.

Therefore:

- `users/{phoneId}` is the canonical client profile document.
- `users/{uid}` is the canonical staff/admin/worker profile document.
- A client profile may store `authUid` after first OTP login for audit and support.
- Project assignment must use `clientIds`, not Firebase Auth UID.

### Required identity fields

Client user document:

```js
{
  id: "233241234567",
  role: "client",
  name: "Client Name",
  phone: "233241234567",
  phoneE164: "+233241234567",
  email: "client@example.com",
  authUid: "firebase-phone-auth-uid",
  status: "Active",
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
}
```

Staff, worker, or admin user document:

```js
{
  id: "firebase-auth-uid",
  uid: "firebase-auth-uid",
  role: "admin", // admin | staff | worker
  jobRole: "Project Manager",
  name: "Team Member",
  email: "team@westlinefuture.com",
  phone: "233...",
  status: "Active",
  assignedClients: [],
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
}
```

## 2. Client Firebase Phone Auth

Clients should authenticate only with Firebase Phone Auth.

### Recommended login flow

1. Admin creates a client record in `users/{phoneId}`.
2. Client enters their phone number.
3. Firebase Phone Auth sends OTP.
4. Client verifies OTP.
5. App reads `users/{phoneId}`.
6. App stores the Firebase Auth UID in `users/{phoneId}.authUid` if missing or changed.
7. App loads projects where `clientIds` contains `phoneId`.

### Important implementation rule

Do not require `request.auth.uid == clientId` for clients. Firebase Phone Auth UID is not the normalized phone number.

Rules and app logic should treat `request.auth.token.phone_number` as the authenticated phone and match it to `users/{phoneId}` and `projects/{projectId}.clientIds`.

### Phone normalization

Use one phone normalization function everywhere:

- Strip spaces, dashes, brackets, and punctuation.
- Convert Ghana local numbers from `0241234567` to `233241234567`.
- Store `phone` without `+`.
- Store `phoneE164` with `+`.

Do not use multiple competing phone formats for project assignment.

## 3. Firestore User And Project Shape

### Users collection

`users` is the canonical identity registry.

Document IDs:

- Clients: normalized phone ID.
- Admin/staff/worker: Firebase Auth UID.

Recommended client:

```js
users/233241234567
{
  role: "client",
  name: "Ama Mensah",
  phone: "233241234567",
  phoneE164: "+233241234567",
  email: "ama@example.com",
  status: "Active",
  authUid: "phone-auth-uid",
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
}
```

Recommended worker:

```js
users/workerUid123
{
  role: "worker",
  jobRole: "Field Worker",
  name: "Kofi Mensah",
  email: "kofi@westlinefuture.com",
  phone: "233...",
  status: "Active",
  certs: ["height-safety"],
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
}
```

### Projects collection

`projects` is the canonical project collection.

Recommended project:

```js
projects/projectId
{
  title: "Airport Hills Residence",
  projectCode: "WF-2026-001",
  status: "Active", // Active | On Hold | Completed | Cancelled
  stageId: 1,
  projectType: "full-service", // full-service | buy-deliver | install-only | custom

  primaryClientId: "233241234567",
  clientIds: ["233241234567"],

  assignedStaff: ["staffUid123"],
  assignedWorkers: ["workerUid456"],

  budget: 250000,
  currency: "GHS",
  paymentScheduleId: "standard-50-50",
  paymentStatus: "Deposit Pending",

  procurementStatus: "Not Started",
  logisticsStatus: "Not Started",
  installationStatus: "Not Started",
  inspectionStatus: "Not Started",

  stageHistory: [
    {
      stageId: 1,
      note: "Project created",
      by: "adminUid",
      byRole: "admin",
      timestamp: serverTimestamp()
    }
  ],

  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
}
```

### Project subcollections

Use project subcollections for scoped operational records:

- `projects/{projectId}/messages`
- `projects/{projectId}/documents`
- `projects/{projectId}/media`
- `projects/{projectId}/transactions`
- `projects/{projectId}/procurements`
- `projects/{projectId}/work_orders`
- `projects/{projectId}/stage_events`
- `projects/{projectId}/approvals`
- `projects/{projectId}/change_requests`

Top-level collections may still exist for admin dashboards, but project-scoped records should be canonical when they belong to one project.

## 4. Role Model

Westline Future should use four production roles.

### Admin

Full system access.

Admin can:

- Manage users, clients, staff, and workers.
- Create and delete projects.
- Assign clients, staff, and workers.
- Create invoices, quotes, payment schedules, and receipts.
- Manage CMS, public pages, portfolio, products, procurement, logistics, and settings.
- Read/write all operational records.

### Staff

Internal office or management user.

Staff can:

- Access assigned projects and assigned clients.
- Manage day-to-day project operations for assigned work.
- Send client messages.
- Upload documents.
- Update procurement, logistics, and stage notes if permitted.

Staff should not automatically have global access unless Westline Future explicitly wants that operational model.

Recommended production rule: staff reads and writes only assigned projects, unless they have an elevated permission claim.

### Worker

Field-only user with limited access.

Worker can:

- Read projects where `assignedWorkers` contains their Firebase Auth UID.
- Read limited project fields required for field work.
- Upload site photos and field documents.
- Add worker notes/messages.
- Update allowed worker-owned operational sub-statuses.
- Request or confirm worker-owned stage transitions through Cloud Functions.

Worker cannot:

- Read all clients.
- Read financial records unless explicitly field-relevant.
- Create invoices.
- Delete projects.
- Edit client profiles.
- Update arbitrary project fields.
- Change payment status.
- Manage CMS or admin settings.

### Client

Portal user authenticated by phone OTP.

Client can:

- Read their own profile.
- Read projects where `clientIds` contains their normalized phone ID.
- Read client-visible documents, media, messages, payment summaries, stage history, and operational statuses.
- Send project messages.
- Submit change requests.
- Approve quotes, designs, inspections, or handover items when the current stage allows it.
- Pay invoices or payment milestones.

Client cannot:

- Read other clients.
- List all users.
- Read internal-only notes or messages.
- Update project stage directly.
- Write payment verification records directly.

## 5. Worker Permissions

Workers should use a separate `worker` role with limited permissions.

### Recommended worker access pattern

Use both Firestore rules and Cloud Functions:

- Firestore rules allow workers to read assigned projects and create field-scoped records.
- Cloud Functions perform sensitive writes such as stage transitions.

### Worker-readable project fields

Workers need only a subset of project data:

```js
{
  title,
  projectCode,
  address,
  siteContact,
  stageId,
  installationStatus,
  logisticsStatus,
  assignedWorkers,
  scheduledDate,
  workerBrief,
  safetyNotes
}
```

Avoid exposing full financial details, full client registry data, or internal admin notes.

### Worker write actions

Allowed directly by rules:

- Create `projects/{projectId}/media` records with `uploadedBy == request.auth.uid`.
- Create `projects/{projectId}/documents` records with `uploadedBy == request.auth.uid` and `docType == "progress_photo"` or another approved field type.
- Create `projects/{projectId}/messages` with `senderId == request.auth.uid`, `senderRole == "worker"`.

Allowed only through Cloud Functions:

- Advance from Installation to Inspection.
- Mark delivery completed.
- Mark assigned work order completed.
- Submit installation completion evidence.

### Recommended worker Cloud Functions

```txt
workerSubmitProgress
workerCompleteWorkOrder
workerRequestStageAdvance
workerUploadEvidence
```

Each function should verify:

- Auth exists.
- User role is `worker`.
- User is in `project.assignedWorkers`.
- The current project stage allows the requested action.
- The requested next state is valid.
- Required note/photo/evidence fields exist.

## 6. Client Project Assignment Via clientIds

`clientIds` is the canonical access field for client portal visibility.

Use:

```js
clientIds: ["233241234567", "233541111222"]
```

Client query:

```js
query(
  collection(db, "projects"),
  where("clientIds", "array-contains", clientPhoneId)
)
```

This supports:

- Multiple stakeholders.
- Couples and family members.
- Architects or representatives.
- Companies with several authorized contacts.

### Required assignment invariants

Every active client project must have:

```js
primaryClientId: "233...",
clientIds: ["233..."]
```

Do not rely on:

- `clientId` alone.
- Client email.
- Firebase Auth UID.
- Ad hoc phone variants.

`clientId` may remain temporarily for backward compatibility, but new code should use `clientIds`.

## 7. Recommended 10-Stage Project Pipeline

Use a single 10-stage production pipeline. Rendering access is a separate paid pre-quote gate, and the actual project invoice/quote comes after rendering review, revisions, and approval.

### Stage 1: Client Intake And Site Brief

Admin captures the client profile, site measurements, requirements, budget range, and initial scope.

### Stage 2: Rendering Fee Payment

Client pays a separate rendering/CAD 3D fee. This fee is not part of the actual project sum. Rendering files remain locked until payment is verified.

### Stage 3: Rendering Review And Approval

Client reviews the unlocked rendering package, requests included revisions if needed, and approves the final design.

### Stage 4: Final Quote And Kickoff Approval

Admin prepares the versioned final quote from the approved rendering. Client approves the exact final quote version before deposit.

### Stage 5: Project Deposit Payment

Client pays the project deposit against the approved quote. Procurement cannot begin before this payment is verified.

### Stage 6: Procurement And Production

Admin/staff order materials, manage sourcing, track supplier status, and monitor production.

### Stage 7: Shipping And Delivery

Admin/logistics manage freight, customs, warehousing, local delivery, and site readiness.

### Stage 8: Installation

Worker executes assigned installation work, uploads site photos, completes checklists, and requests inspection.

### Stage 9: Inspection And Sign-Off

Admin/worker/client complete quality review, snag list resolution, and formal sign-off.

### Stage 10: Handover And Final Settlement

Client pays final balance, then admin releases handover documents, warranty documents, completion report, and review request.

## 8. Project Stage vs Operational Sub-Status

Project stage is the high-level client-facing journey.

Operational sub-status is the detailed internal state of a specific workstream.

### Why they must be separate

If every operational detail becomes a project stage, the client experience becomes confusing and the code becomes brittle. Procurement, logistics, production, installation, inspection, and finance each have their own workflows. Those workflows should not force the entire project into a different stage for every small status update.

### Example

Project:

```js
stageId: 4 // Shipping And Delivery
```

Operational statuses:

```js
procurementStatus: "Complete",
logisticsStatus: "Customs Clearance",
installationStatus: "Not Started",
paymentStatus: "Deposit Paid"
```

### Recommended status fields

On the project document:

```js
{
  stageId: 4,
  procurementStatus: "In Transit",
  logisticsStatus: "Customs",
  installationStatus: "Not Started",
  inspectionStatus: "Not Started",
  paymentStatus: "Deposit Paid"
}
```

In subcollections:

```js
projects/{projectId}/procurements/{itemId}
{
  status: "ordered" // to-buy | ordered | production | warehouse | transit | site | received
}
```

```js
projects/{projectId}/work_orders/{workOrderId}
{
  status: "In Progress" // Planned | In Progress | Blocked | Complete
}
```

```js
projects/{projectId}/transactions/{transactionId}
{
  status: "verified"
}
```

## 9. Finance And Payment Model Recommendation

Use one canonical finance model that connects invoices, payment milestones, Paystack verification, transactions, and project balance.

### Recommended top-level collections

Use top-level `invoices` for official financial documents because admins need global reporting.

Use project subcollection `transactions` for project payment ledger entries.

Recommended:

- `invoices/{invoiceId}`: official invoice or quotation document.
- `projects/{projectId}/transactions/{transactionId}`: verified project ledger transaction.
- `projects/{projectId}.paymentSummary`: cached aggregate for fast UI.

Avoid canonical `projects/{projectId}/payments` unless it is only a denormalized read model. The current split between top-level `invoices` and project `payments` should be resolved.

### Invoice shape

```js
invoices/invoiceId
{
  projectId: "projectId",
  clientIds: ["233241234567"],
  primaryClientId: "233241234567",
  invoiceNumber: "WF-INV-2026-001",
  type: "Invoice", // Invoice | Quotation | Receipt
  title: "Deposit Invoice",
  currency: "GHS",
  subtotal: 125000,
  tax: 0,
  total: 125000,
  status: "Pending", // Draft | Pending | Partially Paid | Paid | Cancelled | Overdue
  dueDate: Timestamp,
  issuedAt: serverTimestamp(),
  paidAt: null,
  paymentMilestoneId: "deposit"
}
```

### Transaction shape

```js
projects/projectId/transactions/transactionId
{
  invoiceId: "invoiceId",
  paymentMilestoneId: "deposit",
  reference: "paystack-ref",
  amount: 125000,
  currency: "GHS",
  method: "Paystack",
  channel: "card",
  status: "verified",
  verifiedBy: "authUid",
  verifiedAt: serverTimestamp()
}
```

### Payment schedule

Default recommendation for Westline Future:

- Separate rendering/design fee at Stage 2.
- 50% project deposit at Stage 5.
- 50% final settlement at Stage 10.

Project field:

```js
paymentSchedule: {
  type: "standard-50-50",
  milestones: [
    {
      id: "deposit",
      label: "Deposit",
      pct: 0.5,
      dueAtStage: 2,
      invoiceId: "invoiceId",
      status: "Pending"
    },
    {
      id: "final",
      label: "Final Settlement",
      pct: 0.5,
      dueAtStage: 7,
      invoiceId: null,
      status: "Pending"
    }
  ]
}
```

### Paystack verification

Payment verification must be server-side only.

The verification function should atomically:

1. Verify transaction with Paystack.
2. Confirm authenticated user has access to the project/invoice.
3. Confirm amount and currency match expected invoice or milestone.
4. Write project transaction.
5. Update invoice status.
6. Update payment milestone status.
7. Update project `paymentSummary`.
8. Write audit log.
9. Optionally create notification.

Do not mark invoices paid from the browser without server verification.

## 10. Migration Plan From Legacy 11/12-Stage Data

The codebase currently contains a mix of legacy 7-stage and 11/12-stage references. Migration should make Firestore data consistent with the 10-stage production model without breaking existing projects.

### Legacy mapping

Recommended mapping:

```js
const LEGACY_STAGE_TO_10_STAGE = {
  1: 1,  // Inquiry/Intake
  2: 1,  // Survey/Scoping
  3: 2,  // Rendering/design fee or pre-quote design
  4: 3,  // Rendering/design review
  5: 4,  // Quote approval
  6: 5,  // Deposit/payment gate
  7: 6,  // Procurement/production
  8: 7,  // Shipping
  9: 7,  // Delivery
  10: 8, // Installation
  11: 9, // Inspection/final balance preparation
  12: 10 // Completed/handover
};
```

### Migration steps

1. Back up Firestore.
2. Add `legacyStageId` to every project that came from the old 7-stage or 11/12-stage model.
3. Write normalized `stageId` using the mapping.
4. Preserve `stageHistory` by mapping legacy entries and adding `legacyStageId` on each history event.
5. Replace milestone `stageId` values with valid 10-stage equivalents.
6. Convert payment gates:
   - Legacy rendering/design payments to Stage 2.
   - Legacy quote approvals to Stage 4.
   - Legacy deposit-related stages to Stage 5.
   - Legacy final/balance stages to Stage 10.
7. Add `clientIds` from existing `clientId`, `phone`, or user relationship.
8. Add `primaryClientId`.
9. Add `assignedWorkers` and `assignedStaff` arrays where missing.
10. Recalculate project status:
    - `stageId === 10` and final payment complete means `Completed`.
    - Otherwise `Active` unless explicitly cancelled or on hold.
11. Deploy read compatibility temporarily.
12. Remove legacy stage reads after all active data is migrated and verified.

### Migration output example

Before:

```js
{
  clientId: "233241234567",
  stage: 11,
  milestones: [
    { name: "Completion", stageId: 11, status: "Pending" }
  ]
}
```

After:

```js
{
  primaryClientId: "233241234567",
  clientIds: ["233241234567"],
  legacyStageId: 11,
  stageId: 6,
  milestones: [
    { name: "Final Settlement", stageId: 7, status: "Pending" }
  ]
}
```

## 11. Firestore And Storage Rules Implications

Rules must match the canonical model. UI filtering is not security.

### Firestore rules requirements

Rules need helper concepts for:

- Authenticated user.
- Role lookup from `users/{request.auth.uid}` for admin/staff/worker.
- Client phone lookup from `request.auth.token.phone_number`.
- Client project access through `clientIds`.
- Worker project access through `assignedWorkers`.
- Staff project access through `assignedStaff` or admin override.

### Client rules implications

Clients should be able to:

- Read `users/{phoneId}` if their authenticated phone matches.
- Read project documents where `clientIds` contains their normalized phone.
- Read client-visible project subcollections.
- Create messages and change requests for their assigned projects.
- Update only narrow client-owned records, such as marking their own notification read.

Clients should not be able to:

- List all users.
- List all projects.
- Write project stage directly.
- Write verified transactions directly.
- Read internal-only records.

### Worker rules implications

Workers should be able to:

- Read project documents where `assignedWorkers` contains `request.auth.uid`.
- Create worker field messages.
- Upload field evidence.
- Read assigned work orders.

Workers should not be able to:

- Read all project financial data.
- Update arbitrary project fields.
- Read unrelated clients.
- Delete records.

### Staff rules implications

Staff should be able to:

- Read assigned projects.
- Write assigned operational records.
- Message assigned clients.

If Westline Future wants all staff to see all projects, that should be an explicit policy decision, not an accidental result of broad rules.

### Admin rules implications

Admins can read and write all operational collections. Admin identity should be based on:

- Custom claim `role == "admin"`, or
- Firestore `users/{uid}.role == "admin"`.

Email domain checks can be a fallback, but should not be the only production authorization method.

### Storage rules requirements

Storage paths should mirror access intent:

```txt
branding/**
cms/**
portfolio/**
projects/{projectId}/documents/**
projects/{projectId}/media/**
field/{projectId}/{workerUid}/**
users/{userId}/**
```

Recommended:

- Public read for branding, CMS, and portfolio assets.
- Project document/media read for assigned clients, assigned staff, assigned workers, and admins.
- Project document/media writes for admin/staff.
- Worker writes only to field/project evidence paths for assigned projects.
- Client uploads only where explicitly supported, such as change request attachments.

Storage writes should validate:

- File size.
- MIME type.
- Assignment.
- Role.

## 12. Testing Checklist

Use Firebase Emulator tests for rules and Cloud Functions where possible. Manual browser testing should follow after emulator tests pass.

### Identity and auth

- Client with registered phone can OTP login.
- Client with unregistered phone gets a clear error.
- Client profile read succeeds when authenticated phone matches `users/{phoneId}`.
- Client cannot read another client profile.
- Admin can create client record.
- First client OTP login stores or updates `authUid`.

### Client project assignment

- Client sees projects where `clientIds` contains their phone ID.
- Client does not see projects where only another client is assigned.
- Project with multiple `clientIds` is visible to all assigned clients.
- Client cannot query all projects.
- Client cannot access project subcollections for unassigned projects.

### Roles

- Admin can access all admin views.
- Staff can access only permitted projects.
- Staff cannot access global admin-only settings unless explicitly allowed.
- Worker can access `/work`.
- Worker sees only assigned projects.
- Worker cannot read invoices unless rules intentionally allow it.
- Client cannot access `/admin` or `/work`.

### Worker flows

- Worker can upload progress photo to an assigned project.
- Worker cannot upload to an unassigned project.
- Worker can add field note/message to assigned project.
- Worker cannot update arbitrary project fields.
- Worker stage advance function succeeds only on valid worker-owned stages.
- Worker stage advance function rejects invalid stage jumps.

### Project stages

- New project starts at Stage 1.
- Rendering fee gate happens at Stage 2.
- Rendering review and approval happens at Stage 3.
- Final quote approval happens at Stage 4.
- Project deposit gate happens at Stage 5.
- Project cannot move to Stage 6 until deposit conditions are satisfied.
- Procurement/production sub-status changes do not incorrectly change `stageId`.
- Logistics sub-status changes do not incorrectly change `stageId`.
- Worker updates operate in Stage 8.
- Inspection sign-off happens at Stage 9.
- Handover/final settlement happens at Stage 10.
- Legacy stage values are mapped correctly.

### Finance and payments

- Admin can create invoice.
- Client can see assigned project invoice/payment milestone.
- Paystack verification checks amount and project access.
- Successful verification writes a transaction.
- Successful verification updates invoice status.
- Successful verification updates project payment summary.
- Failed verification does not mark invoice paid.
- Client cannot write verified transaction manually.
- Offline payment entry is admin-only and audited.

### Messaging

- Client can send project message.
- Admin/staff can send assigned project message.
- Worker can send field message if assigned.
- Internal messages are hidden from clients.
- Notifications are created for relevant recipients.
- Unassigned users cannot read project message threads.

### Uploads and documents

- Admin/staff can upload project documents.
- Worker can upload progress evidence only for assigned projects.
- Client can read client-visible documents.
- Client cannot read internal-only documents.
- Oversized files are rejected.
- Unsupported MIME types are rejected.

### Procurement and logistics

- Procurement item can be linked to a project.
- Logistics container can be created and linked to work orders or procurements.
- Logistics status updates do not bypass payment gates.
- Client sees simplified delivery status, not internal procurement noise.
- Admin sees detailed procurement/logistics statuses.

### Migration

- Every migrated project has `stageId <= 10`.
- Every migrated project has `clientIds`.
- Every migrated project has `primaryClientId`.
- Legacy stage is preserved in `legacyStageId`.
- Stage history is preserved.
- Payment milestones reference valid 10-stage IDs.
- Existing active clients can still log in after migration.

## Implementation Guidance

The safest implementation path is:

1. Add canonical fields while keeping legacy fields.
2. Update reads to prefer canonical fields with legacy fallback.
3. Update writes to write canonical fields.
4. Migrate existing data.
5. Tighten Firestore and Storage rules.
6. Remove legacy fallbacks only after verification.

Do not tighten rules before the app writes and reads the canonical fields, or existing portal flows may break.
