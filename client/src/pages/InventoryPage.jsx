import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Search,
  Filter,
  AlertTriangle,
  Clock,
  ArrowRightLeft,
  Trash2,
  Sliders,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import apiClient from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { formatCurrency, formatDate } from '../utils/cn';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

export const InventoryPage = () => {
  const { currentOutlet } = useAuthStore();
  const [batches, setBatches] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [expiryFilter, setExpiryFilter] = useState('all'); // 'all', 'valid', 'nearExpiry', 'expired'
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [actionType, setActionType] = useState(null); // 'adjust', 'writeOff', 'transfer'
  const [actionQty, setActionQty] = useState(1);
  const [actionReason, setActionReason] = useState('');
  const [targetOutletId, setTargetOutletId] = useState('');

  useEffect(() => {
    fetchOutlets();
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [expiryFilter, search, pagination.page, currentOutlet]);

  const fetchOutlets = async () => {
    try {
      const res = await apiClient.get('/system/outlets');
      setOutlets(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBatches = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/inventory/batches', {
        params: {
          outletId: currentOutlet?._id,
          expiryFilter: expiryFilter !== 'all' ? expiryFilter : undefined,
          page: pagination.page,
          limit: 15,
        },
      });
      setBatches(res.batches || []);
      setPagination(res.pagination || { page: 1, total: 0, pages: 1 });
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBatch) return;

    try {
      if (actionType === 'adjust') {
        await apiClient.post('/inventory/adjust', {
          batchId: selectedBatch._id,
          adjustedQuantity: actionQty,
          reason: actionReason,
        });
      } else if (actionType === 'writeOff') {
        await apiClient.post('/inventory/write-off', {
          batchId: selectedBatch._id,
          quantity: actionQty,
          type: selectedBatch.expiryState === 'EXPIRED' ? 'EXPIRY_WRITEOFF' : 'DAMAGE_WRITEOFF',
          reason: actionReason,
        });
      } else if (actionType === 'transfer') {
        await apiClient.post('/inventory/transfer', {
          fromOutletId: currentOutlet?._id,
          toOutletId: targetOutletId,
          batchId: selectedBatch._id,
          quantity: actionQty,
        });
      }

      setActionType(null);
      setSelectedBatch(null);
      fetchBatches();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Batch & Inventory Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            FEFO batch tracking, expiry monitoring, physical adjustments, and inter-store stock transfers
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
          {[
            { id: 'all', label: 'All Batches' },
            { id: 'valid', label: 'Valid Stock' },
            { id: 'nearExpiry', label: 'Near Expiry (<60d)' },
            { id: 'expired', label: 'Expired Stock' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setExpiryFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                expiryFilter === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Store: <strong className="text-slate-900">{currentOutlet?.name}</strong>
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Medicine & SKU</th>
                <th className="py-3 px-3">Batch Number</th>
                <th className="py-3 px-3">Expiry Date</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Cost Price</th>
                <th className="py-3 px-3 text-right">Selling Price</th>
                <th className="py-3 px-3 text-center">Available Stock</th>
                <th className="py-3 px-4 text-right">Stock Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">
                    Loading inventory batches...
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">
                    No batches match the selected expiry filter.
                  </td>
                </tr>
              ) : (
                batches.map((b) => (
                  <tr key={b._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">{b.product?.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        SKU: {b.product?.sku} | Rack: {b.locationRack || 'A-1'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-xs">
                        {b.batchNumber}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-800 block">{formatDate(b.expiryDate)}</span>
                      <span className="text-[10px] text-slate-400">
                        {b.daysToExpiry > 0 ? `${b.daysToExpiry} days left` : 'Expired'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {b.expiryState === 'EXPIRED' ? (
                        <Badge variant="danger">Expired</Badge>
                      ) : b.expiryState === 'NEAR_EXPIRY' ? (
                        <Badge variant="warning">Near Expiry</Badge>
                      ) : (
                        <Badge variant="success">Healthy FEFO</Badge>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-500">
                      {formatCurrency(b.purchaseCost)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(b.sellingPrice)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="font-black text-sm text-slate-900">{b.availableQuantity}</span>
                      <span className="text-[10px] text-slate-400 block">{b.product?.uom || 'Unit'}s</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedBatch(b);
                            setActionType('adjust');
                            setActionQty(b.availableQuantity);
                          }}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Physical Count Adjustment"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedBatch(b);
                            setActionType('transfer');
                            setActionQty(1);
                            const other = outlets.find((o) => o._id !== currentOutlet?._id);
                            if (other) setTargetOutletId(other._id);
                          }}
                          className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Transfer to Other Outlet"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedBatch(b);
                            setActionType('writeOff');
                            setActionQty(b.availableQuantity);
                          }}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title="Damage/Expiry Write-Off"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pagination.pages > 1 && (
          <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Total {pagination.total} batches</span>
            <div className="flex gap-1">
              <Button
                variant="secondary"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={pagination.page >= pagination.pages}
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Stock Action Modal */}
      <Modal
        isOpen={!!actionType}
        onClose={() => setActionType(null)}
        title={
          actionType === 'adjust'
            ? 'Physical Audit Stock Adjustment'
            : actionType === 'writeOff'
            ? 'Write-Off Damaged / Expired Batch'
            : 'Inter-Outlet Stock Transfer'
        }
        subtitle={`Medicine: ${selectedBatch?.product?.name} (Batch: ${selectedBatch?.batchNumber})`}
      >
        <form onSubmit={handleActionSubmit} className="space-y-4">
          {actionType === 'adjust' && (
            <>
              <p className="text-xs text-slate-500">
                Current recorded quantity: <strong>{selectedBatch?.availableQuantity}</strong> units. Enter the
                actual physical count found during inventory stocktake.
              </p>
              <Input
                label="Verified Physical Count"
                type="number"
                value={actionQty}
                onChange={(e) => setActionQty(parseInt(e.target.value) || 0)}
                required
              />
              <Input
                label="Audit Reason / Discrepancy Note"
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="e.g. Broken strips found / Physical audit variance"
                required
              />
            </>
          )}

          {actionType === 'writeOff' && (
            <>
              <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
                This will deduct units permanently from active sellable inventory and record an audit write-off.
              </p>
              <Input
                label="Quantity to Write-Off"
                type="number"
                max={selectedBatch?.availableQuantity}
                value={actionQty}
                onChange={(e) => setActionQty(parseInt(e.target.value) || 1)}
                required
              />
              <Input
                label="Disposal / Quarantine Reason"
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="e.g. Expired on shelf / Broken seal"
                required
              />
            </>
          )}

          {actionType === 'transfer' && (
            <>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Destination Pharmacy Outlet</label>
                <select
                  value={targetOutletId}
                  onChange={(e) => setTargetOutletId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800"
                  required
                >
                  {outlets
                    .filter((o) => o._id !== currentOutlet?._id)
                    .map((o) => (
                      <option key={o._id} value={o._id}>
                        {o.name} ({o.code})
                      </option>
                    ))}
                </select>
              </div>
              <Input
                label="Transfer Quantity"
                type="number"
                max={selectedBatch?.availableQuantity}
                value={actionQty}
                onChange={(e) => setActionQty(parseInt(e.target.value) || 1)}
                required
              />
            </>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={() => setActionType(null)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Confirm Action
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
