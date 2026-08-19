"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Truck,
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

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // SlideOver State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formTerms, setFormTerms] = useState("30");
  const [formIsActive, setFormIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSuppliers = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<any>("/purchasing/suppliers", { per_page: 100 });
      if (res.data?.items) {
        setSuppliers(res.data.items);
      } else if (Array.isArray(res.data)) {
        setSuppliers(res.data);
      } else {
        setSuppliers([]);
      }
    } catch (e) {
      console.error("Gagal mengambil data supplier dari database:", e);
      setSuppliers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const matchSearch =
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.code?.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase());
      const matchStatus =
        !statusFilter ||
        (statusFilter === "ACTIVE" && s.is_active) ||
        (statusFilter === "INACTIVE" && !s.is_active);
      return matchSearch && matchStatus;
    });
  }, [suppliers, search, statusFilter]);

  const paginatedSuppliers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSuppliers.slice(start, start + pageSize);
  }, [filteredSuppliers, currentPage, pageSize]);

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setFormCode("");
    setFormName("");
    setFormEmail("");
    setFormPhone("");
    setFormAddress("");
    setFormTerms("30");
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: any) => {
    setEditingSupplier(s);
    setFormCode(s.code || "");
    setFormName(s.name || "");
    setFormEmail(s.email || "");
    setFormPhone(s.phone || "");
    setFormAddress(s.address || "");
    setFormTerms(String(s.payment_terms_days ?? 30));
    setFormIsActive(s.is_active !== false);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (s: any) => {
    const nextStatus = !(s.is_active !== false);
    try {
      await api.put(`/purchasing/suppliers/${s.id}`, {
        name: s.name,
        email: s.email,
        phone: s.phone,
        address: s.address,
        payment_terms_days: s.payment_terms_days,
        is_active: nextStatus,
      });
      fetchSuppliers();
    } catch (err: any) {
      alert(err.message || "Gagal mengubah status vendor");
    }
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        code: formCode,
        name: formName,
        email: formEmail,
        phone: formPhone,
        address: formAddress,
        payment_terms_days: parseInt(formTerms) || 30,
        is_active: formIsActive,
      };

      if (editingSupplier) {
        await api.put(`/purchasing/suppliers/${editingSupplier.id}`, payload);
      } else {
        await api.post("/purchasing/suppliers", payload);
      }

      setIsModalOpen(false);
      fetchSuppliers();
    } catch (err: any) {
      alert(err.message || "Gagal menyimpan data vendor");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSupplier = async (s: any) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus vendor "${s.name}" (${s.code})?`)) return;
    try {
      await api.delete(`/purchasing/suppliers/${s.id}`);
      fetchSuppliers();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus vendor");
    }
  };

  const handleExportPDF = () => {
    exportTableToPDF({
      title: "Laporan Master Rekanan Vendor & Supplier",
      subtitle: "Daftar mitra pengadaan barang, kontak person, dan ketentuan pembayaran (Payment Terms)",
      columns: [
        { header: "Kode Vendor", key: "code", width: "120px" },
        { header: "Nama Perusahaan / Vendor", key: "name" },
        {
          header: "Kontak Person / Email",
          key: "email",
          render: (row) => `${row.email || "-"} ${row.phone ? `(${row.phone})` : ""}`,
        },
        {
          header: "Alamat Kantor / Pabrik",
          key: "address",
          render: (row) => row.address || "-",
        },
        {
          header: "Terms Pembayaran",
          key: "payment_terms_days",
          align: "center",
          render: (row) => `${row.payment_terms_days || 0} Hari`,
        },
        {
          header: "Status",
          key: "is_active",
          align: "center",
          render: (row) => (row.is_active !== false ? "Aktif" : "Nonaktif"),
        },
      ],
      data: filteredSuppliers,
      summaryItems: [
        { label: "Total Mitra Vendor", value: `${filteredSuppliers.length} Perusahaan` },
      ],
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Truck className="h-6 w-6 text-indigo-600" />
            Master Vendor & Rekanan Supplier
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Kelola data pemasok barang dagang, bahan baku, dan syarat pembayaran tempo (Payment Terms).
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
            Tambah Vendor
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <Card className="border-slate-200/90 dark:border-slate-800">
        <CardContent className="p-3.5">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Cari kode vendor, nama perusahaan, atau email..."
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
                <th className="py-3.5 px-4 w-36">Kode Vendor</th>
                <th className="py-3.5 px-4">Nama Perusahaan</th>
                <th className="py-3.5 px-4">Kontak & Email</th>
                <th className="py-3.5 px-4">Alamat Domisili</th>
                <th className="py-3.5 px-4 text-center w-28">Termin (TOP)</th>
                <th className="py-3.5 px-4 text-center w-24">Status</th>
                <th className="py-3.5 px-4 w-28 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <TableLoading colSpan={8} message="Memuat daftar vendor & supplier..." />
              ) : paginatedSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-slate-400">
                    Tidak ada data vendor yang cocok.
                  </td>
                </tr>
              ) : (
                paginatedSuppliers.map((s, idx) => {
                  const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                  const isAct = s.is_active !== false;
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-3 text-center text-xs font-medium text-slate-400">
                        {rowNumber}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                        {s.code}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                        {s.name}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {s.email && <div className="truncate">{s.email}</div>}
                        {s.phone && <div className="text-[11px] text-slate-400">{s.phone}</div>}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 max-w-xs truncate">
                        {s.address || "-"}
                      </td>
                      <td className="py-3.5 px-4 text-center text-xs font-medium text-slate-700 dark:text-slate-300">
                        {s.payment_terms_days} Hari
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(s)}
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
                            onClick={() => handleOpenEdit(s)}
                            className="h-8 px-2 text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                            title="Edit Vendor"
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteSupplier(s)}
                            className="h-8 px-2 text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="Hapus Vendor"
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
          totalItems={filteredSuppliers.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </Card>

      {/* Slide-over: Tambah / Edit Supplier */}
      <SlideOver
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSupplier ? `Edit Data Vendor: ${editingSupplier.name}` : "Daftarkan Vendor / Supplier Baru"}
        description={
          editingSupplier
            ? "Perbarui profil rekanan pengadaan barang, status keaktifan, kontak, dan termin pembayaran."
            : "Lengkapi profil rekanan pengadaan barang, kontak narahubung, dan termin pembayaran."
        }
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
            <Button
              type="submit"
              form="create-supplier-form"
              isLoading={isSubmitting}
            >
              {editingSupplier ? "Simpan Perubahan Vendor" : "Simpan Vendor"}
            </Button>
          </>
        }
      >
        <form id="create-supplier-form" onSubmit={handleSaveSupplier} className="space-y-5">
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              1. Identitas Perusahaan Vendor
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Kode Vendor <span className="text-slate-400 font-normal">(Otomatis Sistem)</span>
                </label>
                <Input
                  placeholder="Otomatis dibuat sistem (atau isi manual)"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nama Perusahaan / Vendor <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  placeholder="Contoh: PT Mega Komputindo Perkasa"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              2. Kontak & Ketentuan Pembayaran
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Email Kontak
                </label>
                <Input
                  type="email"
                  placeholder="sales@vendor.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nomor HP / WhatsApp
                </label>
                <Input
                  placeholder="08123456789"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Termin (TOP Hari) <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="number"
                  required
                  placeholder="30"
                  value={formTerms}
                  onChange={(e) => setFormTerms(e.target.value)}
                />
              </div>
            </div>
          </div>

          {editingSupplier && (
            <div className="space-y-1 pt-3 border-t border-slate-100 dark:border-slate-800">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Status Keaktifan Vendor <span className="text-rose-500">*</span>
              </label>
              <select
                value={formIsActive ? "true" : "false"}
                onChange={(e) => setFormIsActive(e.target.value === "true")}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 font-semibold"
              >
                <option value="true">Aktif (Dapat menerima pengajuan PR & Purchase Order)</option>
                <option value="false">Nonaktif (Diblokir / Tidak bekerjasama)</option>
              </select>
            </div>
          )}

          <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Alamat Kantor / Pergudangan
            </label>
            <textarea
              rows={3}
              placeholder="Alamat domisili operasional vendor..."
              value={formAddress}
              onChange={(e) => setFormAddress(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 resize-y"
            />
          </div>
        </form>
      </SlideOver>
    </div>
  );
}
