import { create } from 'zustand';

export const useCartStore = create((set, get) => ({
  items: [],
  customer: null,
  doctorName: '',
  prescriptionNumber: '',
  paymentMethod: 'Cash',
  paymentBreakdown: { cash: 0, upi: 0, card: 0, credit: 0 },
  customDiscountPercent: 0,

  addItem: (product, batch, quantity = 1) => {
    const { items } = get();
    const existingIndex = items.findIndex((i) => i.batchId === batch._id);

    if (existingIndex > -1) {
      const existing = items[existingIndex];
      const newQty = existing.quantity + quantity;
      if (newQty > batch.availableQuantity) {
        throw new Error(
          `Cannot add more than available stock (${batch.availableQuantity}) for batch ${batch.batchNumber}`
        );
      }
      const updatedItems = [...items];
      updatedItems[existingIndex] = {
        ...existing,
        quantity: newQty,
      };
      set({ items: updatedItems });
    } else {
      if (quantity > batch.availableQuantity) {
        throw new Error(
          `Cannot add more than available stock (${batch.availableQuantity}) for batch ${batch.batchNumber}`
        );
      }
      const newItem = {
        productId: product._id,
        productName: product.name,
        genericName: product.genericName,
        hsnCode: product.hsnCode,
        uom: product.uom,
        batchId: batch._id,
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        availableQuantity: batch.availableQuantity,
        unitPrice: batch.sellingPrice,
        mrp: batch.mrp,
        gstRate: product.gstRate || 12,
        discountPercent: 0,
        quantity,
      };
      set({ items: [...items, newItem] });
    }
  },

  updateQuantity: (batchId, quantity) => {
    const { items } = get();
    if (quantity <= 0) {
      get().removeItem(batchId);
      return;
    }
    const updated = items.map((it) => {
      if (it.batchId === batchId) {
        if (quantity > it.availableQuantity) {
          throw new Error(`Only ${it.availableQuantity} units available in stock.`);
        }
        return { ...it, quantity };
      }
      return it;
    });
    set({ items: updated });
  },

  updateItemDiscount: (batchId, discountPercent) => {
    const { items } = get();
    const updated = items.map((it) =>
      it.batchId === batchId ? { ...it, discountPercent: Math.min(100, Math.max(0, discountPercent)) } : it
    );
    set({ items: updated });
  },

  removeItem: (batchId) => {
    set({ items: get().items.filter((it) => it.batchId !== batchId) });
  },

  clearCart: () => {
    set({
      items: [],
      customer: null,
      doctorName: '',
      prescriptionNumber: '',
      paymentMethod: 'Cash',
      paymentBreakdown: { cash: 0, upi: 0, card: 0, credit: 0 },
      customDiscountPercent: 0,
    });
  },

  setCustomer: (customer) => set({ customer }),
  setDoctorName: (doctorName) => set({ doctorName }),
  setPrescriptionNumber: (prescriptionNumber) => set({ prescriptionNumber }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  setPaymentBreakdown: (paymentBreakdown) => set({ paymentBreakdown }),
  setCustomDiscountPercent: (customDiscountPercent) => set({ customDiscountPercent }),

  getTotals: () => {
    const { items, customDiscountPercent } = get();
    let subtotal = 0;
    let totalDiscount = 0;
    let taxableTotal = 0;
    let totalTax = 0;

    items.forEach((item) => {
      const gross = item.unitPrice * item.quantity;
      const discountPct = item.discountPercent || customDiscountPercent || 0;
      const disc = (gross * discountPct) / 100;
      const taxable = gross - disc;
      const tax = (taxable * (item.gstRate || 12)) / 100;

      subtotal += gross;
      totalDiscount += disc;
      taxableTotal += taxable;
      totalTax += tax;
    });

    const rawGrandTotal = taxableTotal + totalTax;
    const grandTotal = Math.round(rawGrandTotal);
    const roundOff = Math.round((grandTotal - rawGrandTotal) * 100) / 100;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      taxableTotal: Math.round(taxableTotal * 100) / 100,
      cgstTotal: Math.round((totalTax / 2) * 100) / 100,
      sgstTotal: Math.round((totalTax / 2) * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      roundOff,
      grandTotal,
      itemCount: items.reduce((acc, it) => acc + it.quantity, 0),
    };
  },
}));
