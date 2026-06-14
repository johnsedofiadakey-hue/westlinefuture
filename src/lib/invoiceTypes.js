/**
 * INVOICE TYPES REGISTRY - Fixes: Issue #30 (Hard to add new invoice type)
 *
 * To add new type:
 *   export const INVOICE_TYPES = {
 *     ...existing,
 *     DEPOSIT: 'deposit',
 *   };
 */

export const INVOICE_TYPES = {
  INVOICE: 'invoice',
  QUOTATION: 'quotation',
  RECEIPT: 'receipt',
  MILESTONE: 'milestone',
  RENDERING_FEE: 'rendering_fee',
  DESIGN_FEE: 'design_fee',
  ADDON: 'addon',
  DEPOSIT: 'deposit',
  FINAL: 'final',
};

export const invoiceTypeConfig = {
  [INVOICE_TYPES.INVOICE]: {
    name: 'Invoice',
    color: '#3B82F6',
    category: 'general',
    template: 'standard-invoice',
  },
  [INVOICE_TYPES.QUOTATION]: {
    name: 'Quotation',
    color: '#8B5CF6',
    category: 'quote',
    template: 'quotation',
  },
  [INVOICE_TYPES.RECEIPT]: {
    name: 'Receipt',
    color: '#10B981',
    category: 'payment',
    template: 'receipt',
  },
  [INVOICE_TYPES.MILESTONE]: {
    name: 'Milestone Invoice',
    color: '#F59E0B',
    category: 'payment',
    template: 'milestone-invoice',
  },
  [INVOICE_TYPES.RENDERING_FEE]: {
    name: 'Rendering Fee',
    color: '#EC4899',
    category: 'addon',
    template: 'addon-invoice',
  },
  [INVOICE_TYPES.ADDON]: {
    name: 'Add-On Invoice',
    color: '#14B8A6',
    category: 'addon',
    template: 'addon-invoice',
  },
};

export const getInvoiceTypeConfig = (type) => invoiceTypeConfig[type] || invoiceTypeConfig[INVOICE_TYPES.INVOICE];
export const getAllInvoiceTypes = () => Object.keys(invoiceTypeConfig).map(key => ({ value: key, label: invoiceTypeConfig[key].name }));
