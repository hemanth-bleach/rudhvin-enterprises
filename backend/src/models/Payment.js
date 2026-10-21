import mongoose from 'mongoose';
import { createEmbeddedModel } from '../config/embeddedDb.js';

const paymentDefaults = {
  invoice: null,
  invoiceNumber: '',
  customer: null,
  amount: 0,
  paymentDate: new Date(),
  paymentMethod: 'Bank Transfer',
  transactionReference: '',
  notes: '',
  status: 'completed',
  reversedAt: null,
  reversalReason: '',
  createdBy: null
};

let PaymentModel;

if (process.env.MONGODB_URI && process.env.MONGODB_URI !== 'embedded') {
  const paymentSchema = new mongoose.Schema(
    {
      invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true, index: true },
      invoiceNumber: { type: String, required: true },
      customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
      amount: { type: Number, required: true, min: 0.01 },
      paymentDate: { type: Date, required: true, default: Date.now },
      paymentMethod: { type: String, enum: ['Cash', 'Bank Transfer', 'UPI', 'Cheque', 'Card', 'Other'], default: 'Bank Transfer' },
      transactionReference: { type: String, trim: true, default: '' },
      notes: { type: String, trim: true, default: '' },
      status: { type: String, enum: ['completed', 'reversed'], default: 'completed', index: true },
      reversedAt: { type: Date },
      reversalReason: { type: String, default: '' },
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },
    { timestamps: true }
  );

  PaymentModel = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
} else {
  PaymentModel = createEmbeddedModel('payments', paymentDefaults);
}

export const Payment = PaymentModel;
