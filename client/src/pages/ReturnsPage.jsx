import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  Search,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Receipt,
  FileText,
} from 'lucide-react';
import apiClient from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { formatCurrency, formatDate } from '../utils/cn';
import { Badge } from '../components/common/Badge';

export const ReturnsPage = () => {
  const { currentOutlet } = useAuthStore();
  const [returns, setReturns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReturns();
  }, [currentOutlet]);

  const fetchReturns = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/returns', {
        params: { outletId: currentOutlet?._id },
      });
      setReturns(res.returns || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Returns & Refunds Register</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Audit trail of customer medicine returns, restocking verifications, and financial refunds
        </p>
      </div>

      {/* Returns Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Return Number</th>
                <th className="py-3 px-3">Original Cash Memo</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Returned Items & Condition</th>
                <th className="py-3 px-3 text-right">Refund Amount</th>
                <th className="py-3 px-3 text-center">Settlement Mode</th>
                <th className="py-3 px-4">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">
                    Loading returns ledger...
                  </td>
                </tr>
              ) : returns.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">
                    No customer returns recorded yet.
                  </td>
                </tr>
              ) : (
                returns.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{r.returnNumber}</td>
                    <td className="py-3 px-3 font-mono text-slate-700">{r.originalInvoiceNumber}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{r.customerName || 'Walk-in'}</td>
                    <td className="py-3 px-3 text-slate-600">{formatDate(r.createdAt)}</td>
                    <td className="py-3 px-3">
                      <div className="space-y-1">
                        {r.items?.map((it, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                            <span>
                              {it.quantity}x {it.productName}
                            </span>
                            {it.condition === 'Sellable' ? (
                              <Badge variant="success" className="text-[9px]">
                                Restocked
                              </Badge>
                            ) : (
                              <Badge variant="danger" className="text-[9px]">
                                {it.condition}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-red-600">
                      {formatCurrency(r.totalRefundAmount)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Badge variant="default">{r.refundMethod}</Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] max-w-xs truncate">{r.reason}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
