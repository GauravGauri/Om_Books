import React, { useState, useEffect, useRef } from 'react';
import {
  Truck,
  Plus,
  Search,
  CheckCircle2,
  Calendar,
  Building2,
  FileText,
  AlertCircle,
  Trash2,
  ArrowDownLeft,
  X,
  Package,
  Layers,
  ChevronDown,
  Percent,
} from 'lucide-react';
import apiClient from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { formatCurrency, formatDate } from '../utils/cn';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

const ITEM_TYPES = [
  'Tablet',
  'Capsule',
  'Syrup',
  'Packet',
  'Drops',
  'Injection',
  'Ointment',
  'Gel',
  'Suspension',
  'Inhaler',
  'Powder',
  'Bottle',
  'Vial',
  'Ampoule',
  'Device',
  'Other',
];

const PACKAGING_PRESETS = [
  '1x10 (10 Tablets / Strip)',
  '1x15 (15 Tablets / Strip)',
  '1x10 (10 Capsules / Strip)',
  '1x100ml (100ml Syrup)',
  '1x60ml (60ml Syrup)',
  '1x200ml (200ml Syrup)',
  '1x10ml (10ml Vial)',
  '1x2ml (2ml Ampoule)',
  '1x60 (60 Tablets / Bottle)',
  '1x15g (15g Ointment Tube)',
  '1x20g (20g Gel Tube)',
  '1x15ml (15ml Drops)',
  '1x60ml (60ml Suspension)',
  '1x100 (Box of 100 Units)',
  '1x1 (Pack of 1 Device)',
  'Packet of 500g',
];

