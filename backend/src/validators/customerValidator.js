import { z } from 'zod';

export const customerSchema = z.object({
  name: z.string().trim().min(1, 'Customer name is required'),
  organization: z.string().optional().nullable().transform(v => (v || '').trim()),
  billingAddress: z.string().trim().min(1, 'Billing address is required'),
  shippingAddress: z.string().optional().nullable().transform(v => (v || '').trim()),
  gstin: z.string().optional().nullable().transform(v => (v || '').trim().toUpperCase()).refine(
    val => !val || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(val),
    { message: 'Invalid GSTIN format (must be 15 alphanumeric characters, e.g. 37DGBPV1007RIZU)' }
  ),
  phone: z.string().optional().nullable().transform(v => (v || '').trim()),
  email: z.string().optional().nullable().transform(v => (v || '').trim().toLowerCase()).refine(
    val => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
    { message: 'Invalid email address' }
  ),
  state: z.string().optional().default('Andhra Pradesh'),
  stateCode: z.string().optional().default('37'),
  contactPerson: z.string().optional().nullable().transform(v => (v || '').trim())
});
