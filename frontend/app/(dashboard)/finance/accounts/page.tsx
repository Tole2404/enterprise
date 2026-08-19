"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Landmark,
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

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // SlideOver State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("ASSET");
  const [formDesc, setFormDesc] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAccounts = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<any>("/finance/accounts", {
        type: selectedType,
        per_page: 100,
      });
      if (res.data?.items) {
        setAccounts(res.data.items);
      } else if (Array.isArray(res.data)) {
        setAccounts(res.data);
      } else {
        setAccounts([]);
      }
    } catch (e) {
      console.error("Gagal mengambil daftar akun COA:", e);
      setAccounts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [selectedType]);

  const filteredAccounts = useMemo(() => {
    return accounts.filter((a) => {
      const matchSearch =
        a.code?.toLowerCase().includes(search.toLowerCase()) ||
        a.name?.toLowerCase().includes(search.toLowerCase());
      const matchType = !selectedType || a.type === selectedType;
      const isAct = a.is_active !== false;
      const matchStatus =
        !statusFilter ||
        (statusFilter === "ACTIVE" && isAct) ||
        (statusFilter === "INACTIVE" && !isAct);
      return matchSearch && matchType && matchStatus;
    });
  }, [accounts, search, selectedType, statusFilter]);

  const paginatedAccounts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAccounts.slice(start, start + pageSize);
  }, [filteredAccounts, currentPage, pageSize]);

  const handleOpenAdd = () => {
    setEditingAccount(null);
    setFormCode("");
    setFormName("");
    setFormType("ASSET");
    setFormDesc("");
    setFormIsActive(true);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (acc: any) => {
    setEditingAccount(acc);
    setFormCode(acc.code || "");
    setFormName(acc.name || "");
    setFormType(acc.type || "ASSET");
    setFormDesc(acc.description || "");
    setFormIsActive(acc.is_active !== false);
    setIsAddModalOpen(true);
  };

  const handleToggleStatus = async (acc: any) => {
    const nextStatus = !(acc.is_active !== false);
    try {
      await api.put(`/finance/accounts/${acc.id}`, {
        name: acc.name,
        type: acc.type,
        is_active: nextStatus,
      });
      fetchAccounts();
    } catch (err: any) {
      alert(err.message || "Gagal mengubah status akun");
    }
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        code: formCode,
        name: formName,
        type: formType,
        is_active: formIsActive,
      };

      if (editingAccount) {
        await api.put(`/finance/accounts/${editingAccount.id}`, payload);
      } else {
        await api.post("/finance/accounts", payload);
      }

      setIsAddModalOpen(false);
      fetchAccounts();
    } catch (err: any) {
      alert(err.message || "Gagal menyimpan akun");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async (acc: any) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus akun "${acc.name}" (${acc.code})?`)) return;
    try {
      await api.delete(`/finance/accounts/${acc.id}`);
      fetchAccounts();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus akun");
    }
  };

  const handleExportPDF = () => {
    exportTableToPDF({
      title: "Bagan Akun Standar (Chart of Accounts)",
      subtitle: "Struktur klasifikasi buku besar akun akuntansi perusahaan",
      columns: [
        { header: "Kode Akun", key: "code", width: "120px" },
        { header: "Nama Rekening / Akun", key: "name" },
        {
          header: "Klasifikasi",
          key: "type",
          align: "center",
          render: (row) => {
            if (row.type === "ASSET") return "ASET (AKTIVA)";
            if (row.type === "LIABILITY") return "KEWAJIBAN (PASIVA)";
            if (row.type === "EQUITY") return "MODAL (EKUITAS)";
            if (row.type === "REVENUE") return "PENDAPATAN";
            if (row.type === "EXPENSE") return "BEBAN OPERASIONAL";
            return row.type || "-";
          },
        },
        {
          header: "Status",
          key: "is_active",
          align: "center",
          render: (row) => (row.is_active !== false ? "Aktif" : "Nonaktif"),
        },
      ],
      data: filteredAccounts,
      summaryItems: [
        { label: "Total Akun Terdaftar", value: `${filteredAccounts.length} Akun COA` },
      ],
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Landmark className="h-6 w-6 text-indigo-600" />
            Bagan Akun Standar (Chart of Accounts)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Master klasifikasi akun akuntansi untuk penjurnalan otomatis transaksi ERP.
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
            Tambah Akun COA
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <Card className="border-slate-200/90 dark:border-slate-800">
        <CardContent className="p-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Input
                placeholder="Cari kode akun atau nama akun perkiraan..."
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
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Semua Klasifikasi (Neraca & L/R)</option>
                <option value="ASSET">ASSET (Aset Lancar & Tetap)</option>
                <option value="LIABILITY">LIABILITY (Hutang & Kewajiban)</option>
                <option value="EQUITY">EQUITY (Modal & Ekuitas)</option>
                <option value="REVENUE">REVENUE (Pendapatan Operasional)</option>
                <option value="EXPENSE">EXPENSE (Beban & HPP)</option>
              </select>
            </div>
            <div>
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
                <th className="py-3.5 px-4 w-40">Kode Akun</th>
                <th className="py-3.5 px-4">Nama Akun Perkiraan</th>
                <th className="py-3.5 px-4 w-44">Klasifikasi</th>
                <th className="py-3.5 px-4 text-center w-28">Status</th>
                <th className="py-3.5 px-4 w-28 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <TableLoading colSpan={6} message="Memuat bagan akun COA..." />
              ) : paginatedAccounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                    Tidak ada akun perkiraan yang cocok.
                  </td>
                </tr>
              ) : (
                paginatedAccounts.map((acc, idx) => {
                  const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                  const isAct = acc.is_active !== false;
                  return (
                    <tr key={acc.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-3 text-center text-xs font-medium text-slate-400">
                        {rowNumber}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                        {acc.code}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                        {acc.name}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {acc.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(acc)}
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
                            onClick={() => handleOpenEdit(acc)}
                            className="h-8 px-2 text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                            title="Edit Akun"
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteAccount(acc)}
                            className="h-8 px-2 text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="Hapus Akun"
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
          totalItems={filteredAccounts.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </Card>

      {/* Slide-over: Tambah / Edit Akun */}
      <SlideOver
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingAccount ? `Edit Data Akun: ${editingAccount.name}` : "Tambah Akun Perkiraan (COA) Baru"}
        description={
          editingAccount
            ? "Perbarui kode akun, nama perkiraan, klasifikasi akuntansi, dan status keaktifan."
            : "Klasifikasikan nama dan nomor akun standar pembukuan akuntansi ERP."
        }
        width="md"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" form="create-account-form" isLoading={isSubmitting}>
              {editingAccount ? "Simpan Perubahan Akun" : "Simpan Akun"}
            </Button>
          </>
        }
      >
        <form id="create-account-form" onSubmit={handleSaveAccount} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Klasifikasi Kategori Akun <span className="text-rose-500">*</span>
            </label>
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 font-semibold"
            >
              <option value="ASSET">ASSET (Harta / Kas / Bank / Piutang)</option>
              <option value="LIABILITY">LIABILITY (Kewajiban / Hutang Usaha)</option>
              <option value="EQUITY">EQUITY (Modal Disetor / Laba Ditahan)</option>
              <option value="REVENUE">REVENUE (Pendapatan Penjualan)</option>
              <option value="EXPENSE">EXPENSE (Beban Operasional & HPP)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Kode Akun <span className="text-rose-500">*</span>
            </label>
            <Input
              required
              placeholder="Contoh: 1-10005"
              value={formCode}
              onChange={(e) => setFormCode(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nama Akun Perkiraan <span className="text-rose-500">*</span>
            </label>
            <Input
              required
              placeholder="Contoh: Bank BCA Rekening Giro Operasional"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
          </div>

          {editingAccount && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Status Keaktifan Akun <span className="text-rose-500">*</span>
              </label>
              <select
                value={formIsActive ? "true" : "false"}
                onChange={(e) => setFormIsActive(e.target.value === "true")}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 font-semibold"
              >
                <option value="true">Aktif (Dapat digunakan untuk jurnal transaksi)</option>
                <option value="false">Nonaktif (Akun ditutup / Non-aktif)</option>
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Keterangan Penggunaan Akun
            </label>
            <textarea
              rows={3}
              placeholder="Catatan tujuan pembukuan atau aturan penjurnalan akun ini..."
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 resize-y"
            />
          </div>
        </form>
      </SlideOver>
    </div>
  );
}
