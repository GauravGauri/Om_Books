import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from '../store/useCartStore';

describe('POS Cart Zustand Store', () => {
  beforeEach(() => {
    useCartStore.getState().clearCart();
  });

  it('initializes with empty items and default payment method', () => {
    const state = useCartStore.getState();
    expect(state.items).toHaveLength(0);
    expect(state.paymentMethod).toBe('Cash');
  });

  it('adds item to cart and calculates subtotal and taxes', () => {
    const sampleProduct = {
      _id: 'prod-123',
      name: 'Calpol 650',
      genericName: 'Paracetamol 650mg',
      hsnCode: '3004',
      gstRate: 12,
      uom: 'Strip',
    };

    const sampleBatch = {
      _id: 'batch-456',
      batchNumber: 'CALP-01',
      expiryDate: new Date('2027-01-01'),
      availableQuantity: 50,
      sellingPrice: 30,
      mrp: 33,
    };

    useCartStore.getState().addItem(sampleProduct, sampleBatch, 2);

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0].quantity).toBe(2);

    const totals = state.getTotals();
    expect(totals.subtotal).toBe(60); // 30 * 2
    expect(totals.taxableTotal).toBe(60);
    expect(totals.totalTax).toBe(7.2); // 12% of 60
    expect(totals.grandTotal).toBe(67); // 67.2 rounded to 67
  });

  it('prevents adding quantity exceeding batch available stock', () => {
    const sampleProduct = { _id: 'prod-1', name: 'Test Drug', gstRate: 12 };
    const sampleBatch = { _id: 'batch-1', batchNumber: 'B1', availableQuantity: 5, sellingPrice: 50 };

    expect(() => {
      useCartStore.getState().addItem(sampleProduct, sampleBatch, 10);
    }).toThrow(/Cannot add more than available stock/);
  });
});
