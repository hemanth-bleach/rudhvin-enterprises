import mongoose from 'mongoose';
import { createEmbeddedModel } from '../config/embeddedDb.js';

const companyDefaults = {
  companyName: 'RUDHVIN ENTERPRISES',
  tagline: 'Invoice Management System',
  address: 'D.No.9-6-105/1/3, 2nd Floor, 1st Portion, Mangapuram Colony, Near Kalabharathi, Sivajipalem, LB Colony, Visakhapatnam - 530017.',
  phone: '7075708933',
  mobile: '+91 9652496933',
  email: 'rudhvinenterprises@gmail.com',
  gstin: '37DGBPV1007RIZU',
  state: 'Andhra Pradesh',
  stateCode: '37',
  bankDetails: {
    bankName: 'Karur Vysya Bank',
    accountHolderName: 'RUDHVIN ENTERPRISES',
    accountNumber: '143201000000719',
    ifscCode: 'KVBL0001432',
    branch: 'Visakhapatnam'
  },
  authorizedSignatory: 'Rudhvin Enterprises',
  invoicePrefix: 'RU',
  invoiceNumberPadding: 3,
  financialYearConfig: {
    enabled: false
  },
  defaultPaymentTerms: 'Due on Receipt',
  invoiceFooter: 'Thank you for your business!',
  taxPreference: {
    intraState: true
  },
  logoUrl: ''
};

let CompanyModel;

if (process.env.MONGODB_URI && process.env.MONGODB_URI !== 'embedded') {
  const companySchema = new mongoose.Schema(
    {
      companyName: { type: String, required: true, default: companyDefaults.companyName },
      tagline: { type: String, default: companyDefaults.tagline },
      address: { type: String, default: companyDefaults.address },
      phone: { type: String, default: companyDefaults.phone },
      mobile: { type: String, default: companyDefaults.mobile },
      email: { type: String, default: companyDefaults.email },
      gstin: { type: String, default: companyDefaults.gstin },
      state: { type: String, default: companyDefaults.state },
      stateCode: { type: String, default: companyDefaults.stateCode },
      bankDetails: {
        bankName: { type: String, default: companyDefaults.bankDetails.bankName },
        accountHolderName: { type: String, default: companyDefaults.bankDetails.accountHolderName },
        accountNumber: { type: String, default: companyDefaults.bankDetails.accountNumber },
        ifscCode: { type: String, default: companyDefaults.bankDetails.ifscCode },
        branch: { type: String, default: companyDefaults.bankDetails.branch }
      },
      authorizedSignatory: { type: String, default: companyDefaults.authorizedSignatory },
      invoicePrefix: { type: String, default: companyDefaults.invoicePrefix },
      invoiceNumberPadding: { type: Number, default: companyDefaults.invoiceNumberPadding },
      financialYearConfig: { enabled: { type: Boolean, default: false } },
      defaultPaymentTerms: { type: String, default: companyDefaults.defaultPaymentTerms },
      invoiceFooter: { type: String, default: companyDefaults.invoiceFooter },
      taxPreference: { intraState: { type: Boolean, default: true } },
      logoUrl: { type: String, default: '' }
    },
    { timestamps: true }
  );

  CompanyModel = mongoose.models.Company || mongoose.model('Company', companySchema);
} else {
  CompanyModel = createEmbeddedModel('companies', companyDefaults);
}

export const Company = CompanyModel;
