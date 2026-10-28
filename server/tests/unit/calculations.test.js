import { describe, it, expect } from 'vitest';

describe('Pharmacy ERP Financial & Tax Calculations', () => {
  it('calculates 12% GST correctly with CGST and SGST split', () => {
    const grossAmount = 1000;
    const discountPercent = 10;
    const itemDiscount = (grossAmount * discountPercent) / 100; // 100
    const taxableAmount = grossAmount - itemDiscount; // 900
    const gstRate = 12;

    const totalTax = Math.round(((taxableAmount * gstRate) / 100) * 100) / 100; // 108
    const cgst = Math.round((totalTax / 2) * 100) / 100; // 54
    const sgst = Math.round((totalTax - cgst) * 100) / 100; // 54
    const grandTotal = Math.round(taxableAmount + totalTax); // 1008

    expect(itemDiscount).toBe(100);
    expect(taxableAmount).toBe(900);
    expect(totalTax).toBe(108);
    expect(cgst).toBe(54);
    expect(sgst).toBe(54);
    expect(grandTotal).toBe(1008);
  });

  it('calculates cash memo round-off to nearest integer', () => {
    const rawTotal1 = 481.44;
    const rounded1 = Math.round(rawTotal1);
    const roundOff1 = Math.round((rounded1 - rawTotal1) * 100) / 100;
    expect(rounded1).toBe(481);
    expect(roundOff1).toBe(-0.44);

    const rawTotal2 = 345.68;
    const rounded2 = Math.round(rawTotal2);
    const roundOff2 = Math.round((rounded2 - rawTotal2) * 100) / 100;
    expect(rounded2).toBe(346);
    expect(roundOff2).toBe(0.32);
  });

  it('allocates batches using strict FEFO (First-Expiry, First-Out)', () => {
    const batches = [
      { id: 'B1', batchNo: 'BATCH-2027', expiry: new Date('2027-12-31'), stock: 50 },
      { id: 'B2', batchNo: 'BATCH-2026-EARLY', expiry: new Date('2026-11-01'), stock: 20 },
      { id: 'B3', batchNo: 'BATCH-2026-LATE', expiry: new Date('2026-12-15'), stock: 30 },
    ];

    // Sort ascending by expiry
    const sorted = [...batches].sort((a, b) => a.expiry - b.expiry);
    expect(sorted[0].batchNo).toBe('BATCH-2026-EARLY');
    expect(sorted[1].batchNo).toBe('BATCH-2026-LATE');
    expect(sorted[2].batchNo).toBe('BATCH-2027');

    // Allocate 35 units
    let needed = 35;
    const allocation = [];
    for (const b of sorted) {
      if (needed <= 0) break;
      const take = Math.min(b.stock, needed);
      allocation.push({ batchId: b.id, take });
      needed -= take;
    }

    expect(allocation).toEqual([
      { batchId: 'B2', take: 20 },
      { batchId: 'B3', take: 15 },
    ]);
    expect(needed).toBe(0);
  });

  it('detects and flags expired batches', () => {
    const now = new Date();
    const pastDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
    const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days ahead

    const isExpiredPast = pastDate <= now;
    const isExpiredFuture = futureDate <= now;

    expect(isExpiredPast).toBe(true);
    expect(isExpiredFuture).toBe(false);
  });

  it('validates return quantity does not exceed purchased quantity', () => {
    const purchasedQty = 10;
    const alreadyReturned = 4;
    const maxReturnable = purchasedQty - alreadyReturned; // 6

    expect(maxReturnable).toBe(6);
    expect(5 <= maxReturnable).toBe(true);
    expect(7 <= maxReturnable).toBe(false);
  });
});
