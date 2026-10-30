import React, { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  Plus,
  Phone,
  Mail,
  Wallet,
  ArrowUpRight,
  CheckCircle2,
  FileText,
  MessageCircle,
  Copy,
  Printer,
  Receipt,
  RotateCcw,
} from 'lucide-react';
import apiClient from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { formatCurrency, formatDate } from '../utils/cn';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

export const SuppliersPage = () => {
  const { currentOutlet } = useAuthStore();
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Pay Supplier Modal
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [disburseAmount, setDisburseAmount] = useState(0);
  const [disburseMethod, setDisburseMethod] = useState('Bank Transfer');
  const [disburseNotes, setDisburseNotes] = useState('');
  const [showPayModal, setShowPayModal] = useState(false);

  // Ledger & WhatsApp Modal
  const [selectedLedgerSupplier, setSelectedLedgerSupplier] = useState(null);
  const [ledgerHistory, setLedgerHistory] = useState({ invoices: [], payments: [], returns: [] });
  const [isLedgerLoading, setIsLedgerLoading] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [copiedLedger, setCopiedLedger] = useState(false);

  // Add Supplier Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    companyName: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    city: 'Bengaluru',
    gstin: '',
    paymentTerms: '30 Days Net',
  });

  useEffect(() => {
    fetchSuppliers();
  }, [search]);

  const fetchSuppliers = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/suppliers', { params: { search, limit: 50 } });
      setSuppliers(res.suppliers || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenPay = (sup) => {
    setSelectedSupplier(sup);
    setDisburseAmount(sup.outstandingBalance);
    setShowPayModal(true);
  };

  const handleOpenLedger = async (sup) => {
    setSelectedLedgerSupplier(sup);
    setWhatsappPhone(sup.phone || '');
    setShowLedgerModal(true);
    setIsLedgerLoading(true);
    try {
      const res = await apiClient.get(`/suppliers/${sup._id}/history`);
      setLedgerHistory(res.data || { invoices: [], payments: [], returns: [] });
    } catch (err) {
      console.error('Failed to load supplier ledger history:', err);
    } finally {
      setIsLedgerLoading(false);
    }
  };

  const buildLedgerMessage = (supplier, history) => {
    const storeName = currentOutlet?.name || 'HomeBooks Central Pharmacy';
    const storePhone = currentOutlet?.phone || '';
    const today = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    const invoices = history?.invoices || [];
    const payments = history?.payments || [];
    const returns = history?.returns || [];

    const totalInvoiced = invoices.reduce((acc, inv) => acc + (inv.grandTotal || 0), 0);
    const totalPaid = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
    const totalReturned = returns.reduce((acc, r) => acc + (r.totalRefundAmount || 0), 0);

    let msg = `*SUPPLIER STATEMENT OF ACCOUNT / LEDGER*\n`;
    msg += `----------------------------------------\n`;
    msg += `🏢 *From:* ${storeName}\n`;
    if (storePhone) msg += `📞 *Store Contact:* ${storePhone}\n`;
    msg += `🗓️ *Statement Date:* ${today}\n\n`;

    msg += `🏬 *Supplier Account:* ${supplier.companyName}\n`;
    if (supplier.contactPerson) msg += `👤 *Attn:* ${supplier.contactPerson}\n`;
    if (supplier.gstin) msg += `🧾 *GSTIN:* ${supplier.gstin}\n`;
    if (supplier.paymentTerms) msg += `⏱️ *Terms:* ${supplier.paymentTerms}\n\n`;

    msg += `💰 *CURRENT OUTSTANDING PAYABLE:* ₹${(supplier.outstandingBalance || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}\n`;
    msg += `----------------------------------------\n`;
    msg += `📊 *LEDGER SUMMARY:*\n`;
    msg += `• Total Bills (Inward): ${invoices.length} (₹${totalInvoiced.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
    })})\n`;
    msg += `• Total Paid / Disbursed: ${payments.length} (₹${totalPaid.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
    })})\n`;
    if (returns.length > 0) {
      msg += `• Total Purchase Returns: ${returns.length} (₹${totalReturned.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
      })})\n`;
    }
    msg += `• *Net Outstanding Due:* ₹${(supplier.outstandingBalance || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
    })}\n`;
    msg += `----------------------------------------\n`;

    // Combine recent transactions
    const combined = [
      ...invoices.map((i) => ({
        date: i.createdAt,
        type: 'INWARD BILL',
        ref: i.supplierInvoiceNumber || i.invoiceNumber,
        amt: `+₹${(i.grandTotal || 0).toLocaleString('en-IN')}`,
      })),
      ...payments.map((p) => ({
        date: p.createdAt,
        type: `PAID (${p.paymentMethod || 'Bank Transfer'})`,
        ref: p.paymentNumber || p.notes || 'Payment',
        amt: `-₹${(p.amount || 0).toLocaleString('en-IN')}`,
      })),
      ...returns.map((r) => ({
        date: r.createdAt,
        type: 'RETURN',
        ref: r.returnNumber || 'Purchase Return',
        amt: `-₹${(r.totalRefundAmount || 0).toLocaleString('en-IN')}`,
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (combined.length > 0) {
      msg += `📜 *RECENT TRANSACTIONS:*\n`;
      combined.slice(0, 6).forEach((t, idx) => {
        const dt = new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        msg += `${idx + 1}. [${t.type}] ${t.ref} | ${t.amt} | ${dt}\n`;
      });
      msg += `----------------------------------------\n`;
    }

    msg += `_This is a computer-generated account ledger from ${storeName}._\n`;
    msg += `_Please review and confirm reconciliation._`;

    return msg;
  };

  const handleSendWhatsApp = (targetPhone) => {
    if (!selectedLedgerSupplier) return;
    const phoneToSend = (targetPhone || whatsappPhone || selectedLedgerSupplier.phone || '').trim();
    if (!phoneToSend) {
      alert('Please enter a valid WhatsApp phone number for this supplier.');
      return;
    }

    let cleanPhone = phoneToSend.replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`;
    }

    const message = buildLedgerMessage(selectedLedgerSupplier, ledgerHistory);
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDirectWhatsApp = async (supplier, e) => {
    e.stopPropagation();
    try {
      const res = await apiClient.get(`/suppliers/${supplier._id}/history`);
      const hist = res.data || { invoices: [], payments: [], returns: [] };
      const message = buildLedgerMessage(supplier, hist);

      let cleanPhone = (supplier.phone || '').replace(/\D/g, '');
      if (cleanPhone.length === 10) {
        cleanPhone = `91${cleanPhone}`;
      }
      if (!cleanPhone) {
        handleOpenLedger(supplier);
        return;
      }
      const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      handleOpenLedger(supplier);
    }
  };

  const handleCopyLedger = () => {
    if (!selectedLedgerSupplier) return;
    const text = buildLedgerMessage(selectedLedgerSupplier, ledgerHistory);
    navigator.clipboard.writeText(text);
    setCopiedLedger(true);
    setTimeout(() => setCopiedLedger(false), 2500);
  };

  const handleDisburseSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSupplier) return;

    try {
      await apiClient.post(`/suppliers/${selectedSupplier._id}/pay`, {
        amount: Number(disburseAmount),
        paymentMethod: disburseMethod,
        notes: disburseNotes,
        outletId: currentOutlet?._id,
      });

      setShowPayModal(false);
      fetchSuppliers();
      alert('Wholesaler payment disbursed and ledger balance updated!');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/suppliers', newSupplier);
      setShowAddModal(false);
      setNewSupplier({
        companyName: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        city: 'Bengaluru',
        gstin: '',
        paymentTerms: '30 Days Net',
      });
      fetchSuppliers();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Suppliers & Pharma Wholesalers</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Vendor accounts, payment terms, GST compliance, and outstanding payable credit ledgers
          </p>
        </div>
        <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowAddModal(true)}>
          Add New Supplier
        </Button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by supplier name, contact person, phone, or GSTIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Company Name</th>
                <th className="py-3 px-3">Contact Person</th>
                <th className="py-3 px-3">Contact Numbers</th>
                <th className="py-3 px-3">GSTIN Number</th>
                <th className="py-3 px-3">Payment Terms</th>
                <th className="py-3 px-3 text-right">Outstanding Payable</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    Loading supplier accounts...
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    No supplier accounts found.
                  </td>
                </tr>
              ) : (
                suppliers.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">{s.companyName}</span>
                      <span className="text-[10px] text-slate-400">{s.address || s.city}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-800">{s.contactPerson || 'N/A'}</td>
                    <td className="py-3 px-3">
                      <span className="font-mono text-slate-800 block">{s.phone}</span>
                      {s.email && <span className="text-[10px] text-slate-400">{s.email}</span>}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-700">{s.gstin || 'Unregistered'}</td>
                    <td className="py-3 px-3">
                      <Badge variant="default">{s.paymentTerms}</Badge>
                    </td>
                    <td className="py-3 px-3 text-right font-mono">
                      <span
                        className={`font-black text-sm ${
                          s.outstandingBalance > 0 ? 'text-amber-600' : 'text-slate-400'
                        }`}
                      >
                        {formatCurrency(s.outstandingBalance)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Send Ledger to WhatsApp Button */}
                        <button
                          onClick={(e) => handleDirectWhatsApp(s, e)}
                          title="Send Ledger Statement to Supplier's WhatsApp"
                          className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-200"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>

                        {/* View Ledger Button */}
                        <button
                          onClick={() => handleOpenLedger(s)}
                          title="View Ledger Statement & History"
                          className="px-2.5 py-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 text-xs font-semibold flex items-center gap-1"
                        >
                          <FileText className="w-3 h-3 text-slate-500" />
                          Ledger
                        </button>

                        {/* Disburse Payment Button */}
                        {s.outstandingBalance > 0 && (
                          <Button variant="primary" size="sm" onClick={() => handleOpenPay(s)}>
                            Pay Due
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Supplier Ledger & WhatsApp Modal */}
      <Modal
        isOpen={showLedgerModal}
        onClose={() => setShowLedgerModal(false)}
        maxWidth="max-w-4xl"
        title="Supplier Ledger & Statement"
        subtitle={`Wholesaler: ${selectedLedgerSupplier?.companyName} | GSTIN: ${
          selectedLedgerSupplier?.gstin || 'N/A'
        }`}
      >
        <div className="space-y-5">
          {/* WhatsApp Sharing Card */}
          <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shrink-0">
                  <MessageCircle className="w-4 h-4 fill-white" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Send Ledger Statement via WhatsApp</h4>
                  <p className="text-[11px] text-slate-600">
                    Instantly share reconciliation statement, outstanding due, and bill history with the supplier
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="WhatsApp Number..."
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  className="bg-white border border-emerald-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-mono w-36 sm:w-40 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <button
                type="button"
                onClick={() => handleSendWhatsApp(whatsappPhone)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5 fill-white" />
                Send WhatsApp
              </button>

              <button
                type="button"
                onClick={handleCopyLedger}
                title="Copy statement text to clipboard"
                className="p-1.5 bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs transition-colors"
              >
                {copiedLedger ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Supplier Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">Current Due Payable</span>
              <p className="text-base font-black text-amber-600 mt-0.5">
                {formatCurrency(selectedLedgerSupplier?.outstandingBalance)}
              </p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">Total Inward Invoices</span>
              <p className="text-base font-bold text-slate-900 mt-0.5">
                {(ledgerHistory.invoices || []).length} bills (
                {formatCurrency(
                  (ledgerHistory.invoices || []).reduce((acc, it) => acc + (it.grandTotal || 0), 0)
                )}
                )
              </p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">Total Payments Made</span>
              <p className="text-base font-bold text-emerald-700 mt-0.5">
                {(ledgerHistory.payments || []).length} vouchers (
                {formatCurrency((ledgerHistory.payments || []).reduce((acc, it) => acc + (it.amount || 0), 0))}
                )
              </p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">Credit Terms</span>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">
                {selectedLedgerSupplier?.paymentTerms || '30 Days Net'}
              </p>
            </div>
          </div>

          {/* Transactions Statement Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 font-bold text-xs text-slate-800 flex justify-between items-center">
              <span>Ledger Transaction History</span>
              {isLedgerLoading && <span className="text-slate-400 font-normal">Loading history...</span>}
            </div>
            <div className="max-h-72 overflow-y-auto overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[550px]">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Invoice / Ref No</th>
                    <th className="py-2.5 px-3 text-right">Debit / Credit Amount</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {isLedgerLoading ? (
                    <tr>
                      <td colSpan="5" className="py-6 text-center text-slate-400">
                        Loading statement records...
                      </td>
                    </tr>
                  ) : (ledgerHistory.invoices || []).length === 0 &&
                    (ledgerHistory.payments || []).length === 0 &&
                    (ledgerHistory.returns || []).length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-6 text-center text-slate-400">
                        No transactions recorded for this supplier yet.
                      </td>
                    </tr>
                  ) : (
                    [
                      ...(ledgerHistory.invoices || []).map((inv) => ({
                        _id: inv._id,
                        date: inv.createdAt,
                        type: 'Purchase Invoice',
                        ref: inv.supplierInvoiceNumber || inv.invoiceNumber,
                        amount: inv.grandTotal,
                        isCredit: true,
                        status: inv.paymentStatus || 'Received',
                      })),
                      ...(ledgerHistory.payments || []).map((p) => ({
                        _id: p._id,
                        date: p.createdAt,
                        type: `Disbursement (${p.paymentMethod || 'Bank Transfer'})`,
                        ref: p.paymentNumber || p.notes || 'Payment',
                        amount: p.amount,
                        isCredit: false,
                        status: 'Paid',
                      })),
                      ...(ledgerHistory.returns || []).map((r) => ({
                        _id: r._id,
                        date: r.createdAt,
                        type: 'Purchase Return',
                        ref: r.returnNumber || 'Debit Note',
                        amount: r.totalRefundAmount,
                        isCredit: false,
                        status: 'Adjusted',
                      })),
                    ]
                      .sort((a, b) => new Date(b.date) - new Date(a.date))
                      .map((item, idx) => (
                        <tr key={item._id || idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 text-slate-600">{formatDate(item.date)}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                item.isCredit
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {item.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{item.ref}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold">
                            <span className={item.isCredit ? 'text-amber-600' : 'text-emerald-600'}>
                              {item.isCredit ? '+' : '-'}
                              {formatCurrency(item.amount)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <Badge variant={item.status === 'Paid' ? 'success' : 'default'}>{item.status}</Badge>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-slate-100">
            <span className="text-xs text-slate-500 font-medium">
              Registered Phone: <strong className="font-mono text-slate-800">{selectedLedgerSupplier?.phone}</strong>
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setShowLedgerModal(false)}>
                Close
              </Button>
              <Button
                variant="primary"
                icon={MessageCircle}
                onClick={() => handleSendWhatsApp(whatsappPhone)}
              >
                Send WhatsApp Statement
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Disburse Payment Modal */}
      <Modal
        isOpen={showPayModal}
        onClose={() => setShowPayModal(false)}
        title="Disburse Supplier Payment"
        subtitle={`Wholesaler: ${selectedSupplier?.companyName} (Outstanding Due: ${formatCurrency(
          selectedSupplier?.outstandingBalance
        )})`}
      >
        <form onSubmit={handleDisburseSubmit} className="space-y-4">
          <Input
            label="Payment Amount (₹)"
            type="number"
            value={disburseAmount}
            onChange={(e) => setDisburseAmount(parseFloat(e.target.value) || 0)}
            required
          />

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Disbursement Channel</label>
            <select
              value={disburseMethod}
              onChange={(e) => setDisburseMethod(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
            >
              <option value="Bank Transfer">NEFT / RTGS / Net Banking</option>
              <option value="UPI">UPI</option>
              <option value="Cheque">Bank Cheque</option>
              <option value="Cash">Cash Counter</option>
            </select>
          </div>

          <Input
            label="UTR / Cheque / Reference Number"
            value={disburseNotes}
            onChange={(e) => setDisburseNotes(e.target.value)}
            placeholder="e.g. UTR-HDFC98129031"
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={() => setShowPayModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Confirm Disbursement
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Supplier Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Pharma Wholesaler / Distributor"
        subtitle="Configure supplier account, GSTIN, and credit terms"
      >
        <form onSubmit={handleAddSubmit} className="space-y-3">
          <Input
            label="Wholesaler Company Name"
            value={newSupplier.companyName}
            onChange={(e) => setNewSupplier({ ...newSupplier, companyName: e.target.value })}
            placeholder="e.g. Apex Pharma Distributors"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Contact Person"
              value={newSupplier.contactPerson}
              onChange={(e) => setNewSupplier({ ...newSupplier, contactPerson: e.target.value })}
              placeholder="e.g. Rajesh Shah"
            />
            <Input
              label="Phone Number"
              value={newSupplier.phone}
              onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
              placeholder="e.g. 9845012345"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Email Address"
              type="email"
              value={newSupplier.email}
              onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
              placeholder="orders@apexpharma.in"
            />
            <Input
              label="GSTIN Number"
              value={newSupplier.gstin}
              onChange={(e) => setNewSupplier({ ...newSupplier, gstin: e.target.value.toUpperCase() })}
              placeholder="29AAAAA0000A1Z5"
            />
          </div>
          <Input
            label="Warehouse / Depot Address"
            value={newSupplier.address}
            onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
            placeholder="e.g. Plot 12, APMC Yard, Yeshwanthpur"
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Wholesaler
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
