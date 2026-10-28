import {
  SalesInvoice,
  PurchaseInvoice,
  InventoryBatch,
  Product,
  Customer,
  Supplier,
  Expense,
  SalesReturn,
} from '../models/index.js';

export const getDashboardKPIs = async (outletId) => {
  const now = new Date();
  const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));
  const endOfToday = new Date(new Date().setHours(23, 59, 59, 999));

  const filterToday = {
    ...(outletId && { outlet: outletId }),
    createdAt: { $gte: startOfToday, $lte: endOfToday },
    status: { $ne: 'Cancelled' },
  };

  // Today's Sales
  const todaySales = await SalesInvoice.find(filterToday).lean();
  const todaySalesTotal = todaySales.reduce((acc, s) => acc + (s.status !== 'Fully Returned' ? s.grandTotal : 0), 0);
  const todayBillsCount = todaySales.length;

  // Month Sales
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthSales = await SalesInvoice.find({
    ...(outletId && { outlet: outletId }),
    createdAt: { $gte: startOfMonth },
    status: { $ne: 'Cancelled' },
  }).lean();
  const monthSalesTotal = monthSales.reduce((acc, s) => acc + (s.status !== 'Fully Returned' ? s.grandTotal : 0), 0);

  // Inventory valuation & Batch alerts
  const allBatches = await InventoryBatch.find({
    ...(outletId && { outlet: outletId }),
    availableQuantity: { $gt: 0 },
  }).populate('product').lean();

  let totalInventoryCost = 0;
  let totalInventoryMRP = 0;
  let expiredCount = 0;
  let expiredValue = 0;
  let nearExpiryCount = 0;
  let nearExpiryValue = 0;

  const sixtyDaysFromNow = new Date();
  sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);

  const productStockCountMap = {};

  allBatches.forEach((b) => {
    const val = b.availableQuantity * b.purchaseCost;
    const mrpVal = b.availableQuantity * b.mrp;
    const exp = new Date(b.expiryDate);

    totalInventoryCost += val;
    totalInventoryMRP += mrpVal;

    if (exp < now) {
      expiredCount += 1;
      expiredValue += val;
    } else if (exp <= sixtyDaysFromNow) {
      nearExpiryCount += 1;
      nearExpiryValue += val;
    }

    if (b.product) {
      const pid = b.product._id ? b.product._id.toString() : b.product.toString();
      productStockCountMap[pid] = (productStockCountMap[pid] || 0) + b.availableQuantity;
    }
  });

  // Low stock products count
  const allProducts = await Product.find({ status: 'Active' }).lean();
  let lowStockCount = 0;
  allProducts.forEach((p) => {
    const stock = productStockCountMap[p._id.toString()] || 0;
    if (stock <= p.minStockLevel) {
      lowStockCount += 1;
    }
  });

  // Last 7 days sales trend
  const trendDays = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStart = new Date(d.setHours(0, 0, 0, 0));
    const dayEnd = new Date(d.setHours(23, 59, 59, 999));
    const label = dayStart.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    const daySales = await SalesInvoice.find({
      ...(outletId && { outlet: outletId }),
      createdAt: { $gte: dayStart, $lte: dayEnd },
      status: { $ne: 'Cancelled' },
    }).lean();

    const revenue = daySales.reduce((acc, s) => acc + (s.status !== 'Fully Returned' ? s.grandTotal : 0), 0);
    trendDays.push({
      date: label,
      sales: Math.round(revenue),
      orders: daySales.length,
    });
  }

  // Payment Breakdown
  const paymentBreakdown = {
    Cash: 0,
    UPI: 0,
    Card: 0,
    Credit: 0,
  };

  todaySales.forEach((s) => {
    if (s.paymentBreakdown) {
      paymentBreakdown.Cash += s.paymentBreakdown.cash || 0;
      paymentBreakdown.UPI += s.paymentBreakdown.upi || 0;
      paymentBreakdown.Card += s.paymentBreakdown.card || 0;
      paymentBreakdown.Credit += s.paymentBreakdown.credit || 0;
    } else if (paymentBreakdown[s.paymentMethod] !== undefined) {
      paymentBreakdown[s.paymentMethod] += s.grandTotal;
    }
  });

  // Top Selling Medicines (Month)
  const productSaleMap = {};
  monthSales.forEach((s) => {
    s.items.forEach((it) => {
      const name = it.productName;
      if (!productSaleMap[name]) {
        productSaleMap[name] = { name, quantity: 0, revenue: 0 };
      }
      productSaleMap[name].quantity += it.quantity;
      productSaleMap[name].revenue += it.totalAmount;
    });
  });

  const topProducts = Object.values(productSaleMap)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  return {
    todaySalesTotal: Math.round(todaySalesTotal * 100) / 100,
    todayBillsCount,
    monthSalesTotal: Math.round(monthSalesTotal * 100) / 100,
    inventoryValuation: Math.round(totalInventoryCost * 100) / 100,
    inventoryMRPValuation: Math.round(totalInventoryMRP * 100) / 100,
    potentialMargin: Math.round((totalInventoryMRP - totalInventoryCost) * 100) / 100,
    expiredCount,
    expiredValue: Math.round(expiredValue * 100) / 100,
    nearExpiryCount,
    nearExpiryValue: Math.round(nearExpiryValue * 100) / 100,
    lowStockCount,
    salesTrend: trendDays,
    paymentBreakdown,
    topProducts,
  };
};

