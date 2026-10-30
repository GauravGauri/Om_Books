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
import { formatCurrency, formatDate, cn } from '../utils/cn';
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
    getTotals,
  } = useCartStore();

  // Search & Catalog state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [mobileTab, setMobileTab] = useState('catalog'); // 'catalog' | 'cart'

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
        setMobileTab('catalog');
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
      alert(`No valid unexpired batches available in stock for ${product.name}`);
      return;
    }

    // FEFO: Sort by expiryDate ascending
    validBatches.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
    const chosenBatch = validBatches[0];

    addItem({
      productId: product._id,
      productName: product.name,
      genericName: product.genericName,
      batchId: chosenBatch._id,
      batchNumber: chosenBatch.batchNumber,
      expiryDate: chosenBatch.expiryDate,
      unitPrice: chosenBatch.sellingPrice || product.sellingPrice,
      mrp: chosenBatch.mrp || product.mrp,
      gstRate: product.gstRate || 12,
      hsnCode: product.hsnCode || '3004',
      quantity: 1,
      availableQuantity: chosenBatch.availableQuantity,
    });
  };

  const handleViewSubstitutes = async (genericName, excludeId) => {
    setSelectedSubGeneric(genericName);
    try {
      const res = await apiClient.get('/products/substitutes', {
        params: { genericName, excludeId, outletId: currentOutlet?._id },
      });
      setSubstituteList(res.substitutes || []);
      setShowSubstitutes(true);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSearchCustomers = async (val) => {
    setCustomerSearch(val);
    if (!val || val.length < 2) {
      setCustomerList([]);
      return;
    }
    try {
      const res = await apiClient.get('/customers', { params: { search: val, limit: 5 } });
      setCustomerList(res.customers || []);
    } catch (e) {
      // Ignore
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
    if (items.length === 0) return;
    setIsCheckingOut(true);
    setCheckoutError('');

    try {
      const totals = getTotals();
      const payload = {
        outletId: currentOutlet?._id,
        customerId: customer?._id,
        customerName: customer ? customer.name : 'Walk-in Customer',
        customerPhone: customer?.phone,
        doctorName: doctorName || undefined,
        prescriptionNumber: prescriptionNumber || undefined,
        paymentMethod,
        discountPercent: 0,
        items: items.map((it) => ({
          productId: it.productId,
          productName: it.productName,
          genericName: it.genericName,
          batchId: it.batchId,
          batchNumber: it.batchNumber,
          expiryDate: it.expiryDate,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          mrp: it.mrp,
          gstRate: it.gstRate,
          hsnCode: it.hsnCode,
          discountPercent: it.discountPercent || 0,
        })),
        cashTendered: paymentMethod === 'Cash' ? totals.grandTotal : 0,
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
    <div className="flex flex-col gap-3 min-h-[calc(100vh-100px)]">
      {/* Mobile Screen Navigation Switcher (< lg) */}
      <div className="flex lg:hidden bg-slate-200/90 p-1 rounded-xl text-xs font-semibold shrink-0 gap-1 shadow-sm">
        <button
          type="button"
          onClick={() => setMobileTab('catalog')}
          className={cn(
            'flex-1 py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all text-xs',
            mobileTab === 'catalog'
              ? 'bg-white text-slate-900 shadow font-bold'
              : 'text-slate-600 hover:text-slate-900'
          )}
        >
          <Search className="w-3.5 h-3.5" />
          <span>1. Medicines Catalog</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('cart')}
          className={cn(
            'flex-1 py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all text-xs',
            mobileTab === 'cart'
              ? 'bg-emerald-600 text-white shadow font-bold'
              : 'text-slate-600 hover:text-slate-900'
          )}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>2. Cart ({items.length}) • {formatCurrency(totals.grandTotal)}</span>
        </button>
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 flex flex-col lg:flex-row gap-5">
        {/* LEFT COLUMN: Product Catalog & Fast Search */}
        <div
          className={cn(
            'flex-1 flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden',
            mobileTab === 'cart' ? 'hidden lg:flex' : 'flex'
          )}
        >
          {/* Search Header */}
          <div className="p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-3">
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
                placeholder="Search Medicine name, Generic salt, SKU or scan Barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors shadow-sm"
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
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 max-h-[60vh] lg:max-h-[calc(100vh-230px)]">
            {isSearching && (
              <p className="text-xs text-slate-400 text-center py-6">Searching inventory...</p>
            )}

            {!isSearching && searchResults.length === 0 && searchQuery && (
              <div className="text-center py-8">
                <p className="text-xs text-slate-500">No matching medicines found for "{searchQuery}".</p>
              </div>
            )}

            {!isSearching && searchResults.length === 0 && !searchQuery && (
              <div className="text-center py-10 sm:py-16 text-slate-400 space-y-2">
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
                  className="p-3 rounded-xl border border-slate-200/90 hover:border-emerald-500 bg-white hover:bg-emerald-50/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 group shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">{product.name}</h4>
                      {product.scheduleType && product.scheduleType !== 'OTC' && (
                        <Badge variant="danger" className="text-[10px] py-0 px-1.5">
                          {product.scheduleType}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{product.genericName}</p>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] sm:text-[11px] text-slate-400 mt-1">
                      <span>Pack: {product.packSize || product.uom}</span>
                      <span>•</span>
                      <span>MRP: {formatCurrency(product.mrp)}</span>
                      <span>•</span>
                      {validBatch ? (
                        <span className="text-slate-600 font-medium">
                          FEFO: <strong className="text-slate-900">{validBatch.batchNumber}</strong> (Exp:{' '}
                          {formatDate(validBatch.expiryDate)})
                        </span>
                      ) : (
                        <span className="text-red-500 font-medium">No valid unexpired batch</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
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
                      <span className="text-xs sm:text-sm font-black text-slate-900 block">
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
        <div
          className={cn(
            'w-full lg:w-[460px] flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden shrink-0',
            mobileTab === 'catalog' ? 'hidden lg:flex' : 'flex'
          )}
        >
          {/* Customer & Prescription Header */}
          <div className="p-3 sm:p-3.5 border-b border-slate-100 bg-slate-50/70 space-y-2.5">
            {/* Customer Bar */}
            <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200/80">
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {customer ? customer.name : 'Walk-in Customer'}
                  </p>
                  {customer ? (
                    <p className="text-[10px] text-slate-500 truncate">
                      Ph: {customer.phone} | Due:{' '}
                      <strong className={customer.outstandingBalance > 0 ? 'text-red-600' : 'text-emerald-600'}>
                        {formatCurrency(customer.outstandingBalance)}
                      </strong>
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
          <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[45vh] lg:max-h-[calc(100vh-420px)]">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-300">
                <ShoppingCart className="w-8 h-8 stroke-1 mb-1" />
                <p className="text-xs text-slate-400">Cart is empty</p>
                <button
                  type="button"
                  onClick={() => setMobileTab('catalog')}
                  className="mt-2 text-xs font-semibold text-emerald-600 lg:hidden hover:underline"
                >
                  Browse medicines →
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.batchId}
                  className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate">{item.productName}</p>
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                        <span className="font-mono bg-slate-200/80 px-1 rounded">B:{item.batchNumber}</span>
                        <span>Exp: {formatDate(item.expiryDate)}</span>
                        <span>GST: {item.gstRate}%</span>
                      </div>
                    </div>
                    <button
                      onClick={() => removeItem(item.batchId)}
                      className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors shrink-0"
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
                        className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 font-bold"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-xs font-bold text-slate-900">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.batchId, item.quantity + 1)}
                        className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 font-bold"
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
          <div className="p-3.5 sm:p-4 border-t border-slate-200/80 bg-slate-50/80 space-y-3">
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
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
                className="flex-1 py-3 text-sm sm:text-base shadow-lg shadow-emerald-600/20"
                disabled={items.length === 0}
                isLoading={isCheckingOut}
                onClick={handleCheckout}
              >
                Checkout ({formatCurrency(totals.grandTotal)})
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Substitute Brands Recommendation Modal */}
      <Modal
        isOpen={showSubstitutes}
        onClose={() => setShowSubstitutes(false)}
        maxWidth="max-w-2xl"
        title="Alternative Medicine Brands (Same Composition)"
        subtitle={`Generic Salt: ${selectedSubGeneric}`}
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            Below are bioequivalent alternative brands available in stock with identical chemical formula and active
            salts:
          </p>
          {substituteList.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              No other alternative brands found in inventory for this formula.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {substituteList.map((sub) => (
                <div key={sub._id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">{sub.name}</h5>
                    <p className="text-[10px] text-slate-500">
                      Mfg: {sub.manufacturer?.shortName || sub.manufacturer?.name} • Pack: {sub.packSize}
                    </p>
                    <span className="text-[10px] font-semibold text-emerald-700">{sub.currentStock} in stock</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-slate-900">
                      {formatCurrency(sub.sellingPrice)}
                    </span>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        handleSelectMedicine(sub);
                        setShowSubstitutes(false);
                      }}
                    >
                      Dispense This
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Quick Customer Add / Select Modal */}
      <Modal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        maxWidth="max-w-md"
        title="Customer Profile & Khata"
        subtitle="Associate customer for digital cash memo, loyalty points and credit khata"
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Search Existing Customer</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by phone number or name..."
                value={customerSearch}
                onChange={(e) => handleSearchCustomers(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {customerList.length > 0 && (
              <div className="mt-2 divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                {customerList.map((c) => (
                  <div
                    key={c._id}
                    onClick={() => {
                      setCustomer(c);
                      setShowCustomerModal(false);
                    }}
                    className="p-2.5 hover:bg-slate-50 cursor-pointer flex justify-between items-center text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{c.name}</p>
                      <p className="text-[10px] text-slate-500">{c.phone}</p>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-700">Select</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100">
            <h5 className="text-xs font-bold text-slate-900 mb-2">Or Quick Register New Customer</h5>
            <form onSubmit={handleCreateCustomer} className="space-y-2.5">
              <Input
                label="Full Name"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                required
              />
              <Input
                label="Mobile Phone"
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
                placeholder="e.g. 9845012345"
                required
              />
              <Button type="submit" variant="primary" size="sm" className="w-full mt-2">
                Save & Link Customer
              </Button>
            </form>
          </div>
        </div>
      </Modal>

      {/* Post Checkout Thermal Print Receipt Modal */}
      <Modal
        isOpen={!!completedInvoice}
        onClose={() => setCompletedInvoice(null)}
        title="Thermal Cash Memo Bill"
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
