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
| 17 | "Action Required: Pending Invoice" persists after payment | `src/pages/ClientPortal.jsx` — Overview tab `pendingInvoices` filter (line ~6195) | `confirmOfflineInvoicePayment` updates `project.paidAmount` but may not update every invoice document's status (e.g. if admin records payment on a different invoice ID). Added two guards: (1) `projectFullyPaid` — if `paidAmount >= budget`, `pendingInvoices` is empty; (2) exclude invoices with `awaitingConfirmation: true` (client notified, pending admin verify). Do not remove either guard. |
| 18 | Handover certificate feature | `src/pages/admin/ClientHub.jsx`, `src/pages/ClientPortal.jsx` | Admin issues a handover certificate on completed projects (stageId 8) by filling delivery notes. Writes to `projects/{id}/documents` (type: `handover`, clientVisible: true) and `projects/{id}.handoverCertificate`. Client sees it in Documents tab with "View Certificate" (printable HTML) and "Acknowledge Receipt" (writes `handoverCertificate.acknowledgedAt`). Do not change the `type: 'handover'` check in DocumentsTab — it controls the certificate render path. |
| 19 | Project creation Firestore undefined error | `src/App.jsx` — `createClientProject` (line ~2093) | `addDoc` was throwing "Unsupported field value: undefined" for the projects document. Root cause could not be isolated through static analysis (all explicit fields have null/string fallbacks). Fixed by wrapping the entire `addDoc` payload in `cleanForFirestore()` — a local helper that recursively replaces `undefined` with `null` in plain objects/arrays while passing Firestore FieldValue sentinels (serverTimestamp etc.) through unchanged. Do not remove this wrapper. |
| 20 | Vault documents invisible to client | `firestore.indexes.json` | `DocumentsTab` in `ClientPortal.jsx` queries `projects/{id}/documents` with `where('clientVisible', '==', true)` + `orderBy('createdAt', 'desc')`. This requires a composite index on `clientVisible + createdAt` for the `documents` collection group. The index was missing from `firestore.indexes.json` — Firestore silently returned a `FAILED_PRECONDITION` error, swallowed by the catch handler, so clients saw "No other documents yet" even when docs existed. Fixed by adding the composite index and deploying. Do not remove it. |
| 21 | Workflow guidance card (`ClientNextActionCard`) stuck on stale stage | `src/pages/ClientPortal.jsx` — `ClientNextActionCard` | The card's `action` decision chain checked raw boolean flags (`renderingPaid`, `reviewRendering`, etc.) directly, bypassing the `stageId`-gated logic in `deriveWorkflowStep`. A case-sensitivity bug (`pkg.status !== 'Approved'` vs `.toLowerCase() === 'approved'`) also caused `reviewRendering` to remain truthy after rendering was approved, making the card show "Review your rendering" even at stage 3+. Fixed by rewriting the decision chain to be driven by `workflowStep` (already computed from `deriveWorkflowStep`) as the primary gate — each `WORKFLOW_STEP` value maps to the correct action, and only the `else` fallback (Production and beyond) checks add-ons/unpaid invoices. Do not revert to the flag-based chain. |
| 22 | `?` help button overlaps Messages send button on mobile | `src/pages/ClientPortal.jsx` — floating `HelpCircle` button | On mobile, the `?` button at `bottom: 104, right: 20` sat directly on top of the chat send button when `activeTab === 'messages'`. Fixed by adding `!(isMobile && activeTab === 'messages')` to the button's render condition — the `?` hides on mobile only when Messages is active. Do not remove this guard. |
| 23 | No delete buttons on vault, documents, and uploads | `src/components/SecureVault.jsx`, `src/pages/admin/clienthub/ProjectDetailCards.jsx`, `src/components/ClientUploadsTab.jsx` | Admin had no way to remove mistakenly uploaded vault items, project documents, or inspiration uploads. Added `Trash2` delete buttons: (1) `DocumentVault` — red trash icon per row, calls `deleteDoc` on `projects/{id}/documents/{docId}`; (2) `SecureVault` — admin-only delete (gated on `onAdminUploadVault` prop), both pending-signature and signed sections, calls `deleteDoc` on `projects/{id}/vault/{docId}`; (3) `ClientUploadsTab` — floating trash icon per upload card (top-right), calls `deleteDoc` on `projects/{id}/inspiration/{fileId}`. All three show a confirm dialog before deleting. Do not remove the `onAdminUploadVault` gate on SecureVault deletes — clients must not be able to delete admin-uploaded vault documents. |
| 24 | Client cannot see assigned stage timelines | `src/pages/ClientPortal.jsx` — `ProjectRoadmap` | The admin sets start/end/duration on each stage via `project.timeline` (Firestore field), but clients never saw these dates. Added `computedTimeline` (from `calculateTimeline`, already imported) and `fmtDate` helper inside `ProjectRoadmap`. Each stage row now shows date chips directly below the stage name: past stages show a green "startDate – endDate" chip; current stage shows "Started [date]" + "Est. end [date]"; future stages show a muted "[date] – [date]" chip. Duration (~Nd) is shown inline. Chips only render when `computedTimeline[stage.id]?.startDate` exists — nothing shows if admin has not set a timeline. Do not remove the `?.startDate` guard. |
| 25 | Admin workflow guidance stuck on stale early-stage message | `src/pages/admin/ClientHub.jsx` — `getProjectWorkflowGuidance` | Same root cause as fix #21: the function evaluated conditions top-to-bottom without `stageId` gates. A Stage 3 project with no `renderingFeeInvoiceId` stored would hit `renderingFirst && !renderingInvoice` and show "Issue the rendering fee invoice" even though rendering was completed months prior. Fixed by adding `stageId < 2` guard around all rendering fee + site visit blocks, and `stageId < 3` guard around all rendering review/approval blocks. Quotation and beyond flow unchanged. Do not remove these stageId guards — they are what prevents the guidance from regressing to a stale early-stage message. |
| 26 | Public pages (Portfolio, Products) not translating to Chinese | `src/components/PubLayout.jsx`, `src/pages/ProductsHub.jsx` | Replaced the entire static `PUBLIC_ZH` dictionary (~500 entries) with a Google Cloud Translation API engine. `translatePublicDom(lang)` is now async — it collects all visible text nodes, sends strings not yet cached to the `translatePublicPage` Cloud Function, and applies results. Session-level cache (`_translationCache` keyed by pathname) ensures the API is only called once per page per session. MutationObserver in PubNav debounced to 600ms and `characterData: true` removed to prevent React reconciliation crashes. `usePublicTranslation` hook updated to handle async. ProductsHub local useEffect also updated async. Do not revert to the dictionary or re-add `characterData: true`. |
| 27 | Admin portal pages not translating to Chinese | `src/lib/adminI18n.js`, `src/pages/admin/AdminLayout.jsx` | Same Google Translate API upgrade applied to the admin portal. `translateAdminDom(lang)` is now async — dictionary (`ADMIN_ZH`) is applied instantly as a first pass for known strings, then remaining untranslated strings are sent to the same `translatePublicPage` Cloud Function. Cache stored in `_adminCache` keyed by pathname. AdminLayout MutationObserver debounced to 600ms and `characterData: true` removed. Do not re-add `characterData: true` — it causes React's `removeChild` crash by creating a feedback loop between the DOM walker and React's reconciliation. |
| 28 | Admin sidebar not scrollable — content hidden off-screen | `src/pages/admin/AdminLayout.jsx` — `<aside>` | Added `position: sticky`, `top: 0`, `height: 100vh`, `overflowY: auto`, `flexShrink: 0` to the aside element so it sticks to the top and scrolls independently. Do not remove these properties. |
| 29 | Staff RBAC permissions system | `src/pages/admin/AdminLayout.jsx`, `src/pages/admin/AdminStaff.jsx`, `functions/index.js — createStaffAccount` | Added granular per-tab access control for staff accounts. `PORTAL_PERMISSIONS` defines 10 grantable tabs (dash, analytics, operations, projects, installations, logistics, email, financials, cms, product-sync). `staff` and `system` tabs are admin-only and never grantable. AdminLayout now filters sidebar by `user.permissions[]` when `staffMode` is true (instead of hardcoded `STAFF_ALLOWED_IDS`). AdminStaff create form has a permissions panel with preset buttons (Full Access, Operations Only, None) and individual checkboxes. "Edit Access" button on each staff card opens a permissions modal that writes to both `users/{uid}` and `team/{uid}` docs. `createStaffAccount` cloud function now accepts and saves `permissions[]` to Firestore. Worker-role staff (Field Installer, Field Worker, Technician etc.) always get empty permissions (they use the `/work` portal, not admin). |
| 30 | `setStaffPassword` returning 500 internal error | `functions/index.js — setStaffPassword` | `validatePasswordStrength` required 12+ character passwords. Admin-set passwords (via the Set Password modal) were failing when short passwords like "unlockme" were entered. Replaced the strict validator call with a simple 6-character minimum — admin-controlled password paths do not require strength enforcement. |
| 31 | Admin mobile bottom nav — text invisible, logout had no label, blocks content | `src/pages/admin/AdminLayout.jsx` | Bottom nav used `var(--text-secondary)` (dark) for text on a dark brown background — invisible. Logout had no label. Nav floated 20px off bottom, overlapping content. Rebuilt: nav is flush to screen edge (`bottom: 0`), text uses `rgba(255,255,255,0.5)` for inactive and `#fff` for active, logout has "LOGOUT" label, active tab has pill highlight. Added "More" drawer (slide-up grid) for all tabs beyond the 4 pinned ones. `showMoreMenu` state controls the drawer. Do not revert to the floating dock or `var(--text-secondary)` color. |
| 32 | Notification toast covers mobile nav bar | `src/App.jsx` — notification toast | Toast was fixed at `bottom: 24` with `zIndex: 10000`, sitting on top of the bottom nav. Now appears at `top: 16` on mobile (`window.innerWidth <= 768`) and stays at `bottom: 24` on desktop. Do not remove the mobile/desktop conditional. |
| 33 | Staff portal tabs showing but clicks do nothing | `src/pages/AdminPortal.jsx — renderView` | Hardcoded `STAFF_ALLOWED_VIEWS = ['client-hub', 'operations']` blocked all other views regardless of RBAC permissions. Replaced with: (1) `ADMIN_ONLY_VIEWS = ['staff', 'system']` always blocked for staff; (2) if staff has permissions and the view isn't in them, redirect to first permitted view. `client-hub` is explicitly excluded from the block so opening a client always works. Do not revert to the hardcoded list. |
| 35 | "Client not found" when opening a project-only client | `src/pages/admin/ClientHub.jsx` — line after `dbClients.find` | `AdminClients` merges real `dbClients` (portal accounts) with `projectOnlyClients` — synthetic entries built from project docs where no `users` record exists. When staff clicks one of these, `ClientHub` found nothing in `dbClients` and showed "Client not found." Fixed by adding a fallback: if `dbClients.find` returns nothing, construct a synthetic client object from `props.clients` (projects list) using the project's `clientName`, `clientPhone`, `clientEmail` fields. Do not remove this fallback — project-only clients are a valid real-world case. |
| 34 | Client directory and payments table unusable on mobile | `src/pages/admin/AdminClients.jsx`, `src/pages/admin/AdminFinancials.jsx` | Both used wide multi-column tables with action buttons in the last column — off-screen on mobile, making clicks unreachable. Added `isMobile` detection to both files. On mobile: AdminClients shows full-width tappable cards (tap anywhere to open client); AdminFinancials sales/quotations tab shows invoice cards with amount, status, and action buttons. Desktop table view unchanged. Do not remove the `isMobile` conditional — it is what makes the staff portal usable on phones. |
| 36 | In-app video call meeting scheduling (Ghana ↔ China) | `src/components/VideoCallModal.jsx` (new), `src/pages/admin/ClientHub.jsx` — Meetings tab, `src/pages/ClientPortal.jsx` — Overview tab, `functions/index.js — generateAgoraToken` | Zoom/Meet/WhatsApp are blocked in China. Built fully in-app video calling using Agora.io (China-compliant infrastructure). PM schedules meetings from the "Meetings" tab in ClientHub; system auto-sends a chat message and Firestore notification to client. Client sees upcoming calls in a card on the Overview tab with "Join" button (active 5 min before start time). `VideoCallModal` uses `agora-rtc-sdk-ng` + `agora-rtc-react` for peer video. Token generation via `generateAgoraToken` Cloud Function (uses `AGORA_APP_ID` + `AGORA_APP_CERTIFICATE` secrets). **Requires one-time setup:** `firebase functions:secrets:set AGORA_APP_ID` + `firebase functions:secrets:set AGORA_APP_CERTIFICATE`, then `firebase deploy --only functions:generateAgoraToken`. Do not remove the `channelName: meeting_{docId}` pattern — it is what links the Agora channel to the Firestore meeting doc. |
| 37 | PM incoming call banner — client-initiated calls not visible to admin | `src/pages/admin/ClientHub.jsx` — incoming call listener + banner | When a client tapped "Call PM", the `status: 'live'` meeting doc was written to Firestore but the admin had no listener watching for it. PM never saw the call. Fixed by adding an `onSnapshot` listener on `projects/{id}/meetings` filtered by `status == 'live'`, surfacing only docs where `createdBy !== admin uid` (client-initiated). A pulsing green banner appears at the top of `ClientHub` with Answer/Dismiss buttons. Answer sets `activeCallMeeting` and opens `VideoCallModal` into the same Agora channel. Do not remove the `createdBy !== props.user?.uid` guard — without it, the PM's own instant calls would also trigger the banner. |
| 38 | Video call controls merged into Messages tab; separate Meetings tab removed | `src/pages/admin/ClientHub.jsx`, `src/pages/ClientPortal.jsx` | The standalone Meetings tab was invisible because the tab bar had too many tabs and no scroll — it overflowed off-screen. Removed the Meetings tab entirely. PM-side: Video Calls panel (Call Now + Schedule form + upcoming meetings list) now lives at the top of the Messages tab. Client-side: `ClientMeetingsCard` moved from Overview tab to the top of the Messages tab. Tab bar given `overflowX: auto, scrollbarWidth: none` so all tabs scroll without a visible scrollbar. Do not revert to a separate Meetings tab. |
| 39 | useState called inside IIFE in JSX — React hooks violation | `src/pages/admin/ClientHub.jsx` | `showScheduleForm` state was declared with `React.useState` inside the messages tab IIFE. React prohibits hooks inside nested functions/conditionals. Moved `showScheduleForm` state declaration to component level alongside `meetingForm`. Do not put hooks inside IIFEs or conditional blocks. |
| 40 | Unread message badge on Messages tab — PM and client portals | `src/pages/admin/ClientHub.jsx`, `src/pages/ClientPortal.jsx` | PM side: added `unreadMsgCount` state + `onSnapshot` listener on `clients/{id}/messages` counting docs where `senderRole !== 'admin' && !readByAdmin`. Badge rendered inline in the tab button for the Messages tab. Client side: `totalUnread` was already wired to the tab badge (pre-existing). Do not remove the `senderRole !== 'admin'` filter — without it, admin's own outbound messages would count as unread. |
| 41 | Upcoming meeting alert card on client Overview tab | `src/pages/ClientPortal.jsx` — Overview tab IIFE | Clients had no visible reminder of upcoming video calls on the Overview tab. Added logic to find the next non-cancelled meeting within `projects/{id}/meetings`, sorted by `scheduledAt`. Blue card shows title + date when meeting is upcoming; turns green with "Join Call →" when the meeting is live or within 5 minutes. "View in Messages →" navigates to Messages tab where the full meetings card lives. Do not remove the `_ts > nowTs - 15 * 60 * 1000` filter — it prevents stale past meetings from showing as "upcoming". Uses `portalMeetings` (component-level state) — not the `meetings` state inside `ClientMeetingsCard`. Do not change this to reference `ClientMeetingsCard`'s internal state. |
| 42 | Video call schedule moved to modal in project header | `src/pages/admin/ClientHub.jsx` | PM had to scroll up in the Messages tab to reach the schedule form. Moved scheduling into a dedicated modal triggered by a "Schedule" button in the project header bar (next to the "Call" button). Both buttons are always visible regardless of active tab. Messages tab now shows only the upcoming calls list (if any) + chat. `showScheduleModal` state controls the modal. Do not put the schedule form back inside the Messages tab. |
| 43 | Admin project tab bar overflow — "More" dropdown | `src/pages/admin/ClientHub.jsx` — tab bar | 10 tabs in a horizontal scroll bar was cramped and unusable. Split into `PRIMARY_TABS` (Overview, Payments, Designs, Messages, Timeline — always visible, `flex: 1` each) and `MORE_TABS` (Project Brief, Shipping, Vault, Uploads, Team — in a dropdown). "More ▸" button shows the active secondary tab's name when one is selected. `showTabMore` state controls the dropdown. Do not revert to a single flat `TABS` array with `overflowX: auto` — that made tabs invisible. |
| 44 | Workflow Guidance card moved into Overview tab | `src/pages/admin/ClientHub.jsx` | The "Workflow Guidance · Waiting on…" card was rendered above the tab bar permanently, eating vertical space on every tab. Moved it to the top of the Overview tab content so it only shows when viewing Overview. Do not move it back above the tab bar — it belongs in Overview. |
| 45 | Client inspiration uploads broken — missing cloud function | `src/components/ClientUploadsTab.jsx` | `handleUpload` called `httpsCallable(functions, 'registerProjectUpload')` which never existed in `functions/index.js`. Replaced with a direct `addDoc` to `projects/{id}/inspiration` (consistent with how `addProjectDocument` in `App.jsx` works). Do not re-introduce the cloud function call — direct Firestore write is correct here. |
| 46 | Missing `scheduleProjectSiteVisit` and `completeProjectSiteVisit` cloud functions | `functions/index.js` | Both `AdminSiteVisitCard` (admin side) and `ClientSiteVisitScheduler` (client side) called these functions, but they did not exist — all scheduling attempts silently failed. Both functions added: `scheduleProjectSiteVisit` writes the `siteVisit` object to the project doc and sends a chat + notification to the client; `completeProjectSiteVisit` sets `status: 'completed'` + `siteSurveyCompleted: true` and notifies the client. Do not remove these functions. |
| 47 | Site visit scheduling moved from client portal to PM only | `src/pages/ClientPortal.jsx` | `ClientSiteVisitScheduler` component (which let clients pick a date/time) was removed from the Overview tab render. The client now sees a message that their PM will contact them to arrange the visit. The `AdminSiteVisitCard` in `ClientHub.jsx` is the only scheduling interface. Do not re-add `<ClientSiteVisitScheduler>` to the client portal. |
| 48 | Password management overhaul | `functions/index.js — setStaffPassword`, `src/App.jsx`, `src/pages/LoginPage.jsx`, `src/pages/admin/AdminStaff.jsx` | (a) `setStaffPassword` now requires STRICT admin (email-admin or `role === 'admin'`) — previously ANY authenticated user could reset anyone's password. Do not relax to `assertAdmin` (which also passes role 'staff') or a bare `request.auth` check. (b) Shared default password `unlockme` replaced everywhere with random one-time passwords (`WF-xxxx-xxxx`; `generateTempPassword` in functions, `generateTempPw` in AdminStaff, inline in App.jsx `createStaffAccount`) shown ONCE to the admin with copy/WhatsApp buttons; `setStaffPassword` resetToDefault returns `{ tempPassword }` and AdminStaff shows it in a one-time modal (`resetResult` state). (c) `ForcePasswordChange` now has a "Current (Temporary) Password" field used for reauth — no more hardcoded 'unlockme'. (d) Minimum password length raised 6→8 in all live paths. (e) "Forgot password?" link on staff login (`LoginPage.jsx`) via `sendPasswordResetEmail` with a neutral "if this email exists" message. (f) Admin auto-provisioning on failed login REMOVED from `loginHandler` — do not re-add; it allowed account takeover of not-yet-created admin emails. |
| 49 | RBAC role permission presets + assignedClients dual-write | `src/pages/admin/AdminStaff.jsx` | `ROLE_PERMISSION_PRESETS` maps each staff role to default portal-tab permissions, pre-selected when a role is picked in the create form (admin can still adjust before saving). `AssignClientsModal` now writes `assignedClients` to BOTH `users/{id}` and `team/{id}` docs (team write wrapped in try/catch — some staff lack a team doc). Do not remove the dual-write. |
| 50 | Multiple project managers per project | `stage-functions/index.js — toggleProjectTeamAssignment`, `src/App.jsx`, `functions/index.js`, `src/pages/admin/ClientHub.jsx`, `src/pages/admin/ProjectKanban.jsx`, `src/pages/AdminPortal.jsx` | New `projectManagerIds: []` array on project docs; scalar `projectManagerId` kept in sync (= first PM) for back-compat — no data migration; old projects fall back to the scalar. `toggleProjectTeamAssignment` adds/removes PMs from the array instead of overwriting the scalar. Notification recipient lists spread `...projectManagerIds`; ClientHub Team tab `isManager` checks `pmIds.includes(...)` so multiple members show the Project Manager badge; AdminPortal staff-mode filter includes the array. `createClientProject` seeds `projectManagerIds: [assignedStaff]`. Do not revert `projectManagerId` handling to a plain overwrite. |
| 51 | Mandatory onboarding service agreement gate (client portal) | `src/pages/ClientPortal.jsx`, `stage-functions/index.js — signOnboardingAgreement`, `src/pages/admin/AdminFinancials.jsx` | Every project must have its Design Services Cooperation Agreement read + electronically signed before tabs/content render in the client portal. `DEFAULT_ONBOARDING_AGREEMENT` constant in ClientPortal (Party A/B auto-filled, contents of service, design costs incl. 3% top design fee, full payment + remittance info, 7-working-day delivery / 2 free modifications / 7-day silence approval, copyright, general provisions); admin override via `brand.finSettings.onboardingAgreementTemplate` + `remitAccountName`/`remitAccountNumber` (AdminFinancials "Onboarding Service Agreement" card). `applyContractVariables` extended with `{{clientPhone}} {{clientAddress}} {{companyName}} {{companyPhone}} {{companyAddress}} {{remitAccountName}} {{remitAccountNumber}}`. `ContractAgreementModal` gained optional `mode='onboarding'` (calls `signOnboardingAgreement` and passes the agreement text snapshot; the three existing quote-contract call sites are untouched). Cloud fn `signOnboardingAgreement` (stage-functions) has NO quoteApproved precondition and generates NO invoice — it writes `project.onboardingAgreement {signed, signedAt, signerName, signatureData, agreementText, verificationStamp}`, a signed document at `projects/{id}/documents/signed-onboarding-agreement`, an activity log, and notifies admin/PMs. Gate renders when `onboardingAgreement?.signed !== true` (absent field = unsigned, so existing projects are gated too); tabs guard is `(signed || agreementSignedLocal) && !portalGate.active`. NEW cloud function — required IAM invoker binding after first deploy. Do not add a quoteApproved precondition to `signOnboardingAgreement` and do not remove the gate guard. |
| 52 | Data backups: Firestore PITR + delete protection + daily scheduled backups | GCP config (no code), applied 2026-07-11 | Three protections enabled on the `(default)` Firestore database via `gcloud firestore databases update`: (1) `pointInTimeRecoveryEnablement: POINT_IN_TIME_RECOVERY_ENABLED` — 7-day rolling history, restore to any minute in that window; (2) `deleteProtectionState: DELETE_PROTECTION_ENABLED` — the database itself cannot be deleted by API/console until this is explicitly turned off; (3) a daily backup schedule (`gcloud firestore backups schedules create --recurrence=daily --retention=30d`) — full nightly snapshot kept 30 days, covers accidental-deletion cases discovered after the 7-day PITR window closes. Restore via `gcloud firestore databases restore` (from a named backup) or a PITR timestamp read. Do not disable PITR, disable delete protection, or delete the backup schedule — these are the project's only protection against permanent data loss from a bug, bad query, or human error. |
| 53 | New staff role names added (Admin Specialist, General Manager, Customer Service, Site Surveyor, Design Director, Design Supervisor, Interior Designer, Deputy Manager, Purchasing Specialist, Cost Estimator, Foreman) | `src/pages/admin/AdminStaff.jsx` — `STAFF_ROLES`, `ROLE_PERMISSION_PRESETS`, `ROLE_PROFILES` | `jobRole` is stored as a plain string on each staff doc and resolved via a `ROLE_PROFILES[jobRole]` lookup (fallback to Technician) — it is not a foreign key or regex match, so adding new role names cannot affect existing staff. All 11 new roles added to all three constants with `systemRole: 'staff'` (admin portal + tab permissions, not the restricted `/work` worker portal). To retire an old role later: remove its name from `STAFF_ROLES` only (stops it being offered to new hires) — never delete its `ROLE_PROFILES`/`ROLE_PERMISSION_PRESETS` entry, or any staff still holding that role will fall back to the generic Technician profile and lose their correct permissions/description on next load. |
| 54 | Self-service "Manage Roles" panel — admin can hide/add staff roles without a code change | `src/pages/admin/AdminStaff.jsx` | Admin asked to hide/add roles themselves instead of requesting a code edit each time. New Firestore doc `settings/staffRoles` (`{ hidden: string[], custom: [{name, permissions}] }`) is the source of truth for what appears in the "Manage Roles" modal (`showRoleManager` state, in the header's "More" menu). Built-in roles are never deleted from `STAFF_ROLES`/`ROLE_PROFILES`/`ROLE_PERMISSION_PRESETS` in code — deleting one in the UI only adds its name to `hidden`, filtered out of `visibleStaffRoles` (used by the two role `<select>` dropdowns). Custom roles are appended to `custom` and get a generic profile (`systemRole: 'staff'`, description "Custom role added by admin") via `getRoleProfile()`, which replaced all direct `ROLE_PROFILES[...]` lookups in the file (fallback chain: built-in profile → custom profile → Technician). `getPermissionPreset()` similarly replaced direct `ROLE_PERMISSION_PRESETS[...]` reads. Do not delete entries from `ROLE_PROFILES`/`ROLE_PERMISSION_PRESETS` in code — always hide via the Firestore `hidden` array instead. |
| 55 | Manage Roles panel redesigned (Active/Deleted tabs, trash-icon delete, collapsible add form) + header decluttered into a "More" menu | `src/pages/admin/AdminStaff.jsx` | Admin found the original panel unprofessional — 21 roles in one long stacked list with the add-role form buried at the bottom, and no real "delete" affordance (only an Eye/EyeOff toggle). Redesigned: role list now lives in a fixed-height scrollable 2-column grid inside the modal (the modal itself no longer grows into a page-length scroll), split into "Active"/"Deleted" tabs (`roleTab` state) instead of one long list; each role has a trash-icon Delete button (still non-destructive — same `hidden` array write as before, `toggleRoleHidden`), and deleted roles move to the Deleted tab with a Restore button. "Add Role" is now a collapsible section (`showAddRoleForm` state) toggled from the header instead of a form after the full list. Standard and custom roles were unified into one list/mechanism — `removeCustomRole` (hard delete) was removed since hide/restore now covers both. Header action row was cut from 5 buttons to 2 (Field Team, Create Account) plus a "More" dropdown (`showMoreMenu` state) holding Recover/Bulk Import/Manage Roles. Do not re-expand the header back to 5 flat buttons or move the add-role form back below the role list — both were the specific complaints this fix addresses. |
| 56 | Staff role is now editable after account creation | `src/pages/admin/AdminStaff.jsx` — staff card "Role" badge (~line 790) | There was no way to change an existing staff member's role — the badge was static text, `jobRole` could only be set at creation or via the Recover form. Turned the badge into a `<select>` bound to `m.jobRole`, populated from `visibleStaffRoles` (falls back to including the member's current role even if it has since been deleted/hidden from the picker, so the dropdown never shows a stuck/blank value). On change, writes both `jobRole` (display label) and `role` (`staff`/`worker` system role, derived via `getRoleProfile(newRole).systemRole`) through the existing `updateM` helper — the same one the Status dropdown already uses. Also fixed a pre-existing display bug where the badge read `m.role || m.jobRole` (showed the coarse `staff`/`worker` value instead of the actual role label when both existed) — corrected to `m.jobRole || m.role`. Portal-tab permissions are intentionally left untouched by a role change — admin adjusts those separately via "Edit Access" so an accidental role switch can't silently rewrite someone's access. |
| 57 | Staff login "username and password not correct" — credentials sheet showed the wrong login identifier | `src/pages/admin/AdminStaff.jsx` — `copyCredentials`, account-created success card, WhatsApp share texts (create + reset + `StaffPasswordModal`) | Root cause: `createStaffAccount` (`src/App.jsx`) creates the Firebase Auth account with `loginEmail` — either a real email if supplied (bulk-imported staff, e.g. `andy@westlinedecor.com`) or a generated pseudo-email (`username@westlinefuture.com`). But every credentials/reset/WhatsApp display in `AdminStaff.jsx` showed only `member.username`, never the actual `loginEmail`. `LoginPage.jsx`'s `adminLogin()` always reconstructs a bare (no "@") input as `username@westlinefuture.com` — correct for pseudo-email accounts but wrong for real-email (bulk-import) accounts, so those staff could never sign in with the username they were given, producing `auth/invalid-credential` → "username and password not correct." Fixed by: (1) capturing `result.loginEmail` returned from `createStaffAccount` into the `created` state (previously discarded), (2) changing every "Username: …" credentials string/label to "Login Email: …" using the stored `email` field (which always equals the real Auth identity) with `username` only as a last-resort fallback. Bulk Import's own credentials copy (`copyBulkCredentials`) was already correct (used `row.email`) and was not touched. Do not revert these back to showing `username` — for any account created with a real email, the username alone is not a valid login identifier. |
| 58 | "Set your own password" screen kept reappearing on next login, even after successfully changing the password | `src/context/AppContext.jsx` — new `refreshUserProfile()`, `src/App.jsx` — both `ForcePasswordChange onDone` handlers (`/admin` and `/work` routes) | Root cause: the logged-in user's profile is served by a react-query `useQuery` (`['userProfile', uid, email, phone]`, `staleTime: 5 min`) whose result is synced into local `user` state via a `useEffect`. `ForcePasswordChange`'s `onDone` correctly wrote `requiresPasswordReset: false` to Firestore and manually patched local `user` state + `localStorage`, but never touched react-query's own cached copy of the profile — which still held the OLD `requiresPasswordReset: true` object. Any later refetch of that query (tab refocus, route remount, or signing in again within the 5-minute staleTime window) re-ran the sync `useEffect` with the stale cached data and silently overwrote the fresh `user` state, resurrecting the forced-password screen — now asking for a temporary password that had already been rotated, so it would fail even if re-entered correctly. Fixed by adding `refreshUserProfile()` in `AppContext.jsx`, which re-fetches the Firestore profile and writes it into both local state/localStorage AND the query cache via `queryClient.setQueryData(...)` (added `useQueryClient` import) — both `onDone` handlers in `App.jsx` now call this single function instead of doing a manual `getDoc` + `setUser` + `localStorage.setItem` that left the query cache stale. Do not revert `onDone` to a manual profile patch that skips `queryClient.setQueryData` — any future refetch will overwrite it. |
| 59 | Three Cloud Functions callable by ANY authenticated user, including clients — no role check at all | `functions/index.js` — `createProjectQuotation`, `confirmOfflineInvoicePayment`, `deleteStaffAccount` | Discovered while auditing whether staff `permissions` tabs are enforced server-side. All three functions previously only checked `if (!request.auth)` — truthy for literally any signed-in account (client, worker, staff, admin). A client account could call `confirmOfflineInvoicePayment` or `createProjectQuotation` directly via `httpsCallable` from devtools and mutate invoice/quote/financial state on any project, or call `deleteStaffAccount` to remove a staff member's account. Fixed: `createProjectQuotation` and `confirmOfflineInvoicePayment` now call `assertAdminOrStaff(request.auth)` (existing helper, functions/index.js:39) — matches how staff normally use these day-to-day. `deleteStaffAccount` now uses the same strict admin-only inline check as `setStaffPassword` (fix #48a) — deleting an account is at least as sensitive as resetting its password, so it is not staff-callable. Do not revert any of these three to a bare `if (!request.auth)` check. |
| 60 | Assigned-client count shown on each staff card | `src/pages/admin/AdminStaff.jsx` — staff card role row (~line 803) | Admin wanted to see how many clients each staff member is handling without opening "Assign Clients". Added a small counter (`Users` icon + `{assignedClients.length} clients`) to the right of the department label on every staff card, reading the same `m.assignedClients` array the Assign Clients modal already writes — no new data or write path introduced. |
| 61 | Server-side enforcement of staff portal-tab permissions on sensitive Cloud Functions | `functions/index.js` — new `assertHasPermission()` helper (next to `assertAdminOrStaff`); applied to `createStaffAccount`, `repairStaffAccount`, `createProjectQuotation`, `confirmOfflineInvoicePayment` | Admin asked that "whatever access is given to staff should strictly be that." Audit found the `permissions` array (portal tabs, set in AdminStaff.jsx) was enforced ONLY in the browser (`AdminPortal.jsx` view-switch guard) — never checked by any Cloud Function or `firestore.rules`, so a staff member could bypass a hidden tab by calling the underlying function directly from devtools. Scope agreed with admin: lock down the sensitive money/staff-account functions only, not a full `firestore.rules` rewrite (bigger, higher-risk, declined for now). `assertHasPermission(auth, allowedPermissions)` checks the caller's `users/{uid}.permissions` array contains at least one of the required tabs; admins always bypass it. Applied: `confirmOfflineInvoicePayment` → requires `financials`; `createProjectQuotation` → requires `financials` or `projects`; `createStaffAccount`/`repairStaffAccount` → requires `staff` — since `staff` is never a grantable tab (fix #29: staff/system tabs are admin-only, never offered in the permissions UI), this correctly restricts both to true admins only. Verified both `confirmOfflineInvoicePayment` and `createProjectQuotation` are legacy/ghost functions (see fix #2) — the live app uses separate direct-Firestore paths (`recordOfflinePayment`, `createQuoteVersion` in `src/App.jsx`) that are unaffected by this change, so no current staff workflow was broken. CMS and product-sync writes were NOT locked down — they go directly from the browser to Firestore with no Cloud Function in front of them, so enforcing them would require the `firestore.rules` change the admin declined; do this only if asked to revisit the "full lockdown" option. Do not revert these four functions to `assertAdmin`/`assertAdminOrStaff` without the permission check — that reopens the bypass this fix closes. |
| 62 | Project Kanban board showing project title (or "Unknown Client") instead of the client's name | `src/pages/admin/ProjectKanban.jsx` — card view (~line 263), drawer header (~line 402), desktop table row (~line 902) | `src/context/AppContext.jsx`'s `normalizeProject` sets `project.name = data.title || data.project` — i.e. `project.name` holds the PROJECT title, not the client's name, despite the field name. All three display sites in ProjectKanban.jsx read `project.name` expecting a client name, so they showed the project title a second time (duplicating the title already shown above it) or fell through to "Unknown Client". Fixed by reading `project.clientName` first (the field actually populated with the client's name at project creation, `createClientProject` in `src/App.jsx`) with `project.name` kept only as a last-resort fallback for any very old record missing `clientName`. Do not revert to reading `project.name` alone for client identity — it is aliased to the project title, not the client. |
| 63 | Payments tab and several other admin tabs unusable on mobile for staff | `src/pages/admin/AdminFinancials.jsx`, `src/pages/admin/clienthub/ProjectInvoicesLedger.jsx`, `src/pages/admin/clienthub/PaymentScheduleCard.jsx`, `src/pages/admin/clienthub/ProjectDetailCards.jsx` (`ProjectEconomics`) | None of these had mobile handling beyond what earlier fixes (#34) covered (AdminClients + AdminFinancials' sales/quotations tab only). Fixed by adding `isMobile` (`window.innerWidth <= 768`) state where missing and branching every hardcoded multi-column grid (`repeat(3/4, 1fr)`, `1fr 1fr 1fr`, fixed `480px`/`280px` panels) down to 1–2 columns on mobile: AdminFinancials Overview KPI grid, Audit Log/Quick Actions panel, Margins tab (KPI grid + P&L table now scrolls horizontally with a `minWidth` instead of squishing), Banking tab card grid, Settings tab grids, and the Invoice/Quotation Studio overlay (editor+preview now stacks instead of forcing a 480px preview column onto a 375px screen; the line-items spreadsheet scrolls horizontally on mobile via a `minWidth` wrapper instead of clipping). `ProjectInvoicesLedger.jsx` (the PM-facing Payments tab inside a client's project) had ZERO mobile handling — added a full card-view alternative to its 8-column table, gated on the same `isMobile` pattern, reusing the existing PDF/Settle/Verify/Delete action handlers. `PaymentScheduleCard.jsx` and `ProjectDetailCards.jsx`'s `ProjectEconomics` panel had their hardcoded 3-and-4-column grids given the same mobile branch. Do not remove the `isMobile` branches or revert the ledger back to table-only — the underlying wide-table/fixed-width markup was never designed to fit a phone screen. |
| 64 | Admin desktop pages had a large empty gutter between the sidebar and the page content | `src/pages/admin/AdminLayout.jsx` — `<main>` element (~line 309), `src/index.css` `.lx-main-admin` desktop media query (~line 341) | On wide screens every admin page (Client Directory, Project Board, Payments, etc.) showed a large empty strip right after the sidebar. First pass wrongly diagnosed this as the content wrapper's `maxWidth:1400, margin:'0 auto'` centering — fixing that (dropping to `margin:0` + `32px` padding) had no visible effect, which was the tell that the real bug was elsewhere. **Actual root cause:** the `<aside>` sidebar uses `position: sticky` (not `fixed`/`absolute`), so inside the parent `display:flex` row it is a normal, space-occupying flex child — the 280px it needs is already reserved by ordinary flex layout. But `<main>` (its flex sibling) ALSO had an inline `marginLeft: 280` applied on top, and `.lx-main-admin`'s desktop media query in `index.css` added a further `margin-left: 80px` — both entirely redundant once the sidebar stopped being taken out of flow. The three numbers stacked (280 flex position + 280 inline margin + 80 CSS margin) produced the huge gap. Fixed by deleting `marginLeft` from `<main>`'s inline style entirely (kept `flex:1, minWidth:0` — the `minWidth:0` prevents flex-child overflow) and deleting the `margin-left: 80px` from the CSS media query. Content now sits flush against the sidebar exactly once, with only the intentional `32px` inner padding from the previous pass. Do not re-add any `margin-left`/`marginLeft` to `<main>` or `.lx-main-admin` — with a `position: sticky` sidebar, the flex layout alone is sufficient. |

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
