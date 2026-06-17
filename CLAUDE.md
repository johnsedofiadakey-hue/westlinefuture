# WESTLINE FUTURE — PROJECT INTELLIGENCE FILE
# For Claude Code and all future agents working on this codebase

---

## ⚠️ CRITICAL RULE — READ BEFORE TOUCHING ANYTHING

**When the user asks you to fix or change something, fix ONLY that thing. Do not refactor, clean up, reorganise, or "improve" surrounding code. Do not touch files that are not directly related to the requested fix. The project management engine, payment logic, stage flow, and cloud functions are production systems with real clients. An untested side-effect is a broken client journey.**

---

## GLOBAL STANDARDS
- **Persona:** World-class software engineer.
- **Rules:** NEVER truncate code. Always provide full, copy-paste-ready blocks.
- **UI/UX:** Clean, minimalist, lively. Prioritize Satoshi and Inter fonts.
- **Architecture:** B2B SaaS focus, Blue Ocean strategy.

---

## PROJECT OVERVIEW

**Westline Future** is a B2B interior design and installation firm operating across Ghana and China. This codebase is a full-stack SaaS platform with:

- **Public website** — `westlinedecor.com` / `westlinefuture.web.app`
- **Admin portal** — `/admin/*` (owner + staff)
- **Client portal** — `/portal` (phone OTP auth)
- **Worker portal** — `/work` (field staff)
- **Firebase backend** — Firestore, Auth, Cloud Functions (Gen 2), Hosting, Storage

**Stack:** React 18 + Vite, Firebase Gen 2 Cloud Functions (Node 20), Firebase Hosting (Fastly CDN), Firestore.

**Version tag:** `v1.0.0-project-engine` — git tag marking completion of the full project management engine (both client and admin sides), staff account creation, and payment flow.

---

## 🔒 PROTECTED ENGINE — DO NOT MODIFY WITHOUT EXPLICIT INSTRUCTION

The following files and systems form the **Project Management Engine**. They are production-tested and handle real client money and project flow. Do not change any logic in these files unless the user specifically asks you to fix something in them, and even then touch ONLY the reported issue.

### Protected Files

| File | What it owns |
|------|-------------|
| `functions/index.js` | All Gen 2 Cloud Functions: staff account management, offline payment confirmation, quotation creation, notifications |
| `stage-functions/index.js` | Stage workflow functions: quote approval, rendering approval, stage transitions |
| `src/App.jsx` | Auth flow, Firestore listeners, all `commonProps`, login handler, notification system |
| `src/pages/admin/clienthub/NewProjectModal.jsx` | New project creation form and payload builder |
| `src/pages/admin/ClientHub.jsx` | Per-client hub: project timeline, invoices, chat, documents, approvals |
| `src/pages/ClientPortal.jsx` | Client-facing portal: quote view, payment milestones, approval flows |
| `src/data.jsx` | `PROJECT_STAGES`, `CLIENT_PROJECT_STAGES`, `PROJECT_TYPES`, `SCHEDULE_CONFIGS` — stage and type definitions |

---

## PROJECT MANAGEMENT ENGINE — HOW IT WORKS

### Stage Flow (Admin Side)
Projects move through numbered stages stored as `stageId` on the project document in the `clients` Firestore collection.

| stageId | Stage Name | Description |
|---------|-----------|-------------|
| 0 | Onboarding | Project created, awaiting rendering fee |
| 1 | Site Survey | Rendering fee paid, site visit scheduled |
| 2 | 3D Design Review | Measurements done, rendering submitted |
| 3 | Quote Negotiation | Client reviewing quotation |
| 4 | Contract & Deposit | Quote approved, awaiting 60% deposit |
| 5 | Production | Deposit paid, fabrication underway |
| 6 | Logistics | Items shipped / in transit |
| 7 | Installation | On-site installation |
| 8 | Completed | Project closed |

Stage transitions are gated — you cannot advance a stage without prerequisites being met. This logic lives in `stage-functions/index.js → approveProjectQuote` and the stage-advance handlers.

