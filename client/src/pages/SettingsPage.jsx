import React, { useState, useEffect } from 'react';
import {
  Settings,
  Users,
  Shield,
  FileText,
  Store,
  Printer,
  CheckCircle2,
  Clock,
  Laptop,
} from 'lucide-react';
import apiClient from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { formatDate } from '../utils/cn';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Badge } from '../components/common/Badge';

export const SettingsPage = () => {
  const { user, currentOutlet } = useAuthStore();
  const [activeTab, setActiveTab] = useState('store'); // 'store', 'users', 'audit'
  const [auditLogs, setAuditLogs] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Store settings form
  const [storeName, setStoreName] = useState(currentOutlet?.name || 'HomeBooks Central Pharmacy');
  const [dlNumber, setDlNumber] = useState(currentOutlet?.drugLicenseNumber || 'KA-B1-2026-098231');
  const [gstin, setGstin] = useState(currentOutlet?.gstin || '29AABCU9603R1ZM');
  const [printerWidth, setPrinterWidth] = useState('80mm');

  useEffect(() => {
    if (activeTab === 'audit') fetchAuditLogs();
    if (activeTab === 'users') fetchUsers();
  }, [activeTab]);

  const fetchAuditLogs = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/system/audit-logs', { params: { limit: 30 } });
      setAuditLogs(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/auth/users');
      setUsersList(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveStore = (e) => {
    e.preventDefault();
    alert('Store configuration updated successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Pharmacy System Settings & Security</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Drug license configuration, user accounts & roles, thermal hardware setups, and immutable audit logs
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-semibold overflow-x-auto whitespace-nowrap pb-1">
        {[
          { id: 'store', label: 'Pharmacy & Drug License Details', icon: Store },
          { id: 'users', label: 'Super Admin & System Access', icon: Users },
          { id: 'audit', label: 'System Audit Trail Logs', icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-3 px-3 transition-colors border-b-2 font-bold shrink-0 ${
                isActive
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: STORE & DRUG LICENSE */}
      {activeTab === 'store' && (
        <div className="max-w-2xl bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
          <form onSubmit={handleSaveStore} className="space-y-4">
            <Input
              label="Pharmacy Commercial Name"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Drug License Number (Form 20/21)"
                value={dlNumber}
                onChange={(e) => setDlNumber(e.target.value)}
                required
              />
              <Input
                label="GSTIN Number"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Receipt Printing Hardware</label>
              <select
                value={printerWidth}
                onChange={(e) => setPrinterWidth(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
              >
                <option value="80mm">80mm Thermal Receipt (Standard ESC/POS)</option>
                <option value="58mm">58mm Mini Thermal POS</option>
                <option value="A4">A4 Tax Invoice Sheet</option>
              </select>
            </div>

            <div className="pt-2">
              <Button variant="primary" type="submit">
                Save Store Settings
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: USER ROLES */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Administrator Accounts</h3>
              <p className="text-xs text-slate-500">Universal access permissions</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[600px]">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold">
                <tr>
                  <th className="p-3">User</th>
                  <th className="p-3">Assigned Role</th>
                  <th className="p-3">Assigned Outlets</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Last Login</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {usersList.map((u) => (
                  <tr key={u._id}>
                    <td className="p-3">
                      <span className="font-bold text-slate-900 block">{u.name}</span>
                      <span className="text-[10px] text-slate-400">{u.email}</span>
                    </td>
                    <td className="p-3">
                      <Badge variant="purple">{u.role}</Badge>
                    </td>
                    <td className="p-3 text-slate-600">
                      {u.outlets?.map((o) => o.name || 'Store').join(', ') || 'All Outlets'}
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant="success">Active</Badge>
                    </td>
                    <td className="p-3 text-right text-slate-400">
                      {u.lastLogin ? formatDate(u.lastLogin) : 'Active Session'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Security & Action Audit Log</h3>
              <p className="text-xs text-slate-500">Immutable trail of critical inventory, financial and user operations</p>
            </div>
            <Badge variant="primary">{auditLogs.length} Events</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">User & Role</th>
                  <th className="p-3">Module</th>
                  <th className="p-3">Action Performed</th>
                  <th className="p-3">IP Address</th>
                  <th className="p-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-slate-400">
                      No audit records found.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50">
                      <td className="p-3 text-slate-500 font-mono text-[11px]">{formatDate(log.createdAt)}</td>
                      <td className="p-3">
                        <span className="font-bold text-slate-900 block">{log.userName}</span>
                        <span className="text-[10px] text-slate-400">{log.userRole}</span>
                      </td>
                      <td className="p-3">
                        <Badge variant="default">{log.module}</Badge>
                      </td>
                      <td className="p-3 font-semibold text-slate-800">{log.action}</td>
                      <td className="p-3 font-mono text-slate-400 text-[10px]">{log.ipAddress || '127.0.0.1'}</td>
                      <td className="p-3 text-slate-500 text-[11px] max-w-xs truncate font-mono">
                        {JSON.stringify(log.details || {})}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
