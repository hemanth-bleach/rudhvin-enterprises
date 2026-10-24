import http from 'http';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Customer } from '../src/models/Customer.js';
import { Company } from '../src/models/Company.js';
import { Invoice } from '../src/models/Invoice.js';
import { Payment } from '../src/models/Payment.js';
import { generateInvoicePdfBuffer } from '../src/services/pdfService.js';
import { calculateInvoiceTotals } from '../src/services/invoiceService.js';
import { getInvoiceHtml } from '../src/templates/invoiceTemplate.js';
import { normalizeInvoice } from '../src/controllers/invoiceController.js';

let server;
let port;
let baseUrl;
let adminToken = '';
let staffToken = '';
let testCustomer = null;
let interStateCustomer = null;

const results = [];

function assert(condition, scenarioNum, testName, details = '') {
  if (condition) {
    results.push({ scenario: scenarioNum, name: testName, status: 'PASS', details });
    console.log(`  ✅ [Scenario ${scenarioNum}] PASS: ${testName} ${details ? '(' + details + ')' : ''}`);
  } else {
    results.push({ scenario: scenarioNum, name: testName, status: 'FAIL', details });
    console.error(`  ❌ [Scenario ${scenarioNum}] FAIL: ${testName} - ${details}`);
  }
}

async function apiRequest(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  const config = {
    method: options.method || 'GET',
    headers
  };
  if (options.body) {
    config.body = JSON.stringify(options.body);
  }
  const res = await fetch(url, config);
  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else if (contentType.includes('application/pdf')) {
    data = await res.arrayBuffer();
  } else {
    data = await res.text();
  }
  return { status: res.status, data, headers: res.headers };
}

