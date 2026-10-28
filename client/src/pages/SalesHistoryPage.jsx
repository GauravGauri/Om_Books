import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Search,
  Printer,
  RotateCcw,
  Calendar,
  Eye,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import apiClient from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { formatCurrency, formatDate } from '../utils/cn';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { ThermalReceipt } from '../components/common/ThermalReceipt';

export const SalesHistoryPage = () => {
  const { currentOutlet } = useAuthStore();
  const [invoices, setInvoices] = useState([]);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [isLoading, setIsLoading] = useState(true);

  // Detail / Print Modal
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Return & Refund Modal
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnInvoice, setReturnInvoice] = useState(null);
  const [returnItemBuffer, setReturnItemBuffer] = useState([]);
  const [refundMethod, setRefundMethod] = useState('Cash');
  const [returnReason, setReturnReason] = useState('Doctor changed prescription');

  useEffect(() => {
    fetchInvoices();
  }, [search, pagination.page, currentOutlet]);

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/pos/invoices', {
        params: {
          outletId: currentOutlet?._id,
          search,
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

  const handleOpenReturn = (inv) => {
    setReturnInvoice(inv);
    const returnable = inv.items.map((it) => ({
      productId: it.product,
      productName: it.productName,
      batchId: it.batch,
      batchNumber: it.batchNumber,
      unitPrice: it.unitPrice,
      maxReturnable: it.quantity - (it.returnedQuantity || 0),
      returnQty: 0,
      condition: 'Sellable',
    }));
    setReturnItemBuffer(returnable);
    setShowReturnModal(true);
  };

  const handleProcessReturn = async (e) => {
    e.preventDefault();
    const itemsToReturn = returnItemBuffer
      .filter((it) => it.returnQty > 0)
      .map((it) => ({
        productId: it.productId,
        productName: it.productName,
        batchId: it.batchId,
        quantity: it.returnQty,
        condition: it.condition,
      }));

    if (itemsToReturn.length === 0) {
      alert('Please specify quantity > 0 for at least one item to return.');
      return;
    }

    try {
      await apiClient.post('/returns', {
        originalInvoiceId: returnInvoice._id,
        items: itemsToReturn,
        refundMethod,
        reason: returnReason,
      });

      setShowReturnModal(false);
      fetchInvoices();
      alert('Sales return and refund recorded successfully!');
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Sales Register & Invoices</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit history of retail POS cash memos, reprint bills, and handle customer sales returns
          </p>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by Invoice Number, Customer Name or Phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Store: <strong className="text-slate-900">{currentOutlet?.name}</strong>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Invoice Number</th>
                <th className="py-3 px-3">Date & Time</th>
                <th className="py-3 px-3">Customer Details</th>
                <th className="py-3 px-3 text-right">Items</th>
                <th className="py-3 px-3 text-right">Taxable</th>
                <th className="py-3 px-3 text-right">GST Tax</th>
                <th className="py-3 px-3 text-right">Grand Total</th>
                <th className="py-3 px-3 text-center">Payment Mode</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan="10" className="py-8 text-center text-slate-400">
                    Loading sales records...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-8 text-center text-slate-400">
                    No sales invoices found.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                    <td className="py-3 px-3 text-slate-600">
                      <span>{formatDate(inv.createdAt)}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {new Date(inv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-900 block">{inv.customerName}</span>
                      <span className="text-[10px] text-slate-400">{inv.customerPhone || 'Walk-in'}</span>
                    </td>
                    <td className="py-3 px-3 text-right font-medium">
                      {inv.items?.reduce((acc, it) => acc + it.quantity, 0)} units
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-500">
                      {formatCurrency(inv.taxableTotal)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-500">{formatCurrency(inv.totalTax)}</td>
                    <td className="py-3 px-3 text-right font-mono font-black text-slate-900">
                      {formatCurrency(inv.grandTotal)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="font-semibold px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700">
                        {inv.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {inv.status === 'Completed' ? (
                        <Badge variant="success">Completed</Badge>
                      ) : inv.status === 'Partially Returned' ? (
                        <Badge variant="warning">Partial Return</Badge>
                      ) : (
                        <Badge variant="danger">Fully Returned</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setShowPrintModal(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Reprint Thermal Receipt"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        {inv.status !== 'Fully Returned' && (
                          <button
                            onClick={() => handleOpenReturn(inv)}
                            className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Sales Return & Refund"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
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

      {/* Reprint Thermal Receipt Modal */}
      <Modal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        title="Reprint Cash Memo"
        subtitle={`Invoice No: ${selectedInvoice?.invoiceNumber}`}
      >
        <ThermalReceipt
          invoice={selectedInvoice}
          outlet={currentOutlet}
          onClose={() => setShowPrintModal(false)}
        />
      </Modal>

      {/* Customer Return & Refund Modal */}
      <Modal
        isOpen={showReturnModal}
        onClose={() => setShowReturnModal(false)}
        maxWidth="max-w-3xl"
        title="Initiate Customer Sales Return & Refund"
        subtitle={`Original Bill: ${returnInvoice?.invoiceNumber} (${returnInvoice?.customerName})`}
      >
        <form onSubmit={handleProcessReturn} className="space-y-4">
          <p className="text-xs text-slate-600">
            Specify the units returned by the customer. If returned in <strong>Sellable</strong> condition, stock will
            be added back to the batch. If <strong>Damaged</strong>, it will be quarantined.
          </p>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold text-[10px] uppercase">
                <tr>
                  <th className="p-2.5">Medicine</th>
                  <th className="p-2.5">Batch</th>
                  <th className="p-2.5 text-right">Max Returnable</th>
                  <th className="p-2.5 text-right">Return Qty</th>
                  <th className="p-2.5">Stock Condition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {returnItemBuffer.map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-2.5 font-bold text-slate-900">{item.productName}</td>
                    <td className="p-2.5 font-mono">{item.batchNumber}</td>
                    <td className="p-2.5 text-right font-medium">{item.maxReturnable} units</td>
                    <td className="p-2.5 text-right">
                      <input
                        type="number"
                        min="0"
                        max={item.maxReturnable}
                        value={item.returnQty}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          const updated = [...returnItemBuffer];
                          updated[idx].returnQty = Math.min(item.maxReturnable, val);
                          setReturnItemBuffer(updated);
                        }}
                        className="w-16 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-right text-xs"
                      />
                    </td>
                    <td className="p-2.5">
                      <select
                        value={item.condition}
                        onChange={(e) => {
                          const updated = [...returnItemBuffer];
                          updated[idx].condition = e.target.value;
                          setReturnItemBuffer(updated);
                        }}
                        className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs"
                      >
                        <option value="Sellable">Sellable (Restock)</option>
                        <option value="Damaged">Damaged (Quarantine)</option>
                        <option value="Expired">Expired</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Refund Settlement Mode</label>
              <select
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
              >
                <option value="Cash">Cash Refund (Drawer)</option>
                <option value="UPI">UPI Refund</option>
                <option value="Khata Credit">Credit to Customer Khata Balance</option>
              </select>
            </div>

            <Input
              label="Return Reason"
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="e.g. Doctor changed prescription / adverse reaction"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={() => setShowReturnModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Confirm Return & Disburse Refund
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
