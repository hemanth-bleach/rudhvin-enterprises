import React from 'react';
import { formatINR, formatDate, numberToWords } from '../utils/formatters';

export default function InvoiceDocument({ invoice, className = '' }) {
  if (!invoice) return null;

  const seller = invoice.sellerSnapshot || {};
  const customer = invoice.customerSnapshot || invoice.customer || {};
  const bank = seller.bankDetails || {};
  const items = invoice.items || invoice.lineItems || [];

  const invoiceNumber = invoice.invoiceNumber || 'RU001';
  const invoiceDateStr = formatDate(invoice.invoiceDate, 'short');
  const dueDateStr = invoice.dueDate ? formatDate(invoice.dueDate, 'short') : '';

  const formatCurrency = (val) => {
    return Number(val || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const isInterState = Boolean(invoice.taxBreakdown?.isInterState);
  const taxableValueTotal = invoice.taxableValue !== undefined ? invoice.taxableValue : (invoice.taxableAmount || invoice.subtotal || 0);
  const totalGst = invoice.totalGst !== undefined ? invoice.totalGst : (invoice.taxBreakdown?.totalTax || 0);
  const primaryTaxRate = invoice.taxBreakdown?.taxRate || 0;
  const amountInWords = invoice.amountInWords || numberToWords(invoice.grandTotal);

  // Pad empty rows if fewer than 4 items
  const emptyRowsCount = Math.max(0, 4 - items.length);

  return (
    <div className={`bg-white border-2 border-slate-900 shadow-xl p-6 sm:p-7 max-w-[820px] mx-auto text-slate-900 relative font-sans text-xs leading-normal select-none print-area ${className}`}>
      {/* Background Watermark only for sample invoices */}
      {invoice.isSample && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden opacity-10 z-0">
          <div className="text-center transform -rotate-30 font-black text-5xl tracking-widest text-red-600 leading-tight border-4 border-dashed border-red-500 p-8">
            SAMPLE TAX INVOICE<br />NOT FOR PAYMENT
          </div>
        </div>
      )}

      <div className="relative z-10 flex flex-col justify-between min-h-[980px]">
        <div>
          {/* Sample Banner if marked as sample */}
          {invoice.isSample && (
            <div className="bg-red-50 border border-dashed border-red-400 text-red-700 font-extrabold text-center py-1 tracking-wider uppercase text-xs mb-3 rounded-xs">
              SAMPLE TAX INVOICE — NOT FOR PAYMENT
            </div>
          )}

          {/* 1. Company Header */}
          <div className="text-center pb-2.5 border-b-2 border-slate-900">
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight font-sans">
              {seller.companyName || 'RUDHVIN ENTERPRISES'}
            </h1>
            {invoice.isSample && (
              <p className="text-[11px] font-bold text-red-600 tracking-wide uppercase mt-0.5">
                SAMPLE TAX INVOICE — NOT FOR PAYMENT
              </p>
            )}
            <p className="text-[11px] font-medium text-slate-700 leading-tight mt-1 max-w-xl mx-auto">
              {seller.address || 'D.No.9-6-105/1/3, 2nd Floor, 1st Portion, Mangapuram Colony, Near Kalabharathi, Sivajipalem, LB Colony, Visakhapatnam - 530017.'}
            </p>
            <div className="text-xs font-bold text-[#1E3A8A] mt-1 flex flex-wrap items-center justify-center gap-2">
              <span>GSTIN: <strong>{seller.gstin || '37DGBPV1007RIZU'}</strong></span>
              <span>•</span>
              <span>Ph: <strong>{seller.phone || seller.mobile || '7075708933'}</strong></span>
              <span>•</span>
              <span>Email: <strong>{seller.email || 'rudhvinenterprises@gmail.com'}</strong></span>
            </div>
          </div>

          {/* 2. Bordered, Two-Column Invoice Information Section */}
          <div className="border-2 border-slate-900 grid grid-cols-12 my-3 text-[11.5px] bg-white divide-x-2 divide-slate-900">
            {/* Left Column */}
            <div className="col-span-5 p-3 space-y-1.5 bg-slate-50/60">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-700">Invoice Number:</span>
                <span className="font-black text-[#1E3A8A] text-xs">{invoiceNumber}</span>
              </div>
              {invoice.gemContractNumber && (
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-700">GeM Contract No:</span>
                  <span className="font-semibold text-slate-900">{invoice.gemContractNumber}</span>
                </div>
              )}
              {dueDateStr && (
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-700">Due Date:</span>
                  <span className="font-medium">{dueDateStr}</span>
                </div>
              )}
              {invoice.paymentTerms && (
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-700">Payment Terms:</span>
                  <span className="font-medium text-slate-800">{invoice.paymentTerms}</span>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="col-span-7 p-3 space-y-1.5">
              <div>
                <div className="font-extrabold text-slate-900 uppercase text-[11px] tracking-wider mb-0.5">Bill To:</div>
                <div className="font-bold text-slate-900 uppercase text-xs">
                  {customer.organization || customer.name || 'CUSTOMER NAME'}
                </div>
                <div className="whitespace-pre-line text-slate-700 text-[11px] leading-snug mt-0.5">
                  {customer.billingAddress || customer.address || 'Customer billing address'}
                </div>
              </div>

              <div className="pt-1.5 border-t border-slate-200 grid grid-cols-1 gap-1 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-700 min-w-[95px]">Buyer GSTIN:</span>
                  <span className="font-semibold text-slate-900">{customer.gstin || 'Unregistered'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-700 min-w-[95px]">Invoice Date:</span>
                  <span className="font-medium text-slate-900">{invoiceDateStr}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-700 min-w-[95px]">Place of Supply:</span>
                  <span className="font-medium text-slate-900">{invoice.placeOfSupply || customer.state || '37 - Andhra Pradesh'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Items Table (6 Columns in exact required order) */}
          <div className="border border-slate-900 overflow-hidden">
            <table className="w-full border-collapse text-[11.5px]">
              <thead>
                <tr className="bg-[#1E3A8A] text-white font-bold border-b border-slate-900">
                  <th className="py-2 px-2 text-center border-r border-slate-800 w-12">S.No.</th>
                  <th className="py-2 px-3 text-left border-r border-slate-800">Description of Goods</th>
                  <th className="py-2 px-2 text-center border-r border-slate-800 w-24">HSN</th>
                  <th className="py-2 px-2 text-center border-r border-slate-800 w-20">Qty</th>
                  <th className="py-2 px-3 text-right border-r border-slate-800 w-28">Taxable Value (₹)</th>
                  <th className="py-2 px-3 text-right w-28">Line Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const taxableVal = item.taxableValue !== undefined ? item.taxableValue : (item.taxableAmount || (item.quantity * (item.unitRate || item.rate || 0)));
                  const lineTot = item.lineTotal !== undefined ? item.lineTotal : (item.totalAmount || taxableVal);
                  const qtyStr = `${item.quantity} ${item.unit || 'PCS'}`;

                  return (
                    <tr key={idx} className="border-b border-slate-900 hover:bg-slate-50/50">
                      <td className="py-1.5 px-2 text-center border-r border-slate-900 font-medium">
                        {item.serialNumber || idx + 1}
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-900 font-medium">
                        {item.description}
                      </td>
                      <td className="py-1.5 px-2 text-center border-r border-slate-900">
                        {item.hsnSac || item.hsn || '-'}
                      </td>
                      <td className="py-1.5 px-2 text-center border-r border-slate-900">
                        {qtyStr}
                      </td>
                      <td className="py-1.5 px-3 text-right border-r border-slate-900 font-medium whitespace-nowrap">
                        ₹{formatCurrency(taxableVal)}
                      </td>
                      <td className="py-1.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                        ₹{formatCurrency(lineTot)}
                      </td>
                    </tr>
                  );
                })}

                {Array.from({ length: emptyRowsCount }).map((_, i) => (
                  <tr key={`empty-${i}`} className="border-b border-slate-900">
                    <td className="py-2.5 px-2 border-r border-slate-900">&nbsp;</td>
                    <td className="py-2.5 px-3 border-r border-slate-900">&nbsp;</td>
                    <td className="py-2.5 px-2 border-r border-slate-900">&nbsp;</td>
                    <td className="py-2.5 px-2 border-r border-slate-900">&nbsp;</td>
                    <td className="py-2.5 px-3 border-r border-slate-900">&nbsp;</td>
                    <td className="py-2.5 px-3">&nbsp;</td>
                  </tr>
                ))}

                {/* 4. GST Calculation and Invoice Totals Section directly below table */}
                {/* Row 1: Taxable Value */}
                <tr className="border-b border-slate-900 font-bold bg-white">
                  <td colSpan="5" className="py-1.5 px-3 text-right border-r border-slate-900 text-slate-800">
                    Taxable Value
                  </td>
                  <td className="py-1.5 px-3 text-right font-bold whitespace-nowrap">
                    ₹{formatCurrency(taxableValueTotal)}
                  </td>
                </tr>

                {/* Row 2 & 3: CGST/SGST or IGST */}
                {isInterState ? (
                  <tr className="border-b border-slate-900 font-semibold bg-slate-50/70 text-slate-800">
                    <td colSpan="5" className="py-1.5 px-3 text-right border-r border-slate-900">
                      IGST ({primaryTaxRate}%)
                    </td>
                    <td className="py-1.5 px-3 text-right font-semibold whitespace-nowrap">
                      ₹{formatCurrency(invoice.igstAmount || totalGst)}
                    </td>
                  </tr>
                ) : (
                  <>
                    <tr className="border-b border-slate-900 font-semibold bg-slate-50/70 text-slate-800">
                      <td colSpan="5" className="py-1.5 px-3 text-right border-r border-slate-900">
                        CGST ({invoice.taxBreakdown?.cgstRate !== undefined ? invoice.taxBreakdown.cgstRate : primaryTaxRate / 2}%)
                      </td>
                      <td className="py-1.5 px-3 text-right font-semibold whitespace-nowrap">
                        ₹{formatCurrency(invoice.cgstAmount !== undefined ? invoice.cgstAmount : (invoice.taxBreakdown?.cgstAmount || totalGst / 2))}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-900 font-semibold bg-slate-50/70 text-slate-800">
                      <td colSpan="5" className="py-1.5 px-3 text-right border-r border-slate-900">
                        SGST ({invoice.taxBreakdown?.sgstRate !== undefined ? invoice.taxBreakdown.sgstRate : primaryTaxRate / 2}%)
                      </td>
                      <td className="py-1.5 px-3 text-right font-semibold whitespace-nowrap">
                        ₹{formatCurrency(invoice.sgstAmount !== undefined ? invoice.sgstAmount : (invoice.taxBreakdown?.sgstAmount || totalGst / 2))}
                      </td>
                    </tr>
                  </>
                )}

                {/* Row 4: Total GST */}
                <tr className="border-b border-slate-900 font-bold bg-slate-100 text-slate-900">
                  <td colSpan="5" className="py-1.5 px-3 text-right border-r border-slate-900">
                    Total GST
                  </td>
                  <td className="py-1.5 px-3 text-right font-bold whitespace-nowrap">
                    ₹{formatCurrency(totalGst)}
                  </td>
                </tr>

                {/* Row 5: Total Invoice Value (inclusive of GST) */}
                <tr className="font-black text-xs bg-slate-200/90 text-slate-950 border-t-2 border-slate-900">
                  <td colSpan="5" className="py-2 px-3 text-right border-r border-slate-900 uppercase">
                    Total Invoice Value (inclusive of GST)
                  </td>
                  <td className="py-2 px-3 text-right font-black whitespace-nowrap">
                    ₹{formatCurrency(invoice.grandTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Row 6: Amount in Words */}
          <div className="mt-2.5 p-2.5 bg-slate-50 border border-slate-900 text-[11.5px] rounded-xs font-semibold text-slate-800">
            <span>Amount in Words: </span>
            <span className="font-extrabold text-[#1E3A8A] ml-1">{amountInWords}</span>
          </div>
        </div>

        {/* Bottom Section (Bank Details & Signatory) */}
        <div className="mt-6 pt-3 border-t-2 border-slate-900">
          <div className="grid grid-cols-12 gap-4 text-[11px]">
            {/* Bank Details */}
            <div className="col-span-7">
              <div className="border border-slate-800 bg-slate-50/70 p-2.5 rounded-xs space-y-0.5">
                <div className="font-bold underline text-slate-900 mb-1">Bank Details:</div>
                <div><span className="font-semibold">Account number:</span> {bank.accountNumber || '143201000000719'}</div>
                <div><span className="font-semibold">IFSC Code:</span> {bank.ifscCode || 'KVBL0001432'}</div>
                <div><span className="font-semibold">Account holder name:</span> {bank.accountHolderName || 'RUDHVIN ENTERPRISES'}</div>
                <div><span className="font-semibold">Bank Name:</span> {bank.bankName || 'Karur Vysya Bank'}{bank.branch ? ` (${bank.branch})` : ''}</div>
              </div>
            </div>

            {/* Authorized Signatory */}
            <div className="col-span-5 flex flex-col justify-end text-right">
              <div className="font-semibold text-slate-500 mb-8">For RUDHVIN ENTERPRISES</div>
              <div className="font-bold text-slate-900 uppercase text-xs">Authorized Signatory</div>
              <div className="text-[10px] text-slate-500">
                {seller.phone || seller.mobile || '7075708933'} | {seller.email || 'rudhvinenterprises@gmail.com'}
              </div>
            </div>
          </div>

          <div className="text-center text-[10.5px] text-slate-500 mt-3 pt-1 border-t border-dashed border-slate-300">
            {seller.invoiceFooter || 'This is a computer generated invoice and does not require a physical signature.'}
          </div>
        </div>
      </div>
    </div>
  );
}
