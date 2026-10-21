import { z } from 'zod';

export const customerSchema = z.object({
  name: z.string().min(2, 'Customer name must be at least 2 characters'),
  organization: z.string().optional().default(''),
  billingAddress: z.string().min(5, 'Billing address is required'),
  shippingAddress: z.string().optional().default(''),
  gstin: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format').optional().or(z.literal('')),
  phone: z.string().optional().default(''),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  state: z.string().default('Andhra Pradesh'),
  stateCode: z.string().default('37'),
  contactPerson: z.string().optional().default('')
});
