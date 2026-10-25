import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  Plus,
  Download,
  Eye,
  Trash2,
  IndianRupee,
  Calendar,
  FileSpreadsheet,
  XCircle,
  RefreshCw,
  CheckCircle2,
  FileText,
  Edit,
  ArrowUpDown
} from 'lucide-react';
import api from '../api/axios';
import { formatINR, formatDate, getStatusBadge, numberToWords } from '../utils/formatters';
import RecordPaymentModal from '../components/RecordPaymentModal';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function AllInvoices() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);

  // Fetch Customers for customer dropdown filter
  const { data: customerOptions = [] } = useQuery({
    queryKey: ['customersDropdown'],
    queryFn: async () => {
      const res = await api.get('/customers?limit=100');
      return res.data.data || [];
    }
  });

  // Fetch Invoices
  const {
    data: invoiceData,
    isLoading,
    isFetching,
    refetch
  } = useQuery({
    queryKey: ['invoicesList', search, statusFilter, paymentFilter, customerFilter, startDate, endDate, sortBy, sortOrder, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (paymentFilter !== 'all') params.append('paymentStatus', paymentFilter);
      if (customerFilter !== 'all') params.append('customerId', customerFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('sortBy', sortBy);
      params.append('order', sortOrder);
      params.append('page', page);
      params.append('limit', limit);

      const res = await api.get(`/invoices?${params.toString()}`);
      return res.data;
    },
    keepPreviousData: true
  });

  const invoices = invoiceData?.data || [];
  const totalPages = invoiceData?.totalPages || 1;
  const total = invoiceData?.total || 0;

  // Clear filters
  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setPaymentFilter('all');
    setCustomerFilter('all');
    setStartDate('');
    setEndDate('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPage(1);
    setSearchParams({});
  };

  // Toggle column sort
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  // Download PDF
  const handleDownloadPdf = async (id, num) => {
    try {
      toast.loading(`Downloading ${num}.pdf...`, { id: 'pdf-dl' });
      const res = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });

      if (res.data.type === 'application/json' || (res.headers['content-type'] && res.headers['content-type'].includes('application/json'))) {
        const text = await res.data.text();
        const json = JSON.parse(text);
        throw new Error(json.message || 'Server error generating PDF');
      }

      let isPdf = false;
      try {
        if (res.data instanceof Blob) {
          const slice = await res.data.slice(0, 5).text();
          isPdf = slice.startsWith('%PDF');
        } else {
          isPdf = true;
        }
      } catch (e) {
        isPdf = true;
      }

      if (!isPdf) {
        throw new Error('Received invalid PDF format from server');
      }

      const safeName = String(num || 'invoice').replace(/[/\\:*?"<>|]/g, '_');
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${safeName}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(`Downloaded ${safeName}.pdf!`, { id: 'pdf-dl' });
    } catch (err) {
      console.error('PDF download error:', err);
      toast.error(err.message || 'Failed to download PDF. Open invoice details and click Print > Save as PDF.', { id: 'pdf-dl', duration: 4500 });
    }
  };

  // Cancel invoice
  const handleCancelInvoice = async (id, num) => {
    const reason = window.prompt(`Please enter cancellation reason for invoice ${num}:`, 'Order cancelled by customer');
    if (!reason) return;

    try {
      await api.post(`/invoices/${id}/cancel`, { reason });
      toast.success(`Invoice ${num} cancelled`);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel invoice');
    }
  };

  const handleDeleteInvoice = async (id, num) => {
    if (!window.confirm(`Are you sure you want to delete invoice ${num}? This action cannot be undone.`)) {
      return;
    }
    try {
      await api.delete(`/invoices/${id}?permanent=true`);
      toast.success(`Invoice ${num} deleted successfully`);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['recentInvoices'] });
      queryClient.invalidateQueries({ queryKey: ['peekInvoiceNumber'] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete invoice');
    }
  };

  const handlePurgeOldInvoices = async () => {
    if (!window.confirm('Are you sure you want to delete ALL old invoices and reset the invoice numbering sequence? This will remove all old test invoices.')) {
      return;
    }
    try {
      toast.loading('Deleting old invoices...', { id: 'purge-toast' });
      const res = await api.post('/invoices/purge-old');
      toast.success(res.data?.message || 'Old invoices deleted successfully', { id: 'purge-toast' });
      refetch();
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['recentInvoices'] });
      queryClient.invalidateQueries({ queryKey: ['peekInvoiceNumber'] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete old invoices', { id: 'purge-toast' });
    }
  };

  // Export CSV matching exact requested columns
  const handleExportCsv = async () => {
    try {
      toast.loading('Preparing CSV export...', { id: 'csv-dl' });
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (paymentFilter !== 'all') params.append('paymentStatus', paymentFilter);
      if (customerFilter !== 'all') params.append('customerId', customerFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('exportCsv', 'true');

      const res = await api.get(`/invoices?${params.toString()}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Rudhvin_Invoices_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success('CSV exported successfully!', { id: 'csv-dl' });
    } catch (err) {
      toast.error('Failed to export CSV', { id: 'csv-dl' });
    }
  };

  const getPaymentBadge = (status) => {
    switch (status) {
      case 'paid':
        return { label: 'Paid', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'partially_paid':
        return { label: 'Partially Paid', bg: 'bg-amber-100 text-amber-800 border-amber-200' };
      default:
        return { label: 'Unpaid', bg: 'bg-rose-100 text-rose-800 border-rose-200' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">All Invoices</h1>
          <p className="text-xs text-slate-500 font-medium">Manage, filter, track payments, and export invoice records</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {invoices.length > 0 && (
            <button
              onClick={handlePurgeOldInvoices}
              title="Delete all existing old invoices to start fresh"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold shadow-2xs transition-all"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Delete Old Invoices</span>
            </button>
          )}

          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 bg-white hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>

          <Link
            to="/invoices/new"
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-sm hover:shadow transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Invoice</span>
          </Link>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-3 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search invoice #, customer, GSTIN..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-hidden"
            />
          </div>

          {/* Customer Filter */}
          <div className="lg:col-span-3">
            <select
              value={customerFilter}
              onChange={(e) => {
                setCustomerFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="all">Customer: All</option>
              {customerOptions.map(c => (
                <option key={c._id} value={c._id}>
                  {c.name} {c.organization ? `(${c.organization})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Invoice Status Filter */}
          <div className="lg:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="all">Status: All</option>
              <option value="draft">Draft</option>
              <option value="issued">Issued</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Payment Status Filter */}
          <div className="lg:col-span-2">
            <select
              value={paymentFilter}
              onChange={(e) => {
                setPaymentFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="all">Payment: All</option>
              <option value="unpaid">Unpaid</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          {/* Sort By Filter */}
          <div className="lg:col-span-2">
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split('-');
                setSortBy(sb);
                setSortOrder(so);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="createdAt-desc">Date (Newest First)</option>
              <option value="createdAt-asc">Date (Oldest First)</option>
              <option value="invoiceNumber-desc">Invoice # (Z-A)</option>
              <option value="invoiceNumber-asc">Invoice # (A-Z)</option>
              <option value="grandTotal-desc">Amount (High to Low)</option>
              <option value="grandTotal-asc">Amount (Low to High)</option>
            </select>
          </div>
        </div>

        {/* Date Range Start, End & Reset */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Date Range:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          {(search || statusFilter !== 'all' || paymentFilter !== 'all' || customerFilter !== 'all' || startDate || endDate) && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors font-medium ml-auto"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Reset All Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* 11 Requested Columns in exact order:
          1. Invoice Number
          2. Invoice Date
          3. Customer
          4. Taxable Value
          5. Total GST
          6. Invoice Total
          7. Amount Paid
          8. Pending Amount
          9. Invoice Status
          10. Payment Status
          11. Actions */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                <th
                  onClick={() => handleSort('invoiceNumber')}
                  className="py-3 px-3 cursor-pointer hover:text-blue-600 select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Invoice Number</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('invoiceDate')}
                  className="py-3 px-3 cursor-pointer hover:text-blue-600 select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Invoice Date</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 whitespace-nowrap">Customer</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">Taxable Value</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">Total GST</th>
                <th
                  onClick={() => handleSort('grandTotal')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-blue-600 select-none whitespace-nowrap"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Invoice Total</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 text-right whitespace-nowrap">Amount Paid</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">Pending Amount</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Invoice Status</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Payment Status</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan="11" className="py-12 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span>Loading invoices...</span>
                    </div>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan="11" className="py-12 text-center text-slate-400">
                    No matching invoices found.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const statusBadge = getStatusBadge(inv.status);
                  const payBadge = getPaymentBadge(inv.paymentStatus);
                  const taxableVal = inv.taxableValue !== undefined ? inv.taxableValue : (inv.taxableAmount || inv.subtotal || 0);
                  const totalGstVal = inv.totalGst !== undefined ? inv.totalGst : (inv.taxBreakdown?.totalTax || 0);

                  return (
                    <tr key={inv._id} className="hover:bg-slate-50/80 transition-colors">
                      {/* 1. Invoice Number */}
                      <td className="py-3.5 px-3">
                        <Link
                          to={`/invoices/${inv._id}`}
                          className="font-bold text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {inv.invoiceNumber}
                        </Link>
                        {inv.isSample && (
                          <span className="block text-[9.5px] font-bold text-red-600 uppercase">Sample</span>
                        )}
                      </td>

                      {/* 2. Invoice Date */}
                      <td className="py-3.5 px-3 text-slate-600 font-medium whitespace-nowrap">
                        {formatDate(inv.invoiceDate, 'short')}
                      </td>

                      {/* 3. Customer */}
                      <td className="py-3.5 px-3 font-semibold text-slate-800 max-w-[190px] truncate">
                        {inv.customerSnapshot?.organization || inv.customerSnapshot?.name || inv.customer?.name || 'Customer'}
                      </td>

                      {/* 4. Taxable Value */}
                      <td className="py-3.5 px-3 text-right font-medium text-slate-700 whitespace-nowrap">
                        {formatINR(taxableVal)}
                      </td>

                      {/* 5. Total GST */}
                      <td className="py-3.5 px-3 text-right font-medium text-slate-700 whitespace-nowrap">
                        {formatINR(totalGstVal)}
                      </td>

                      {/* 6. Invoice Total */}
                      <td className="py-3.5 px-3 text-right whitespace-nowrap">
                        <div className="font-bold text-slate-900">{formatINR(inv.grandTotal)}</div>
                        <div
                          className="text-[10px] text-slate-400 font-normal truncate max-w-[130px] ml-auto cursor-help"
                          title={inv.amountInWords || numberToWords(inv.grandTotal)}
                        >
                          {inv.amountInWords || numberToWords(inv.grandTotal)}
                        </div>
                      </td>

                      {/* 7. Amount Paid */}
                      <td className="py-3.5 px-3 text-right font-semibold text-emerald-600 whitespace-nowrap">
                        {formatINR(inv.amountPaid)}
                      </td>

                      {/* 8. Pending Amount */}
                      <td className="py-3.5 px-3 text-right font-bold text-rose-600 whitespace-nowrap">
                        {formatINR(inv.balanceDue)}
                      </td>

                      {/* 9. Invoice Status */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusBadge.bg}`}>
                          {statusBadge.label}
                        </span>
                      </td>

                      {/* 10. Payment Status */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold border ${payBadge.bg}`}>
                          {payBadge.label}
                        </span>
                      </td>

                      {/* 11. Actions */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <Link
                            to={`/invoices/${inv._id}`}
                            title="View Invoice"
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          {inv.status !== 'cancelled' && (
                            <Link
                              to={`/invoices/${inv._id}/edit`}
                              title={inv.status === 'draft' ? 'Edit Draft' : 'Amend Invoice'}
                              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                          )}

                          <button
                            onClick={() => handleDownloadPdf(inv._id, inv.invoiceNumber)}
                            title="Download PDF"
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {inv.status !== 'cancelled' && inv.balanceDue > 0 && (
                            <button
                              onClick={() => setSelectedInvoiceForPayment(inv)}
                              title="Record Payment"
                              className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                            >
                              <IndianRupee className="w-4 h-4" />
                            </button>
                          )}

                          {inv.status !== 'cancelled' && (
                            <button
                              onClick={() => handleCancelInvoice(inv._id, inv.invoiceNumber)}
                              title="Cancel Invoice"
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteInvoice(inv._id, inv.invoiceNumber)}
                            title="Delete Invoice"
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-800">{invoices.length}</span> of <span className="font-semibold text-slate-800">{total}</span> invoices
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="font-semibold px-2">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        invoice={selectedInvoiceForPayment}
        isOpen={!!selectedInvoiceForPayment}
        onClose={() => setSelectedInvoiceForPayment(null)}
        onSuccess={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        }}
      />
    </div>
  );
}
