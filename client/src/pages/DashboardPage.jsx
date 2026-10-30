import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Receipt,
  AlertTriangle,
  Clock,
  Boxes,
  Percent,
  PlusCircle,
  ArrowUpRight,
  ShieldAlert,
  Wallet,
  ShoppingBag,
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import apiClient from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { formatCurrency } from '../utils/cn';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { currentOutlet } = useAuthStore();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, [currentOutlet]);

  const fetchDashboard = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/reports/dashboard', {
        params: { outletId: currentOutlet?._id },
      });
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Loading live pharmacy analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Pharmacy Operations Dashboard</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Realtime sales, FEFO inventory health, and cash collections for {currentOutlet?.name || 'Central Pharmacy'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={fetchDashboard}>
            Refresh
          </Button>
          <Button variant="primary" size="sm" icon={PlusCircle} onClick={() => navigate('/pos')}>
            Quick POS Bill (F2)
          </Button>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Sales</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(data?.todaySalesTotal || 0)}
            </h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-slate-400" />
              <span>{data?.todayBillsCount || 0} bills invoiced today</span>
            </p>
          </div>
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-emerald-500/5 rounded-full pointer-events-none group-hover:scale-150 transition-transform" />
        </div>

        {/* Month Sales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Month Sales</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(data?.monthSalesTotal || 0)}
            </h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <span className="text-emerald-600 font-semibold flex items-center">
                <ArrowUpRight className="w-3.5 h-3.5" /> +14.2%
              </span>
              <span>vs previous month</span>
            </p>
          </div>
        </div>

        {/* Inventory Valuation */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-purple-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Inventory Value</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(data?.inventoryValuation || 0)}
            </h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <span>MRP Worth: <strong>{formatCurrency(data?.inventoryMRPValuation || 0)}</strong></span>
            </p>
          </div>
        </div>

        {/* Margin Estimate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-teal-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Potential Margin</span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(data?.potentialMargin || 0)}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Estimated gross profit in existing stock
            </p>
          </div>
        </div>
      </div>

      {/* Critical Expiry & Stock Risk Banners (Clickable to filtered views) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Expired Stock */}
        <div
          onClick={() => navigate('/inventory?expiry=expired')}
          className="p-4 rounded-2xl bg-red-50/80 border border-red-200 hover:border-red-300 cursor-pointer transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-red-900 flex items-center gap-2">
                Expired Batches
                <Badge variant="danger">{data?.expiredCount || 0}</Badge>
              </h4>
              <p className="text-xs text-red-700 mt-0.5">
                Loss risk: <strong>{formatCurrency(data?.expiredValue || 0)}</strong>
              </p>
            </div>
          </div>
          <span className="text-xs text-red-600 font-semibold group-hover:translate-x-1 transition-transform">
            Review →
          </span>
        </div>

        {/* Near Expiry Stock */}
        <div
          onClick={() => navigate('/inventory?expiry=nearExpiry')}
          className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 hover:border-amber-300 cursor-pointer transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900 flex items-center gap-2">
                Near Expiry (&lt;60 Days)
                <Badge variant="warning">{data?.nearExpiryCount || 0}</Badge>
              </h4>
              <p className="text-xs text-amber-700 mt-0.5">
                Value: <strong>{formatCurrency(data?.nearExpiryValue || 0)}</strong>
              </p>
            </div>
          </div>
          <span className="text-xs text-amber-600 font-semibold group-hover:translate-x-1 transition-transform">
            Liquidate →
          </span>
        </div>

        {/* Low Stock Alert */}
        <div
          onClick={() => navigate('/products?stockFilter=low')}
          className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 hover:border-blue-300 cursor-pointer transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                Low Stock Medicines
                <Badge variant="blue">{data?.lowStockCount || 0}</Badge>
              </h4>
              <p className="text-xs text-blue-700 mt-0.5">Below minimum reorder threshold</p>
            </div>
          </div>
          <span className="text-xs text-blue-600 font-semibold group-hover:translate-x-1 transition-transform">
            Reorder →
          </span>
        </div>
      </div>

      {/* Main Charts & Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Chart (7 Days) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">7-Day Sales Trend & Footfall</h3>
              <p className="text-xs text-slate-500">Daily gross revenue across all counters</p>
            </div>
            <Badge variant="primary">Daily Realtime</Badge>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.salesTrend || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `₹${val}`}
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(value), 'Revenue']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#salesGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Today's Collections by Mode</h3>
            <p className="text-xs text-slate-500 mb-4">Payment distribution across channels</p>

            <div className="space-y-3">
              {[
                { name: 'UPI (PhonePe, GPay, Paytm)', value: data?.paymentBreakdown?.UPI || 0, color: 'bg-emerald-500' },
                { name: 'Cash Register', value: data?.paymentBreakdown?.Cash || 0, color: 'bg-blue-500' },
                { name: 'Debit / Credit Card', value: data?.paymentBreakdown?.Card || 0, color: 'bg-purple-500' },
                { name: 'Customer Credit (Khata)', value: data?.paymentBreakdown?.Credit || 0, color: 'bg-amber-500' },
              ].map((m, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex justify-between items-center text-xs font-medium">
                    <span className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${m.color}`} />
                      {m.name}
                    </span>
                    <strong className="font-bold text-slate-900">{formatCurrency(m.value)}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-600">
            <span>Cash Register Status:</span>
            <Button variant="ghost" size="sm" onClick={() => navigate('/finance')}>
              Open Cash Book →
            </Button>
          </div>
        </div>
      </div>

      {/* Top Selling Medicines */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Fast-Moving Medicines (Top 5)</h3>
            <p className="text-xs text-slate-500">Highest volume dispensed medicines this month</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/reports')}>
            View Full Sales Report →
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[500px]">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Rank</th>
                <th className="py-2.5 px-3">Medicine Name</th>
                <th className="py-2.5 px-3 text-right">Units Dispensed</th>
                <th className="py-2.5 px-3 text-right">Total Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {data?.topProducts?.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-4 text-slate-400">
                    No sales recorded yet this month
                  </td>
                </tr>
              ) : (
                data?.topProducts?.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-700">
                        {idx + 1}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900">{p.name}</td>
                    <td className="py-3 px-3 text-right font-semibold">{p.quantity} Units</td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-700">{formatCurrency(p.revenue)}</td>
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