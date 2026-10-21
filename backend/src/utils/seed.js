import { User } from '../models/User.js';
import { Company } from '../models/Company.js';
import { Customer } from '../models/Customer.js';
import { Product } from '../models/Product.js';

export async function seedInitialData() {
  try {
    // 1. Seed Admin User
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@rudhvin.com';
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      await User.create({
        name: 'Hemanth',
        email: adminEmail,
        password: process.env.ADMIN_PASSWORD || 'Admin@12345',
        role: 'admin',
        isActive: true
      });
      console.log(`[Seed] Created default Admin user: ${adminEmail}`);
    }

    // 2. Seed Rudhvin Enterprises Company Info
    let company = await Company.findOne();
    if (!company) {
      company = await Company.create({
        companyName: 'RUDHVIN ENTERPRISES',
        tagline: 'Invoice Management System',
        address: 'D.No.9-6-105/1/3, 2nd Floor, 1st Portion, Mangapuram Colony, Near Kalabharathi, Sivajipalem, LB Colony, Visakhapatnam - 530017.',
        phone: '7075708933',
        mobile: '+91 9652496933',
        email: 'rudhvinenterprises@gmail.com',
        gstin: '37DGBPV1007RIZU',
        state: 'Andhra Pradesh',
        stateCode: '37',
        bankDetails: {
          bankName: 'Karur Vysya Bank',
          accountHolderName: 'RUDHVIN ENTERPRISES',
          accountNumber: '143201000000719',
          ifscCode: 'KVBL0001432',
          branch: 'Visakhapatnam'
        },
        authorizedSignatory: 'Rudhvin Enterprises',
        invoicePrefix: 'RU',
        invoiceNumberPadding: 3,
        defaultPaymentTerms: 'Due on Receipt',
        invoiceFooter: 'This is a computer generated invoice and does not require a physical signature.'
      });
      console.log('[Seed] Created default Rudhvin Enterprises company settings');
    }

    // 3. Seed Reference Product if empty
    const productCount = await Product.countDocuments({ isDeleted: false });
    if (productCount === 0) {
      await Product.create({
        name: 'Urinal Cubes',
        description: 'Sanitary Urinal Cubes',
        hsnSac: '3307',
        unit: 'PCS',
        defaultRate: 175,
        defaultTaxRate: 0,
        isActive: true
      });
      console.log('[Seed] Created reference product: Urinal Cubes');
    }

    // 4. Seed Reference Customer if empty
    const customerCount = await Customer.countDocuments({ isDeleted: false });
    if (customerCount === 0) {
      await Customer.create({
        name: 'EPFO Office, Rytu Bazar',
        organization: 'EMPLOYEES PROVIDENT FUND ORGANISATION',
        billingAddress: 'BESIDE GST. OFFICE, OPP RYTU BAZAR\nMORAMPUDI JUNCTION, RAJAHMUNDRY-533107\nEAST GODAVARI, ANDHRA PRADESH , INDIA',
        phone: '0883-2470532',
        state: 'Andhra Pradesh',
        stateCode: '37'
      });
      console.log('[Seed] Created reference customer: EPFO Office');
    }
  } catch (err) {
    console.error('[Seed] Error seeding initial data:', err.message);
  }
}
