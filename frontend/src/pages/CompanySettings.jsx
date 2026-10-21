import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Save, IndianRupee, ShieldCheck } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function CompanySettings() {
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();

  const [formData, setFormData] = useState({
    companyName: 'RUDHVIN ENTERPRISES',
    tagline: 'Invoice Management System',
    address: '',
    phone: '',
    mobile: '',
    email: '',
    gstin: '',
    state: 'Andhra Pradesh',
    stateCode: '37',
    bankDetails: {
      bankName: '',
      accountHolderName: '',
      accountNumber: '',
      ifscCode: '',
      branch: ''
    },
    authorizedSignatory: 'Rudhvin Enterprises',
    invoicePrefix: 'RU',
    invoiceNumberPadding: 3,
    defaultPaymentTerms: 'Due on Receipt',
    invoiceFooter: 'This is a computer generated invoice and does not require a physical signature.'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: company, isLoading } = useQuery({
    queryKey: ['companySettings'],
    queryFn: async () => {
      const res = await api.get('/settings/company');
      return res.data.data;
    }
  });

  useEffect(() => {
    if (company) {
      setFormData({
        companyName: company.companyName || 'RUDHVIN ENTERPRISES',
        tagline: company.tagline || 'Invoice Management System',
        address: company.address || '',
        phone: company.phone || '',
        mobile: company.mobile || '',
        email: company.email || '',
        gstin: company.gstin || '',
        state: company.state || 'Andhra Pradesh',
        stateCode: company.stateCode || '37',
        bankDetails: {
          bankName: company.bankDetails?.bankName || '',
          accountHolderName: company.bankDetails?.accountHolderName || '',
          accountNumber: company.bankDetails?.accountNumber || '',
          ifscCode: company.bankDetails?.ifscCode || '',
          branch: company.bankDetails?.branch || ''
        },
        authorizedSignatory: company.authorizedSignatory || 'Rudhvin Enterprises',
        invoicePrefix: company.invoicePrefix || 'RU',
        invoiceNumberPadding: company.invoiceNumberPadding || 3,
        defaultPaymentTerms: company.defaultPaymentTerms || 'Due on Receipt',
        invoiceFooter: company.invoiceFooter || 'This is a computer generated invoice and does not require a physical signature.'
      });
    }
  }, [company]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('bank.')) {
      const bankField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        bankDetails: {
          ...prev.bankDetails,
          [bankField]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error('Only administrators can update company settings');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.patch('/settings/company', formData);
      if (res.data.success) {
        toast.success('Company settings saved successfully');
        queryClient.invalidateQueries({ queryKey: ['companySettings'] });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Company Settings</h1>
          <p className="text-xs text-slate-500 font-medium">Business profile, bank accounts, and invoice templates</p>
        </div>

        {isAdmin && (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-xs hover:shadow transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? 'Saving...' : 'Save Settings'}</span>
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Profile Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Organization Profile</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Company Name *</label>
              <input
                type="text"
                name="companyName"
                required
                disabled={!isAdmin}
                value={formData.companyName}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tagline / Subtext</label>
              <input
                type="text"
                name="tagline"
                disabled={!isAdmin}
                value={formData.tagline}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 disabled:bg-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Business Address *</label>
            <textarea
              name="address"
              required
              rows="3"
              disabled={!isAdmin}
              value={formData.address}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 disabled:bg-slate-100 leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN</label>
              <input
                type="text"
                name="gstin"
                disabled={!isAdmin}
                value={formData.gstin}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-semibold uppercase disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Landline / Phone</label>
              <input
                type="text"
                name="phone"
                disabled={!isAdmin}
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile</label>
              <input
                type="text"
                name="mobile"
                disabled={!isAdmin}
                value={formData.mobile}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs disabled:bg-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Business Email</label>
              <input
                type="email"
                name="email"
                disabled={!isAdmin}
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
              <input
                type="text"
                name="state"
                disabled={!isAdmin}
                value={formData.state}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">State Code</label>
              <input
                type="text"
                name="stateCode"
                disabled={!isAdmin}
                value={formData.stateCode}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs disabled:bg-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Bank Details Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <IndianRupee className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Bank Account Details (Print on Invoice)</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Name</label>
              <input
                type="text"
                name="bank.bankName"
                disabled={!isAdmin}
                value={formData.bankDetails.bankName}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Account Holder Name</label>
              <input
                type="text"
                name="bank.accountHolderName"
                disabled={!isAdmin}
                value={formData.bankDetails.accountHolderName}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold disabled:bg-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Account Number</label>
              <input
                type="text"
                name="bank.accountNumber"
                disabled={!isAdmin}
                value={formData.bankDetails.accountNumber}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">IFSC Code</label>
              <input
                type="text"
                name="bank.ifscCode"
                disabled={!isAdmin}
                value={formData.bankDetails.ifscCode}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono uppercase font-semibold disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Branch</label>
              <input
                type="text"
                name="bank.branch"
                disabled={!isAdmin}
                value={formData.bankDetails.branch}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs disabled:bg-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Invoice Numbering & Policy Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100">
            Invoice Preferences
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Prefix</label>
              <input
                type="text"
                name="invoicePrefix"
                disabled={!isAdmin}
                value={formData.invoicePrefix}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold uppercase disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Authorized Signatory Name</label>
              <input
                type="text"
                name="authorizedSignatory"
                disabled={!isAdmin}
                value={formData.authorizedSignatory}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Default Terms</label>
              <input
                type="text"
                name="defaultPaymentTerms"
                disabled={!isAdmin}
                value={formData.defaultPaymentTerms}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs disabled:bg-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Footer Note</label>
            <input
              type="text"
              name="invoiceFooter"
              disabled={!isAdmin}
              value={formData.invoiceFooter}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs disabled:bg-slate-100"
            />
          </div>
        </div>
      </form>
    </div>
  );
}
