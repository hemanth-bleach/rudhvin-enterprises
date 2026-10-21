import { z } from 'zod';

export const productSchema = z.object({
  name: z.string().min(2, 'Product name is required'),
  description: z.string().optional().default(''),
  hsnSac: z.string().min(2, 'HSN/SAC code is required'),
  unit: z.string().default('PCS'),
  defaultRate: z.number().min(0, 'Default rate must be non-negative'),
  defaultTaxRate: z.number().refine(val => [0, 5, 12, 18, 28].includes(val), {
    message: 'Tax rate must be 0, 5, 12, 18, or 28%'
  }).default(0),
  isActive: z.boolean().default(true)
});
