"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  PackageCheck,
  Search,
  Plus,
  CheckCircle2,
  Download,
  Printer,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { exportTableToPDF, exportDocumentToPDF } from "@/lib/pdf-export";
import { formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SlideOver } from "@/components/ui/slide-over";
import { DataTablePagination } from "@/components/ui/pagination";
import { TableLoading } from "@/components/ui/table-loading";

export default function GoodsReceiptsPage() {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [approvedPOs, setApprovedPOs] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // SlideOver State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPOId, setSelectedPOId] = useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [receiptNotes, setReceiptNotes] = useState("");
  const [receiptItems, setReceiptItems] = useState<Array<{ productId: string; name: string; qtyOrdered: number; qtyReceived: number }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchReceipts = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<any>("/purchasing/goods-receipts", { per_page: 100 });
      if (res.data?.items) {
        setReceipts(res.data.items);
      } else if (Array.isArray(res.data)) {
        setReceipts(res.data);
      } else {
        setReceipts([]);
      }
    } catch (e) {
      console.error("Gagal mengambil data GRN dari database:", e);
      setReceipts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMaster = async () => {
    try {
      const poRes = await api.get<any>("/purchasing/purchase-orders", { status: "APPROVED" });
      if (poRes.data?.items) {
        setApprovedPOs(poRes.data.items.filter((p: any) => p.status === "APPROVED" || p.status === "PENDING_APPROVAL"));
      }

      const wRes = await api.get<any>("/inventory/warehouses");
      if (wRes.data) setWarehouses(wRes.data);
    } catch (e) {}
  };

  useEffect(() => {
    fetchReceipts();
    fetchMaster();
  }, []);

  const filteredReceipts = useMemo(() => {
    return receipts.filter((grn) => {
      const matchSearch =
        grn.grn_no?.toLowerCase().includes(search.toLowerCase()) ||
        grn.purchase_order?.po_no?.toLowerCase().includes(search.toLowerCase()) ||
        grn.purchase_order?.supplier?.name?.toLowerCase().includes(search.toLowerCase());
      const matchWarehouse = !warehouseFilter || grn.warehouse_id === warehouseFilter || grn.warehouse?.id === warehouseFilter;
      return matchSearch && matchWarehouse;
    });
  }, [receipts, search, warehouseFilter]);

  const paginatedReceipts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredReceipts.slice(start, start + pageSize);
  }, [filteredReceipts, currentPage, pageSize]);

  const handlePOSelect = (poId: string) => {
    setSelectedPOId(poId);
    const po = approvedPOs.find((p) => p.id === poId);
    if (po && po.items) {
      setReceiptItems(
        po.items.map((it: any) => ({
          productId: it.product_id,
          name: it.product?.name || "Produk",
          qtyOrdered: it.qty,
          qtyReceived: it.qty,
        }))
      );
    }
  };

  const handleReceiveGoods = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await api.post("/purchasing/goods-receipts", {
        po_id: selectedPOId,
        warehouse_id: selectedWarehouseId,
        notes: receiptNotes,
        items: receiptItems.map((it) => ({
          product_id: it.productId,
          qty_received: it.qtyReceived,
        })),
      });

      setIsModalOpen(false);
      fetchReceipts();
      fetchMaster();
    } catch (err: any) {
      alert(err.message || "Gagal memproses penerimaan barang");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportPDF = () => {
    exportTableToPDF({
      title: "Laporan Penerimaan Barang / Goods Receipt Notes (GRN)",
      subtitle: "Daftar penerimaan fisik barang pesanan PO dan penambahan saldo stok gudang",
      orientation: "landscape",
      columns: [
        { header: "Nomor GRN", key: "grn_no", width: "130px" },
        {
          header: "Nomor PO Terkait",
          key: "po_no",
          render: (row) => row.purchase_order?.po_no || "PO Langsung",
        },
        {
          header: "Vendor / Supplier",
          key: "supplier",
          render: (row) => row.purchase_order?.supplier?.name || "Supplier",
        },
        {
          header: "Gudang Penerima",
          key: "warehouse",
          render: (row) => row.warehouse?.name || "Gudang Utama",
        },
        {
          header: "Tanggal Terima",
          key: "receipt_date",
          render: (row) => formatDate(row.receipt_date),
        },
        {
          header: "Petugas Penerima",
          key: "receiver",
          render: (row) => row.receiver?.full_name || "Staf Gudang",
        },
        {
          header: "Catatan",
          key: "notes",
          render: (row) => row.notes || "-",
        },
      ],
      data: filteredReceipts,
      summaryItems: [
        { label: "Total Transaksi Penerimaan", value: `${filteredReceipts.length} GRN` },
      ],
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <PackageCheck className="h-6 w-6 text-indigo-600" />
            Penerimaan Barang / Goods Receipt Note (GRN)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Penerimaan fisik barang pesanan PO di gudang tujuan. Saldo stok bertambah otomatis secara ACID.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            className="border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
          >
            <Download className="h-4 w-4 mr-1.5 text-indigo-600" />
            Export PDF
          </Button>
          <Button onClick={() => setIsModalOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Terima Barang (GRN)
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <Card className="border-slate-200/80 dark:border-slate-800">
        <CardContent className="p-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Input
                placeholder="Cari nomor GRN, nomor PO, atau nama supplier..."
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
                value={warehouseFilter}
                onChange={(e) => {
                  setWarehouseFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Semua Gudang Penerima</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Receipts Table */}
      <Card className="border-slate-200/80 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase bg-slate-50/80 dark:bg-slate-900/80">
              <tr>
                <th className="py-3 px-3 w-12 text-center">No.</th>
                <th className="py-3.5 px-4">Nomor GRN</th>
                <th className="py-3.5 px-4">Referensi PO</th>
                <th className="py-3.5 px-4">Gudang Penerima</th>
                <th className="py-3.5 px-4">Tanggal Terima</th>
                <th className="py-3.5 px-4 text-center">Status Stok</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <TableLoading colSpan={6} message="Memuat riwayat penerimaan barang (GRN)..." />
              ) : paginatedReceipts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                    Tidak ada data penerimaan barang yang cocok.
                  </td>
                </tr>
              ) : (
                paginatedReceipts.map((grn, idx) => {
                  const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr key={grn.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-3 text-center text-xs font-medium text-slate-400">
                        {rowNumber}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                        {grn.grn_no}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          {grn.purchase_order?.po_no}
                        </p>
                        <p className="text-xs text-slate-500">
                          {grn.purchase_order?.supplier?.name}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                        {grn.warehouse?.name}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {formatDate(grn.receipt_date)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge variant="success" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Stok Bertambah
                        </Badge>
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
          totalItems={filteredReceipts.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </Card>

      {/* Slide-over: Penerimaan Barang (GRN) */}
      <SlideOver
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Penerimaan Fisik Barang Masuk (GRN)"
        description="Pilih dokumen PO yang telah di-approve dan tentukan gudang penerima barang."
        width="xl"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" form="create-grn-form" isLoading={isSubmitting}>
              Konfirmasi Terima & Tambah Stok
            </Button>
          </>
        }
      >
        <form id="create-grn-form" onSubmit={handleReceiveGoods} className="space-y-5">
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              1. Referensi Dokumen & Gudang Tujuan
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Pilih Purchase Order (Approved) <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={selectedPOId}
                  onChange={(e) => handlePOSelect(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="" disabled>Pilih Nomor PO...</option>
                  {approvedPOs.map((po) => (
                    <option key={po.id} value={po.id}>
                      {po.po_no} - {po.supplier?.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Gudang Penerima <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={selectedWarehouseId}
                  onChange={(e) => setSelectedWarehouseId(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="" disabled>Pilih Gudang Tujuan...</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {receiptItems.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                2. Konfirmasi Kuantitas Fisik yang Tiba:
              </span>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {receiptItems.map((item, idx) => (
                  <div key={idx} className="py-3 flex items-center justify-between gap-4 text-xs">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{item.name}</p>
                      <p className="text-slate-400">Order PO: {item.qtyOrdered} unit</p>
                    </div>
                    <div className="w-32">
                      <Input
                        type="number"
                        min="1"
                        max={item.qtyOrdered}
                        value={item.qtyReceived}
                        onChange={(e) => {
                          const updated = [...receiptItems];
                          updated[idx].qtyReceived = parseFloat(e.target.value) || 0;
                          setReceiptItems(updated);
                        }}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Catatan Surat Jalan Vendor & Kondisi Fisik
            </label>
            <textarea
              rows={3}
              placeholder="Contoh: Surat Jalan No. SJ-8899 kondisi kemasan utuh dan segel baik..."
              value={receiptNotes}
              onChange={(e) => setReceiptNotes(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 resize-y"
            />
          </div>
        </form>
      </SlideOver>
    </div>
  );
}
