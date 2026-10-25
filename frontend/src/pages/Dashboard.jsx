import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import {
  FileText,
  IndianRupee,
  Clock,
  Users,
  Plus,
  UserPlus,
  PackagePlus,
  BarChart2,
  Calendar,
  Eye,
  Download,
  Trash2,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import api from '../api/axios';
import { formatINR, formatDate, getStatusBadge, numberToWords } from '../utils/formatters';
import CustomerModal from '../components/CustomerModal';
import ProductModal from '../components/ProductModal';
import RecordPaymentModal from '../components/RecordPaymentModal';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  // 1. Fetch live backend stats with TanStack Query (refetches every 30s)
  const {
    data: statsData,
    isLoading: isStatsLoading,
    isError: isStatsError,
    refetch: refetchStats
  } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const res = await api.get('/dashboard/stats');
      return res.data.data;
    },
    refetchInterval: 30000,
    refetchOnWindowFocus: true
  });

  // 2. Fetch Recent Invoices
  const {
    data: recentInvoices,
    isLoading: isRecentLoading,
    refetch: refetchRecent
  } = useQuery({
    queryKey: ['recentInvoices'],
    queryFn: async () => {
      const res = await api.get('/dashboard/recent-invoices');
      return res.data.data || [];
    },
    refetchInterval: 30000
  });

  // 3. Fetch Recent Activity
  const {
    data: recentActivity,
    isLoading: isActivityLoading
  } = useQuery({
    queryKey: ['recentActivity'],
    queryFn: async () => {
      const res = await api.get('/dashboard/recent-activity');
      return res.data.data || [];
    },
    refetchInterval: 30000
  });

  // Dynamic Current Month Display
  const now = new Date();
  const firstDayStr = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const lastDayStr = new Date(now.getFullYear(), now.getMonth() + 1, 0).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const currentMonthRange = `${firstDayStr} - ${lastDayStr}`;

  // PDF download handler
  const handleDownloadPdf = async (invoiceId, invoiceNumber) => {
    try {
      toast.loading(`Generating PDF for ${invoiceNumber}...`, { id: 'pdf-toast' });
      const res = await api.get(`/invoices/${invoiceId}/pdf`, { responseType: 'blob' });

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

      const safeName = String(invoiceNumber || 'invoice').replace(/[/\\:*?"<>|]/g, '_');
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${safeName}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(`Downloaded ${safeName}.pdf`, { id: 'pdf-toast' });
    } catch (err) {
      console.error('PDF download error:', err);
      toast.error(err.message || 'Failed to download PDF. Open invoice details and click Print > Save as PDF.', { id: 'pdf-toast', duration: 4500 });
    }
  };

  // Cancel invoice handler
  const handleCancelInvoice = async (invoiceId, invoiceNumber) => {
    if (!window.confirm(`Are you sure you want to cancel invoice ${invoiceNumber}?`)) return;
    try {
      await api.post(`/invoices/${invoiceId}/cancel`, { reason: 'Cancelled from dashboard' });
      toast.success(`Invoice ${invoiceNumber} cancelled`);
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['recentInvoices'] });
      queryClient.invalidateQueries({ queryKey: ['recentActivity'] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel invoice');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header: Title & Dynamic Real Date Range */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-xs text-slate-500 font-medium">Real-time financial performance and business metrics</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              refetchStats();
              refetchRecent();
            }}
            title="Refresh Dashboard"
            className="p-2 text-slate-500 hover:text-blue-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <div className="inline-flex items-center gap-2 bg-white border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs cursor-pointer hover:bg-slate-50">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>{currentMonthRange}</span>
          </div>
        </div>
      </div>

      {/* 4 Required Statistics Cards with 100% Real Backend Data */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Invoices */}
        <div
          onClick={() => navigate('/invoices')}
          className="bg-[#EBF3FE] border border-blue-100 rounded-2xl p-5 cursor-pointer hover:shadow-md transition-all group relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
              <FileText className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Invoices</span>
          </div>

          {isStatsLoading ? (
            <div className="h-9 flex items-center">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : isStatsError ? (
            <div className="text-xs text-rose-600 flex items-center gap-1.5 py-1">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Failed to load.</span>
              <button
                onClick={(e) => { e.stopPropagation(); refetchStats(); }}
                className="underline font-bold ml-1 hover:text-rose-800"
              >
                Retry
              </button>
            </div>
          ) : (
            <div>
              <div className="text-3xl font-black text-slate-900 tracking-tight">
                {statsData?.totalInvoices ?? 0}
              </div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-blue-700 mt-1">
                {statsData?.invoicesTrend !== null && statsData?.invoicesTrend !== undefined ? (
                  <>
                    {statsData.invoicesTrend >= 0 ? <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> : <TrendingDown className="w-3.5 h-3.5 text-rose-600" />}
                    <span className={statsData.invoicesTrend >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                      {statsData.invoicesTrend >= 0 ? `+${statsData.invoicesTrend}%` : `${statsData.invoicesTrend}%`} vs last month
                    </span>
                  </>
                ) : (
                  <span>
                    {statsData?.issuedCount ?? 0} issued · {statsData?.draftCount ?? 0} draft{statsData?.draftCount === 1 ? '' : 's'}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Total Billed Amount */}
        <div
          onClick={() => navigate('/invoices')}
          className="bg-[#EBFBF3] border border-emerald-100 rounded-2xl p-5 cursor-pointer hover:shadow-md transition-all group relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform">
              <IndianRupee className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Billed Amount</span>
          </div>

          {isStatsLoading ? (
            <div className="h-9 flex items-center">
              <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : isStatsError ? (
            <div className="text-xs text-rose-600 flex items-center gap-1.5 py-1">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Failed to load.</span>
              <button
                onClick={(e) => { e.stopPropagation(); refetchStats(); }}
                className="underline font-bold ml-1 hover:text-rose-800"
              >
                Retry
              </button>
            </div>
          ) : (
            <div>
              <div className="text-3xl font-black text-slate-900 tracking-tight" title={numberToWords(statsData?.totalBilledAmount ?? 0)}>
                {formatINR(statsData?.totalBilledAmount ?? 0, false)}
              </div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 mt-1">
                {statsData?.billedTrend !== null && statsData?.billedTrend !== undefined ? (
                  <>
                    {statsData.billedTrend >= 0 ? <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> : <TrendingDown className="w-3.5 h-3.5 text-rose-600" />}
                    <span>
                      {statsData.billedTrend >= 0 ? `+${statsData.billedTrend}%` : `${statsData.billedTrend}%`} vs last month
                    </span>
                  </>
                ) : (
                  <span>
                    Collected: {formatINR(statsData?.totalPaidAmount ?? 0, false)}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Card 3: Pending Amount */}
        <div
          onClick={() => navigate('/invoices?status=issued')}
          className="bg-[#FFFBEB] border border-amber-100 rounded-2xl p-5 cursor-pointer hover:shadow-md transition-all group relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 group-hover:scale-105 transition-transform">
              <Clock className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Pending Amount</span>
          </div>

          {isStatsLoading ? (
            <div className="h-9 flex items-center">
              <div className="w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : isStatsError ? (
            <div className="text-xs text-rose-600 flex items-center gap-1.5 py-1">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Failed to load.</span>
              <button
                onClick={(e) => { e.stopPropagation(); refetchStats(); }}
                className="underline font-bold ml-1 hover:text-rose-800"
              >
                Retry
              </button>
            </div>
          ) : (
            <div>
              <div className="text-3xl font-black text-slate-900 tracking-tight">
                {formatINR(statsData?.pendingAmount ?? 0, false)}
              </div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-800 mt-1">
                <span>
                  {statsData?.pendingInvoicesCount ?? 0} unpaid invoice{statsData?.pendingInvoicesCount === 1 ? '' : 's'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Card 4: Total Customers */}
        <div
          onClick={() => navigate('/customers')}
          className="bg-[#FDF2F4] border border-pink-100 rounded-2xl p-5 cursor-pointer hover:shadow-md transition-all group relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center text-pink-600 group-hover:scale-105 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Customers</span>
          </div>

          {isStatsLoading ? (
            <div className="h-9 flex items-center">
              <div className="w-5 h-5 border-2 border-pink-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : isStatsError ? (
            <div className="text-xs text-rose-600 flex items-center gap-1.5 py-1">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Failed to load.</span>
              <button
                onClick={(e) => { e.stopPropagation(); refetchStats(); }}
                className="underline font-bold ml-1 hover:text-rose-800"
              >
                Retry
              </button>
            </div>
          ) : (
            <div>
              <div className="text-3xl font-black text-slate-900 tracking-tight">
                {statsData?.totalCustomers ?? 0}
              </div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-pink-700 mt-1">
                <span>
                  {statsData?.totalCustomers ?? 0} active client record{statsData?.totalCustomers === 1 ? '' : 's'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Left Side Recent Invoices, Right Side Quick Actions & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Section: Recent Invoices Table (8 columns) */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-slate-900">Recent Invoices</h2>
              <Link
                to="/invoices/new"
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-xs transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Invoice</span>
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                    <th className="pb-3 px-2 w-12 text-center">S.No</th>
                    <th className="pb-3 px-3">Invoice No</th>
                    <th className="pb-3 px-3">Date</th>
                    <th className="pb-3 px-3">Customer Name</th>
                    <th className="pb-3 px-3">Total Amount</th>
                    <th className="pb-3 px-3 text-center">Status</th>
                    <th className="pb-3 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {isRecentLoading ? (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-slate-400">
                        <div className="inline-flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          <span>Loading recent invoices...</span>
                        </div>
                      </td>
                    </tr>
                  ) : !recentInvoices || recentInvoices.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-slate-400">
                        No recent invoices found. Click <strong>Create New Invoice</strong> to issue one!
                      </td>
                    </tr>
                  ) : (
                    recentInvoices.map((inv, idx) => {
                      const badge = getStatusBadge(inv.status);
                      return (
                        <tr key={inv._id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-2 text-center text-slate-400 font-medium">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-3">
                            <Link
                              to={`/invoices/${inv._id}`}
                              className="font-bold text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {inv.invoiceNumber}
                            </Link>
                          </td>
                          <td className="py-3 px-3 text-slate-600 font-medium whitespace-nowrap">
                            {formatDate(inv.invoiceDate, 'short')}
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-800 max-w-[180px] truncate">
                            {inv.customerSnapshot?.organization || inv.customerSnapshot?.name || inv.customer?.name || 'Customer'}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="font-bold text-slate-900">{formatINR(inv.grandTotal)}</div>
                            <div
                              className="text-[10px] text-slate-400 font-normal truncate max-w-[140px] cursor-help"
                              title={inv.amountInWords || numberToWords(inv.grandTotal)}
                            >
                              {inv.amountInWords || numberToWords(inv.grandTotal)}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badge.bg}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
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
                                  <Trash2 className="w-4 h-4" />
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
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 flex justify-between items-center text-xs">
            <span className="text-slate-500">Showing top 5 recent invoices</span>
            <Link to="/invoices" className="font-semibold text-blue-600 hover:underline">
              View All Invoices →
            </Link>
          </div>
        </div>

        {/* Right Section: Quick Actions & Recent Activity (4 columns) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Actions Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/invoices/new"
                className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs hover:shadow transition-all"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>Create Invoice</span>
              </Link>

              <button
                onClick={() => setIsCustomerModalOpen(true)}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs hover:shadow transition-all text-left"
              >
                <UserPlus className="w-4 h-4 shrink-0" />
                <span>Add Customer</span>
              </button>

              <button
                onClick={() => setIsProductModalOpen(true)}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-xs hover:shadow transition-all text-left"
              >
                <PackagePlus className="w-4 h-4 shrink-0" />
                <span>Add Product</span>
              </button>

              <Link
                to="/reports"
                className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-xs hover:shadow transition-all"
              >
                <BarChart2 className="w-4 h-4 shrink-0" />
                <span>View Reports</span>
              </Link>
            </div>
          </div>

          {/* Recent Activity Card (Real audit logs from database) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-4">Recent Activity</h2>
            <div className="space-y-4">
              {isActivityLoading ? (
                <div className="text-center py-4 text-xs text-slate-400">Loading activity...</div>
              ) : !recentActivity || recentActivity.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-400">No activity logged yet.</div>
              ) : (
                recentActivity.slice(0, 5).map((act, i) => (
                  <div key={act._id || i} className="flex items-start gap-3 text-xs">
                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5 text-blue-600">
                      {act.action?.includes('PAYMENT') ? (
                        <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                      ) : act.action?.includes('CUSTOMER') ? (
                        <Users className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-indigo-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-slate-800 leading-tight">
                        {act.notes || act.action}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {formatDate(act.timestamp, 'long')}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <RecordPaymentModal
        invoice={selectedInvoiceForPayment}
        isOpen={!!selectedInvoiceForPayment}
        onClose={() => setSelectedInvoiceForPayment(null)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
          queryClient.invalidateQueries({ queryKey: ['recentInvoices'] });
          queryClient.invalidateQueries({ queryKey: ['recentActivity'] });
        }}
      />

      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
          queryClient.invalidateQueries({ queryKey: ['recentActivity'] });
        }}
      />

      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['recentActivity'] });
        }}
      />
    </div>
  );
}
