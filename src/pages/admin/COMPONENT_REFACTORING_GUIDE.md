# Component Refactoring Guide

## Why Refactor Large Components?

- **AdminFinancials:** 1308 lines → 3 focused components
- **AdminCMS:** 1329 lines → 3 components  
- **ClientPortal:** 2000+ lines → 8 components

Benefits: Easier debugging, faster load, clearer responsibility, reusable pieces

---

## Example: Splitting AdminFinancials

### Current Structure (1308 lines)
```
AdminFinancials (1308 lines)
├── overview tab (100 lines)
├── sales tab (150 lines)
├── quotations tab (150 lines)
├── margins tab (80 lines)
├── banking tab (120 lines)
└── settings tab (235 lines)
```

### Target Structure
```
AdminFinancials.jsx (200 lines - orchestrator only)
├── FinanceOverview.jsx (120 lines)
├── FinanceInvoicing.jsx (180 lines - sales + quotations)
├── FinanceSettings.jsx (240 lines)
└── FinanceMargins.jsx (100 lines)
```

---

## Refactoring Pattern: FinanceSettings

### Step 1: Extract Settings Component

**File:** `src/pages/admin/FinanceSettings.jsx`

```jsx
import React from 'react';
import { Save, Settings, Zap, AlertCircle, CheckCircle2, Loader2, ExternalLink } from 'lucide-react';
import { SectionHead, FF as PFormField, SBadge } from '../../components/Shared';

/**
 * ✅ PHASE 2 FIX: Extract settings tab into focused component
 * Responsibility: Financial settings, gateway config, KPI targets
 * Input: finSettings, gatewaySettings, brand
 * Output: Calls props.syncCMS when user saves
 */
export default function FinanceSettings({
  finSettings = {},
  setFinSettings = () => {},
  gatewaySettings = {},
  updateGateway = () => {},
  saveGatewaySettings = () => {},
  testHubtelConnection = () => {},
  hubtelTest = null,
  setHubtelTest = () => {},
  gatewayLoading = false,
  notify = () => {},
  syncCMS = () => {},
}) {
  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Currency & Exchange */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="p-card" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SectionHead title="Currency & Exchange" sub="Set default currencies and live exchange rate" />
          {/* ... Currency fields (copy from AdminFinancials line 320-334) ... */}
        </div>
        <div className="p-card" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SectionHead title="Tax Configuration" sub="VAT, GST, or any applicable tax on documents" />
          {/* ... Tax fields (copy from AdminFinancials line 338-351) ... */}
        </div>
      </div>

      {/* Document Numbering */}
      {/* ... (copy from AdminFinancials line 355-363) ... */}

      {/* Bank Details & Terms */}
      {/* ... (copy from AdminFinancials line 365-376) ... */}

      {/* Gateway Settings */}
      {/* ... (copy from AdminFinancials line 418-543) ... */}

      {/* Save Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
        <button 
          onClick={() => { 
            if (syncCMS) syncCMS('finSettings', finSettings); 
            notify('success', 'Settings saved and synced'); 
          }} 
          className="p-btn-dark" 
          style={{ padding: '14px 36px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}
        >
          <Save size={16} /> Save Settings
        </button>
      </div>
    </div>
  );
}
```

### Step 2: Update Parent (AdminFinancials)

Replace `const settingsView = (...)` with component usage:

```jsx
// Before (235 lines of inline JSX)
const settingsView = (
  <div className="fade-in" style={{ ... }}>
    {/* 235 lines of settings UI */}
  </div>
);

// After (1 line)
{tab === 'settings' && (
  <FinanceSettings
    finSettings={finSettings}
    setFinSettings={setFinSettings}
    gatewaySettings={gatewaySettings}
    updateGateway={updateGateway}
    saveGatewaySettings={saveGatewaySettings}
    testHubtelConnection={testHubtelConnection}
    hubtelTest={hubtelTest}
    setHubtelTest={setHubtelTest}
    gatewayLoading={gatewayLoading}
    notify={notify}
    syncCMS={props.syncCMS}
  />
)}
```

---

## Refactoring Pattern: FinanceInvoicing

**File:** `src/pages/admin/FinanceInvoicing.jsx`

Extract sales + quotations tabs into one component (they share invoice list logic):

```jsx
/**
 * ✅ PHASE 2 FIX: Extract invoicing logic into focused component
 * Responsibility: Invoice/quotation creation, document list, payment updates
 * Input: invoices, proposals, brand, clients
 * Output: Calls props.createInvoice, props.createProposal, props.updateInvoice
 */
export default function FinanceInvoicing({
  invoices = [],
  proposals = [],
  clients = [],
  brand = {},
  tab = 'sales',
  setTab = () => {},
  // ... many more props from AdminFinancials
}) {
  // Move these from AdminFinancials:
  // - draft state
  // - blankDraft()
  // - DOC_TYPES
  // - startDocument()
  // - issueDocument()
  // - markReadMessages()
  // - showAdd state
  // - confirmDeleteItem state
  // - updatePaymentModal state

  return (
    <>
      {tab === 'sales' && (
        <div>
          {/* Revenue Ledger (sales invoices) */}
        </div>
      )}
      {tab === 'quotations' && (
        <div>
          {/* Tender Pipeline (quotes + proposals) */}
        </div>
      )}
      {/* Modal for creating/editing documents */}
      {/* Modal for payment updates */}
    </>
  );
}
```

---

## Refactoring Pattern: FinanceOverview

**File:** `src/pages/admin/FinanceOverview.jsx`

Extract dashboard KPI cards + audit log:

