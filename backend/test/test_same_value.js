import { calculateInvoiceTotals } from '../src/services/invoiceService.js';
import { getInvoiceHtml } from '../src/templates/invoiceTemplate.js';
import assert from 'assert';

console.log('Testing Same Value Invoicing (Taxable Value = Total Invoice Value)...\n');

// Test 1: Intra-state, 18% GST, Price = 1000 inclusive
const t1 = calculateInvoiceTotals(
  [
    {
      description: 'AVISHREE 150 GSM 4 ft × 6 ft multicolour non-laminated bedsheet',
      hsnSac: '6304',
      quantity: 1,
      unit: 'piece',
      unitRate: 1000,
      gstRate: 18,
      isTaxInclusive: true
    }
  ],
  '37',
  '37',
  0,
  { isInterState: false, isTaxInclusive: true }
);

console.log('Test 1 (Intra-state Same Value):');
console.log('  Item Taxable Value:', t1.items[0].taxableValue, '(Expected: 1000.00)');
console.log('  Item Line Total:', t1.items[0].lineTotal, '(Expected: 1000.00)');
console.log('  Invoice Taxable Value:', t1.taxableValue, '(Expected: 1000.00)');
console.log('  CGST (9%):', t1.cgstAmount, '(Expected: 76.27)');
console.log('  SGST (9%):', t1.sgstAmount, '(Expected: 76.27)');
console.log('  Total GST:', t1.totalGst, '(Expected: 152.54)');
console.log('  Total Invoice Value (inclusive of GST):', t1.grandTotal, '(Expected: 1000.00)');

assert.strictEqual(t1.items[0].taxableValue, 1000, 'Item taxable value must be 1000');
assert.strictEqual(t1.items[0].lineTotal, 1000, 'Item line total must be 1000');
assert.strictEqual(t1.taxableValue, 1000, 'Invoice taxable value must be 1000');
assert.strictEqual(t1.grandTotal, 1000, 'Invoice grand total must be 1000');
assert.strictEqual(t1.cgstAmount, 76.27, 'CGST must be 76.27');
assert.strictEqual(t1.sgstAmount, 76.27, 'SGST must be 76.27');
assert.strictEqual(t1.totalGst, 152.54, 'Total GST must be 152.54');

// Test 2: HTML rendering contains identical 1,000.00 values in columns and totals
const dummyInvoice = {
  invoiceNumber: 'RE/2026-27/001',
  invoiceDate: new Date(),
  isTaxInclusive: true,
  items: t1.items,
  taxableValue: t1.taxableValue,
  grandTotal: t1.grandTotal,
  totalGst: t1.totalGst,
  cgstAmount: t1.cgstAmount,
  sgstAmount: t1.sgstAmount,
  taxBreakdown: t1.taxBreakdown
};

const html = getInvoiceHtml(dummyInvoice);
assert(html.includes('₹1,000.00'), 'HTML must include ₹1,000.00');
console.log('\n✅ All assertions passed! Taxable Value and Total Invoice Value are identically ₹1,000.00');
