import React, { useState, useEffect } from 'react';
import { X, CheckCircle, IndianRupee } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { formatINR } from '../utils/formatters';

export default function RecordPaymentModal({ invoice, isOpen, onClose, onSuccess }) {
  const [amount, setAmount] = useState(invoice?.balanceDue || '');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [transactionReference, setTransactionReference] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (invoice?.balanceDue !== undefined) {
      setAmount(invoice.balanceDue);
    }
  }, [invoice]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payVal = Number(amount);
    if (!payVal || payVal <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    if (payVal > invoice.balanceDue) {
      toast.error(`Amount cannot exceed outstanding balance (${formatINR(invoice.balanceDue)})`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post(`/invoices/${invoice._id}/payments`, {
        amount: payVal,
        paymentDate,
        paymentMethod,
        transactionReference,
        notes
      });

      if (res.data.success) {
        toast.success(`Payment of ${formatINR(payVal)} recorded!`);
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !invoice) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Record Payment</h3>
            <p className="text-xs text-slate-500">Invoice: <span className="font-semibold text-blue-600">{invoice.invoiceNumber}</span></p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Summary Box */}
          <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <div>
              <div className="text-[11px] text-slate-500 font-medium">Grand Total</div>
              <div className="text-sm font-bold text-slate-800">{formatINR(invoice.grandTotal)}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-medium">Already Paid</div>
              <div className="text-sm font-bold text-emerald-600">{formatINR(invoice.amountPaid)}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-medium">Balance Due</div>
              <div className="text-sm font-bold text-rose-600">{formatINR(invoice.balanceDue)}</div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Amount (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={invoice.balanceDue}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
            <div className="flex justify-between items-center mt-1">
              <button
                type="button"
                onClick={() => setAmount(invoice.balanceDue)}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                Pay Full Balance ({formatINR(invoice.balanceDue)})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Date *
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Method *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="UPI">UPI</option>
                <option value="Cash">Cash</option>
                <option value="Cheque">Cheque</option>
                <option value="Card">Card</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Transaction / Reference ID (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. UTR / NEFT / UPI Ref No"
              value={transactionReference}
              onChange={(e) => setTransactionReference(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              rows="2"
              placeholder="Any remarks or receipt details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs hover:shadow transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isSubmitting ? 'Recording...' : 'Confirm Payment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
