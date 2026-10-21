import mongoose from 'mongoose';
import { createEmbeddedModel } from '../config/embeddedDb.js';

const customerDefaults = {
  name: '',
  organization: '',
  billingAddress: '',
  shippingAddress: '',
  gstin: '',
  phone: '',
  email: '',
  state: 'Andhra Pradesh',
  stateCode: '37',
  contactPerson: '',
  isDeleted: false
};

let CustomerModel;

if (process.env.MONGODB_URI && process.env.MONGODB_URI !== 'embedded') {
  const customerSchema = new mongoose.Schema(
    {
      name: { type: String, required: true, trim: true },
      organization: { type: String, trim: true },
      billingAddress: { type: String, required: true, trim: true },
      shippingAddress: { type: String, trim: true },
      gstin: { type: String, trim: true, uppercase: true, default: '' },
      phone: { type: String, trim: true, default: '' },
      email: { type: String, trim: true, lowercase: true, default: '' },
      state: { type: String, default: 'Andhra Pradesh' },
      stateCode: { type: String, default: '37' },
      contactPerson: { type: String, trim: true, default: '' },
      isDeleted: { type: Boolean, default: false }
    },
    { timestamps: true }
  );

  CustomerModel = mongoose.models.Customer || mongoose.model('Customer', customerSchema);
} else {
  CustomerModel = createEmbeddedModel('customers', customerDefaults);
}

export const Customer = CustomerModel;
