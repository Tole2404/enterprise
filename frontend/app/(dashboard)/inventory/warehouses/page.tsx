"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Building2,
  Search,
  Plus,
  Pencil,
  Trash2,
  Download,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { exportTableToPDF } from "@/lib/pdf-export";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SlideOver } from "@/components/ui/slide-over";
import { DataTablePagination } from "@/components/ui/pagination";
import { TableLoading } from "@/components/ui/table-loading";

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // SlideOver State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<any>(null);
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchWarehouses = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<any>("/inventory/warehouses");
      if (res.data) {
        setWarehouses(Array.isArray(res.data) ? res.data : res.data.items || []);
      } else {
        setWarehouses([]);
      }
    } catch (e) {
      console.error("Gagal mengambil data master gudang dari database:", e);
      setWarehouses([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const filteredWarehouses = useMemo(() => {
    return warehouses.filter((w) => {
      const addr = w.address || w.location || "";
      const matchSearch =
        w.name?.toLowerCase().includes(search.toLowerCase()) ||
        w.code?.toLowerCase().includes(search.toLowerCase()) ||
        addr.toLowerCase().includes(search.toLowerCase());
      const isAct = w.is_active !== false;
      const matchStatus =
        !statusFilter ||
        (statusFilter === "ACTIVE" && isAct) ||
        (statusFilter === "INACTIVE" && !isAct);
      return matchSearch && matchStatus;
    });
  }, [warehouses, search, statusFilter]);

  const paginatedWarehouses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredWarehouses.slice(start, start + pageSize);
  }, [filteredWarehouses, currentPage, pageSize]);

  const handleOpenAdd = () => {
    setEditingWarehouse(null);
    setFormCode("");
    setFormName("");
    setFormLocation("");
    setFormIsActive(true);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (wh: any) => {
    setEditingWarehouse(wh);
    setFormCode(wh.code || "");
    setFormName(wh.name || "");
    setFormLocation(wh.address || wh.location || "");
    setFormIsActive(wh.is_active !== false);
    setIsAddModalOpen(true);
  };

  const handleToggleStatus = async (wh: any) => {
    const nextStatus = !(wh.is_active !== false);
    try {
      await api.put(`/inventory/warehouses/${wh.id}`, {
        name: wh.name,
        address: wh.address || wh.location || "",
        location: wh.address || wh.location || "",
        is_active: nextStatus,
      });
      fetchWarehouses();
    } catch (err: any) {
      alert(err.message || "Gagal mengubah status gudang");
    }
  };

  const handleSaveWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        code: formCode.toUpperCase(),
        name: formName,
        address: formLocation,
        location: formLocation,
        is_active: formIsActive,
      };

      if (editingWarehouse) {
        await api.put(`/inventory/warehouses/${editingWarehouse.id}`, payload);
      } else {
        await api.post("/inventory/warehouses", payload);
      }

      setIsAddModalOpen(false);
      fetchWarehouses();
    } catch (err: any) {
      alert(err.message || "Gagal menyimpan data gudang");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteWarehouse = async (wh: any) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus gudang "${wh.name}" (${wh.code})?`)) return;
    try {
      await api.delete(`/inventory/warehouses/${wh.id}`);
      fetchWarehouses();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus gudang");
    }
  };

  const handleExportPDF = () => {
    exportTableToPDF({
      title: "Laporan Master Gudang & Lokasi Logistik",
      subtitle: "Daftar fisik gudang penyimpanan stok aktif & lokasi operasional",
      columns: [
        { header: "Kode Gudang", key: "code", width: "120px" },
        { header: "Nama Gudang", key: "name" },
        {
          header: "Lokasi / Alamat Lengkap",
          key: "address",
          render: (row) => row.address || row.location || "-",
        },
        {
          header: "Status Operasional",
          key: "is_active",
          align: "center",
          render: (row) => (row.is_active !== false ? "Aktif (Operasional)" : "Nonaktif"),
        },
      ],
      data: filteredWarehouses,
      summaryItems: [
        { label: "Total Unit Gudang", value: `${filteredWarehouses.length} Lokasi` },
      ],
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Building2 className="h-6 w-6 text-indigo-600" />
            Master Gudang (Warehouses)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Daftar lokasi fisik gudang penyimpanan stok barang, cabang, dan transit logistik.
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
          <Button onClick={handleOpenAdd} size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Tambah Gudang
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <Card className="border-slate-200/90 dark:border-slate-800">
        <CardContent className="p-3.5">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Cari kode gudang, nama gudang, atau lokasi alamat..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                icon={<Search className="h-4 w-4" />}
                className="h-9 text-xs"
              />
            </div>
            <div className="w-full sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Semua Status</option>
                <option value="ACTIVE">Aktif</option>
                <option value="INACTIVE">Nonaktif</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-slate-200/90 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase bg-slate-100/90 dark:bg-slate-900/90">
              <tr>
                <th className="py-3 px-3 w-12 text-center">No.</th>
                <th className="py-3.5 px-4 w-44">Kode Gudang</th>
                <th className="py-3.5 px-4 w-72">Nama Gudang</th>
                <th className="py-3.5 px-4">Lokasi / Alamat Fisik</th>
                <th className="py-3.5 px-4 text-center w-28">Status</th>
                <th className="py-3.5 px-4 w-32 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <TableLoading colSpan={6} message="Memuat master gudang..." />
              ) : paginatedWarehouses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                    Belum ada data gudang di database.
                  </td>
                </tr>
              ) : (
                paginatedWarehouses.map((w, idx) => {
                  const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                  const isAct = w.is_active !== false;
                  return (
                    <tr key={w.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-3 text-center text-xs font-medium text-slate-400">
                        {rowNumber}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                        {w.code}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                        {w.name}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300">
                        {w.address || w.location || "-"}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(w)}
                          className="cursor-pointer hover:scale-105 transition-transform"
                          title="Klik untuk ubah status Aktif / Nonaktif"
                        >
                          <Badge variant={isAct ? "success" : "secondary"}>
                            {isAct ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEdit(w)}
                            className="h-8 px-2 text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                            title="Edit Gudang"
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteWarehouse(w)}
                            className="h-8 px-2 text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="Hapus Gudang"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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
          totalItems={filteredWarehouses.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </Card>

      {/* Slide-over: Tambah / Edit Gudang */}
      <SlideOver
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingWarehouse ? `Edit Data Gudang: ${editingWarehouse.name}` : "Tambah Master Gudang Baru"}
        description={
          editingWarehouse
            ? "Perbarui kode gudang, nama gudang, status keaktifan, dan alamat fisik lokasi."
            : "Daftarkan lokasi penyimpanan fisik baru untuk mutasi dan penerimaan barang."
        }
        width="md"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" form="create-warehouse-form" isLoading={isSubmitting}>
              {editingWarehouse ? "Simpan Perubahan Gudang" : "Simpan Gudang"}
            </Button>
          </>
        }
      >
        <form id="create-warehouse-form" onSubmit={handleSaveWarehouse} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Kode Gudang <span className="text-slate-400 font-normal">(Otomatis Sistem)</span>
            </label>
            <Input
              placeholder="Otomatis dibuat sistem (atau ketik manual misal: WH-001)"
              value={formCode}
              onChange={(e) => setFormCode(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nama Gudang <span className="text-rose-500">*</span>
            </label>
            <Input
              required
              placeholder="Contoh: Gudang Utama Logistik Jakarta Barat"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
          </div>

          {editingWarehouse && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Status Keaktifan Gudang <span className="text-rose-500">*</span>
              </label>
              <select
                value={formIsActive ? "true" : "false"}
                onChange={(e) => setFormIsActive(e.target.value === "true")}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 font-semibold"
              >
                <option value="true">Aktif (Dapat digunakan transaksi penerimaan & mutasi)</option>
                <option value="false">Nonaktif (Gudang tutup / Non-operasional)</option>
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Lokasi / Alamat Lengkap
            </label>
            <textarea
              rows={3}
              placeholder="Alamat fisik area pergudangan atau kawasan industri..."
              value={formLocation}
              onChange={(e) => setFormLocation(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 resize-y leading-relaxed"
            />
          </div>
        </form>
      </SlideOver>
    </div>
  );
}
