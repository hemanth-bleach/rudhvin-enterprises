import { InvoiceSequence } from '../models/InvoiceSequence.js';
import { Company } from '../models/Company.js';
import { numberToWords } from '../utils/numberToWords.js';

export async function getNextInvoiceNumber(session = null) {
  const company = await Company.findOne().lean();
  const prefix = company?.invoicePrefix || 'RU';
  const padding = company?.invoiceNumberPadding || 3;
  const key = prefix;

  const options = { new: true, upsert: true };
  if (session) options.session = session;

  const seqDoc = await InvoiceSequence.findOneAndUpdate(
    { key },
    { $inc: { currentSequence: 1 }, $setOnInsert: { prefix } },
    options
  );

  const numStr = String(seqDoc.currentSequence).padStart(padding, '0');
  return `${prefix}${numStr}`;
}

export async function peekNextInvoiceNumber() {
  const company = await Company.findOne().lean();
  const prefix = company?.invoicePrefix || 'RU';
  const padding = company?.invoiceNumberPadding || 3;
  const key = prefix;

  const seqDoc = await InvoiceSequence.findOne({ key }).lean();
  const nextSeq = (seqDoc?.currentSequence || 0) + 1;
  const numStr = String(nextSeq).padStart(padding, '0');
  return `${prefix}${numStr}`;
}

export function round(value, decimals = 2) {
  return Number(Math.round(Number(value + 'e' + decimals)) + 'e-' + decimals);
}

export function calculateInvoiceTotals(items, sellerStateCode, customerStateCode, manualDiscount = 0) {
  let subtotal = 0;
  let totalItemDiscount = 0;
  let taxableAmount = 0;
  let totalTax = 0;

  const isInterState = Boolean(
    sellerStateCode &&
    customerStateCode &&
    String(sellerStateCode).trim() !== String(customerStateCode).trim()
  );

  const calculatedItems = (items || []).map((item, idx) => {
    const qty = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    const lineSubtotal = round(qty * rate);

    const discPercent = Number(item.discountPercent) || 0;
    const discAmount = round((lineSubtotal * discPercent) / 100);

    const lineTaxable = round(lineSubtotal - discAmount);
    const taxRate = Number(item.taxRate) || 0;
    const lineTax = round((lineTaxable * taxRate) / 100);
    const lineTotal = round(lineTaxable + lineTax);

    subtotal = round(subtotal + lineSubtotal);
    totalItemDiscount = round(totalItemDiscount + discAmount);
    taxableAmount = round(taxableAmount + lineTaxable);
    totalTax = round(totalTax + lineTax);

    return {
      serialNumber: item.serialNumber || idx + 1,
      description: item.description?.trim() || '',
      hsnSac: item.hsnSac?.trim() || '',
      quantity: qty,
      unit: item.unit?.trim() || 'PCS',
      rate: rate,
      discountPercent: discPercent,
      discountAmount: discAmount,
      taxRate: taxRate,
      taxableAmount: lineTaxable,
      taxAmount: lineTax,
      totalAmount: lineTotal
    };
  });

  const totalDiscount = round(totalItemDiscount + (Number(manualDiscount) || 0));
  const grandTotal = round(taxableAmount + totalTax);

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (isInterState) {
    igstAmount = totalTax;
  } else {
    cgstAmount = round(totalTax / 2);
    sgstAmount = round(totalTax - cgstAmount);
  }

  // Find max tax rate among items for summary display
  const primaryTaxRate = calculatedItems.reduce((max, item) => Math.max(max, item.taxRate || 0), 0);

  return {
    items: calculatedItems,
    subtotal,
    totalDiscount,
    taxableAmount,
    taxBreakdown: {
      isInterState,
      taxRate: primaryTaxRate,
      cgstRate: isInterState ? 0 : round(primaryTaxRate / 2),
      cgstAmount,
      sgstRate: isInterState ? 0 : round(primaryTaxRate / 2),
      sgstAmount,
      igstRate: isInterState ? primaryTaxRate : 0,
      igstAmount,
      totalTax
    },
    grandTotal,
    amountInWords: numberToWords(grandTotal)
  };
}
