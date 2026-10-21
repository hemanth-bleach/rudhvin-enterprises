import { numberToWords } from '../utils/numberToWords.js';

export function getInvoiceHtml(invoice) {
  const seller = invoice.sellerSnapshot || {};
  const customer = invoice.customerSnapshot || {};
  const bank = seller.bankDetails || {};
  const items = invoice.lineItems || [];

  const invoiceDateStr = invoice.invoiceDate
    ? new Date(invoice.invoiceDate).toLocaleDateString('en-GB')
    : '';
  const dueDateStr = invoice.dueDate
    ? new Date(invoice.dueDate).toLocaleDateString('en-GB')
    : '';

  const formatCurrency = (val) => {
    return Number(val || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const amountInWords = invoice.amountInWords || numberToWords(invoice.grandTotal);

  const itemsRows = items
    .map(
      (item, idx) => `
      <tr>
        <td style="text-align: center; border: 1px solid #111; padding: 6px 4px; font-size: 13px;">${item.serialNumber || idx + 1}</td>
        <td style="border: 1px solid #111; padding: 6px 8px; font-size: 13px;">${item.description || ''}</td>
        <td style="text-align: center; border: 1px solid #111; padding: 6px 4px; font-size: 13px;">${item.hsnSac || ''}</td>
        <td style="text-align: center; border: 1px solid #111; padding: 6px 4px; font-size: 13px;">${item.quantity || 0} ${item.unit || ''}</td>
        <td style="text-align: right; border: 1px solid #111; padding: 6px 8px; font-size: 13px;">${formatCurrency(item.rate)}</td>
        <td style="text-align: right; border: 1px solid #111; padding: 6px 8px; font-size: 13px;">${formatCurrency(item.totalAmount || (item.quantity * item.rate))}</td>
      </tr>
    `
    )
    .join('');

  // Pad empty rows if fewer than 5 items to match formal invoice look
  const emptyRowsCount = Math.max(0, 5 - items.length);
  const emptyRows = Array.from({ length: emptyRowsCount })
    .map(
      () => `
      <tr>
        <td style="border: 1px solid #111; padding: 12px 4px;">&nbsp;</td>
        <td style="border: 1px solid #111; padding: 12px 8px;">&nbsp;</td>
        <td style="border: 1px solid #111; padding: 12px 4px;">&nbsp;</td>
        <td style="border: 1px solid #111; padding: 12px 4px;">&nbsp;</td>
        <td style="border: 1px solid #111; padding: 12px 8px;">&nbsp;</td>
        <td style="border: 1px solid #111; padding: 12px 8px;">&nbsp;</td>
      </tr>
    `
    )
    .join('');

  // Tax breakdown rows
  let taxRows = '';
  if (invoice.taxBreakdown && invoice.taxBreakdown.totalTax > 0) {
    if (invoice.taxBreakdown.isInterState) {
      taxRows = `
        <tr>
          <td colspan="5" style="text-align: right; border: 1px solid #111; padding: 4px 8px; font-size: 12px; font-weight: bold;">IGST (${invoice.taxBreakdown.igstRate}%)</td>
          <td style="text-align: right; border: 1px solid #111; padding: 4px 8px; font-size: 12px; font-weight: bold;">₹${formatCurrency(invoice.taxBreakdown.igstAmount)}</td>
        </tr>
      `;
    } else {
      taxRows = `
        <tr>
          <td colspan="5" style="text-align: right; border: 1px solid #111; padding: 4px 8px; font-size: 12px; font-weight: bold;">CGST (${invoice.taxBreakdown.cgstRate}%)</td>
          <td style="text-align: right; border: 1px solid #111; padding: 4px 8px; font-size: 12px; font-weight: bold;">₹${formatCurrency(invoice.taxBreakdown.cgstAmount)}</td>
        </tr>
        <tr>
          <td colspan="5" style="text-align: right; border: 1px solid #111; padding: 4px 8px; font-size: 12px; font-weight: bold;">SGST (${invoice.taxBreakdown.sgstRate}%)</td>
          <td style="text-align: right; border: 1px solid #111; padding: 4px 8px; font-size: 12px; font-weight: bold;">₹${formatCurrency(invoice.taxBreakdown.sgstAmount)}</td>
        </tr>
      `;
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    @page {
      size: A4;
      margin: 12mm 15mm 15mm 15mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      margin: 0;
      padding: 0;
      color: #111;
      background: #fff;
      font-size: 13px;
      line-height: 1.35;
    }
    .invoice-container {
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
      border: 1.5px solid #0f172a;
      padding: 18px 24px;
      position: relative;
      background-color: #ffffff;
      min-height: 1050px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    /* Subtle watermark */
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 60px;
      font-weight: 900;
      color: rgba(15, 23, 42, 0.04);
      pointer-events: none;
      z-index: 0;
      text-transform: uppercase;
      letter-spacing: 6px;
      text-align: center;
      line-height: 1.2;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      position: relative;
      z-index: 1;
    }
    .logo-cell {
      width: 160px;
      vertical-align: middle;
      text-align: left;
    }
    .company-info-cell {
      vertical-align: middle;
      text-align: center;
      padding-left: 10px;
    }
    .company-title {
      color: #DC2626;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: 0.5px;
      margin: 0 0 4px 0;
      text-transform: uppercase;
      font-family: 'Arial Black', Arial, sans-serif;
    }
    .company-details {
      color: #0284C7;
      font-size: 11px;
      font-weight: 600;
      line-height: 1.35;
      margin: 0;
    }
    .company-gstin {
      color: #0284C7;
      font-size: 12px;
      font-weight: 700;
      margin-top: 3px;
    }
    .divider {
      border-top: 1.5px solid #111;
      margin: 6px 0 10px 0;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      position: relative;
      z-index: 1;
    }
    .bill-to-cell {
      width: 58%;
      vertical-align: top;
      font-size: 12px;
      line-height: 1.4;
      padding-right: 15px;
    }
    .bill-to-title {
      font-weight: bold;
      margin-bottom: 4px;
      font-size: 12px;
    }
    .customer-name {
      font-weight: bold;
      color: #0f172a;
      text-transform: uppercase;
      margin-bottom: 2px;
      font-size: 13px;
    }
    .invoice-meta-cell {
      width: 42%;
      vertical-align: top;
      text-align: right;
      font-size: 12px;
    }
    .invoice-meta-box {
      border: 1px solid #111;
      padding: 8px 12px;
      display: inline-block;
      text-align: left;
      min-width: 200px;
      background: #fafafa;
    }
    .invoice-banner {
      background: linear-gradient(90deg, #fef3c7 0%, #ffedd5 50%, #fef3c7 100%);
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      text-align: center;
      padding: 5px;
      font-size: 14px;
      font-weight: 800;
      letter-spacing: 2px;
      color: #1e293b;
      margin-bottom: 14px;
      text-transform: uppercase;
      position: relative;
      z-index: 1;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      position: relative;
      z-index: 1;
    }
    .items-table th {
      background: #f1f5f9;
      border: 1px solid #111;
      padding: 7px 6px;
      font-size: 12px;
      font-weight: bold;
      text-align: center;
      color: #0f172a;
    }
    .amount-words-section {
      margin: 10px 0 16px 0;
      font-size: 12px;
      font-weight: bold;
      padding: 6px 10px;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      position: relative;
      z-index: 1;
    }
    .bottom-section {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
      position: relative;
      z-index: 1;
    }
    .bank-details-cell {
      width: 55%;
      vertical-align: bottom;
      font-size: 12px;
      line-height: 1.5;
    }
    .signatory-cell {
      width: 45%;
      vertical-align: bottom;
      text-align: right;
      font-size: 12px;
      line-height: 1.4;
    }
    .bank-box {
      border: 1px solid #334155;
      padding: 8px 12px;
      background: #f8fafc;
    }
    .bank-title {
      font-weight: bold;
      text-decoration: underline;
      margin-bottom: 4px;
      color: #0f172a;
    }
    .signatory-title {
      font-weight: bold;
      margin-bottom: 35px;
      color: #0f172a;
    }
    .signatory-company {
      font-weight: bold;
      color: #DC2626;
      font-size: 13px;
    }
    .footer-note {
      text-align: center;
      font-size: 11px;
      color: #64748b;
      margin-top: 15px;
      border-top: 1px dashed #cbd5e1;
      padding-top: 6px;
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="watermark">
      RUDHVIN<br>ENTERPRISES
    </div>

    <div>
      <!-- Header -->
      <table class="header-table">
        <tr>
          <td class="logo-cell">
            <svg width="150" height="50" viewBox="0 0 200 65" fill="none" xmlns="http://www.w3.org/2000/svg">
              <!-- Golden & Blue Modern Logo Monogram -->
              <path d="M12 12 H38 C48 12 55 18 55 27 C55 35 48 41 38 41 H24 V58 H12 V12Z" fill="#1E3A8A"/>
              <path d="M24 22 H36 C41 22 44 24 44 27 C44 30 41 32 36 32 H24 V22Z" fill="#FFFFFF"/>
              <path d="M36 34 L56 58 H41 L25 38 Z" fill="#F59E0B"/>
              <!-- E Monogram -->
              <path d="M58 12 H90 V21 H69 V30 H86 V38 H69 V49 H92 V58 H58 V12Z" fill="#1E3A8A"/>
              <text x="100" y="28" font-family="Arial, sans-serif" font-weight="900" font-size="14" fill="#1E3A8A" letter-spacing="1">RUDHVIN</text>
              <text x="100" y="44" font-family="Arial, sans-serif" font-weight="700" font-size="10" fill="#64748B" letter-spacing="2">ENTERPRISES</text>
            </svg>
          </td>
          <td class="company-info-cell">
            <h1 class="company-title">${seller.companyName || 'RUDHVIN ENTERPRISES'}</h1>
            <p class="company-details">${seller.address || 'D.No.9-6-105/1/3, 2nd Floor, 1st Portion, Mangapuram Colony, Near Kalabharathi, Sivajipalem, LB Colony, Visakhapatnam - 530017.'} Ph: ${seller.phone || '7075708933'}</p>
            <div class="company-gstin">GSTIN : ${seller.gstin || '37DGBPV1007RIZU'}</div>
          </td>
        </tr>
      </table>

      <div class="divider"></div>

      <!-- Bill To & Meta Section -->
      <table class="meta-table">
        <tr>
          <td class="bill-to-cell">
            <div class="bill-to-title">TO,</div>
            <div class="customer-name">${customer.organization || customer.name || 'CUSTOMER'}</div>
            <div style="white-space: pre-line;">${customer.billingAddress || ''}</div>
            ${customer.phone ? `<div><strong>PH :</strong> ${customer.phone}</div>` : ''}
            ${customer.gstin ? `<div><strong>GSTIN :</strong> ${customer.gstin}</div>` : ''}
            ${customer.state ? `<div><strong>STATE :</strong> ${customer.state} (${customer.stateCode || ''})</div>` : ''}
          </td>
          <td class="invoice-meta-cell">
            <div class="invoice-meta-box">
              <div style="margin-bottom: 4px;"><strong>INVOICE NO:</strong> <span style="color:#0284c7; font-weight:800; font-size:13px;">${invoice.invoiceNumber}</span></div>
              <div style="margin-bottom: 4px;"><strong>Date:</strong> ${invoiceDateStr}</div>
              ${dueDateStr ? `<div style="margin-bottom: 4px;"><strong>Due Date:</strong> ${dueDateStr}</div>` : ''}
              ${invoice.paymentTerms ? `<div><strong>Terms:</strong> ${invoice.paymentTerms}</div>` : ''}
              ${invoice.poNumber ? `<div><strong>P.O. No:</strong> ${invoice.poNumber}</div>` : ''}
            </div>
          </td>
        </tr>
      </table>

      <!-- Banner -->
      <div class="invoice-banner">
        INVOICE
      </div>

      <!-- Items Table -->
      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 45px;">S.No.</th>
            <th>Description</th>
            <th style="width: 85px;">HSN/SAC</th>
            <th style="width: 75px;">Qty</th>
            <th style="width: 100px;">Rate</th>
            <th style="width: 110px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
          ${emptyRows}
          <!-- Subtotal -->
          <tr>
            <td colspan="5" style="text-align: right; border: 1px solid #111; padding: 6px 8px; font-weight: bold;">Subtotal</td>
            <td style="text-align: right; border: 1px solid #111; padding: 6px 8px; font-weight: bold;">₹${formatCurrency(invoice.subtotal)}</td>
          </tr>
          ${invoice.totalDiscount > 0 ? `
            <tr>
              <td colspan="5" style="text-align: right; border: 1px solid #111; padding: 4px 8px; font-size: 12px; color: #dc2626;">Discount</td>
              <td style="text-align: right; border: 1px solid #111; padding: 4px 8px; font-size: 12px; color: #dc2626;">- ₹${formatCurrency(invoice.totalDiscount)}</td>
            </tr>
          ` : ''}
          ${taxRows}
          <!-- Grand Total -->
          <tr style="background-color: #f8fafc;">
            <td colspan="5" style="text-align: right; border: 1.5px solid #111; padding: 8px; font-size: 14px; font-weight: 800; color: #0f172a;">Total / Grand Total</td>
            <td style="text-align: right; border: 1.5px solid #111; padding: 8px; font-size: 14px; font-weight: 800; color: #0f172a;">₹${formatCurrency(invoice.grandTotal)}</td>
          </tr>
        </tbody>
      </table>

      <!-- Amount in words -->
      <div class="amount-words-section">
        <span>Amount Chargeable (in words):</span>
        <span style="font-weight: 800; color: #1e293b; margin-left: 6px;">${amountInWords}</span>
      </div>
    </div>

    <div>
      <!-- Bottom Section (Bank Details & Signatory) -->
      <table class="bottom-section">
        <tr>
          <td class="bank-details-cell">
            <div class="bank-box">
              <div class="bank-title">Bank Details:</div>
              <div><strong>Account number:</strong> ${bank.accountNumber || '143201000000719'}</div>
              <div><strong>IFSC Code:</strong> ${bank.ifscCode || 'KVBL0001432'}</div>
              <div><strong>Account holder name:</strong> ${bank.accountHolderName || 'RUDHVIN ENTERPRISES'}</div>
              <div><strong>Bank Name:</strong> ${bank.bankName || 'Karur Vysya Bank'}</div>
              ${bank.branch ? `<div><strong>Branch:</strong> ${bank.branch}</div>` : ''}
            </div>
          </td>
          <td class="signatory-cell">
            <div class="signatory-title">Authorized Signatory</div>
            <div class="signatory-company">${seller.authorizedSignatory || seller.companyName || 'Rudhvin Enterprises'}</div>
            <div style="font-size: 11px; color: #475569;">Email: ${seller.email || 'rudhvinenterprises@gmail.com'}</div>
            <div style="font-size: 11px; color: #475569;">Phone: ${seller.mobile || seller.phone || '+91 9652496933'}</div>
          </td>
        </tr>
      </table>

      <div class="footer-note">
        ${seller.invoiceFooter || 'This is a computer generated invoice and does not require a physical signature.'}
      </div>
    </div>
  </div>
</body>
</html>`;
}
