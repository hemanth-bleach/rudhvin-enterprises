import React from 'react';
import { formatINR, formatDate, numberToWords } from '../utils/formatters';
import { LOGO_DATA_URI } from '../assets/logo_base64.js';

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
  const isTaxInclusive = Boolean(invoice.isTaxInclusive || items.some(i => i.isTaxInclusive));
  const taxableValueTotal = isTaxInclusive
    ? (invoice.grandTotal !== undefined ? invoice.grandTotal : (invoice.totalAmount || invoice.taxableValue || 0))
    : (invoice.taxableValue !== undefined ? invoice.taxableValue : (invoice.taxableAmount || invoice.subtotal || 0));
  const totalGst = invoice.totalGst !== undefined ? invoice.totalGst : (invoice.taxBreakdown?.totalTax || 0);
  const primaryTaxRate = invoice.taxBreakdown?.taxRate || 0;
  const amountInWords = invoice.amountInWords || numberToWords(invoice.grandTotal);
  const logoSrc = seller.logoUrl || LOGO_DATA_URI;

  // Pad empty rows if fewer than 5 items to match formal invoice reference look
  const emptyRowsCount = Math.max(0, 5 - items.length);

  return (
    <div className={`bg-white border-[1.5px] border-[#052c6d] shadow-lg p-5 sm:p-6 max-w-[790px] mx-auto text-slate-900 relative font-sans text-[11.5px] leading-normal select-none print-area ${className}`}>
      {/* Background Watermark only for sample invoices */}
      {invoice.isSample && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden opacity-10 z-0">
          <div className="text-center transform -rotate-30 font-black text-5xl tracking-widest text-red-600 leading-tight border-4 border-dashed border-red-500 p-8">
            SAMPLE TAX INVOICE<br />NOT FOR PAYMENT
          </div>
        </div>
      )}

      <div className="relative z-10 flex flex-col justify-between min-h-[990px]">
        <div>
          {/* Sample Banner if marked as sample */}
          {invoice.isSample && (
            <div className="bg-red-50 border border-dashed border-red-400 text-red-700 font-extrabold text-center py-1 tracking-wider uppercase text-xs mb-3 rounded-xs">
              SAMPLE TAX INVOICE — NOT FOR PAYMENT
            </div>
          )}

          {/* 1. Header with RE Logo on Top-Left and Company Info */}
          <div className="flex items-center justify-between pb-2 border-b-2 border-[#052c6d] gap-3">
            {/* Logo on top-left */}
            <div className="w-[130px] shrink-0">
              <img
                src={logoSrc}
                alt="Rudhvin Enterprises Logo"
                className="w-[120px] h-auto object-contain block"
              />
            </div>

            {/* Company Info centered */}
            <div className="flex-1 text-center pr-2">
              <h1 className="text-2xl font-black text-[#052c6d] uppercase tracking-wide font-sans leading-none">
                {seller.companyName || 'RUDHVIN ENTERPRISES'}
              </h1>
              {invoice.isSample && (
                <p className="text-[10.5px] font-bold text-red-600 tracking-wide uppercase mt-0.5">
                  SAMPLE TAX INVOICE — NOT FOR PAYMENT
                </p>
              )}
              <p className="text-[11px] font-medium text-slate-700 leading-tight mt-1 max-w-lg mx-auto">
                {seller.address || 'D.No.9-6-105/1/3, 2nd Floor, 1st Portion, Mangapuram Colony, Near Kalabharathi, Sivajipalem, LB Colony, Visakhapatnam - 530017.'}
              </p>
              <div className="text-[11px] font-bold text-[#052c6d] mt-1 flex flex-wrap items-center justify-center gap-2">
                <span>GSTIN: <strong>{seller.gstin || '37DGBPV1007R1ZU'}</strong></span>
                <span>•</span>
                <span>Ph: <strong>{seller.mobile || seller.phone || '+91 9652498933'}</strong></span>
                <span>•</span>
                <span>Email: <strong>{seller.email || 'rudhvinenterprises@gmail.com'}</strong></span>
              </div>
            </div>
          </div>

          {/* 2. Bordered Invoice Information Section (Two-Column Layout) */}
          <div className="border-[1.5px] border-[#052c6d] grid grid-cols-12 my-3 text-[11.5px] bg-white divide-x-[1.5px] divide-[#052c6d]">
            {/* Left Column (44%) */}
            <div className="col-span-5 p-3 space-y-1 bg-white">
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-700 font-medium">Invoice Number:</span>
                <span className="font-extrabold text-[#052c6d] text-xs">{invoiceNumber}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-700 font-medium">Due Date:</span>
                <span className="font-semibold text-slate-900">{dueDateStr || '-'}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-700 font-medium">Payment Terms:</span>
                <span className="font-semibold text-slate-900">{invoice.paymentTerms || 'Due on Receipt'}</span>
              </div>
              {invoice.gemContractNumber && (
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-700 font-medium">GeM Contract No:</span>
                  <span className="font-semibold text-slate-900">{invoice.gemContractNumber}</span>
                </div>
              )}
            </div>

            {/* Right Column (56%) */}
            <div className="col-span-7 p-3 space-y-1">
              <div>
                <div className="font-extrabold text-slate-900 uppercase text-[11px] tracking-wider mb-0.5">
                  BILL TO:
                </div>
                <div className="font-bold text-slate-900 uppercase text-xs">
                  {customer.organization || customer.name || 'CUSTOMER NAME'}
                </div>
                <div className="whitespace-pre-line text-slate-700 text-[11px] leading-snug mt-0.5">
                  {customer.billingAddress || customer.address || 'Customer billing address'}
                </div>
              </div>

              <div className="pt-1.5 border-t border-slate-200 space-y-0.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Buyer GSTIN:</span>
                  <span className="font-semibold text-slate-900">{customer.gstin || 'Unregistered'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Invoice Date:</span>
                  <span className="font-semibold text-slate-900">{invoiceDateStr}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Place of Supply:</span>
                  <span className="font-semibold text-slate-900">{invoice.placeOfSupply || customer.state || 'Telangana (36)'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Items Table (6 Columns matching reference with dark navy blue header) */}
          <div className="border-[1.5px] border-[#052c6d] overflow-hidden">
            <table className="w-full border-collapse text-[11.5px]">
              <thead>
                <tr className="bg-[#052c6d] text-white font-bold">
                  <th className="py-2 px-1 text-center border-r border-[#052c6d] w-[7%]">S.No.</th>
                  <th className="py-2 px-3 text-left border-r border-[#052c6d] w-[41%]">Description of Goods</th>
                  <th className="py-2 px-1 text-center border-r border-[#052c6d] w-[11%]">HSN</th>
                  <th className="py-2 px-1 text-center border-r border-[#052c6d] w-[11%]">Qty</th>
                  <th className="py-2 px-3 text-right border-r border-[#052c6d] w-[15%]">Taxable Value (₹)</th>
                  <th className="py-2 px-3 text-right w-[15%]">Line Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const taxableVal = isTaxInclusive
                    ? (item.lineTotal !== undefined ? item.lineTotal : (item.taxableValue !== undefined ? item.taxableValue : (item.quantity * (item.unitRate || item.rate || 0))))
                    : (item.taxableValue !== undefined ? item.taxableValue : (item.taxableAmount || (item.quantity * (item.unitRate || item.rate || 0))));
                  const lineTot = item.lineTotal !== undefined ? item.lineTotal : (item.totalAmount || taxableVal);
                  const qtyStr = `${item.quantity} ${item.unit || 'piece'}`;

                  return (
                    <tr key={idx} className="border-b border-[#052c6d] hover:bg-slate-50/50">
                      <td className="py-2 px-1 text-center border-r border-[#052c6d] font-medium">
                        {item.serialNumber || idx + 1}
                      </td>
                      <td className="py-2 px-3 border-r border-[#052c6d] font-medium">
                        {item.description}
                      </td>
                      <td className="py-2 px-1 text-center border-r border-[#052c6d]">
                        {item.hsnSac || item.hsn || '-'}
                      </td>
                      <td className="py-2 px-1 text-center border-r border-[#052c6d]">
                        {qtyStr}
                      </td>
                      <td className="py-2 px-3 text-right border-r border-[#052c6d] font-medium whitespace-nowrap">
                        ₹{formatCurrency(taxableVal)}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                        ₹{formatCurrency(lineTot)}
                      </td>
                    </tr>
                  );
                })}

                {Array.from({ length: emptyRowsCount }).map((_, i) => (
                  <tr key={`empty-${i}`} className="border-b border-[#052c6d]">
                    <td className="py-2.5 px-1 border-r border-[#052c6d]">&nbsp;</td>
                    <td className="py-2.5 px-3 border-r border-[#052c6d]">&nbsp;</td>
                    <td className="py-2.5 px-1 border-r border-[#052c6d]">&nbsp;</td>
                    <td className="py-2.5 px-1 border-r border-[#052c6d]">&nbsp;</td>
                    <td className="py-2.5 px-3 border-r border-[#052c6d]">&nbsp;</td>
                    <td className="py-2.5 px-3">&nbsp;</td>
                  </tr>
                ))}

                {/* 4. Financial Totals Section directly below table (aligned to right columns) */}
                <tr className="border-b border-[#052c6d] font-bold bg-white">
                  <td colSpan="4" className="border-r border-[#052c6d]"></td>
                  <td className="py-1.5 px-3 text-right border-r border-[#052c6d] text-slate-800">
                    Taxable Value
                  </td>
                  <td className="py-1.5 px-3 text-right font-bold whitespace-nowrap">
                    ₹{formatCurrency(taxableValueTotal)}
                  </td>
                </tr>

                {/* GST Rows */}
                {isInterState ? (
                  <tr className="border-b border-[#052c6d] font-semibold bg-white text-slate-800">
                    <td colSpan="4" className="border-r border-[#052c6d]"></td>
                    <td className="py-1.5 px-3 text-right border-r border-[#052c6d]">
                      IGST ({primaryTaxRate}%)
                    </td>
                    <td className="py-1.5 px-3 text-right font-semibold whitespace-nowrap">
                      ₹{formatCurrency(invoice.igstAmount || totalGst)}
                    </td>
                  </tr>
                ) : (
                  <>
                    <tr className="border-b border-[#052c6d] font-semibold bg-white text-slate-800">
                      <td colSpan="4" className="border-r border-[#052c6d]"></td>
                      <td className="py-1.5 px-3 text-right border-r border-[#052c6d]">
                        CGST ({invoice.taxBreakdown?.cgstRate !== undefined ? invoice.taxBreakdown.cgstRate : primaryTaxRate / 2}%)
                      </td>
                      <td className="py-1.5 px-3 text-right font-semibold whitespace-nowrap">
                        ₹{formatCurrency(invoice.cgstAmount !== undefined ? invoice.cgstAmount : (invoice.taxBreakdown?.cgstAmount || totalGst / 2))}
                      </td>
                    </tr>
                    <tr className="border-b border-[#052c6d] font-semibold bg-white text-slate-800">
                      <td colSpan="4" className="border-r border-[#052c6d]"></td>
                      <td className="py-1.5 px-3 text-right border-r border-[#052c6d]">
                        SGST ({invoice.taxBreakdown?.sgstRate !== undefined ? invoice.taxBreakdown.sgstRate : primaryTaxRate / 2}%)
                      </td>
                      <td className="py-1.5 px-3 text-right font-semibold whitespace-nowrap">
                        ₹{formatCurrency(invoice.sgstAmount !== undefined ? invoice.sgstAmount : (invoice.taxBreakdown?.sgstAmount || totalGst / 2))}
                      </td>
                    </tr>
                  </>
                )}

                {/* Total GST */}
                <tr className="border-b border-[#052c6d] font-bold bg-white text-slate-900">
                  <td colSpan="4" className="border-r border-[#052c6d]"></td>
                  <td className="py-1.5 px-3 text-right border-r border-[#052c6d]">
                    Total GST
                  </td>
                  <td className="py-1.5 px-3 text-right font-bold whitespace-nowrap">
                    ₹{formatCurrency(totalGst)}
                  </td>
                </tr>

                {/* Total Invoice Value (inclusive of GST) */}
                <tr className="font-black text-xs bg-[#e2e9ef] text-[#052c6d]">
                  <td colSpan="4" className="border-r border-[#052c6d]"></td>
                  <td className="py-2 px-3 text-right border-r border-[#052c6d] uppercase font-black">
                    TOTAL INVOICE VALUE (INCLUSIVE OF GST)
                  </td>
                  <td className="py-2 px-3 text-right font-black whitespace-nowrap">
                    ₹{formatCurrency(invoice.grandTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 5. Amount in Words Full-Width Box */}
          <div className="mt-2.5 p-2.5 bg-white border-[1.5px] border-[#052c6d] text-[11.5px] rounded-xs font-semibold text-slate-800">
            <span>Amount in Words: </span>
            <span className="font-extrabold text-[#052c6d] ml-1">{amountInWords}</span>
          </div>
        </div>

        {/* 6. Footer: Bank Details & Authorized Signatory */}
        <div className="mt-6 pt-3">
          <div className="grid grid-cols-12 gap-4 text-[11px]">
            {/* Bank Details */}
            <div className="col-span-6">
              <div className="border-[1.5px] border-[#052c6d] bg-white p-2.5 rounded-xs space-y-0.5">
                <div className="font-extrabold underline text-[#052c6d] mb-1">Bank Details:</div>
                <div><span className="font-bold">Account number:</span> {bank.accountNumber || '143201000000719'}</div>
                <div><span className="font-bold">IFSC Code:</span> {bank.ifscCode || 'KVBL0001432'}</div>
                <div><span className="font-bold">Account holder name:</span> {bank.accountHolderName || 'RUDHVIN ENTERPRISES'}</div>
                <div><span className="font-bold">Bank Name:</span> {bank.bankName || 'Karur Vysya Bank'}{bank.branch ? ` (${bank.branch})` : ' (Visakhapatnam)'}</div>
              </div>
            </div>

            {/* Authorized Signatory */}
            <div className="col-span-6 flex flex-col justify-end text-right pr-2">
              <div className="font-semibold text-slate-600 mb-8">For RUDHVIN ENTERPRISES</div>
              <div className="border-t border-dashed border-slate-500 w-44 ml-auto mb-1"></div>
              <div className="font-extrabold text-[#052c6d] uppercase text-[11px] tracking-wide">
                AUTHORIZED SIGNATORY
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {seller.mobile || seller.phone || '+91 9652498933'} | {seller.email || 'rudhvinenterprises@gmail.com'}
              </div>
            </div>
          </div>

          <div className="text-center text-[10px] text-slate-500 mt-4 pt-1.5 border-t border-dashed border-slate-300">
            {seller.invoiceFooter || 'This is a computer generated invoice and does not require a physical signature.'}
          </div>
        </div>
      </div>
    </div>
  );
}
