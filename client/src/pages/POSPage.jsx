import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  UserCheck,
  UserPlus,
  Receipt,
  Printer,
  Sparkles,
  CreditCard,
  QrCode,
  Banknote,
  Percent,
  CheckCircle2,
  Stethoscope,
  X,
  AlertCircle,
} from 'lucide-react';
import apiClient from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { useCartStore } from '../store/useCartStore';
import { formatCurrency, formatDate } from '../utils/cn';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { ThermalReceipt } from '../components/common/ThermalReceipt';

export const POSPage = () => {
  const { currentOutlet } = useAuthStore();
  const {
    items,
    addItem,
    updateQuantity,
    updateItemDiscount,
    removeItem,
    clearCart,
    customer,
    setCustomer,
    doctorName,
    setDoctorName,
    prescriptionNumber,
    setPrescriptionNumber,
    paymentMethod,
    setPaymentMethod,
    customDiscountPercent,
    setCustomDiscountPercent,
    getTotals,
  } = useCartStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Substitute finder state
  const [showSubstitutes, setShowSubstitutes] = useState(false);
  const [substituteList, setSubstituteList] = useState([]);
  const [selectedSubGeneric, setSelectedSubGeneric] = useState('');

  // Quick Customer modal state
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerList, setCustomerList] = useState([]);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  // Post checkout receipt state
  const [completedInvoice, setCompletedInvoice] = useState(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  const searchInputRef = useRef(null);

  // Focus search input on mount and F2
  useEffect(() => {
    searchInputRef.current?.focus();
    const handleKeyDown = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Search medicines
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (!searchQuery || searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const res = await apiClient.get('/products', {
          params: {
            search: searchQuery.trim(),
            outletId: currentOutlet?._id,
            limit: 12,
          },
        });
        setSearchResults(res.products || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, currentOutlet]);

  const handleSelectMedicine = (product) => {
    // Pick oldest non-expired batch (FEFO)
    const validBatches = (product.batches || []).filter(
      (b) => b.availableQuantity > 0 && new Date(b.expiryDate) > new Date()
    );

    if (validBatches.length === 0) {
      alert(`No valid unexpired stock available for ${product.name}!`);
      return;
    }

    try {
      addItem(product, validBatches[0], 1);
      setSearchQuery('');
      setSearchResults([]);
      searchInputRef.current?.focus();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleViewSubstitutes = async (genericName, excludeId) => {
    setSelectedSubGeneric(genericName);
    setShowSubstitutes(true);
    try {
      const res = await apiClient.get('/products/substitutes', {
        params: {
          genericName,
          excludeProductId: excludeId,
          outletId: currentOutlet?._id,
        },
      });
      setSubstituteList(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearchCustomers = async (val) => {
    setCustomerSearch(val);
    if (!val || val.length < 2) return;
    try {
      const res = await apiClient.get('/customers', { params: { search: val, limit: 5 } });
      setCustomerList(res.customers || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    try {
      const res = await apiClient.post('/customers', {
        name: newCustomerName,
        phone: newCustomerPhone,
      });
      setCustomer(res.data);
      setShowCustomerModal(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0) {
      setCheckoutError('Please add at least one item to checkout.');
      return;
    }

    setCheckoutError('');
    setIsCheckingOut(true);

    try {
      const payload = {
        outlet: currentOutlet?._id,
        customer: customer?._id,
        customerName: customer?.name || 'Walk-in Customer',
        customerPhone: customer?.phone || '',
        doctorName: doctorName || '',
        prescriptionNumber: prescriptionNumber || '',
        items: items.map((it) => ({
          productId: it.productId,
          batchId: it.batchId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discountPercent: it.discountPercent || customDiscountPercent || 0,
          gstRate: it.gstRate,
        })),
        paymentMethod,
        customDiscountPercent,
      };

      const res = await apiClient.post('/pos/checkout', payload);
      setCompletedInvoice(res.data);
      clearCart();
    } catch (err) {
      setCheckoutError(err.message);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const totals = getTotals();

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col lg:flex-row gap-5">
      {/* LEFT COLUMN: Product Catalog & Fast Search */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Search Header */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-emerald-600" />
              Fast Pharmacy POS Billing
            </h3>
            <span className="text-[11px] font-mono text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
              F2: Search Focus
            </span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by Medicine name, Generic composition, SKU or scan Barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Product Search Results / Quick Shelf */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {isSearching && (
            <p className="text-xs text-slate-400 text-center py-6">Searching inventory...</p>
          )}

          {!isSearching && searchResults.length === 0 && searchQuery && (
            <div className="text-center py-8">
              <p className="text-xs text-slate-500">No matching medicines found for "{searchQuery}".</p>
            </div>
          )}

          {!isSearching && searchResults.length === 0 && !searchQuery && (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <ShoppingCart className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5]" />
              <p className="text-xs font-medium">Type any medicine name or scan barcode to add to bill</p>
              <p className="text-[11px] text-slate-400">Example: Calpol, Dolo, Augmentin, Pan-D, Telma</p>
            </div>
          )}

          {searchResults.map((product) => {
            const inStock = product.currentStock > 0;
            const validBatch = product.batches?.find(
              (b) => b.availableQuantity > 0 && new Date(b.expiryDate) > new Date()
            );

            return (
              <div
                key={product._id}
                className="p-3 rounded-xl border border-slate-200/90 hover:border-emerald-500 bg-white hover:bg-emerald-50/20 transition-all flex items-center justify-between group shadow-sm"
              >
                <div className="min-w-0 flex-1 pr-3">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900 truncate">{product.name}</h4>
                    {product.scheduleType && product.scheduleType !== 'OTC' && (
                      <Badge variant="danger" className="text-[10px] py-0 px-1.5">
                        {product.scheduleType}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{product.genericName}</p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                    <span>Pack: {product.packSize || product.uom}</span>
                    <span>•</span>
                    <span>MRP: {formatCurrency(product.mrp)}</span>
                    <span>•</span>
                    {validBatch ? (
                      <span className="text-slate-600 font-medium">
                        FEFO Batch: <strong className="text-slate-900">{validBatch.batchNumber}</strong> (Exp:{' '}
                        {formatDate(validBatch.expiryDate)})
                      </span>
                    ) : (
                      <span className="text-red-500 font-medium">No valid unexpired batch</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleViewSubstitutes(product.genericName, product._id)}
                    className="p-1.5 text-xs text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg font-medium flex items-center gap-1 border border-teal-200"
                    title="Find substitute brands with identical active salts"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Substitutes
                  </button>

                  <div className="text-right">
                    <span className="text-base font-black text-slate-900 block">
                      {formatCurrency(product.sellingPrice)}
                    </span>
                    <span
                      className={`text-[10px] font-bold ${
                        inStock ? 'text-emerald-700' : 'text-red-500'
                      }`}
                    >
                      {product.currentStock || 0} in stock
                    </span>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!inStock}
                    onClick={() => handleSelectMedicine(product)}
                  >
                    Add
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT COLUMN: POS Cart & Checkout Terminal */}
      <div className="w-full lg:w-[460px] flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden shrink-0">
        {/* Customer & Prescription Header */}
        <div className="p-3.5 border-b border-slate-100 bg-slate-50/70 space-y-2.5">
          {/* Customer Bar */}
          <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200/80">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <div>
                <p className="text-xs font-bold text-slate-900">{customer ? customer.name : 'Walk-in Customer'}</p>
                {customer ? (
                  <p className="text-[10px] text-slate-500">
                    Ph: {customer.phone} | Khata Bal:{' '}
                    <strong className={customer.outstandingBalance > 0 ? 'text-red-600' : 'text-emerald-600'}>
                      {formatCurrency(customer.outstandingBalance)}
                    </strong>{' '}
                    | Pts: {customer.loyaltyPoints}
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-400">Regular cash billing</p>
                )}
              </div>
            </div>

            <Button variant="ghost" size="sm" onClick={() => setShowCustomerModal(true)}>
              {customer ? 'Change' : '+ Customer'}
            </Button>
          </div>

          {/* Doctor & Rx inputs */}
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Doctor Name (Optional)"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
            />
            <input
              type="text"
              placeholder="Prescription / Rx No."
              value={prescriptionNumber}
              onChange={(e) => setPrescriptionNumber(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-300">
              <ShoppingCart className="w-8 h-8 stroke-1 mb-1" />
              <p className="text-xs text-slate-400">Cart is empty</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.batchId}
                className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">{item.productName}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                      <span className="font-mono bg-slate-200/80 px-1 rounded">B:{item.batchNumber}</span>
                      <span>Exp: {formatDate(item.expiryDate)}</span>
                      <span>GST: {item.gstRate}%</span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeItem(item.batchId)}
                    className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.batchId, item.quantity - 1)}
                      className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center text-xs font-bold text-slate-900">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.batchId, item.quantity + 1)}
                      className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Line Total */}
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-900">
                      {formatCurrency(item.unitPrice * item.quantity)}
                    </span>
                    <span className="text-[10px] text-slate-400 block">@ {formatCurrency(item.unitPrice)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Financial Summary & Checkout Footer */}
        <div className="p-4 border-t border-slate-200/80 bg-slate-50/80 space-y-3">
          {checkoutError && (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{checkoutError}</span>
            </div>
          )}

          {/* Subtotals & Taxes */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Items Total ({totals.itemCount} units)</span>
              <span>{formatCurrency(totals.subtotal)}</span>
            </div>
            {totals.totalDiscount > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Total Discount</span>
                <span>- {formatCurrency(totals.totalDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-500 text-[11px]">
              <span>Taxable Value</span>
              <span>{formatCurrency(totals.taxableTotal)}</span>
            </div>
            <div className="flex justify-between text-slate-500 text-[11px]">
              <span>GST Total (CGST + SGST)</span>
              <span>{formatCurrency(totals.totalTax)}</span>
            </div>
            {totals.roundOff !== 0 && (
              <div className="flex justify-between text-slate-400 text-[10px]">
                <span>Round Off</span>
                <span>{formatCurrency(totals.roundOff)}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline pt-1.5 border-t border-slate-200">
              <span className="text-sm font-bold text-slate-900">Net Payable</span>
              <span className="text-xl font-black text-emerald-700">{formatCurrency(totals.grandTotal)}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            {[
              { id: 'Cash', label: 'Cash', icon: Banknote },
              { id: 'UPI', label: 'UPI / QR', icon: QrCode },
              { id: 'Card', label: 'Card', icon: CreditCard },
              { id: 'Credit', label: 'Khata', icon: Receipt },
            ].map((m) => {
              const Icon = m.icon;
              const isSelected = paymentMethod === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id)}
                  className={`py-2 px-1 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* Checkout & Clear Action Buttons */}
          <div className="flex gap-2 pt-1">
            <Button variant="secondary" size="md" onClick={clearCart} disabled={items.length === 0}>
              Clear
            </Button>
            <Button
              variant="primary"
              size="md"
              className="flex-1 py-3 text-base shadow-lg shadow-emerald-600/20"
              disabled={items.length === 0}
              isLoading={isCheckingOut}
              onClick={handleCheckout}
            >
              Print & Checkout ({formatCurrency(totals.grandTotal)})
            </Button>
          </div>
        </div>
      </div>

      {/* MODAL 1: Medicine Substitute Recommendations */}
      <Modal
        isOpen={showSubstitutes}
        onClose={() => setShowSubstitutes(false)}
        title="Alternative Medicine Substitutes"
        subtitle={`Same Active Composition: ${selectedSubGeneric}`}
      >
        <div className="space-y-3">
          {substituteList.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">
              No direct substitutes currently in stock with composition "{selectedSubGeneric}".
            </p>
          ) : (
            substituteList.map((sub) => (
              <div
                key={sub._id}
                className="p-3 rounded-xl border border-slate-200 flex items-center justify-between hover:bg-slate-50"
              >
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{sub.name}</h4>
                  <p className="text-xs text-slate-500">{sub.manufacturer?.name || 'Pharma'}</p>
                  <span className="text-[10px] text-emerald-600 font-semibold">{sub.currentStock || 0} in stock</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-900">{formatCurrency(sub.sellingPrice)}</span>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      handleSelectMedicine(sub);
                      setShowSubstitutes(false);
                    }}
                  >
                    Select Substitute
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* MODAL 2: Customer Search / Quick Registration */}
      <Modal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        title="Select or Register Customer"
        subtitle="Track purchase history, credit Khata, and chronic refill reminders"
      >
        <div className="space-y-5">
          {/* Search existing */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Search Existing Customer</label>
            <input
              type="text"
              placeholder="Search by customer name or phone number..."
              value={customerSearch}
              onChange={(e) => handleSearchCustomers(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
            />
            {customerList.length > 0 && (
              <div className="mt-2 divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {customerList.map((c) => (
                  <div
                    key={c._id}
                    onClick={() => {
                      setCustomer(c);
                      setShowCustomerModal(false);
                    }}
                    className="p-2.5 hover:bg-emerald-50 cursor-pointer flex justify-between items-center text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{c.name}</p>
                      <p className="text-[10px] text-slate-500">{c.phone}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400">Khata Balance:</span>
                      <p className="font-bold text-red-600">{formatCurrency(c.outstandingBalance)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-3 text-slate-400 text-xs font-semibold">OR REGISTER NEW</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* New Customer Form */}
          <form onSubmit={handleCreateCustomer} className="space-y-3">
            <Input
              label="Customer Full Name"
              value={newCustomerName}
              onChange={(e) => setNewCustomerName(e.target.value)}
              placeholder="e.g. Ramesh Patel"
              required
            />
            <Input
              label="Phone Number"
              value={newCustomerPhone}
              onChange={(e) => setNewCustomerPhone(e.target.value)}
              placeholder="e.g. 9845012345"
              required
            />
            <div className="flex justify-between pt-2">
              <Button
                variant="ghost"
                type="button"
                onClick={() => {
                  setCustomer(null);
                  setShowCustomerModal(false);
                }}
              >
                Reset to Walk-in
              </Button>
              <Button variant="primary" type="submit">
                Save & Select Customer
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* MODAL 3: Print Thermal Bill Receipt Modal */}
      <Modal
        isOpen={!!completedInvoice}
        onClose={() => setCompletedInvoice(null)}
        title="Payment Successful — Cash Memo Generated"
        subtitle={`Invoice No: ${completedInvoice?.invoiceNumber}`}
      >
        <ThermalReceipt
          invoice={completedInvoice}
          outlet={currentOutlet}
          onClose={() => setCompletedInvoice(null)}
        />
      </Modal>
    </div>
  );
};
