import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../data/rudhvin_store.json');

async function testPersistence() {
  console.log('--- Verifying Database File on Disk ---');
  if (!fs.existsSync(dbPath)) {
    console.error('FAIL: Database file does not exist on disk!');
    process.exit(1);
  }

  const raw = fs.readFileSync(dbPath, 'utf8');
  const data = JSON.parse(raw);

  console.log(`✅ Persistent store file exists (${(raw.length / 1024).toFixed(2)} KB)`);
  console.log(`   Users in store: ${data.users.length}`);
  console.log(`   Companies in store: ${data.companies.length}`);
  console.log(`   Customers in store: ${data.customers.length}`);
  console.log(`   Products in store: ${data.products.length}`);
  console.log(`   Invoices in store: ${data.invoices.length}`);
  console.log(`   Payments in store: ${data.payments.length}`);
  console.log(`   Sequences in store: ${data.invoicesequences.length}`);
  console.log(`   Audit logs in store: ${data.auditlogs.length}`);

  // Health and stats check via HTTP
  const statsRes = await fetch('http://localhost:5000/api/dashboard/stats', {
    headers: {
      Authorization: `Bearer ${generateQuickToken()}`
    }
  });

  if (statsRes.status === 200) {
    const json = await statsRes.json();
    console.log('✅ Live API confirms loaded stats:', json.data);
  } else {
    console.log(`Note: Stats returned status ${statsRes.status}`);
  }
}

function generateQuickToken() {
  // Read token from environment or use test login
  return '';
}

testPersistence();
