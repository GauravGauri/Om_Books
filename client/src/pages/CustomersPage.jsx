import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  Calendar,
  Wallet,
  Clock,
  MessageCircle,
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

export const CustomersPage = () => {
  const { currentOutlet } = useAuthStore();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [hasOutstanding, setHasOutstanding] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [isLoading, setIsLoading] = useState(true);

  // Settlement Payment Modal
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState('UPI');
  const [payNotes, setPayNotes] = useState('');
  const [showPayModal, setShowPayModal] = useState(false);

  // Add Customer Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    doctorName: '',
  });

  useEffect(() => {
    fetchCustomers();
  }, [search, hasOutstanding, pagination.page]);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/customers', {
        params: {
          search,
          hasOutstanding: hasOutstanding ? 'true' : undefined,
          page: pagination.page,
          limit: 15,
        },
      });
      setCustomers(res.customers || []);
      setPagination(res.pagination || { page: 1, total: 0, pages: 1 });
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenPay = (cust) => {
    setSelectedCustomer(cust);
    setPayAmount(cust.outstandingBalance);
    setShowPayModal(true);
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    try {
      await apiClient.post(`/customers/${selectedCustomer._id}/pay`, {
        amount: Number(payAmount),
        paymentMethod: payMethod,
        notes: payNotes,
        outletId: currentOutlet?._id,
      });

      setShowPayModal(false);
      fetchCustomers();
      alert('Khata payment recorded successfully!');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/customers', newCustomer);
      setShowAddModal(false);
      setNewCustomer({ name: '', phone: '', email: '', address: '', doctorName: '' });
      fetchCustomers();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Customer Directory & Khata Ledger</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Credit ledger tracking, customer profiles, chronic illness medication refills, and loyalty points
          </p>
        </div>
        <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowAddModal(true)}>
          Register Customer
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by customer name, phone number, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <input
              type="checkbox"
              checked={hasOutstanding}
              onChange={(e) => setHasOutstanding(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            <span>Show Only Customers with Khata Balance</span>
          </label>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-3">Contact</th>
                <th className="py-3 px-3">Doctor / Clinic</th>
                <th className="py-3 px-3">Chronic Care</th>
                <th className="py-3 px-3 text-right">Loyalty Pts</th>
                <th className="py-3 px-3 text-right">Khata Outstanding</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    Loading customer database...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    No customers found.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">{c.name}</span>
                      <span className="text-[10px] text-slate-400">{c.address || 'Local Resident'}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono text-slate-800 block">{c.phone}</span>
                      {c.email && <span className="text-[10px] text-slate-400">{c.email}</span>}
                    </td>
                    <td className="py-3 px-3 text-slate-700">{c.doctorName || 'General Practitioner'}</td>
                    <td className="py-3 px-3">
                      {c.chronicConditions?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {c.chronicConditions.map((cond, i) => (
                            <Badge key={i} variant="purple" className="text-[9px]">
                              {cond}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[10px]">None</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-700">{c.loyaltyPoints || 0} pts</td>
                    <td className="py-3 px-3 text-right font-mono">
                      <span
                        className={`font-black text-sm ${
                          c.outstandingBalance > 0 ? 'text-red-600' : 'text-slate-400'
                        }`}
                      >
                        {formatCurrency(c.outstandingBalance)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {c.outstandingBalance > 0 && (
                        <Button variant="primary" size="sm" onClick={() => handleOpenPay(c)}>
                          Settle Khata
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Settle Khata Payment Modal */}
      <Modal
        isOpen={showPayModal}
        onClose={() => setShowPayModal(false)}
        title="Record Customer Khata Payment"
        subtitle={`Customer: ${selectedCustomer?.name} (Current Due: ${formatCurrency(
          selectedCustomer?.outstandingBalance
        )})`}
      >
        <form onSubmit={handlePaySubmit} className="space-y-4">
          <Input
            label="Payment Amount Received (₹)"
            type="number"
            value={payAmount}
            onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
            required
          />

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Collection Mode</label>
            <select
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
            >
              <option value="UPI">UPI (GPay / PhonePe / QR)</option>
              <option value="Cash">Cash Drawer</option>
              <option value="Card">Debit / Credit Card</option>
              <option value="Bank Transfer">Bank Transfer / IMPS</option>
            </select>
          </div>

          <Input
            label="Notes / Transaction Reference"
            value={payNotes}
            onChange={(e) => setPayNotes(e.target.value)}
            placeholder="e.g. Cleared October medicine credit"
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={() => setShowPayModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Record Collection
            </Button>
          </div>
        </form>
      </Modal>

      {/* Register Customer Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Register New Customer Profile"
        subtitle="Enable credit Khata, loyalty rewards, and prescription history"
      >
        <form onSubmit={handleAddSubmit} className="space-y-3">
          <Input
            label="Full Name"
            value={newCustomer.name}
            onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
            placeholder="e.g. Anand Mahindra"
            required
          />
          <Input
            label="Phone Number"
            value={newCustomer.phone}
            onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
            placeholder="e.g. 9845012345"
            required
          />
          <Input
            label="Email Address"
            type="email"
            value={newCustomer.email}
            onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
            placeholder="anand@example.com"
          />
          <Input
            label="Residential Address"
            value={newCustomer.address}
            onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
            placeholder="e.g. #23, 2nd Cross, Indiranagar"
          />
          <Input
            label="Consulting Doctor"
            value={newCustomer.doctorName}
            onChange={(e) => setNewCustomer({ ...newCustomer, doctorName: e.target.value })}
            placeholder="e.g. Dr. Ramesh Kumar"
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Register Customer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