### Launch Modes
Every new project has a `kickoffMode`:
- `rendering-first` — Standard Client Journey: Rendering fee → site visit → 3D review → quotation → contract → production
- `direct-kickoff` — No Rendering: Skips rendering and site-survey gates, jumps directly to quotation negotiation

### Payment Milestone Structure (60/30/10)
The standard payment schedule on every project:

| Milestone | % | Trigger |
|-----------|---|---------|
| Rendering Fee | Separate flat fee | Paid at stage 0→1 |
| Deposit (60%) | 60% of project total | Paid after quote approval |
| Production Balance (30%) | 30% of project total | Paid during production/logistics |
| Final Payment (10%) | 10% of project total | Paid on Ghana arrival / delivery |

Alternative schedules: `50/50`, `70/30`, and `custom` (admin-defined milestones). All schedule configs live in `src/pages/admin/clienthub/config.jsx → SCHEDULE_CONFIGS`.

### Quote Flow
1. Admin creates quotation via `createProjectQuotation` cloud function (or `createQuoteVersion` in App.jsx)
2. Quotation stored in `projects/{id}/quotes` sub-collection with status `sent`
3. `activeQuoteId` on the project doc points to the current live quote
4. Client sees the quote in the Client Portal with inclusions/exclusions and a payment preview
5. Client can accept or submit a counter-offer
6. Admin approves via `approveProjectQuote` in `stage-functions/index.js`
7. Approval requires `renderingApproved === true` on the project (or fallback check of the `renderingPackages` collection)
8. On approval: milestones are written to the project doc, `stageId` advances, invoice batch is created

### Offline Payment Confirmation
Cloud function: `confirmOfflineInvoicePayment` in `functions/index.js`

- Takes `{ invoiceId, amount, date, note, exchangeRate? }`
- `projectId` is optional — auto-resolved from invoice's `parentId` or `projectId` field
- Updates invoice status, project `paidAmount`, sets flags (`renderingFeePaid`, `depositPaid`, etc.)
- Creates transaction records in both `projects/{id}/transactions` and global `transactions`
- Sends client notification and chat message

---

## CLOUD FUNCTIONS — ARCHITECTURE

### Main Functions (`functions/index.js`)
All are Firebase Gen 2 `onCall` with `{ cors: true, invoker: 'public' }`.

| Function | Purpose |
|----------|---------|
| `createStaffAccount` | Creates Firebase Auth user + Firestore `users` + `team` docs for staff |
| `setStaffPassword` | Sets or resets staff password via Admin SDK. `resetToDefault: true` resets to `unlockme` and sets `requiresPasswordReset: true` |
| `deleteStaffAccount` | Deletes Firebase Auth user + Firestore records |
| `confirmOfflineInvoicePayment` | Records offline payment, updates project financials |
| `createProjectQuotation` | Creates a quotation version on a project |
| `repairStaffAccount` | Re-links orphaned Firebase Auth accounts to Firestore |

### Stage Functions (`stage-functions/index.js`)
All use `CORS_OPTS = { cors: [...domains], invoker: 'public' }`.

| Function | Purpose |
|----------|---------|
| `approveProjectQuote` | Approves client quote, advances stage, creates invoice batch |
| `submitRenderingDecision` | Client approves/rejects rendering |
| `advanceProjectStage` | Moves project to next stage with validation |

### IAM Binding — Critical Note
`invoker: 'public'` in the SDK config only applies on **initial function creation**, not on updates. If a function is redeployed and starts returning CORS 500 errors, it needs the IAM binding applied manually:

```bash
gcloud run services add-iam-policy-binding FUNCTION_NAME \
  --region=us-central1 \
  --member=allUsers \
  --role=roles/run.invoker
```

This was applied to all 41 Cloud Run services in the June 2026 session. If new functions are added, they need this binding after first deploy.

---

## AUTHENTICATION SYSTEM

### Admin / Staff Login
- Email + password via Firebase Auth
- Staff with `requiresPasswordReset: true` are forced to change password on first login
- Default password for new staff: `unlockme` (never stored in Firestore, only in Firebase Auth)
- Login flow in `src/App.jsx → loginHandler`
- On successful login, `setNotification(null)` clears the pending "Authenticating..." toast
- `pending`-type notifications have a 12-second safety auto-dismiss timeout

