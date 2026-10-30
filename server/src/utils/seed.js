import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { connectDB, disconnectDB } from '../config/db.js';
import {
  User,
  Outlet,
  Category,
  Manufacturer,
  Product,
  InventoryBatch,
  StockMovement,
  Supplier,
  Customer,
  PurchaseInvoice,
  SalesInvoice,
  Payment,
  Expense,
  Notification,
  AuditLog,
} from '../models/index.js';

export const seedData = async (disconnectWhenDone = false) => {
  console.log('[Seed] Starting HomeBooks Pharmacy ERP seed process...');
  if (mongoose.connection.readyState === 0) {
    await connectDB();
  }

  // Clear existing collections safely
  await Promise.all([
    User.deleteMany({}),
    Outlet.deleteMany({}),
    Category.deleteMany({}),
    Manufacturer.deleteMany({}),
    Product.deleteMany({}),
    InventoryBatch.deleteMany({}),
    StockMovement.deleteMany({}),
    Supplier.deleteMany({}),
    Customer.deleteMany({}),
    PurchaseInvoice.deleteMany({}),
    SalesInvoice.deleteMany({}),
    Payment.deleteMany({}),
    Expense.deleteMany({}),
    Notification.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);
  console.log('[Seed] Cleared existing records.');

  // 1. Create Outlets
  const mainOutlet = await Outlet.create({
    name: 'HomeBooks Central Pharmacy',
    code: 'HB-01',
    address: 'Shop #12, Ground Floor, Indiranagar 100ft Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560038',
    phone: '+91 98450 12345',
    email: 'indiranagar@homebooks.pharmacy',
    drugLicenseNumber: 'KA-B1-2026-098231',
    gstin: '29AABCU9603R1ZM',
    isMain: true,
  });

  const branchOutlet = await Outlet.create({
    name: 'HomeBooks Koramangala Store',
    code: 'HB-02',
    address: '80 Feet Rd, 4th Block, Koramangala',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560034',
    phone: '+91 98450 67890',
    email: 'koramangala@homebooks.pharmacy',
    drugLicenseNumber: 'KA-B2-2026-045182',
    gstin: '29AABCU9603R1ZM',
    isMain: false,
  });

  // 2. Create Super Admin User (Only Super Admin account permitted)
  const password = 'Password@123';
  const superAdmin = await User.create({
    name: 'Super Admin',
    email: 'admin@homebooks.com',
    password,
    role: 'Super Admin',
    phone: '+91 98451 00001',
    outlets: [mainOutlet._id, branchOutlet._id],
  });

  // 3. Create Categories
  const categories = await Category.insertMany([
    { name: 'Antibiotics & Anti-Infectives', description: 'Bacterial and viral infection medications' },
    { name: 'Analgesics & Antipyretics', description: 'Pain relief and fever reducers' },
    { name: 'Gastrointestinal & Antacids', description: 'Acidity, GERD, and stomach care' },
    { name: 'Cardiovascular & Antihypertensive', description: 'Blood pressure and cardiac medications' },
    { name: 'Antidiabetic Agents', description: 'Blood glucose regulating therapies' },
    { name: 'Respiratory & Antiallergic', description: 'Cough, asthma, and antihistamines' },
    { name: 'Vitamins & Minerals', description: 'Nutritional wellness supplements' },
  ]);
  const catMap = {};
  categories.forEach((c) => (catMap[c.name] = c._id));

  // 4. Create Manufacturers
  const manufacturers = await Manufacturer.insertMany([
    { name: 'Cipla Ltd', shortName: 'Cipla', contactEmail: 'info@cipla.com' },
    { name: 'Sun Pharmaceutical Industries Ltd', shortName: 'Sun Pharma', contactEmail: 'contact@sunpharma.com' },
    { name: "Dr. Reddy's Laboratories", shortName: "Dr. Reddy's", contactEmail: 'support@drreddys.com' },
    { name: 'Torrent Pharmaceuticals', shortName: 'Torrent', contactEmail: 'care@torrentpharma.com' },
    { name: 'Abbott India Ltd', shortName: 'Abbott', contactEmail: 'care@abbott.co.in' },
    { name: 'GlaxoSmithKline Pharmaceuticals', shortName: 'GSK', contactEmail: 'care@gsk.com' },
  ]);
  const mfgMap = {};
  manufacturers.forEach((m) => (mfgMap[m.shortName] = m._id));

  // 5. Create Suppliers
  const suppliers = await Supplier.insertMany([
    {
      companyName: 'MedLife Wholesale Pharma Distributors',
      contactPerson: 'Suresh Singhania',
      phone: '+91 98440 22334',
      email: 'orders@medlifewholesale.in',
      address: '24, APMC Market Yard, Yeshwanthpur',
      city: 'Bengaluru',
      gstin: '29AABCM1122D1Z9',
      paymentTerms: '30 Days Net',
      outstandingBalance: 45000,
    },
    {
      companyName: 'Apollo Regional Distribution Depot',
      contactPerson: 'Kavita Menon',
      phone: '+91 98440 55667',
      email: 'logistics@apollodepot.in',
      address: 'Plot 88, Peenya Industrial Area 2nd Stage',
      city: 'Bengaluru',
      gstin: '29AAACA9988E1Z4',
      paymentTerms: '15 Days Net',
      outstandingBalance: 18500,
    },
    {
      companyName: 'Karnataka Healthcare Pharma Agency',
      contactPerson: 'Mohammed Farooq',
      phone: '+91 98440 88990',
      email: 'sales@karnatakahc.com',
      address: '5th Main, Gandhinagar',
      city: 'Bengaluru',
      gstin: '29AAAGK4433F1Z1',
      paymentTerms: 'Immediate',
      outstandingBalance: 0,
    },
  ]);

  // 6. Create Customers
  const customers = await Customer.insertMany([
    {
      name: 'Anil Kumar K',
      phone: '9845011223',
      email: 'anil.kumar@gmail.com',
      address: '#42, 6th Cross, Indiranagar',
      doctorName: 'Dr. C.N. Manjunath (Cardiologist)',
      loyaltyPoints: 140,
      outstandingBalance: 850,
      chronicConditions: ['Hypertension', 'High Cholesterol'],
      refillReminders: [],
    },
    {
      name: 'Sunita Rao',
      phone: '9845022334',
      email: 'sunita.rao@outlook.com',
      address: '#108, Diamond District, HAL Airport Rd',
      doctorName: 'Dr. Mohan V. (Endocrinologist)',
      loyaltyPoints: 210,
      outstandingBalance: 0,
      chronicConditions: ['Type-2 Diabetes'],
      refillReminders: [],
    },
  ]);

  // 7. Create Products
  const products = await Product.insertMany([
    {
      name: 'Calpol 650 Tablet',
      brand: 'Calpol',
      genericName: 'Paracetamol 650mg',
      sku: 'MED-CALPOL-650',
      barcode: '8901030010011',
      hsnCode: '30049060',
      category: catMap['Analgesics & Antipyretics'],
      manufacturer: mfgMap['GSK'],
      dosageForm: 'Tablet',
      strength: '650mg',
      packSize: '15 Tablets / Strip',
      uom: 'Strip',
      purchasePrice: 22.5,
      sellingPrice: 30.5,
      mrp: 33.0,
      gstRate: 12,
      minStockLevel: 20,
      reorderQuantity: 100,
      scheduleType: 'OTC',
      status: 'Active',
    },
    {
      name: 'Dolo 650 Tablet',
      brand: 'Dolo',
      genericName: 'Paracetamol 650mg',
      sku: 'MED-DOLO-650',
      barcode: '8901030010028',
      hsnCode: '30049060',
      category: catMap['Analgesics & Antipyretics'],
      manufacturer: mfgMap['Cipla'],
      dosageForm: 'Tablet',
      strength: '650mg',
      packSize: '15 Tablets / Strip',
      uom: 'Strip',
      purchasePrice: 21.0,
      sellingPrice: 29.0,
      mrp: 31.5,
      gstRate: 12,
      minStockLevel: 25,
      reorderQuantity: 120,
      scheduleType: 'OTC',
      status: 'Active',
    },
    {
      name: 'Augmentin 625 Duo Tablet',
      brand: 'Augmentin',
      genericName: 'Amoxicillin 500mg + Clavulanic Acid 125mg',
      sku: 'MED-AUG-625',
      barcode: '8901030010035',
      hsnCode: '30041090',
      category: catMap['Antibiotics & Anti-Infectives'],
      manufacturer: mfgMap['GSK'],
      dosageForm: 'Tablet',
      strength: '625mg',
      packSize: '10 Tablets / Strip',
      uom: 'Strip',
      purchasePrice: 155.0,
      sellingPrice: 195.0,
      mrp: 205.5,
      gstRate: 12,
      minStockLevel: 15,
      reorderQuantity: 50,
      isPrescriptionRequired: true,
      scheduleType: 'Schedule H1',
      status: 'Active',
    },
    {
      name: 'Pan-D Capsule',
      brand: 'Pan-D',
      genericName: 'Pantoprazole 40mg + Domperidone 30mg',
      sku: 'MED-PAN-D',
      barcode: '8901030010042',
      hsnCode: '30049099',
      category: catMap['Gastrointestinal & Antacids'],
      manufacturer: mfgMap['Sun Pharma'],
      dosageForm: 'Capsule',
      strength: '40mg/30mg',
      packSize: '15 Capsules / Strip',
      uom: 'Strip',
      purchasePrice: 145.0,
      sellingPrice: 185.0,
      mrp: 199.0,
      gstRate: 12,
      minStockLevel: 20,
      reorderQuantity: 80,
      isPrescriptionRequired: true,
      scheduleType: 'Schedule H',
      status: 'Active',
    },
    {
      name: 'Telma 40 Tablet',
      brand: 'Telma',
      genericName: 'Telmisartan 40mg',
      sku: 'MED-TELMA-40',
      barcode: '8901030010059',
      hsnCode: '30049099',
      category: catMap['Cardiovascular & Antihypertensive'],
      manufacturer: mfgMap['Torrent'],
      dosageForm: 'Tablet',
      strength: '40mg',
      packSize: '15 Tablets / Strip',
      uom: 'Strip',
      purchasePrice: 160.0,
      sellingPrice: 210.0,
      mrp: 225.0,
      gstRate: 12,
      minStockLevel: 15,
      reorderQuantity: 60,
      isPrescriptionRequired: true,
      scheduleType: 'Schedule H',
      status: 'Active',
    },
  ]);

  const pMap = {};
  products.forEach((p) => (pMap[p.sku] = p));

  // 8. Create Batches
  const now = new Date();
  const datePlusDays = (days) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return d;
  };

  const batches = await InventoryBatch.insertMany([
    {
      product: pMap['MED-CALPOL-650']._id,
      batchNumber: 'CALP-24A',
      mfgDate: datePlusDays(-300),
      expiryDate: datePlusDays(25), // Near Expiry
      supplier: suppliers[0]._id,
      purchaseCost: 22.5,
      mrp: 33.0,
      sellingPrice: 30.5,
      quantityReceived: 50,
      availableQuantity: 18,
      outlet: mainOutlet._id,
      locationRack: 'Rack A-01',
    },
    {
      product: pMap['MED-CALPOL-650']._id,
      batchNumber: 'CALP-25B',
      mfgDate: datePlusDays(-60),
      expiryDate: datePlusDays(500), // Healthy
      supplier: suppliers[0]._id,
      purchaseCost: 22.5,
      mrp: 33.0,
      sellingPrice: 30.5,
      quantityReceived: 100,
      availableQuantity: 95,
      outlet: mainOutlet._id,
      locationRack: 'Rack A-01',
    },
    {
      product: pMap['MED-DOLO-650']._id,
      batchNumber: 'DOLO-899',
      mfgDate: datePlusDays(-90),
      expiryDate: datePlusDays(450),
      supplier: suppliers[1]._id,
      purchaseCost: 21.0,
      mrp: 31.5,
      sellingPrice: 29.0,
      quantityReceived: 150,
      availableQuantity: 140,
      outlet: mainOutlet._id,
      locationRack: 'Rack A-02',
    },
    {
      product: pMap['MED-AUG-625']._id,
      batchNumber: 'AUG-991',
      mfgDate: datePlusDays(-180),
      expiryDate: datePlusDays(320),
      supplier: suppliers[1]._id,
      purchaseCost: 155.0,
      mrp: 205.5,
      sellingPrice: 195.0,
      quantityReceived: 40,
      availableQuantity: 32,
      outlet: mainOutlet._id,
      locationRack: 'Rack B-04',
    },
    {
      product: pMap['MED-AUG-625']._id,
      batchNumber: 'AUG-810-EXP',
      mfgDate: datePlusDays(-700),
      expiryDate: datePlusDays(-15), // EXPIRED!
      supplier: suppliers[1]._id,
      purchaseCost: 150.0,
      mrp: 200.0,
      sellingPrice: 190.0,
      quantityReceived: 20,
      availableQuantity: 5,
      outlet: mainOutlet._id,
      status: 'Expired',
      locationRack: 'Quarantine-Q1',
    },
  ]);

  // 9. Sample Sales Invoice
  const sampleSale = await SalesInvoice.create({
    invoiceNumber: 'INV-20261024-00001',
    customer: customers[0]._id,
    customerName: customers[0].name,
    customerPhone: customers[0].phone,
    doctorName: 'Dr. C.N. Manjunath',
    prescriptionNumber: 'RX-9912',
    outlet: mainOutlet._id,
    items: [
      {
        product: pMap['MED-CALPOL-650']._id,
        productName: 'Calpol 650 Tablet',
        genericName: 'Paracetamol 650mg',
        hsnCode: '30049060',
        batch: batches[0]._id,
        batchNumber: 'CALP-24A',
        expiryDate: batches[0].expiryDate,
        quantity: 1,
        unitPrice: 30.5,
        mrp: 33.0,
        discountPercent: 0,
        discountAmount: 0,
        gstRate: 12,
        taxableAmount: 30.5,
        taxAmount: 3.66,
        totalAmount: 34.16,
      },
    ],
    subtotal: 30.5,
    totalDiscount: 0,
    taxableTotal: 30.5,
    cgstTotal: 1.83,
    sgstTotal: 1.83,
    totalTax: 3.66,
    roundOff: -0.16,
    grandTotal: 34.0,
    paymentMethod: 'Cash',
    paymentBreakdown: { cash: 34.0 },
    paymentStatus: 'Paid',
    cashier: superAdmin._id,
  });

  console.log('[Seed] HomeBooks seed data successfully injected!');

  if (disconnectWhenDone) {
    await disconnectDB();
  }
};

if (process.argv[1]?.endsWith('seed.js')) {
  seedData(true)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Seed] Error seeding database:', err);
      process.exit(1);
    });
}
