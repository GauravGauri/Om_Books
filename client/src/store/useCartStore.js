import { create } from 'zustand';

export const useCartStore = create((set, get) => ({
  items: [],
  customer: null,
  doctorName: '',
  prescriptionNumber: '',
  paymentMethod: 'Cash',
  paymentBreakdown: { cash: 0, upi: 0, card: 0, credit: 0 },
  customDiscountPercent: 0,

  addItem: (productOrItem, batch, quantity = 1, options = {}) => {
    let rawItem = {};
    if (batch) {
      rawItem = {
        productId: productOrItem._id || productOrItem.productId,
        productName: productOrItem.name || productOrItem.productName,
        genericName: productOrItem.genericName,
        hsnCode: productOrItem.hsnCode || '3004',
        dosageForm: productOrItem.dosageForm || 'Tablet',
        uom: productOrItem.uom || 'Strip',
        packSize: productOrItem.packSize || productOrItem.uom || '1x10',
        unitsPerPack: Number(productOrItem.unitsPerPack || 10),
        allowLooseSale: productOrItem.allowLooseSale !== undefined ? productOrItem.allowLooseSale : true,
        looseUnitName: productOrItem.looseUnitName || (productOrItem.dosageForm === 'Capsule' ? 'Cap' : productOrItem.dosageForm === 'Respule' ? 'Respule' : 'Tab'),
        batchId: batch._id || batch.batchId,
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        availableQuantity: batch.availableQuantity != null ? batch.availableQuantity : Infinity,
        packPrice: batch.sellingPrice != null ? batch.sellingPrice : (productOrItem.sellingPrice || 0),
        packMrp: batch.mrp != null ? batch.mrp : (productOrItem.mrp || 0),
        gstRate: productOrItem.gstRate || 12,
        discountPercent: 0,
        ...options,
      };
    } else {
      const payload = productOrItem;
      rawItem = {
        productId: payload.productId || payload._id,
        productName: payload.productName || payload.name,
        genericName: payload.genericName,
        hsnCode: payload.hsnCode || '3004',
        dosageForm: payload.dosageForm || 'Tablet',
        uom: payload.uom || payload.packSize || 'Strip',
        packSize: payload.packSize || payload.uom || '1x10',
        unitsPerPack: Number(payload.unitsPerPack || 10),
        allowLooseSale: payload.allowLooseSale !== undefined ? payload.allowLooseSale : true,
        looseUnitName: payload.looseUnitName || (payload.dosageForm === 'Capsule' ? 'Cap' : payload.dosageForm === 'Respule' ? 'Respule' : 'Tab'),
        batchId: payload.batchId || payload.batch?._id,
        batchNumber: payload.batchNumber || payload.batch?.batchNumber || 'DEFAULT',
        expiryDate: payload.expiryDate || payload.batch?.expiryDate,
        availableQuantity: payload.availableQuantity != null ? payload.availableQuantity : (payload.batch?.availableQuantity ?? Infinity),
        packPrice: payload.packPrice != null ? payload.packPrice : (payload.sellingPrice || payload.unitPrice || 0),
        packMrp: payload.packMrp != null ? payload.packMrp : (payload.mrp || 0),
        gstRate: payload.gstRate != null ? payload.gstRate : 12,
        discountPercent: payload.discountPercent || 0,
        ...options,
      };
    }

    const isLoose = Boolean(rawItem.isLoose);
    const unitsPerPack = Math.max(1, Number(rawItem.unitsPerPack || 10));
    const looseUnitName = rawItem.looseUnitName || (rawItem.dosageForm === 'Capsule' ? 'Cap' : rawItem.dosageForm === 'Respule' ? 'Respule' : 'Tab');

    let looseQty = 0;
    let packQty = 0;
    let unitPrice = 0;
    let mrp = 0;

    if (isLoose) {
      looseQty = Number(rawItem.looseQuantity || quantity || 1);
      packQty = Math.round((looseQty / unitsPerPack) * 10000) / 10000;
      unitPrice = Math.round((rawItem.packPrice / unitsPerPack) * 100) / 100;
      mrp = Math.round((rawItem.packMrp / unitsPerPack) * 100) / 100;
    } else {
      packQty = Number(rawItem.quantity || quantity || 1);
      looseQty = Math.round(packQty * unitsPerPack);
      unitPrice = rawItem.packPrice;
      mrp = rawItem.packMrp;
    }

    const item = {
      ...rawItem,
      id: `${rawItem.batchId}-${isLoose ? 'loose' : 'pack'}`,
      isLoose,
      unitsPerPack,
      looseUnitName,
      unitType: isLoose ? looseUnitName : (rawItem.uom || 'Strip'),
      looseQuantity: looseQty,
      quantity: packQty,
      unitPrice,
      mrp,
    };

    const { items } = get();
    const existingIndex = items.findIndex((i) => i.id === item.id);
    const avail = item.availableQuantity != null ? item.availableQuantity : Infinity;

    if (existingIndex > -1) {
      const existing = items[existingIndex];
      let newPackQty = 0;
      let newLooseQty = 0;

      if (isLoose) {
        newLooseQty = existing.looseQuantity + looseQty;
        newPackQty = Math.round((newLooseQty / unitsPerPack) * 10000) / 10000;
      } else {
        newPackQty = existing.quantity + packQty;
        newLooseQty = Math.round(newPackQty * unitsPerPack);
      }

      if (newPackQty > avail) {
        throw new Error(
          `Cannot add more than available stock (${avail} packs / ${Math.floor(avail * unitsPerPack)} ${looseUnitName}) for batch ${item.batchNumber}`
        );
      }

      const updatedItems = [...items];
      updatedItems[existingIndex] = {
        ...existing,
        quantity: newPackQty,
        looseQuantity: newLooseQty,
      };
      set({ items: updatedItems });
    } else {
      if (packQty > avail) {
        throw new Error(
          `Cannot add more than available stock (${avail} packs / ${Math.floor(avail * unitsPerPack)} ${looseUnitName}) for batch ${item.batchNumber}`
        );
      }
      set({ items: [...items, item] });
    }
  },

  updateQuantity: (itemId, quantity) => {
    const { items } = get();
    if (quantity <= 0) {
      get().removeItem(itemId);
      return;
    }
    const updated = items.map((it) => {
      if (it.id === itemId || it.batchId === itemId) {
        const unitsPerPack = Math.max(1, it.unitsPerPack || 1);
        let newPackQty = 0;
        let newLooseQty = 0;

        if (it.isLoose) {
          // If loose, quantity passed is number of tablets
          newLooseQty = quantity;
          newPackQty = Math.round((newLooseQty / unitsPerPack) * 10000) / 10000;
        } else {
          // If full pack, quantity passed is number of packs
          newPackQty = quantity;
          newLooseQty = Math.round(newPackQty * unitsPerPack);
        }

        if (newPackQty > it.availableQuantity) {
          throw new Error(
            `Only ${it.availableQuantity} packs (${Math.floor(it.availableQuantity * unitsPerPack)} ${it.looseUnitName || 'tabs'}) available in stock.`
          );
        }
        return {
          ...it,
          quantity: newPackQty,
          looseQuantity: newLooseQty,
        };
      }
      return it;
    });
    set({ items: updated });
  },

  toggleLooseMode: (itemId) => {
    const { items } = get();
    const updated = items.map((it) => {
      if (it.id === itemId || it.batchId === itemId) {
        const willBeLoose = !it.isLoose;
        const unitsPerPack = Math.max(1, it.unitsPerPack || 10);
        const looseUnitName = it.looseUnitName || (it.dosageForm === 'Capsule' ? 'Cap' : it.dosageForm === 'Respule' ? 'Respule' : 'Tab');

        let newPackQty = 0;
        let newLooseQty = 0;
        let newUnitPrice = 0;
        let newMrp = 0;

        if (willBeLoose) {
          // Switching from pack to loose: start with 1 loose tab or equivalent
          newLooseQty = Math.max(1, Math.min(unitsPerPack, Math.round(it.quantity * unitsPerPack)));
          newPackQty = Math.round((newLooseQty / unitsPerPack) * 10000) / 10000;
          newUnitPrice = Math.round((it.packPrice / unitsPerPack) * 100) / 100;
          newMrp = Math.round((it.packMrp / unitsPerPack) * 100) / 100;
        } else {
          // Switching from loose to full pack
          newPackQty = Math.max(1, Math.ceil(it.looseQuantity / unitsPerPack));
          newLooseQty = Math.round(newPackQty * unitsPerPack);
          newUnitPrice = it.packPrice;
          newMrp = it.packMrp;
        }

        return {
          ...it,
          id: `${it.batchId}-${willBeLoose ? 'loose' : 'pack'}`,
          isLoose: willBeLoose,
          unitType: willBeLoose ? looseUnitName : (it.uom || 'Strip'),
          quantity: newPackQty,
          looseQuantity: newLooseQty,
          unitPrice: newUnitPrice,
          mrp: newMrp,
        };
      }
      return it;
    });
    set({ items: updated });
  },

  updateItemDiscount: (itemId, discountPercent) => {
    const { items } = get();
    const updated = items.map((it) =>
      it.id === itemId || it.batchId === itemId
        ? { ...it, discountPercent: Math.min(100, Math.max(0, discountPercent)) }
        : it
    );
    set({ items: updated });
  },

  removeItem: (itemId) => {
    set({ items: get().items.filter((it) => it.id !== itemId && it.batchId !== itemId) });
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
      const gross = item.isLoose
        ? (item.looseQuantity || 0) * (item.unitPrice || 0)
        : (item.quantity || 0) * (item.unitPrice || 0);

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
      itemCount: items.length,
    };
  },
}));
