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
} from 'lucide-react';
import apiClient from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { formatCurrency, formatDate } from '../utils/cn';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

const PACKAGING_PRESETS = [
  'Strip of 10 Tablets',
  'Strip of 15 Tablets',
  'Strip of 10 Capsules',
  'Syrup of 100ml',
  'Syrup of 60ml',
  'Syrup of 200ml',
  'Vial of 10ml',
  'Ampoule of 2ml',
  'Bottle of 60 Tablets',
  'Tube of 15g Ointment',
  'Tube of 20g Gel',
  'Drops of 15ml',
  'Suspension of 60ml',
  'Box of 100 Units',
  'Pack of 1 Device',
];

export const PurchasesPage = () => {
  const { currentOutlet } = useAuthStore();
  const [invoices, setInvoices] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [isLoading, setIsLoading] = useState(true);

  // Inward Goods Modal
  const [showInwardModal, setShowInwardModal] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [supplierBillNo, setSupplierBillNo] = useState('');
  const [inwardItems, setInwardItems] = useState([]);
  const [inwardDiscount, setInwardDiscount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');

  // Searchable Medicine Dropdown & Item Row Buffer
  const [medicineSearchQuery, setMedicineSearchQuery] = useState('');
  const [isMedicineDropdownOpen, setIsMedicineDropdownOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [packSize, setPackSize] = useState('Strip of 10 Tablets');
  const [expiryDate, setExpiryDate] = useState('');
  const [qty, setQty] = useState(50);
  const [purchasePrice, setPurchasePrice] = useState(25);
  const [mrp, setMrp] = useState(35);
  const [sellingPrice, setSellingPrice] = useState(30);

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
      setSuppliers(res.suppliers || []);
      if (res.suppliers?.length > 0) setSupplierId(res.suppliers[0]._id);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await apiClient.get('/products', { params: { limit: 150 } });
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
    setPurchasePrice(prod.purchasePrice || 0);
    setMrp(prod.mrp || 0);
    setSellingPrice(prod.sellingPrice || 0);
    setPackSize(prod.packSize || prod.uom || 'Strip of 10 Tablets');
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

  const handleAddItemToInward = () => {
    const prod = products.find((p) => p._id === selectedProductId) || selectedProduct;
    if (!prod || !batchNumber || !expiryDate) {
      alert('Please fill in product, batch number, and expiry date.');
      return;
    }

    const itemSubtotal = qty * purchasePrice;
    const itemTax = (itemSubtotal * (prod.gstRate || 12)) / 100;

    const newItem = {
      product: prod._id,
      productName: prod.name,
      genericName: prod.genericName,
      packSize: (packSize || prod.packSize || 'Strip of 10 Tablets').trim(),
      batchNumber: batchNumber.toUpperCase().trim(),
      expiryDate,
      quantity: Number(qty),
      purchasePrice: Number(purchasePrice),
      mrp: Number(mrp),
      sellingPrice: Number(sellingPrice),
      gstRate: prod.gstRate || 12,
      taxAmount: itemTax,
      totalAmount: itemSubtotal + itemTax,
    };

    setInwardItems([...inwardItems, newItem]);
    setBatchNumber('');
    // Keep packSize, qty ready for next entry
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

    try {
      await apiClient.post('/purchases/receive', {
        supplier: supplierId,
        outlet: currentOutlet?._id,
        supplierInvoiceNumber: supplierBillNo,
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
      alert('Goods received, batches generated, and supplier ledger updated successfully!');
    } catch (err) {
      alert(err.message);
    }
  };

  // Calculations for Inward Modal
  const inwardSubtotal = inwardItems.reduce((acc, it) => acc + it.quantity * it.purchasePrice, 0);
  const inwardTax = inwardItems.reduce((acc, it) => acc + it.taxAmount, 0);
  const inwardGrandTotal = Math.max(0, Math.round(inwardSubtotal + inwardTax - inwardDiscount));

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Purchases & Inward Goods (GRN)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Log supplier delivery challans, inward batch stocks, and reconcile accounts payable
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
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">GRN No</th>
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
                  <td colSpan="9" className="py-8 text-center text-slate-400">
                    Loading purchase records...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-400">
                    No inward goods recorded yet. Click "Receive Goods (GRN)" to begin.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
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

      {/* Goods Inward Modal */}
      <Modal
        isOpen={showInwardModal}
        onClose={() => setShowInwardModal(false)}
        maxWidth="max-w-4xl"
        title="Purchase Inward & Goods Receipt (GRN)"
        subtitle="Inward incoming medicine consignments, enter batches, packaging, and update wholesaler ledger"
      >
        <form onSubmit={handleInwardSubmit} className="space-y-4">
          {/* Top metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Select Wholesaler / Supplier</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800"
                required
              >
                {suppliers.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.companyName} (Bal: ₹{s.outstandingBalance})
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Supplier Invoice / DC No"
              value={supplierBillNo}
              onChange={(e) => setSupplierBillNo(e.target.value)}
              placeholder="e.g. MED-BILL-9821"
            />

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Receiving Store Outlet</label>
              <input
                type="text"
                disabled
                value={currentOutlet?.name || 'Central Pharmacy'}
                className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2 text-xs text-slate-600"
              />
            </div>
          </div>

          {/* Add Item Row Buffer */}
          <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/20 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-emerald-600" />
              Add Medicine Consignment Item
            </h4>

            {/* Row 1: Searchable Medicine Dropdown, Batch Number, Packaging, Expiry */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* Searchable Medicine Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Medicine Name <span className="text-emerald-600">* (Search & Select)</span>
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={medicineSearchQuery}
                    placeholder="Type to search medicine..."
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

                {/* Dropdown Results Menu */}
                {isMedicineDropdownOpen && (
                  <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
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
                              <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                                {p.packSize || p.uom || 'Strip'}
                              </span>
                              <span>•</span>
                              <span>Cost: ₹{p.purchasePrice}</span>
                              <span>•</span>
                              <span>MRP: ₹{p.mrp}</span>
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

              {/* Batch Number */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Batch Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. BATCH-2026A"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-mono font-bold uppercase focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              {/* Packaging / Pack Size Option */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-emerald-600" />
                    Packaging / Pack Size
                  </label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) setPackSize(e.target.value);
                    }}
                    className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1 py-0.5"
                  >
                    <option value="">Presets...</option>
                    {PACKAGING_PRESETS.map((pst, idx) => (
                      <option key={idx} value={pst}>
                        {pst}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  value={packSize}
                  onChange={(e) => setPackSize(e.target.value)}
                  placeholder="e.g. Strip of 10 Tablets or Syrup of 100ml"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              {/* Expiry Date */}
              <Input
                label="Expiry Date *"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>

            {/* Row 2: Quantities, Prices & Add Button */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 items-end pt-1">
              <Input
                label="Quantity Inward"
                type="number"
                value={qty}
                onChange={(e) => setQty(parseInt(e.target.value) || 1)}
              />
              <Input
                label="Purchase Cost (₹)"
                type="number"
                step="0.1"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
              />
              <Input
                label="MRP (₹)"
                type="number"
                step="0.1"
                value={mrp}
                onChange={(e) => setMrp(parseFloat(e.target.value) || 0)}
              />
              <Input
                label="Selling Price (₹)"
                type="number"
                step="0.1"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
              />
              <div className="col-span-2 sm:col-span-1">
                <Button type="button" variant="primary" size="sm" className="w-full" onClick={handleAddItemToInward}>
                  + Add Item
                </Button>
              </div>
            </div>
          </div>

          {/* Staged Items List */}
          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="bg-slate-50 text-slate-500 font-semibold text-[10px] uppercase">
                <tr>
                  <th className="p-2.5">Medicine</th>
                  <th className="p-2.5">Packaging</th>
                  <th className="p-2.5">Batch</th>
                  <th className="p-2.5">Expiry</th>
                  <th className="p-2.5 text-right">Qty</th>
                  <th className="p-2.5 text-right">Cost</th>
                  <th className="p-2.5 text-right">Total</th>
                  <th className="p-2.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inwardItems.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-4 text-center text-slate-400">
                      No items staged for inward yet. Select medicine above and click "+ Add Item".
                    </td>
                  </tr>
                ) : (
                  inwardItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5 font-bold text-slate-900">{item.productName}</td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {item.packSize || 'Strip of 10 Tablets'}
                        </span>
                      </td>
                      <td className="p-2.5 font-mono font-bold text-slate-800">{item.batchNumber}</td>
                      <td className="p-2.5 text-slate-500">{formatDate(item.expiryDate)}</td>
                      <td className="p-2.5 text-right font-medium">{item.quantity}</td>
                      <td className="p-2.5 text-right font-mono">{formatCurrency(item.purchasePrice)}</td>
                      <td className="p-2.5 text-right font-mono font-bold">{formatCurrency(item.totalAmount)}</td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveInwardItem(idx)}
                          className="text-slate-400 hover:text-red-500"
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

          {/* Payment & Settlement */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono">{formatCurrency(inwardSubtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total GST:</span>
                <span className="font-mono">{formatCurrency(inwardTax)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Bill Discount:</span>
                <input
                  type="number"
                  value={inwardDiscount}
                  onChange={(e) => setInwardDiscount(parseFloat(e.target.value) || 0)}
                  className="w-24 bg-white border border-slate-200 rounded px-2 py-1 text-right text-xs"
                />
              </div>
              <div className="flex justify-between font-bold text-sm text-slate-900 pt-2 border-t border-slate-200">
                <span>Grand Total:</span>
                <span className="font-mono text-emerald-700">{formatCurrency(inwardGrandTotal)}</span>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <Input
                label="Amount Disbursed / Paid Now (₹)"
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                helperText={`Remaining ₹${Math.max(0, inwardGrandTotal - paidAmount)} will be added to Supplier Khata`}
              />

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Disbursement Mode</label>
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
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={() => setShowInwardModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={inwardItems.length === 0}>
              Confirm Inward & Generate Stock
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};