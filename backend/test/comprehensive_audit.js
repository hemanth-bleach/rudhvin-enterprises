import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASE_URL = 'http://localhost:5000/api';

const results = [];

function assert(condition, testName, details = '') {
  if (condition) {
    results.push({ name: testName, status: 'PASS', details });
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    results.push({ name: testName, status: 'FAIL', details });
    console.error(`  ❌ FAIL: ${testName} - ${details}`);
  }
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
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

async function runAudit() {
  console.log('================================================================');
  console.log('🚀 STARTING RUDHVIN ENTERPRISES COMPREHENSIVE AUDIT TEST SUITE');
  console.log('================================================================\n');

  let adminToken = '';
  let staffToken = '';
  let testCustomerId = '';
  let testProductId = '';
  let testDraftInvoiceId = '';
  let testIssuedInvoiceId = '';
  let testPaymentId = '';

  // -------------------------------------------------------------
  // SUITE 1: ENVIRONMENT & STARTUP VERIFICATION
  // -------------------------------------------------------------
  console.log('\n--- SUITE 1: Environment & Startup Verification ---');
  {
    const health = await request('/health');
    assert(health.status === 200 && health.data?.status === 'ok', 'Health Check Endpoint (/api/health)');

    const notFound = await request('/non-existent-endpoint');
    assert(notFound.status === 404, 'API 404 Error Handler');

    // Static SPA check
    const spaRes = await fetch('http://localhost:5000/');
    const spaHtml = await spaRes.text();
    assert(spaRes.status === 200 && spaHtml.includes('Rudhvin Enterprises'), 'SPA Static Asset Serving');
  }

  // -------------------------------------------------------------
  // SUITE 2: AUTHENTICATION & AUTHORIZATION (RBAC)
  // -------------------------------------------------------------
  console.log('\n--- SUITE 2: Authentication & RBAC Verification ---');
  {
    // 2.1 Missing credentials
    const missingCreds = await request('/auth/login', {
      method: 'POST',
      body: { email: '' }
    });
    assert(missingCreds.status === 400, 'Rejection of Missing Login Credentials (400)');

    // 2.2 Bad password
    const badPass = await request('/auth/login', {
      method: 'POST',
      body: { email: 'admin@rudhvin.com', password: 'WrongPassword999!' }
    });
    assert(badPass.status === 401, 'Rejection of Incorrect Password (401)');

    // 2.3 Unknown email
    const unknownUser = await request('/auth/login', {
      method: 'POST',
      body: { email: 'nonexistent@rudhvin.com', password: 'SomePassword123' }
    });
    assert(unknownUser.status === 401, 'Rejection of Non-existent User (401)');

    // 2.4 Valid Admin Login
    const adminLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: 'admin@rudhvin.com', password: 'Admin@12345' }
    });
    assert(adminLogin.status === 200 && adminLogin.data?.token, 'Admin Login Success & Token Generation', adminLogin.data?.message);
    adminToken = adminLogin.data?.token;

    // 2.5 Profile retrieval
    const profile = await request('/auth/me', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(profile.status === 200 && profile.data?.user?.role === 'admin', 'Admin Profile Retrieval (/api/auth/me)');

    // 2.6 Invalid token
    const invalidToken = await request('/auth/me', {
      headers: { Authorization: 'Bearer this_is_an_invalid_token' }
    });
    assert(invalidToken.status === 401, 'Rejection of Malformed JWT Token (401)');

    // 2.7 Create Staff User via Admin
    const staffEmail = `audit_staff_${Date.now()}@rudhvin.com`;
    const staffCreate = await request('/auth/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'Audit Staff Member',
        email: staffEmail,
        password: 'StaffPassword@123',
        role: 'staff'
      }
    });
    assert(staffCreate.status === 201 && staffCreate.data?.data?.role === 'staff', 'Admin Creates Staff Account');
    const staffUserId = staffCreate.data?.data?.id;

    // 2.8 Staff Login
    const staffLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: staffEmail, password: 'StaffPassword@123' }
    });
    assert(staffLogin.status === 200 && staffLogin.data?.user?.role === 'staff', 'Staff Login Success');
    staffToken = staffLogin.data?.token;

    // 2.9 RBAC: Staff denied access to user list
    const staffUserList = await request('/auth/users', {
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    assert(staffUserList.status === 403, 'RBAC: Staff Blocked from Listing Users (403)');

    // 2.10 RBAC: Staff denied access to toggle user status
    const staffToggle = await request(`/auth/users/${staffUserId}/toggle-status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    assert(staffToggle.status === 403, 'RBAC: Staff Blocked from Toggling User Status (403)');

    // 2.11 Deactivated User Check
    await request(`/auth/users/${staffUserId}/toggle-status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const inactiveLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: staffEmail, password: 'StaffPassword@123' }
    });
    assert(inactiveLogin.status === 403, 'Deactivated User Rejected on Login (403)');

    // Reactivate staff user for further tests
    await request(`/auth/users/${staffUserId}/toggle-status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
  }

  // -------------------------------------------------------------
  // SUITE 3: DASHBOARD REAL-TIME STATS RECONCILIATION
  // -------------------------------------------------------------
  console.log('\n--- SUITE 3: Dashboard Statistics Reconciliation ---');
  {
    const statsRes = await request('/dashboard/stats', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(statsRes.status === 200, 'Dashboard Stats Endpoint Responds 200 OK');
    const stats = statsRes.data?.data;

    // Direct database read verification
    const dbPath = path.resolve(__dirname, '../data/rudhvin_store.json');
    const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

    const expectedInvoices = dbData.invoices.filter(i => !i.isDeleted).length;
    const expectedCustomers = dbData.customers.filter(c => !c.isDeleted).length;

    const validInvoices = dbData.invoices.filter(i => !i.isDeleted && i.status !== 'draft' && i.status !== 'cancelled');
    const expectedBilled = validInvoices.reduce((sum, i) => sum + (Number(i.grandTotal) || 0), 0);
    const expectedPending = validInvoices.reduce((sum, i) => sum + (Number(i.balanceDue) || 0), 0);

    assert(stats.totalInvoices === expectedInvoices, `KPI 1: Total Invoices (${stats.totalInvoices} == DB ${expectedInvoices})`);
    assert(Math.abs(stats.totalBilledAmount - expectedBilled) < 0.01, `KPI 2: Total Billed Amount (₹${stats.totalBilledAmount} == DB ₹${expectedBilled})`);
    assert(Math.abs(stats.pendingAmount - expectedPending) < 0.01, `KPI 3: Pending Amount (₹${stats.pendingAmount} == DB ₹${expectedPending})`);
    assert(stats.totalCustomers === expectedCustomers, `KPI 4: Total Customers (${stats.totalCustomers} == DB ${expectedCustomers})`);

    // Monthly summary & Recent items
    const monthlyRes = await request('/dashboard/monthly-summary', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(monthlyRes.status === 200 && Array.isArray(monthlyRes.data?.data), 'Dashboard Monthly Summary Aggregation');

    const recentInvoices = await request('/dashboard/recent-invoices', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(recentInvoices.status === 200 && Array.isArray(recentInvoices.data?.data), 'Dashboard Recent Invoices Feed');

    const recentActivity = await request('/dashboard/recent-activity', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(recentActivity.status === 200 && Array.isArray(recentActivity.data?.data), 'Dashboard Recent Activity Audit Feed');
  }

  // -------------------------------------------------------------
  // SUITE 4: CUSTOMER & PRODUCT CRUD
  // -------------------------------------------------------------
  console.log('\n--- SUITE 4: Customer & Product CRUD ---');
  const runId = Date.now().toString().slice(-4);
  {
    // 4.1 Create customer
    const gstin = `37AAAAA${runId}A1Z5`;
    const custRes = await request('/customers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: `Audit Customer Visakhapatnam ${runId}`,
        organization: 'Audit Tech Solutions Pvt Ltd',
        billingAddress: 'D.No 4-50, MVP Colony, Visakhapatnam, AP',
        phone: '9848022338',
        email: `audit_customer_${runId}@test.com`,
        gstin: gstin,
        state: 'Andhra Pradesh',
        stateCode: '37'
      }
    });
    assert(custRes.status === 201 && custRes.data?.data?._id, 'Customer Creation with Full Details', custRes.data?.message || `Status: ${custRes.status}`);
    testCustomerId = custRes.data?.data?._id;

    // 4.2 Duplicate GSTIN rejection
    const dupCust = await request('/customers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'Another Customer',
        billingAddress: 'Address 123',
        gstin: gstin
      }
    });
    assert(dupCust.status === 400, 'Duplicate GSTIN Rejection (400)', dupCust.data?.message || `Status: ${dupCust.status}`);

    // 4.3 Update customer
    const updateCust = await request(`/customers/${testCustomerId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { contactPerson: 'Srikanth Varma' }
    });
    assert(updateCust.status === 200 && updateCust.data?.data?.contactPerson === 'Srikanth Varma', 'Customer Update', updateCust.data?.message || `Status: ${updateCust.status}`);

    // 4.4 Create product
    const prodRes = await request('/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: `Audit Disinfectant Fluid 5L ${runId}`,
        description: 'Hospital grade germicidal solution',
        hsnSac: '3808',
        unit: 'CAN',
        defaultRate: 850,
        defaultTaxRate: 18
      }
    });
    assert(prodRes.status === 201 && prodRes.data?.data?._id, 'Product Creation with 18% GST', prodRes.data?.message || `Status: ${prodRes.status}`);
    testProductId = prodRes.data?.data?._id;

    // 4.5 Product validation - invalid tax rate rejection
    const invalidTaxProd = await request('/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'Invalid Tax Product',
        hsnSac: '1234',
        defaultRate: 100,
        defaultTaxRate: 15 // Not in [0, 5, 12, 18, 28]
      }
    });
    assert(invalidTaxProd.status === 400, 'Product Rejection on Non-standard Tax Rate (400)', invalidTaxProd.data?.message || `Status: ${invalidTaxProd.status}`);
  }

  // -------------------------------------------------------------
  // SUITE 5: INVOICE LIFECYCLE, TAX CALCULATION & NUMBERING
  // -------------------------------------------------------------
  console.log('\n--- SUITE 5: Invoice Lifecycle, Tax Rules & Numbering ---');
  {
    // 5.1 Intra-state Draft Invoice Creation (AP to AP -> CGST 9% + SGST 9%)
    const draftRes = await request('/invoices', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        customerId: testCustomerId,
        status: 'draft',
        paymentTerms: 'Due on Receipt',
        notes: 'Audit Draft Invoice Test',
        items: [
          {
            description: 'Audit Disinfectant Fluid 5L',
            hsnSac: '3808',
            quantity: 10,
            rate: 850,
            discountPercent: 10, // 10% disc = 8500 * 0.10 = 850 disc, taxable = 7650
            taxRate: 18 // 18% on 7650 = 1377 total tax. CGST=688.50, SGST=688.50, GrandTotal=9027
          }
        ]
      }
    });

    assert(draftRes.status === 201, 'Draft Invoice Creation Success');
    const draftInv = draftRes.data?.data;
    testDraftInvoiceId = draftInv?._id;

    assert(draftInv?.subtotal === 8500, `Line Subtotal Calculation (₹${draftInv?.subtotal} == ₹8500)`);
    assert(draftInv?.totalDiscount === 850, `Item Discount Calculation (₹${draftInv?.totalDiscount} == ₹850)`);
    assert(draftInv?.taxableAmount === 7650, `Taxable Amount Calculation (₹${draftInv?.taxableAmount} == ₹7650)`);
    assert(draftInv?.taxBreakdown?.isInterState === false, 'Tax Rule: Intra-state Detected (AP -> AP)');
    assert(draftInv?.taxBreakdown?.cgstAmount === 688.5, `CGST 9% (₹${draftInv?.taxBreakdown?.cgstAmount} == ₹688.50)`);
    assert(draftInv?.taxBreakdown?.sgstAmount === 688.5, `SGST 9% (₹${draftInv?.taxBreakdown?.sgstAmount} == ₹688.50)`);
    assert(draftInv?.taxBreakdown?.igstAmount === 0, 'IGST is 0 for intra-state');
    assert(draftInv?.grandTotal === 9027, `Grand Total (₹${draftInv?.grandTotal} == ₹9027)`);
    assert(draftInv?.status === 'draft', 'Status is strictly draft');

    // 5.2 Inter-state Invoice Calculation (AP to Telangana: State Code 36)
    // Create an inter-state customer
    const interStateCust = await request('/customers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: `Hyderabad Tech Hub ${runId}`,
        billingAddress: 'Hitec City, Hyderabad, Telangana',
        gstin: `36BBBBB${runId}B1Z6`,
        state: 'Telangana',
        stateCode: '36'
      }
    });
    const interStateCustId = interStateCust.data?.data?._id;

    const interStateInv = await request('/invoices', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        customerId: interStateCustId,
        status: 'draft',
        items: [
          {
            description: 'Interstate Item',
            hsnSac: '3808',
            quantity: 2,
            rate: 1000,
            taxRate: 18
          }
        ]
      }
    });
    const interInv = interStateInv.data?.data;
    assert(interInv?.taxBreakdown?.isInterState === true, 'Tax Rule: Inter-state Detected (AP 37 -> TG 36)');
    assert(interInv?.taxBreakdown?.cgstAmount === 0 && interInv?.taxBreakdown?.sgstAmount === 0, 'CGST & SGST are 0 for Inter-state');
    assert(interInv?.taxBreakdown?.igstAmount === 360, `Full 18% IGST Applied (₹${interInv?.taxBreakdown?.igstAmount} == ₹360)`);

    // Clean up interstate draft
    await request(`/invoices/${interInv._id}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { reason: 'Interstate audit completed' }
    });

    // 5.3 Issue Draft Invoice
    const issueRes = await request(`/invoices/${testDraftInvoiceId}/issue`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(issueRes.status === 200 && issueRes.data?.data?.status === 'issued', 'Issue Draft Invoice (Status -> issued)');
    testIssuedInvoiceId = testDraftInvoiceId;

    // 5.4 Verify Invoice Details
    const detailRes = await request(`/invoices/${testIssuedInvoiceId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(detailRes.status === 200 && detailRes.data?.data?.balanceDue === 9027, 'Invoice Detail Balance Verification');

    // 5.5 Snapshot Immutability Test:
    // Update customer name, check historical invoice snapshot remains unchanged
    await request(`/customers/${testCustomerId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { name: 'MUTATED CUSTOMER NAME' }
    });
    const snapshotCheck = await request(`/invoices/${testIssuedInvoiceId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(snapshotCheck.data?.data?.customerSnapshot?.name === `Audit Customer Visakhapatnam ${runId}`, 'Snapshot Immutability Preserved', `Snapshot name: ${snapshotCheck.data?.data?.customerSnapshot?.name}`);
  }

  // -------------------------------------------------------------
  // SUITE 6: PAYMENTS, PARTIAL PAYMENTS & REVERSALS
  // -------------------------------------------------------------
  console.log('\n--- SUITE 6: Payments, Partial Payments & Reversals ---');
  {
    // 6.1 Rejection of Payment on Draft Invoice
    const draftForPay = await request('/invoices', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        customerId: testCustomerId,
        status: 'draft',
        items: [{ description: 'Test', hsnSac: '111', quantity: 1, rate: 500, taxRate: 0 }]
      }
    });
    const draftPayAttempt = await request('/payments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        invoiceId: draftForPay.data?.data?._id,
        amount: 250,
        paymentMethod: 'Cash'
      }
    });
    assert(draftPayAttempt.status === 400, 'Payment Rejection on Draft Invoice (400)');
    await request(`/invoices/${draftForPay.data?.data?._id}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { reason: 'Clean draft pay test' }
    });

    // 6.2 Overpayment Rejection
    const overpayAttempt = await request('/payments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        invoiceId: testIssuedInvoiceId,
        amount: 50000, // Balance is 9027
        paymentMethod: 'Bank Transfer'
      }
    });
    assert(overpayAttempt.status === 400, 'Rejection of Overpayment > balanceDue (400)');

    // 6.3 Partial Payment (Pay ₹4000 of ₹9027)
    const partialPay = await request('/payments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        invoiceId: testIssuedInvoiceId,
        amount: 4000,
        paymentDate: new Date().toISOString(),
        paymentMethod: 'Bank Transfer',
        transactionReference: 'NEFT-AUDIT-4000'
      }
    });
    assert(partialPay.status === 201, 'Partial Payment Creation Success');
    assert(partialPay.data?.data?.invoiceBalanceDue === 5027, `Partial Balance Remaining (₹${partialPay.data?.data?.invoiceBalanceDue} == ₹5027)`);
    assert(partialPay.data?.data?.invoiceStatus === 'partially_paid', 'Invoice Status Updated to partially_paid');
    testPaymentId = partialPay.data?.data?.payment?._id;

    // 6.4 RBAC: Staff cannot reverse payment
    const staffReverseAttempt = await request(`/payments/${testPaymentId}/reverse`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: { reason: 'Unauthorized staff reversal' }
    });
    assert(staffReverseAttempt.status === 403, 'RBAC: Staff Blocked from Reversing Payment (403)');

    // 6.5 Admin Reverses Payment
    const adminReverse = await request(`/payments/${testPaymentId}/reverse`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { reason: 'Authorized reversal for test' }
    });
    assert(adminReverse.status === 200, 'Admin Successfully Reverses Payment');
    assert(adminReverse.data?.data?.invoiceBalanceDue === 9027, `Balance Restored to Full (₹${adminReverse.data?.data?.invoiceBalanceDue} == ₹9027)`);
    assert(adminReverse.data?.data?.invoiceStatus === 'issued', 'Invoice Status Restored to issued');

    // 6.6 Full Payment Test
    const fullPay = await request('/payments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        invoiceId: testIssuedInvoiceId,
        amount: 9027,
        paymentMethod: 'UPI',
        transactionReference: 'UPI-FULL-9027'
      }
    });
    assert(fullPay.status === 201, 'Full Payment Recorded');
    assert(fullPay.data?.data?.invoiceBalanceDue === 0, 'Balance Due Reaches Exactly 0');
    assert(fullPay.data?.data?.invoiceStatus === 'paid', 'Invoice Status Updated to paid');
  }

  // -------------------------------------------------------------
  // SUITE 7: PDF GENERATION & PRINT TEMPLATE
  // -------------------------------------------------------------
  console.log('\n--- SUITE 7: PDF Generation & Print Preview ---');
  {
    // 7.1 HTML Print Preview
    const previewRes = await request(`/invoices/${testIssuedInvoiceId}/preview`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(previewRes.status === 200, 'Invoice HTML Preview Endpoint Responds 200');
    const html = String(previewRes.data || '');
    assert(html.includes('RUDHVIN ENTERPRISES'), 'HTML Preview Contains Rudhvin Enterprises Header');
    assert(html.includes('RU'), 'HTML Preview Contains Invoice Prefix');
    assert(html.includes('3808'), 'HTML Preview Contains HSN Code');

    // 7.2 Puppeteer PDF Stream
    const pdfRes = await request(`/invoices/${testIssuedInvoiceId}/pdf`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(pdfRes.status === 200, 'PDF Generation Endpoint Responds 200 OK');
    const pdfBytes = pdfRes.data ? pdfRes.data.byteLength || pdfRes.data.length || 0 : 0;
    assert(pdfBytes > 20000, `PDF Buffer Size is Valid (${pdfBytes} bytes > 20,000)`);
  }

  // -------------------------------------------------------------
  // SUITE 8: REPORTS & COMPANY SETTINGS
  // -------------------------------------------------------------
  console.log('\n--- SUITE 8: Reports & Company Settings ---');
  {
    // 8.1 Company Settings Read
    const settingsRes = await request('/settings/company', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(settingsRes.status === 200 && settingsRes.data?.data?.companyName === 'RUDHVIN ENTERPRISES', 'Read Company Settings');

    // 8.2 RBAC: Staff denied updating company settings
    const staffSettingsUpdate = await request('/settings/company', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: { tagline: 'Hacked by staff' }
    });
    assert(staffSettingsUpdate.status === 403, 'RBAC: Staff Blocked from Updating Company Settings (403)');

    // 8.3 Financial Reports Endpoint
    const reportsRes = await request('/reports', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(reportsRes.status === 200, 'Financial Reports Endpoint Responds 200 OK');
    const repData = reportsRes.data?.data;
    assert(Array.isArray(repData?.statusSummary), 'Reports Include Status Summary');
    assert(Array.isArray(repData?.monthlyTrend), 'Reports Include Monthly Trend');
    assert(Array.isArray(repData?.customerBilling), 'Reports Include Customer Billing');
    assert(repData?.taxSummary !== undefined, 'Reports Include Tax Summary');
  }

  // -------------------------------------------------------------
  // SUITE 9: CONCURRENCY & SEQUENCE NUMBERING
  // -------------------------------------------------------------
  console.log('\n--- SUITE 9: Concurrency & Sequence Integrity ---');
  {
    const concurrentCount = 5;
    const promises = [];
    for (let i = 0; i < concurrentCount; i++) {
      promises.push(
        request('/invoices', {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}` },
          body: {
            customerId: testCustomerId,
            status: 'draft',
            items: [{ description: `Concurrent Item ${i}`, hsnSac: '123', quantity: 1, rate: 100, taxRate: 0 }]
          }
        })
      );
    }
    const concurrentResults = await Promise.all(promises);
    const invoiceNumbers = concurrentResults.map(r => r.data?.data?.invoiceNumber).filter(Boolean);

    const uniqueNumbers = new Set(invoiceNumbers);
    assert(uniqueNumbers.size === concurrentCount, `Concurrent Invoices Generated Unique Numbers (${uniqueNumbers.size}/${concurrentCount})`);

    // Clean up concurrent drafts
    for (const res of concurrentResults) {
      if (res.data?.data?._id) {
        await request(`/invoices/${res.data?.data?._id}/cancel`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}` },
          body: { reason: 'Clean concurrent test draft' }
        });
      }
    }
  }

  // -------------------------------------------------------------
  // SUITE 10: AUDIT LOG INTEGRITY & FINAL VERIFICATION
  // -------------------------------------------------------------
  console.log('\n--- SUITE 10: Audit Log Tracking ---');
  {
    const auditRes = await request('/dashboard/recent-activity', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(auditRes.status === 200 && auditRes.data?.data?.length > 0, 'Audit Log Successfully Tracks Operations');
  }

  // SUMMARY
  console.log('\n================================================================');
  console.log('📊 AUDIT TEST RESULTS SUMMARY');
  console.log('================================================================');
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log(`TOTAL TESTS EXECUTED: ${results.length}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log(`STATUS: ${failed === 0 ? '✅ ALL AUDIT TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAudit().catch(err => {
  console.error('Audit runner error:', err);
  process.exit(1);
});
