"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
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

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // SlideOver State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<any>("/sales/customers", { per_page: 100 });
      if (res.data?.items) {
        setCustomers(res.data.items);
      } else if (Array.isArray(res.data)) {
        setCustomers(res.data);
      } else {
        setCustomers([]);
      }
    } catch (e) {
      console.error("Gagal mengambil data pelanggan dari database:", e);
      setCustomers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchSearch =
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.code?.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase());
      const isAct = c.is_active !== false;
      const matchStatus =
        !statusFilter ||
        (statusFilter === "ACTIVE" && isAct) ||
        (statusFilter === "INACTIVE" && !isAct);
      return matchSearch && matchStatus;
    });
  }, [customers, search, statusFilter]);

  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, currentPage, pageSize]);

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormCode("");
    setFormName("");
    setFormEmail("");
    setFormPhone("");
    setFormAddress("");
    setFormIsActive(true);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (c: any) => {
    setEditingCustomer(c);
    setFormCode(c.code || "");
    setFormName(c.name || "");
    setFormEmail(c.email || "");
    setFormPhone(c.phone || "");
    setFormAddress(c.address || "");
    setFormIsActive(c.is_active !== false);
    setIsAddModalOpen(true);
  };

  const handleToggleStatus = async (c: any) => {
    const nextStatus = !(c.is_active !== false);
    try {
      await api.put(`/sales/customers/${c.id}`, {
        name: c.name,
        email: c.email,
        phone: c.phone,
        address: c.address,
        is_active: nextStatus,
      });
      fetchCustomers();
    } catch (err: any) {
      alert(err.message || "Gagal mengubah status pelanggan");
    }
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        code: formCode,
        name: formName,
        email: formEmail,
        phone: formPhone,
        address: formAddress,
        is_active: formIsActive,
      };

      if (editingCustomer) {
        await api.put(`/sales/customers/${editingCustomer.id}`, payload);
      } else {
        await api.post("/sales/customers", payload);
      }

      setIsAddModalOpen(false);
      fetchCustomers();
    } catch (err: any) {
      alert(err.message || "Gagal menyimpan data pelanggan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCustomer = async (c: any) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus pelanggan "${c.name}" (${c.code})?`)) return;
    try {
      await api.delete(`/sales/customers/${c.id}`);
      fetchCustomers();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus pelanggan");
    }
  };

  const handleExportPDF = () => {
    exportTableToPDF({
      title: "Laporan Master Pelanggan & Mitra Pembeli",
      subtitle: "Daftar pelanggan B2B & Retail aktif, kontak korespondensi, dan alamat pengiriman",
      columns: [
        { header: "Kode Customer", key: "code", width: "120px" },
        { header: "Nama Pelanggan / Perusahaan", key: "name" },
        {
          header: "Kontak (Email / Telp)",
          key: "contact",
          render: (row) => `${row.email || "-"} ${row.phone ? `(${row.phone})` : ""}`,
        },
        {
          header: "Alamat Pengiriman",
          key: "address",
          render: (row) => row.address || "-",
        },
        {
          header: "Status",
          key: "is_active",
          align: "center",
          render: (row) => (row.is_active !== false ? "Aktif" : "Nonaktif"),
        },
      ],
      data: filteredCustomers,
      summaryItems: [
        { label: "Total Pelanggan Terdaftar", value: `${filteredCustomers.length} Customer` },
      ],
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-600" />
            Master Pelanggan (Customers)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Data pembeli korporat (B2B) dan retail untuk transaksi Sales Order (SO).
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
            Tambah Pelanggan
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <Card className="border-slate-200/90 dark:border-slate-800">
        <CardContent className="p-3.5">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Cari kode pelanggan, nama instansi/pembeli, atau email..."
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
                <th className="py-3.5 px-4 w-36">Kode Customer</th>
                <th className="py-3.5 px-4">Nama Pelanggan</th>
                <th className="py-3.5 px-4">Kontak (Email / Telp)</th>
                <th className="py-3.5 px-4">Alamat Pengiriman</th>
                <th className="py-3.5 px-4 text-center w-24">Status</th>
                <th className="py-3.5 px-4 w-28 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <TableLoading colSpan={7} message="Memuat direktori pelanggan..." />
              ) : paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                    Tidak ada pelanggan yang cocok dengan pencarian.
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((c, idx) => {
                  const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                  const isAct = c.is_active !== false;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-3 text-center text-xs font-medium text-slate-400">
                        {rowNumber}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                        {c.code}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                        {c.name}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {c.email && <div className="truncate">{c.email}</div>}
                        {c.phone && <div className="text-[11px] text-slate-400">{c.phone}</div>}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 max-w-xs truncate">
                        {c.address || "-"}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(c)}
                          className="cursor-pointer hover:scale-105 transition-transform"
                          title="Klik untuk ubah status Aktif / Nonaktif"
                        >
                          <Badge variant={isAct ? "success" : "secondary"}>
                            {isAct ? "Aktif" : "Non-Aktif"}
                          </Badge>
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEdit(c)}
                            className="h-8 px-2 text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                            title="Edit Pelanggan"
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteCustomer(c)}
                            className="h-8 px-2 text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="Hapus Pelanggan"
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
          totalItems={filteredCustomers.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </Card>

      {/* Slide-over: Tambah / Edit Customer */}
      <SlideOver
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingCustomer ? `Edit Data Pelanggan: ${editingCustomer.name}` : "Tambah Pelanggan (Customer) Baru"}
        description={
          editingCustomer
            ? "Perbarui profil pelanggan perusahaan/individu, status keaktifan, dan alamat pengiriman."
            : "Lengkapi profil pelanggan perusahaan/individu untuk transaksi Sales Order."
        }
        width="xl"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" form="create-customer-form" isLoading={isSubmitting}>
              {editingCustomer ? "Simpan Perubahan Pelanggan" : "Simpan Pelanggan"}
            </Button>
          </>
        }
      >
        <form id="create-customer-form" onSubmit={handleSaveCustomer} className="space-y-5">
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              1. Identitas Pelanggan
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Kode Pelanggan <span className="text-slate-400 font-normal">(Otomatis Sistem)</span>
                </label>
                <Input
                  placeholder="Otomatis dibuat sistem (atau isi manual)"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nama Perusahaan / Pelanggan <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  placeholder="Contoh: PT Sinar Jaya Abadi"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              2. Kontak Person
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Email
                </label>
                <Input
                  type="email"
                  placeholder="contact@perusahaan.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nomor Telepon / WhatsApp
                </label>
                <Input
                  placeholder="021-..."
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                />
              </div>
            </div>
          </div>

          {editingCustomer && (
            <div className="space-y-1 pt-3 border-t border-slate-100 dark:border-slate-800">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Status Pelanggan <span className="text-rose-500">*</span>
              </label>
              <select
                value={formIsActive ? "true" : "false"}
                onChange={(e) => setFormIsActive(e.target.value === "true")}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 font-semibold"
              >
                <option value="true">Aktif (Dapat memesan & bertransaksi Sales Order)</option>
                <option value="false">Nonaktif (Blacklist / Tidak aktif)</option>
              </select>
            </div>
          )}

          <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Alamat Pengiriman / Faktur
            </label>
            <textarea
              rows={3}
              placeholder="Alamat lengkap penerimaan barang pesanan..."
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
