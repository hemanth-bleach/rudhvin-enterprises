import assert from 'assert';
import { calculateInvoiceTotals } from '../src/services/invoiceService.js';
import { getInvoiceHtml } from '../src/templates/invoiceTemplate.js';

console.log('======================================================');
console.log('TESTING GST CALCULATION ENGINE — RUDHVIN ENTERPRISES');
console.log('======================================================\n');

// -----------------------------------------------------------------------------
// Test 1: Inclusive-GST, 18% Rate, Intra-State (Andhra Pradesh to Andhra Pradesh)
// Gross: 5160.00, GST: 18% (CGST 9% + SGST 9%)
// Expected: Taxable = 4372.88, CGST = 393.56, SGST = 393.56, Total GST = 787.12, Total = 5160.00
// -----------------------------------------------------------------------------
const test1 = calculateInvoiceTotals(
  [
    {
      description: 'AVISHREE 150 GSM Bed sheet',
      hsnSac: '6304',
      quantity: 1,
      unit: 'piece',
      unitRate: 5160,
      gstRate: 18,
      isTaxInclusive: true
    }
  ],
  '37', // Seller: Andhra Pradesh
  '37', // Buyer: Andhra Pradesh
  0,
  { isInterState: false, isTaxInclusive: true }
);

console.log('Test 1: Inclusive-GST Intra-State (5160 @ 18%):');
console.log('  Taxable Value:', test1.taxableValue, '(Expected: 4372.88)');
console.log('  CGST (9%):    ', test1.cgstAmount, '(Expected: 393.56)');
console.log('  SGST (9%):    ', test1.sgstAmount, '(Expected: 393.56)');
console.log('  Total GST:    ', test1.totalGst, '(Expected: 787.12)');
console.log('  Grand Total:  ', test1.grandTotal, '(Expected: 5160.00)');
console.log('  In Words:     ', test1.amountInWords);

assert.strictEqual(test1.taxableValue, 4372.88, 'Test 1: Taxable Value must be 4372.88');
assert.strictEqual(test1.cgstAmount, 393.56, 'Test 1: CGST must be 393.56');
assert.strictEqual(test1.sgstAmount, 393.56, 'Test 1: SGST must be 393.56');
assert.strictEqual(test1.totalGst, 787.12, 'Test 1: Total GST must be 787.12');
assert.strictEqual(test1.grandTotal, 5160, 'Test 1: Grand Total must be 5160.00');
assert.strictEqual(test1.taxableValue + test1.totalGst, test1.grandTotal, 'Test 1: Taxable + GST must equal Grand Total');
assert.strictEqual(test1.cgstAmount + test1.sgstAmount, test1.totalGst, 'Test 1: CGST + SGST must equal Total GST');
console.log('✅ Test 1 Passed!\n');

// -----------------------------------------------------------------------------
// Test 2: Inclusive-GST, 18% Rate, Inter-State (Andhra Pradesh to Telangana)
// Expected: Taxable = 4372.88, IGST = 787.12, Total GST = 787.12, Total = 5160.00
// -----------------------------------------------------------------------------
const test2 = calculateInvoiceTotals(
  [
    {
      description: 'AVISHREE 150 GSM Bed sheet',
      hsnSac: '6304',
      quantity: 1,
      unit: 'piece',
      unitRate: 5160,
      gstRate: 18,
      isTaxInclusive: true
    }
  ],
  '37', // Seller: Andhra Pradesh
  '36', // Buyer: Telangana
  0,
  { isInterState: true, isTaxInclusive: true }
);

console.log('Test 2: Inclusive-GST Inter-State (5160 @ 18%):');
console.log('  Taxable Value:', test2.taxableValue, '(Expected: 4372.88)');
console.log('  IGST (18%):   ', test2.igstAmount, '(Expected: 787.12)');
console.log('  Total GST:    ', test2.totalGst, '(Expected: 787.12)');
console.log('  Grand Total:  ', test2.grandTotal, '(Expected: 5160.00)');

assert.strictEqual(test2.taxableValue, 4372.88, 'Test 2: Taxable Value must be 4372.88');
assert.strictEqual(test2.igstAmount, 787.12, 'Test 2: IGST must be 787.12');
assert.strictEqual(test2.totalGst, 787.12, 'Test 2: Total GST must be 787.12');
assert.strictEqual(test2.grandTotal, 5160, 'Test 2: Grand Total must be 5160.00');
assert.strictEqual(test2.taxableValue + test2.totalGst, test2.grandTotal, 'Test 2: Taxable + GST must equal Grand Total');
console.log('✅ Test 2 Passed!\n');

// -----------------------------------------------------------------------------
// Test 3: Exclusive-GST, 18% Rate, Intra-State (5160 + 18% GST)
// Expected: Taxable = 5160.00, CGST = 464.40, SGST = 464.40, Total GST = 928.80, Total = 6088.80
// -----------------------------------------------------------------------------
const test3 = calculateInvoiceTotals(
  [
    {
      description: 'AVISHREE 150 GSM Bed sheet',
      hsnSac: '6304',
      quantity: 1,
      unit: 'piece',
      unitRate: 5160,
      gstRate: 18,
      isTaxInclusive: false
    }
  ],
  '37',
  '37',
  0,
  { isInterState: false, isTaxInclusive: false }
);

console.log('Test 3: Exclusive-GST Intra-State (5160 base + 18%):');
console.log('  Taxable Value:', test3.taxableValue, '(Expected: 5160.00)');
console.log('  CGST (9%):    ', test3.cgstAmount, '(Expected: 464.40)');
console.log('  SGST (9%):    ', test3.sgstAmount, '(Expected: 464.40)');
console.log('  Total GST:    ', test3.totalGst, '(Expected: 928.80)');
console.log('  Grand Total:  ', test3.grandTotal, '(Expected: 6088.80)');

