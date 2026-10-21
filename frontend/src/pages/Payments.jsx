import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  CreditCard,
  IndianRupee,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Plus
} from 'lucide-react';
import api from '../api/axios';
import { formatINR, formatDate } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Payments() {
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const [page, setPage] = useState(1);

  const { data: paymentData, isLoading, refetch } = useQuery({
    queryKey: ['paymentsList', page],
    queryFn: async () => {
      const res = await api.get(`/payments?page=${page}&limit=20`);
      return res.data;
    }
  });

  const payments = paymentData?.data || [];
  const total = paymentData?.total || 0;
  const totalPages = paymentData?.totalPages || 1;

  const handleReverse = async (paymentId, amount, invNo) => {
    const reason = window.prompt(`Please enter reason to reverse payment of ${formatINR(amount)} for invoice ${invNo}:`, 'Entered in error');
    if (!reason) return;

    try {
      await api.post(`/payments/${paymentId}/reverse`, { reason });
      toast.success('Payment reversed successfully');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['recentInvoices'] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reverse payment');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Payments</h1>
          <p className="text-xs text-slate-500 font-medium">Payment receipts, transaction history, and reversal audit</p>
        </div>

        <Link
          to="/invoices"
          className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-xs transition-all"
        >
          <IndianRupee className="w-4 h-4" />
          <span>Record Payment via Invoice</span>
        </Link>
      </div>

      {/* Payments Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                <th className="py-3 px-4">Payment Date</th>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4 text-right">Amount Received</th>
                <th className="py-3 px-4 text-center">Status</th>
                {isAdmin && <th className="py-3 px-4 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span>Loading payments...</span>
                    </div>
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    No payment transactions recorded yet.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-slate-700 whitespace-nowrap">
                      {formatDate(p.paymentDate, 'medium')}
                    </td>
                    <td className="py-3.5 px-4">
                      <Link
                        to={`/invoices/${p.invoice?._id || p.invoice}`}
                        className="font-bold text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {p.invoiceNumber}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800 max-w-xs truncate">
                      {p.customer?.organization || p.customer?.name || 'Customer'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      {p.paymentMethod}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                      {p.transactionReference || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-600 whitespace-nowrap">
                      {formatINR(p.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        p.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}>
                        {p.status === 'completed' ? 'Completed' : 'Reversed'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="py-3.5 px-4 text-center">
                        {p.status === 'completed' ? (
                          <button
                            onClick={() => handleReverse(p._id, p.amount, p.invoiceNumber)}
                            title="Reverse Payment (Admin only)"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors font-medium text-[11px]"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reverse</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Reversed</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
          <span>Total Transactions: {total}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40"
            >
              Previous
            </button>
            <span>Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
