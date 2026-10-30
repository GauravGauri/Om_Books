import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Search,
  AlertTriangle,
  Clock,
  ArrowRightLeft,
  Sliders,
  Trash2,
  CheckCircle,
  FileText,
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
  const [search, setSearch] = useState('');
  const [expiryFilter, setExpiryFilter] = useState('all'); // all, nearExpiry, expired, valid
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [isLoading, setIsLoading] = useState(true);

  // Stock Adjustment / Quarantine modal state
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [actionType, setActionType] = useState(null); // 'adjust' | 'writeOff' | 'transfer'
  const [actionQty, setActionQty] = useState(1);
  const [actionReason, setActionReason] = useState('');
  const [targetOutletId, setTargetOutletId] = useState('');

  useEffect(() => {
    fetchOutlets();
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [search, expiryFilter, pagination.page, currentOutlet]);

  const fetchOutlets = async () => {
    try {
      const res = await apiClient.get('/system/outlets');
      setOutlets(res.data || []);
      if (res.data?.length > 1) {
        const other = res.data.find((o) => o._id !== currentOutlet?._id);
        if (other) setTargetOutletId(other._id);
      }
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
          search,
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

  const handleOpenAction = (batch, type) => {
    setSelectedBatch(batch);
    setActionType(type);
    setActionQty(type === 'adjust' ? batch.availableQuantity : 1);
    setActionReason(
      type === 'writeOff'
        ? 'Damaged packaging / Expired'
        : type === 'adjust'
        ? 'Physical stock audit variance'
        : 'Inter-branch stock requisition'
    );
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
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold overflow-x-auto whitespace-nowrap max-w-full">
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
          Store: <strong className="text-slate-900">{currentOutlet?.name || 'All Outlets'}</strong>
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[720px]">
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
                    No inventory batches found matching filter.
                  </td>
                </tr>
              ) : (
                batches.map((b) => (
                  <tr key={b._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">{b.product?.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{b.product?.sku}</span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      <span>{b.batchNumber}</span>
                      {b.locationRack && (
                        <span className="text-[10px] text-slate-400 block font-sans">Loc: {b.locationRack}</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span>{formatDate(b.expiryDate)}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {b.daysRemaining < 0
                          ? `${Math.abs(b.daysRemaining)}d Expired`
                          : `${b.daysRemaining} days left`}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {b.expiryState === 'EXPIRED' ? (
                        <Badge variant="danger">Expired</Badge>
                      ) : b.expiryState === 'NEAR_EXPIRY' ? (
                        <Badge variant="warning">Near Expiry</Badge>
                      ) : (
                        <Badge variant="success">Healthy</Badge>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-500">
                      {formatCurrency(b.purchaseCost)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-900 font-bold">
                      {formatCurrency(b.sellingPrice)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`font-mono font-bold text-xs ${
                          b.availableQuantity <= 10 ? 'text-amber-600' : 'text-slate-900'
                        }`}
                      >
                        {b.availableQuantity} units
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenAction(b, 'adjust')}
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Stock Audit & Adjustment"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenAction(b, 'transfer')}
                          className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Inter-branch Store Transfer"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenAction(b, 'writeOff')}
                          className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title="Damage / Expiry Write-Off"
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
      </div>

      {/* Stock Operations Modal */}
      <Modal
        isOpen={!!actionType}
        onClose={() => setActionType(null)}
        title={
          actionType === 'adjust'
            ? 'Physical Stocktake Count Adjustment'
            : actionType === 'writeOff'
            ? 'Quarantine & Write-Off Batch'
            : 'Transfer Stock to Branch Store'
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