assert.strictEqual(test3.taxableValue, 5160, 'Test 3: Taxable Value must be 5160.00');
assert.strictEqual(test3.cgstAmount, 464.4, 'Test 3: CGST must be 464.40');
assert.strictEqual(test3.sgstAmount, 464.4, 'Test 3: SGST must be 464.40');
assert.strictEqual(test3.totalGst, 928.8, 'Test 3: Total GST must be 928.80');
assert.strictEqual(test3.grandTotal, 6088.8, 'Test 3: Grand Total must be 6088.80');
assert.strictEqual(test3.taxableValue + test3.totalGst, test3.grandTotal, 'Test 3: Taxable + GST must equal Grand Total');
console.log('✅ Test 3 Passed!\n');

// -----------------------------------------------------------------------------
// Test 4: Exclusive-GST, 18% Rate, Inter-State (5160 base + 18% IGST)
// Expected: Taxable = 5160.00, IGST = 928.80, Total GST = 928.80, Total = 6088.80
// -----------------------------------------------------------------------------
const test4 = calculateInvoiceTotals(
  [
    {
      description: 'AVISHREE 150 GSM Bed sheet',
      hsnSac: '6304',
      quantity: 1,
      unit: 'piece',
      unitRate: 5160,
      gstRate: 18,
      isTaxInclusive: false
    }
  ],
  '37',
  '36',
  0,
  { isInterState: true, isTaxInclusive: false }
);

console.log('Test 4: Exclusive-GST Inter-State (5160 base + 18%):');
console.log('  Taxable Value:', test4.taxableValue, '(Expected: 5160.00)');
console.log('  IGST (18%):   ', test4.igstAmount, '(Expected: 928.80)');
console.log('  Total GST:    ', test4.totalGst, '(Expected: 928.80)');
console.log('  Grand Total:  ', test4.grandTotal, '(Expected: 6088.80)');

assert.strictEqual(test4.taxableValue, 5160, 'Test 4: Taxable Value must be 5160.00');
assert.strictEqual(test4.igstAmount, 928.8, 'Test 4: IGST must be 928.80');
assert.strictEqual(test4.totalGst, 928.8, 'Test 4: Total GST must be 928.80');
assert.strictEqual(test4.grandTotal, 6088.8, 'Test 4: Grand Total must be 6088.80');
assert.strictEqual(test4.taxableValue + test4.totalGst, test4.grandTotal, 'Test 4: Taxable + GST must equal Grand Total');
console.log('✅ Test 4 Passed!\n');

// -----------------------------------------------------------------------------
// Test 5: Zero GST (0% Exempt)
// Expected: Taxable = 5160.00, GST = 0, Total = 5160.00
// -----------------------------------------------------------------------------
const test5 = calculateInvoiceTotals(
  [
    {
      description: 'Exempt Goods',
      hsnSac: '0101',
      quantity: 1,
      unit: 'piece',
      unitRate: 5160,
      gstRate: 0,
      isTaxInclusive: true
    }
  ],
  '37',
  '37',
  0,
  { isInterState: false, isTaxInclusive: true }
);

console.log('Test 5: Zero GST (5160 @ 0%):');
console.log('  Taxable Value:', test5.taxableValue, '(Expected: 5160.00)');
console.log('  Total GST:    ', test5.totalGst, '(Expected: 0)');
console.log('  Grand Total:  ', test5.grandTotal, '(Expected: 5160.00)');

assert.strictEqual(test5.taxableValue, 5160, 'Test 5: Taxable Value must be 5160.00');
assert.strictEqual(test5.totalGst, 0, 'Test 5: Total GST must be 0');
assert.strictEqual(test5.grandTotal, 5160, 'Test 5: Grand Total must be 5160.00');
console.log('✅ Test 5 Passed!\n');

// -----------------------------------------------------------------------------
// Test 6: HTML Preview Verification for Test 1
// Verify Taxable Value displays 4,372.88 and Total displays 5,160.00
// -----------------------------------------------------------------------------
const dummyInv = {
  invoiceNumber: 'RU001',
  invoiceDate: new Date(),
  isTaxInclusive: true,
  items: test1.items,
  taxableValue: test1.taxableValue,
  grandTotal: test1.grandTotal,
  totalGst: test1.totalGst,
  cgstAmount: test1.cgstAmount,
  sgstAmount: test1.sgstAmount,
  taxBreakdown: test1.taxBreakdown,
  amountInWords: test1.amountInWords
};

const html = getInvoiceHtml(dummyInv);
console.log('Test 6: HTML Document Verification:');
console.log('  Contains 4,372.88 for Taxable Value?', html.includes('4,372.88'));
console.log('  Contains 393.56 for CGST/SGST?     ', html.includes('393.56'));
console.log('  Contains 787.12 for Total GST?      ', html.includes('787.12'));
console.log('  Contains 5,160.00 for Invoice Total?', html.includes('5,160.00'));
console.log('  Contains Amount in Words?           ', html.includes('Rupees Five Thousand One Hundred Sixty Only'));

assert(html.includes('4,372.88'), 'HTML must include Taxable Value: 4,372.88');
assert(html.includes('393.56'), 'HTML must include CGST/SGST: 393.56');
assert(html.includes('787.12'), 'HTML must include Total GST: 787.12');
assert(html.includes('5,160.00'), 'HTML must include Invoice Total: 5,160.00');
assert(html.includes('Rupees Five Thousand One Hundred Sixty Only'), 'HTML must include Amount in Words');

console.log('✅ Test 6 Passed!\n');

console.log('======================================================');
console.log('ALL GST CALCULATION TESTS PASSED (100%)');
console.log('======================================================');
