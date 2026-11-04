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
  Package,
  Layers,
  ArrowRightLeft,
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
  const { currentOutlet, user } = useAuthStore();
  const {
    items,
    addItem,
    updateQuantity,
    toggleLooseMode,
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
  const [cartNotification, setCartNotification] = useState('');

  // Marg ERP Dispensing Modal State (Loose vs Full Pack, Decimals)
  const [showDispenseModal, setShowDispenseModal] = useState(false);
  const [dispenseProduct, setDispenseProduct] = useState(null);
  const [dispenseBatch, setDispenseBatch] = useState(null);
  const [dispenseMode, setDispenseMode] = useState('loose'); // 'loose' | 'pack'
  const [dispenseAllowDecimal, setDispenseAllowDecimal] = useState(true);
  const [dispenseLooseQty, setDispenseLooseQty] = useState(1);
  const [dispensePackQty, setDispensePackQty] = useState(1);

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
  const dispenseQtyInputRef = useRef(null);

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

  // Search or load initial medicines
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await apiClient.get('/products', {
          params: {
            search: searchQuery && searchQuery.trim().length >= 1 ? searchQuery.trim() : undefined,
            outletId: currentOutlet?._id,
            limit: 20,
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

  const handleSelectMedicine = async (product) => {
    try {
      let batches = product.batches || [];

      // If no batches array is attached, fetch batches from backend
      if (batches.length === 0) {
        try {
          const res = await apiClient.get('/inventory/batches', {
            params: {
              product: product._id,
              outletId: currentOutlet?._id || undefined,
            },
          });
          batches = res.batches || [];
        } catch (err) {
          console.error('Failed to fetch batches on demand:', err);
        }
      }

      // Pick valid unexpired batch with positive stock (FEFO: oldest expiry first)
      const validBatches = batches.filter(
        (b) => b.availableQuantity > 0 && new Date(b.expiryDate) > new Date()
      );

      let chosenBatch = null;
      if (validBatches.length > 0) {
        validBatches.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
        chosenBatch = validBatches[0];
      } else {
        // Fallback: check any batch with positive availableQuantity
        const anyBatchesWithStock = batches.filter((b) => b.availableQuantity > 0);
        if (anyBatchesWithStock.length > 0) {
          anyBatchesWithStock.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
          chosenBatch = anyBatchesWithStock[0];
        }
      }

      if (!chosenBatch) {
        alert(
          `No active stock available for "${product.name}".\nPlease inward this medicine via "Purchases & Inward" (GRN) to add batches & stock.`
        );
        return;
      }

      // Check if medicine can be dispensed in loose units or decimals (Marg ERP flow)
      const isLooseCandidate =
        product.dosageForm === 'Tablet' ||
        product.dosageForm === 'Capsule' ||
        product.dosageForm === 'Respule' ||
        product.allowLooseSale === true ||
        Number(product.unitsPerPack) > 1;

      if (isLooseCandidate) {
        setDispenseProduct(product);
        setDispenseBatch(chosenBatch);
        const defaultLoose =
          product.dosageForm === 'Tablet' ||
          product.dosageForm === 'Capsule' ||
          product.dosageForm === 'Respule' ||
          product.allowLooseSale;
        setDispenseMode(defaultLoose ? 'loose' : 'pack');
        setDispenseAllowDecimal(product.allowLooseSale !== false);
        setDispenseLooseQty(1);
        setDispensePackQty(1);
        setShowDispenseModal(true);
        setTimeout(() => dispenseQtyInputRef.current?.focus(), 100);
      } else {
        // Direct non-loose pack sale (Syrups, Injections, Ointments, Packets)
        addItem(product, chosenBatch, 1, {
          isLoose: false,
          allowLooseSale: false,
          unitsPerPack: product.unitsPerPack || 1,
        });
        setCartNotification(`✓ Added "${product.name}" (1 ${product.uom || 'Pack'}) to bill`);
        setTimeout(() => setCartNotification(''), 2500);
      }
    } catch (err) {
      alert(err.message || 'Error adding item to billing cart');
    }
  };

  const handleConfirmDispense = (e) => {
    if (e) e.preventDefault();
    if (!dispenseProduct || !dispenseBatch) return;

    try {
      const isLoose = dispenseMode === 'loose';
      const conv = Math.max(1, Number(dispenseProduct.unitsPerPack || 10));
      const looseUnit =
        dispenseProduct.looseUnitName ||
        (dispenseProduct.dosageForm === 'Capsule'
          ? 'Cap'
          : dispenseProduct.dosageForm === 'Respule'
          ? 'Respule'
          : 'Tab');

      const qty = isLoose ? dispenseLooseQty : dispensePackQty;

      addItem(dispenseProduct, dispenseBatch, qty, {
        isLoose,
        looseQuantity: isLoose ? dispenseLooseQty : dispensePackQty * conv,
        unitsPerPack: conv,
        allowLooseSale: dispenseAllowDecimal,
        looseUnitName: looseUnit,
      });

      setShowDispenseModal(false);
      setCartNotification(
        `✓ Added "${dispenseProduct.name}" (${
          isLoose ? `${dispenseLooseQty} ${looseUnit}` : `${dispensePackQty} Strip`
        }) to bill`
      );
      setTimeout(() => setCartNotification(''), 2500);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults.length > 0) {
        handleSelectMedicine(searchResults[0]);
      }
    }
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
      const outletIdToUse = currentOutlet?._id || user?.outlets?.[0]?._id || user?.outlets?.[0];
      const payload = {
        outlet: outletIdToUse,
        outletId: outletIdToUse,
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
          isLoose: Boolean(it.isLoose),
          unitType: it.isLoose ? it.looseUnitName || 'Tab' : it.uom || 'Strip',
          unitsPerPack: it.unitsPerPack || 1,
          looseQuantity: it.isLoose ? it.looseQuantity : it.quantity * (it.unitsPerPack || 1),
          quantity: it.isLoose
            ? Math.round((it.looseQuantity / (it.unitsPerPack || 1)) * 10000) / 10000
            : it.quantity,
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

  // Dispense modal calculation helpers
  const dispenseConv = Math.max(1, Number(dispenseProduct?.unitsPerPack || 10));
  const dispenseLooseUnit =
    dispenseProduct?.looseUnitName ||
    (dispenseProduct?.dosageForm === 'Capsule'
      ? 'Cap'
      : dispenseProduct?.dosageForm === 'Respule'
      ? 'Respule'
      : 'Tab');
  const dispensePackPrice = dispenseBatch?.sellingPrice || dispenseProduct?.sellingPrice || 0;
  const dispenseTabPrice = Math.round((dispensePackPrice / dispenseConv) * 100) / 100;
  const dispenseLineTotal =
    dispenseMode === 'loose'
      ? Math.round(dispenseTabPrice * dispenseLooseQty * 100) / 100
      : Math.round(dispensePackPrice * dispensePackQty * 100) / 100;
  const dispenseEquivPacks =
    dispenseMode === 'loose' ? (dispenseLooseQty / dispenseConv).toFixed(2) : dispensePackQty;

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
          <span>2. Bill Cart ({items.length})</span>
          {totals.grandTotal > 0 && <span className="font-mono">₹{totals.grandTotal}</span>}
        </button>
      </div>

      {/* Main Split Layout: Products Shelf on Left, Cart Terminal on Right */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-0">
        {/* LEFT COLUMN: Fast Medicine Search & Shelf */}
        <div
          className={cn(
            'flex-1 flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden min-w-0',
            mobileTab === 'cart' ? 'hidden lg:flex' : 'flex'
          )}
        >
          {/* Search Header Bar */}
          <div className="p-3 sm:p-4 border-b border-slate-100 space-y-2 bg-slate-50/50">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search medicine brand, generic composition or scan barcode (F2)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Notification Toast */}
            {cartNotification && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3 py-1.5 rounded-xl font-medium flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{cartNotification}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileTab('cart')}
                  className="text-[11px] font-bold text-emerald-700 underline lg:hidden"
                >
                  View Cart →
                </button>
              </div>
            )}
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
              const inStock = product.currentStock > 0 || product.batches?.some((b) => b.availableQuantity > 0);
              const validBatch =
                product.batches?.find((b) => b.availableQuantity > 0 && new Date(b.expiryDate) > new Date()) ||
                product.batches?.find((b) => b.availableQuantity > 0);

              const conv = Math.max(1, Number(product.unitsPerPack || 10));
              const looseRate = conv > 1 ? (product.sellingPrice / conv).toFixed(2) : null;

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
                      {product.allowLooseSale && conv > 1 && (
                        <span className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.2 rounded font-bold">
                          Loose OK
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{product.genericName}</p>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] sm:text-[11px] text-slate-400 mt-1">
                      <span>Pack: {product.packSize || `${conv}'s`}</span>
                      <span>•</span>
                      <span>MRP: {formatCurrency(product.mrp)}</span>
                      {looseRate && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-700 font-bold">
                            ₹{looseRate}/{product.looseUnitName || 'Tab'}
                          </span>
                        </>
                      )}
                      <span>•</span>
                      {validBatch ? (
                        <span className="text-slate-600 font-medium">
                          FEFO: <strong className="text-slate-900">{validBatch.batchNumber}</strong> (Exp:{' '}
                          {formatDate(validBatch.expiryDate)})
                        </span>
                      ) : (
                        <span className={inStock ? 'text-amber-600' : 'text-red-500 font-medium'}>
                          {inStock ? 'Stock in Batches' : 'Out of stock'}
                        </span>
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
                      <span className={`text-[10px] font-bold ${inStock ? 'text-emerald-700' : 'text-red-500'}`}>
                        {product.currentStock || 0} in stock
                        {conv > 1 && inStock && (
                          <span className="block text-[9px] text-slate-400">
                            ({Math.floor((product.currentStock || 0) * conv)} {product.looseUnitName || 'tabs'})
                          </span>
                        )}
                      </span>
                    </div>

                    <Button variant="primary" size="sm" onClick={() => handleSelectMedicine(product)}>
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
            'w-full lg:w-[480px] flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden shrink-0',
            mobileTab === 'catalog' ? 'hidden lg:flex' : 'flex'
          )}
        >
          {/* Customer & Prescription Header */}
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                Customer: {customer ? customer.name : 'Walk-in / Cash'}
              </span>
              <button
                type="button"
                onClick={() => setShowCustomerModal(true)}
                className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                {customer ? 'Change' : '+ Add Customer'}
              </button>
            </div>

            {customer && (
              <div className="flex items-center justify-between text-[11px] text-slate-500 bg-white p-2 rounded-xl border border-slate-200">
                <span>Phone: {customer.phone}</span>
                <span>
                  Khata Due: <strong>{formatCurrency(customer.outstandingBalance || 0)}</strong>
                </span>
              </div>
            )}

            {/* Doctor & Rx inputs toggle */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <input
                type="text"
                placeholder="Doctor Name (Optional)"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
              />
              <input
                type="text"
                placeholder="Rx Number (Schedule H/X)"
                value={prescriptionNumber}
                onChange={(e) => setPrescriptionNumber(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Cart Items List: Loose Tabs & Full Strip support */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-[220px] max-h-[42vh]">
            {items.length === 0 ? (
              <div className="text-center py-12 text-slate-400 space-y-1">
                <Receipt className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-semibold">Bill is empty</p>
                <p className="text-[11px]">Click "Add" on any medicine to start billing</p>
              </div>
            ) : (
              items.map((it) => {
                const isLoose = Boolean(it.isLoose);
                const currentQty = isLoose ? it.looseQuantity : it.quantity;
                const unitLabel = isLoose ? it.looseUnitName || 'Tab' : it.uom || 'Strip';
                const lineAmount = isLoose ? it.unitPrice * it.looseQuantity : it.unitPrice * it.quantity;

                return (
                  <div
                    key={it.id || it.batchId}
                    className="p-2.5 rounded-xl border border-slate-200/90 bg-slate-50/50 flex flex-col gap-1.5 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h5 className="font-bold text-slate-900 truncate">{it.productName}</h5>
                          {isLoose ? (
                            <span className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.2 rounded font-bold shrink-0">
                              Loose Dispensed
                            </span>
                          ) : (
                            <span className="bg-slate-200 text-slate-700 text-[9px] px-1.5 py-0.2 rounded font-medium shrink-0">
                              Full {it.uom || 'Strip'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                          <span className="font-mono">B:{it.batchNumber}</span>
                          <span>•</span>
                          <span>
                            Rate: {formatCurrency(it.unitPrice)}/{unitLabel}
                          </span>
                          <span>•</span>
                          <span>MRP: {formatCurrency(it.mrp)}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(it.id || it.batchId)}
                        className="p-1 text-slate-400 hover:text-red-500 rounded shrink-0"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      {/* Quantity controls */}
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
                          <button
                            type="button"
                            onClick={() => updateQuantity(it.id || it.batchId, currentQty - 1)}
                            className="p-1 hover:bg-slate-100 text-slate-600"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            step={isLoose ? '1' : '0.1'}
                            value={currentQty}
                            onChange={(e) =>
                              updateQuantity(
                                it.id || it.batchId,
                                isLoose ? parseInt(e.target.value) || 1 : parseFloat(e.target.value) || 1
                              )
                            }
                            className="w-10 text-center font-bold text-slate-900 font-mono text-xs border-0 p-0 focus:ring-0 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => updateQuantity(it.id || it.batchId, currentQty + 1)}
                            className="p-1 hover:bg-slate-100 text-slate-600"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="font-bold text-slate-700 text-[11px]">{unitLabel}s</span>

                        {/* Switch mode toggle */}
                        {(it.unitsPerPack > 1 || it.allowLooseSale) && (
                          <button
                            type="button"
                            onClick={() => toggleLooseMode(it.id || it.batchId)}
                            className="text-[10px] text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded flex items-center gap-1 ml-1"
                            title={isLoose ? 'Switch to Full Strip' : 'Switch to Loose Tablets'}
                          >
                            <ArrowRightLeft className="w-2.5 h-2.5" />
                            {isLoose ? 'To Strip' : 'To Loose Tabs'}
                          </button>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-black text-slate-900 text-sm">
                          {formatCurrency(lineAmount)}
                        </span>
                        {isLoose && (
                          <span className="block text-[9px] text-slate-400 font-mono">
                            ({it.quantity} strip)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Checkout Totals & Payment Mode Drawer */}
          <div className="p-3.5 border-t border-slate-200 bg-slate-50 space-y-3">
            {/* Quick Bill Totals summary */}
            <div className="space-y-1.5 text-xs text-slate-600 font-medium">
              <div className="flex justify-between">
                <span>Taxable Amount ({items.length} items):</span>
                <span className="font-mono">{formatCurrency(totals.taxableTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total GST Tax (CGST + SGST):</span>
                <span className="font-mono">{formatCurrency(totals.totalTax)}</span>
              </div>
              {totals.roundOff !== 0 && (
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Round off:</span>
                  <span className="font-mono">{totals.roundOff > 0 ? `+${totals.roundOff}` : totals.roundOff}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-sm font-black text-slate-900">Total Payable:</span>
                <span className="text-xl font-black text-emerald-700 font-mono">
                  {formatCurrency(totals.grandTotal)}
                </span>
              </div>
            </div>

            {/* Payment Mode Selector */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                Select Tender Mode
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {[
                  { id: 'Cash', label: 'Cash', icon: Banknote },
                  { id: 'UPI', label: 'UPI / QR', icon: QrCode },
                  { id: 'Card', label: 'Card', icon: CreditCard },
                  { id: 'Credit', label: 'Khata Due', icon: UserCheck },
                ].map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      className={cn(
                        'py-2 px-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 border transition-all',
                        paymentMethod === m.id
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/30'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {checkoutError && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                {checkoutError}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="md"
                onClick={clearCart}
                disabled={items.length === 0}
                className="flex-1"
              >
                Clear
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleCheckout}
                disabled={items.length === 0 || isCheckingOut}
                isLoading={isCheckingOut}
                className="flex-2 py-3 text-sm font-bold shadow-md shadow-emerald-600/20"
              >
                Complete Bill (₹{totals.grandTotal})
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* MARG ERP STYLE LOOSE / DECIMAL DISPENSING MODAL */}
      <Modal
        isOpen={showDispenseModal}
        onClose={() => setShowDispenseModal(false)}
        maxWidth="max-w-md"
        title="Dispense Medicine (Marg ERP Flow)"
        subtitle={`${dispenseProduct?.name || ''} (${dispenseProduct?.genericName || ''})`}
      >
        <form onSubmit={handleConfirmDispense} className="space-y-4">
          {/* Stock & Batch info banner */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
            <div className="flex justify-between font-medium">
              <span className="text-slate-500">Selected Batch:</span>
              <span className="font-mono font-bold text-slate-800">{dispenseBatch?.batchNumber}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-slate-500">Expiry Date:</span>
              <span className="text-slate-800">{dispenseBatch ? formatDate(dispenseBatch.expiryDate) : ''}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-slate-500">Available Stock:</span>
              <span className="font-bold text-emerald-700 font-mono">
                {dispenseBatch?.availableQuantity || 0} Strips (
                {Math.floor((dispenseBatch?.availableQuantity || 0) * dispenseConv)} {dispenseLooseUnit}s)
              </span>
            </div>
          </div>

          {/* Question: Can this item be sold in decimals? */}
          <div className="p-2.5 bg-emerald-50/60 border border-emerald-200 rounded-xl">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-emerald-950 font-semibold">
              <input
                type="checkbox"
                checked={dispenseAllowDecimal}
                onChange={(e) => setDispenseAllowDecimal(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
              <span>Can this item be sold in decimals / loose units? (Marg ERP)</span>
            </label>
            <p className="text-[10px] text-emerald-800 pl-6 mt-0.5">
              Allows breaking strips to sell exact requested tablets (e.g. 7 tabs out of 10)
            </p>
          </div>

          {/* Mode Selector: Loose Tablets vs Full Strip */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
              Select Dispensing Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!dispenseAllowDecimal}
                onClick={() => setDispenseMode('loose')}
                className={cn(
                  'p-3 rounded-xl border text-left transition-all flex flex-col gap-1',
                  dispenseMode === 'loose'
                    ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50 opacity-90'
                )}
              >
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
                  Loose ({dispenseLooseUnit}s)
                </span>
                <span className="text-xs font-bold text-emerald-700 font-mono">
                  {formatCurrency(dispenseTabPrice)} / {dispenseLooseUnit}
                </span>
                <span className="text-[10px] text-slate-500">Sell exact tablets needed</span>
              </button>

              <button
                type="button"
                onClick={() => setDispenseMode('pack')}
                className={cn(
                  'p-3 rounded-xl border text-left transition-all flex flex-col gap-1',
                  dispenseMode === 'pack'
                    ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50 opacity-90'
                )}
              >
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                  Full Strip ({dispenseConv} {dispenseLooseUnit}s)
                </span>
                <span className="text-xs font-bold text-slate-800 font-mono">
                  {formatCurrency(dispensePackPrice)} / Strip
                </span>
                <span className="text-[10px] text-slate-500">Sell full sealed pack</span>
              </button>
            </div>
          </div>

          {/* Quantity Input based on chosen mode */}
          {dispenseMode === 'loose' ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  How many {dispenseLooseUnit}s does the customer need?
                </label>
                <span className="text-[11px] text-slate-500">
                  Pack has {dispenseConv} {dispenseLooseUnit}s
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  ref={dispenseQtyInputRef}
                  type="number"
                  min="1"
                  max={Math.floor((dispenseBatch?.availableQuantity || 0) * dispenseConv)}
                  value={dispenseLooseQty}
                  onChange={(e) => setDispenseLooseQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-base font-bold text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
                <span className="font-bold text-slate-700 text-sm">{dispenseLooseUnit}s</span>
              </div>

              {/* Quick shortcut buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-400 font-medium">Quick:</span>
                {[1, 2, 5, 7, 10, dispenseConv].filter((v, i, a) => a.indexOf(v) === i).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setDispenseLooseQty(n)}
                    className={cn(
                      'px-2 py-0.5 rounded-lg text-xs font-semibold border transition-all',
                      dispenseLooseQty === n
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    )}
                  >
                    {n} {dispenseLooseUnit}s
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 block">
                Number of Full Strips / Packs
              </label>
              <div className="flex items-center gap-2">
                <input
                  ref={dispenseQtyInputRef}
                  type="number"
                  min="1"
                  step="1"
                  value={dispensePackQty}
                  onChange={(e) => setDispensePackQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-base font-bold text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
                <span className="font-bold text-slate-700 text-sm">Strips</span>
              </div>
            </div>
          )}

          {/* Live Calculations Preview Banner */}
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-600 block">Line Total to Bill:</span>
              <span className="text-lg font-black text-emerald-800 font-mono">
                {formatCurrency(dispenseLineTotal)}
              </span>
            </div>
            <div className="text-right text-[11px] text-slate-500 font-mono">
              <span>
                Deduction: <strong>{dispenseEquivPacks}</strong> Strips
              </span>
              <span className="block text-[10px] text-emerald-700 font-semibold">
                {dispenseMode === 'loose'
                  ? `${dispenseLooseQty} ${dispenseLooseUnit}s @ ${formatCurrency(dispenseTabPrice)}`
                  : `${dispensePackQty} Strip @ ${formatCurrency(dispensePackPrice)}`}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={() => setShowDispenseModal(false)}>
              Cancel (Esc)
            </Button>
            <Button variant="primary" type="submit" className="font-bold">
              Add {dispenseMode === 'loose' ? `${dispenseLooseQty} ${dispenseLooseUnit}s` : `${dispensePackQty} Strip`} to Bill
            </Button>
          </div>
        </form>
      </Modal>

      {/* Completed Invoice Print Modal */}
      <Modal
        isOpen={!!completedInvoice}
        onClose={() => setCompletedInvoice(null)}
        title="Payment Received & Invoice Generated"
        subtitle={`Invoice No: ${completedInvoice?.invoiceNumber}`}
      >
        <ThermalReceipt
          invoice={completedInvoice}
          outlet={currentOutlet}
          onClose={() => setCompletedInvoice(null)}
        />
      </Modal>

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
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" size="sm" type="button" onClick={() => setShowCustomerModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Save & Select
                </Button>
              </div>
            </form>
          </div>
        </div>
      </Modal>
    </div>
  );
};
