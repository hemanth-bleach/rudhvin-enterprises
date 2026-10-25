import { calculateInvoiceTotals } from '../src/services/invoiceService.js';

console.log('Testing Tax-Inclusive (Reverse GST / Minus CGST & SGST) Calculation...\n');

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
  { isInterState: false }
);

console.log('Test 1 (Intra-state Inclusive):');
console.log('  Taxable Value:', t1.taxableValue, '(Expected: 847.46)');
console.log('  CGST (9%):', t1.cgstAmount, '(Expected: 76.27)');
console.log('  SGST (9%):', t1.sgstAmount, '(Expected: 76.27)');
console.log('  Total GST:', t1.totalGst, '(Expected: 152.54)');
console.log('  Grand Total:', t1.grandTotal, '(Expected: 1000.00)');

if (
  t1.taxableValue === 847.46 &&
  t1.cgstAmount === 76.27 &&
  t1.sgstAmount === 76.27 &&
  t1.totalGst === 152.54 &&
  t1.grandTotal === 1000.00
) {
  console.log('✅ TEST 1 PASSED: 1000 inclusive minus 76.27 CGST minus 76.27 SGST = 847.46 taxable value!\n');
} else {
  console.error('❌ TEST 1 FAILED');
  process.exit(1);
}

// Test 2: Inter-state, 18% GST, Price = 1000 inclusive
const t2 = calculateInvoiceTotals(
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
  '36',
  0,
  { isInterState: true }
);

console.log('Test 2 (Inter-state Inclusive):');
console.log('  Taxable Value:', t2.taxableValue, '(Expected: 847.46)');
console.log('  IGST (18%):', t2.igstAmount, '(Expected: 152.54)');
console.log('  Grand Total:', t2.grandTotal, '(Expected: 1000.00)');

if (
  t2.taxableValue === 847.46 &&
  t2.igstAmount === 152.54 &&
  t2.grandTotal === 1000.00
) {
  console.log('✅ TEST 2 PASSED: Inter-state reverse calculation matches!\n');
} else {
  console.error('❌ TEST 2 FAILED');
  process.exit(1);
}

// Test 3: Standard Tax-Exclusive backward compatibility
const t3 = calculateInvoiceTotals(
  [
    {
      description: 'AVISHREE 150 GSM 4 ft × 6 ft multicolour non-laminated bedsheet',
      hsnSac: '6304',
      quantity: 1,
      unit: 'piece',
      unitRate: 847.46,
      gstRate: 18,
      isTaxInclusive: false
    }
  ],
  '37',
  '37',
  0,
  { isInterState: false }
);

console.log('Test 3 (Tax-Exclusive backward compatibility):');
console.log('  Taxable Value:', t3.taxableValue, '(Expected: 847.46)');
console.log('  CGST (9%):', t3.cgstAmount, '(Expected: 76.27)');
console.log('  SGST (9%):', t3.sgstAmount, '(Expected: 76.27)');
console.log('  Grand Total:', t3.grandTotal, '(Expected: 1000.00)');

if (
  t3.taxableValue === 847.46 &&
  t3.cgstAmount === 76.27 &&
  t3.sgstAmount === 76.27 &&
  t3.grandTotal === 1000.00
) {
  console.log('✅ TEST 3 PASSED: Exclusive mode backward compatibility fully intact!\n');
} else {
  console.error('❌ TEST 3 FAILED');
  process.exit(1);
}

console.log('🎉 ALL TAX-INCLUSIVE TESTS PASSED PERFECTLY!');
