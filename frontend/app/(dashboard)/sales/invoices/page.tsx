"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Receipt,
  Search,
  DollarSign,
  Download,
  Printer,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { exportTableToPDF, exportDocumentToPDF } from "@/lib/pdf-export";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SlideOver } from "@/components/ui/slide-over";
import { DataTablePagination } from "@/components/ui/pagination";
import { TableLoading } from "@/components/ui/table-loading";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Payment SlideOver
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payNotes, setPayNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<any>("/sales/invoices", { per_page: 100 });
      if (res.data?.items) {
        setInvoices(res.data.items);
      } else if (Array.isArray(res.data)) {
        setInvoices(res.data);
      } else {
        setInvoices([]);
      }
    } catch (e) {
      console.error("Gagal mengambil data faktur dari database:", e);
      setInvoices([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchSearch =
        inv.invoice_no?.toLowerCase().includes(search.toLowerCase()) ||
        inv.sales_order?.customer?.name?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = !statusFilter || inv.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [invoices, search, statusFilter]);

  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredInvoices.slice(start, start + pageSize);
  }, [filteredInvoices, currentPage, pageSize]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post(`/sales/invoices/${selectedInvoice.id}/payment`, {
        amount: payAmount,
        notes: payNotes || "Pelunasan invoice transfer bank",
      });
      setIsPayModalOpen(false);
      fetchInvoices();
      alert("Penerimaan pembayaran berhasil dicatat ke Kas/Bank!");
    } catch (err: any) {
      alert(err.message || "Gagal mencatat pembayaran");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportTablePDF = () => {
    const totalInv = filteredInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const totalPaid = filteredInvoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
    const totalReceivable = totalInv - totalPaid;

    exportTableToPDF({
      title: "Laporan Faktur Penjualan & Piutang Dagang",
      subtitle: "Rekapitulasi tagihan pelanggan, status pelunasan tempo, dan saldo piutang tertunggak",
      orientation: "landscape",
      columns: [
        { header: "Nomor Faktur", key: "invoice_no", width: "130px" },
        {
          header: "Pelanggan",
          key: "customer",
          render: (row) => row.sales_order?.customer?.name || "-",
        },
        {
          header: "Tgl Faktur",
          key: "invoice_date",
          render: (row) => formatDate(row.invoice_date),
        },
        {
          header: "Jatuh Tempo",
          key: "due_date",
          render: (row) => formatDate(row.due_date),
        },
        {
          header: "Total Tagihan",
          key: "total_amount",
          align: "right",
          render: (row) => formatCurrency(row.total_amount),
        },
        {
          header: "Telah Dibayar",
          key: "paid_amount",
          align: "right",
          render: (row) => formatCurrency(row.paid_amount),
        },
        {
          header: "Sisa Piutang",
          key: "balance",
          align: "right",
          render: (row) => formatCurrency((row.total_amount || 0) - (row.paid_amount || 0)),
        },
        {
          header: "Status",
          key: "status",
          align: "center",
          render: (row) => {
            if (row.status === "PAID") return "LUNAS";
            if (row.status === "PARTIAL") return "SEBAGIAN";
            return "BELUM DIBAYAR";
          },
        },
      ],
      data: filteredInvoices,
      summaryItems: [
        { label: "Total Faktur", value: `${filteredInvoices.length} Lembar` },
        { label: "Total Nilai Tagihan", value: formatCurrency(totalInv) },
        { label: "Total Kas Masuk", value: formatCurrency(totalPaid) },
        { label: "Sisa Piutang Tertunggak", value: formatCurrency(totalReceivable) },
      ],
    });
  };

  const handlePrintInvoiceDocument = (inv: any) => {
    if (!inv) return;
    const so = inv.sales_order;
    const isPaid = inv.status === "PAID";

    exportDocumentToPDF({
      docType: "SALES_INVOICE",
      docTitle: isPaid ? "FAKTUR PENJUALAN & BUKTI LUNAS" : "FAKTUR TAGIHAN PENJUALAN (SALES INVOICE)",
      docNo: inv.invoice_no || "INV-DRAFT",
      docDate: formatDate(inv.invoice_date),
      status: isPaid ? "LUNAS (PAID)" : inv.status === "PARTIAL" ? "SEBAGIAN (PARTIAL)" : "BELUM DIBAYAR (UNPAID)",
      partnerInfo: {
        title: "Ditagihkan Kepada (Billed To):",
        name: so?.customer?.name || "Pelanggan",
        code: so?.customer?.code,
        contact: so?.customer?.email,
        phone: so?.customer?.phone,
        address: so?.customer?.address || "Alamat Penagihan",
      },
      details: [
        { label: "Nomor Referensi SO", value: so?.so_no || "-" },
        { label: "Tanggal Jatuh Tempo", value: formatDate(inv.due_date) },
        { label: "Rekening Pembayaran", value: "BCA 888-019-2819 a.n PT ERP Enterprise" },
      ],
      items: (so?.items || []).map((it: any, idx: number) => ({
        no: idx + 1,
        code: it.product?.sku || "-",
        name: it.product?.name || "Produk",
        qty: it.qty,
        unit: it.product?.unit?.symbol || "Unit",
        price: it.unit_price,
        total: it.total_price || (it.qty * it.unit_price),
      })),
      financials: {
        subtotal: so?.subtotal || inv.total_amount,
        tax: so?.tax_amount || 0,
        total: inv.total_amount,
        paid: inv.paid_amount,
        balance: (inv.total_amount || 0) - (inv.paid_amount || 0),
      },
      notes: "Pembayaran dapat ditransfer ke rekening di atas. Cantumkan nomor invoice pada berita transfer. Bukti transfer mohon diinformasikan ke finance.",
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Receipt className="h-6 w-6 text-indigo-600" />
            Faktur Penjualan & Piutang (Sales Invoices)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Faktur tagihan pelanggan yang terbit otomatis saat pengiriman barang dan pencatatan penerimaan kas.
          </p>
        </div>

        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportTablePDF}
            className="border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
          >
            <Download className="h-4 w-4 mr-1.5 text-indigo-600" />
            Export Rekap PDF
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <Card className="border-slate-200/80 dark:border-slate-800">
        <CardContent className="p-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Input
                placeholder="Cari nomor faktur atau nama pelanggan..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                icon={<Search className="h-4 w-4" />}
                className="h-9 text-xs"
              />
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Semua Status Tagihan</option>
                <option value="UNPAID">Belum Dibayar</option>
                <option value="PARTIAL">Sebagian</option>
                <option value="PAID">Lunas</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-slate-200/80 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase bg-slate-50/80 dark:bg-slate-900/80">
              <tr>
                <th className="py-3 px-3 w-12 text-center">No.</th>
                <th className="py-3.5 px-4">Nomor Faktur</th>
                <th className="py-3.5 px-4">Pelanggan</th>
                <th className="py-3.5 px-4">Tanggal Faktur</th>
                <th className="py-3.5 px-4">Jatuh Tempo</th>
                <th className="py-3.5 px-4 text-right">Total Tagihan</th>
                <th className="py-3.5 px-4 text-right">Sudah Dibayar</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <TableLoading colSpan={9} message="Memuat faktur tagihan..." />
              ) : paginatedInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs text-slate-400">
                    Tidak ada data faktur penjualan yang cocok.
                  </td>
                </tr>
              ) : (
                paginatedInvoices.map((inv, idx) => {
                  const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-3 text-center text-xs font-medium text-slate-400">
                        {rowNumber}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                        {inv.invoice_no}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                        {inv.sales_order?.customer?.name || "-"}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {formatDate(inv.invoice_date)}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {formatDate(inv.due_date)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(inv.total_amount)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(inv.paid_amount)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {inv.status === "PAID" && <Badge variant="success">Lunas</Badge>}
                        {inv.status === "PARTIAL" && <Badge variant="warning">Sebagian</Badge>}
                        {inv.status === "UNPAID" && <Badge variant="destructive">Belum Dibayar</Badge>}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handlePrintInvoiceDocument(inv)}
                            className="h-8 px-2 text-xs text-slate-700 hover:text-indigo-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                            title="Cetak Faktur Penjualan (PDF)"
                          >
                            <Printer className="h-3.5 w-3.5 mr-1 text-indigo-600" />
                            Cetak
                          </Button>
                          {inv.status !== "PAID" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedInvoice(inv);
                                setPayAmount(inv.total_amount - inv.paid_amount);
                                setIsPayModalOpen(true);
                              }}
                              className="h-8 text-xs text-emerald-600 hover:bg-emerald-50 border-emerald-200"
                            >
                              <DollarSign className="h-3.5 w-3.5 mr-1" />
                              Bayar
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <DataTablePagination
          currentPage={currentPage}
          totalItems={filteredInvoices.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </Card>

      {/* Slide-over: Terima Pembayaran */}
      <SlideOver
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        title={`Catat Pembayaran: ${selectedInvoice?.invoice_no || ""}`}
        description={`Pelanggan: ${selectedInvoice?.sales_order?.customer?.name || ""}`}
        width="lg"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsPayModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" form="record-payment-form" isLoading={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700">
              Konfirmasi Pelunasan
            </Button>
          </>
        }
      >
        <form id="record-payment-form" onSubmit={handleRecordPayment} className="space-y-5">
          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl space-y-2 text-xs border border-slate-200/80 dark:border-slate-800">
            <div className="flex justify-between text-slate-500">
              <span>Total Tagihan:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(selectedInvoice?.total_amount || 0)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Sudah Dibayar:</span>
              <span className="font-bold text-emerald-600">{formatCurrency(selectedInvoice?.paid_amount || 0)}</span>
            </div>
            <div className="flex justify-between text-indigo-600 font-bold text-sm pt-2 border-t border-slate-200 dark:border-slate-800">
              <span>Sisa Piutang yang Harus Dilunasi:</span>
              <span>{formatCurrency((selectedInvoice?.total_amount || 0) - (selectedInvoice?.paid_amount || 0))}</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nominal Diterima (Rp) <span className="text-rose-500">*</span>
            </label>
            <Input
              type="number"
              required
              min="1000"
              prefixText="Rp"
              placeholder="0"
              value={payAmount ? payAmount : ""}
              onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
              className="h-10 text-sm font-semibold"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Catatan Rekening / Bukti Transfer
            </label>
            <textarea
              rows={3}
              placeholder="Contoh: Transfer Bank BCA Rek. 12345678 a.n. PT Sinar Jaya Abadi..."
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 resize-y"
            />
          </div>
        </form>
      </SlideOver>
    </div>
  );
}
