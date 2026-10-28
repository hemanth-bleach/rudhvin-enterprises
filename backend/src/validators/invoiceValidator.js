import { z } from 'zod';

export const lineItemSchema = z.object({
  serialNumber: z.number().optional(),
  description: z.string().trim().min(1, 'Item description is required'),
  hsnSac: z.string().optional().nullable().transform(v => (v || '').trim()),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unit: z.string().optional().default('PCS'),
  unitRate: z.number().min(0, 'Unit rate must be non-negative').optional(),
  rate: z.number().min(0, 'Rate must be non-negative').optional(),
  discountPercent: z.number().min(0).max(100).default(0).optional(),
  discountAmount: z.number().min(0).default(0).optional(),
  isTaxInclusive: z.boolean().optional().default(true),
  gstRate: z.number().min(0).max(100).default(0).optional(),
  taxRate: z.number().min(0).max(100).default(0).optional()
}).refine(data => data.unitRate !== undefined || data.rate !== undefined, {
  message: 'Unit rate is required'
});

export const createInvoiceSchema = z.object({
  invoiceNumber: z.string().trim().min(1, 'Invoice number cannot be empty').optional(),
  customerId: z.string().min(1, 'Customer is required'),
  invoiceDate: z.string().optional(),
  dueDate: z.string().optional(),
  gemContractNumber: z.string().optional(),
  placeOfSupply: z.string().optional(),
  isSample: z.boolean().optional().default(false),
  isTaxInclusive: z.boolean().optional().default(true),
  taxTreatment: z.enum(['auto', 'intra_state', 'inter_state']).optional().default('auto'),
  paymentTerms: z.string().default('Due on Receipt'),
  notes: z.string().optional(),
  poNumber: z.string().optional(),
  referenceNumber: z.string().optional(),
  discount: z.number().min(0).optional().default(0),
  items: z.array(lineItemSchema).min(1, 'At least one line item is required'),
  status: z.enum(['draft', 'issued']).default('issued')
});

export const updateInvoiceSchema = z.object({
  invoiceNumber: z.string().trim().min(1, 'Invoice number cannot be empty').optional(),
  customerId: z.string().optional(),
  invoiceDate: z.string().optional(),
  dueDate: z.string().optional(),
  gemContractNumber: z.string().optional(),
  placeOfSupply: z.string().optional(),
  isSample: z.boolean().optional(),
  isTaxInclusive: z.boolean().optional().default(true),
  taxTreatment: z.enum(['auto', 'intra_state', 'inter_state']).optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
  poNumber: z.string().optional(),
  referenceNumber: z.string().optional(),
  discount: z.number().min(0).optional(),
  items: z.array(lineItemSchema).optional()
});
