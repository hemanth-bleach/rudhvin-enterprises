import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  FileCheck,
  ChevronUp,
  ChevronDown,
  Layers,
  FileEdit
} from 'lucide-react';
import api from '../api/axios';
import { formatINR, numberToWords } from '../utils/formatters';
import InvoiceDocument from '../components/InvoiceDocument';
import CustomerModal from '../components/CustomerModal';
import toast from 'react-hot-toast';

export default function CreateInvoice() {
  const navigate = useNavigate();
  const { id: editInvoiceId } = useParams();
  const queryClient = useQueryClient();

  const isEditMode = Boolean(editInvoiceId);

  const [currentStep, setCurrentStep] = useState(1);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState(null);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [invoiceNumber, setInvoiceNumber] = useState('RU001');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [gemContractNumber, setGemContractNumber] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('37 - Andhra Pradesh');
  const [isSample, setIsSample] = useState(false);
  const [taxTreatment, setTaxTreatment] = useState('auto');
  const [isTaxInclusive, setIsTaxInclusive] = useState(true);
  const [paymentTerms, setPaymentTerms] = useState('Due on Receipt');
  const [notes, setNotes] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);

  // Items State (defaults with reference test item)
  const [items, setItems] = useState([
    {
      serialNumber: 1,
      description: 'AVISHREE 150 GSM 4 ft × 6 ft multicolour non-laminated bedsheet',
      hsnSac: '6304',
      quantity: 1,
      unit: 'piece',
      rate: 1000,
      discountPercent: 0,
      taxRate: 18,
      isTaxInclusive: true
    }
  ]);

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

  // Fetch peek invoice number (only if not editing)
  const { data: peekData, refetch: refetchPeek } = useQuery({
    queryKey: ['peekInvoiceNumber'],
    queryFn: async () => {
      const res = await api.get('/invoices/peek-number');
      return res.data.data;
    },
    enabled: !isEditMode
  });

  useEffect(() => {
    if (!isEditMode && peekData?.nextNumber) {
      setInvoiceNumber(peekData.nextNumber);
    }
  }, [peekData, isEditMode]);

  // Load existing invoice for edit mode
  const { data: existingInvoiceData, isLoading: isLoadingInvoice } = useQuery({
    queryKey: ['invoiceToEdit', editInvoiceId],
    queryFn: async () => {
      const res = await api.get(`/invoices/${editInvoiceId}`);
      return res.data.data;
    },
    enabled: isEditMode
  });

  useEffect(() => {
    if (existingInvoiceData) {
      setInvoiceNumber(existingInvoiceData.invoiceNumber);
      if (existingInvoiceData.invoiceDate) {
        setInvoiceDate(new Date(existingInvoiceData.invoiceDate).toISOString().split('T')[0]);
      }
      if (existingInvoiceData.dueDate) {
        setDueDate(new Date(existingInvoiceData.dueDate).toISOString().split('T')[0]);
      }
      setGemContractNumber(existingInvoiceData.gemContractNumber || '');
      setPlaceOfSupply(existingInvoiceData.placeOfSupply || '37 - Andhra Pradesh');
      setIsSample(Boolean(existingInvoiceData.isSample));
      setTaxTreatment(existingInvoiceData.taxTreatment || (existingInvoiceData.taxBreakdown?.isInterState ? 'inter_state' : 'auto'));
      setPaymentTerms(existingInvoiceData.paymentTerms || 'Due on Receipt');
      setNotes(existingInvoiceData.notes || '');
      setPoNumber(existingInvoiceData.poNumber || '');
      setReferenceNumber(existingInvoiceData.referenceNumber || '');
      setDiscountAmount(existingInvoiceData.totalDiscount || 0);
      if (existingInvoiceData.isTaxInclusive !== undefined) {
        setIsTaxInclusive(Boolean(existingInvoiceData.isTaxInclusive));
      }

      const custId = existingInvoiceData.customer?._id || existingInvoiceData.customer;
      if (custId) {
        setSelectedCustomerId(custId);
        setSelectedCustomer(existingInvoiceData.customerSnapshot || existingInvoiceData.customer);
      }

      const existingItems = (existingInvoiceData.items || existingInvoiceData.lineItems || []).map((it, idx) => ({
        serialNumber: it.serialNumber || idx + 1,
        description: it.description || '',
        hsnSac: it.hsnSac || '',
        quantity: Number(it.quantity) || 1,
        unit: it.unit || 'PCS',
        rate: Number(it.unitRate !== undefined ? it.unitRate : it.rate) || 0,
        discountPercent: Number(it.discountPercent) || 0,
        taxRate: Number(it.gstRate !== undefined ? it.gstRate : it.taxRate) || 0,
        isTaxInclusive: it.isTaxInclusive !== undefined ? Boolean(it.isTaxInclusive) : Boolean(existingInvoiceData.isTaxInclusive)
      }));

      if (existingItems.length > 0) {
        setItems(existingItems);
      }
    }
  }, [existingInvoiceData]);

  // Set default customer if creating new
  useEffect(() => {
    if (!isEditMode && customers.length > 0 && !selectedCustomerId) {
      setSelectedCustomerId(customers[0]._id);
      setSelectedCustomer(customers[0]);
      setPlaceOfSupply(customers[0].state ? `${customers[0].state} (${customers[0].stateCode || ''})` : '37 - Andhra Pradesh');
    }
  }, [customers, selectedCustomerId, isEditMode]);

  const handleCustomerSelect = (id) => {
    setSelectedCustomerId(id);
    const found = customers.find(c => c._id === id);
    setSelectedCustomer(found || null);
    if (found) {
      setPlaceOfSupply(found.state ? `${found.state} (${found.stateCode || ''})` : '37 - Andhra Pradesh');
    }
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
        taxRate: 18
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

  const handleMoveItem = (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === items.length - 1) return;

    setItems(prev => {
      const next = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next.map((item, idx) => ({ ...item, serialNumber: idx + 1 }));
    });
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
        hsnSac: prod.hsnSac || '',
        unit: prod.unit || 'PCS',
        rate: prod.defaultRate || 0,
        taxRate: prod.defaultTaxRate !== undefined ? prod.defaultTaxRate : 18
      };
      return updated;
    });
  };

  // Live Calculations matching Section 4
  const round = (val) => Math.round(val * 100) / 100;

  const calculateTotals = () => {
    let subtotal = 0;
    let totalTaxableValue = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    let isInterState = false;
    if (taxTreatment === 'inter_state') {
      isInterState = true;
    } else if (taxTreatment === 'intra_state') {
      isInterState = false;
    } else {
      const sellerCode = String(company?.stateCode || '37').trim();
      const posMatch = String(placeOfSupply).match(/\b(\d{2})\b/);
      const custCode = posMatch ? posMatch[1] : String(selectedCustomer?.stateCode || '37').trim();
      isInterState = Boolean(sellerCode && custCode && sellerCode !== custCode);
    }

    const calculatedItems = items.map((item, idx) => {
      const qty = Number(item.quantity) || 0;
      const unitRate = Number(item.rate) || 0;
      const gstRate = Number(item.taxRate) || 0;
      const discPercent = Number(item.discountPercent) || 0;
      const itemTaxInclusive = item.isTaxInclusive !== undefined ? Boolean(item.isTaxInclusive) : Boolean(isTaxInclusive);

      let lineGross = 0;
      let disc = 0;
      let taxableValue = 0;
      let lineGst = 0;
      let cgst = 0;
      let sgst = 0;
      let igst = 0;
      let lineTotal = 0;

      if (itemTaxInclusive) {
        // Tax-Inclusive: Rate includes GST. CGST and SGST are subtracted (minus) to calculate Taxable Value.
        lineGross = round(qty * unitRate);
        disc = round((lineGross * discPercent) / 100);
        const netInclusive = round(lineGross - disc);
        taxableValue = gstRate > 0 ? round(netInclusive / (1 + gstRate / 100)) : netInclusive;
        lineGst = round(netInclusive - taxableValue);

        if (isInterState) {
          igst = lineGst;
          totalIgst = round(totalIgst + igst);
        } else {
          cgst = round((taxableValue * (gstRate / 2)) / 100);
          sgst = round(lineGst - cgst);
          totalCgst = round(totalCgst + cgst);
          totalSgst = round(totalSgst + sgst);
        }

        lineTotal = netInclusive;
      } else {
        // Tax-Exclusive: GST is calculated on Taxable Value and added to reach Line Total.
        lineGross = round(qty * unitRate);
        disc = round((lineGross * discPercent) / 100);
        taxableValue = round(lineGross - disc);

        if (isInterState) {
          igst = round((taxableValue * gstRate) / 100);
          lineGst = igst;
          totalIgst = round(totalIgst + igst);
        } else {
          cgst = round((taxableValue * (gstRate / 2)) / 100);
          sgst = round((taxableValue * (gstRate / 2)) / 100);
          lineGst = round(cgst + sgst);
          totalCgst = round(totalCgst + cgst);
          totalSgst = round(totalSgst + sgst);
        }

        lineTotal = round(taxableValue + lineGst);
      }

      subtotal = round(subtotal + lineGross);
      totalTaxableValue = round(totalTaxableValue + taxableValue);

      return {
        ...item,
        isTaxInclusive: itemTaxInclusive,
        serialNumber: idx + 1,
        unitRate: unitRate,
        rate: unitRate,
        taxableValue: taxableValue,
        taxableAmount: taxableValue,
        cgstAmount: cgst,
        sgstAmount: sgst,
        igstAmount: igst,
        gstAmount: lineGst,
        taxAmount: lineGst,
        lineTotal: lineTotal,
        totalAmount: lineTotal
      };
    });

    const totalGst = round(isInterState ? totalIgst : totalCgst + totalSgst);
    const disc = Number(discountAmount) || 0;
    const grandTotal = round(totalTaxableValue + totalGst - disc);
    const primaryTaxRate = calculatedItems.reduce((max, i) => Math.max(max, i.taxRate || 0), 0);

    return {
      items: calculatedItems,
      subtotal,
      totalDiscount: disc,
      taxableValue: totalTaxableValue,
      taxableAmount: totalTaxableValue,
      totalGst,
      cgstAmount: totalCgst,
      sgstAmount: totalSgst,
      igstAmount: totalIgst,
      grandTotal,
      taxBreakdown: {
        isInterState,
        taxTreatment: isInterState ? 'inter_state' : 'intra_state',
        taxRate: primaryTaxRate,
        cgstRate: isInterState ? 0 : round(primaryTaxRate / 2),
        cgstAmount: totalCgst,
        sgstRate: isInterState ? 0 : round(primaryTaxRate / 2),
        sgstAmount: totalSgst,
        igstRate: isInterState ? primaryTaxRate : 0,
        igstAmount: totalIgst,
        totalTax: totalGst
      }
    };
  };

  const totals = calculateTotals();

  // Synthetic preview object matching reference invoice
  const previewInvoiceData = {
    invoiceNumber: invoiceNumber || 'RU001',
    invoiceDate: invoiceDate,
    dueDate: dueDate,
    gemContractNumber: gemContractNumber,
    placeOfSupply: placeOfSupply,
    isSample: isSample,
    isTaxInclusive: isTaxInclusive,
    paymentTerms: paymentTerms,
    poNumber: poNumber,
    sellerSnapshot: company || {
      companyName: 'RUDHVIN ENTERPRISES',
      address: 'D.No.9-6-105/1/3, 2nd Floor, 1st Portion, Mangapuram Colony, Near Kalabharathi, Sivajipalem, LB Colony, Visakhapatnam - 530017.',
      phone: '7075708933',
      gstin: '37DGBPV1007RIZU',
      email: 'rudhvinenterprises@gmail.com',
      bankDetails: {
        accountNumber: '143201000000719',
        ifscCode: 'KVBL0001432',
        accountHolderName: 'RUDHVIN ENTERPRISES',
        bankName: 'Karur Vysya Bank'
      }
    },
    customerSnapshot: selectedCustomer || {
      organization: 'EMPLOYEES PROVIDENT FUND ORGANISATION',
      billingAddress: 'BESIDE GST. OFFICE, OPP RYTU BAZAR\nMORAMPUDI JUNCTION, RAJAHMUNDRY-533107\nEAST GODAVARI, ANDHRA PRADESH , INDIA',
      phone: '0883-2470532',
      gstin: ''
    },
    items: totals.items,
    lineItems: totals.items,
    subtotal: totals.subtotal,
    totalDiscount: totals.totalDiscount,
    taxableValue: totals.taxableValue,
    taxableAmount: totals.taxableValue,
    cgstAmount: totals.cgstAmount,
    sgstAmount: totals.sgstAmount,
    igstAmount: totals.igstAmount,
    totalGst: totals.totalGst,
    taxBreakdown: totals.taxBreakdown,
    grandTotal: totals.grandTotal,
    amountInWords: numberToWords(totals.grandTotal)
  };

  // Submit invoice (create draft, issue invoice, or amend)
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
        invoiceNumber: invoiceNumber?.trim() || undefined,
        customerId: selectedCustomerId,
        invoiceDate,
        dueDate,
        gemContractNumber: gemContractNumber.trim(),
        placeOfSupply: placeOfSupply.trim(),
        isSample: Boolean(isSample),
        isTaxInclusive: Boolean(isTaxInclusive),
        taxTreatment,
        paymentTerms,
        notes,
        poNumber,
        referenceNumber,
        discount: Number(discountAmount) || 0,
        items: items.map(i => ({
          serialNumber: i.serialNumber,
          description: i.description.trim(),
          hsnSac: i.hsnSac.trim(),
          quantity: Number(i.quantity),
          unit: i.unit || 'PCS',
          rate: Number(i.rate),
          unitRate: Number(i.rate),
          discountPercent: Number(i.discountPercent) || 0,
          taxRate: Number(i.taxRate) || 0,
          gstRate: Number(i.taxRate) || 0,
          isTaxInclusive: i.isTaxInclusive !== undefined ? Boolean(i.isTaxInclusive) : Boolean(isTaxInclusive)
        })),
        status: statusToSet
      };

      let res;
      if (isEditMode) {
        res = await api.put(`/invoices/${editInvoiceId}`, payload);
      } else {
        res = await api.post('/invoices', payload);
      }

      if (res.data.success) {
        setCreatedInvoice(res.data.data);
        toast.success(res.data.message || 'Invoice processed successfully');
        queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        queryClient.invalidateQueries({ queryKey: ['invoicesList'] });
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

      if (res.data.type === 'application/json' || (res.headers['content-type'] && res.headers['content-type'].includes('application/json'))) {
        const text = await res.data.text();
        const json = JSON.parse(text);
        throw new Error(json.message || 'Server error generating PDF');
      }

      const slice = await res.data.slice(0, 5).text();
      if (!slice.startsWith('%PDF')) {
        throw new Error('Received invalid PDF format from server');
      }

      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${num}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Downloaded PDF!', { id: 'pdf-dl' });
    } catch (err) {
      console.error('PDF download error:', err);
      toast.error(err.message || 'Failed to download PDF. Try Print > Save as PDF.', { id: 'pdf-dl', duration: 4500 });
    }
  };

  return (
    <div className="space-y-6">
      {/* Stepper Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {isEditMode ? `Edit Invoice: ${invoiceNumber}` : 'Create New Invoice'}
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            {isEditMode
              ? 'Update or amend invoice details, items table, and GST configurations'
              : 'Issue GST compliant invoices with real-time calculations and PDF layout'}
          </p>
        </div>

        {/* Stepper Wizard Bar */}
        <div className="flex items-center gap-2">
          {[
            { num: 1, label: 'Invoice & Customer Info' },
            { num: 2, label: 'Items & GST' },
            { num: 3, label: 'Review & Preview' },
            { num: 4, label: 'Complete' }
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
          {/* STEP 1: Invoice Information & Customer Details */}
          {currentStep === 1 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900">Invoice Information & Header</h2>
                {!isEditMode && (
                  <button
                    type="button"
                    onClick={() => setIsCustomerModalOpen(true)}
                    className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-xs transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add New Customer</span>
                  </button>
                )}
              </div>

              {/* Sample / Test Invoice Checkbox */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-amber-900">Sample / Test Invoice Mode</div>
                  <div className="text-[11px] text-amber-700">
                    Displays &quot;SAMPLE TAX INVOICE — NOT FOR PAYMENT&quot; watermark and subtitle on document
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSample}
                    onChange={(e) => setIsSample(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>

              {/* Customer Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Customer (Bill To) *
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
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="font-bold text-slate-900 uppercase">
                    {selectedCustomer.organization || selectedCustomer.name}
                  </div>
                  <div className="text-slate-600 whitespace-pre-line text-[11px]">
                    {selectedCustomer.billingAddress}
                  </div>
                  <div className="flex flex-wrap gap-4 text-[11px] pt-1 border-t border-slate-200">
                    <span>GSTIN: <strong>{selectedCustomer.gstin || 'Unregistered'}</strong></span>
                    <span>State: <strong>{selectedCustomer.state || 'Andhra Pradesh'} ({selectedCustomer.stateCode || '37'})</strong></span>
                  </div>
                </div>
              )}

              {/* Invoice Meta Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Invoice Number *
                    </label>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                      Editable
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="e.g. RU001 or custom #..."
                      className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-blue-900 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-hidden transition-all shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await api.get('/invoices/peek-number');
                          if (res.data?.data?.nextNumber) {
                            setInvoiceNumber(res.data.data.nextNumber);
                            toast.success(`Generated: ${res.data.data.nextNumber}`);
                          }
                        } catch {
                          refetchPeek();
                        }
                      }}
                      title="Auto-generate / Reset to next sequential number"
                      className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 transition-colors shrink-0 shadow-2xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                      <span className="hidden sm:inline">Auto-generate</span>
                    </button>
                  </div>
                  <p className="text-[10.5px] text-slate-500 mt-1">
                    Enter a custom invoice number or click Auto-generate for the next sequential number.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    GeM Contract Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={gemContractNumber}
                    onChange={(e) => setGemContractNumber(e.target.value)}
                    placeholder="e.g. GEMC-5116877..."
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
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
                    Place of Supply *
                  </label>
                  <input
                    type="text"
                    required
                    value={placeOfSupply}
                    onChange={(e) => setPlaceOfSupply(e.target.value)}
                    placeholder="e.g. Andhra Pradesh (37)"
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tax Treatment
                  </label>
                  <select
                    value={taxTreatment}
                    onChange={(e) => setTaxTreatment(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="auto">Auto-detect (State Comparison)</option>
                    <option value="intra_state">Intra-state (CGST + SGST)</option>
                    <option value="inter_state">Inter-state (IGST)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Terms
                  </label>
                  <input
                    type="text"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    placeholder="Due on Receipt"
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Purchase Order (PO) / Ref #
                  </label>
                  <input
                    type="text"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    placeholder="Optional PO number"
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

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
                      toast.error('Please choose a customer');
                      return;
                    }
                    setCurrentStep(2);
                  }}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-all"
                >
                  <span>Next: Edit Items Table</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Invoice Items Table Operations */}
          {currentStep === 2 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Invoice Items Table</h2>
                  <p className="text-xs text-slate-500">6 columns matching official tax invoice reference</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-xs transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Item</span>
                </button>
              </div>

              {/* GST Calculation Mode Banner / Switch */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl mb-3 shadow-2xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#052c6d]">GST Calculation Mode:</span>
                    <span className="px-2 py-0.5 rounded-full text-[10.5px] font-black uppercase tracking-wider bg-[#052c6d] text-white">
                      {isTaxInclusive ? 'Tax-Inclusive (Minus CGST & SGST)' : 'Tax-Exclusive (Add GST)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                    {isTaxInclusive
                      ? 'Rates entered include GST. CGST and SGST are subtracted (minus) to compute Taxable Value (e.g. ₹1,000 Total → ₹847.46 Taxable + ₹76.27 CGST + ₹76.27 SGST).'
                      : 'Rates entered exclude GST. CGST and SGST are calculated on Taxable Value and added to reach Line Total.'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsTaxInclusive(true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      isTaxInclusive
                        ? 'bg-[#052c6d] text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Tax-Inclusive (Minus GST)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsTaxInclusive(false)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      !isTaxInclusive
                        ? 'bg-[#052c6d] text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Tax-Exclusive (Add GST)
                  </button>
                </div>
              </div>

              {/* Items Card List */}
              <div className="space-y-4">
                {items.map((item, idx) => {
                  const itemTaxInclusive = item.isTaxInclusive !== undefined ? Boolean(item.isTaxInclusive) : Boolean(isTaxInclusive);
                  const isInterState = totals.taxBreakdown?.isInterState;
                  let lineGross = 0;
                  let disc = 0;
                  let taxable = 0;
                  let gst = 0;
                  let total = 0;

                  if (itemTaxInclusive) {
                    lineGross = round((item.quantity || 0) * (item.rate || 0));
                    disc = round((lineGross * (item.discountPercent || 0)) / 100);
                    const netIncl = round(lineGross - disc);
                    const gstRate = item.taxRate || 0;
                    taxable = gstRate > 0 ? round(netIncl / (1 + gstRate / 100)) : netIncl;
                    gst = round(netIncl - taxable);
                    total = netIncl;
                  } else {
                    lineGross = round((item.quantity || 0) * (item.rate || 0));
                    disc = round((lineGross * (item.discountPercent || 0)) / 100);
                    taxable = round(lineGross - disc);
                    const gstRate = item.taxRate || 0;
                    const cgst = round((taxable * (gstRate / 2)) / 100);
                    const sgst = round((taxable * (gstRate / 2)) / 100);
                    gst = round(cgst + sgst);
                    total = round(taxable + gst);
                  }

                  return (
                    <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 relative group space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                            #{item.serialNumber}
                          </span>
                          <span className="text-xs font-bold text-slate-700">Line Item {idx + 1}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Reorder Buttons */}
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveItem(idx, 'up')}
                            className="p-1 text-slate-400 hover:text-blue-600 disabled:opacity-30 rounded"
                            title="Move Up"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === items.length - 1}
                            onClick={() => handleMoveItem(idx, 'down')}
                            className="p-1 text-slate-400 hover:text-blue-600 disabled:opacity-30 rounded"
                            title="Move Down"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>

                          {products.length > 0 && (
                            <select
                              onChange={(e) => handleSelectProduct(idx, e.target.value)}
                              defaultValue=""
                              className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-600 max-w-[160px]"
                            >
                              <option value="" disabled>Autofill Product...</option>
                              {products.map(p => (
                                <option key={p._id} value={p._id}>{p.name}</option>
                              ))}
                            </select>
                          )}

                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded ml-1"
                            title="Remove line item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Description & HSN */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                        <div className="sm:col-span-8">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                            Description of Goods *
                          </label>
                          <input
                            type="text"
                            required
                            value={item.description}
                            onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                            placeholder="Product or service description"
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                          />
                        </div>
                        <div className="sm:col-span-4">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                            HSN/SAC Code *
                          </label>
                          <input
                            type="text"
                            required
                            value={item.hsnSac}
                            onChange={(e) => handleItemChange(idx, 'hsnSac', e.target.value)}
                            placeholder="e.g. 6304"
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                          />
                        </div>
                      </div>

                      {/* Qty, Unit, Rate, Discount, Tax Rate */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Quantity *</label>
                          <input
                            type="number"
                            step="0.001"
                            min="0.001"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Unit</label>
                          <input
                            type="text"
                            value={item.unit || 'PCS'}
                            onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                            placeholder="PCS, piece, etc."
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                            {itemTaxInclusive ? 'Unit Rate (Incl. GST ₹) *' : 'Unit Rate (Excl. GST ₹) *'}
                          </label>
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
                          <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Discount (%)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={item.discountPercent}
                            onChange={(e) => handleItemChange(idx, 'discountPercent', e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">GST Rate (%)</label>
                          <select
                            value={item.taxRate}
                            onChange={(e) => handleItemChange(idx, 'taxRate', e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                          >
                            <option value={0}>0% (Exempt)</option>
                            <option value={5}>5%</option>
                            <option value={12}>12%</option>
                            <option value={18}>18%</option>
                            <option value={28}>28%</option>
                          </select>
                        </div>
                      </div>

                      {/* Live Calculated Row Details */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/70 text-[11px]">
                        <div>
                          <span className="text-slate-500 font-medium">Gross: </span>
                          <span className="font-bold text-slate-800">{formatINR(lineGross)}</span>
                        </div>
                        {itemTaxInclusive ? (
                          <>
                            <div>
                              <span className="text-emerald-700 font-medium">
                                Minus {isInterState ? `IGST (${item.taxRate}%)` : `CGST (${item.taxRate / 2}%) + SGST (${item.taxRate / 2}%)`}:{' '}
                              </span>
                              <span className="font-bold text-emerald-700">-{formatINR(gst)}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 font-medium">Taxable Value: </span>
                              <span className="font-extrabold text-[#052c6d]">{formatINR(taxable)}</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <span className="text-slate-500 font-medium">Taxable Value: </span>
                              <span className="font-extrabold text-[#052c6d]">{formatINR(taxable)}</span>
                            </div>
                            <div>
                              <span className="text-blue-700 font-medium">
                                + {isInterState ? `IGST (${item.taxRate}%)` : `CGST + SGST`}:{' '}
                              </span>
                              <span className="font-bold text-blue-700">+{formatINR(gst)}</span>
                            </div>
                          </>
                        )}
                        <div className="text-right">
                          <span className="text-slate-500 font-medium">Line Total: </span>
                          <span className="font-black text-blue-800 text-xs">{formatINR(total)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Real-time GST Summary Section matching reference */}
              <div className="p-4 bg-slate-50 border border-slate-300 rounded-xl space-y-2 text-xs">
                <div className="font-bold text-slate-800 text-xs border-b border-slate-200 pb-1 uppercase tracking-wider">
                  Invoice Totals Summary
                </div>

                <div className="flex justify-between text-slate-700">
                  <span className="font-semibold">1. Taxable Value:</span>
                  <span className="font-bold text-slate-900">{formatINR(totals.taxableValue)}</span>
                </div>

                {totals.taxBreakdown.isInterState ? (
                  <div className="flex justify-between text-slate-700">
                    <span>2. IGST ({totals.taxBreakdown.taxRate}%):</span>
                    <span className="font-semibold text-slate-900">{formatINR(totals.totalGst)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-slate-700">
                      <span>2. CGST ({totals.taxBreakdown.cgstRate}%):</span>
                      <span className="font-semibold text-slate-900">{formatINR(totals.cgstAmount)}</span>
                    </div>
                    <div className="flex justify-between text-slate-700">
                      <span>3. SGST ({totals.taxBreakdown.sgstRate}%):</span>
                      <span className="font-semibold text-slate-900">{formatINR(totals.sgstAmount)}</span>
                    </div>
                  </>
                )}

                <div className="flex justify-between text-slate-700">
                  <span className="font-semibold">4. Total GST:</span>
                  <span className="font-bold text-slate-900">{formatINR(totals.totalGst)}</span>
                </div>

                <div className="flex justify-between items-center text-slate-600 pt-1 border-t border-slate-200">
                  <span>Additional Discount (₹):</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(Number(e.target.value))}
                    className="w-28 px-2 py-1 bg-white border border-slate-300 rounded text-right text-xs"
                  />
                </div>

                <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t-2 border-slate-300">
                  <span>5. Total Invoice Value (inclusive of GST):</span>
                  <span className="text-blue-700 text-base">{formatINR(totals.grandTotal)}</span>
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">6. Amount in Words:</div>
                  <div className="text-xs font-extrabold text-[#1E3A8A]">
                    {numberToWords(totals.grandTotal)}
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
                  <span>Next: Review & Preview</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Review & Issue/Draft */}
          {currentStep === 3 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900">
                  {isEditMode ? 'Confirm Invoice Amendments' : 'Final Review & Issue'}
                </h2>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                  {invoiceNumber}
                </span>
              </div>

              {isEditMode && existingInvoiceData?.status !== 'draft' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                  <strong>Amendment Notice:</strong> You are amending an already issued invoice. This correction workflow will preserve audit logs and recalculate GST balances automatically.
                </div>
              )}

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Internal Notes / Comments
                  </label>
                  <textarea
                    rows="2"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional notes or remarks"
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 w-full sm:w-auto justify-center"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Items</span>
                </button>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleSaveInvoice('draft')}
                    className="flex-1 sm:flex-initial px-4 py-2.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-2xs transition-all disabled:opacity-50"
                  >
                    {isEditMode ? 'Save as Draft' : 'Save as Draft'}
                  </button>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleSaveInvoice('issued')}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-sm transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <FileCheck className="w-4 h-4" />
                    )}
                    <span>{isEditMode ? 'Save & Issue Changes' : 'Issue Invoice'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Success View */}
          {currentStep === 4 && createdInvoice && (
            <div className="bg-white border border-emerald-200 rounded-2xl p-8 shadow-xs text-center space-y-5 animate-in fade-in duration-200">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8" />
              </div>

              <div>
                <h2 className="text-xl font-black text-slate-900">
                  Invoice {createdInvoice.invoiceNumber} {createdInvoice.status === 'draft' ? 'Saved as Draft' : 'Issued Successfully!'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Tax invoice recorded in database with complete GST calculations
                </p>
              </div>

              <div className="inline-block p-4 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs space-y-1.5 min-w-[280px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Invoice Total:</span>
                  <span className="font-bold text-slate-900">{formatINR(createdInvoice.grandTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Taxable Value:</span>
                  <span className="font-semibold text-slate-800">{formatINR(createdInvoice.taxableValue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total GST:</span>
                  <span className="font-semibold text-slate-800">{formatINR(createdInvoice.totalGst)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="font-bold uppercase text-blue-600">{createdInvoice.status}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleDownloadPdf(createdInvoice._id, createdInvoice.invoiceNumber)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate(`/invoices/${createdInvoice._id}`)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Eye className="w-4 h-4" />
                  <span>View Details</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCurrentStep(1);
                    setCreatedInvoice(null);
                    setItems([
                      {
                        serialNumber: 1,
                        description: '',
                        hsnSac: '',
                        quantity: 1,
                        unit: 'PCS',
                        rate: 0,
                        discountPercent: 0,
                        taxRate: 18
                      }
                    ]);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Another</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Live A4 Document Preview (5 columns on large screens) */}
        <div className="xl:col-span-5 space-y-3 sticky top-6">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-blue-600" />
              Live A4 Invoice Preview
            </span>
            <span className="text-[11px] font-semibold text-slate-500">
              Real-time calculations
            </span>
          </div>

          <div className="bg-slate-200/60 p-2 sm:p-4 rounded-2xl border border-slate-200 overflow-x-auto shadow-inner">
            <div className="transform origin-top scale-[0.85] sm:scale-90 md:scale-95 xl:scale-100">
              <InvoiceDocument invoice={previewInvoiceData} />
            </div>
          </div>
        </div>
      </div>

      {/* Customer Modal for fast on-the-fly customer creation */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSuccess={(newCustomer) => {
          setSelectedCustomerId(newCustomer._id);
          setSelectedCustomer(newCustomer);
          if (newCustomer.state) {
            setPlaceOfSupply(`${newCustomer.state} (${newCustomer.stateCode || ''})`);
          }
          queryClient.invalidateQueries({ queryKey: ['customersList'] });
        }}
      />
    </div>
  );
}
