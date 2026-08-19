export interface PDFTableColumn {
  header: string;
  key: string;
  align?: "left" | "center" | "right";
  width?: string;
  render?: (row: any, index: number) => string | number;
}

export interface PDFTableConfig {
  title: string;
  subtitle?: string;
  docNumber?: string;
  printedBy?: string;
  dateRange?: string;
  columns: PDFTableColumn[];
  data: any[];
  summaryItems?: { label: string; value: string | number }[];
  showSignatures?: boolean;
  orientation?: "portrait" | "landscape";
}

export interface OfficialDocItem {
  no?: number;
  code?: string;
  name: string;
  description?: string;
  qty: number;
  unit?: string;
  price?: number;
  discount?: number;
  total?: number;
  notes?: string;
}

export interface OfficialDocConfig {
  docType: "PURCHASE_ORDER" | "SALES_ORDER" | "DELIVERY_ORDER" | "SALES_INVOICE" | "PAYMENT_RECEIPT" | "GOODS_RECEIPT" | "PAYSLIP" | "LEAVE_APPROVAL";
  docTitle: string;
  docNo: string;
  docDate: string;
  status?: string;
  companyInfo?: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  partnerInfo?: {
    title: string;
    name: string;
    code?: string;
    contact?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  details?: { label: string; value: string }[];
  items?: OfficialDocItem[];
  financials?: {
    subtotal?: number;
    tax?: number;
    discount?: number;
    total: number;
    paid?: number;
    balance?: number;
  };
  payslipData?: {
    employeeNo: string;
    employeeName: string;
    department: string;
    position: string;
    period: string;
    baseSalary: number;
    allowances: number;
    deductions: number;
    netSalary: number;
    paymentStatus: string;
  };
  notes?: string;
  signatures?: { role: string; name?: string }[];
}

function formatRupiah(num?: number): string {
  if (num === undefined || num === null || isNaN(num)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function triggerPrint(htmlContent: string) {
  const printIframe = document.createElement("iframe");
  printIframe.style.position = "fixed";
  printIframe.style.right = "0";
  printIframe.style.bottom = "0";
  printIframe.style.width = "0";
  printIframe.style.height = "0";
  printIframe.style.border = "0";
  document.body.appendChild(printIframe);

  const doc = printIframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(htmlContent);
  doc.close();

  printIframe.contentWindow?.focus();
  setTimeout(() => {
    printIframe.contentWindow?.print();
    setTimeout(() => {
      if (document.body.contains(printIframe)) {
        document.body.removeChild(printIframe);
      }
    }, 1500);
  }, 400);
}

export function exportTableToPDF(config: PDFTableConfig) {
  const currentDate = new Date().toLocaleString("id-ID", {
    dateStyle: "full",
    timeStyle: "short",
  });

  const isLandscape = config.orientation === "landscape";

  const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>${config.title} - ${config.docNumber || "Report"}</title>
      <style>
        @page {
          size: A4 ${isLandscape ? "landscape" : "portrait"};
          margin: 12mm 15mm;
        }
        * {
          box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }
        body {
          margin: 0;
          padding: 0;
          color: #1e293b;
          font-size: 11px;
          line-height: 1.4;
          background: #fff;
        }
        .header-container {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 10px;
          margin-bottom: 12px;
        }
        .company-name {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.5px;
          text-transform: uppercase;
        }
        .company-meta {
          font-size: 10px;
          color: #64748b;
          margin-top: 2px;
        }
        .report-title-box {
          text-align: right;
        }
        .report-title {
          font-size: 14px;
          font-weight: 700;
          color: #1e40af;
          text-transform: uppercase;
        }
        .report-meta {
          font-size: 9.5px;
          color: #64748b;
          margin-top: 2px;
        }
        .filter-badges {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 6px 10px;
          border-radius: 4px;
          font-size: 10px;
          color: #475569;
          margin-bottom: 12px;
          display: flex;
          gap: 15px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 14px;
        }
        th {
          background-color: #f1f5f9;
          color: #0f172a;
          font-weight: 700;
          font-size: 10px;
          text-transform: uppercase;
          border: 1px solid #cbd5e1;
          padding: 6px 8px;
        }
        td {
          border: 1px solid #e2e8f0;
          padding: 5.5px 8px;
          font-size: 10.5px;
          vertical-align: middle;
        }
        tr:nth-child(even) {
          background-color: #f8fafc;
        }
        .text-left { text-align: left; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
        .font-bold { font-weight: 700; }
        
        .summary-cards {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-bottom: 20px;
        }
        .summary-card {
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          padding: 6px 12px;
          text-align: right;
          min-width: 140px;
        }
        .summary-card .label {
          font-size: 9px;
          color: #64748b;
          text-transform: uppercase;
          font-weight: 600;
        }
        .summary-card .val {
          font-size: 13px;
          font-weight: 800;
          color: #0f172a;
          margin-top: 1px;
        }
        
        .signatures {
          margin-top: 30px;
          display: flex;
          justify-content: space-between;
          page-break-inside: avoid;
        }
        .sign-box {
          text-align: center;
          width: 160px;
        }
        .sign-title {
          font-size: 10px;
          font-weight: 600;
          color: #475569;
          margin-bottom: 50px;
        }
        .sign-line {
          border-top: 1px solid #0f172a;
          margin-bottom: 3px;
        }
        .sign-name {
          font-size: 10px;
          font-weight: 700;
          color: #0f172a;
        }
        .sign-role {
          font-size: 9px;
          color: #64748b;
        }
        
        .footer-note {
          margin-top: 25px;
          font-size: 8.5px;
          color: #94a3b8;
          text-align: center;
          border-top: 1px solid #f1f5f9;
          padding-top: 8px;
        }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <div class="header-container">
        <div>
          <div class="company-name">🏢 ERP ENTERPRISE INDONESIA</div>
          <div class="company-meta">Sistem Manajemen Terintegrasi &bull; Database Skema Terpusat</div>
          <div class="company-meta">Jakarta Pusat, DKI Jakarta &bull; Telp: (021) 555-8888 &bull; info@perusahaan.co.id</div>
        </div>
        <div class="report-title-box">
          <div class="report-title">${config.title}</div>
          ${config.subtitle ? `<div class="report-meta">${config.subtitle}</div>` : ""}
          <div class="report-meta">Dicetak: ${currentDate}</div>
          <div class="report-meta">Operator: ${config.printedBy || "Administrator ERP"}</div>
        </div>
      </div>

      ${
        config.dateRange
          ? `<div class="filter-badges">
               <span><strong>Periode / Parameter:</strong> ${config.dateRange}</span>
               <span><strong>Total Data:</strong> ${config.data.length} Rekord</span>
             </div>`
          : ""
      }

      <table>
        <thead>
          <tr>
            <th style="width: 35px;" class="text-center">No.</th>
            ${config.columns
              .map(
                (c) =>
                  `<th style="${c.width ? `width: ${c.width};` : ""}" class="text-${c.align || "left"}">${c.header}</th>`
              )
              .join("")}
          </tr>
        </thead>
        <tbody>
          ${
            config.data.length === 0
              ? `<tr><td colspan="${config.columns.length + 1}" class="text-center" style="padding: 20px; color: #94a3b8;">Tidak ada data yang tersedia untuk dicetak</td></tr>`
              : config.data
                  .map((row, idx) => {
                    return `
                      <tr>
                        <td class="text-center" style="color: #64748b;">${idx + 1}</td>
                        ${config.columns
                          .map((c) => {
                            const val = c.render ? c.render(row, idx) : row[c.key] ?? "-";
                            return `<td class="text-${c.align || "left"}">${val}</td>`;
                          })
                          .join("")}
                      </tr>
                    `;
                  })
                  .join("")
          }
        </tbody>
      </table>

      ${
        config.summaryItems && config.summaryItems.length > 0
          ? `<div class="summary-cards">
               ${config.summaryItems
                 .map(
                   (item) => `
                 <div class="summary-card">
                   <div class="label">${item.label}</div>
                   <div class="val">${item.value}</div>
                 </div>`
                 )
                 .join("")}
             </div>`
          : ""
      }

      ${
        config.showSignatures !== false
          ? `<div class="signatures">
               <div class="sign-box">
                 <div class="sign-title">Dibuat Oleh,</div>
                 <div class="sign-line"></div>
                 <div class="sign-name">${config.printedBy || "Staf Administrasi"}</div>
                 <div class="sign-role">Petugas Operasional</div>
               </div>
               <div class="sign-box">
                 <div class="sign-title">Diperiksa Oleh,</div>
                 <div class="sign-line"></div>
                 <div class="sign-name">Supervisor / Spv</div>
                 <div class="sign-role">Kepala Seksi Terkait</div>
               </div>
               <div class="sign-box">
                 <div class="sign-title">Disetujui Oleh,</div>
                 <div class="sign-line"></div>
                 <div class="sign-name">Manager / Direksi</div>
                 <div class="sign-role">Pimpinan Otorisasi</div>
               </div>
             </div>`
          : ""
      }

      <div class="footer-note">
        Dokumen ini dibuat otomatis oleh Sistem ERP Enterprise pada ${currentDate}. Sah tanpa tanda tangan basah jika dilengkapi verifikasi internal sistem.
      </div>
    </body>
    </html>
  `;

  triggerPrint(html);
}

export function exportDocumentToPDF(doc: OfficialDocConfig) {
  const currentDate = new Date().toLocaleString("id-ID", {
    dateStyle: "full",
    timeStyle: "short",
  });

  let partnerBlock = "";
  if (doc.partnerInfo) {
    partnerBlock = `
      <div class="partner-card">
        <div class="partner-title">${doc.partnerInfo.title}</div>
        <div class="partner-name">${doc.partnerInfo.name}</div>
        ${doc.partnerInfo.code ? `<div class="partner-detail">Kode: <strong>${doc.partnerInfo.code}</strong></div>` : ""}
        ${doc.partnerInfo.contact ? `<div class="partner-detail">Kontak: ${doc.partnerInfo.contact}</div>` : ""}
        ${doc.partnerInfo.phone ? `<div class="partner-detail">Telp/WA: ${doc.partnerInfo.phone}</div>` : ""}
        ${doc.partnerInfo.email ? `<div class="partner-detail">Email: ${doc.partnerInfo.email}</div>` : ""}
        ${doc.partnerInfo.address ? `<div class="partner-detail" style="margin-top: 3px;">${doc.partnerInfo.address}</div>` : ""}
      </div>
    `;
  }

  let itemsHtml = "";
  if (doc.items && doc.items.length > 0) {
    const hasPrice = doc.items.some((i) => i.price !== undefined);
    itemsHtml = `
      <table class="doc-table">
        <thead>
          <tr>
            <th style="width: 30px;" class="text-center">No.</th>
            <th>Rincian Produk & Deskripsi Barang</th>
            <th style="width: 90px;" class="text-right">Kuantitas</th>
            ${hasPrice ? `<th style="width: 120px;" class="text-right">Harga Satuan</th>` : ""}
            ${hasPrice ? `<th style="width: 130px;" class="text-right">Total Harga</th>` : ""}
          </tr>
        </thead>
        <tbody>
          ${doc.items
            .map((item, idx) => {
              return `
              <tr>
                <td class="text-center">${idx + 1}</td>
                <td>
                  <div style="font-weight: 700; color: #0f172a;">${item.name}</div>
                  ${item.code ? `<div style="font-size: 9.5px; color: #64748b; font-family: monospace;">SKU: ${item.code}</div>` : ""}
                  ${item.description ? `<div style="font-size: 9.5px; color: #64748b;">${item.description}</div>` : ""}
                </td>
                <td class="text-right">
                  <strong>${item.qty}</strong> <span style="font-size: 9.5px; color: #64748b;">${item.unit || "Pcs"}</span>
                </td>
                ${hasPrice ? `<td class="text-right">${formatRupiah(item.price)}</td>` : ""}
                ${hasPrice ? `<td class="text-right" style="font-weight: 700;">${formatRupiah(item.total || (item.qty * (item.price || 0)))}</td>` : ""}
              </tr>
            `;
            })
            .join("")}
        </tbody>
      </table>
    `;
  }

  let payslipHtml = "";
  if (doc.docType === "PAYSLIP" && doc.payslipData) {
    const ps = doc.payslipData;
    payslipHtml = `
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 16px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 11px;">
          <div><strong>NIK Pegawai:</strong> <span style="font-family: monospace;">${ps.employeeNo}</span></div>
          <div><strong>Nama Lengkap:</strong> ${ps.employeeName}</div>
          <div><strong>Departemen:</strong> ${ps.department}</div>
          <div><strong>Jabatan / Posisi:</strong> ${ps.position}</div>
          <div><strong>Periode Gaji:</strong> ${ps.period}</div>
          <div><strong>Status Pembayaran:</strong> <span style="color: #16a34a; font-weight: 700;">${ps.paymentStatus}</span></div>
        </div>
      </div>

      <table class="doc-table">
        <thead>
          <tr>
            <th colspan="2" style="background: #e2e8f0; color: #0f172a;">1. PENDAPATAN & PENERIMAAN</th>
            <th colspan="2" style="background: #e2e8f0; color: #0f172a;">2. POTONGAN (DEDUCTIONS)</th>
          </tr>
          <tr>
            <th>Komponen Gaji</th>
            <th class="text-right">Jumlah</th>
            <th>Komponen Potongan</th>
            <th class="text-right">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Gaji Pokok (Base Salary)</td>
            <td class="text-right font-bold">${formatRupiah(ps.baseSalary)}</td>
            <td>Potongan Pajak PPh21 / BPJS</td>
            <td class="text-right">${formatRupiah(ps.deductions)}</td>
          </tr>
          <tr>
            <td>Tunjangan Jabatan & Operasional</td>
            <td class="text-right font-bold">${formatRupiah(ps.allowances)}</td>
            <td>Potongan Cuti / Terlambat</td>
            <td class="text-right">Rp 0</td>
          </tr>
          <tr style="background: #f1f5f9; font-weight: 800;">
            <td>Total Pendapatan Kotor</td>
            <td class="text-right" style="color: #1e40af;">${formatRupiah(ps.baseSalary + ps.allowances)}</td>
            <td>Total Potongan</td>
            <td class="text-right" style="color: #e11d48;">${formatRupiah(ps.deductions)}</td>
          </tr>
        </tbody>
      </table>

      <div style="background: #eff6ff; border: 2px solid #3b82f6; border-radius: 8px; padding: 14px; margin: 16px 0; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #1e40af;">GAJI BERSIH DITERIMA (TAKE HOME PAY)</div>
          <div style="font-size: 9.5px; color: #64748b;">Ditransfer langsung ke rekening terdaftar</div>
        </div>
        <div style="font-size: 20px; font-weight: 900; color: #1e3a8a;">
          ${formatRupiah(ps.netSalary)}
        </div>
      </div>
    `;
  }

  let financialsHtml = "";
  if (doc.financials) {
    const fin = doc.financials;
    financialsHtml = `
      <div style="display: flex; justify-content: flex-end; margin-top: 10px; margin-bottom: 20px;">
        <table style="width: 280px; border-collapse: collapse; font-size: 11px;">
          ${fin.subtotal !== undefined ? `<tr><td style="padding: 4px; border: none;">Subtotal</td><td style="padding: 4px; text-align: right; border: none; font-weight: 600;">${formatRupiah(fin.subtotal)}</td></tr>` : ""}
          ${fin.tax !== undefined ? `<tr><td style="padding: 4px; border: none;">PPN (11%)</td><td style="padding: 4px; text-align: right; border: none; font-weight: 600;">${formatRupiah(fin.tax)}</td></tr>` : ""}
          ${fin.discount !== undefined && fin.discount > 0 ? `<tr><td style="padding: 4px; border: none; color: #e11d48;">Diskon Khusus</td><td style="padding: 4px; text-align: right; border: none; font-weight: 600; color: #e11d48;">-${formatRupiah(fin.discount)}</td></tr>` : ""}
          <tr style="border-top: 2px solid #0f172a; font-weight: 800; font-size: 13px;">
            <td style="padding: 6px 4px; border: none; color: #0f172a;">TOTAL PEMBAYARAN</td>
            <td style="padding: 6px 4px; text-align: right; border: none; color: #1e40af;">${formatRupiah(fin.total)}</td>
          </tr>
          ${fin.paid !== undefined ? `<tr><td style="padding: 4px; border: none; color: #16a34a;">Sudah Dibayar</td><td style="padding: 4px; text-align: right; border: none; font-weight: 700; color: #16a34a;">${formatRupiah(fin.paid)}</td></tr>` : ""}
          ${fin.balance !== undefined && fin.balance > 0 ? `<tr><td style="padding: 4px; border: none; color: #e11d48; font-weight: 700;">Sisa Tagihan</td><td style="padding: 4px; text-align: right; border: none; font-weight: 800; color: #e11d48;">${formatRupiah(fin.balance)}</td></tr>` : ""}
        </table>
      </div>
    `;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>${doc.docTitle} - ${doc.docNo}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 12mm 15mm;
        }
        * {
          box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }
        body {
          margin: 0;
          padding: 0;
          color: #1e293b;
          font-size: 11px;
          line-height: 1.4;
          background: #fff;
        }
        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 12px;
          margin-bottom: 14px;
        }
        .company-name {
          font-size: 17px;
          font-weight: 800;
          color: #0f172a;
          text-transform: uppercase;
        }
        .company-meta {
          font-size: 9.5px;
          color: #64748b;
          margin-top: 1px;
        }
        .doc-badge-box {
          text-align: right;
        }
        .doc-type-title {
          font-size: 16px;
          font-weight: 900;
          color: #1e40af;
          text-transform: uppercase;
          letter-spacing: -0.3px;
        }
        .doc-no {
          font-size: 12px;
          font-weight: 700;
          font-family: monospace;
          color: #0f172a;
          margin-top: 2px;
        }
        .doc-status-badge {
          display: inline-block;
          background: #e0f2fe;
          color: #0369a1;
          font-size: 9.5px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 4px;
          margin-top: 4px;
          text-transform: uppercase;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 16px;
        }
        .partner-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 10px 12px;
        }
        .partner-title {
          font-size: 9.5px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .partner-name {
          font-size: 13px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 2px;
        }
        .partner-detail {
          font-size: 10px;
          color: #475569;
        }

        .meta-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 10px 12px;
        }
        .meta-row {
          display: flex;
          justify-content: space-between;
          font-size: 10.5px;
          padding: 2px 0;
          border-bottom: 1px dashed #e2e8f0;
        }
        .meta-row:last-child {
          border-bottom: none;
        }
        .meta-label {
          color: #64748b;
          font-weight: 600;
        }
        .meta-value {
          color: #0f172a;
          font-weight: 700;
        }

        .doc-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 12px;
        }
        .doc-table th {
          background-color: #f1f5f9;
          color: #0f172a;
          font-weight: 700;
          font-size: 10px;
          text-transform: uppercase;
          border: 1px solid #cbd5e1;
          padding: 7px 8px;
        }
        .doc-table td {
          border: 1px solid #e2e8f0;
          padding: 6px 8px;
          font-size: 10.5px;
        }
        .text-left { text-align: left; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: 700; }

        .signatures {
          margin-top: 30px;
          display: flex;
          justify-content: space-between;
          page-break-inside: avoid;
        }
        .sign-box {
          text-align: center;
          width: 160px;
        }
        .sign-title {
          font-size: 10px;
          font-weight: 600;
          color: #475569;
          margin-bottom: 50px;
        }
        .sign-line {
          border-top: 1px solid #0f172a;
          margin-bottom: 3px;
        }
        .sign-name {
          font-size: 10px;
          font-weight: 700;
          color: #0f172a;
        }
        .sign-role {
          font-size: 9px;
          color: #64748b;
        }

        .footer-note {
          margin-top: 25px;
          font-size: 8.5px;
          color: #94a3b8;
          text-align: center;
          border-top: 1px solid #f1f5f9;
          padding-top: 8px;
        }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <div class="header-top">
        <div>
          <div class="company-name">🏢 ERP ENTERPRISE INDONESIA</div>
          <div class="company-meta">Pusat Bisnis & Distribusi Terpadu</div>
          <div class="company-meta">Jl. Jend. Sudirman Kav. 52-53, Jakarta &bull; Telp: (021) 555-8888</div>
        </div>
        <div class="doc-badge-box">
          <div class="doc-type-title">${doc.docTitle}</div>
          <div class="doc-no">${doc.docNo}</div>
          ${doc.status ? `<div class="doc-status-badge">${doc.status}</div>` : ""}
        </div>
      </div>

      <div class="info-grid">
        ${partnerBlock || `<div></div>`}
        <div class="meta-card">
          <div class="meta-row">
            <span class="meta-label">Nomor Dokumen:</span>
            <span class="meta-value" style="font-family: monospace;">${doc.docNo}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Tanggal Terbit:</span>
            <span class="meta-value">${doc.docDate}</span>
          </div>
          ${
            doc.details
              ? doc.details
                  .map(
                    (d) => `
                <div class="meta-row">
                  <span class="meta-label">${d.label}:</span>
                  <span class="meta-value">${d.value}</span>
                </div>
              `
                  )
                  .join("")
              : ""
          }
        </div>
      </div>

      ${payslipHtml}
      ${itemsHtml}
      ${financialsHtml}

      ${
        doc.notes
          ? `<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 8px 12px; margin-bottom: 16px; font-size: 10px;">
               <strong>Catatan / Ketentuan:</strong> ${doc.notes}
             </div>`
          : ""
      }

      <div class="signatures">
        <div class="sign-box">
          <div class="sign-title">Dibuat / Diterbitkan,</div>
          <div class="sign-line"></div>
          <div class="sign-name">Staf Administrasi</div>
          <div class="sign-role">ERP Operator</div>
        </div>
        <div class="sign-box">
          <div class="sign-title">Penerima / Pemohon,</div>
          <div class="sign-line"></div>
          <div class="sign-name">${doc.partnerInfo?.name || "Pihak Terkait"}</div>
          <div class="sign-role">Tanda Tangan & Cap</div>
        </div>
        <div class="sign-box">
          <div class="sign-title">Otorisasi & Menyetujui,</div>
          <div class="sign-line"></div>
          <div class="sign-name">Manager Operasional</div>
          <div class="sign-role">Pimpinan Berwenang</div>
        </div>
      </div>

      <div class="footer-note">
        Dokumen resmi ERP Enterprise dicetak pada ${currentDate}. Sah dan mengikat sesuai syarat & ketentuan yang berlaku.
      </div>
    </body>
    </html>
  `;

  triggerPrint(html);
}
