import mongoose from 'mongoose';
import { createEmbeddedModel } from '../config/embeddedDb.js';

const invoiceDefaults = {
  invoiceNumber: '',
  invoiceDate: new Date(),
  dueDate: new Date(),
  customer: null,
  sellerSnapshot: {},
  customerSnapshot: {},
  lineItems: [],
  subtotal: 0,
  totalDiscount: 0,
  taxableAmount: 0,
  taxBreakdown: {
    isInterState: false,
    taxRate: 0,
    cgstRate: 0,
    cgstAmount: 0,
    sgstRate: 0,
    sgstAmount: 0,
    igstRate: 0,
    igstAmount: 0,
    totalTax: 0
  },
  grandTotal: 0,
  amountPaid: 0,
  balanceDue: 0,
  status: 'draft',
  paymentStatus: 'unpaid',
  paymentTerms: 'Due on Receipt',
  notes: '',
  poNumber: '',
  referenceNumber: '',
  amountInWords: '',
  issuedAt: null,
  cancelledAt: null,
  cancellationReason: '',
  isDeleted: false,
  createdBy: null,
  updatedBy: null
};

let InvoiceModel;

if (process.env.MONGODB_URI && process.env.MONGODB_URI !== 'embedded') {
  const lineItemSchema = new mongoose.Schema(
    {
      serialNumber: { type: Number, required: true },
      description: { type: String, required: true, trim: true },
      hsnSac: { type: String, required: true, trim: true },
      quantity: { type: Number, required: true, min: 0.01 },
      unit: { type: String, default: 'PCS' },
      rate: { type: Number, required: true, min: 0 },
      discountPercent: { type: Number, default: 0, min: 0, max: 100 },
      discountAmount: { type: Number, default: 0, min: 0 },
      taxRate: { type: Number, default: 0, enum: [0, 5, 12, 18, 28] },
      taxableAmount: { type: Number, required: true },
      taxAmount: { type: Number, default: 0 },
      totalAmount: { type: Number, required: true }
    },
    { _id: false }
  );

  const invoiceSchema = new mongoose.Schema(
    {
      invoiceNumber: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
      invoiceDate: { type: Date, required: true, default: Date.now },
      dueDate: { type: Date, required: true },
      customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
      sellerSnapshot: { type: Object, default: {} },
      customerSnapshot: { type: Object, default: {} },
      lineItems: [lineItemSchema],
      subtotal: { type: Number, required: true, default: 0 },
      totalDiscount: { type: Number, default: 0 },
      taxableAmount: { type: Number, required: true, default: 0 },
      taxBreakdown: { type: Object, default: {} },
      grandTotal: { type: Number, required: true, default: 0 },
      amountPaid: { type: Number, default: 0 },
      balanceDue: { type: Number, required: true, default: 0 },
      status: { type: String, enum: ['draft', 'issued', 'partially_paid', 'paid', 'cancelled'], default: 'draft', index: true },
      paymentStatus: { type: String, enum: ['unpaid', 'partially_paid', 'paid'], default: 'unpaid', index: true },
      paymentTerms: { type: String, default: 'Due on Receipt' },
      notes: { type: String, default: '' },
      poNumber: { type: String, default: '' },
      referenceNumber: { type: String, default: '' },
      amountInWords: { type: String, default: '' },
      issuedAt: { type: Date },
      cancelledAt: { type: Date },
      cancellationReason: { type: String, default: '' },
      isDeleted: { type: Boolean, default: false, index: true },
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },
    { timestamps: true }
  );

  InvoiceModel = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);
} else {
  InvoiceModel = createEmbeddedModel('invoices', invoiceDefaults);
}

export const Invoice = InvoiceModel;