export const getGstReport = async ({ outletId, startDate, endDate }) => {
  const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
  const end = endDate ? new Date(endDate) : new Date();
  end.setHours(23, 59, 59, 999);

  // Outward Supplies (Sales - GSTR-1)
  const sales = await SalesInvoice.find({
    ...(outletId && { outlet: outletId }),
    createdAt: { $gte: start, $lte: end },
    status: { $ne: 'Cancelled' },
  }).lean();

  const outwardSlabs = {
    '0%': { taxable: 0, cgst: 0, sgst: 0, totalTax: 0 },
    '5%': { taxable: 0, cgst: 0, sgst: 0, totalTax: 0 },
    '12%': { taxable: 0, cgst: 0, sgst: 0, totalTax: 0 },
    '18%': { taxable: 0, cgst: 0, sgst: 0, totalTax: 0 },
  };

  sales.forEach((s) => {
    s.items.forEach((it) => {
      const slab = `${it.gstRate || 12}%`;
      if (!outwardSlabs[slab]) {
        outwardSlabs[slab] = { taxable: 0, cgst: 0, sgst: 0, totalTax: 0 };
      }
      outwardSlabs[slab].taxable += it.taxableAmount || 0;
      const tax = it.taxAmount || 0;
      outwardSlabs[slab].cgst += tax / 2;
      outwardSlabs[slab].sgst += tax / 2;
      outwardSlabs[slab].totalTax += tax;
    });
  });

  // Inward Purchases (ITC - GSTR-2)
  const purchases = await PurchaseInvoice.find({
    ...(outletId && { outlet: outletId }),
    createdAt: { $gte: start, $lte: end },
  }).lean();

  const inwardSlabs = {
    '0%': { taxable: 0, cgst: 0, sgst: 0, totalTax: 0 },
    '5%': { taxable: 0, cgst: 0, sgst: 0, totalTax: 0 },
    '12%': { taxable: 0, cgst: 0, sgst: 0, totalTax: 0 },
    '18%': { taxable: 0, cgst: 0, sgst: 0, totalTax: 0 },
  };

  purchases.forEach((p) => {
    p.items.forEach((it) => {
      const slab = `${it.gstRate || 12}%`;
      if (!inwardSlabs[slab]) {
        inwardSlabs[slab] = { taxable: 0, cgst: 0, sgst: 0, totalTax: 0 };
      }
      const taxable = it.quantity * it.purchasePrice;
      const tax = it.taxAmount || 0;
      inwardSlabs[slab].taxable += taxable;
      inwardSlabs[slab].cgst += tax / 2;
      inwardSlabs[slab].sgst += tax / 2;
      inwardSlabs[slab].totalTax += tax;
    });
  });

  const totalOutputTax = Object.values(outwardSlabs).reduce((acc, v) => acc + v.totalTax, 0);
  const totalInputTaxCredit = Object.values(inwardSlabs).reduce((acc, v) => acc + v.totalTax, 0);
  const netGstPayable = Math.max(0, totalOutputTax - totalInputTaxCredit);

  return {
    period: { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) },
    outwardSupplies: outwardSlabs,
    inwardPurchases: inwardSlabs,
    totalOutputTax: Math.round(totalOutputTax * 100) / 100,
    totalInputTaxCredit: Math.round(totalInputTaxCredit * 100) / 100,
    netGstPayable: Math.round(netGstPayable * 100) / 100,
  };
};

export const getScheduleH1Report = async ({ outletId, startDate, endDate }) => {
  const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
  const end = endDate ? new Date(endDate) : new Date();
  end.setHours(23, 59, 59, 999);

  // Find sales that contain products classified as Schedule H or Schedule H1
  const invoices = await SalesInvoice.find({
    ...(outletId && { outlet: outletId }),
    createdAt: { $gte: start, $lte: end },
    status: { $ne: 'Cancelled' },
  }).lean();

  const h1Records = [];

  for (const inv of invoices) {
    for (const item of inv.items) {
      const product = await Product.findById(item.product).lean();
      if (product && (product.scheduleType === 'Schedule H1' || product.scheduleType === 'Schedule H')) {
        h1Records.push({
          date: inv.createdAt,
          invoiceNumber: inv.invoiceNumber,
          patientName: inv.customerName,
          patientPhone: inv.customerPhone || 'N/A',
          doctorName: inv.doctorName || 'Prescribing Physician',
          prescriptionNumber: inv.prescriptionNumber || 'Rx-Registered',
          medicineName: product.name,
          genericName: product.genericName,
          scheduleType: product.scheduleType,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate,
          quantity: item.quantity,
        });
      }
    }
  }

  return {
    period: { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) },
    recordsCount: h1Records.length,
    records: h1Records,
  };
};

export const getExpiryAuditReport = async (outletId) => {
  const now = new Date();
  const nearDate = new Date();
  nearDate.setDate(nearDate.getDate() + 90);

  const batches = await InventoryBatch.find({
    ...(outletId && { outlet: outletId }),
    availableQuantity: { $gt: 0 },
    expiryDate: { $lte: nearDate },
  })
    .populate('product', 'name genericName sku uom')
    .populate('supplier', 'companyName phone')
    .sort({ expiryDate: 1 })
    .lean();

  const records = batches.map((b) => {
    const exp = new Date(b.expiryDate);
    const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
    return {
      batchId: b._id,
      productName: b.product?.name,
      genericName: b.product?.genericName,
      batchNumber: b.batchNumber,
      expiryDate: b.expiryDate,
      daysRemaining: diffDays,
      status: diffDays <= 0 ? 'EXPIRED' : 'NEAR_EXPIRY',
      quantity: b.availableQuantity,
      purchaseCost: b.purchaseCost,
      totalLossRisk: Math.round(b.availableQuantity * b.purchaseCost * 100) / 100,
      supplierName: b.supplier?.companyName || 'Local Distributor',
      supplierPhone: b.supplier?.phone || '',
    };
  });

  return records;
};
