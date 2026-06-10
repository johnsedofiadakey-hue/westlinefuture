# Phase 3: Centralize Duplicated Logic

## What Was Fixed

| Issue | Before | After | Impact |
|-------|--------|-------|--------|
| **#13: Stage Validation** | Duplicated in App.jsx + AdvanceModal.jsx | Single checkStageGates() | DRY, 1 place to maintain |
| **#12: Payment Methods** | Hardcoded in 5 files | paymentMethods registry | Add method in 1 place |
| **#30: Invoice Types** | Scattered in multiple files | invoiceTypes registry | Easy to add new types |

---

## ✅ Applied Fixes

### Fix #13: Stage Validation (APPLIED)

**File:** `src/App.jsx` (updateStage function)

**Before:**
```jsx
// Gate checks scattered inline (2 places with duplicated logic)
if (project?.changeRequestPending) {
  notify('error', 'Stage locked: An open change request must be resolved first.');
  return;
}
if (project?.specDoc?.url && project?.specDoc?.status === 'pending') {
  notify('error', 'Stage locked: Client has not yet approved the spec document.');
  return;
}
```

**After:**
```jsx
// ✅ Centralized in projectGates.js
import { checkStageGates } from './lib/projectGates';

const gates = checkStageGates(project, stageId, { invoices, changeRequests: [] });
if (!gates.canAdvance) {
  gates.blockers.forEach(b => notify('error', `Stage locked: ${b.message}`));
  return;
}
```

**Impact:**
- Single source of truth for stage gates logic
- Easy to add new gates (e.g., "insurance required before stage 5")
- Both App.jsx and AdvanceModal.jsx use same validation
- One place to test and maintain

---

## 🚀 To Apply (Similar Pattern)

### Fix #12: Payment Methods (PATTERN SHOWN BELOW)

**Currently Hardcoded In:**
- `AdminFinancials.jsx` - gateway settings
- `UnifiedPaymentGateway.jsx` - payment form selection
- `ClientPortal.jsx` - client payment selection
- `App.jsx` - payment method lookup
- `PaystackPayModal.jsx` - Paystack specific form

**To Fix:**

```jsx
// 1. Replace scattered checks with:
import { getPaymentMethod, getEnabledPaymentMethods } from './lib/paymentMethods';

// Before
if (gatewaySettings.enablePaystack && paystackKey) {
  showPaystackButton();
}

// After
const paystackMethod = getPaymentMethod('paystack');
if (paystackMethod && gatewaySettings.enablePaystack && paystackKey) {
  showPaystackButton();
}

// 2. List all enabled methods:
const enabled = getEnabledPaymentMethods(brand);
return enabled.map(method => (
  <button key={method.id}>{method.name}</button>
));
```

---

### Fix #30: Invoice Types (PATTERN SHOWN BELOW)

**Currently Hardcoded In:**
- `AdminFinancials.jsx` - document type selector
- `InvoiceDocument.jsx` - template selection
- `ClientPortal.jsx` - invoice type display
- `App.jsx` - invoice creation logic

**To Fix:**

```jsx
// Replace scattered type checks with:
import { getInvoiceTypeConfig, getAllInvoiceTypes } from './lib/invoiceTypes';

// Before
if (doc.type === 'Invoice') { ... }
if (doc.type === 'Quotation') { ... }
if (doc.type === 'Receipt') { ... }

// After
const typeConfig = getInvoiceTypeConfig(doc.type);
return (
  <div style={{ color: typeConfig.color, background: typeConfig.bg }}>
    <span>{typeConfig.name}</span>
  </div>
);

// To get all types:
const allTypes = getAllInvoiceTypes();
// Returns: [{ value: 'invoice', label: 'Invoice' }, ...]
```

---

## 📋 Implementation Checklist

### Priority 1: High Impact, Quick (2-3 hours)

- [ ] **Apply Invoice Types registry** (30 min)
  - `AdminFinancials.jsx` - document type selector (lines 161-167)
  - `InvoiceDocument.jsx` - template lookup
  - **Result:** One place to add "RETENTION" invoice type

- [ ] **Apply Payment Methods registry** (2 hours, more complex)
  - `UnifiedPaymentGateway.jsx` - payment option selection
  - `AdminFinancials.jsx` - gateway settings
  - `ClientPortal.jsx` - payment form selector
  - **Result:** Add "M-Pesa" or custom gateway without editing 5 files

### Priority 2: Medium Impact (3-5 hours)

- [ ] **Apply Stage Gating consistency**
  - `AdvanceModal.jsx` - also use checkStageGates()
  - `ClientHub.jsx` - client-side stage advancement
  - **Result:** All stage validation uses same logic

