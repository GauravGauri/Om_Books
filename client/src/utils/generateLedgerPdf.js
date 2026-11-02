import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateLedgerPdf = (supplier, ledgerHistory, currentOutlet) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const storeName = currentOutlet?.name || 'HomeBooks Central Pharmacy';
  const storeAddress = currentOutlet?.address || 'Healthcare Logistics & Distribution Hub';
  const storePhone = currentOutlet?.phone || '+91 98450 12345';
  const storeEmail = currentOutlet?.email || 'accounts@homebooks.com';
  const storeGstin = currentOutlet?.gstin || '29AAAAA0000A1Z5';

  const todayStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const invoices = ledgerHistory?.invoices || [];
  const payments = ledgerHistory?.payments || [];
  const returns = ledgerHistory?.returns || [];

  const totalInvoiced = invoices.reduce((acc, inv) => acc + (inv.grandTotal || 0), 0);
  const totalPaid = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const totalReturned = returns.reduce((acc, r) => acc + (r.totalRefundAmount || 0), 0);
  const outstanding = supplier.outstandingBalance || 0;

  // Header Banner
  doc.setFillColor(6, 78, 59); // Emerald-900
  doc.rect(0, 0, 210, 36, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(storeName.toUpperCase(), 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`${storeAddress} | Phone: ${storePhone} | Email: ${storeEmail}`, 14, 22);
  doc.text(`GSTIN: ${storeGstin} | State Code: 29 (Karnataka)`, 14, 28);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('STATEMENT OF ACCOUNT', 210 - 14, 16, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Date: ${todayStr}`, 210 - 14, 23, { align: 'right' });
  doc.text(`Status: ACTIVE KHATA`, 210 - 14, 28, { align: 'right' });

  // Supplier Details Box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 42, 182, 34, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(supplier.companyName || 'Supplier Account', 18, 50);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Contact Person: ${supplier.contactPerson || 'Store In-Charge'}`, 18, 56);
  doc.text(`Phone: ${supplier.phone || 'N/A'} | Email: ${supplier.email || 'N/A'}`, 18, 62);
  doc.text(`Address: ${supplier.address || supplier.city || 'Local Commercial Hub'}`, 18, 68);

  // Right side of Supplier Details Box: Outstanding due banner
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('NET OUTSTANDING DUE', 190, 50, { align: 'right' });

  doc.setFontSize(14);
  doc.setTextColor(185, 28, 28); // Red-700
  doc.text(`₹ ${outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 190, 58, { align: 'right' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Payment Terms: ${supplier.paymentTerms || '30 Days Net'}`, 190, 65, { align: 'right' });
  doc.text(`GSTIN: ${supplier.gstin || 'N/A'}`, 190, 70, { align: 'right' });

  // Summary Metrics Bar
  const summaryY = 81;
  const colW = 182 / 4;

  const metrics = [
    { label: 'TOTAL INWARD BILLS', val: `₹ ${totalInvoiced.toLocaleString('en-IN')}`, color: [30, 41, 59] },
    { label: 'TOTAL DISBURSED (PAID)', val: `₹ ${totalPaid.toLocaleString('en-IN')}`, color: [4, 120, 87] },
    { label: 'PURCHASE RETURNS', val: `₹ ${totalReturned.toLocaleString('en-IN')}`, color: [194, 65, 12] },
    { label: 'CLOSING BALANCE', val: `₹ ${outstanding.toLocaleString('en-IN')}`, color: [185, 28, 28] },
  ];

  metrics.forEach((m, idx) => {
    const x = 14 + idx * colW;
    doc.setFillColor(idx % 2 === 0 ? 241 : 248, 245, 249);
    doc.setDrawColor(226, 232, 240);
    doc.rect(x, summaryY, colW, 16, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(m.label, x + colW / 2, summaryY + 5.5, { align: 'center' });

    doc.setFontSize(9);
    doc.setTextColor(m.color[0], m.color[1], m.color[2]);
    doc.text(m.val, x + colW / 2, summaryY + 12, { align: 'center' });
  });

  // Prepare Transactions Table Data
  const combined = [
    ...invoices.map((i) => ({
      date: new Date(i.createdAt),
      type: 'INWARD BILL',
      ref: i.supplierInvoiceNumber || i.invoiceNumber,
      debit: i.grandTotal || 0,
      credit: 0,
      notes: `Purchase Inward (${(i.items || []).length} items)`,
    })),
    ...payments.map((p) => ({
      date: new Date(p.createdAt),
      type: `PAYMENT (${p.paymentMethod || 'Bank'})`,
      ref: p.paymentNumber || 'Disbursement',
      debit: 0,
      credit: p.amount || 0,
      notes: p.notes || 'Settlement Disbursed',
    })),
    ...returns.map((r) => ({
      date: new Date(r.createdAt),
      type: 'PURCHASE RETURN',
      ref: r.returnNumber || 'Debit Note',
      debit: 0,
      credit: r.totalRefundAmount || 0,
      notes: r.reason || 'Restocked / Damaged Return',
    })),
  ].sort((a, b) => a.date - b.date);

  let runningBalance = 0;
  const tableRows = combined.map((row) => {
    runningBalance += row.debit - row.credit;
    return [
      row.date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      row.type,
      row.ref,
      row.notes,
      row.debit > 0 ? `₹ ${row.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-',
      row.credit > 0 ? `₹ ${row.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-',
      `₹ ${runningBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    ];
  });

  if (tableRows.length === 0) {
    tableRows.push(['-', 'No Transactions', '-', 'No purchase or payment history recorded', '-', '-', '₹ 0.00']);
  }

  // Draw Table
  autoTable(doc, {
    startY: 102,
    head: [['Date', 'Transaction Type', 'Voucher / Ref', 'Description / Notes', 'Debit (+)', 'Credit (-)', 'Balance']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [6, 78, 59],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 22, halign: 'center' },
      1: { cellWidth: 28, fontStyle: 'bold' },
      2: { cellWidth: 24, fontStyle: 'bold' },
      3: { cellWidth: 42 },
      4: { cellWidth: 22, halign: 'right' },
      5: { cellWidth: 22, halign: 'right', textColor: [4, 120, 87] },
      6: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      // Footer on every page
      const pageHeight = doc.internal.pageSize.height;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Generated by ${storeName} on ${new Date().toLocaleString('en-IN')}`,
        14,
        pageHeight - 8
      );
      doc.text(
        `Page ${doc.internal.getNumberOfPages()}`,
        210 - 14,
        pageHeight - 8,
        { align: 'right' }
      );
    },
  });

  // Final Signatory Box at the end
  const finalY = (doc).lastAutoTable?.finalY || 200;
  if (finalY + 30 < 280) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('Authorized Pharmacy Signatory / Store Manager:', 14, finalY + 18);
    doc.line(14, finalY + 28, 70, finalY + 28);

    doc.text('Supplier Acknowledgement & Stamp:', 210 - 70, finalY + 18);
    doc.line(210 - 70, finalY + 28, 210 - 14, finalY + 28);
  }

  return doc;
};

export const downloadLedgerPdf = (supplier, ledgerHistory, currentOutlet) => {
  const doc = generateLedgerPdf(supplier, ledgerHistory, currentOutlet);
  const cleanName = (supplier?.companyName || 'Supplier').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Supplier_Ledger_${cleanName}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
  return filename;
};

