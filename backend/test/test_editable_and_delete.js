import http from 'http';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Customer } from '../src/models/Customer.js';
import { Invoice } from '../src/models/Invoice.js';

let server;
let port;
let baseUrl;
let adminToken = '';
let testCustomer = null;

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
  } else {
    data = await res.text();
  }
  return { status: res.status, data };
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 TESTING EDITABLE INVOICE NUMBER & DELETE FEATURES');
  console.log('====================================================\n');

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
    // 1. Login
    const loginRes = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email: 'admin@rudhvin.com', password: 'Admin@12345' }
    });
    adminToken = loginRes.data?.token;
    console.log('✅ Admin logged in successfully');

    // 2. Fetch customer
    const custRes = await apiRequest('/customers', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    testCustomer = custRes.data.data?.[0];
    if (!testCustomer) {
      const newCust = await apiRequest('/customers', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          name: 'Test Customer',
          billingAddress: 'Visakhapatnam, AP',
          state: 'Andhra Pradesh',
          stateCode: '37'
        }
      });
      testCustomer = newCust.data.data;
    }
    console.log(`✅ Using Customer: ${testCustomer.name} (${testCustomer._id})`);

    // 3. Create invoice with Custom Editable Invoice Number
    console.log('\n--- TEST 1: Create invoice with custom editable invoice number ---');
    const customInvNum = 'RE/TEST/2026/001';
    const s1Res = await apiRequest('/invoices', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        invoiceNumber: customInvNum,
        customerId: testCustomer._id,
        items: [
          {
            description: 'Custom Bedsheet Item',
            hsnSac: '6304',
            quantity: 2,
            unit: 'piece',
            rate: 500,
            taxRate: 18
          }
        ]
      }
    });

    console.log(`Status: ${s1Res.status}`);
    console.log(`Created Invoice Number: ${s1Res.data?.data?.invoiceNumber}`);
    if (s1Res.status === 201 && s1Res.data?.data?.invoiceNumber === customInvNum) {
      console.log('✅ PASS: Invoice created with exact custom invoice number');
    } else {
      throw new Error(`Failed to create custom invoice number. Got: ${JSON.stringify(s1Res.data)}`);
    }

    // 4. Duplicate invoice number rejection
    console.log('\n--- TEST 2: Reject duplicate custom invoice number ---');
    const dupRes = await apiRequest('/invoices', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        invoiceNumber: customInvNum,
        customerId: testCustomer._id,
        items: [
          {
            description: 'Duplicate Item',
            hsnSac: '6304',
            quantity: 1,
            unit: 'piece',
            rate: 200,
            taxRate: 18
          }
        ]
      }
    });

    console.log(`Duplicate status: ${dupRes.status}, Message: ${dupRes.data?.message}`);
    if (dupRes.status === 400 && dupRes.data?.message?.includes('already in use')) {
      console.log('✅ PASS: Duplicate invoice number correctly rejected with 400');
    } else {
      throw new Error(`Failed duplicate rejection test: ${JSON.stringify(dupRes.data)}`);
    }

    // 5. Update invoice number
    console.log('\n--- TEST 3: Update/Edit invoice number on existing invoice ---');
    const createdId = s1Res.data.data._id;
    const updatedInvNum = 'RE/TEST/2026/001-MODIFIED';
    const updRes = await apiRequest(`/invoices/${createdId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        invoiceNumber: updatedInvNum
      }
    });

    console.log(`Update status: ${updRes.status}`);
    console.log(`Updated Invoice Number: ${updRes.data?.data?.invoiceNumber}`);
    if (updRes.status === 200 && updRes.data?.data?.invoiceNumber === updatedInvNum) {
      console.log('✅ PASS: Invoice number updated successfully');
    } else {
      throw new Error(`Failed to update invoice number: ${JSON.stringify(updRes.data)}`);
    }

    // 6. Create invoice without custom number (auto-generate sequence)
    console.log('\n--- TEST 4: Auto-generate invoice number when empty/omitted ---');
    const autoRes = await apiRequest('/invoices', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        customerId: testCustomer._id,
        items: [
          {
            description: 'Auto Seq Item',
            hsnSac: '6304',
            quantity: 1,
            unit: 'piece',
            rate: 300,
            taxRate: 18
          }
        ]
      }
    });

    console.log(`Auto-generated Invoice Number: ${autoRes.data?.data?.invoiceNumber}`);
    if (autoRes.status === 201 && autoRes.data?.data?.invoiceNumber === 'RU001') {
      console.log('✅ PASS: Auto-generated invoice number starts at RU001');
    } else {
      throw new Error(`Failed auto-generation test: ${JSON.stringify(autoRes.data)}`);
    }

    // 7. Delete single invoice
    console.log('\n--- TEST 5: Delete single invoice ---');
    const autoId = autoRes.data.data._id;
    const delRes = await apiRequest(`/invoices/${autoId}?permanent=true`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    console.log(`Delete status: ${delRes.status}, Message: ${delRes.data?.message}`);
    if (delRes.status === 200) {
      console.log('✅ PASS: Single invoice deleted successfully');
    } else {
      throw new Error(`Failed to delete invoice: ${JSON.stringify(delRes.data)}`);
    }

    // Verify invoice is gone
    const checkDel = await apiRequest(`/invoices/${autoId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (checkDel.status === 404) {
      console.log('✅ PASS: Deleted invoice is no longer retrievable (404)');
    } else {
      throw new Error('Deleted invoice still retrievable');
    }

    // 8. Purge all invoices endpoint
    console.log('\n--- TEST 6: Purge all old invoices endpoint ---');
    const purgeRes = await apiRequest('/invoices/purge-old', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    console.log(`Purge status: ${purgeRes.status}, Message: ${purgeRes.data?.message}`);
    if (purgeRes.status === 200) {
      console.log('✅ PASS: Purge endpoint executed successfully');
    } else {
      throw new Error(`Failed purge test: ${JSON.stringify(purgeRes.data)}`);
    }

    // Verify all invoices count is 0
    const listRes = await apiRequest('/invoices', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`Remaining invoices count: ${listRes.data?.data?.length}`);
    if (listRes.data?.data?.length === 0) {
      console.log('✅ PASS: Invoices count is exactly 0 after purge');
    } else {
      throw new Error('Invoices still exist after purge');
    }

    console.log('\n====================================================');
    console.log('🎉 ALL EDITABLE INVOICE NUMBER & DELETE TESTS PASSED!');
    console.log('====================================================');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    server.close();
  }
}

runTests();
