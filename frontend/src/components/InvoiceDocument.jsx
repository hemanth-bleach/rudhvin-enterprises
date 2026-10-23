import React from 'react';
import { formatINR, formatDate, numberToWords } from '../utils/formatters';

export default function InvoiceDocument({ invoice, className = '' }) {
  if (!invoice) return null;

  const seller = invoice.sellerSnapshot || {};
  const customer = invoice.customerSnapshot || invoice.customer || {};
  const bank = seller.bankDetails || {};
  const items = invoice.lineItems || invoice.items || [];

  const invoiceNumber = invoice.invoiceNumber || 'RU001';
  const invoiceDateStr = formatDate(invoice.invoiceDate, 'short');
  const dueDateStr = invoice.dueDate ? formatDate(invoice.dueDate, 'short') : '';

  const formatCurrency = (val) => {
    return Number(val || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Pad empty rows if fewer than 4 items
  const emptyRowsCount = Math.max(0, 4 - items.length);

  return (
    <div className={`bg-white border border-slate-900 shadow-lg p-6 max-w-[800px] mx-auto text-slate-900 relative font-sans text-xs leading-normal select-none print-area ${className}`}>
      {/* Background Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden opacity-5 z-0">
        <div className="text-center transform -rotate-30 font-black text-6xl tracking-widest text-slate-800 leading-tight">
          RUDHVIN<br />ENTERPRISES
        </div>
      </div>

      <div className="relative z-10 flex flex-col justify-between min-h-[960px]">
        <div>
          {/* Header Row */}
          <div className="flex items-center justify-between pb-3 border-b-2 border-slate-900">
            {/* Logo */}
            <div className="w-40 shrink-0">
              <svg width="150" height="48" viewBox="0 0 200 65" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 12 H38 C48 12 55 18 55 27 C55 35 48 41 38 41 H24 V58 H12 V12Z" fill="#1E3A8A"/>
                <path d="M24 22 H36 C41 22 44 24 44 27 C44 30 41 32 36 32 H24 V22Z" fill="#FFFFFF"/>
                <path d="M36 34 L56 58 H41 L25 38 Z" fill="#F59E0B"/>
                <path d="M58 12 H90 V21 H69 V30 H86 V38 H69 V49 H92 V58 H58 V12Z" fill="#1E3A8A"/>
                <text x="100" y="28" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="14" fill="#1E3A8A" letterSpacing="1">RUDHVIN</text>
                <text x="100" y="44" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="10" fill="#64748B" letterSpacing="2">ENTERPRISES</text>
              </svg>
            </div>

            {/* Company Info */}
            <div className="text-center flex-1 px-3">
              <h1 className="text-xl font-black text-[#DC2626] uppercase tracking-wide font-sans">
                {seller.companyName || 'RUDHVIN ENTERPRISES'}
              </h1>
              <p className="text-[10px] font-semibold text-[#0284C7] leading-tight mt-0.5 max-w-md mx-auto">
                {seller.address || 'D.No.9-6-105/1/3, 2nd Floor, 1st Portion, Mangapuram Colony, Near Kalabharathi, Sivajipalem, LB Colony, Visakhapatnam - 530017.'} Ph: {seller.phone || '7075708933'}
              </p>
              <div className="text-xs font-bold text-[#0284C7] mt-0.5">
                GSTIN : {seller.gstin || '37DGBPV1007RIZU'}
              </div>
            </div>
          </div>

          {/* Bill To & Invoice Meta Section */}
          <div className="grid grid-cols-12 gap-4 my-3 text-[11px]">
            <div className="col-span-7 pr-2">
              <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">TO,</div>
              <div className="font-bold text-slate-900 uppercase text-xs">
                {customer.organization || customer.name || 'CUSTOMER NAME'}
              </div>
              <div className="whitespace-pre-line text-slate-700 leading-snug mt-0.5">
                {customer.billingAddress || customer.address || 'Customer billing address'}
              </div>
              {customer.phone && (
                <div className="mt-1 text-slate-800">
                  <span className="font-semibold">PH:</span> {customer.phone}
                </div>
              )}
              {customer.gstin && (
                <div className="text-slate-800">
                  <span className="font-semibold">GSTIN:</span> {customer.gstin}
                </div>
              )}
            </div>

            <div className="col-span-5 flex justify-end">
              <div className="border border-slate-900 bg-slate-50/70 p-2.5 rounded-xs w-full max-w-[210px] text-[11px] space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold">INVOICE NO:</span>
                  <span className="font-black text-[#0284C7] text-xs">{invoiceNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-700">Date:</span>
                  <span className="font-medium">{invoiceDateStr}</span>
                </div>
                {dueDateStr && (
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-700">Due Date:</span>
                    <span className="font-medium">{dueDateStr}</span>
                  </div>
                )}
                {invoice.paymentTerms && (
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-700">Terms:</span>
                    <span className="font-medium truncate max-w-[110px]">{invoice.paymentTerms}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Banner */}
          <div className="bg-gradient-to-r from-amber-100 via-orange-50 to-amber-100 border border-amber-300 py-1 text-center font-black tracking-widest text-slate-800 uppercase text-xs my-2 rounded-xs shadow-2xs">
            INVOICE
          </div>

          {/* Items Table */}
          <div className="overflow-hidden border border-slate-900">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-900 font-bold text-slate-900">
                  <th className="py-1.5 px-2 text-center border-r border-slate-900 w-10">S.No.</th>
                  <th className="py-1.5 px-3 text-left border-r border-slate-900">Description</th>
                  <th className="py-1.5 px-2 text-center border-r border-slate-900 w-20">HSN/SAC</th>
                  <th className="py-1.5 px-2 text-center border-r border-slate-900 w-16">Qty</th>
                  <th className="py-1.5 px-2 text-right border-r border-slate-900 w-20">Rate</th>
                  <th className="py-1.5 px-3 text-right w-24">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-900">
                    <td className="py-1 px-2 text-center border-r border-slate-900 font-medium">
                      {item.serialNumber || idx + 1}
                    </td>
                    <td className="py-1 px-3 border-r border-slate-900 font-medium">
                      {item.description}
                    </td>
                    <td className="py-1 px-2 text-center border-r border-slate-900">
                      {item.hsnSac || '-'}
                    </td>
                    <td className="py-1 px-2 text-center border-r border-slate-900">
                      {item.quantity} {item.unit || ''}
                    </td>
                    <td className="py-1 px-2 text-right border-r border-slate-900">
                      {formatCurrency(item.rate)}
                    </td>
                    <td className="py-1 px-3 text-right font-medium">
                      {formatCurrency(item.totalAmount || (item.quantity * item.rate))}
                    </td>
                  </tr>
                ))}

                {Array.from({ length: emptyRowsCount }).map((_, i) => (
                  <tr key={`empty-${i}`} className="border-b border-slate-900">
                    <td className="py-2 px-2 border-r border-slate-900">&nbsp;</td>
                    <td className="py-2 px-3 border-r border-slate-900">&nbsp;</td>
                    <td className="py-2 px-2 border-r border-slate-900">&nbsp;</td>
                    <td className="py-2 px-2 border-r border-slate-900">&nbsp;</td>
                    <td className="py-2 px-2 border-r border-slate-900">&nbsp;</td>
                    <td className="py-2 px-3">&nbsp;</td>
                  </tr>
                ))}

                {/* Subtotal Row */}
                <tr className="border-b border-slate-900 font-semibold bg-slate-50/50">
                  <td colSpan="5" className="py-1 px-3 text-right border-r border-slate-900">
                    Subtotal
                  </td>
                  <td className="py-1 px-3 text-right">
                    ₹{formatCurrency(invoice.subtotal)}
                  </td>
                </tr>

                {/* Optional Discounts */}
                {invoice.totalDiscount > 0 && (
                  <tr className="border-b border-slate-900 text-rose-600">
                    <td colSpan="5" className="py-1 px-3 text-right border-r border-slate-900">
                      Discount
                    </td>
                    <td className="py-1 px-3 text-right">
                      - ₹{formatCurrency(invoice.totalDiscount)}
                    </td>
                  </tr>
                )}

                {/* Tax Breakdown */}
                {invoice.taxBreakdown && invoice.taxBreakdown.totalTax > 0 && (
                  invoice.taxBreakdown.isInterState ? (
                    <tr className="border-b border-slate-900 font-semibold text-slate-800">
                      <td colSpan="5" className="py-1 px-3 text-right border-r border-slate-900">
                        IGST ({invoice.taxBreakdown.igstRate}%)
                      </td>
                      <td className="py-1 px-3 text-right">
                        ₹{formatCurrency(invoice.taxBreakdown.igstAmount)}
                      </td>
                    </tr>
                  ) : (
                    <>
                      <tr className="border-b border-slate-900 font-semibold text-slate-800">
                        <td colSpan="5" className="py-1 px-3 text-right border-r border-slate-900">
                          CGST ({invoice.taxBreakdown.cgstRate}%)
                        </td>
                        <td className="py-1 px-3 text-right">
                          ₹{formatCurrency(invoice.taxBreakdown.cgstAmount)}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-900 font-semibold text-slate-800">
                        <td colSpan="5" className="py-1 px-3 text-right border-r border-slate-900">
                          SGST ({invoice.taxBreakdown.sgstRate}%)
                        </td>
                        <td className="py-1 px-3 text-right">
                          ₹{formatCurrency(invoice.taxBreakdown.sgstAmount)}
                        </td>
                      </tr>
                    </>
                  )
                )}

                {/* Grand Total Row */}
                <tr className="font-black text-xs bg-slate-100">
                  <td colSpan="5" className="py-2 px-3 text-right border-r border-slate-900 text-slate-900">
                    Total / Grand Total
                  </td>
                  <td className="py-2 px-3 text-right text-slate-900">
                    ₹{formatCurrency(invoice.grandTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Amount in Words */}
          <div className="mt-2.5 p-2 bg-slate-50 border border-slate-300 text-[11px] rounded-xs font-semibold text-slate-800">
            <span>Amount Chargeable (in words): </span>
            <span className="font-extrabold text-slate-900">{invoice.amountInWords || numberToWords(invoice.grandTotal)}</span>
          </div>
        </div>

        {/* Footer Section */}
        <div className="mt-6 pt-3 border-t border-slate-300">
          <div className="grid grid-cols-12 gap-4 text-[11px]">
            {/* Bank Details */}
            <div className="col-span-7">
              <div className="border border-slate-700 bg-slate-50/70 p-2.5 rounded-xs space-y-0.5">
                <div className="font-bold underline text-slate-900 mb-1">Bank Details:</div>
                <div><span className="font-semibold">Account number :</span> {bank.accountNumber || '143201000000719'}</div>
                <div><span className="font-semibold">IFSC Code :</span> {bank.ifscCode || 'KVBL0001432'}</div>
                <div><span className="font-semibold">Account holder name :</span> {bank.accountHolderName || 'RUDHVIN ENTERPRISES'}</div>
                <div><span className="font-semibold">Bank Name :</span> {bank.bankName || 'Karur Vysya Bank'}</div>
                {bank.branch && <div><span className="font-semibold">Branch :</span> {bank.branch}</div>}
              </div>
            </div>

            {/* Authorized Signatory */}
            <div className="col-span-5 flex flex-col justify-end text-right">
              <div className="font-bold text-slate-900 mb-8">Authorized Signatory</div>
              <div className="font-bold text-[#DC2626] text-xs">
                {seller.authorizedSignatory || 'Rudhvin Enterprises'}
              </div>
              <div className="text-[10px] text-slate-600">Email: {seller.email || 'rudhvinenterprises@gmail.com'}</div>
              <div className="text-[10px] text-slate-600">Phone: {seller.mobile || seller.phone || '+91 9652496933'}</div>
            </div>
          </div>

          <div className="text-center text-[10px] text-slate-500 mt-4 pt-2 border-t border-dashed border-slate-300">
            {seller.invoiceFooter || 'This is a computer generated invoice and does not require a physical signature.'}
          </div>
        </div>
      </div>
    </div>
  );
}
