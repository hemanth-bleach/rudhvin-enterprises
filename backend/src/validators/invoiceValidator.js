import { z } from 'zod';

export const lineItemSchema = z.object({
  serialNumber: z.number().optional(),
  description: z.string().min(1, 'Item description is required'),
  hsnSac: z.string().min(1, 'HSN/SAC code is required'),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unit: z.string().default('PCS'),
  rate: z.number().min(0, 'Rate must be non-negative'),
  discountPercent: z.number().min(0).max(100).default(0),
  taxRate: z.number().refine(val => [0, 5, 12, 18, 28].includes(val), {
    message: 'Tax rate must be 0, 5, 12, 18, or 28%'
  }).default(0)
});

export const createInvoiceSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  invoiceDate: z.string().optional(),
  dueDate: z.string().optional(),
  paymentTerms: z.string().default('Due on Receipt'),
  notes: z.string().optional(),
  poNumber: z.string().optional(),
  referenceNumber: z.string().optional(),
  discount: z.number().min(0).optional().default(0),
  items: z.array(lineItemSchema).min(1, 'At least one line item is required'),
  status: z.enum(['draft', 'issued']).default('issued')
});

export const updateInvoiceSchema = z.object({
  customerId: z.string().optional(),
  invoiceDate: z.string().optional(),
  dueDate: z.string().optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
  poNumber: z.string().optional(),
  referenceNumber: z.string().optional(),
  discount: z.number().min(0).optional(),
  items: z.array(lineItemSchema).optional()
});
