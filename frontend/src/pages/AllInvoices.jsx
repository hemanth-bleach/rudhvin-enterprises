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
  FileText
} from 'lucide-react';
import api from '../api/axios';
import { formatINR, formatDate, getStatusBadge, numberToWords } from '../utils/formatters';
import RecordPaymentModal from '../components/RecordPaymentModal';
import toast from 'react-hot-toast';

export default function AllInvoices() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);

  // Fetch Invoices
  const {
    data: invoiceData,
    isLoading,
    isFetching,
    refetch
  } = useQuery({
    queryKey: ['invoicesList', search, statusFilter, paymentFilter, startDate, endDate, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (paymentFilter !== 'all') params.append('paymentStatus', paymentFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
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
    setStartDate('');
    setEndDate('');
    setPage(1);
    setSearchParams({});
  };

  // Download PDF
  const handleDownloadPdf = async (id, num) => {
    try {
      toast.loading(`Downloading ${num}.pdf...`, { id: 'pdf-dl' });
      const res = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${num}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success(`Downloaded ${num}.pdf!`, { id: 'pdf-dl' });
    } catch (err) {
      toast.error('Failed to download PDF', { id: 'pdf-dl' });
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

  // Export CSV
  const handleExportCsv = async () => {
    try {
      toast.loading('Preparing CSV export...', { id: 'csv-dl' });
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (statusFilter !== 'all') params.append('status', statusFilter);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">All Invoices</h1>
          <p className="text-xs text-slate-500 font-medium">Manage, filter, track payments, and export your invoices</p>
        </div>

        <div className="flex items-center gap-3">
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
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by invoice #, customer name, GSTIN..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-hidden"
            />
          </div>

          {/* Status Filter */}
          <div className="md:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="all">All Statuses</option>
              <option value="issued">Issued / Pending</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Paid</option>
              <option value="draft">Draft</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Payment Status Filter */}
          <div className="md:col-span-2">
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
              <option value="paid">Fully Paid</option>
            </select>
          </div>

          {/* Date Range Start & End */}
          <div className="md:col-span-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              placeholder="Start Date"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div className="md:col-span-2 flex items-center gap-2">
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              placeholder="End Date"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
            {(search || statusFilter !== 'all' || paymentFilter !== 'all' || startDate || endDate) && (
              <button
                type="button"
                onClick={handleClearFilters}
                title="Clear all filters"
                className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors shrink-0"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                <th className="py-3 px-3">Invoice No</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3 text-right">Subtotal</th>
                <th className="py-3 px-3 text-right">Tax</th>
                <th className="py-3 px-3 text-right">Grand Total</th>
                <th className="py-3 px-3 text-right">Paid</th>
                <th className="py-3 px-3 text-right">Balance Due</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan="10" className="py-12 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span>Loading invoices...</span>
                    </div>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-12 text-center text-slate-400">
                    No matching invoices found.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const badge = getStatusBadge(inv.status);
                  return (
                    <tr key={inv._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-3">
                        <Link
                          to={`/invoices/${inv._id}`}
                          className="font-bold text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 font-medium whitespace-nowrap">
                        {formatDate(inv.invoiceDate, 'short')}
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-slate-800 max-w-[200px] truncate">
                        {inv.customerSnapshot?.organization || inv.customerSnapshot?.name || inv.customer?.name || 'Customer'}
                      </td>
                      <td className="py-3.5 px-3 text-right font-medium text-slate-700">
                        {formatINR(inv.subtotal)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-medium text-slate-700">
                        {formatINR(inv.taxBreakdown?.totalTax || 0)}
                      </td>
                      <td className="py-3.5 px-3 text-right whitespace-nowrap">
                        <div className="font-bold text-slate-900">{formatINR(inv.grandTotal)}</div>
                        <div
                          className="text-[10px] text-slate-400 font-normal truncate max-w-[140px] ml-auto cursor-help"
                          title={inv.amountInWords || numberToWords(inv.grandTotal)}
                        >
                          {inv.amountInWords || numberToWords(inv.grandTotal)}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-right font-semibold text-emerald-600 whitespace-nowrap">
                        {formatINR(inv.amountPaid)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-bold text-rose-600 whitespace-nowrap">
                        {formatINR(inv.balanceDue)}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <Link
                            to={`/invoices/${inv._id}`}
                            title="View Invoice"
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
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
