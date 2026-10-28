import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import apiClient from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { formatCurrency, formatDate } from '../utils/cn';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

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

  // Item row input buffer
  const [selectedProductId, setSelectedProductId] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [qty, setQty] = useState(50);
  const [purchasePrice, setPurchasePrice] = useState(25);
  const [mrp, setMrp] = useState(35);
  const [sellingPrice, setSellingPrice] = useState(30);

  useEffect(() => {
    fetchSuppliers();
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [pagination.page, currentOutlet]);

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
      const res = await apiClient.get('/products', { params: { limit: 100 } });
      setProducts(res.products || []);
      if (res.products?.length > 0) {
        setSelectedProductId(res.products[0]._id);
        setPurchasePrice(res.products[0].purchasePrice);
        setMrp(res.products[0].mrp);
        setSellingPrice(res.products[0].sellingPrice);
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

  const handleProductSelectChange = (pid) => {
    setSelectedProductId(pid);
    const prod = products.find((p) => p._id === pid);
    if (prod) {
      setPurchasePrice(prod.purchasePrice);
      setMrp(prod.mrp);
      setSellingPrice(prod.sellingPrice);
    }
  };

  const handleAddItemToInward = () => {
    const prod = products.find((p) => p._id === selectedProductId);
    if (!prod || !batchNumber || !expiryDate) {
      alert('Please fill in product, batch number, and expiry date.');
      return;
    }

    const itemSubtotal = qty * purchasePrice;
    const itemTax = (itemSubtotal * (prod.gstRate || 12)) / 100;

    const newItem = {
      product: prod._id,
      productName: prod.name,
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
      fetchInvoices();
    } catch (err) {
      alert(err.message);
    }
  };

  const inwardSubtotal = inwardItems.reduce((acc, it) => acc + it.quantity * it.purchasePrice, 0);
  const inwardTax = inwardItems.reduce((acc, it) => acc + it.taxAmount, 0);
  const inwardGrandTotal = Math.round(inwardSubtotal + inwardTax - Number(inwardDiscount || 0));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Purchase Orders & Goods Inward</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Receive pharmaceutical consignments, generate batch stocks, and update wholesaler ledgers
          </p>
        </div>
        <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowInwardModal(true)}>
          Receive Goods (Inward Bill)
        </Button>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Invoice / Bill No</th>
                <th className="py-3 px-3">Supplier / Wholesaler</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3 text-right">Subtotal</th>
                <th className="py-3 px-3 text-right">GST Tax</th>
                <th className="py-3 px-3 text-right">Grand Total</th>
                <th className="py-3 px-3 text-right">Paid</th>
                <th className="py-3 px-4 text-center">Payment Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">
                    Loading purchase records...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">
                    No purchase inward invoices recorded yet.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block font-mono">{inv.invoiceNumber}</span>
                      {inv.supplierInvoiceNumber && (
                        <span className="text-[10px] text-slate-400">Bill Ref: {inv.supplierInvoiceNumber}</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-900 block">{inv.supplier?.companyName}</span>
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
        subtitle="Inward incoming medicine consignments, enter batches, and update wholesaler ledger"
      >
        <form onSubmit={handleInwardSubmit} className="space-y-5">
          {/* Top metadata */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
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
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Add Medicine Consignment Item</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-700 block mb-1">Medicine Name</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => handleProductSelectChange(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800"
                >
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} ({p.genericName})
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Batch Number"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                placeholder="e.g. BATCH-01"
              />

              <Input
                label="Expiry Date"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 items-end">
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
              <Button type="button" variant="primary" size="sm" onClick={handleAddItemToInward}>
                + Add Item
              </Button>
            </div>
          </div>

          {/* Staged Items List */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold text-[10px] uppercase">
                <tr>
                  <th className="p-2.5">Medicine</th>
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
                    <td colSpan="7" className="text-center py-4 text-slate-400">
                      No items staged. Add items above to receive stock.
                    </td>
                  </tr>
                ) : (
                  inwardItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5 font-bold text-slate-800">{item.productName}</td>
                      <td className="p-2.5 font-mono">{item.batchNumber}</td>
                      <td className="p-2.5">{formatDate(item.expiryDate)}</td>
                      <td className="p-2.5 text-right font-bold">{item.quantity}</td>
                      <td className="p-2.5 text-right font-mono">{formatCurrency(item.purchasePrice)}</td>
                      <td className="p-2.5 text-right font-mono font-bold">{formatCurrency(item.totalAmount)}</td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveInwardItem(idx)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Payment & Settlement */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
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

          <div className="flex justify-end gap-2 pt-2">
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
