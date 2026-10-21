import { z } from 'zod';

export const paymentSchema = z.object({
  invoiceId: z.string().min(1, 'Invoice is required'),
  amount: z.number().positive('Payment amount must be greater than zero'),
  paymentDate: z.string().optional(),
  paymentMethod: z.enum(['Cash', 'Bank Transfer', 'UPI', 'Cheque', 'Card', 'Other']).default('Bank Transfer'),
  transactionReference: z.string().optional().default(''),
  notes: z.string().optional().default('')
});

export const reversePaymentSchema = z.object({
  reason: z.string().min(3, 'Reversal reason is required')
});