async function runAllTests() {
  console.log('================================================================');
  console.log('🚀 RUNNING ALL 18 VERIFICATION SCENARIOS — RUDHVIN ENTERPRISES');
  console.log('================================================================\n');

  // Start HTTP server on random free port
  server = http.createServer(app);
  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}/api`;
      console.log(`Server listening on port ${port}\n`);
      resolve();
    });
  });

  try {
    // 0. Setup Authentication & Test Data
    const adminLogin = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email: 'admin@rudhvin.com', password: 'Admin@12345' }
    });
    adminToken = adminLogin.data?.token;

    // Create staff member
    const staffEmail = `staff_${Date.now()}@rudhvin.com`;
    await apiRequest('/auth/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { name: 'Staff Tester', email: staffEmail, password: 'Password@123', role: 'staff' }
    });

    const staffLogin = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email: staffEmail, password: 'Password@123' }
    });
    staffToken = staffLogin.data?.token;

    // Create intra-state customer (AP, 37)
    let custRes = await apiRequest('/customers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'Andhra Pradesh Dept of Education',
        organization: 'AP Education Board',
        billingAddress: 'Collectorate Complex, Visakhapatnam, AP',
        gstin: '37AAAAA0000A1Z5',
        state: 'Andhra Pradesh',
        stateCode: '37'
      }
    });
    if (custRes.status === 201) {
      testCustomer = custRes.data.data;
    } else {
      testCustomer = await Customer.findOne({ gstin: '37AAAAA0000A1Z5', isDeleted: false });
    }

    // Create inter-state customer (Telangana, 36)
    let interRes = await apiRequest('/customers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'Telangana Power Distribution Ltd',
        organization: 'TGSPDCL',
        billingAddress: 'Mint Compound, Hyderabad, Telangana',
        gstin: '36BBBBB0000B1Z8',
        state: 'Telangana',
        stateCode: '36'
      }
    });
    if (interRes.status === 201) {
      interStateCustomer = interRes.data.data;
    } else {
      interStateCustomer = await Customer.findOne({ gstin: '36BBBBB0000B1Z8', isDeleted: false });
    }

    // -------------------------------------------------------------
    // SCENARIO 1: Create an invoice with one item and 0% GST
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 1: Create invoice with one item and 0% GST ---');
    const s1Res = await apiRequest('/invoices', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        customerId: testCustomer._id,
        items: [
          {
            description: 'Printing Papers',
            hsnSac: '4802',
            quantity: 10,
            unit: 'reams',
            rate: 250,
            taxRate: 0
          }
        ],
        status: 'issued'
      }
    });
    const s1 = s1Res.data.data;
    assert(s1Res.status === 201, 1, 'Invoice created with status 201');
    assert(s1.taxableValue === 2500, 1, 'Taxable value is ₹2500', `Got ${s1.taxableValue}`);
    assert(s1.totalGst === 0, 1, 'Total GST is ₹0', `Got ${s1.totalGst}`);
    assert(s1.grandTotal === 2500, 1, 'Grand Total is ₹2500', `Got ${s1.grandTotal}`);
    assert(s1.amountInWords === 'Rupees Two Thousand Five Hundred Only', 1, 'Amount in words format', `Got: "${s1.amountInWords}"`);

    // -------------------------------------------------------------
    // SCENARIO 2: Create an invoice with 18% intra-state GST
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 2: Create invoice with 18% intra-state GST ---');
    const s2Res = await apiRequest('/invoices', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        customerId: testCustomer._id,
        gemContractNumber: 'GEMC-511687712345678',
        items: [
          {
            description: 'Commercial Office Chairs',
            hsnSac: '9401',
            quantity: 2,
            unit: 'PCS',
            rate: 2000,
            taxRate: 18
          }
        ],
        status: 'issued'
      }
    });
    const s2 = s2Res.data.data;
    assert(s2Res.status === 201, 2, 'Invoice created with status 201');
    assert(s2.taxableValue === 4000, 2, 'Taxable value is ₹4000', `Got ${s2.taxableValue}`);
    assert(s2.cgstAmount === 360, 2, 'CGST (9%) is ₹360', `Got ${s2.cgstAmount}`);
    assert(s2.sgstAmount === 360, 2, 'SGST (9%) is ₹360', `Got ${s2.sgstAmount}`);
    assert(s2.igstAmount === 0, 2, 'IGST is ₹0 for intra-state', `Got ${s2.igstAmount}`);
    assert(s2.totalGst === 720, 2, 'Total GST is ₹720', `Got ${s2.totalGst}`);
    assert(s2.grandTotal === 4720, 2, 'Grand total is ₹4720', `Got ${s2.grandTotal}`);
    assert(s2.gemContractNumber === 'GEMC-511687712345678', 2, 'GeM Contract Number preserved', s2.gemContractNumber);

    // -------------------------------------------------------------
    // SCENARIO 3: Create an invoice with inter-state IGST
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 3: Create invoice with inter-state IGST ---');
    const s3Res = await apiRequest('/invoices', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        customerId: interStateCustomer._id,
        items: [
          {
            description: 'Network Server Rack',
            hsnSac: '8517',
            quantity: 1,
            unit: 'unit',
            rate: 10000,
            taxRate: 18
          }
        ],
        status: 'issued'
      }
    });
    const s3 = s3Res.data.data;
    assert(s3Res.status === 201, 3, 'Invoice created with status 201');
    assert(s3.taxBreakdown.isInterState === true, 3, 'Tax breakdown detected as inter-state');
    assert(s3.cgstAmount === 0, 3, 'CGST is 0 for inter-state', `Got ${s3.cgstAmount}`);
    assert(s3.sgstAmount === 0, 3, 'SGST is 0 for inter-state', `Got ${s3.sgstAmount}`);
    assert(s3.igstAmount === 1800, 3, 'IGST (18%) is ₹1800', `Got ${s3.igstAmount}`);
    assert(s3.totalGst === 1800, 3, 'Total GST is ₹1800', `Got ${s3.totalGst}`);
    assert(s3.grandTotal === 11800, 3, 'Grand total is ₹11800', `Got ${s3.grandTotal}`);

    // -------------------------------------------------------------
    // SCENARIO 4: Add multiple items with different applicable GST rates
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 4: Multiple items with different GST rates ---');
    const s4Res = await apiRequest('/invoices', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        customerId: testCustomer._id,
        items: [
          {
            description: 'Item at 5% GST',
            hsnSac: '1001',
            quantity: 2,
            rate: 500, // 1000 taxable -> 5% = 50 GST (25 CGST, 25 SGST)
            taxRate: 5
          },
          {
            description: 'Item at 12% GST',
            hsnSac: '2001',
            quantity: 1,
            rate: 2000, // 2000 taxable -> 12% = 240 GST (120 CGST, 120 SGST)
            taxRate: 12
          },
          {
            description: 'Item at 18% GST',
            hsnSac: '3001',
            quantity: 1,
            rate: 1000, // 1000 taxable -> 18% = 180 GST (90 CGST, 90 SGST)
            taxRate: 18
          }
        ],
        status: 'draft'
      }
    });
    const s4 = s4Res.data.data;
    assert(s4Res.status === 201, 4, 'Multi-rate invoice created');
    assert(s4.taxableValue === 4000, 4, 'Total Taxable Value is ₹4000 (1000+2000+1000)', `Got ${s4.taxableValue}`);
    assert(s4.cgstAmount === 235, 4, 'Total CGST is ₹235 (25+120+90)', `Got ${s4.cgstAmount}`);
    assert(s4.sgstAmount === 235, 4, 'Total SGST is ₹235 (25+120+90)', `Got ${s4.sgstAmount}`);
    assert(s4.totalGst === 470, 4, 'Total GST is ₹470 (50+240+180)', `Got ${s4.totalGst}`);
    assert(s4.grandTotal === 4470, 4, 'Grand Total is ₹4470', `Got ${s4.grandTotal}`);

    // -------------------------------------------------------------
    // SCENARIO 5: Change quantity and unit rate and verify recalculated totals
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 5: Change quantity and unit rate ---');
    const s5Res = await apiRequest(`/invoices/${s4._id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        items: [
          {
            serialNumber: 1,
            description: 'Updated Item',
            hsnSac: '1001',
            quantity: 5, // was 2
            rate: 600,   // was 500 -> 3000 taxable -> 5% = 150 GST
            taxRate: 5
          }
        ]
      }
    });
    const s5 = s5Res.data.data;
    assert(s5Res.status === 200, 5, 'Invoice updated successfully');
    assert(s5.taxableValue === 3000, 5, 'Recalculated taxable value is ₹3000', `Got ${s5.taxableValue}`);
    assert(s5.totalGst === 150, 5, 'Recalculated total GST is ₹150', `Got ${s5.totalGst}`);
    assert(s5.grandTotal === 3150, 5, 'Recalculated grand total is ₹3150', `Got ${s5.grandTotal}`);

    // -------------------------------------------------------------
    // SCENARIO 6: Apply a discount and verify taxable value
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 6: Apply discount and verify taxable value ---');
    const s6Res = await apiRequest(`/invoices/${s4._id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        items: [
          {
            serialNumber: 1,
            description: 'Discounted Item',
            hsnSac: '1001',
            quantity: 10,
            rate: 100, // 1000 gross
            discountPercent: 10, // 10% discount = 100 discount -> 900 taxable
            taxRate: 18 // 18% of 900 = 162 GST
          }
        ]
      }
    });
    const s6 = s6Res.data.data;
    assert(s6.items[0].discountAmount === 100, 6, 'Item discount amount is ₹100', `Got ${s6.items[0].discountAmount}`);
    assert(s6.taxableValue === 900, 6, 'Taxable value is Gross - Discount = ₹900', `Got ${s6.taxableValue}`);
    assert(s6.totalGst === 162, 6, 'Total GST on discounted taxable value is ₹162', `Got ${s6.totalGst}`);
    assert(s6.grandTotal === 1062, 6, 'Grand Total is ₹1062', `Got ${s6.grandTotal}`);

    // -------------------------------------------------------------
    // SCENARIO 7: Remove an item and verify serial numbers and totals
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 7: Remove an item and verify serial numbers and totals ---');
    const s7Create = await apiRequest('/invoices', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        customerId: testCustomer._id,
        items: [
          { description: 'Item 1', hsnSac: '1111', quantity: 1, rate: 100, taxRate: 0 },
          { description: 'Item 2', hsnSac: '2222', quantity: 1, rate: 200, taxRate: 0 },
          { description: 'Item 3', hsnSac: '3333', quantity: 1, rate: 300, taxRate: 0 }
        ],
        status: 'draft'
      }
    });
    const s7Id = s7Create.data.data._id;
    // Remove Item 2, keep Item 1 and Item 3
    const s7Update = await apiRequest(`/invoices/${s7Id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        items: [
          { description: 'Item 1', hsnSac: '1111', quantity: 1, rate: 100, taxRate: 0 },
          { description: 'Item 3', hsnSac: '3333', quantity: 1, rate: 300, taxRate: 0 }
        ]
      }
    });
    const s7 = s7Update.data.data;
    assert(s7.items.length === 2, 7, 'Item count reduced to 2');
    assert(s7.items[0].serialNumber === 1 && s7.items[1].serialNumber === 2, 7, 'Serial numbers re-indexed sequentially (1, 2)');
    assert(s7.grandTotal === 400, 7, 'Grand total updated to ₹400', `Got ${s7.grandTotal}`);

    // -------------------------------------------------------------
    // SCENARIO 8: Verify ₹847.46 + ₹76.27 + ₹76.27 = ₹1,000.00 sample arithmetic
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 8: Verify ₹847.46 + ₹76.27 + ₹76.27 = ₹1,000.00 sample arithmetic ---');
    const s8Calc = calculateInvoiceTotals([
      {
        description: 'AVISHREE 150 GSM 4 ft × 6 ft multicolour non-laminated bedsheet',
        hsnSac: '6304',
        quantity: 1,
        unit: 'piece',
        unitRate: 847.46,
        gstRate: 18
      }
    ], '37', '37', 0, { isInterState: false });

    assert(s8Calc.taxableValue === 847.46, 8, 'Taxable Value is exactly ₹847.46', `Got ${s8Calc.taxableValue}`);
    assert(s8Calc.cgstAmount === 76.27, 8, 'Expected CGST is ₹76.27', `Got ${s8Calc.cgstAmount}`);
    assert(s8Calc.sgstAmount === 76.27, 8, 'Expected SGST is ₹76.27', `Got ${s8Calc.sgstAmount}`);
    assert(s8Calc.totalGst === 152.54, 8, 'Expected Total GST is ₹152.54', `Got ${s8Calc.totalGst}`);
    assert(s8Calc.grandTotal === 1000.00, 8, 'Expected Invoice Total is ₹1,000.00', `Got ${s8Calc.grandTotal}`);
    assert(s8Calc.amountInWords === 'Rupees One Thousand Only', 8, 'Expected Amount in Words is "Rupees One Thousand Only"', `Got "${s8Calc.amountInWords}"`);

    // Also verify via API invoice creation
    const s8Api = await apiRequest('/invoices', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        customerId: testCustomer._id,
        isSample: true,
        items: [
          {
            description: 'AVISHREE 150 GSM 4 ft × 6 ft multicolour non-laminated bedsheet',
            hsnSac: '6304',
            quantity: 1,
            unit: 'piece',
            rate: 847.46,
            taxRate: 18
          }
        ],
        status: 'issued'
      }
    });
    const s8Doc = s8Api.data.data;
    assert(s8Doc.grandTotal === 1000.00, 8, 'API invoice grandTotal is ₹1,000.00');
    assert(s8Doc.amountInWords === 'Rupees One Thousand Only', 8, 'API amountInWords is "Rupees One Thousand Only"');

    // -------------------------------------------------------------
    // SCENARIO 9: Generate and download the PDF
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 9: Generate and download PDF ---');
    const s9PdfRes = await apiRequest(`/invoices/${s8Doc._id}/pdf`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(s9PdfRes.status === 200, 9, 'PDF endpoint returns HTTP 200');
    assert(s9PdfRes.headers.get('content-type')?.includes('application/pdf'), 9, 'Content-Type is application/pdf');
    assert(s9PdfRes.data && s9PdfRes.data.byteLength > 1000, 9, `PDF buffer is valid (${s9PdfRes.data?.byteLength} bytes)`);

    // -------------------------------------------------------------
    // SCENARIO 10: Print invoice on A4 paper (verify HTML layout & CSS)
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 10: Print layout verification ---');
    const s10HtmlRes = await apiRequest(`/invoices/${s8Doc._id}/preview`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const html = s10HtmlRes.data;
    assert(html.includes('RUDHVIN ENTERPRISES'), 10, 'HTML includes company name');
    assert(html.includes('SAMPLE TAX INVOICE — NOT FOR PAYMENT'), 10, 'Sample invoice displays subtitle');
    assert(html.includes('Description of Goods'), 10, 'HTML includes 6 required column header "Description of Goods"');
    assert(html.includes('Taxable Value (₹)'), 10, 'HTML includes column header "Taxable Value (₹)"');
    assert(html.includes('Line Total (₹)'), 10, 'HTML includes column header "Line Total (₹)"');
    assert(html.includes('Rupees One Thousand Only'), 10, 'HTML includes Amount in Words');
    assert(html.includes('@page {'), 10, 'HTML contains @page A4 CSS rules');

    // -------------------------------------------------------------
    // SCENARIO 11: Open an existing invoice and verify saved details
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 11: Open existing invoice and verify details ---');
    const s11Res = await apiRequest(`/invoices/${s8Doc._id}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const s11 = s11Res.data.data;
    assert(s11._id === s8Doc._id, 11, 'Retrieved correct invoice by ID');
    assert(s11.invoiceNumber === s8Doc.invoiceNumber, 11, 'Invoice number matches');
    assert(s11.items[0].description.includes('AVISHREE 150 GSM'), 11, 'Item description preserved');
    assert(s11.items[0].lineTotal === 1000, 11, 'Item lineTotal is ₹1000');

    // -------------------------------------------------------------
    // SCENARIO 12: Verify old invoices still display correctly (normalization)
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 12: Older invoices backward compatibility normalization ---');
    const legacyInvoice = {
      _id: 'legacy_test_inv_001',
      invoiceNumber: 'RU001',
      invoiceDate: new Date(),
      subtotal: 5250,
      grandTotal: 5250,
      lineItems: [
        {
          serialNumber: 1,
          description: 'Urinal Cubes',
          hsnSac: '3307',
          quantity: 30,
          rate: 175,
          taxRate: 0,
          taxAmount: 0,
          totalAmount: 5250
        }
      ]
    };
    const normalized = normalizeInvoice(legacyInvoice);
    assert(Array.isArray(normalized.items), 12, 'Normalized legacy invoice has `items` array');
    assert(normalized.items[0].unitRate === 175, 12, 'Normalized items[0].unitRate is 175');
    assert(normalized.items[0].taxableValue === 5250, 12, 'Normalized items[0].taxableValue is 5250');
    assert(normalized.items[0].lineTotal === 5250, 12, 'Normalized items[0].lineTotal is 5250');
    assert(normalized.amountInWords.includes('Rupees'), 12, 'Normalized amountInWords generated automatically');

    // -------------------------------------------------------------
    // SCENARIO 13: Record partial and full payments
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 13: Record partial and full payments ---');
    // Part 1: Partial payment of ₹400 on ₹1000 invoice
    const p1Res = await apiRequest(`/invoices/${s8Doc._id}/payments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        amount: 400,
        paymentMode: 'bank_transfer',
        referenceNumber: 'UTR40001'
      }
    });
    assert(p1Res.status === 201, 13, 'Partial payment recorded');
    const s13AfterP1 = await apiRequest(`/invoices/${s8Doc._id}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(s13AfterP1.data.data.amountPaid === 400, 13, 'Amount paid updated to ₹400', `Got ${s13AfterP1.data.data.amountPaid}`);
    assert(s13AfterP1.data.data.balanceDue === 600, 13, 'Balance due updated to ₹600', `Got ${s13AfterP1.data.data.balanceDue}`);
    assert(s13AfterP1.data.data.paymentStatus === 'partially_paid', 13, 'Payment status updated to partially_paid');

    // Part 2: Complete payment of remaining ₹600
    const p2Res = await apiRequest(`/invoices/${s8Doc._id}/payments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        amount: 600,
        paymentMode: 'upi',
        referenceNumber: 'UPI60002'
      }
    });
    assert(p2Res.status === 201, 13, 'Full payment recorded');
    const s13AfterP2 = await apiRequest(`/invoices/${s8Doc._id}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(s13AfterP2.data.data.amountPaid === 1000, 13, 'Amount paid updated to ₹1000');
    assert(s13AfterP2.data.data.balanceDue === 0, 13, 'Balance due updated to ₹0');
    assert(s13AfterP2.data.data.paymentStatus === 'paid', 13, 'Payment status updated to paid');

    // -------------------------------------------------------------
    // SCENARIO 14: Cancel an eligible invoice and verify dashboard statistics
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 14: Cancel invoice and verify dashboard stats ---');
    // Create an issued invoice to cancel
    const cancelTarget = await apiRequest('/invoices', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        customerId: testCustomer._id,
        items: [{ description: 'Cancel test item', hsnSac: '9999', quantity: 1, rate: 500, taxRate: 0 }],
        status: 'issued'
      }
    });
    const cancelTargetId = cancelTarget.data.data._id;

    // Get dashboard stats before cancellation
    const dashBefore = await apiRequest('/dashboard/stats', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    // Cancel invoice
    const cancelRes = await apiRequest(`/invoices/${cancelTargetId}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { reason: 'Customer changed mind' }
    });
    assert(cancelRes.status === 200, 14, 'Invoice cancelled successfully');

    // Get dashboard stats after cancellation
    const dashAfter = await apiRequest('/dashboard/stats', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(dashAfter.data.data.cancelledCount >= dashBefore.data.data.cancelledCount + 1, 14, 'Dashboard cancelled count incremented');

    // -------------------------------------------------------------
    // SCENARIO 15: Test long descriptions and multi-page invoices
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 15: Long descriptions and multi-page invoices ---');
    const longDesc = 'Comprehensive Supply, Installation, Testing, and Commissioning of Heavy Duty Ergonomic Workstations including Modular Cable Management, Premium High-Pressure Laminate Table Tops, Electrostatic Powder Coating, Anti-Corrosion Treatment, Integrated Wire Management Trays, and 5-Year Comprehensive On-Site Warranty Coverage with Annual Maintenance Support.';
    const multiItems = Array.from({ length: 8 }).map((_, i) => ({
      description: `Item #${i + 1}: ${longDesc}`,
      hsnSac: '9403',
      quantity: i + 1,
      unit: 'sets',
      rate: 1500,
      taxRate: 18
    }));

    const multiRes = await apiRequest('/invoices', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        customerId: testCustomer._id,
        items: multiItems,
        status: 'issued'
      }
    });
    assert(multiRes.status === 201, 15, 'Multi-item long description invoice created');
    const multiDoc = multiRes.data.data;
    assert(multiDoc.items.length === 8, 15, 'All 8 items stored correctly');

    // Test PDF generation for multi-page invoice without crashes
    const multiPdf = await apiRequest(`/invoices/${multiDoc._id}/pdf`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(multiPdf.status === 200, 15, 'Multi-page PDF generated successfully');
    assert(multiPdf.data && multiPdf.data.byteLength > 5000, 15, 'Multi-page PDF size is valid');

    // -------------------------------------------------------------
    // SCENARIO 16: Verify unauthorized users cannot issue, amend, or cancel
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 16: Role-based Access Control (RBAC) ---');
    // 1. Staff cannot cancel an issued invoice
    const staffCancel = await apiRequest(`/invoices/${s2._id}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: { reason: 'Unauthorized cancel attempt' }
    });
    assert(staffCancel.status === 403, 16, 'Staff receives 403 Forbidden on cancel attempt');

    // 2. Staff cannot amend an already issued invoice
    const staffAmend = await apiRequest(`/invoices/${s2._id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: { notes: 'Unauthorized edit of issued invoice' }
    });
    assert(staffAmend.status === 403, 16, 'Staff receives 403 Forbidden on amending issued invoice');

    // 3. Unauthenticated requests are rejected
    const unauth = await apiRequest(`/invoices/${s2._id}/cancel`, {
      method: 'POST',
      body: { reason: 'No token' }
    });
    assert(unauth.status === 401, 16, 'Unauthenticated request receives 401 Unauthorized');

    // -------------------------------------------------------------
    // SCENARIO 17: Test backend failures and invalid input
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 17: Backend failures and invalid input validation ---');
    // Empty items
    const invalidEmpty = await apiRequest('/invoices', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        customerId: testCustomer._id,
        items: []
      }
    });
    assert(invalidEmpty.status === 400, 17, 'Empty items rejected with 400 Bad Request');

    // Negative rate
    const invalidRate = await apiRequest('/invoices', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        customerId: testCustomer._id,
        items: [{ description: 'Bad', hsnSac: '123', quantity: 1, rate: -50 }]
      }
    });
    assert(invalidRate.status === 400, 17, 'Negative rate rejected with 400 Bad Request');

    // Non-existent customer
    const badCust = await apiRequest('/invoices', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        customerId: '000000000000000000000000',
        items: [{ description: 'Test', hsnSac: '123', quantity: 1, rate: 100 }]
      }
    });
    assert(badCust.status === 404, 17, 'Non-existent customer rejected with 404 Not Found');

    // -------------------------------------------------------------
    // SCENARIO 18: Confirm frontend totals cannot override server-calculated totals
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 18: Server authoritative calculation enforcement ---');
    const maliciousPayload = {
      customerId: testCustomer._id,
      items: [
        {
          description: 'Expensive Hardware',
          hsnSac: '8471',
          quantity: 1,
          rate: 50000,
          taxRate: 18
        }
      ],
      // Malicious attempt to forge lower grand total and zero tax
      grandTotal: 10,
      taxableValue: 10,
      totalGst: 0,
      amountInWords: 'Rupees Ten Only',
      status: 'issued'
    };

    const s18Res = await apiRequest('/invoices', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: maliciousPayload
    });
    const s18 = s18Res.data.data;
    assert(s18.grandTotal === 59000, 18, 'Server recalculated authoritative grand total (₹59,000)', `Server stored: ${s18.grandTotal}`);
    assert(s18.taxableValue === 50000, 18, 'Server recalculated authoritative taxable value (₹50,000)', `Server stored: ${s18.taxableValue}`);
    assert(s18.totalGst === 9000, 18, 'Server recalculated authoritative total GST (₹9,000)', `Server stored: ${s18.totalGst}`);
    assert(s18.amountInWords === 'Rupees Fifty Nine Thousand Only', 18, 'Server generated authoritative amountInWords', `Server stored: "${s18.amountInWords}"`);

    // -------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------
    console.log('\n================================================================');
    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    console.log(`TOTAL SCENARIO TESTS: ${results.length} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Test Suite encountered fatal error:', err);
    process.exit(1);
  } finally {
    if (server) {
      server.close();
    }
  }
}

runAllTests();
