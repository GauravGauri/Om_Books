import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { connectDB, disconnectDB } from '../../src/config/db.js';
import { seedData } from '../../src/utils/seed.js';
import { InventoryBatch } from '../../src/models/index.js';

describe('HomeBooks Pharmacy ERP API Integration Tests', () => {
  let authToken = '';
  let outletId = '';

  beforeAll(async () => {
    await connectDB();
    await seedData(false);
  }, 30000);

  afterAll(async () => {
    await disconnectDB();
  });

  it('Health Check returns healthy status', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toContain('HomeBooks');
  });

  it('Rejects unauthenticated access to protected routes', async () => {
    const res = await request(app).get('/api/v1/products');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('Rejects login with invalid credentials', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'pharmacist@homebooks.com',
      password: 'WrongPassword!',
    });
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  it('Authenticates pharmacist successfully with valid credentials', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'pharmacist@homebooks.com',
      password: 'Password@123',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('Pharmacist');

    authToken = res.body.data.token;
    outletId = res.body.data.user.outlets[0]._id;
  });

  it('Returns authenticated user profile via /auth/me', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('pharmacist@homebooks.com');
  });

  it('Retrieves medicine catalog with active stock counts', async () => {
    const res = await request(app)
      .get('/api/v1/products')
      .query({ outletId })
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.products.length).toBeGreaterThan(0);

    const calpol = res.body.products.find((p) => p.sku === 'MED-CALPOL-650');
    expect(calpol).toBeDefined();
    expect(calpol.currentStock).toBeGreaterThan(0);
  });

  it('Finds alternative brand substitutes matching generic salt composition', async () => {
    const res = await request(app)
      .get('/api/v1/products/substitutes')
      .query({ genericName: 'Paracetamol 650mg' })
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('Performs atomic POS checkout and decrements batch stock', async () => {
    const batch = await InventoryBatch.findOne({ batchNumber: 'DOLO-899' });
    expect(batch).toBeDefined();
    const initialQty = batch.availableQuantity;

    const checkoutPayload = {
      outlet: outletId,
      customerName: 'Test Patient',
      customerPhone: '9988776655',
      items: [
        {
          productId: batch.product,
          batchId: batch._id,
          quantity: 2,
          unitPrice: batch.sellingPrice,
          gstRate: 12,
        },
      ],
      paymentMethod: 'Cash',
    };

    const res = await request(app)
      .post('/api/v1/pos/checkout')
      .set('Authorization', `Bearer ${authToken}`)
      .send(checkoutPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.invoiceNumber).toMatch(/^INV-/);

    const updatedBatch = await InventoryBatch.findById(batch._id);
    expect(updatedBatch.availableQuantity).toBe(initialQty - 2);
  });

  it('Prevents sale of expired batches', async () => {
    const expiredBatch = await InventoryBatch.findOne({ batchNumber: 'AUG-810-EXP' });
    expect(expiredBatch).toBeDefined();

    const payload = {
      outlet: outletId,
      customerName: 'Test Patient',
      items: [
        {
          productId: expiredBatch.product,
          batchId: expiredBatch._id,
          quantity: 1,
          unitPrice: 190,
          gstRate: 12,
        },
      ],
      paymentMethod: 'Cash',
    };

    const res = await request(app)
      .post('/api/v1/pos/checkout')
      .set('Authorization', `Bearer ${authToken}`)
      .send(payload);

    expect(res.status).toBe(500);
    expect(res.body.message).toContain('Expired medicines cannot be sold');
  });

  it('Calculates real-time Dashboard KPIs accurately from MongoDB records', async () => {
    const res = await request(app)
      .get('/api/v1/reports/dashboard')
      .query({ outletId })
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.todaySalesTotal).toBeGreaterThan(0);
    expect(res.body.data.inventoryValuation).toBeGreaterThan(0);
    expect(res.body.data.expiredCount).toBeGreaterThan(0);
  });
});
