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

/**
 * Authoritative Invoice Calculation Engine
 * 
 * Line Calculation Rules:
 *  Gross Amount = Quantity × Unit Rate
 *  Discount Amount = Gross Amount × Discount Percentage / 100
 *  Taxable Value = Gross Amount − Discount Amount
 *  Intra-state:
 *    CGST = Taxable Value × (GST Rate / 2) / 100
 *    SGST = Taxable Value × (GST Rate / 2) / 100
 *  Inter-state:
 *    IGST = Taxable Value × GST Rate / 100
 *  Total GST = CGST + SGST + IGST
 *  Line Total = Taxable Value + Total GST
 * 
 * Invoice Totals:
 *  Total Taxable Value = sum of line Taxable Values
 *  Total CGST = sum of line CGST
 *  Total SGST = sum of line SGST
 *  Total IGST = sum of line IGST
 *  Total GST = Total CGST + Total SGST + Total IGST
 *  Invoice Total = Total Taxable Value + Total GST - manualDiscount
 */
export function calculateInvoiceTotals(
  items = [],
  sellerStateCode = '37',
  customerStateCode = '37',
  manualDiscount = 0,
  options = {}
) {
  // Determine tax treatment: explicit override or compare place-of-supply / states
  let isInterState = false;
  if (options.taxTreatment === 'inter_state' || options.isInterState === true) {
    isInterState = true;
  } else if (options.taxTreatment === 'intra_state' || options.isInterState === false) {
    isInterState = false;
  } else {
    // Check placeOfSupply if provided
    let custState = String(customerStateCode || '').trim();
    if (options.placeOfSupply) {
      const posMatch = String(options.placeOfSupply).match(/\b(\d{2})\b/);
      if (posMatch) {
        custState = posMatch[1];
      }
    }
    const sellState = String(sellerStateCode || '37').trim();
    isInterState = Boolean(sellState && custState && sellState !== custState);
  }

  let grossSubtotal = 0;
  let totalItemDiscount = 0;
  let totalTaxableValue = 0;
  let totalCgstAmount = 0;
  let totalSgstAmount = 0;
  let totalIgstAmount = 0;

  // Rate-wise grouping for multi-rate breakdown
  const rateGroups = {};

  const calculatedItems = (items || []).map((item, idx) => {
    const qty = Number(item.quantity) || 0;
    const unitRate = Number(item.unitRate !== undefined ? item.unitRate : item.rate) || 0;
    const isTaxInclusive = Boolean(
      item.isTaxInclusive !== undefined
        ? item.isTaxInclusive
        : (item.priceIncludesTax !== undefined ? item.priceIncludesTax : options.isTaxInclusive)
    );
    const gstRate = Number(item.gstRate !== undefined ? item.gstRate : item.taxRate) || 0;

    let lineGross = round(qty * unitRate);
    let discPercent = Number(item.discountPercent) || 0;
    let discAmount = 0;
    let taxableValue = 0;
    let lineGstAmount = 0;
    let cgstRate = 0;
    let cgstAmount = 0;
    let sgstRate = 0;
    let sgstAmount = 0;
    let igstRate = 0;
    let igstAmount = 0;
    let lineTotal = 0;

    if (isTaxInclusive) {
      // Tax-Inclusive: Rate/line total includes GST. CGST and SGST are subtracted (minus) from the gross/rate to calculate Taxable Value.
      if (item.discountAmount !== undefined && item.discountAmount > 0 && !item.discountPercent) {
        discAmount = round(Number(item.discountAmount));
        discPercent = lineGross > 0 ? round((discAmount / lineGross) * 100, 2) : 0;
      } else {
        discAmount = round((lineGross * discPercent) / 100);
      }
      const netInclusive = round(lineGross - discAmount);

      const baseTaxable = gstRate > 0 ? round(netInclusive / (1 + gstRate / 100)) : netInclusive;
      lineGstAmount = round(netInclusive - baseTaxable);

      if (isInterState) {
        igstRate = gstRate;
        igstAmount = lineGstAmount;
        totalIgstAmount = round(totalIgstAmount + igstAmount);
      } else {
        cgstRate = round(gstRate / 2, 2);
        sgstRate = round(gstRate / 2, 2);
        cgstAmount = round((baseTaxable * (gstRate / 2)) / 100);
        sgstAmount = round(lineGstAmount - cgstAmount);
        totalCgstAmount = round(totalCgstAmount + cgstAmount);
        totalSgstAmount = round(totalSgstAmount + sgstAmount);
      }

      // Both Taxable Value and Line Total display the same value (net contract amount, e.g. ₹1,000.00)
      taxableValue = netInclusive;
      lineTotal = netInclusive;
    } else {
      // Tax-Exclusive: GST is calculated on Taxable Value and added to reach Line Total.
      if (item.discountAmount !== undefined && item.discountAmount > 0 && !item.discountPercent) {
        discAmount = round(Number(item.discountAmount));
        discPercent = lineGross > 0 ? round((discAmount / lineGross) * 100, 2) : 0;
      } else {
        discAmount = round((lineGross * discPercent) / 100);
      }

      taxableValue = round(lineGross - discAmount);

      if (isInterState) {
        igstRate = gstRate;
        igstAmount = round((taxableValue * gstRate) / 100);
        lineGstAmount = igstAmount;
        totalIgstAmount = round(totalIgstAmount + igstAmount);
      } else {
        cgstRate = round(gstRate / 2, 2);
        sgstRate = round(gstRate / 2, 2);
        cgstAmount = round((taxableValue * (gstRate / 2)) / 100);
        sgstAmount = round((taxableValue * (gstRate / 2)) / 100);
        lineGstAmount = round(cgstAmount + sgstAmount);
        totalCgstAmount = round(totalCgstAmount + cgstAmount);
        totalSgstAmount = round(totalSgstAmount + sgstAmount);
      }

      lineTotal = round(taxableValue + lineGstAmount);
    }

    grossSubtotal = round(grossSubtotal + lineGross);
    totalItemDiscount = round(totalItemDiscount + discAmount);
    totalTaxableValue = round(totalTaxableValue + taxableValue);

    // Grouping by gstRate
    if (!rateGroups[gstRate]) {
      rateGroups[gstRate] = {
        rate: gstRate,
        taxableValue: 0,
        cgstRate: isInterState ? 0 : cgstRate,
        cgstAmount: 0,
        sgstRate: isInterState ? 0 : sgstRate,
        sgstAmount: 0,
        igstRate: isInterState ? igstRate : 0,
        igstAmount: 0,
        totalGst: 0
      };
    }
    rateGroups[gstRate].taxableValue = round(rateGroups[gstRate].taxableValue + taxableValue);
    rateGroups[gstRate].cgstAmount = round(rateGroups[gstRate].cgstAmount + cgstAmount);
    rateGroups[gstRate].sgstAmount = round(rateGroups[gstRate].sgstAmount + sgstAmount);
    rateGroups[gstRate].igstAmount = round(rateGroups[gstRate].igstAmount + igstAmount);
    rateGroups[gstRate].totalGst = round(rateGroups[gstRate].totalGst + lineGstAmount);

    return {
      serialNumber: item.serialNumber || idx + 1,
      description: item.description?.trim() || '',
      hsnSac: item.hsnSac?.trim() || '',
      quantity: qty,
      unit: item.unit?.trim() || 'PCS',
      unitRate: unitRate,
      rate: unitRate, // backward compatible alias
      isTaxInclusive,
      inclusiveRate: isTaxInclusive ? unitRate : round(unitRate * (1 + gstRate / 100)),
      discountPercent: discPercent,
      discountAmount: discAmount,
      taxableValue: taxableValue,
      taxableAmount: taxableValue, // backward compatible alias
      gstRate: gstRate,
      taxRate: gstRate, // backward compatible alias
      cgstRate: cgstRate,
      cgstAmount: cgstAmount,
      sgstRate: sgstRate,
      sgstAmount: sgstAmount,
      igstRate: igstRate,
      igstAmount: igstAmount,
      gstAmount: lineGstAmount,
      taxAmount: lineGstAmount, // backward compatible alias
      lineTotal: lineTotal,
      totalAmount: lineTotal // backward compatible alias
    };
  });

  const isInvoiceTaxInclusive = Boolean(options.isTaxInclusive || calculatedItems.some(item => item.isTaxInclusive));
  const totalDiscount = round(totalItemDiscount + (Number(manualDiscount) || 0));
  const totalGst = round(isInterState ? totalIgstAmount : totalCgstAmount + totalSgstAmount);
  const grandTotal = isInvoiceTaxInclusive
    ? round(totalTaxableValue - (Number(manualDiscount) || 0))
    : round(totalTaxableValue + totalGst - (Number(manualDiscount) || 0));

  const primaryTaxRate = calculatedItems.reduce((max, item) => Math.max(max, item.gstRate || 0), 0);
  const rateBreakdown = Object.values(rateGroups);

  return {
    items: calculatedItems,
    lineItems: calculatedItems, // backward compatible alias
    subtotal: grossSubtotal,
    totalDiscount,
    taxableValue: totalTaxableValue,
    taxableAmount: totalTaxableValue, // backward compatible alias
    totalGst,
    cgstAmount: totalCgstAmount,
    sgstAmount: totalSgstAmount,
    igstAmount: totalIgstAmount,
    taxBreakdown: {
      isInterState,
      taxTreatment: isInterState ? 'inter_state' : 'intra_state',
      taxRate: primaryTaxRate,
      cgstRate: isInterState ? 0 : round(primaryTaxRate / 2, 2),
      cgstAmount: totalCgstAmount,
      sgstRate: isInterState ? 0 : round(primaryTaxRate / 2, 2),
      sgstAmount: totalSgstAmount,
      igstRate: isInterState ? primaryTaxRate : 0,
      igstAmount: totalIgstAmount,
      totalTax: totalGst,
      rateBreakdown
    },
    grandTotal,
    isTaxInclusive: Boolean(options.isTaxInclusive),
    amountInWords: numberToWords(grandTotal)
  };
}
