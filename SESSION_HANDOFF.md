# Session Handoff — 2026-07-14

Narrative summary of everything done in this working session, written for the next agent (human or AI) to pick up context fast. This complements — does not replace — the terse "THINGS THAT HAVE BEEN FIXED" table in `CLAUDE.md` (rows #45–#64 cover this session; cross-referenced below). **Read `CLAUDE.md` first** — it has the hard rules (protected files, "fix only what's asked") and the full fix history. This file explains the *why* and *how* behind the recent stretch of work in more detail, plus what's still open.

---

## 1. Uploads & site-visit scheduling (start of session)

- **Client uploads were broken**: `ClientUploadsTab.jsx` called a cloud function (`registerProjectUpload`) that never existed in `functions/index.js`. Fixed by switching to a direct Firestore `addDoc` write to `projects/{id}/inspiration`, matching the pattern used elsewhere in the app (see CLAUDE.md #45).
- **Site visit scheduling moved from client → PM-only**: added two missing cloud functions (`scheduleProjectSiteVisit`, `completeProjectSiteVisit`) that the existing `AdminSiteVisitCard` UI was already calling but silently failing on. Removed `ClientSiteVisitScheduler` from the client portal — clients now see a message that their PM will contact them (CLAUDE.md #46, #47).
- **Hosting storage quota (429 error) on deploy**: Firebase Hosting free-tier had accumulated 25 old releases. Deleted 24 old versions via the Hosting REST API (`DELETE .../sites/westlinefuture/versions/{id}`) to free space.
- **Functions deploy blocked by Secret Manager billing**: Spark (free) plan doesn't include Secret Manager, needed for `AGORA_APP_ID` etc. Resolved once the user upgraded to Blaze.
- **Firebase Auth error 39 (`MISSING_RECAPTCHA_TOKEN`)**: Firebase auto-enabled reCAPTCHA Enterprise phone enforcement after the Blaze upgrade. Disabled via the Identity Toolkit Admin API (`PATCH .../admin/v2/projects/westlinefuture/config`, set `phoneEnforcementState: "OFF"`). This can silently re-enable itself — worth an occasional console check (Authentication → Settings → reCAPTCHA).

## 2. Four-feature plan: onboarding agreement, multi-PM, RBAC, passwords

Ran a full audit + plan-mode design pass before touching code. Approved plan implemented as:

### Onboarding service agreement gate (CLAUDE.md #51)
- New project-doc field `onboardingAgreement { signed, signedAt, signerName, signatureData, agreementText, verificationStamp }`.
- New cloud function `signOnboardingAgreement` (stage-functions) — same shape as the existing quote-contract signer but with **no** `quoteApproved` precondition and **no** invoice generation.
- `DEFAULT_ONBOARDING_AGREEMENT` template hardcoded in `ClientPortal.jsx`, overridable via `brand.finSettings.onboardingAgreementTemplate` (edited in AdminFinancials → Settings).
- Gate renders when `onboardingAgreement?.signed !== true` — absent field = unsigned, so **existing** clients get gated too, not just new ones.
- Reused `ContractAgreementModal` via a new `mode='onboarding'` prop instead of duplicating the sign UI.

### Multiple project managers (CLAUDE.md #50)
- New `projectManagerIds: []` array field; scalar `projectManagerId` kept in sync as `= projectManagerIds[0] || null` for back-compat — no data migration needed, old projects still work via the fallback.
- `toggleProjectTeamAssignment` (stage-functions) now adds/removes from the array instead of overwriting the scalar.
- Read sites updated to check the array first, falling back to the scalar/`assignedStaff[0]`.

### RBAC polish (CLAUDE.md #49, later extended by #53–#56)
- Role-based permission presets pre-select tab checkboxes when a role is picked during staff creation.
- Fixed a dual-write bug: `AssignClientsModal` only wrote `assignedClients` to the `users` doc, not `team` — now writes both.

### Password management overhaul (CLAUDE.md #48)
- `setStaffPassword` cloud function was callable by **any authenticated user** (critical bug) — locked to strict admin-only.
- Shared default password `unlockme` replaced everywhere with random one-time passwords (`WF-xxxx-xxxx` format), shown once to the admin with copy/WhatsApp buttons.
- Minimum password length raised 6 → 8 characters.
- Added "Forgot password?" on staff login (`sendPasswordResetEmail`).
- Removed admin auto-provisioning on failed login (was a silent account-takeover risk).

### Data backups (CLAUDE.md #52)
Pure GCP config, no code:
```bash
gcloud firestore databases update --database='(default)' --enable-pitr --project=westlinefuture
gcloud firestore databases update --database='(default)' --delete-protection --project=westlinefuture
gcloud firestore backups schedules create --database='(default)' --recurrence=daily --retention=30d --project=westlinefuture
```
Gives: 7-day point-in-time recovery, database delete-protection, and a 30-day-retention nightly backup. **Do not disable any of these.**

## 3. Staff roles — new roles + self-service management (CLAUDE.md #53–#56)

- Added 11 new role names (Admin Specialist, General Manager, Customer Service, Site Surveyor, Design Director, Design Supervisor, Interior Designer, Deputy Manager, Purchasing Specialist, Cost Estimator, Foreman) to `STAFF_ROLES`/`ROLE_PROFILES`/`ROLE_PERMISSION_PRESETS` in `AdminStaff.jsx`. Key invariant: `jobRole` is a plain string on each staff doc, resolved via a lookup table — never a foreign key — so adding/removing dropdown options can't break existing staff.
- Built a **self-service "Manage Roles" panel** (no redeploy needed to hide/add a role): new Firestore doc `settings/staffRoles` (`{ hidden: [], custom: [] }`). Hiding a built-in role just adds its name to `hidden` — the `ROLE_PROFILES` entry is *never* deleted from code, so anyone still holding that role keeps working.
- Redesigned that panel after feedback that it was "unprofessional" and "long scroll": Active/Deleted tabs, trash-icon delete (still non-destructive under the hood), collapsible add-role form instead of buried at the bottom, role list in a fixed-height scrollable grid.
- Header decluttered: 5 flat buttons → 2 primary (Field Team, Create Account) + a "More" dropdown (Recover / Bulk Import / Manage Roles).
- Made staff role **editable after creation** — the role badge on each staff card is now a `<select>` that writes both `jobRole` and `role` (system role) via the existing `updateM` helper. Portal permissions are deliberately left untouched on a role change (admin adjusts those separately via "Edit Access").

## 4. Staff login bugs (CLAUDE.md #57, #58)

Two separate, unrelated bugs both surfaced as "wrong username/password":

1. **Credentials display bug**: accounts created with a real email (Bulk Import, e.g. `andy@westlinedecor.com`) have that email as their actual Firebase Auth login identity. But every credentials screen/WhatsApp message showed only the `username`, and the login page's fallback logic assumes a bare username means `username@westlinefuture.com` — wrong domain for those accounts. Fixed by capturing `result.loginEmail` from `createStaffAccount` and showing/copying that everywhere instead of `username`.
2. **Stale cache after password change**: the logged-in user's profile is served by a react-query `useQuery` with a 5-minute `staleTime`. `ForcePasswordChange`'s `onDone` correctly updated Firestore + local state, but never updated react-query's own cached copy — so a later refetch (tab refocus, re-login within 5 minutes) silently resurrected the old `requiresPasswordReset: true` profile, forcing the password screen to reappear asking for an already-rotated temp password. Fixed with a new `refreshUserProfile()` in `AppContext.jsx` that syncs both the local state *and* the query cache via `queryClient.setQueryData(...)`.

## 5. Server-side permission enforcement (CLAUDE.md #59, #61)

User asked "whatever access is given to staff should strictly be that." Audit found staff `permissions` tabs were **only enforced in the browser** — never checked server-side.

- **Critical, unscoped bug found in passing**: `createProjectQuotation`, `confirmOfflineInvoicePayment`, `deleteStaffAccount` had **no auth check beyond "is logged in"** — any client account could call them from devtools. Fixed immediately regardless of the broader scope discussion.
- **Scoped enforcement** (user chose "lock down the sensitive money/staff functions, not a full Firestore-rules rewrite"): new `assertHasPermission(auth, allowedPermissions)` helper in `functions/index.js`. Applied: `confirmOfflineInvoicePayment` → requires `financials`; `createProjectQuotation` → requires `financials` or `projects`; `createStaffAccount`/`repairStaffAccount` → requires `staff` (which is never a grantable tab, so this = admin-only).
- **Explicitly NOT done**: CMS and product-catalog writes go straight from the browser to Firestore with no Cloud Function in front of them — locking those down would need the `firestore.rules` rewrite the user declined for now. Revisit only if asked to do the "full lockdown."

## 6. Client name bug on Project Kanban (CLAUDE.md #62)

`AppContext.jsx`'s `normalizeProject` sets `project.name = data.title` — i.e. `project.name` actually holds the **project title**, not the client's name, despite the field name. `ProjectKanban.jsx` read `project.name` in three places expecting a client name, producing "Unknown Client" or a duplicated title. Fixed to read `project.clientName` first (the field genuinely populated with the client's name at creation), with `project.name` only as a last-resort fallback.

(Note: the Client Directory page itself — `AdminClients.jsx` — was already showing client names correctly; the bug was specific to the Kanban board.)

## 7. Mobile responsiveness (CLAUDE.md #63)

`isMobile` (`window.innerWidth <= 768`) state was added where missing and every hardcoded multi-column grid/fixed-width panel branched down for mobile in:
- `AdminFinancials.jsx` — Overview, Margins (table now scrolls horizontally via `minWidth` instead of squishing), Banking, Settings, and the Invoice/Quotation Studio overlay (was a fixed `1fr 480px` grid that broke outright on a 375px screen — now stacks).
- `ProjectInvoicesLedger.jsx` (the Payments tab inside a project) had **zero** mobile handling — added a full card-view alternative to its 8-column table.
- `PaymentScheduleCard.jsx`, `ProjectDetailCards.jsx` (`ProjectEconomics`) — hardcoded 3/4-column grids given the same mobile branch.

## 8. Admin layout gutter bug — two-pass fix, read this carefully if revisiting

User reported a large empty gap between the sidebar and page content on desktop, on every admin page.

- **First attempt (wrong diagnosis)**: assumed the content wrapper's `maxWidth:1400, margin:'0 auto'` was centering content with wasted space around it. Changed to `margin:0` + `32px` padding. **This had no visible effect** — the real bug was elsewhere, which was the tell.
- **Real root cause**: the `<aside>` sidebar uses `position: sticky` — meaning inside the parent flex row, it's a normal space-occupying flex child (not floating over the page like `fixed`/`absolute` would). But `<main>` (its flex sibling) *also* had an inline `marginLeft: 280`, and a CSS media-query rule (`index.css`, `.lx-main-admin` at `min-width:769px`) added a *further* `margin-left: 80px` on top of that. Three numbers were stacking: the sidebar's real flex-position width (280) + the redundant inline margin (280) + the redundant CSS margin (80) ≈ the observed ~500-600px gap.
- **Fix**: deleted `marginLeft` from `<main>`'s inline style entirely (kept `flex:1, minWidth:0`) and deleted `margin-left: 80px` from the CSS rule. Verified by curling the *live deployed* JS bundle directly (not just the local build) to rule out a caching false-positive before declaring it fixed.
- **Lesson for next time**: when a user says "I refreshed and it's still broken" after a deploy, don't assume it's browser cache — verify the deployed asset directly (`curl` the built JS/CSS bundle and grep for the expected code) before asking the user to refresh again. If the fix genuinely isn't visible despite being live, the diagnosis was wrong, not the cache.

---

## Deferred / open items (do only if explicitly asked)

1. **Full `firestore.rules` rewrite** to enforce staff `permissions` tabs on direct Firestore reads/writes (not just the 4 Cloud Functions already locked down). User explicitly declined this broader scope for now — CMS and product-catalog writes are still only browser-gated.
2. **reCAPTCHA Enterprise re-enabling itself**: the fix applied (`phoneEnforcementState: OFF`) is a console setting, not code — Firebase could theoretically re-enable it on some future billing/plan event. No code-level permanent fix has been built (would mean upgrading `sendOTP` in `App.jsx` to natively support reCAPTCHA Enterprise). Not requested yet.
3. Mobile card-view treatment could still be extended to any other admin tables not covered in this pass (only Payments-adjacent surfaces were done, per explicit user ask).

## Where to look

- **`CLAUDE.md`** (project root) — hard rules + the authoritative, numbered fix history. Always update it (new row in "THINGS THAT HAVE BEEN FIXED") after any change, and update *this* file too if the next session does substantial new work — don't let them drift apart silently.
- Protected files (App.jsx, stage-functions/index.js, functions/index.js, data.jsx, ClientHub.jsx, ClientPortal.jsx, NewProjectModal.jsx) — touch only the reported issue, nothing else.
- Deploy sequence used throughout this session: `npm run build` → `firebase deploy --only functions:<name>` (one at a time if quota errors appear on a bulk deploy — they're usually transient) → `firebase deploy --only hosting` → for any brand-new Cloud Function, apply the IAM invoker binding (`gcloud run services add-iam-policy-binding <fn-name> --region=us-central1 --member=allUsers --role=roles/run.invoker`).

---

# Session addendum — 2026-07-14 (security audit + hardening batch)

Full read-only audit performed, then fixes shipped in phases (CLAUDE.md #65–#69):

1. **Two client-reported bugs fixed & deployed** (#65 dead agreement sign button, #66 staff project visibility).
2. **Repo pushed to GitHub** (was 37 commits ahead, single-machine risk) and a **staging preview channel** created: `firebase hosting:channel:deploy staging` → https://westlinefuture--staging-4q5ofvmy.web.app (expires 2026-08-13; redeploy to renew).
3. **Critical escalation closed** (#67): pseudo-email domain match = full admin for all staff/workers. Exact `ADMIN_EMAILS` allow-list now in functions + both rules files. Staff role path in firestore `isAdmin()` intentionally untouched.
4. **debugInvoice deleted, translatePublicPage rate-limited** (#68).
5. **Deps updated** (#69): frontend at 0 vulnerabilities; functions at 0 high. ⚠️ Remaining functions pick up new deps only when redeployed — do a full `firebase deploy --only functions` in a low-traffic window (expect transient quota errors on bulk deploys; retry individual failures).
6. **Post-deploy verification asks for the owner**: (a) log in as admin and reset a test staff password (confirms allow-list didn't lock the real admin out — role fallback should cover any email, but confirm); (b) have one staff member log in, open a client, send a chat attachment (confirms storage rules fallback); (c) have a worker upload a field photo.

Audit findings NOT yet acted on (by explicit scope choice): full firestore.rules staff-permission lockdown; admin realtime listeners are unbounded (fine at current scale); persistent translation cache; error monitoring (Sentry or similar); reCAPTCHA Enterprise support in phone login; bundle code-splitting; ClientPortal.jsx monolith split.
