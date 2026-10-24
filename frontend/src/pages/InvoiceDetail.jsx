import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Download,
  Printer,
  ArrowLeft,
  IndianRupee,
  XCircle,
  Clock,
  CheckCircle,
  FileText,
  Edit
} from 'lucide-react';
import api from '../api/axios';
import { formatINR, formatDate, getStatusBadge, numberToWords } from '../utils/formatters';
import InvoiceDocument from '../components/InvoiceDocument';
import RecordPaymentModal from '../components/RecordPaymentModal';
import toast from 'react-hot-toast';

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const { data: invoice, isLoading, refetch } = useQuery({
    queryKey: ['invoiceDetail', id],
    queryFn: async () => {
      const res = await api.get(`/invoices/${id}`);
      return res.data.data;
    }
  });

  const handleDownloadPdf = async () => {
    try {
      toast.loading(`Downloading ${invoice.invoiceNumber}.pdf...`, { id: 'pdf-dl' });
      const res = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${invoice.invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success(`Downloaded ${invoice.invoiceNumber}.pdf!`, { id: 'pdf-dl' });
    } catch (err) {
      toast.error('Failed to download PDF', { id: 'pdf-dl' });
    }
  };

  const handleCancelInvoice = async () => {
    const reason = window.prompt(`Please enter cancellation reason for invoice ${invoice.invoiceNumber}:`, 'Cancelled by administrator');
    if (!reason) return;

    try {
      await api.post(`/invoices/${id}/cancel`, { reason });
      toast.success(`Invoice ${invoice.invoiceNumber} has been cancelled`);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel invoice');
    }
  };

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>Loading invoice details...</span>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-16 space-y-3">
        <h2 className="text-xl font-bold text-slate-800">Invoice Not Found</h2>
        <p className="text-sm text-slate-500">The invoice you are looking for does not exist or was removed.</p>
        <Link to="/invoices" className="inline-block mt-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold">
          Return to Invoices
        </Link>
      </div>
    );
  }

  const badge = getStatusBadge(invoice.status);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 no-print">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/invoices')}
            className="p-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">{invoice.invoiceNumber}</h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${badge.bg}`}>
                {badge.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Issued on {formatDate(invoice.invoiceDate, 'medium')}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {invoice.status !== 'cancelled' && (
            <Link
              to={`/invoices/${invoice._id}/edit`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-all shadow-2xs"
            >
              <Edit className="w-4 h-4 text-indigo-600" />
              <span>{invoice.status === 'draft' ? 'Edit Draft' : 'Amend Invoice'}</span>
            </Link>
          )}

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-all shadow-2xs"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF</span>
          </button>

          {invoice.status !== 'cancelled' && invoice.balanceDue > 0 && (
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all"
            >
              <IndianRupee className="w-4 h-4" />
              <span>Record Payment</span>
            </button>
          )}

          {invoice.status !== 'cancelled' && (
            <button
              onClick={handleCancelInvoice}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl transition-all"
            >
              <XCircle className="w-4 h-4" />
              <span>Cancel</span>
            </button>
          )}
        </div>
      </div>

      {/* Payment Status Summary Card (if not cancelled) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 no-print">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="text-xs text-slate-500 font-medium">Grand Total</div>
          <div className="text-xl font-bold text-slate-900 mt-0.5">{formatINR(invoice.grandTotal)}</div>
          <div className="text-[11px] text-slate-500 font-medium italic mt-1 leading-snug">
            {invoice.amountInWords || numberToWords(invoice.grandTotal)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="text-xs text-slate-500 font-medium">Amount Paid</div>
          <div className="text-xl font-bold text-emerald-600 mt-0.5">{formatINR(invoice.amountPaid)}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="text-xs text-slate-500 font-medium">Balance Due</div>
          <div className="text-xl font-bold text-rose-600 mt-0.5">{formatINR(invoice.balanceDue)}</div>
        </div>
      </div>

      {/* Formal A4 Invoice Document */}
      <div className="bg-slate-200/60 p-4 sm:p-8 rounded-3xl border border-slate-200 flex justify-center">
        <InvoiceDocument invoice={invoice} />
      </div>

      {/* Payment History Section */}
      {invoice.payments && invoice.payments.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4 no-print">
          <h3 className="font-bold text-slate-900 text-sm">Payment History</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Method</th>
                  <th className="pb-2">Reference</th>
                  <th className="pb-2 text-right">Amount</th>
                  <th className="pb-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.payments.map((p) => (
                  <tr key={p._id}>
                    <td className="py-2.5 font-medium text-slate-800">{formatDate(p.paymentDate, 'medium')}</td>
                    <td className="py-2.5 text-slate-600">{p.paymentMethod}</td>
                    <td className="py-2.5 text-slate-500">{p.transactionReference || '-'}</td>
                    <td className="py-2.5 text-right font-bold text-emerald-600">{formatINR(p.amount)}</td>
                    <td className="py-2.5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                        p.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      <RecordPaymentModal
        invoice={invoice}
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSuccess={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
          queryClient.invalidateQueries({ queryKey: ['recentInvoices'] });
        }}
      />
    </div>
  );
}
