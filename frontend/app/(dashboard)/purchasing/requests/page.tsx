"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  FileCheck,
  Search,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Eye,
  ShoppingBag,
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

export default function PurchaseRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // SlideOver States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedPR, setSelectedPR] = useState<any>(null);

  // Form state for creating PR
  const [formNotes, setFormNotes] = useState("");
  const [formItems, setFormItems] = useState<Array<{ productId: string; qty: number; notes: string }>>([
    { productId: "", qty: 1, notes: "" },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<any>("/purchasing/purchase-requests", { per_page: 100 });
      if (res.data?.items) {
        setRequests(res.data.items);
      } else if (Array.isArray(res.data)) {
        setRequests(res.data);
      } else {
        setRequests([]);
      }
    } catch (e) {
      console.error("Gagal mengambil data PR dari database:", e);
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get<any>("/inventory/products");
      if (res.data?.items) {
        setProducts(res.data.items);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchRequests();
    fetchProducts();
  }, []);

  const filteredRequests = useMemo(() => {
    return requests.filter((pr) => {
      const matchSearch =
        pr.pr_no?.toLowerCase().includes(search.toLowerCase()) ||
        pr.requester?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        pr.notes?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = !statusFilter || pr.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [requests, search, statusFilter]);

  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, currentPage, pageSize]);

  const addItemRow = () => {
    setFormItems([...formItems, { productId: "", qty: 1, notes: "" }]);
  };

  const removeItemRow = (index: number) => {
    setFormItems(formItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...formItems];
    (updated[index] as any)[field] = value;
    setFormItems(updated);
  };

  const handleCreatePR = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await api.post("/purchasing/purchase-requests", {
        notes: formNotes,
        items: formItems.map((it) => ({
          product_id: it.productId,
          qty: it.qty,
          notes: it.notes,
        })),
      });

      setIsAddModalOpen(false);
      setFormNotes("");
      setFormItems([{ productId: "", qty: 1, notes: "" }]);
      fetchRequests();
    } catch (err: any) {
      alert(err.message || "Gagal membuat pengajuan PR");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprovePR = async (id: string, status: "APPROVED" | "REJECTED") => {
    try {
      await api.post(`/purchasing/purchase-requests/${id}/approve`, { status });
      setIsDetailModalOpen(false);
      fetchRequests();
    } catch (err: any) {
      alert(err.message || "Gagal mengubah status approval PR");
    }
  };

  const handleExportPDF = () => {
    exportTableToPDF({
      title: "Laporan Pengajuan Pembelian (Purchase Requests)",
      subtitle: "Daftar permohonan pengadaan barang dari departemen dan status persetujuan",
      columns: [
        { header: "Nomor PR", key: "request_no", width: "140px" },
        {
          header: "Tanggal Pengajuan",
          key: "request_date",
          render: (row) => formatDate(row.request_date),
        },
        {
          header: "Pemohon (Requester)",
          key: "requester",
          render: (row) => row.requester?.full_name || "Staf Internal",
        },
        {
          header: "Jumlah Item",
          key: "items",
          align: "center",
          render: (row) => `${row.items?.length || 0} Baris Item`,
        },
        {
          header: "Keterangan / Keperluan",
          key: "notes",
          render: (row) => row.notes || "-",
        },
        {
          header: "Status Otorisasi",
          key: "status",
          align: "center",
          render: (row) => {
            if (row.status === "APPROVED") return "APPROVED";
            if (row.status === "REJECTED") return "DITOLAK";
            return "MENUNGGU REVIEW";
          },
        },
      ],
      data: filteredRequests,
      summaryItems: [
        { label: "Total Pengajuan PR", value: `${filteredRequests.length} Dokumen` },
      ],
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileCheck className="h-6 w-6 text-indigo-600" />
            Purchase Requests (PR)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pengajuan permintaan pembelian barang internal dari departemen sebelum diterbitkan PO resmi.
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
          <Button onClick={() => setIsAddModalOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Buat Pengajuan PR
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <Card className="border-slate-200/80 dark:border-slate-800">
        <CardContent className="p-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Input
                placeholder="Cari nomor PR, nama pemohon, atau catatan..."
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
                <option value="">Semua Status PR</option>
                <option value="SUBMITTED">Menunggu Review</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Ditolak</option>
                <option value="DRAFT">Draft</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card className="border-slate-200/80 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase bg-slate-50/80 dark:bg-slate-900/80">
              <tr>
                <th className="py-3 px-3 w-12 text-center">No.</th>
                <th className="py-3.5 px-4">Nomor PR</th>
                <th className="py-3.5 px-4">Pemohon</th>
                <th className="py-3.5 px-4">Tanggal Pengajuan</th>
                <th className="py-3.5 px-4">Kebutuhan Item</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <TableLoading colSpan={7} message="Memuat pengajuan Purchase Request..." />
              ) : paginatedRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                    Tidak ada pengajuan PR yang cocok.
                  </td>
                </tr>
              ) : (
                paginatedRequests.map((pr, idx) => {
                  const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr key={pr.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-3 text-center text-xs font-medium text-slate-400">
                        {rowNumber}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                        {pr.pr_no}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          {pr.requester?.full_name || "Staf Operasional"}
                        </p>
                        <p className="text-xs text-slate-400">{pr.requester?.email}</p>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {formatDate(pr.request_date)}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300">
                        {pr.items?.length || 0} Jenis Barang
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {pr.status === "SUBMITTED" && <Badge variant="warning">Menunggu Review</Badge>}
                        {pr.status === "APPROVED" && <Badge variant="success">Approved</Badge>}
                        {pr.status === "REJECTED" && <Badge variant="destructive">Ditolak</Badge>}
                        {pr.status === "DRAFT" && <Badge variant="secondary">Draft</Badge>}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedPR(pr);
                            setIsDetailModalOpen(true);
                          }}
                          className="text-xs text-indigo-600"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Detail
                        </Button>
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
          totalItems={filteredRequests.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </Card>

      {/* Slide-over: Buat PR Baru */}
      <SlideOver
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Formulir Pengajuan Purchase Request (PR)"
        description="Pilih daftar barang dan kuantitas yang dibutuhkan untuk diajukan ke manager."
        width="xl"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" form="create-pr-form" isLoading={isSubmitting}>
              Kirim Pengajuan PR
            </Button>
          </>
        }
      >
        <form id="create-pr-form" onSubmit={handleCreatePR} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Catatan / Keperluan Pengadaan
            </label>
            <textarea
              rows={3}
              placeholder="Contoh: Kebutuhan perlengkapan tim sales lapangan menjelang peluncuran produk kuartal baru..."
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 resize-y"
            />
          </div>

          {/* Item Rows */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Daftar Barang yang Diajukan:
              </span>
              <Button type="button" size="sm" variant="outline" onClick={addItemRow} className="text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Tambah Baris
              </Button>
            </div>

            <div className="space-y-2.5">
              {formItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row items-center gap-2.5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800"
                >
                  <div className="flex-1 w-full">
                    <select
                      required
                      value={item.productId}
                      onChange={(e) => handleItemChange(idx, "productId", e.target.value)}
                      className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                    >
                      <option value="" disabled>Pilih Produk...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku} - {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-full sm:w-28">
                    <Input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={item.qty}
                      onChange={(e) => handleItemChange(idx, "qty", parseFloat(e.target.value) || 1)}
                      className="h-10 text-xs"
                    />
                  </div>
                  <div className="w-full sm:w-48">
                    <Input
                      placeholder="Keterangan per item"
                      value={item.notes}
                      onChange={(e) => handleItemChange(idx, "notes", e.target.value)}
                      className="h-10 text-xs"
                    />
                  </div>
                  {formItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItemRow(idx)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg dark:hover:bg-rose-950/40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </form>
      </SlideOver>

      {/* Slide-over: Detail & Approval PR */}
      <SlideOver
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={`Dokumen: ${selectedPR?.pr_no || ""}`}
        description={`Diajukan oleh: ${selectedPR?.requester?.full_name || "Staf"} • ${formatDate(selectedPR?.request_date)}`}
        width="lg"
        footer={
          <div className="flex justify-between items-center w-full">
            <Button variant="outline" size="sm" onClick={() => setIsDetailModalOpen(false)}>
              Tutup
            </Button>

            {selectedPR?.status === "SUBMITTED" && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleApprovePR(selectedPR.id, "REJECTED")}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Tolak PR
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleApprovePR(selectedPR.id, "APPROVED")}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Setujui (Approve)
                </Button>
              </div>
            )}

            {selectedPR?.status === "APPROVED" && (
              <Link href={`/purchasing/orders?pr_id=${selectedPR.id}`}>
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 font-semibold">
                  <ShoppingBag className="h-4 w-4" />
                  Terbitkan Purchase Order (PO) ➔
                </Button>
              </Link>
            )}
          </div>
        }
      >
        <div className="space-y-4">
          {selectedPR?.notes && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">Catatan Keperluan:</span>
              <p className="text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{selectedPR.notes}</p>
            </div>
          )}

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block pb-2">
              Rincian Barang yang Diminta:
            </span>
            {selectedPR?.items?.map((item: any, idx: number) => (
              <div key={idx} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {item.product?.name}
                  </p>
                  <p className="text-slate-400 font-mono text-[11px]">{item.product?.sku}</p>
                  {item.notes && <p className="text-[11px] text-slate-500 italic mt-0.5">&ldquo;{item.notes}&rdquo;</p>}
                </div>
                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {item.qty} {item.product?.unit?.symbol || "Pcs"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </SlideOver>
    </div>
  );
}
