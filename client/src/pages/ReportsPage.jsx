import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  FileSpreadsheet,
  AlertOctagon,
  ShieldAlert,
  CheckCircle,
  FileCheck,
} from 'lucide-react';
import apiClient from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { formatCurrency, formatDate } from '../utils/cn';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';

export const ReportsPage = () => {
  const { currentOutlet } = useAuthStore();
  const [activeTab, setActiveTab] = useState('gst'); // 'gst', 'scheduleH1', 'expiry'
  const [gstData, setGstData] = useState(null);
  const [h1Data, setH1Data] = useState(null);
  const [expiryData, setExpiryData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, [activeTab, currentOutlet]);

  const fetchReportData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'gst') {
        const res = await apiClient.get('/reports/gst', { params: { outletId: currentOutlet?._id } });
        setGstData(res.data);
      } else if (activeTab === 'scheduleH1') {
        const res = await apiClient.get('/reports/schedule-h1', { params: { outletId: currentOutlet?._id } });
        setH1Data(res.data);
      } else if (activeTab === 'expiry') {
        const res = await apiClient.get('/reports/expiry-audit', { params: { outletId: currentOutlet?._id } });
        setExpiryData(res.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';

    if (activeTab === 'scheduleH1') {
      csvContent += 'Date,Invoice,Patient Name,Phone,Doctor,Medicine,Batch,Quantity\n';
      h1Data?.records?.forEach((r) => {
        csvContent += `"${formatDate(r.date)}","${r.invoiceNumber}","${r.patientName}","${r.patientPhone}","${r.doctorName}","${r.medicineName}","${r.batchNumber}","${r.quantity}"\n`;
      });
    } else if (activeTab === 'expiry') {
      csvContent += 'Medicine,Generic,Batch,Expiry Date,Days Left,Quantity,Cost,Total Loss Risk,Supplier\n';
      expiryData.forEach((r) => {
        csvContent += `"${r.productName}","${r.genericName}","${r.batchNumber}","${formatDate(r.expiryDate)}","${r.daysRemaining}","${r.quantity}","${r.purchaseCost}","${r.totalLossRisk}","${r.supplierName}"\n`;
      });
    } else {
      csvContent += 'Slab,Taxable Value,CGST,SGST,Total GST\n';
      Object.entries(gstData?.outwardSupplies || {}).forEach(([slab, v]) => {
        csvContent += `"${slab}","${v.taxable}","${v.cgst}","${v.sgst}","${v.totalTax}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HomeBooks_${activeTab}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Reports & Regulatory Compliance</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            GSTR-1 & GSTR-2 sales/purchase registers, Schedule H1 drug compliance, and expiry risk audits
          </p>
        </div>
        <Button variant="secondary" size="sm" icon={Download} onClick={handleExportCSV}>
          Export to CSV
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-semibold">
        {[
          { id: 'gst', label: 'GST Registers (GSTR-1 / GSTR-2)', icon: FileSpreadsheet },
          { id: 'scheduleH1', label: 'Schedule H1 Controlled Drug Register', icon: FileCheck },
          { id: 'expiry', label: 'Expiry Audit & Returnable Stock', icon: ShieldAlert },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-3 px-3 transition-colors border-b-2 font-bold ${
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

      {/* TAB 1: GST REGISTERS */}
      {activeTab === 'gst' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 block mb-1">Total Output Tax (Sales)</span>
              <h3 className="text-2xl font-black text-slate-900">{formatCurrency(gstData?.totalOutputTax || 0)}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">GSTR-1 Tax liability collected</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 block mb-1">Input Tax Credit (ITC)</span>
              <h3 className="text-2xl font-black text-blue-700">{formatCurrency(gstData?.totalInputTaxCredit || 0)}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">GSTR-2 Tax paid on purchases</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 block mb-1">Net GST Tax Payable</span>
              <h3 className="text-2xl font-black text-emerald-700">{formatCurrency(gstData?.netGstPayable || 0)}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Output Tax minus Eligible ITC</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">GSTR-1: Outward Supplies by GST Slab</h3>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold">
                <tr>
                  <th className="p-3">GST Rate Slab</th>
                  <th className="p-3 text-right">Taxable Turnover</th>
                  <th className="p-3 text-right">CGST (Central)</th>
                  <th className="p-3 text-right">SGST (State)</th>
                  <th className="p-3 text-right">Total Tax Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {Object.entries(gstData?.outwardSupplies || {}).map(([slab, val]) => (
                  <tr key={slab}>
                    <td className="p-3 font-bold text-slate-900">{slab} GST Slab</td>
                    <td className="p-3 text-right font-mono text-slate-700">{formatCurrency(val.taxable)}</td>
                    <td className="p-3 text-right font-mono text-slate-500">{formatCurrency(val.cgst)}</td>
                    <td className="p-3 text-right font-mono text-slate-500">{formatCurrency(val.sgst)}</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-700">
                      {formatCurrency(val.totalTax)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: SCHEDULE H1 CONTROLLED DRUG REGISTER */}
      {activeTab === 'scheduleH1' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-amber-50/40">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              Statutory Schedule H1 / H Prescription Register
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Mandatory audit register for controlled antibiotics and 3rd generation cephalosporins
            </p>
          </div>

          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Invoice No</th>
                <th className="p-3">Patient Name & Phone</th>
                <th className="p-3">Prescribing Physician</th>
                <th className="p-3">Medicine & Salt</th>
                <th className="p-3">Batch Number</th>
                <th className="p-3 text-right">Quantity Dispensed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {h1Data?.records?.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-slate-400">
                    No Schedule H/H1 medicines dispensed yet.
                  </td>
                </tr>
              ) : (
                h1Data?.records?.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-3 text-slate-600">{formatDate(r.date)}</td>
                    <td className="p-3 font-mono font-bold">{r.invoiceNumber}</td>
                    <td className="p-3">
                      <span className="font-bold text-slate-900 block">{r.patientName}</span>
                      <span className="text-[10px] text-slate-400">{r.patientPhone}</span>
                    </td>
                    <td className="p-3 text-slate-700">{r.doctorName}</td>
                    <td className="p-3">
                      <span className="font-bold text-slate-900 block">{r.medicineName}</span>
                      <span className="text-[10px] text-slate-400">{r.genericName}</span>
                    </td>
                    <td className="p-3 font-mono">{r.batchNumber}</td>
                    <td className="p-3 text-right font-bold text-emerald-700">{r.quantity} units</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: EXPIRY AUDIT REPORT */}
      {activeTab === 'expiry' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Near-Expiry (&lt;90 Days) and Expired Stock Report</h3>
            <p className="text-xs text-slate-500">
              Identify non-moving stock and contact distributors for purchase returns before expiry
            </p>
          </div>

          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold">
              <tr>
                <th className="p-3">Medicine Name</th>
                <th className="p-3">Batch Number</th>
                <th className="p-3">Expiry Date</th>
                <th className="p-3 text-center">Expiry Status</th>
                <th className="p-3 text-right">Units on Shelf</th>
                <th className="p-3 text-right">Unit Purchase Cost</th>
                <th className="p-3 text-right">Total Loss Risk</th>
                <th className="p-3">Wholesaler Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {expiryData.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-slate-400">
                    No batches expiring within 90 days. Excellent inventory control!
                  </td>
                </tr>
              ) : (
                expiryData.map((b, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-3">
                      <span className="font-bold text-slate-900 block">{b.productName}</span>
                      <span className="text-[10px] text-slate-400">{b.genericName}</span>
                    </td>
                    <td className="p-3 font-mono font-bold">{b.batchNumber}</td>
                    <td className="p-3">
                      <span className="font-semibold block">{formatDate(b.expiryDate)}</span>
                      <span className="text-[10px] text-slate-400">
                        {b.daysRemaining > 0 ? `${b.daysRemaining} days left` : 'Expired'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {b.status === 'EXPIRED' ? (
                        <Badge variant="danger">Expired</Badge>
                      ) : (
                        <Badge variant="warning">Near Expiry</Badge>
                      )}
                    </td>
                    <td className="p-3 text-right font-black text-slate-900">{b.quantity}</td>
                    <td className="p-3 text-right font-mono text-slate-500">{formatCurrency(b.purchaseCost)}</td>
                    <td className="p-3 text-right font-mono font-black text-red-600">
                      {formatCurrency(b.totalLossRisk)}
                    </td>
                    <td className="p-3">
                      <span className="font-bold block text-slate-800">{b.supplierName}</span>
                      <span className="text-[10px] text-slate-400">{b.supplierPhone}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
