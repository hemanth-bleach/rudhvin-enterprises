import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  Calendar,
  Printer,
  Download,
  IndianRupee,
  FileSpreadsheet,
  TrendingUp,
  Percent,
  CheckCircle2,
  Clock
} from 'lucide-react';
import api from '../api/axios';
import { formatINR, formatDate, getStatusBadge } from '../utils/formatters';
import toast from 'react-hot-toast';

export default function Reports() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['financialReports', startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const res = await api.get(`/reports?${params.toString()}`);
      return res.data.data;
    }
  });

  const statusSummary = reportData?.statusSummary || [];
  const monthlyTrend = reportData?.monthlyTrend || [];
  const customerBilling = reportData?.customerBilling || [];
  const taxSummary = reportData?.taxSummary || {};

  const totalBilled = statusSummary
    .filter(s => !['draft', 'cancelled'].includes(s._id))
    .reduce((sum, s) => sum + (s.totalAmount || 0), 0);

  const totalCollected = statusSummary
    .filter(s => !['draft', 'cancelled'].includes(s._id))
    .reduce((sum, s) => sum + (s.amountPaid || 0), 0);

  const totalOutstanding = statusSummary
    .filter(s => !['draft', 'cancelled'].includes(s._id))
    .reduce((sum, s) => sum + (s.balanceDue || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 no-print">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Financial Reports</h1>
          <p className="text-xs text-slate-500 font-medium">Billed revenue, outstanding balance, tax liability, and monthly trends</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-all shadow-2xs"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center gap-4 no-print">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>Report Period:</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
            placeholder="From Date"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
            placeholder="To Date"
          />
        </div>
        {(startDate || endDate) && (
          <button
            onClick={() => { setStartDate(''); setEndDate(''); }}
            className="text-xs font-semibold text-rose-600 hover:underline"
          >
            Reset
          </button>
        )}
      </div>

      {/* Overall KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Billed (Issued)</div>
          <div className="text-2xl font-black text-slate-900">{formatINR(totalBilled)}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Collected</div>
          <div className="text-2xl font-black text-emerald-600">{formatINR(totalCollected)}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Outstanding</div>
          <div className="text-2xl font-black text-rose-600">{formatINR(totalOutstanding)}</div>
        </div>
      </div>

      {/* Tax Liability Breakdown */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Percent className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Tax Summary (GST)</h2>
          </div>
          <div className="text-xs text-slate-500 font-semibold">
            Total Tax Liability: <span className="font-bold text-blue-600">{formatINR(taxSummary.totalTax || 0)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-[11px] text-slate-500 font-semibold">Taxable Amount</div>
            <div className="text-sm font-bold text-slate-800 mt-1">{formatINR(taxSummary.totalTaxable || 0)}</div>
          </div>
          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
            <div className="text-[11px] text-blue-700 font-semibold">CGST</div>
            <div className="text-sm font-bold text-blue-900 mt-1">{formatINR(taxSummary.totalCgst || 0)}</div>
          </div>
          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
            <div className="text-[11px] text-blue-700 font-semibold">SGST</div>
            <div className="text-sm font-bold text-blue-900 mt-1">{formatINR(taxSummary.totalSgst || 0)}</div>
          </div>
          <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100">
            <div className="text-[11px] text-purple-700 font-semibold">IGST (Inter-state)</div>
            <div className="text-sm font-bold text-purple-900 mt-1">{formatINR(taxSummary.totalIgst || 0)}</div>
          </div>
          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
            <div className="text-[11px] text-emerald-700 font-semibold">Total GST Collected</div>
            <div className="text-sm font-bold text-emerald-900 mt-1">{formatINR(taxSummary.totalTax || 0)}</div>
          </div>
        </div>
      </div>

      {/* Customer-wise Billing Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900">Customer-wise Revenue & Balances</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                <th className="py-2.5 px-3">Customer / Organization</th>
                <th className="py-2.5 px-3 text-center">Invoices</th>
                <th className="py-2.5 px-3 text-right">Total Billed</th>
                <th className="py-2.5 px-3 text-right">Total Paid</th>
                <th className="py-2.5 px-3 text-right">Outstanding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customerBilling.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-6 text-center text-slate-400">No customer records in this period.</td>
                </tr>
              ) : (
                customerBilling.map((c, i) => (
                  <tr key={c._id || i} className="hover:bg-slate-50/80">
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      {c.customerOrg || c.customerName || 'Customer'}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-600 font-bold">
                      {c.invoiceCount}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      {formatINR(c.totalBilled)}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-emerald-600">
                      {formatINR(c.totalPaid)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-rose-600">
                      {formatINR(c.outstanding)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
