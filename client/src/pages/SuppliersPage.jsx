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
} from 'lucide-react';
import apiClient from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { formatCurrency } from '../utils/cn';
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
          <table className="w-full text-left text-xs">
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
                      {s.outstandingBalance > 0 && (
                        <Button variant="primary" size="sm" onClick={() => handleOpenPay(s)}>
                          Disburse Payment
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
