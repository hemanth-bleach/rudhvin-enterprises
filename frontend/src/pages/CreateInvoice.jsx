import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Trash2,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Download,
  Printer,
  Maximize2,
  Eye,
  FileCheck
} from 'lucide-react';
import api from '../api/axios';
import { formatINR, numberToWords } from '../utils/formatters';
import InvoiceDocument from '../components/InvoiceDocument';
import CustomerModal from '../components/CustomerModal';
import toast from 'react-hot-toast';

export default function CreateInvoice() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [currentStep, setCurrentStep] = useState(1);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState(null);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [invoiceNumber, setInvoiceNumber] = useState('RU002');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [paymentTerms, setPaymentTerms] = useState('Due on Receipt');
  const [notes, setNotes] = useState('');
  const [poNumber, setPoNumber] = useState('');

  // Items State (defaults with reference test item)
  const [items, setItems] = useState([
    {
      serialNumber: 1,
      description: 'Urinal Cubes',
      hsnSac: '3307',
      quantity: 30,
      unit: 'PCS',
      rate: 175,
      discountPercent: 0,
      taxRate: 0
    }
  ]);

  const [discountAmount, setDiscountAmount] = useState(0);

  // Fetch customers
  const { data: customers = [] } = useQuery({
    queryKey: ['customersList'],
    queryFn: async () => {
      const res = await api.get('/customers?limit=100');
      return res.data.data || [];
    }
  });

  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ['productsList'],
    queryFn: async () => {
      const res = await api.get('/products?activeOnly=true');
      return res.data.data || [];
    }
  });

  // Fetch company settings
  const { data: company } = useQuery({
    queryKey: ['companySettings'],
    queryFn: async () => {
      const res = await api.get('/settings/company');
      return res.data.data || {};
    }
  });

  // Fetch peek invoice number
  const { data: peekData, refetch: refetchPeek } = useQuery({
    queryKey: ['peekInvoiceNumber'],
    queryFn: async () => {
      const res = await api.get('/invoices/peek-number');
      return res.data.data;
    }
  });

  useEffect(() => {
    if (peekData?.nextNumber) {
      setInvoiceNumber(peekData.nextNumber);
    }
  }, [peekData]);

  // Set default customer if available
  useEffect(() => {
    if (customers.length > 0 && !selectedCustomerId) {
      setSelectedCustomerId(customers[0]._id);
      setSelectedCustomer(customers[0]);
    }
  }, [customers, selectedCustomerId]);

  const handleCustomerSelect = (id) => {
    setSelectedCustomerId(id);
    const found = customers.find(c => c._id === id);
    setSelectedCustomer(found || null);
  };

  // Line item handlers
  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      {
        serialNumber: prev.length + 1,
        description: '',
        hsnSac: '',
        quantity: 1,
        unit: 'PCS',
        rate: 0,
        discountPercent: 0,
        taxRate: 0
      }
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) {
      toast.error('Invoice must contain at least one line item');
      return;
    }
    setItems(prev => prev.filter((_, idx) => idx !== index).map((item, idx) => ({ ...item, serialNumber: idx + 1 })));
  };

  const handleItemChange = (index, field, value) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: (field === 'quantity' || field === 'rate' || field === 'taxRate' || field === 'discountPercent')
          ? Number(value)
          : value
      };
      return updated;
    });
  };

  const handleSelectProduct = (index, productId) => {
    const prod = products.find(p => p._id === productId);
    if (!prod) return;
    setItems(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        description: prod.name + (prod.description ? ` - ${prod.description}` : ''),
        hsnSac: prod.hsnSac,
        unit: prod.unit || 'PCS',
        rate: prod.defaultRate,
        taxRate: prod.defaultTaxRate || 0
      };
      return updated;
    });
  };

  // Live Calculations for Preview and Form
  const calculateTotals = () => {
    let subtotal = 0;
    let totalTax = 0;

    const calculatedItems = items.map((item, idx) => {
      const qty = Number(item.quantity) || 0;
      const rate = Number(item.rate) || 0;
      const lineSubtotal = qty * rate;
      const disc = (lineSubtotal * (Number(item.discountPercent) || 0)) / 100;
      const taxable = lineSubtotal - disc;
      const tax = (taxable * (Number(item.taxRate) || 0)) / 100;
      const total = taxable + tax;

      subtotal += lineSubtotal;
      totalTax += tax;

      return {
        ...item,
        serialNumber: idx + 1,
        totalAmount: total
      };
    });

    const disc = Number(discountAmount) || 0;
    const taxableAmount = Math.max(0, subtotal - disc);
    const grandTotal = taxableAmount + totalTax;

    const isInterState = Boolean(
      company?.stateCode &&
      selectedCustomer?.stateCode &&
      String(company.stateCode) !== String(selectedCustomer.stateCode)
    );

    const primaryTaxRate = calculatedItems.reduce((max, i) => Math.max(max, i.taxRate || 0), 0);

    return {
      items: calculatedItems,
      subtotal,
      totalDiscount: disc,
      taxableAmount,
      totalTax,
      grandTotal,
      taxBreakdown: {
        isInterState,
        taxRate: primaryTaxRate,
        cgstRate: isInterState ? 0 : primaryTaxRate / 2,
        cgstAmount: isInterState ? 0 : totalTax / 2,
        sgstRate: isInterState ? 0 : primaryTaxRate / 2,
        sgstAmount: isInterState ? 0 : totalTax / 2,
        igstRate: isInterState ? primaryTaxRate : 0,
        igstAmount: isInterState ? totalTax : 0,
        totalTax
      }
    };
  };

  const totals = calculateTotals();

  // Synthetic invoice document object for live preview
  const previewInvoiceData = {
    invoiceNumber: invoiceNumber || 'RU002',
    invoiceDate: invoiceDate,
    dueDate: dueDate,
    paymentTerms: paymentTerms,
    poNumber: poNumber,
    sellerSnapshot: company || {
      companyName: 'RUDHVIN ENTERPRISES',
      address: 'D.No.9-6-105/1/3, 2nd Floor, 1st Portion, Mangapuram Colony, Near Kalabharathi, Sivajipalem, LB Colony, Visakhapatnam - 530017.',
      phone: '7075708933',
      gstin: '37DGBPV1007RIZU',
      bankDetails: {
        accountNumber: '143201000000719',
        ifscCode: 'KVBL0001432',
        accountHolderName: 'RUDHVIN ENTERPRISES',
        bankName: 'Karur Vysya Bank'
      },
      authorizedSignatory: 'Rudhvin Enterprises',
      email: 'rudhvinenterprises@gmail.com',
      mobile: '+91 9652496933'
    },
    customerSnapshot: selectedCustomer || {
      organization: 'EMPLOYEES PROVIDENT FUND ORGANISATION',
      billingAddress: 'BESIDE GST. OFFICE, OPP RYTU BAZAR\nMORAMPUDI JUNCTION, RAJAHMUNDRY-533107\nEAST GODAVARI, ANDHRA PRADESH , INDIA',
      phone: '0883-2470532'
    },
    lineItems: totals.items,
    subtotal: totals.subtotal,
    totalDiscount: totals.totalDiscount,
    taxableAmount: totals.taxableAmount,
    taxBreakdown: totals.taxBreakdown,
    grandTotal: totals.grandTotal,
    amountInWords: numberToWords(totals.grandTotal)
  };

  // Submit invoice (draft or issued)
  const handleSaveInvoice = async (statusToSet = 'issued') => {
    if (!selectedCustomerId) {
      toast.error('Please select a customer');
      setCurrentStep(1);
      return;
    }

    if (items.some(i => !i.description.trim() || !i.hsnSac.trim() || i.quantity <= 0)) {
      toast.error('Please ensure all items have a description, HSN/SAC, and quantity > 0');
      setCurrentStep(2);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customerId: selectedCustomerId,
        invoiceDate,
        dueDate,
        paymentTerms,
        notes,
        poNumber,
        discount: Number(discountAmount) || 0,
        items: items.map(i => ({
          description: i.description.trim(),
          hsnSac: i.hsnSac.trim(),
          quantity: Number(i.quantity),
          unit: i.unit || 'PCS',
          rate: Number(i.rate),
          discountPercent: Number(i.discountPercent) || 0,
          taxRate: Number(i.taxRate) || 0
        })),
        status: statusToSet
      };

      const res = await api.post('/invoices', payload);
      if (res.data.success) {
        setCreatedInvoice(res.data.data);
        toast.success(res.data.message || 'Invoice processed successfully');
        queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        queryClient.invalidateQueries({ queryKey: ['recentInvoices'] });
        queryClient.invalidateQueries({ queryKey: ['recentActivity'] });
        setCurrentStep(4);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPdf = async (id, num) => {
    try {
      toast.loading('Downloading PDF...', { id: 'pdf-dl' });
      const res = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${num}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success('Downloaded PDF!', { id: 'pdf-dl' });
    } catch (err) {
      toast.error('Failed to download PDF', { id: 'pdf-dl' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Stepper Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Create New Invoice</h1>
          <p className="text-xs text-slate-500 font-medium">Issue GST compliant invoices with real-time preview</p>
        </div>

        {/* Stepper Wizard Bar */}
        <div className="flex items-center gap-2">
          {[
            { num: 1, label: 'Customer Details' },
            { num: 2, label: 'Add Items' },
            { num: 3, label: 'Review' },
            { num: 4, label: 'Generate' }
          ].map((s, idx) => (
            <React.Fragment key={s.num}>
              <div
                onClick={() => currentStep < 4 && setCurrentStep(s.num)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  currentStep === s.num
                    ? 'bg-blue-600 text-white shadow-xs'
                    : currentStep > s.num
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                  currentStep === s.num ? 'bg-white text-blue-600' : currentStep > s.num ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'
                }`}>
                  {currentStep > s.num ? '✓' : s.num}
                </span>
                <span className="hidden md:inline">{s.label}</span>
              </div>
              {idx < 3 && <div className="w-4 h-0.5 bg-slate-200" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Main Split Layout: Left Form Steps, Right Live Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Side: Steps (7 columns on large screens) */}
        <div className="xl:col-span-7 space-y-6">
          {/* STEP 1: Customer Details */}
          {currentStep === 1 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900">Customer Details</h2>
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(true)}
                  className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-xs transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add New</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Customer *
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-hidden"
                >
                  <option value="">-- Choose an existing customer --</option>
                  {customers.map(c => (
                    <option key={c._id} value={c._id}>
                      {c.name} {c.organization ? `(${c.organization})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCustomer && (
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Customer / Organization Name
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={selectedCustomer.organization || selectedCustomer.name}
                      className="w-full px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Billing Address
                    </label>
                    <textarea
                      readOnly
                      rows="3"
                      value={selectedCustomer.billingAddress}
                      className="w-full px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-700"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        GSTIN
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={selectedCustomer.gstin || 'N/A'}
                        className="w-full px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={selectedCustomer.phone || 'N/A'}
                        className="w-full px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-700"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => navigate('/invoices')}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedCustomerId) {
                      toast.error('Please choose or create a customer');
                      return;
                    }
                    setCurrentStep(2);
                  }}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-all"
                >
                  <span>Next: Add Items</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Invoice Items */}
          {currentStep === 2 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900">Invoice Items</h2>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-xs transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Item</span>
                </button>
              </div>

              {/* Items List */}
              <div className="space-y-4">
                {items.map((item, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 relative group space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">Item #{idx + 1}</span>
                      <div className="flex items-center gap-2">
                        {products.length > 0 && (
                          <select
                            onChange={(e) => handleSelectProduct(idx, e.target.value)}
                            defaultValue=""
                            className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-600"
                          >
                            <option value="" disabled>Autofill from Product Catalog...</option>
                            {products.map(p => (
                              <option key={p._id} value={p._id}>{p.name} (₹{p.defaultRate})</option>
                            ))}
                          </select>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-md"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-8">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Description *</label>
                        <input
                          type="text"
                          required
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          placeholder="e.g. Urinal Cubes"
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                      <div className="sm:col-span-4">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">HSN/SAC *</label>
                        <input
                          type="text"
                          required
                          value={item.hsnSac}
                          onChange={(e) => handleItemChange(idx, 'hsnSac', e.target.value)}
                          placeholder="e.g. 3307"
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Quantity *</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Rate (₹) *</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.rate}
                          onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Tax Rate (%)</label>
                        <select
                          value={item.taxRate}
                          onChange={(e) => handleItemChange(idx, 'taxRate', e.target.value)}
                          className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                        >
                          <option value={0}>0% (Exempt)</option>
                          <option value={5}>5%</option>
                          <option value={12}>12%</option>
                          <option value={18}>18%</option>
                          <option value={28}>28%</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Line Total</label>
                        <div className="px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-black text-slate-800 text-right">
                          {formatINR(item.quantity * item.rate * (1 + (item.taxRate || 0) / 100))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals Summary Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-900">{formatINR(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Discount (₹):</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(Number(e.target.value))}
                    className="w-28 px-2 py-1 bg-white border border-slate-300 rounded text-right text-xs"
                  />
                </div>
                {totals.totalTax > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Tax ({totals.taxBreakdown.isInterState ? 'IGST' : 'CGST + SGST'}):</span>
                    <span className="font-semibold text-slate-900">{formatINR(totals.totalTax)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                  <span>Grand Total:</span>
                  <span className="text-blue-600 text-base">{formatINR(totals.grandTotal)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200/80">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider shrink-0 mt-0.5">Total in Words:</span>
                    <span className="text-xs font-bold text-slate-800 text-right italic leading-relaxed">
                      {numberToWords(totals.grandTotal)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (items.some(i => !i.description.trim() || !i.hsnSac.trim() || i.quantity <= 0)) {
                      toast.error('Please ensure all items have valid description, HSN/SAC, and quantity > 0');
                      return;
                    }
                    setCurrentStep(3);
                  }}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-all"
                >
                  <span>Next: Invoice Details</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Review & Invoice Details */}
          {currentStep === 3 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900">Invoice Details & Final Review</h2>
                <div className="text-xs text-slate-500 font-semibold">
                  Invoice Number: <span className="text-blue-600 font-bold">{invoiceNumber}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Invoice Number *
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={invoiceNumber}
                      className="w-full px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-blue-600"
                    />
                    <button
                      type="button"
                      onClick={() => refetchPeek()}
                      title="Refresh next sequence"
                      className="p-2 border border-slate-200 rounded-xl hover:bg-slate-100"
                    >
                      <RefreshCw className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Invoice Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Terms
                  </label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="Due on Receipt">Due on Receipt</option>
                    <option value="Net 15 Days">Net 15 Days</option>
                    <option value="Net 30 Days">Net 30 Days</option>
                    <option value="50% Advance, 50% on Delivery">50% Advance, 50% on Delivery</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Purchase Order (P.O.) Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PO-8492"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Notes / Remarks (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Delivery via Transport"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Review summary info */}
              <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-xl text-xs space-y-1.5 text-slate-700">
                <div className="font-bold text-blue-900 mb-1">Review Confirmation</div>
                <div>Billed To: <span className="font-semibold">{selectedCustomer?.organization || selectedCustomer?.name}</span></div>
                <div>Line Items: <span className="font-semibold">{items.length} items</span></div>
                <div>Final Grand Total: <span className="font-extrabold text-blue-800 text-sm">{formatINR(totals.grandTotal)}</span></div>
                <div className="pt-1.5 border-t border-blue-200/60 mt-1.5 text-blue-950">
                  <span className="font-semibold text-blue-900">Total in Words: </span>
                  <span className="font-bold italic">{numberToWords(totals.grandTotal)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleSaveInvoice('draft')}
                    className="px-4 py-2.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition-all disabled:opacity-50"
                  >
                    Save as Draft
                  </button>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleSaveInvoice('issued')}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-6 py-2.5 rounded-xl shadow-md shadow-blue-600/30 hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>{isSubmitting ? 'Issuing...' : 'Issue Invoice & Generate PDF'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Success / Generated */}
          {currentStep === 4 && createdInvoice && (
            <div className="bg-white border border-emerald-200 rounded-2xl p-8 shadow-xs text-center space-y-6 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10" />
              </div>

              <div>
                <h2 className="text-xl font-black text-slate-900">
                  Invoice {createdInvoice.invoiceNumber} {createdInvoice.status === 'draft' ? 'Saved as Draft' : 'Issued Successfully!'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Customer: <span className="font-semibold text-slate-800">{createdInvoice.customerSnapshot?.name}</span> | Grand Total: <span className="font-bold text-emerald-600">{formatINR(createdInvoice.grandTotal)}</span>
                </p>
                <p className="text-xs text-slate-600 font-medium italic mt-2 bg-slate-50 border border-slate-200 rounded-lg p-2 max-w-lg mx-auto">
                  <span className="font-semibold text-slate-700 not-italic">Total in Words: </span>
                  {createdInvoice.amountInWords || numberToWords(createdInvoice.grandTotal)}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleDownloadPdf(createdInvoice._id, createdInvoice.invoiceNumber)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Invoice</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate(`/invoices/${createdInvoice._id}`)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                >
                  <Eye className="w-4 h-4" />
                  <span>View Details</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-xl transition-all"
                >
                  <span>Return to Dashboard</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Live Invoice Preview (5 columns on large screens) */}
        <div className="xl:col-span-5 sticky top-20 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Invoice Preview</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">
                Live Sync
              </span>
            </h3>

            <button
              type="button"
              onClick={() => setShowFullPreview(true)}
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold hover:underline"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Preview Full Page</span>
            </button>
          </div>

          {/* Scaled Preview Document */}
          <div className="bg-slate-200/70 p-3 rounded-2xl border border-slate-200 overflow-hidden shadow-inner flex justify-center">
            <div className="transform scale-[0.62] origin-top transition-all -mb-80 pointer-events-none">
              <InvoiceDocument invoice={previewInvoiceData} />
            </div>
          </div>
        </div>
      </div>

      {/* Customer Modal */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSuccess={(newCust) => {
          queryClient.invalidateQueries({ queryKey: ['customersList'] });
          if (newCust?._id) {
            setSelectedCustomerId(newCust._id);
            setSelectedCustomer(newCust);
          }
        }}
      />

      {/* Full Preview Modal */}
      {showFullPreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-4xl w-full my-8 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-base">Full Page Invoice Document</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print</span>
                </button>
                <button
                  onClick={() => setShowFullPreview(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="overflow-y-auto max-h-[75vh] p-2 bg-slate-100 rounded-xl flex justify-center">
              <InvoiceDocument invoice={previewInvoiceData} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