### Client Login
- Phone OTP via Firebase Auth (`signInWithPhoneNumber`)
- **Authorized domains must include both `westlinefuture.web.app` AND `westlinedecor.com`**
  → Firebase Console → Authentication → Settings → Authorized domains
- On first login, a user record is created in `users` with `role: 'client'`

### Staff Access Control (`src/pages/AdminPortal.jsx`)
Staff log into the admin portal in `staffMode`. They can only see:
- Clients assigned to them via "Assign Clients" modal (stored as `assignedClients: [clientId]` on the staff's `users` doc)
- Projects where `assignedTo`, `assignedWorkers`, or `assignedStaff` matches their UID, phone, or email

Both `clients` (projects) and `dbClients` (user account records) are filtered before being passed to any view. The filter is `AdminPortal.jsx → renderView() → staffFilteredClients` and `staffFilteredDbClients`.

---

## DATA MODEL — KEY COLLECTIONS

| Collection | Contents |
|-----------|---------|
| `clients` | Project documents. Each doc is a **project** with `clientId`, `stageId`, `title`, `budget`, `milestones`, `activeQuoteId`, etc. |
| `users` | User account records for clients AND staff. `role: 'client'` or `'staff'` or `'worker'`. Staff have `assignedClients: []`. |
| `team` | Staff-specific records mirroring `users` for team members |
| `projects/{id}/quotes` | Quote versions sub-collection |
| `projects/{id}/transactions` | Payment transaction records |
| `transactions` | Global transaction log |
| `invoices` | Invoice docs with `clientId`, `parentId` (= projectId), `type`, `status`, `amount` |
| `renderingPackages` | 3D design packages. `status: 'approved'` is a fallback check when `project.renderingApproved` is not set |
| `notifications` | Per-user notification docs |

---

## CLIENT DIRECTORY — COUNT LOGIC

**File:** `src/pages/admin/AdminClients.jsx`

`allClients` is built by merging:
1. `dbClients` — users with `role: 'client'` from the `users` collection
2. `projectOnlyClients` — synthetic entries for projects whose `clientId` has no matching user account (e.g. clients created via inquiry conversion without a portal account)

This merge ensures "Active Clients" and "Completed Projects" counts reflect all active projects, not just portal registration counts.

---

## HOSTING & DEPLOYMENT

- **Single Firebase Hosting site:** `westlinefuture` (site ID)
- **Domains:** `westlinefuture.web.app` and `westlinedecor.com` (custom domain — identical content)
- **CDN:** Fastly via Firebase Hosting
- **Cache policy for `/assets/**`:** `max-age=86400, stale-while-revalidate=604800`
  → **Do NOT change back to `immutable`.** Firebase's `**` SPA rewrite can serve `index.html` for missing asset URLs during a deploy transition. `immutable` would cache that HTML response for 1 year and permanently break browsers. 24h is safe.
- **`index.html` and all SPA routes:** `no-cache, no-store, must-revalidate`
- **Deploy hosting:** `npm run build && firebase deploy --only hosting`
- **Deploy functions:** `firebase deploy --only functions`

---

## THINGS THAT HAVE BEEN FIXED — DO NOT RE-BREAK

| # | What was fixed | Where | Why it matters |
|---|---------------|-------|---------------|
| 1 | CORS on all cloud functions | `functions/index.js`, `stage-functions/index.js` | Added `{ cors: true, invoker: 'public' }` to all `onCall`. Do not remove. |
| 2 | Ghost functions from old Codex bundle | `functions/index.js` | `confirmOfflineInvoicePayment` and `createProjectQuotation` were called by old bundle but didn't exist in source. Both created. Do not remove. |
| 3 | `resetStaffToDefault` merged | `functions/index.js` | Standalone function deleted from Firebase. All resets go through `setStaffPassword` with `resetToDefault: true`. |
| 4 | Stuck "Authenticating..." toast | `src/App.jsx` | `setNotification(null)` in login success path + 12s auto-dismiss for pending notifications. Do not remove either. |
| 5 | Quote approval rendering gate | `stage-functions/index.js` | `approveProjectQuote` checks `renderingPackages` collection as fallback when `project.renderingApproved` is not set. Do not remove the fallback. |
| 6 | CDN cache poisoning | `firebase.json` | `/assets/**` changed from `immutable` to `max-age=86400`. Do not revert. |
| 7 | Staff access control | `src/pages/AdminPortal.jsx` | `staffFilteredDbClients` filters client user records by `user.assignedClients`. Do not remove. |
| 8 | Client directory counts | `src/pages/admin/AdminClients.jsx` | `allClients` merges `dbClients` + `projectOnlyClients`. Do not simplify back to `dbClients || []`. |
| 9 | Staff account page mobile | `src/pages/admin/AdminStaff.jsx` | Table replaced with responsive card grid. `@media (max-width: 640px)` breakpoint controls layout. |
| 10 | New Project modal scrollable | `src/pages/admin/clienthub/NewProjectModal.jsx` | Modal now has fixed header, scrollable body, fixed footer. `maxHeight: calc(100vh - 48px)`. Do not revert to full-page layout. |
| 11 | Client can reschedule site visit | `src/pages/ClientPortal.jsx` — `ClientSiteVisitScheduler` | Added `rescheduling` state + "Change Date" button. When `scheduled === true` the form was hidden; now client can click "Change Date" to reveal it again. Do not remove the `rescheduling` state or the button. |
| 12 | Offline payment note visible to PM | `functions/index.js` — `confirmOfflineInvoicePayment` | Admin notification now always fires (removed `amountInGhs > 10000` threshold) and appends the client's note/description to the message. Do not re-add the threshold condition. |
| 13 | Staff portal client count reflects reality | `src/pages/AdminPortal.jsx` | `staffAssignedClientIds` now reads from live `teamMembers` snapshot (`liveStaffDoc?.assignedClients`) with `user?.assignedClients` as fallback, so the filter updates without requiring re-login after admin assigns clients. |
| 14 | "I've Made the Transfer" button was silently broken | `src/pages/ClientPortal.jsx` — `PaymentsTab` | `currentDueMilestoneInv` was always `null` because `approveProjectQuote` creates the `production-balance` invoice as `status: 'Draft'`, which is filtered out of `allInvoices`. Fixed by falling back to `rawInvoices` for the milestone invoice lookup. Do not revert to looking up only in `allInvoices`. |
| 15 | Duplicate UnifiedPaymentGateway in invoice rows | `src/pages/ClientPortal.jsx` — `PaymentsTab` | `UnifiedPaymentGateway` was rendered inside every invoice row footer AND in the milestone payment action section — two pay buttons for the same payment. Removed from invoice rows; payment happens only from the dedicated payment action section. Do not re-add inline gateways to invoice rows. |
| 16 | Currency toggle orphaned outside cards | `src/pages/ClientPortal.jsx` — `PaymentsTab` | Currency toggle was floating above the page outside any card, inconsistent with all other tabs. Moved inside the Payment Schedule card header. Do not move it back outside. |

---

## HOW TO WORK ON THIS PROJECT SAFELY

1. **Read this file first.** Every session, every agent.
2. **Fix only what is asked.** The user will tell you exactly what to fix.
3. **Do not touch other files.** If fixing a bug in `AdminClients.jsx`, do not also "clean up" `App.jsx`.
4. **Build before deploying.** `npm run build` — verify zero errors.
5. **Do not reorganise imports, rename variables, or refactor files you are not asked to touch.**
6. **Do not change Firestore collection names or field names** without understanding the full query chain across all files.
7. **Cloud function changes require redeployment and possibly IAM binding** (see IAM note above).
8. **Do not add unsolicited error handling, fallbacks, or validation.**
9. **Do not add comments to code unless the WHY is non-obvious.** No task-reference comments ("added for issue #X").
10. **Update this file after every fix.** Add a row to the "THINGS THAT HAVE BEEN FIXED" table describing what was changed, which file, and why it must not be reverted. This is not optional — the document must always reflect the current state of the codebase.
