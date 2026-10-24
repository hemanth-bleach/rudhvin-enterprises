import { numberToWords } from '../utils/numberToWords.js';

export function getInvoiceHtml(invoice) {
  const seller = invoice.sellerSnapshot || {};
  const customer = invoice.customerSnapshot || invoice.customer || {};
  const bank = seller.bankDetails || {};
  const items = invoice.items || invoice.lineItems || [];

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
  const isInterState = Boolean(invoice.taxBreakdown?.isInterState);

  // Six columns in exact order:
  // 1. S.No.
  // 2. Description of Goods
  // 3. HSN
  // 4. Qty
  // 5. Taxable Value (₹)
  // 6. Line Total (₹)
  const itemsRows = items
    .map(
      (item, idx) => {
        const taxableVal = item.taxableValue !== undefined ? item.taxableValue : (item.taxableAmount || (item.quantity * (item.unitRate || item.rate || 0)));
        const lineTot = item.lineTotal !== undefined ? item.lineTotal : (item.totalAmount || taxableVal);
        const qtyStr = `${item.quantity} ${item.unit || 'PCS'}`;

        return `
        <tr>
          <td style="text-align: center; border: 1px solid #0f172a; padding: 7px 4px; font-size: 12px; font-weight: 500;">${item.serialNumber || idx + 1}</td>
          <td style="border: 1px solid #0f172a; padding: 7px 10px; font-size: 12px; font-weight: 500; word-break: break-word;">${item.description || ''}</td>
          <td style="text-align: center; border: 1px solid #0f172a; padding: 7px 4px; font-size: 12px;">${item.hsnSac || item.hsn || '-'}</td>
          <td style="text-align: center; border: 1px solid #0f172a; padding: 7px 4px; font-size: 12px;">${qtyStr}</td>
          <td style="text-align: right; border: 1px solid #0f172a; padding: 7px 8px; font-size: 12px; white-space: nowrap;">₹${formatCurrency(taxableVal)}</td>
          <td style="text-align: right; border: 1px solid #0f172a; padding: 7px 8px; font-size: 12px; font-weight: 600; white-space: nowrap;">₹${formatCurrency(lineTot)}</td>
        </tr>
      `;
      }
    )
    .join('');

  // Pad empty rows if fewer than 4 items to maintain clean layout
  const emptyRowsCount = Math.max(0, 4 - items.length);
  const emptyRows = Array.from({ length: emptyRowsCount })
    .map(
      () => `
      <tr>
        <td style="border: 1px solid #0f172a; padding: 10px 4px;">&nbsp;</td>
        <td style="border: 1px solid #0f172a; padding: 10px 8px;">&nbsp;</td>
        <td style="border: 1px solid #0f172a; padding: 10px 4px;">&nbsp;</td>
        <td style="border: 1px solid #0f172a; padding: 10px 4px;">&nbsp;</td>
        <td style="border: 1px solid #0f172a; padding: 10px 8px;">&nbsp;</td>
        <td style="border: 1px solid #0f172a; padding: 10px 8px;">&nbsp;</td>
      </tr>
    `
    )
    .join('');

  // GST Calculation rows
  const taxableValueTotal = invoice.taxableValue !== undefined ? invoice.taxableValue : (invoice.taxableAmount || invoice.subtotal || 0);
  const totalGst = invoice.totalGst !== undefined ? invoice.totalGst : (invoice.taxBreakdown?.totalTax || 0);
  const primaryTaxRate = invoice.taxBreakdown?.taxRate || 0;

  let gstRows = '';
  if (isInterState) {
    gstRows = `
      <tr>
        <td colspan="5" style="text-align: right; border: 1px solid #0f172a; padding: 6px 10px; font-size: 12px; font-weight: 600; background-color: #f8fafc;">
          IGST (${primaryTaxRate}%)
        </td>
        <td style="text-align: right; border: 1px solid #0f172a; padding: 6px 10px; font-size: 12px; font-weight: 600; white-space: nowrap;">
          ₹${formatCurrency(invoice.igstAmount || totalGst)}
        </td>
      </tr>
    `;
  } else {
    const cgstRate = invoice.taxBreakdown?.cgstRate !== undefined ? invoice.taxBreakdown.cgstRate : primaryTaxRate / 2;
    const sgstRate = invoice.taxBreakdown?.sgstRate !== undefined ? invoice.taxBreakdown.sgstRate : primaryTaxRate / 2;
    const cgstAmount = invoice.cgstAmount !== undefined ? invoice.cgstAmount : (invoice.taxBreakdown?.cgstAmount || totalGst / 2);
    const sgstAmount = invoice.sgstAmount !== undefined ? invoice.sgstAmount : (invoice.taxBreakdown?.sgstAmount || totalGst / 2);

    gstRows = `
      <tr>
        <td colspan="5" style="text-align: right; border: 1px solid #0f172a; padding: 6px 10px; font-size: 12px; font-weight: 600; background-color: #f8fafc;">
          CGST (${cgstRate}%)
        </td>
        <td style="text-align: right; border: 1px solid #0f172a; padding: 6px 10px; font-size: 12px; font-weight: 600; white-space: nowrap;">
          ₹${formatCurrency(cgstAmount)}
        </td>
      </tr>
      <tr>
        <td colspan="5" style="text-align: right; border: 1px solid #0f172a; padding: 6px 10px; font-size: 12px; font-weight: 600; background-color: #f8fafc;">
          SGST (${sgstRate}%)
        </td>
        <td style="text-align: right; border: 1px solid #0f172a; padding: 6px 10px; font-size: 12px; font-weight: 600; white-space: nowrap;">
          ₹${formatCurrency(sgstAmount)}
        </td>
      </tr>
    `;
  }

  const sampleBanner = invoice.isSample
    ? `<div style="background-color: #fef2f2; border: 1.5px dashed #dc2626; color: #dc2626; font-size: 12px; font-weight: 800; letter-spacing: 1.5px; text-align: center; padding: 5px; margin-bottom: 8px; text-transform: uppercase;">
        SAMPLE TAX INVOICE — NOT FOR PAYMENT
       </div>`
    : '';

  const sampleWatermark = invoice.isSample
    ? `<div class="watermark">SAMPLE INVOICE<br>NOT FOR PAYMENT</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 12mm 12mm;
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
      color: #0f172a;
      background: #fff;
      font-size: 12px;
      line-height: 1.35;
    }
    .invoice-wrapper {
      width: 100%;
      max-width: 820px;
      margin: 0 auto;
      border: 1.5px solid #0f172a;
      padding: 16px 20px;
      position: relative;
      background-color: #ffffff;
      min-height: 1040px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 48px;
      font-weight: 900;
      color: rgba(220, 38, 38, 0.08);
      pointer-events: none;
      z-index: 0;
      text-transform: uppercase;
      letter-spacing: 4px;
      text-align: center;
      line-height: 1.25;
      border: 4px dashed rgba(220, 38, 38, 0.12);
      padding: 20px 40px;
    }
    
    /* Company Header */
    .company-header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
      position: relative;
      z-index: 1;
    }
    .company-title {
      color: #0f172a;
      font-size: 24px;
      font-weight: 900;
      letter-spacing: 0.5px;
      margin: 0 0 2px 0;
      text-transform: uppercase;
      text-align: center;
      font-family: 'Arial Black', Arial, sans-serif;
    }
    .company-subtitle {
      color: #dc2626;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1px;
      text-align: center;
      margin-bottom: 3px;
    }
    .company-address {
      color: #334155;
      font-size: 11px;
      font-weight: 500;
      text-align: center;
      margin: 0 0 2px 0;
      line-height: 1.3;
    }
    .company-contacts {
      color: #1e3a8a;
      font-size: 11.5px;
      font-weight: 700;
      text-align: center;
      margin: 0;
    }
    .header-rule {
      border-top: 1.5px solid #0f172a;
      margin: 8px 0 10px 0;
    }

    /* Invoice Information Section (Bordered 2-column layout) */
    .info-table {
      width: 100%;
      border: 1.5px solid #0f172a;
      border-collapse: collapse;
      margin-bottom: 12px;
      position: relative;
      z-index: 1;
    }
    .info-left-col {
      width: 44%;
      vertical-align: top;
      border-right: 1.5px solid #0f172a;
      padding: 10px 12px;
      background-color: #fafafb;
    }
    .info-right-col {
      width: 56%;
      vertical-align: top;
      padding: 10px 12px;
    }
    .info-field-row {
      margin-bottom: 5px;
      font-size: 12px;
    }
    .info-label {
      font-weight: 700;
      color: #334155;
      display: inline-block;
      min-width: 105px;
    }
    .info-val {
      font-weight: 600;
      color: #0f172a;
    }

    /* Items Table */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      position: relative;
      z-index: 1;
      page-break-inside: auto;
    }
    .items-table tr {
      page-break-inside: avoid;
    }
    .items-table thead {
      display: table-header-group;
    }
    .items-table th {
      background-color: #1E3A8A;
      color: #ffffff;
      border: 1px solid #0f172a;
      padding: 8px 6px;
      font-size: 11.5px;
      font-weight: 700;
      letter-spacing: 0.3px;
    }

    /* Totals & Amount in Words */
    .amount-words-box {
      border: 1px solid #0f172a;
      background-color: #f8fafc;
      padding: 8px 12px;
      margin-top: 6px;
      margin-bottom: 12px;
      font-size: 11.5px;
      position: relative;
      z-index: 1;
    }

    /* Bottom Section */
    .bottom-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      position: relative;
      z-index: 1;
    }
    .bank-box {
      border: 1.2px solid #334155;
      padding: 8px 12px;
      background-color: #f8fafc;
      font-size: 11px;
      line-height: 1.45;
    }
    .signatory-box {
      text-align: right;
      padding: 4px 10px;
      font-size: 11px;
      line-height: 1.4;
    }
    .footer-note {
      text-align: center;
      font-size: 10.5px;
      color: #64748b;
      margin-top: 12px;
      border-top: 1px dashed #cbd5e1;
      padding-top: 5px;
    }
  </style>
</head>
<body>
  <div class="invoice-wrapper">
    ${sampleWatermark}

    <div>
      ${sampleBanner}

      <!-- 1. Company Header -->
      <table class="company-header-table">
        <tr>
          <td>
            <div class="company-title">${seller.companyName || 'RUDHVIN ENTERPRISES'}</div>
            ${invoice.isSample ? '<div class="company-subtitle">SAMPLE TAX INVOICE — NOT FOR PAYMENT</div>' : ''}
            <div class="company-address">${seller.address || 'D.No.9-6-105/1/3, 2nd Floor, 1st Portion, Mangapuram Colony, Near Kalabharathi, Sivajipalem, LB Colony, Visakhapatnam - 530017.'}</div>
            <div class="company-contacts">
              <span>GSTIN: <strong>${seller.gstin || '37DGBPV1007RIZU'}</strong></span>
              &nbsp;|&nbsp;
              <span>Ph: <strong>${seller.phone || seller.mobile || '7075708933'}</strong></span>
              &nbsp;|&nbsp;
              <span>Email: <strong>${seller.email || 'rudhvinenterprises@gmail.com'}</strong></span>
            </div>
          </td>
        </tr>
      </table>

      <div class="header-rule"></div>

      <!-- 2. Bordered, Two-Column Invoice Information Section -->
      <table class="info-table">
        <tr>
          <!-- Left Column -->
          <td class="info-left-col">
            <div class="info-field-row">
              <span class="info-label">Invoice Number:</span>
              <span class="info-val" style="color: #1E3A8A; font-weight: 800; font-size: 13px;">${invoice.invoiceNumber}</span>
            </div>
            ${invoice.gemContractNumber ? `
              <div class="info-field-row">
                <span class="info-label">GeM Contract No:</span>
                <span class="info-val">${invoice.gemContractNumber}</span>
              </div>
            ` : ''}
            ${dueDateStr ? `
              <div class="info-field-row">
                <span class="info-label">Due Date:</span>
                <span class="info-val">${dueDateStr}</span>
              </div>
            ` : ''}
            ${invoice.paymentTerms ? `
              <div class="info-field-row">
                <span class="info-label">Payment Terms:</span>
                <span class="info-val">${invoice.paymentTerms}</span>
              </div>
            ` : ''}
          </td>

          <!-- Right Column -->
          <td class="info-right-col">
            <div style="font-weight: 800; color: #0f172a; text-transform: uppercase; font-size: 12px; margin-bottom: 2px;">
              Bill To:
            </div>
            <div style="font-weight: 700; color: #1e293b; font-size: 12.5px; text-transform: uppercase;">
              ${customer.organization || customer.name || 'CUSTOMER'}
            </div>
            <div style="font-size: 11px; color: #334155; margin: 2px 0 6px 0; line-height: 1.35;">
              ${(customer.billingAddress || customer.address || '').replace(/\n/g, '<br>')}
            </div>
            <div class="info-field-row">
              <span class="info-label">Buyer GSTIN:</span>
              <span class="info-val">${customer.gstin || 'Unregistered'}</span>
            </div>
            <div class="info-field-row">
              <span class="info-label">Invoice Date:</span>
              <span class="info-val">${invoiceDateStr}</span>
            </div>
            <div class="info-field-row">
              <span class="info-label">Place of Supply:</span>
              <span class="info-val">${invoice.placeOfSupply || customer.state || '37 - Andhra Pradesh'}</span>
            </div>
          </td>
        </tr>
      </table>

      <!-- 3. Replace Invoice Items Table (6 columns matching reference) -->
      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 45px; text-align: center;">S.No.</th>
            <th style="text-align: left; padding-left: 10px;">Description of Goods</th>
            <th style="width: 90px; text-align: center;">HSN</th>
            <th style="width: 80px; text-align: center;">Qty</th>
            <th style="width: 125px; text-align: right; padding-right: 8px;">Taxable Value (₹)</th>
            <th style="width: 125px; text-align: right; padding-right: 8px;">Line Total (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
          ${emptyRows}

          <!-- 4. GST Calculation and Invoice Totals Section directly below items table -->
          <!-- Row 1: Taxable Value -->
          <tr>
            <td colspan="5" style="text-align: right; border: 1px solid #0f172a; padding: 6px 10px; font-size: 12px; font-weight: 700;">
              Taxable Value
            </td>
            <td style="text-align: right; border: 1px solid #0f172a; padding: 6px 10px; font-size: 12px; font-weight: 700; white-space: nowrap;">
              ₹${formatCurrency(taxableValueTotal)}
            </td>
          </tr>

          <!-- Row 2 & 3: CGST/SGST or IGST at applicable rate -->
          ${gstRows}

          <!-- Row 4: Total GST -->
          <tr>
            <td colspan="5" style="text-align: right; border: 1px solid #0f172a; padding: 6px 10px; font-size: 12px; font-weight: 700; background-color: #f1f5f9;">
              Total GST
            </td>
            <td style="text-align: right; border: 1px solid #0f172a; padding: 6px 10px; font-size: 12px; font-weight: 700; white-space: nowrap; background-color: #f1f5f9;">
              ₹${formatCurrency(totalGst)}
            </td>
          </tr>

          <!-- Row 5: Total Invoice Value (inclusive of GST) -->
          <tr style="background-color: #e2e8f0;">
            <td colspan="5" style="text-align: right; border: 1.5px solid #0f172a; padding: 8px 10px; font-size: 13px; font-weight: 900; color: #0f172a;">
              Total Invoice Value (inclusive of GST)
            </td>
            <td style="text-align: right; border: 1.5px solid #0f172a; padding: 8px 10px; font-size: 13px; font-weight: 900; color: #0f172a; white-space: nowrap;">
              ₹${formatCurrency(invoice.grandTotal)}
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Row 6: Amount in Words -->
      <div class="amount-words-box">
        <strong>Amount in Words:</strong>
        <span style="font-weight: 800; color: #1e3a8a; margin-left: 6px;">${amountInWords}</span>
      </div>
    </div>

    <!-- Bottom Section (Bank Details & Signatory) -->
    <div>
      <table class="bottom-table">
        <tr>
          <td style="width: 58%; vertical-align: bottom;">
            <div class="bank-box">
              <div style="font-weight: bold; text-decoration: underline; margin-bottom: 3px; color: #0f172a;">Bank Details:</div>
              <div>Account number: <strong>${bank.accountNumber || '143201000000719'}</strong></div>
              <div>IFSC Code: <strong>${bank.ifscCode || 'KVBL0001432'}</strong></div>
              <div>Account holder name: <strong>${bank.accountHolderName || 'RUDHVIN ENTERPRISES'}</strong></div>
              <div>Bank Name: <strong>${bank.bankName || 'Karur Vysya Bank'}</strong>${bank.branch ? ` (${bank.branch})` : ''}</div>
            </div>
          </td>
          <td style="width: 42%; vertical-align: bottom;">
            <div class="signatory-box">
              <div style="font-weight: 700; color: #64748b; margin-bottom: 35px;">For RUDHVIN ENTERPRISES</div>
              <div style="font-weight: 800; color: #0f172a; font-size: 12px;">Authorized Signatory</div>
              <div style="font-size: 10px; color: #64748b;">${seller.phone || seller.mobile || '7075708933'} | ${seller.email || 'rudhvinenterprises@gmail.com'}</div>
            </div>
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
