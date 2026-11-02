import { create } from 'zustand';

export const useCartStore = create((set, get) => ({
  items: [],
  customer: null,
  doctorName: '',
  prescriptionNumber: '',
  paymentMethod: 'Cash',
  paymentBreakdown: { cash: 0, upi: 0, card: 0, credit: 0 },
  customDiscountPercent: 0,

  addItem: (productOrItem, batch, quantity = 1) => {
    let item;
    if (batch) {
      // Called with (product, batch, quantity)
      item = {
        productId: productOrItem._id || productOrItem.productId,
        productName: productOrItem.name || productOrItem.productName,
        genericName: productOrItem.genericName,
        hsnCode: productOrItem.hsnCode || '3004',
        uom: productOrItem.uom || 'Strip',
        packSize: productOrItem.packSize || productOrItem.uom || 'Strip',
        batchId: batch._id || batch.batchId,
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        availableQuantity: batch.availableQuantity != null ? batch.availableQuantity : Infinity,
        unitPrice: batch.sellingPrice != null ? batch.sellingPrice : (productOrItem.sellingPrice || 0),
        mrp: batch.mrp != null ? batch.mrp : (productOrItem.mrp || 0),
        gstRate: productOrItem.gstRate || 12,
        discountPercent: 0,
        quantity: quantity || 1,
      };
    } else {
      // Called with single item object
      const payload = productOrItem;
      item = {
        productId: payload.productId || payload._id,
        productName: payload.productName || payload.name,
        genericName: payload.genericName,
        hsnCode: payload.hsnCode || '3004',
        uom: payload.uom || payload.packSize || 'Strip',
        packSize: payload.packSize || payload.uom || 'Strip',
        batchId: payload.batchId || payload.batch?._id,
        batchNumber: payload.batchNumber || payload.batch?.batchNumber || 'DEFAULT',
        expiryDate: payload.expiryDate || payload.batch?.expiryDate,
        availableQuantity: payload.availableQuantity != null ? payload.availableQuantity : (payload.batch?.availableQuantity ?? Infinity),
        unitPrice: payload.unitPrice != null ? payload.unitPrice : (payload.sellingPrice || 0),
        mrp: payload.mrp != null ? payload.mrp : (payload.unitPrice || 0),
        gstRate: payload.gstRate != null ? payload.gstRate : 12,
        discountPercent: payload.discountPercent || 0,
        quantity: payload.quantity || 1,
      };
    }

    const { items } = get();
    const existingIndex = items.findIndex((i) => i.batchId === item.batchId);
    const avail = item.availableQuantity != null ? item.availableQuantity : Infinity;

    if (existingIndex > -1) {
      const existing = items[existingIndex];
      const newQty = existing.quantity + item.quantity;
      if (newQty > avail) {
        throw new Error(`Cannot add more than available stock (${avail}) for batch ${item.batchNumber}`);
      }
      const updatedItems = [...items];
      updatedItems[existingIndex] = {
        ...existing,
        quantity: newQty,
      };
      set({ items: updatedItems });
    } else {
      if (item.quantity > avail) {
        throw new Error(`Cannot add more than available stock (${avail}) for batch ${item.batchNumber}`);
      }
      set({ items: [...items, item] });
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