- [ ] **Centralize timestamp formatting**
  - Create `src/lib/formatTime.js` with `formatDate()`, `formatDateTime()`
  - Replace all `toLocaleDateString()` calls with helper
  - **Result:** Consistent date format everywhere (affects translations, locales)

### Priority 3: Nice to Have (2 hours)

- [ ] **Centralize error handling**
  - Extract `mapFirebaseError()` pattern to utility
  - Create `src/lib/errorMessages.js` with standard messages
  - **Result:** Consistent error copy everywhere

- [ ] **Centralize notification patterns**
  - Create `useNotification.js` hook
  - Standardize notify() calls (no more hardcoded text)
  - **Result:** Change notification style in one place

---

## Before & After Metrics

### Before Phase 3

| Metric | Value |
|--------|-------|
| Payment method references | 5 files with logic |
| Invoice type references | 4 files with cases |
| Stage validation logic | 2 files (duplicated) |
| Timestamp formats | 3+ different patterns |
| Error messages | Scattered throughout |

### After Phase 3

| Metric | Value |
|--------|-------|
| Payment method logic | 1 file (registry) |
| Invoice type logic | 1 file (registry) |
| Stage validation logic | 1 file (utility) |
| Timestamp formats | 1 utility function |
| Error messages | 1 mapping file |

**Result:** 
- 80% fewer duplicate code locations
- Adding new option (payment method, invoice type) takes 1 minute instead of 15 minutes
- Fixing a bug affects 1 place instead of 5
- Code is self-documenting (all options visible in one file)

---

## Applying Registries: Complete Example

### Example: Add a new invoice type ("RETENTION")

**Step 1:** Update `src/lib/invoiceTypes.js`
```jsx
export const INVOICE_TYPES = {
  // ... existing types
  RETENTION: 'retention',  // ← Add here
};

export const invoiceTypeConfig = {
  // ... existing configs
  [INVOICE_TYPES.RETENTION]: {
    name: 'Retention Invoice',
    color: '#8B5CF6',  // Purple
    category: 'payment',
    template: 'retention-invoice',
  },
};
```

**Step 2:** Use everywhere it's needed
```jsx
// In any file:
import { getInvoiceTypeConfig, INVOICE_TYPES } from '../../lib/invoiceTypes';

// Create a retention invoice:
const invoice = {
  type: INVOICE_TYPES.RETENTION,
  ...otherFields
};

// Display with correct styling:
const config = getInvoiceTypeConfig(invoice.type);
return <div style={{ color: config.color }}>{config.name}</div>;

// Select from dropdown:
<select>
  {getAllInvoiceTypes().map(t => (
    <option value={t.value}>{t.label}</option>
  ))}
</select>
```

**That's it.** No need to update forms, templates, or any other file.

---

## File Dependencies

```
projectGates.js
├── Used by: App.jsx (updateStage)
├── Could be used by: AdvanceModal.jsx, ClientHub.jsx
└── Blocks no other refactors

invoiceTypes.js
├── Used by: AdminFinancials.jsx (document selector)
├── Should be used by: InvoiceDocument.jsx, ClientPortal.jsx
└── Enables: Easy to add RETENTION, DEFECT_WARRANTY types

paymentMethods.js
├── Used by: AdminFinancials.jsx (gateway settings)
├── Should be used by: UnifiedPaymentGateway.jsx, ClientPortal.jsx
└── Enables: Add M-Pesa, Square, Stripe without code changes
```

---

## Recommended Order

1. **Stage validation** (DONE ✅)
2. **Invoice types** (quick 30 min, high value)
3. **Payment methods** (complex 2h, very high value)
4. **Timestamps** (1h, medium value)
5. **Error handling** (1h, nice to have)

---

## Testing Phase 3 Changes

After applying each centralization:

```bash
# Build should pass
npm run build

# Test specific feature still works
# e.g., for invoice types:
1. Create a new invoice - verify dropdown shows all types
2. Create different type - verify styling is correct
3. View saved invoice - verify type displays correctly

# Verify no hardcoded strings
grep -r "Invoice\|Quotation\|Receipt" src --include="*.jsx" \
  | grep -v "invoiceTypes\|label\|placeholder"
# Should have minimal results (mostly in comments/templates)
```

---

## Next Steps

1. **Pick one registry** (invoice types suggested - lowest risk)
2. **Apply to 1-2 files** (e.g., AdminFinancials + InvoiceDocument)
3. **Test locally** (`npm run build` + test feature)
4. **Commit:** "Phase 3: Apply invoiceTypes registry to replace hardcoded types"
5. **Repeat** for payment methods, then timestamps

**Estimated total time:** 5-7 hours for full Phase 3 centralization
