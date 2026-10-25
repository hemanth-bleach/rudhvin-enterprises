import { numberToWords } from '../utils/numberToWords.js';
import { LOGO_DATA_URI } from '../assets/logo_base64.js';

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
  const logoSrc = seller.logoUrl || LOGO_DATA_URI;

  // Recommended Column Widths from prompt:
  // S.No.: 7%
  // Description of Goods: 41%
  // HSN: 11%
  // Qty: 11%
  // Taxable Value (₹): 15%
  // Line Total (₹): 15%
  const itemsRows = items
    .map(
      (item, idx) => {
        const taxableVal = invoice.isTaxInclusive
          ? (item.lineTotal !== undefined ? item.lineTotal : (item.taxableValue !== undefined ? item.taxableValue : (item.quantity * (item.unitRate || item.rate || 0))))
          : (item.taxableValue !== undefined ? item.taxableValue : (item.taxableAmount || (item.quantity * (item.unitRate || item.rate || 0))));
        const lineTot = item.lineTotal !== undefined ? item.lineTotal : (item.totalAmount || taxableVal);
        const qtyStr = `${item.quantity} ${item.unit || 'piece'}`;

        return `
        <tr>
          <td style="width: 7%; text-align: center; border: 1px solid #052c6d; padding: 7px 4px; font-size: 11.5px; font-weight: 500;">${item.serialNumber || idx + 1}</td>
          <td style="width: 41%; border: 1px solid #052c6d; padding: 7px 10px; font-size: 11.5px; font-weight: 500; word-break: break-word;">${item.description || ''}</td>
          <td style="width: 11%; text-align: center; border: 1px solid #052c6d; padding: 7px 4px; font-size: 11.5px;">${item.hsnSac || item.hsn || '-'}</td>
          <td style="width: 11%; text-align: center; border: 1px solid #052c6d; padding: 7px 4px; font-size: 11.5px;">${qtyStr}</td>
          <td style="width: 15%; text-align: right; border: 1px solid #052c6d; padding: 7px 10px; font-size: 11.5px; white-space: nowrap;">₹${formatCurrency(taxableVal)}</td>
          <td style="width: 15%; text-align: right; border: 1px solid #052c6d; padding: 7px 10px; font-size: 11.5px; font-weight: 700; white-space: nowrap;">₹${formatCurrency(lineTot)}</td>
        </tr>
      `;
      }
    )
    .join('');

  // Pad empty rows if fewer than 5 items to match formal invoice reference look
  const emptyRowsCount = Math.max(0, 5 - items.length);
  const emptyRows = Array.from({ length: emptyRowsCount })
    .map(
      () => `
      <tr>
        <td style="border: 1px solid #052c6d; padding: 10px 4px;">&nbsp;</td>
        <td style="border: 1px solid #052c6d; padding: 10px 10px;">&nbsp;</td>
        <td style="border: 1px solid #052c6d; padding: 10px 4px;">&nbsp;</td>
        <td style="border: 1px solid #052c6d; padding: 10px 4px;">&nbsp;</td>
        <td style="border: 1px solid #052c6d; padding: 10px 10px;">&nbsp;</td>
        <td style="border: 1px solid #052c6d; padding: 10px 10px;">&nbsp;</td>
      </tr>
    `
    )
    .join('');

  // GST Calculation rows
  const taxableValueTotal = invoice.isTaxInclusive
    ? (invoice.grandTotal !== undefined ? invoice.grandTotal : (invoice.totalAmount || invoice.taxableValue || 0))
    : (invoice.taxableValue !== undefined ? invoice.taxableValue : (invoice.taxableAmount || invoice.subtotal || 0));
  const totalGst = invoice.totalGst !== undefined ? invoice.totalGst : (invoice.taxBreakdown?.totalTax || 0);
  const primaryTaxRate = invoice.taxBreakdown?.taxRate || 0;

  let gstRows = '';
  if (isInterState) {
    gstRows = `
      <tr>
        <td colspan="4" style="border: none; border-right: 1px solid #052c6d; border-top: 1px solid #052c6d;"></td>
        <td style="text-align: right; border: 1px solid #052c6d; padding: 6px 10px; font-size: 11.5px; font-weight: 700;">
          IGST (${primaryTaxRate}%)
        </td>
        <td style="text-align: right; border: 1px solid #052c6d; padding: 6px 10px; font-size: 11.5px; font-weight: 700; white-space: nowrap;">
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
        <td colspan="4" style="border: none; border-right: 1px solid #052c6d; border-top: 1px solid #052c6d;"></td>
        <td style="text-align: right; border: 1px solid #052c6d; padding: 6px 10px; font-size: 11.5px; font-weight: 700;">
          CGST (${cgstRate}%)
        </td>
        <td style="text-align: right; border: 1px solid #052c6d; padding: 6px 10px; font-size: 11.5px; font-weight: 700; white-space: nowrap;">
          ₹${formatCurrency(cgstAmount)}
        </td>
      </tr>
      <tr>
        <td colspan="4" style="border: none; border-right: 1px solid #052c6d; border-top: 1px solid #052c6d;"></td>
        <td style="text-align: right; border: 1px solid #052c6d; padding: 6px 10px; font-size: 11.5px; font-weight: 700;">
          SGST (${sgstRate}%)
        </td>
        <td style="text-align: right; border: 1px solid #052c6d; padding: 6px 10px; font-size: 11.5px; font-weight: 700; white-space: nowrap;">
          ₹${formatCurrency(sgstAmount)}
        </td>
      </tr>
    `;
  }

  const sampleBanner = invoice.isSample
    ? `<div style="background-color: #fef2f2; border: 1.5px dashed #dc2626; color: #dc2626; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-align: center; padding: 4px; margin-bottom: 8px; text-transform: uppercase;">
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
      margin: 6mm 8mm 8mm 8mm;
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
      background: #ffffff;
      font-size: 11.5px;
      line-height: 1.35;
    }
    .invoice-page {
      width: 100%;
      max-width: 790px;
      margin: 0 auto;
      border: 1.5px solid #052c6d;
      padding: 16px 20px;
      background-color: #ffffff;
      min-height: 1040px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
    }
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 46px;
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
    .items-table {
      width: 100%;
      border-collapse: collapse;
      border: 1.5px solid #052c6d;
      margin-bottom: 0;
      page-break-inside: auto;
    }
    .items-table tr {
      page-break-inside: avoid;
    }
    .items-table thead {
      display: table-header-group;
    }
  </style>
</head>
<body>
  <div class="invoice-page">
    ${sampleWatermark}

    <div>
      ${sampleBanner}

      <!-- 1. Header with RE Logo on Top-Left and Company Info -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 4px;">
        <tr>
          <td style="width: 135px; vertical-align: middle; text-align: left; padding-right: 10px;">
            <img src="${logoSrc}" alt="Rudhvin Enterprises" style="width: 120px; height: auto; object-fit: contain; display: block;" />
          </td>
          <td style="vertical-align: middle; text-align: center;">
            <div style="font-size: 24px; font-weight: 900; color: #052c6d; letter-spacing: 0.5px; text-transform: uppercase; font-family: Arial, sans-serif;">
              ${seller.companyName || 'RUDHVIN ENTERPRISES'}
            </div>
            ${invoice.isSample ? '<div style="color: #dc2626; font-size: 11px; font-weight: 800; letter-spacing: 1px; margin-top: 1px;">SAMPLE TAX INVOICE — NOT FOR PAYMENT</div>' : ''}
            <div style="font-size: 11px; color: #1e293b; margin-top: 3px; line-height: 1.35;">
              ${seller.address || 'D.No.9-6-105/1/3, 2nd Floor, 1st Portion, Mangapuram Colony, Near Kalabharathi,<br>Sivajipalem, LB Colony, Visakhapatnam - 530017.'}
            </div>
            <div style="font-size: 11.5px; color: #052c6d; font-weight: 700; margin-top: 4px;">
              <span>GSTIN: <strong>${seller.gstin || '37DGBPV1007R1ZU'}</strong></span>
              &nbsp;&nbsp;•&nbsp;&nbsp;
              <span>Ph: <strong>${seller.mobile || seller.phone || '+91 9652498933'}</strong></span>
              &nbsp;&nbsp;•&nbsp;&nbsp;
              <span>Email: <strong>${seller.email || 'rudhvinenterprises@gmail.com'}</strong></span>
            </div>
          </td>
        </tr>
      </table>

      <!-- Navy Blue Separator -->
      <div style="border-bottom: 2px solid #052c6d; margin-top: 6px; margin-bottom: 12px;"></div>

      <!-- 2. Bordered Invoice Information Section (Two-Column Layout) -->
      <table style="width: 100%; border: 1.5px solid #052c6d; border-collapse: collapse; margin-bottom: 12px;">
        <tr>
          <!-- Left Column -->
          <td style="width: 44%; vertical-align: top; border-right: 1.5px solid #052c6d; padding: 10px 14px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 11.5px;">
              <tr>
                <td style="padding: 3px 0; color: #1e293b; font-weight: 500; width: 45%;">Invoice Number:</td>
                <td style="padding: 3px 0; font-weight: 800; color: #052c6d; text-align: right; font-size: 13px;">${invoice.invoiceNumber}</td>
              </tr>
              <tr>
                <td style="padding: 3px 0; color: #1e293b; font-weight: 500;">Due Date:</td>
                <td style="padding: 3px 0; font-weight: 600; color: #0f172a; text-align: right;">${dueDateStr || '-'}</td>
              </tr>
              <tr>
                <td style="padding: 3px 0; color: #1e293b; font-weight: 500;">Payment Terms:</td>
                <td style="padding: 3px 0; font-weight: 600; color: #0f172a; text-align: right;">${invoice.paymentTerms || 'Due on Receipt'}</td>
              </tr>
              ${invoice.gemContractNumber ? `
              <tr>
                <td style="padding: 3px 0; color: #1e293b; font-weight: 500;">GeM Contract No:</td>
                <td style="padding: 3px 0; font-weight: 600; color: #0f172a; text-align: right;">${invoice.gemContractNumber}</td>
              </tr>` : ''}
            </table>
          </td>

          <!-- Right Column -->
          <td style="width: 56%; vertical-align: top; padding: 10px 14px;">
            <div style="font-weight: 800; color: #0f172a; font-size: 11.5px; text-transform: uppercase; margin-bottom: 2px;">
              BILL TO:
            </div>
            <div style="font-weight: 800; color: #0f172a; font-size: 12px; text-transform: uppercase;">
              ${customer.organization || customer.name || 'CUSTOMER'}
            </div>
            <div style="font-size: 11px; color: #334155; margin-top: 2px; margin-bottom: 6px; line-height: 1.35;">
              ${(customer.billingAddress || customer.address || '').replace(/\n/g, '<br>')}
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 11.5px; border-top: 1px solid #e2e8f0; padding-top: 4px;">
              <tr>
                <td style="padding: 3px 0; color: #1e293b; font-weight: 700; width: 40%;">Buyer GSTIN:</td>
                <td style="padding: 3px 0; font-weight: 600; color: #0f172a;">${customer.gstin || 'Unregistered'}</td>
              </tr>
              <tr>
                <td style="padding: 3px 0; color: #1e293b; font-weight: 700;">Invoice Date:</td>
                <td style="padding: 3px 0; font-weight: 600; color: #0f172a;">${invoiceDateStr}</td>
              </tr>
              <tr>
                <td style="padding: 3px 0; color: #1e293b; font-weight: 700;">Place of Supply:</td>
                <td style="padding: 3px 0; font-weight: 600; color: #0f172a;">${invoice.placeOfSupply || customer.state || 'Telangana (36)'}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- 3. Invoice Items Table (6 Columns matching reference) -->
      <table class="items-table">
        <thead>
          <tr style="background-color: #052c6d; color: #ffffff;">
            <th style="width: 7%; text-align: center; border: 1px solid #052c6d; padding: 8px 4px; font-size: 11.5px; font-weight: 700;">S.No.</th>
            <th style="width: 41%; text-align: left; border: 1px solid #052c6d; padding: 8px 10px; font-size: 11.5px; font-weight: 700;">Description of Goods</th>
            <th style="width: 11%; text-align: center; border: 1px solid #052c6d; padding: 8px 4px; font-size: 11.5px; font-weight: 700;">HSN</th>
            <th style="width: 11%; text-align: center; border: 1px solid #052c6d; padding: 8px 4px; font-size: 11.5px; font-weight: 700;">Qty</th>
            <th style="width: 15%; text-align: right; border: 1px solid #052c6d; padding: 8px 10px; font-size: 11.5px; font-weight: 700;">Taxable Value (₹)</th>
            <th style="width: 15%; text-align: right; border: 1px solid #052c6d; padding: 8px 10px; font-size: 11.5px; font-weight: 700;">Line Total (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
          ${emptyRows}

          <!-- 4. Financial Totals Section directly below table (aligned to right columns) -->
          <tr>
            <td colspan="4" style="border: none; border-right: 1px solid #052c6d; border-top: 1px solid #052c6d;"></td>
            <td style="text-align: right; border: 1px solid #052c6d; padding: 6px 10px; font-size: 11.5px; font-weight: 700;">
              Taxable Value
            </td>
            <td style="text-align: right; border: 1px solid #052c6d; padding: 6px 10px; font-size: 11.5px; font-weight: 700; white-space: nowrap;">
              ₹${formatCurrency(taxableValueTotal)}
            </td>
          </tr>

          ${gstRows}

          <tr>
            <td colspan="4" style="border: none; border-right: 1px solid #052c6d; border-top: 1px solid #052c6d;"></td>
            <td style="text-align: right; border: 1px solid #052c6d; padding: 6px 10px; font-size: 11.5px; font-weight: 800;">
              Total GST
            </td>
            <td style="text-align: right; border: 1px solid #052c6d; padding: 6px 10px; font-size: 11.5px; font-weight: 800; white-space: nowrap;">
              ₹${formatCurrency(totalGst)}
            </td>
          </tr>

          <tr style="background-color: #e2e9ef;">
            <td colspan="4" style="border: none; border-right: 1px solid #052c6d; border-top: 1px solid #052c6d;"></td>
            <td style="text-align: right; border: 1.5px solid #052c6d; padding: 7px 10px; font-size: 12px; font-weight: 900; color: #052c6d; text-transform: uppercase;">
              TOTAL INVOICE VALUE (INCLUSIVE OF GST)
            </td>
            <td style="text-align: right; border: 1.5px solid #052c6d; padding: 7px 10px; font-size: 12px; font-weight: 900; color: #052c6d; white-space: nowrap;">
              ₹${formatCurrency(invoice.grandTotal)}
            </td>
          </tr>
        </tbody>
      </table>

      <!-- 5. Amount in Words Full-Width Box -->
      <div style="border: 1.5px solid #052c6d; padding: 7px 12px; margin-top: 8px; margin-bottom: 14px; font-size: 11.5px;">
        <span style="color: #0f172a; font-weight: 700;">Amount in Words:</span>
        <span style="font-weight: 800; color: #052c6d; margin-left: 6px;">${amountInWords}</span>
      </div>
    </div>

    <!-- 6. Footer: Bank Details & Authorized Signatory -->
    <div>
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
        <tr>
          <td style="width: 52%; vertical-align: bottom;">
            <div style="border: 1.5px solid #052c6d; padding: 8px 12px; font-size: 11px; line-height: 1.45;">
              <div style="font-weight: 800; text-decoration: underline; color: #052c6d; margin-bottom: 4px;">Bank Details:</div>
              <div>Account number: <strong>${bank.accountNumber || '143201000000719'}</strong></div>
              <div>IFSC Code: <strong>${bank.ifscCode || 'KVBL0001432'}</strong></div>
              <div>Account holder name: <strong>${bank.accountHolderName || 'RUDHVIN ENTERPRISES'}</strong></div>
              <div>Bank Name: <strong>${bank.bankName || 'Karur Vysya Bank'}${bank.branch ? ` (${bank.branch})` : ' (Visakhapatnam)'}</strong></div>
            </div>
          </td>
          <td style="width: 48%; vertical-align: bottom; text-align: right; padding-right: 4px;">
            <div style="font-size: 11px; color: #334155; margin-bottom: 40px;">For RUDHVIN ENTERPRISES</div>
            <div style="border-top: 1px dashed #64748b; width: 190px; margin-left: auto; margin-bottom: 4px;"></div>
            <div style="font-weight: 800; color: #052c6d; font-size: 11px; letter-spacing: 0.5px;">AUTHORIZED SIGNATORY</div>
            <div style="font-size: 10px; color: #475569; margin-top: 2px;">
              ${seller.mobile || seller.phone || '+91 9652498933'} | ${seller.email || 'rudhvinenterprises@gmail.com'}
            </div>
          </td>
        </tr>
      </table>

      <div style="text-align: center; font-size: 10px; color: #475569; margin-top: 14px; border-top: 1px dashed #cbd5e1; padding-top: 6px;">
        ${seller.invoiceFooter || 'This is a computer generated invoice and does not require a physical signature.'}
      </div>
    </div>
  </div>
</body>
</html>`;
}