export const PurchasesPage = () => {
  const { currentOutlet, user } = useAuthStore();
  const [invoices, setInvoices] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [isLoading, setIsLoading] = useState(true);

  // Inward Goods Modal States
  const [showInwardModal, setShowInwardModal] = useState(false);
  const [purchaseType, setPurchaseType] = useState('Invoice'); // 'Invoice' | 'Delivery Challan'
  const [billHasGst, setBillHasGst] = useState(true);
  const [supplierId, setSupplierId] = useState('');
  const [supplierBillNo, setSupplierBillNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentDueDate, setPaymentDueDate] = useState('');
  const [inwardItems, setInwardItems] = useState([]);
  const [inwardDiscount, setInwardDiscount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');

  // Searchable Medicine Dropdown & Item Row Buffer (matching image layout)
  const [medicineSearchQuery, setMedicineSearchQuery] = useState('');
  const [isMedicineDropdownOpen, setIsMedicineDropdownOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemType, setItemType] = useState('Tablet');
  const [hsnCode, setHsnCode] = useState('3004');
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [packSize, setPackSize] = useState('1x10');
  const [unitsPerPack, setUnitsPerPack] = useState(10);
  const [qty, setQty] = useState(10);
  const [freeQty, setFreeQty] = useState(0);
  const [mrp, setMrp] = useState(35);
  const [purchasePrice, setPurchasePrice] = useState(25);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [gstRate, setGstRate] = useState(12);

  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchSuppliers();
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [pagination.page, currentOutlet]);

  // Click outside listener for medicine search dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsMedicineDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuppliers = async () => {
    try {
      const res = await apiClient.get('/suppliers', { params: { limit: 50 } });
      const sups = res.suppliers || [];
      setSuppliers(sups);
      if (sups.length > 0 && !supplierId) setSupplierId(sups[0]._id);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await apiClient.get('/products', { params: { limit: 200 } });
      const prods = res.products || [];
      setProducts(prods);
      if (prods.length > 0 && !selectedProductId) {
        handleSelectProduct(prods[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/purchases/invoices', {
        params: {
          outletId: currentOutlet?._id,
          page: pagination.page,
          limit: 15,
        },
      });
      setInvoices(res.invoices || []);
      setPagination(res.pagination || { page: 1, total: 0, pages: 1 });
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectProduct = (prod) => {
    setSelectedProduct(prod);
    setSelectedProductId(prod._id);
    setMedicineSearchQuery(prod.name);
    setHsnCode(prod.hsnCode || '3004');
    setItemType(prod.dosageForm || 'Tablet');
    setPurchasePrice(prod.purchasePrice || 0);
    setMrp(prod.mrp || 0);
    setGstRate(prod.gstRate != null ? prod.gstRate : 12);
    setPackSize(prod.packSize || prod.uom || '1x10');
    setUnitsPerPack(prod.unitsPerPack != null ? prod.unitsPerPack : (prod.dosageForm === 'Syrup' || prod.dosageForm === 'Injection' || prod.dosageForm === 'Packet' ? 1 : 10));
    setIsMedicineDropdownOpen(false);
  };

  const filteredProducts = products.filter((p) => {
    if (!medicineSearchQuery) return true;
    const q = medicineSearchQuery.toLowerCase().trim();
    return (
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.genericName && p.genericName.toLowerCase().includes(q)) ||
      (p.brand && p.brand.toLowerCase().includes(q)) ||
      (p.sku && p.sku.toLowerCase().includes(q))
    );
  });

  // Calculate live item margin and line amount
  const lineGross = Number(qty || 0) * Number(purchasePrice || 0);
  const lineDiscount = Math.round(((lineGross * Number(discountPercent || 0)) / 100) * 100) / 100;
  const lineTaxable = lineGross - lineDiscount;
  const effectiveGst = billHasGst ? Number(gstRate || 0) : 0;
  const lineTax = Math.round(((lineTaxable * effectiveGst) / 100) * 100) / 100;
  const lineTotal = Math.round((lineTaxable + lineTax) * 100) / 100;
  const marginPercent =
    Number(mrp) > 0 && Number(purchasePrice) > 0
      ? (((Number(mrp) - Number(purchasePrice)) / Number(mrp)) * 100).toFixed(1)
      : '0.0';

  const handleAddItemToInward = () => {
    const prod = products.find((p) => p._id === selectedProductId) || selectedProduct;
    if (!prod) {
      alert('Please search and select a medicine product first.');
      return;
    }
    if (!batchNumber || !batchNumber.trim()) {
      alert('Please enter a Batch Number for this consignment.');
      return;
    }
    if (!expiryDate) {
      alert('Please enter an Expiry Date for this batch.');
      return;
    }
    if (Number(qty) <= 0) {
      alert('Quantity must be greater than 0.');
      return;
    }

    const newItem = {
      product: prod._id,
      productName: prod.name,
      genericName: prod.genericName,
      itemType: itemType || 'Tablet',
      hsnCode: hsnCode || '3004',
      packSize: (packSize || '1x10').trim(),
      unitsPerPack: Number(unitsPerPack || 10),
      looseQuantity: (Number(qty) + Number(freeQty || 0)) * Number(unitsPerPack || 10),
      batchNumber: batchNumber.toUpperCase().trim(),
      expiryDate,
      quantity: Number(qty),
      freeQuantity: Number(freeQty || 0),
      purchasePrice: Number(purchasePrice),
      mrp: Number(mrp),
      sellingPrice: Number(mrp || purchasePrice),
      discountPercent: Number(discountPercent || 0),
      gstRate: effectiveGst,
      taxAmount: lineTax,
      totalAmount: lineTotal,
      marginPercent,
    };

    setInwardItems([...inwardItems, newItem]);
    setBatchNumber('');
    setExpiryDate('');
  };

  const handleRemoveInwardItem = (index) => {
    setInwardItems(inwardItems.filter((_, idx) => idx !== index));
  };

  const handleInwardSubmit = async (e) => {
    e.preventDefault();
    if (inwardItems.length === 0) {
      alert('Please add at least one medicine item to the goods receipt.');
      return;
    }

    const outletIdToUse = currentOutlet?._id || user?.outlets?.[0]?._id || user?.outlets?.[0];

    try {
      await apiClient.post('/purchases/receive', {
        supplier: supplierId,
        outlet: outletIdToUse,
        outletId: outletIdToUse,
        purchaseType,
        billHasGst,
        supplierInvoiceNumber: supplierBillNo,
        invoiceDate,
        dueDate: paymentDueDate || undefined,
        items: inwardItems,
        discount: Number(inwardDiscount),
        paidAmount: Number(paidAmount),
        paymentMethod,
      });

      setShowInwardModal(false);
      setInwardItems([]);
      setSupplierBillNo('');
      setPaidAmount(0);
      setInwardDiscount(0);
      fetchInvoices();
      alert('Purchase bill recorded, batches generated (with free goods), and supplier khata updated successfully!');
    } catch (err) {
      alert(err.message);
    }
  };

  // Calculations for Inward Modal
  const inwardSubtotal = inwardItems.reduce((acc, it) => acc + (it.quantity * it.purchasePrice * (1 - (it.discountPercent || 0) / 100)), 0);
  const inwardTax = inwardItems.reduce((acc, it) => acc + it.taxAmount, 0);
  const inwardGrandTotal = Math.max(0, Math.round(inwardSubtotal + inwardTax - inwardDiscount));

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Purchases & Inward Goods (GRN)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Log supplier delivery challans, inward batch stocks, pack types, free scheme goods, and reconcile payables
          </p>
        </div>
        <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowInwardModal(true)}>
          Receive Goods (GRN)
        </Button>
      </div>

      {/* Inward Invoices Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Purchase Invoices & Consignments</h3>
          </div>
          <Badge variant="primary">{pagination.total} Recorded</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[750px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">GRN No</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Supplier Invoice</th>
                <th className="py-3 px-3">Wholesaler</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3 text-right">Taxable</th>
                <th className="py-3 px-3 text-right">GST</th>
                <th className="py-3 px-3 text-right">Grand Total</th>
                <th className="py-3 px-3 text-right">Paid</th>
                <th className="py-3 px-4 text-center">Khata Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan="10" className="py-8 text-center text-slate-400">
                    Loading purchase records...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-8 text-center text-slate-400">
                    No inward goods recorded yet. Click "Receive Goods (GRN)" to begin.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {inv.purchaseType || 'Invoice'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-700">{inv.supplierInvoiceNumber || 'N/A'}</td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-900 block">{inv.supplier?.companyName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">GSTIN: {inv.supplier?.gstin || 'N/A'}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{formatDate(inv.createdAt)}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-500">
                      {formatCurrency(inv.subtotal)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-500">
                      {formatCurrency(inv.taxAmount)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(inv.grandTotal)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-700">
                      {formatCurrency(inv.paidAmount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {inv.paymentStatus === 'Paid' ? (
                        <Badge variant="success">Paid</Badge>
                      ) : inv.paymentStatus === 'Partially Paid' ? (
                        <Badge variant="warning">Partially Paid</Badge>
                      ) : (
                        <Badge variant="danger">Unpaid Khata</Badge>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Goods Inward Modal (Full Localwell-style responsive interface) */}
      <Modal
        isOpen={showInwardModal}
        onClose={() => setShowInwardModal(false)}
        maxWidth="max-w-6xl w-full"
        title="Add New Purchase / Inward (GRN)"
        subtitle="Fill in the details below to import a new purchase bill, pack sizes, free scheme quantities, and batches"
      >
        <form onSubmit={handleInwardSubmit} className="space-y-4">
          {/* TOP SECTION: Header controls matching image */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
              {/* Purchase Type Radio */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Purchase Type <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl border border-slate-200">
                  <label className="flex items-center gap-1.5 text-xs text-slate-800 font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="purchaseType"
                      value="Invoice"
                      checked={purchaseType === 'Invoice'}
                      onChange={() => setPurchaseType('Invoice')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    Invoice
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-800 font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="purchaseType"
                      value="Delivery Challan"
                      checked={purchaseType === 'Delivery Challan'}
                      onChange={() => setPurchaseType('Delivery Challan')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    Challan
                  </label>
                </div>
              </div>

              {/* Bill Has GST Radio */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Bill Has GST? <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl border border-slate-200">
                  <label className="flex items-center gap-1.5 text-xs text-slate-800 font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="billGst"
                      checked={billHasGst === true}
                      onChange={() => setBillHasGst(true)}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    Yes
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-800 font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="billGst"
                      checked={billHasGst === false}
                      onChange={() => setBillHasGst(false)}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    No
                  </label>
                </div>
              </div>

              {/* Distributor / Wholesaler Selector */}
              <div className="lg:col-span-2">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Distributor / Wholesaler <span className="text-red-500">*</span>
                </label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-emerald-500"
                  required
                >
                  {suppliers.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.companyName} (Khata: ₹{s.outstandingBalance || 0})
                    </option>
                  ))}
                </select>
              </div>

              {/* Invoice Number */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Invoice No <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={supplierBillNo}
                  onChange={(e) => setSupplierBillNo(e.target.value)}
                  placeholder="e.g. 1212"
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Invoice Date */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Invoice Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* ITEM ENTRY ROW: Fully Responsive Grid matching Localwell Screenshot */}
          <div className="p-3 sm:p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-4 h-4 text-emerald-600" />
                Line Item Details (Product, Pack, Type, Free & Rate)
              </h4>
              <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">
                Press "+ Add Item" after entering batch and quantities
              </span>
            </div>

            {/* Structured responsive fields */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-12 gap-2 sm:gap-2.5 items-end">
              {/* 1. PRODUCT / BARCODE (Searchable Dropdown) */}
              <div className="col-span-2 lg:col-span-3 relative" ref={dropdownRef}>
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1 truncate">
                  Product / Barcode *
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={medicineSearchQuery}
                    placeholder="Type name or salt..."
                    onFocus={() => setIsMedicineDropdownOpen(true)}
                    onChange={(e) => {
                      setMedicineSearchQuery(e.target.value);
                      setIsMedicineDropdownOpen(true);
                    }}
                    className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  {medicineSearchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setMedicineSearchQuery('');
                        setIsMedicineDropdownOpen(true);
                      }}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Autocomplete Dropdown List */}
                {isMedicineDropdownOpen && (
                  <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-y-auto divide-y divide-slate-100">
                    {filteredProducts.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-400">
                        No medicines found matching "{medicineSearchQuery}".
                      </div>
                    ) : (
                      filteredProducts.map((p) => (
                        <div
                          key={p._id}
                          onClick={() => handleSelectProduct(p)}
                          className={`p-2.5 hover:bg-emerald-50 cursor-pointer flex justify-between items-center text-xs transition-colors ${
                            selectedProductId === p._id ? 'bg-emerald-50/70 border-l-2 border-emerald-600' : ''
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <p className="font-bold text-slate-900 truncate">{p.name}</p>
                            <p className="text-[10px] text-slate-500 truncate">{p.genericName}</p>
                            <div className="flex items-center gap-1.5 text-[9px] text-slate-400 mt-0.5">
                              <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium">
                                {p.dosageForm || 'Tablet'}
                              </span>
                              <span>•</span>
                              <span>Pack: {p.packSize || '1x10'}</span>
                            </div>
                          </div>
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-full shrink-0">
                            Select
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* 2. ITEM TYPE (User specifically requested: Syrup, Packet, Tablet, etc.) */}
              <div className="col-span-1 lg:col-span-2">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1 truncate">
                  Item Type *
                </label>
                <select
                  value={itemType}
                  onChange={(e) => setItemType(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-emerald-500"
                >
                  {ITEM_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. HSN */}
              <div className="col-span-1 lg:col-span-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  HSN
                </label>
                <input
                  type="text"
                  value={hsnCode}
                  onChange={(e) => setHsnCode(e.target.value)}
                  placeholder="3004"
                  className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* 4. BATCH */}
              <div className="col-span-1 lg:col-span-2">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1 truncate">
                  Batch No *
                </label>
                <input
                  type="text"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value.toUpperCase())}
                  placeholder="BATCH NO"
                  className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-900 font-mono font-bold uppercase focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* 5. EXPIRY */}
              <div className="col-span-1 lg:col-span-2">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Expiry *
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* 6. PACK (Pack size / Presets) */}
              <div className="col-span-1 lg:col-span-2">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1 truncate">
                  Pack
                </label>
                <input
                  type="text"
                  value={packSize}
                  onChange={(e) => setPackSize(e.target.value)}
                  placeholder="e.g. 1x10 or 1x100ml"
                  list="packPresets"
                  className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
                <datalist id="packPresets">
                  {PACKAGING_PRESETS.map((p, i) => (
                    <option key={i} value={p} />
                  ))}
                </datalist>
              </div>

              {/* 6B. TABS/UNITS PER PACK (Marg ERP conversion factor) */}
              <div className="col-span-1 lg:col-span-1">
                <label className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block mb-1 text-center truncate" title="How many tablets/capsules/units in 1 packet/strip">
                  Tabs/Pack *
                </label>
                <input
                  type="number"
                  min="1"
                  value={unitsPerPack}
                  onChange={(e) => setUnitsPerPack(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-emerald-50/60 border border-emerald-300 rounded-lg px-1.5 py-1.5 text-xs text-center font-bold text-emerald-950 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* 7. QTY */}
              <div className="col-span-1 lg:col-span-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1 text-center">
                  Qty *
                </label>
                <input
                  type="number"
                  min="1"
                  value={qty}
                  onChange={(e) => setQty(parseInt(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-1.5 py-1.5 text-xs text-center font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* 8. FREE (Free / Scheme quantity) */}
              <div className="col-span-1 lg:col-span-1">
                <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block mb-1 text-center">
                  Free
                </label>
                <input
                  type="number"
                  min="0"
                  value={freeQty}
                  onChange={(e) => setFreeQty(parseInt(e.target.value) || 0)}
                  className="w-full bg-emerald-50 border border-emerald-300 rounded-lg px-1.5 py-1.5 text-xs text-center font-bold text-emerald-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* 9. MRP */}
              <div className="col-span-1 lg:col-span-2">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  MRP (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={mrp}
                  onChange={(e) => setMrp(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* 10. RATE (Purchase rate) */}
              <div className="col-span-1 lg:col-span-2">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Rate (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* 11. DISC % */}
              <div className="col-span-1 lg:col-span-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1 text-center">
                  Disc %
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-1 py-1.5 text-xs text-center font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* 12. GST % */}
              <div className="col-span-1 lg:col-span-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1 text-center">
                  GST %
                </label>
                <select
                  disabled={!billHasGst}
                  value={effectiveGst}
                  onChange={(e) => setGstRate(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-1 py-1.5 text-xs text-center font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
                >
                  <option value="0">0%</option>
                  <option value="5">5%</option>
                  <option value="12">12%</option>
                  <option value="18">18%</option>
                  <option value="28">28%</option>
                </select>
              </div>

              {/* 13. MARGIN % (Read only) */}
              <div className="col-span-1 lg:col-span-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1 text-center">
                  Margin
                </label>
                <div className="bg-slate-100 border border-slate-200 rounded-lg py-1.5 px-1 text-center text-xs font-bold text-emerald-700">
                  {marginPercent}%
                </div>
              </div>

              {/* 14. AMT (Read only calculated total) */}
              <div className="col-span-1 lg:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1 text-right">
                  Amt (₹)
                </label>
                <div className="bg-slate-100 border border-slate-200 rounded-lg py-1.5 px-2 text-right text-xs font-mono font-black text-slate-900 truncate">
                  ₹{lineTotal}
                </div>
              </div>

              {/* 15. ADD BUTTON */}
              <div className="col-span-2 lg:col-span-2">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="w-full py-2 font-bold shadow-sm"
                  onClick={handleAddItemToInward}
                >
                  + Add Item
                </Button>
              </div>
            </div>

            {/* Live Marg ERP conversion breakdown banner */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-emerald-900 bg-white/80 p-2.5 rounded-xl border border-emerald-200">
              <div className="flex items-center gap-3 font-medium">
                <span>📦 Total Packs: <strong>{(Number(qty) || 0) + (Number(freeQty) || 0)}</strong> ({qty} billed + {freeQty} free)</span>
                <span>•</span>
                <span>💊 Total Loose Units: <strong className="text-emerald-700">{((Number(qty) || 0) + (Number(freeQty) || 0)) * (Number(unitsPerPack) || 10)}</strong> ({unitsPerPack} tabs/pack)</span>
                <span>•</span>
                <span>💰 Cost/Tab: <strong>₹{((Number(purchasePrice) || 0) / (Number(unitsPerPack) || 1)).toFixed(2)}</strong></span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                Marg ERP Packing Factor
              </span>
            </div>
          </div>

          {/* STAGED ITEMS CONSIGNMENT TABLE: Responsive horizontal scroll */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
            <div className="bg-slate-50 px-3.5 py-2 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Purchase Bill Items ({inwardItems.length})
              </span>
              <span className="text-[11px] text-slate-500">
                Total Staged:{' '}
                <strong>
                  {inwardItems.reduce((acc, it) => acc + it.quantity + (it.freeQuantity || 0), 0)} packs
                </strong>{' '}
                <span className="text-emerald-700 font-semibold">
                  ({inwardItems.reduce((acc, it) => acc + (it.quantity + (it.freeQuantity || 0)) * (it.unitsPerPack || 10), 0)} loose units)
                </span>
              </span>
            </div>

            <div className="overflow-x-auto max-h-56">
              <table className="w-full text-left text-xs min-w-[850px]">
                <thead className="bg-slate-50 text-slate-500 font-semibold text-[10px] uppercase sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-2">Type</th>
                    <th className="py-2.5 px-2">Batch</th>
                    <th className="py-2.5 px-2">Expiry</th>
                    <th className="py-2.5 px-2">Pack (Tabs/Pk)</th>
                    <th className="py-2.5 px-2 text-right">Qty</th>
                    <th className="py-2.5 px-2 text-right text-emerald-700">Free</th>
                    <th className="py-2.5 px-2 text-right">Rate</th>
                    <th className="py-2.5 px-2 text-right">MRP</th>
                    <th className="py-2.5 px-2 text-right">Disc %</th>
                    <th className="py-2.5 px-2 text-right">GST</th>
                    <th className="py-2.5 px-3 text-right">Total Amt</th>
                    <th className="py-2.5 px-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {inwardItems.length === 0 ? (
                    <tr>
                      <td colSpan="14" className="py-6 text-center text-slate-400">
                        No medicine items added to this bill yet. Fill in the row above and click "+ Add Item".
                      </td>
                    </tr>
                  ) : (
                    inwardItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-2 px-3 font-bold text-slate-900">
                          {item.productName}
                          <span className="text-[10px] text-slate-400 font-normal block">{item.genericName}</span>
                        </td>
                        <td className="py-2 px-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {item.itemType}
                          </span>
                        </td>
                        <td className="py-2 px-2 font-mono font-bold text-slate-800">{item.batchNumber}</td>
                        <td className="py-2 px-2 text-slate-600">{formatDate(item.expiryDate)}</td>
                        <td className="py-2 px-2 font-mono text-slate-600">{item.packSize} <span className="text-[10px] text-emerald-700 block font-sans">({item.unitsPerPack || 10} tabs)</span></td>
                        <td className="py-2 px-2 text-right font-bold text-slate-900">{item.quantity}</td>
                        <td className="py-2 px-2 text-right font-bold text-emerald-700">
                          {item.freeQuantity > 0 ? `+${item.freeQuantity}` : '0'}
                        </td>
                        <td className="py-2 px-2 text-right font-mono">{formatCurrency(item.purchasePrice)}</td>
                        <td className="py-2 px-2 text-right font-mono text-slate-500">{formatCurrency(item.mrp)}</td>
                        <td className="py-2 px-2 text-right font-mono text-slate-500">{item.discountPercent}%</td>
                        <td className="py-2 px-2 text-right font-mono text-slate-500">{item.gstRate}%</td>
                        <td className="py-2 px-3 text-right font-mono font-black text-slate-900">
                          {formatCurrency(item.totalAmount)}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveInwardItem(idx)}
                            className="p-1 text-slate-400 hover:text-red-500 rounded"
                            title="Remove row"
                          >
                            <Trash2 className="w-3.5 h-3.5 mx-auto" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* PAYMENT & SETTLEMENT DRAWER */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Taxable Subtotal:</span>
                <span className="font-mono font-medium">{formatCurrency(inwardSubtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total GST Tax:</span>
                <span className="font-mono font-medium">{formatCurrency(inwardTax)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Special Bill Discount (₹):</span>
                <input
                  type="number"
                  min="0"
                  value={inwardDiscount}
                  onChange={(e) => setInwardDiscount(parseFloat(e.target.value) || 0)}
                  className="w-24 bg-white border border-slate-200 rounded px-2 py-1 text-right text-xs font-mono"
                />
              </div>
              <div className="flex justify-between font-black text-sm text-slate-900 pt-2 border-t border-slate-200">
                <span>Grand Total:</span>
                <span className="font-mono text-emerald-700 text-base">{formatCurrency(inwardGrandTotal)}</span>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <Input
                label="Amount Paid Now (₹)"
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                helperText={`Remaining ₹${Math.max(0, inwardGrandTotal - paidAmount)} will be added to Supplier Khata`}
              />

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Payment Mode</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs"
                  >
                    <option value="Bank Transfer">Bank Transfer / NEFT</option>
                    <option value="UPI">UPI</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash Drawer</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Due Date (Optional)</label>
                  <input
                    type="date"
                    value={paymentDueDate}
                    onChange={(e) => setPaymentDueDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-900"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex flex-wrap justify-between items-center gap-3 pt-2 border-t border-slate-100">
            <span className="text-xs text-slate-500 font-medium">
              Receiving at: <strong>{currentOutlet?.name || 'Central Pharmacy'}</strong>
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" type="button" onClick={() => setShowInwardModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={inwardItems.length === 0}>
                Confirm Inward & Generate Batches
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
