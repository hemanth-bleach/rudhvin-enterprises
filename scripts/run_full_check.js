import http from 'http';
import app from '../backend/src/app.js';
import { connectDB } from '../backend/src/config/db.js';
import { seedInitialData } from '../backend/src/utils/seed.js';

async function runFullSystemCheck() {
  console.log('====================================================');
  console.log('🚀 STARTING FULL SYSTEM END-TO-END CHECK');
  console.log('====================================================\n');

  await connectDB();
  await seedInitialData();

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`📡 Full server running on test port ${port}`);

  let adminToken = '';
  let testCustomerId = '';
  let testInvoiceId = '';
  let generatedInvoiceNum = '';

  try {
    // 1. Health check
    console.log('\n[1/12] Checking /api/health...');
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthRes.json();
    if (healthRes.status === 200 && healthData.status === 'ok') {
      console.log('✅ Health check passed:', healthData);
    } else {
      throw new Error(`Health check failed: ${JSON.stringify(healthData)}`);
    }

    // 2. Frontend SPA index serving
    console.log('\n[2/12] Checking frontend static file serving (SPA)...');
    const spaRes = await fetch(`${baseUrl}/invoices`);
    const spaText = await spaRes.text();
    if (spaRes.status === 200 && spaText.includes('<div id="root">')) {
      console.log('✅ Frontend SPA static files served correctly by backend');
    } else {
      throw new Error('Frontend static files not served properly');
    }

    // 3. Admin Authentication
    console.log('\n[3/12] Testing Admin Authentication (/api/auth/login)...');
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@rudhvin.com', password: 'Admin@12345' })
    });
    const loginData = await loginRes.json();
    if (loginRes.status === 200 && loginData.token) {
      adminToken = loginData.token;
      console.log(`✅ Admin logged in successfully (${loginData.user?.name}, Role: ${loginData.user?.role})`);
    } else {
      throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
    }

    // 4. Company Settings
    console.log('\n[4/12] Fetching Company Settings (/api/settings/company)...');
    const compRes = await fetch(`${baseUrl}/api/settings/company`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const compData = await compRes.json();
    if (compRes.status === 200 && compData.data?.companyName === 'RUDHVIN ENTERPRISES') {
      console.log(`✅ Company settings retrieved: ${compData.data.companyName} (GSTIN: ${compData.data.gstin})`);
    } else {
      throw new Error(`Failed to get company settings: ${JSON.stringify(compData)}`);
    }

    // 5. Customer Creation
    console.log('\n[5/12] Testing Customer Creation (/api/customers)...');
    const custRes = await fetch(`${baseUrl}/api/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'System Verification Corp',
        organization: 'System Verification Corp',
        billingAddress: 'D.No. 12-34, Dwaraka Nagar, Visakhapatnam, Andhra Pradesh',
        gstin: '37AAAAA1234A1Z5',
        phone: '9876543210',
        email: 'billing@svcorp.com',
        state: 'Andhra Pradesh',
        stateCode: '37'
      })
    });
    const custData = await custRes.json();
    if (custRes.status === 201 && custData.data?._id) {
      testCustomerId = custData.data._id;
      console.log(`✅ Customer created successfully: ${custData.data.name} (ID: ${testCustomerId})`);
    } else {
      throw new Error(`Customer creation failed: ${JSON.stringify(custData)}`);
    }

    // 6. Peek Invoice Number
    console.log('\n[6/12] Checking next sequential invoice number (/api/invoices/peek-number)...');
    const peekRes = await fetch(`${baseUrl}/api/invoices/peek-number`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const peekData = await peekRes.json();
    generatedInvoiceNum = peekData.data?.nextNumber;
    if (peekRes.status === 200 && /^RU\d{3,}$/.test(generatedInvoiceNum)) {
      console.log(`✅ Peek invoice number returned: ${generatedInvoiceNum}`);
    } else {
      throw new Error(`Peek invoice number invalid: ${JSON.stringify(peekData)}`);
    }

    // 7. Create Invoice
    console.log(`\n[7/12] Creating Tax-Inclusive Invoice ${generatedInvoiceNum} (/api/invoices)...`);
    const invRes = await fetch(`${baseUrl}/api/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        invoiceNumber: generatedInvoiceNum,
        customerId: testCustomerId,
        isTaxInclusive: true,
        taxTreatment: 'auto',
        items: [
          {
            serialNumber: 1,
            description: 'AVISHREE Bedsheet Set',
            hsnSac: '6304',
            quantity: 1,
            unit: 'piece',
            rate: 5160,
            taxRate: 18,
            isTaxInclusive: true
          }
        ]
      })
    });
    const invData = await invRes.json();
    if (invRes.status === 201 && invData.data?._id) {
      testInvoiceId = invData.data._id;
      const inv = invData.data;
      console.log(`✅ Invoice ${inv.invoiceNumber} created successfully!`);
      console.log(`   - Taxable Value: ₹${inv.taxableValue} (Expected: 4372.88)`);
      console.log(`   - CGST (9%):     ₹${inv.cgstAmount} (Expected: 393.56)`);
      console.log(`   - SGST (9%):     ₹${inv.sgstAmount} (Expected: 393.56)`);
      console.log(`   - Total GST:     ₹${inv.totalGst} (Expected: 787.12)`);
      console.log(`   - Grand Total:   ₹${inv.grandTotal} (Expected: 5160.00)`);
      console.log(`   - In Words:      "${inv.amountInWords}"`);

      if (inv.taxableValue !== 4372.88 || inv.grandTotal !== 5160) {
        throw new Error('Reverse GST calculation values do not match expected 4372.88 / 5160');
      }
    } else {
      throw new Error(`Invoice creation failed: ${JSON.stringify(invData)}`);
    }

    // 8. PDF Generation and Rupee Symbol
    console.log('\n[8/12] Generating PDF Buffer & Verifying Content (/api/invoices/:id/pdf)...');
    const pdfRes = await fetch(`${baseUrl}/api/invoices/${testInvoiceId}/pdf`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
    if (pdfRes.status === 200 && pdfBuffer.slice(0, 4).toString() === '%PDF') {
      console.log(`✅ PDF generated successfully (${pdfBuffer.length} bytes, valid %PDF header)`);
    } else {
      throw new Error(`PDF generation failed: status ${pdfRes.status}`);
    }

    // 9. HTML Invoice Preview
    console.log('\n[9/12] Verifying HTML Invoice Preview (/api/invoices/:id/preview)...');
    const prevRes = await fetch(`${baseUrl}/api/invoices/${testInvoiceId}/preview`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const html = await prevRes.text();
    const hasRupeeFont = html.includes('IndianRupee');
    const hasCompany = html.includes('RUDHVIN ENTERPRISES');
    const hasCustomer = html.includes('System Verification Corp');
    const hasValues = html.includes('4,372.88') && html.includes('5,160.00');

    console.log('hasRupeeFont:', hasRupeeFont);
    console.log('hasCompany:', hasCompany);
    console.log('hasCustomer:', hasCustomer);
    console.log('hasValues:', hasValues);
    if (!hasValues) {
      console.log('Snippet of html around values:', html.slice(html.indexOf('Taxable Value') - 50, html.indexOf('Taxable Value') + 300));
    }
    if (!hasCustomer) {
      console.log('Snippet of html around customer:', html.slice(html.indexOf('BILL TO') - 50, html.indexOf('BILL TO') + 300));
    }

    if (hasRupeeFont && hasCompany && hasCustomer && hasValues) {
      console.log('✅ HTML Preview verified (IndianRupee base64 font, company name, customer, and amounts present)');
    } else {
      throw new Error('HTML preview missing expected elements');
    }

    // 10. Dashboard Stats
    console.log('\n[10/12] Checking Dashboard Statistics (/api/dashboard/stats)...');
    const statsRes = await fetch(`${baseUrl}/api/dashboard/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const statsData = await statsRes.json();
    if (statsRes.status === 200 && statsData.data) {
      console.log('✅ Dashboard stats retrieved:', {
        totalInvoices: statsData.data.totalInvoices,
        totalCustomers: statsData.data.totalCustomers,
        totalBilledAmount: statsData.data.totalBilledAmount,
        pendingAmount: statsData.data.pendingAmount
      });
    } else {
      throw new Error(`Failed to retrieve dashboard stats: ${JSON.stringify(statsData)}`);
    }

    // 11. Reports
    console.log('\n[11/12] Checking Reports Endpoint (/api/reports)...');
    const repRes = await fetch(`${baseUrl}/api/reports`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const repData = await repRes.json();
    if (repRes.status === 200 && repData.success) {
      console.log('✅ Reports endpoint functioning correctly');
    } else {
      throw new Error(`Reports endpoint failed: ${JSON.stringify(repData)}`);
    }

    // 12. Cleanup test data
    console.log('\n[12/12] Cleaning up test invoice and customer...');
    if (testInvoiceId) {
      await fetch(`${baseUrl}/api/invoices/${testInvoiceId}?permanent=true`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
    }
    if (testCustomerId) {
      await fetch(`${baseUrl}/api/customers/${testCustomerId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
    }

    console.log('✅ Cleanup complete (test invoice and customer removed)');

    console.log('\n====================================================');
    console.log('🎉 ALL 12 SYSTEM CHECKS PASSED WITH 100% SUCCESS!');
    console.log('====================================================\n');
  } catch (err) {
    console.error('\n❌ System check failed with error:', err);
    process.exit(1);
  } finally {
    if (adminToken && testInvoiceId) {
      try {
        await fetch(`${baseUrl}/api/invoices/${testInvoiceId}?permanent=true`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${adminToken}` }
        });
      } catch (e) {}
    }
    if (adminToken && testCustomerId) {
      try {
        await fetch(`${baseUrl}/api/customers/${testCustomerId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${adminToken}` }
        });
      } catch (e) {}
    }
    server.close();
  }
}

runFullSystemCheck().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
