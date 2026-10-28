import React from 'react';
import { formatCurrency, formatDate } from '../../utils/cn';
import { Button } from './Button';
import { Printer, Download } from 'lucide-react';

export const ThermalReceipt = ({ invoice, outlet, onClose }) => {
  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const storeName = outlet?.name || 'HomeBooks Pharmacy';
  const dlNumber = outlet?.drugLicenseNumber || 'KA-B1-2026-098231';
  const gstin = outlet?.gstin || '29AABCU9603R1ZM';
  const address = outlet?.address || 'Indiranagar 100ft Road, Bengaluru';
  const phone = outlet?.phone || '+91 98450 12345';

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-3 mb-4 w-full justify-between print:hidden">
        <span className="text-sm font-semibold text-slate-700">Receipt Preview (80mm Thermal)</span>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" size="sm" icon={Printer} onClick={handlePrint}>
            Print Thermal Bill
          </Button>
        </div>
      </div>

      {/* Actual printable area */}
      <div
        id="thermal-receipt-print-area"
        className="w-full max-w-[340px] bg-white border border-slate-200 p-4 font-mono text-xs shadow-sm rounded-lg text-slate-900"
      >
        <div className="text-center pb-3 border-b border-dashed border-slate-300">
          <h2 className="text-base font-bold uppercase tracking-wider">{storeName}</h2>
          <p className="text-[10px] text-slate-600 mt-0.5">{address}</p>
          <p className="text-[10px] text-slate-600">Ph: {phone}</p>
          <div className="mt-1.5 pt-1 border-t border-slate-200 text-[10px] text-slate-700">
            <p>DL No: <span className="font-semibold">{dlNumber}</span></p>
            <p>GSTIN: <span className="font-semibold">{gstin}</span></p>
          </div>
        </div>

        <div className="py-2 border-b border-dashed border-slate-300 text-[10px] space-y-0.5">
          <div className="flex justify-between">
            <span>Bill No: <strong className="font-bold">{invoice.invoiceNumber}</strong></span>
            <span>Date: {formatDate(invoice.createdAt)}</span>
          </div>
          <div className="flex justify-between">
            <span>Customer: {invoice.customerName || 'Walk-in'}</span>
            <span>Ph: {invoice.customerPhone || 'N/A'}</span>
          </div>
          {invoice.doctorName && (
            <div className="text-slate-600">
              <span>Doctor: {invoice.doctorName}</span>
              {invoice.prescriptionNumber && <span> | Rx: {invoice.prescriptionNumber}</span>}
            </div>
          )}
        </div>

        {/* Line Items */}
        <div className="py-2 border-b border-dashed border-slate-300">
          <div className="grid grid-cols-12 text-[10px] font-bold pb-1 text-slate-700 border-b border-slate-200">
            <span className="col-span-5">Item / Batch</span>
            <span className="col-span-2 text-center">Exp</span>
            <span className="col-span-2 text-right">Qty</span>
            <span className="col-span-3 text-right">Amt</span>
          </div>

          <div className="divide-y divide-slate-100">
            {invoice.items?.map((item, idx) => (
              <div key={idx} className="py-1 text-[10px]">
                <div className="grid grid-cols-12 font-medium">
                  <span className="col-span-5 truncate">{item.productName}</span>
                  <span className="col-span-2 text-center text-slate-500">
                    {new Date(item.expiryDate).toLocaleDateString('en-US', { month: '2-digit', year: '2-digit' })}
                  </span>
                  <span className="col-span-2 text-right">{item.quantity}</span>
                  <span className="col-span-3 text-right font-bold">{formatCurrency(item.totalAmount)}</span>
                </div>
                <div className="text-[9px] text-slate-500 flex justify-between px-0.5">
                  <span>Batch: {item.batchNumber}</span>
                  <span>MRP: {formatCurrency(item.mrp)} (GST {item.gstRate}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Totals */}
        <div className="py-2 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal:</span>
            <span>{formatCurrency(invoice.subtotal)}</span>
          </div>
          {invoice.totalDiscount > 0 && (
            <div className="flex justify-between text-emerald-700 font-semibold">
              <span>Special Discount:</span>
              <span>- {formatCurrency(invoice.totalDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between text-slate-500 text-[10px]">
            <span>CGST (Intra-state):</span>
            <span>{formatCurrency(invoice.cgstTotal)}</span>
          </div>
          <div className="flex justify-between text-slate-500 text-[10px]">
            <span>SGST (Intra-state):</span>
            <span>{formatCurrency(invoice.sgstTotal)}</span>
          </div>
          {invoice.roundOff !== 0 && (
            <div className="flex justify-between text-slate-400 text-[10px]">
              <span>Round Off:</span>
              <span>{formatCurrency(invoice.roundOff)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-200">
            <span>GRAND TOTAL:</span>
            <span>{formatCurrency(invoice.grandTotal)}</span>
          </div>
        </div>

        <div className="py-2 text-[10px] space-y-0.5 text-center text-slate-500">
          <p>Payment Mode: <strong className="font-semibold text-slate-800">{invoice.paymentMethod}</strong></p>
          <p className="italic">Goods once sold will be accepted back within 7 days with original cash memo.</p>
          <p className="font-semibold text-slate-700 mt-1">*** Thank you! Get Well Soon ***</p>
          <p className="text-[9px] text-slate-400">Powered by HomeBooks Pharmacy ERP</p>
        </div>
      </div>
    </div>
  );
};
