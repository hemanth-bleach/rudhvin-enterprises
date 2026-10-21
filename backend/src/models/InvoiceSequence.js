import mongoose from 'mongoose';
import { createEmbeddedModel } from '../config/embeddedDb.js';

let InvoiceSequenceModel;

if (process.env.MONGODB_URI && process.env.MONGODB_URI !== 'embedded') {
  const invoiceSequenceSchema = new mongoose.Schema(
    {
      key: { type: String, required: true, unique: true },
      prefix: { type: String, required: true, default: 'RU' },
      financialYear: { type: String, default: '' },
      currentSequence: { type: Number, default: 0 }
    },
    { timestamps: true }
  );

  InvoiceSequenceModel = mongoose.models.InvoiceSequence || mongoose.model('InvoiceSequence', invoiceSequenceSchema);
} else {
  InvoiceSequenceModel = createEmbeddedModel('invoicesequences', {
    key: 'RU',
    prefix: 'RU',
    financialYear: '',
    currentSequence: 0
  });
}

export const InvoiceSequence = InvoiceSequenceModel;
