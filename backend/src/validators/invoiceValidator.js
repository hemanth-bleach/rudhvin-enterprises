import { z } from 'zod';

export const lineItemSchema = z.object({
  serialNumber: z.number().optional(),
  description: z.string().min(1, 'Item description is required'),
  hsnSac: z.string().min(1, 'HSN/SAC code is required'),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unit: z.string().default('PCS'),
  unitRate: z.number().min(0, 'Unit rate must be non-negative').optional(),
  rate: z.number().min(0, 'Rate must be non-negative').optional(),
  discountPercent: z.number().min(0).max(100).default(0).optional(),
  discountAmount: z.number().min(0).default(0).optional(),
  gstRate: z.number().refine(val => [0, 5, 12, 18, 28].includes(val), {
    message: 'GST rate must be 0, 5, 12, 18, or 28%'
  }).default(0).optional(),
  taxRate: z.number().refine(val => [0, 5, 12, 18, 28].includes(val), {
    message: 'Tax rate must be 0, 5, 12, 18, or 28%'
  }).default(0).optional()
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
  taxTreatment: z.enum(['auto', 'intra_state', 'inter_state']).optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
  poNumber: z.string().optional(),
  referenceNumber: z.string().optional(),
  discount: z.number().min(0).optional(),
  items: z.array(lineItemSchema).optional()
});
