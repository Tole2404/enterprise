"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowLeftRight,
  Search,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  CheckCircle2,
  Download,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { exportTableToPDF } from "@/lib/pdf-export";
import { formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SlideOver } from "@/components/ui/slide-over";
import { DataTablePagination } from "@/components/ui/pagination";
import { TableLoading } from "@/components/ui/table-loading";

export default function StockMutationsPage() {
  const [mutations, setMutations] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // SlideOver State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formProductId, setFormProductId] = useState("");
  const [formType, setFormType] = useState("IN");
  const [formQty, setFormQty] = useState("");
  const [formFromWarehouse, setFormFromWarehouse] = useState("");
  const [formToWarehouse, setFormToWarehouse] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchMutations = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<any>("/inventory/stock-mutations", { per_page: 100 });
      if (res.data?.items) {
        setMutations(res.data.items);
      } else if (Array.isArray(res.data)) {
        setMutations(res.data);
      } else {
        setMutations([]);
      }
    } catch (e) {
      console.error("Gagal mengambil data mutasi stok dari database:", e);
      setMutations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMasterData = async () => {
    try {
      const pRes = await api.get<any>("/inventory/products");
      if (pRes.data?.items) setProducts(pRes.data.items);

      const wRes = await api.get<any>("/inventory/warehouses");
      if (wRes.data) setWarehouses(wRes.data);
    } catch (e) {}
  };

  useEffect(() => {
    fetchMutations();
    fetchMasterData();
  }, []);

  const filteredMutations = useMemo(() => {
    return mutations.filter((m) => {
      const matchSearch =
        m.product?.name?.toLowerCase().includes(search.toLowerCase()) ||
        m.product?.sku?.toLowerCase().includes(search.toLowerCase()) ||
        m.reference_no?.toLowerCase().includes(search.toLowerCase()) ||
        m.notes?.toLowerCase().includes(search.toLowerCase());
      const mutType = m.mutation_type || m.type;
      const matchType = !typeFilter || mutType === typeFilter;
      return matchSearch && matchType;
    });
  }, [mutations, search, typeFilter]);

  const paginatedMutations = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredMutations.slice(start, start + pageSize);
  }, [filteredMutations, currentPage, pageSize]);

  const handleExecuteMutation = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(formQty);
    if (!formProductId) {
      alert("Pilih produk terlebih dahulu!");
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      alert("Masukkan jumlah Qty mutasi (harus lebih dari 0)!");
      return;
    }
    setIsSubmitting(true);

    try {
      await api.post("/inventory/stock-mutations", {
        product_id: formProductId,
        mutation_type: formType,
        type: formType,
        qty: qty,
        from_warehouse_id: formFromWarehouse || undefined,
        to_warehouse_id: formToWarehouse || undefined,
        notes: formNotes || "Mutasi Stok Inventori",
      });

      setIsModalOpen(false);
      setFormProductId("");
      setFormQty("");
      setFormNotes("");
      fetchMutations();
      fetchMasterData();
    } catch (err: any) {
      alert(err.message || "Gagal melakukan mutasi stok");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportPDF = () => {
    exportTableToPDF({
      title: "Laporan Mutasi & Audit Pergerakan Stok",
      subtitle: "Buku mutasi barang masuk (IN), keluar (OUT), transfer gudang, dan opname fisik",
      orientation: "landscape",
      columns: [
        {
          header: "Tanggal & Waktu",
          key: "created_at",
          width: "140px",
          render: (row) => formatDate(row.created_at),
        },
        {
          header: "Tipe Mutasi",
          key: "mutation_type",
          align: "center",
          render: (row) => {
            if (row.mutation_type === "IN") return "MASUK (IN)";
            if (row.mutation_type === "OUT") return "KELUAR (OUT)";
            if (row.mutation_type === "TRANSFER") return "TRANSFER GUDANG";
            if (row.mutation_type === "ADJUSTMENT") return "OPNAME / ADJUST";
            return row.mutation_type;
          },
        },
        {
          header: "Produk & SKU",
          key: "product",
          render: (row) => `${row.product?.name || "Produk"} [${row.product?.sku || "-"}]`,
        },
        {
          header: "Gudang Asal",
          key: "from_warehouse",
          render: (row) => row.from_warehouse?.name || "-",
        },
        {
          header: "Gudang Tujuan",
          key: "to_warehouse",
          render: (row) => row.to_warehouse?.name || "-",
        },
        {
          header: "Kuantitas",
          key: "qty",
          align: "right",
          render: (row) => {
            const sym = row.product?.unit?.symbol || "Pcs";
            if (row.mutation_type === "IN") return `+${row.qty} ${sym}`;
            if (row.mutation_type === "OUT") return `-${row.qty} ${sym}`;
            return `${row.qty} ${sym}`;
          },
        },
        {
          header: "Keterangan / Referensi",
          key: "notes",
          render: (row) => row.notes || "-",
        },
      ],
      data: filteredMutations,
      summaryItems: [
        { label: "Total Transaksi Mutasi", value: `${filteredMutations.length} Rekord` },
      ],
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ArrowLeftRight className="h-6 w-6 text-indigo-600" />
            Mutasi & Penyesuaian Stok Gudang
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Riwayat perpindahan barang, stock opname fisik, dan audit kartu stok (Stock Card).
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
            Input Mutasi / Opname
          </Button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <Card className="border-slate-200/80 dark:border-slate-800">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex-1 w-full flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Input
                placeholder="Cari SKU, nama produk, referensi, atau keterangan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={<Search className="h-4 w-4" />}
                className="w-full"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Semua Tipe Mutasi</option>
              <option value="IN">Masuk (IN)</option>
              <option value="OUT">Keluar (OUT)</option>
              <option value="TRANSFER">Transfer</option>
              <option value="ADJUSTMENT">Opname / Penyesuaian</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Mutations Table */}
      <Card className="border-slate-200/80 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase bg-slate-50/80 dark:bg-slate-900/80">
              <tr>
                <th className="py-3 px-3 w-12 text-center">No.</th>
                <th className="py-3.5 px-4">Waktu Transaksi</th>
                <th className="py-3.5 px-4">Produk</th>
                <th className="py-3.5 px-4">Tipe Mutasi</th>
                <th className="py-3.5 px-4 text-right">Perubahan Qty</th>
                <th className="py-3.5 px-4">Asal / Tujuan Gudang</th>
                <th className="py-3.5 px-4">Keterangan / Ref</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <TableLoading colSpan={7} message="Memuat mutasi stok barang..." />
              ) : paginatedMutations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                    Tidak ada riwayat mutasi stok yang cocok.
                  </td>
                </tr>
              ) : (
                paginatedMutations.map((m, idx) => {
                  const mutType = m.mutation_type || m.type;
                  const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-3 text-center text-xs font-medium text-slate-400">
                        {rowNumber}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {formatDate(m.created_at || m.mutation_date)}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          {m.product?.name}
                        </p>
                        <p className="font-mono text-[11px] text-slate-400">
                          {m.product?.sku}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        {mutType === "IN" && (
                          <Badge variant="success" className="gap-1">
                            <ArrowDownLeft className="h-3 w-3" />
                            Masuk (IN)
                          </Badge>
                        )}
                        {mutType === "OUT" && (
                          <Badge variant="destructive" className="gap-1">
                            <ArrowUpRight className="h-3 w-3" />
                            Keluar (OUT)
                          </Badge>
                        )}
                        {mutType === "TRANSFER" && (
                          <Badge variant="indigo" className="gap-1">
                            <ArrowLeftRight className="h-3 w-3" />
                            Transfer
                          </Badge>
                        )}
                        {mutType === "ADJUSTMENT" && (
                          <Badge variant="warning" className="gap-1">
                            <RefreshCw className="h-3 w-3" />
                            Opname
                          </Badge>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-sm">
                        <span
                          className={
                            mutType === "IN" || mutType === "ADJUSTMENT"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }
                        >
                          {mutType === "IN" ? `+${m.qty}` : mutType === "OUT" ? `-${m.qty}` : `${m.qty}`}
                        </span>{" "}
                        <span className="text-xs font-normal text-slate-400">
                          {m.product?.unit?.symbol || "Pcs"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        {mutType === "TRANSFER" ? (
                          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                            <span className="text-slate-400">{m.from_warehouse?.name || "Gudang Asal"}</span>
                            <ArrowLeftRight className="h-3 w-3 text-indigo-500" />
                            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                              {m.to_warehouse?.name || "Gudang Tujuan"}
                            </span>
                          </div>
                        ) : mutType === "OUT" ? (
                          <span className="text-slate-600 dark:text-slate-400">
                            {m.from_warehouse?.name || "-"}
                          </span>
                        ) : (
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {m.to_warehouse?.name || "-"}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        <p className="font-medium text-slate-700 dark:text-slate-300">
                          {m.reference_type ? `[${m.reference_type}]` : ""} {m.notes || "-"}
                        </p>
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
          pageSize={pageSize}
          totalItems={filteredMutations.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      </Card>

      {/* Slide-over: Eksekusi Mutasi */}
      <SlideOver
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Formulir Mutasi & Penyesuaian Stok"
        description="Pilih tipe transaksi gudang terkait. Transaksi diproses secara atomik (ACID)."
        width="xl"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" form="create-mutation-form" isLoading={isSubmitting}>
              Proses Mutasi Stok
            </Button>
          </>
        }
      >
        <form id="create-mutation-form" onSubmit={handleExecuteMutation} className="space-y-5">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Pilih Produk <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={formProductId}
              onChange={(e) => setFormProductId(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="" disabled>Pilih Produk dari Katalog...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} - {p.name} (Total Stok: {p.total_stock})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tipe Mutasi <span className="text-rose-500">*</span>
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 font-semibold"
              >
                <option value="IN">IN (Barang Masuk / Tambah Stok)</option>
                <option value="OUT">OUT (Barang Keluar / Pemakaian)</option>
                <option value="TRANSFER">TRANSFER (Pindah Antar Gudang)</option>
                <option value="ADJUSTMENT">ADJUSTMENT (Stock Opname Fisik)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Jumlah Qty <span className="text-rose-500">*</span>
              </label>
              <Input
                type="number"
                min="1"
                required
                placeholder="Contoh: 10"
                value={formQty}
                onChange={(e) => setFormQty(e.target.value)}
              />
            </div>
          </div>

          {(formType === "OUT" || formType === "TRANSFER") && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Gudang Asal <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={formFromWarehouse}
                onChange={(e) => setFormFromWarehouse(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="" disabled>Pilih Gudang Asal...</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {(formType === "IN" || formType === "TRANSFER" || formType === "ADJUSTMENT") && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {formType === "ADJUSTMENT" ? "Gudang Opname" : "Gudang Tujuan"}{" "}
                <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={formToWarehouse}
                onChange={(e) => setFormToWarehouse(e.target.value)}
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
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Alasan Mutasi / Catatan Berita Acara
            </label>
            <textarea
              rows={3}
              placeholder="Contoh: Penyesuaian selisih fisik opname akhir bulan / Pemindahan stok antar cabang..."
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 resize-y"
            />
          </div>
        </form>
      </SlideOver>
    </div>
  );
}
