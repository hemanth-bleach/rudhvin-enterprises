import mongoose from 'mongoose';
import { createEmbeddedModel } from '../config/embeddedDb.js';

const invoiceDefaults = {
  invoiceNumber: '',
  invoiceDate: new Date(),
  dueDate: new Date(),
  gemContractNumber: '',
  placeOfSupply: '',
  isSample: false,
  taxTreatment: 'auto',
  customer: null,
  sellerSnapshot: {},
  customerSnapshot: {},
  lineItems: [],
  items: [],
  subtotal: 0,
  totalDiscount: 0,
  taxableValue: 0,
  taxableAmount: 0,
  cgstAmount: 0,
  sgstAmount: 0,
  igstAmount: 0,
  totalGst: 0,
  taxBreakdown: {
    isInterState: false,
    taxTreatment: 'intra_state',
    taxRate: 0,
    cgstRate: 0,
    cgstAmount: 0,
    sgstRate: 0,
    sgstAmount: 0,
    igstRate: 0,
    igstAmount: 0,
    totalTax: 0,
    rateBreakdown: []
  },
  grandTotal: 0,
  amountPaid: 0,
  balanceDue: 0,
  status: 'draft',
  invoiceStatus: 'draft',
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
      quantity: { type: Number, required: true, min: 0.001 },
      unit: { type: String, default: 'PCS' },
      unitRate: { type: Number, required: true, min: 0 },
      rate: { type: Number, default: 0 },
      discountPercent: { type: Number, default: 0, min: 0, max: 100 },
      discountAmount: { type: Number, default: 0, min: 0 },
      gstRate: { type: Number, default: 0 },
      taxRate: { type: Number, default: 0 },
      taxableValue: { type: Number, required: true, default: 0 },
      taxableAmount: { type: Number, default: 0 },
      cgstRate: { type: Number, default: 0 },
      cgstAmount: { type: Number, default: 0 },
      sgstRate: { type: Number, default: 0 },
      sgstAmount: { type: Number, default: 0 },
      igstRate: { type: Number, default: 0 },
      igstAmount: { type: Number, default: 0 },
      gstAmount: { type: Number, default: 0 },
      taxAmount: { type: Number, default: 0 },
      lineTotal: { type: Number, required: true, default: 0 },
      totalAmount: { type: Number, default: 0 }
    },
    { _id: false }
  );

  const invoiceSchema = new mongoose.Schema(
    {
      invoiceNumber: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
      invoiceDate: { type: Date, required: true, default: Date.now },
      dueDate: { type: Date, required: true },
      gemContractNumber: { type: String, default: '', trim: true },
      placeOfSupply: { type: String, default: '', trim: true },
      isSample: { type: Boolean, default: false },
      taxTreatment: { type: String, enum: ['auto', 'intra_state', 'inter_state'], default: 'auto' },
      customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
      sellerSnapshot: { type: Object, default: {} },
      customerSnapshot: { type: Object, default: {} },
      lineItems: [lineItemSchema],
      items: [lineItemSchema],
      subtotal: { type: Number, required: true, default: 0 },
      totalDiscount: { type: Number, default: 0 },
      taxableValue: { type: Number, required: true, default: 0 },
      taxableAmount: { type: Number, default: 0 },
      cgstAmount: { type: Number, default: 0 },
      sgstAmount: { type: Number, default: 0 },
      igstAmount: { type: Number, default: 0 },
      totalGst: { type: Number, default: 0 },
      taxBreakdown: { type: Object, default: {} },
      grandTotal: { type: Number, required: true, default: 0 },
      amountPaid: { type: Number, default: 0 },
      balanceDue: { type: Number, required: true, default: 0 },
      status: { type: String, enum: ['draft', 'issued', 'partially_paid', 'paid', 'cancelled'], default: 'draft', index: true },
      invoiceStatus: { type: String, enum: ['draft', 'issued', 'partially_paid', 'paid', 'cancelled'], default: 'draft' },
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

  // Sync alias fields pre-save
  invoiceSchema.pre('save', function (next) {
    if (this.status) this.invoiceStatus = this.status;
    if (this.taxableValue !== undefined) this.taxableAmount = this.taxableValue;
    if (this.totalGst !== undefined && this.taxBreakdown) this.taxBreakdown.totalTax = this.totalGst;
    if (this.lineItems && !this.items?.length) this.items = this.lineItems;
    if (this.items && !this.lineItems?.length) this.lineItems = this.items;
    next();
  });

  InvoiceModel = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);
} else {
  InvoiceModel = createEmbeddedModel('invoices', invoiceDefaults);
}

export const Invoice = InvoiceModel;