```jsx
/**
 * ✅ PHASE 2 FIX: Extract overview dashboard into focused component
 * Responsibility: KPI cards, transaction audit log, summary stats
 * Input: invoices, transactions, finSettings, brand
 * Output: Read-only, no state mutations
 */
export default function FinanceOverview({
  invoices = [],
  transactions = [],
  finSettings = {},
  brand = {},
}) {
  // Calculate stats (move from AdminFinancials)
  const stats = { ... };
  const formatMoney = (val) => { ... };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* KPI Cards (4 cols) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <PulseTargetCard label="VERIFIED CASH" value={...} />
        {/* ... */}
      </div>

      {/* Audit Log + Summary Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        {/* Audit log */}
        {/* Summary card */}
      </div>
    </div>
  );
}
```

---

## Implementation Checklist

### Phase 2a: Extract FinanceSettings (1-2 hours)
- [ ] Create `FinanceSettings.jsx`
- [ ] Move settings JSX from AdminFinancials (lines 315-551)
- [ ] Move state management for finSettings, gatewaySettings, hubtelTest
- [ ] Update AdminFinancials to use `<FinanceSettings />`
- [ ] Test: Settings tab still works, save button syncs
- [ ] **Result:** AdminFinancials reduces from 1308 → 1100 lines

### Phase 2b: Extract FinanceInvoicing (2-3 hours)
- [ ] Create `FinanceInvoicing.jsx`
- [ ] Move invoice/quotation list JSX (lines 781-887)
- [ ] Move document creation/editing logic
- [ ] Move draft, showAdd, confirmDeleteItem state
- [ ] Move payment modal logic
- [ ] Update AdminFinancials to use `<FinanceInvoicing />`
- [ ] Test: Can create, edit, delete invoices
- [ ] **Result:** AdminFinancials reduces from 1100 → 800 lines

### Phase 2c: Extract FinanceOverview (1 hour)
- [ ] Create `FinanceOverview.jsx`
- [ ] Move overview tab JSX (lines 707-779)
- [ ] Move stats calculation
- [ ] Move formatMoney helper
- [ ] Update AdminFinancials to use `<FinanceOverview />`
- [ ] Test: Dashboard KPI cards render correctly
- [ ] **Result:** AdminFinancials reduces from 800 → 400 lines (pure orchestrator)

### Phase 2d: Extract FinanceMargins (1 hour)
- [ ] Create `FinanceMargins.jsx`
- [ ] Move margins view JSX (lines 554-677)
- [ ] Move profit margin calculations
- [ ] Update AdminFinancials to use `<FinanceMargins />`
- [ ] **Result:** AdminFinancials reduces to 200 lines (orchestrator only)

---

## Final Result: AdminFinancials (200 lines)

```jsx
import FinanceOverview from './FinanceOverview';
import FinanceInvoicing from './FinanceInvoicing';
import FinanceMargins from './FinanceMargins';
import FinanceSettings from './FinanceSettings';

export default function AdminFinancials(props) {
  const [tab, setTab] = useState('overview');
  // ... essential state only

  const ac = props.brand?.color || 'var(--accent-secondary)';
  const TABS = [
    { id: 'overview', label: 'Dashboard', icon: <Landmark size={14}/> },
    { id: 'sales', label: 'Sales Ledger', icon: <TrendingUp size={14}/> },
    { id: 'quotations', label: 'Quotations', icon: <FileText size={14}/> },
    { id: 'margins', label: 'Margins & P&L', icon: <ArrowUpRight size={14}/> },
    { id: 'banking', label: 'Banking & Audit', icon: <ShieldCheck size={14}/> },
    { id: 'settings', label: 'Settings', icon: <Settings size={14}/> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header + Tab Nav */}
      <div style={{ ... }}>
        {/* ...header... */}
        {TABS.map(t => (...))}
      </div>

      {/* Tab Content (4 components) */}
      {tab === 'overview' && <FinanceOverview {...props} />}
      {(tab === 'sales' || tab === 'quotations') && <FinanceInvoicing {...props} tab={tab} setTab={setTab} />}
      {tab === 'margins' && <FinanceMargins {...props} />}
      {/* Banking = just show transactions table (small, keep inline) */}
      {tab === 'settings' && <FinanceSettings {...props} />}
    </div>
  );
}
```

---

## Benefits After Refactoring

| Metric | Before | After | Improvement |
|--------|--------|-------|------------|
| AdminFinancials size | 1308 lines | 200 lines | **85% smaller** |
| Component complexity | Very high | Low | Easier to understand |
| Reusability | None | High | Can use FinanceOverview in other dashboards |
| Testing | Hard | Easy | Each component testable in isolation |
| Bug fix time | 30 min (hard to locate) | 5 min (know which file) | **6x faster** |

---

## Applying This Pattern to Other Components

The same pattern applies to:

- **AdminCMS.jsx** (1329 → 200 lines)
  - Extract: CMSBranding, CMSServices, CMSProducts
  
- **AdminStaff.jsx** (1235 → 200 lines)
  - Extract: StaffList, StaffForm, RoleManager
  
- **ClientPortal.jsx** (2000+ → 400 lines)
  - Extract: ProjectsList, InvoicesList, ChatPanel, ApprovalsPanel, RenderingVault, etc.

Start with **FinanceSettings** (it's the most self-contained), then move to **FinanceInvoicing**, then **FinanceOverview**.

---

## Next Steps

1. Pick one component (e.g., FinanceSettings)
2. Follow the extraction pattern above
3. Run `npm run build` after each extraction
4. Test the feature still works
5. Commit with message: "Phase 2: Extract FinanceSettings component"
6. Repeat for other sub-components

**Estimated time for full AdminFinancials split:** 6-8 hours (can be done gradually)
