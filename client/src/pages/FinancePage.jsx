import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Plus,
  TrendingDown,
  TrendingUp,
  Receipt,
  Calendar,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
  PieChart,
} from 'lucide-react';
import apiClient from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { formatCurrency, formatDate } from '../utils/cn';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

export const FinancePage = () => {
  const { currentOutlet } = useAuthStore();
  const [cashRegister, setCashRegister] = useState(null);
  const [plStatement, setPlStatement] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add Expense Modal
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [category, setCategory] = useState('Electricity & Power');
  const [amount, setAmount] = useState(1500);
  const [expenseMethod, setExpenseMethod] = useState('Cash');
  const [description, setDescription] = useState('');

  useEffect(() => {
    fetchFinanceData();
  }, [currentOutlet]);

  const fetchFinanceData = async () => {
    setIsLoading(true);
    try {
      const [regRes, plRes, expRes] = await Promise.all([
        apiClient.get('/finance/cash-register', { params: { outletId: currentOutlet?._id } }),
        apiClient.get('/finance/profit-loss', { params: { outletId: currentOutlet?._id } }),
        apiClient.get('/finance/expenses', { params: { outletId: currentOutlet?._id, limit: 15 } }),
      ]);
      setCashRegister(regRes.data);
      setPlStatement(plRes.data);
      setExpenses(expRes.expenses || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/finance/expenses', {
        outlet: currentOutlet?._id,
        category,
        amount: Number(amount),
        paymentMethod: expenseMethod,
        description,
      });

      setShowExpenseModal(false);
      setDescription('');
      fetchFinanceData();
      alert('Expense recorded successfully!');
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Finance, Cash Register & Expenses</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Drawer reconciliation, operating overheads, supplier disbursements, and operational P&L estimates
          </p>
        </div>
        <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowExpenseModal(true)}>
          Record Operating Expense
        </Button>
      </div>

      {/* Cash Drawer Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Cash Drawer Balance
          </span>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">
            {formatCurrency(cashRegister?.netCashInDrawer || 0)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Net physical currency in register</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Total Collections Today
          </span>
          <h3 className="text-2xl font-black text-emerald-700 tracking-tight">
            {formatCurrency(cashRegister?.totalCollections || 0)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Cash, UPI & Card receipts</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Gross Pharmacy Profit
          </span>
          <h3 className="text-2xl font-black text-teal-700 tracking-tight">
            {formatCurrency(plStatement?.grossProfit || 0)}
          </h3>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1">
            {plStatement?.grossMarginPercent || 0}% gross margin
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Estimated Net Operating Profit
          </span>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">
            {formatCurrency(plStatement?.netProfit || 0)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">After expenses & refunds</p>
        </div>
      </div>

      {/* Operational Overheads / Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Operating Expenses & Overheads</h3>
            <p className="text-xs text-slate-500">Store bills, courier, utility costs and maintenance</p>
          </div>
          <Badge variant="primary">{expenses.length} Records</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[650px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Voucher No</th>
                <th className="py-3 px-3">Expense Category</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Payment Mode</th>
                <th className="py-3 px-3">Description / Remarks</th>
                <th className="py-3 px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">
                    No operating expenses recorded yet.
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{exp.expenseNumber}</td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-900">{exp.category}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{formatDate(exp.date)}</td>
                    <td className="py-3 px-3">
                      <Badge variant="default">{exp.paymentMethod}</Badge>
                    </td>
                    <td className="py-3 px-3 text-slate-500">{exp.description || 'N/A'}</td>
                    <td className="py-3 px-4 text-right font-mono font-black text-red-600">
                      {formatCurrency(exp.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Expense Modal */}
      <Modal
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        title="Record Operating Expense"
        subtitle="Disburse cash or bank funds for pharmacy overheads"
      >
        <form onSubmit={handleExpenseSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Expense Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800"
            >
              <option value="Electricity & Power">Electricity & Power</option>
              <option value="Rent & Utilities">Rent & Utilities</option>
              <option value="Salaries & Wages">Salaries & Staff Wages</option>
              <option value="Packaging & Supplies">Packaging Bags & Thermal Rolls</option>
              <option value="Software & Internet">Software & Internet Broadband</option>
              <option value="Logistics & Courier">Courier & Medicine Logistics</option>
              <option value="Store Maintenance">Store Sanitization & Maintenance</option>
              <option value="Marketing & Promotions">Marketing & WhatsApp SMS</option>
              <option value="Miscellaneous">Miscellaneous</option>
            </select>
          </div>

          <Input
            label="Expense Amount (₹)"
            type="number"
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            required
          />

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Disbursement Mode</label>
            <select
              value={expenseMethod}
              onChange={(e) => setExpenseMethod(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800"
            >
              <option value="Cash">Cash Drawer</option>
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer / Net Banking</option>
              <option value="Card">Debit / Credit Card</option>
            </select>
          </div>

          <Input
            label="Remarks / Reference"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Electricity bill for Indiranagar outlet"
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={() => setShowExpenseModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Record Expense
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};