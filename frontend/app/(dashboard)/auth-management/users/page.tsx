"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  Search,
  Plus,
  Pencil,
  Trash2,
  Download,
  UserCheck,
  UserX,
  Lock,
  Mail,
  Phone,
  User,
  Shield,
  Save,
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

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // SlideOver State (Add / Edit User)
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formSelectedRoles, setFormSelectedRoles] = useState<string[]>([]);
  const [formIsActive, setFormIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<any>("/auth/users");
      if (res.data?.items) {
        setUsers(res.data.items);
      } else if (Array.isArray(res.data)) {
        setUsers(res.data);
      } else {
        setUsers([]);
      }
    } catch (e) {
      console.error("Gagal mengambil data user dari database:", e);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await api.get<any>("/auth/roles");
      if (res.data) setRoles(Array.isArray(res.data) ? res.data : res.data.items || []);
    } catch (e) {}
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        u.phone?.toLowerCase().includes(search.toLowerCase());
      const matchRole = !roleFilter || u.roles?.some((r: any) => r.code === roleFilter || r.id === roleFilter);
      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  const toggleRoleSelection = (roleId: string) => {
    if (formSelectedRoles.includes(roleId)) {
      setFormSelectedRoles(formSelectedRoles.filter((r) => r !== roleId));
    } else {
      setFormSelectedRoles([...formSelectedRoles, roleId]);
    }
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormName("");
    setFormEmail("");
    setFormPhone("");
    setFormPassword("");
    setFormSelectedRoles([]);
    setFormIsActive(true);
    setIsSlideOverOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (u: any) => {
    setEditingUser(u);
    setFormName(u.full_name || "");
    setFormEmail(u.email || "");
    setFormPhone(u.phone || "");
    setFormPassword("");
    setFormIsActive(u.is_active !== false);

    const userRoleIds = (u.roles || []).map((r: any) => r.id);
    setFormSelectedRoles(userRoleIds);
    setIsSlideOverOpen(true);
  };

  // Save User (Create or Update)
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formSelectedRoles.length === 0) {
      alert("Harap pilih setidaknya satu peran (role) untuk pengguna ini!");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingUser) {
        // Update user
        await api.put(`/auth/users/${editingUser.id}`, {
          full_name: formName,
          phone: formPhone,
          is_active: formIsActive,
          role_ids: formSelectedRoles,
        });
        alert(`✅ Pengguna "${formName}" berhasil diperbarui!`);
      } else {
        // Create user via /auth/users
        await api.post("/auth/users", {
          full_name: formName,
          email: formEmail,
          phone: formPhone,
          password: formPassword,
          role_ids: formSelectedRoles,
        });
        alert(`✅ Pengguna baru "${formName}" (${formEmail}) berhasil didaftarkan!`);
      }

      setIsSlideOverOpen(false);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || "Gagal menyimpan data pengguna");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle user active status
  const handleToggleStatus = async (u: any) => {
    const nextStatus = !u.is_active;
    try {
      await api.put(`/auth/users/${u.id}`, {
        is_active: nextStatus,
      });
      fetchUsers();
    } catch (err: any) {
      alert(err.message || "Gagal mengubah status pengguna");
    }
  };

  // Deactivate / Delete user
  const handleDeleteUser = async (u: any) => {
    if (u.roles?.some((r: any) => r.code === "SUPER_ADMIN") && users.length <= 1) {
      alert("Tidak dapat menonaktifkan satu-satunya akun Super Admin!");
      return;
    }
    if (!confirm(`Apakah Anda yakin ingin menonaktifkan akses akun "${u.full_name}" (${u.email})?`)) return;

    try {
      await api.delete(`/auth/users/${u.id}`);
      alert("✅ Akun pengguna berhasil dinonaktifkan");
      fetchUsers();
    } catch (err: any) {
      alert(err.message || "Gagal menonaktifkan pengguna");
    }
  };

  // Export User List to PDF
  const handleExportPDF = () => {
    exportTableToPDF({
      title: "Laporan Direktori Pengguna & Kredensial Sistem (Users)",
      subtitle: "Daftar akun login, nomor kontak, alokasi peran wewenang (RBAC), dan status aktif",
      orientation: "landscape",
      columns: [
        { header: "Nama Pengguna", key: "full_name" },
        { header: "Email Login", key: "email" },
        { header: "Nomor HP / Kontak", key: "phone", render: (row) => row.phone || "-" },
        {
          header: "Peran (Roles)",
          key: "roles",
          render: (row) => (row.roles || []).map((r: any) => r.name || r.code).join(", ") || "-",
        },
        {
          header: "Status Akun",
          key: "is_active",
          align: "center",
          render: (row) => (row.is_active !== false ? "AKTIF" : "NONAKTIF"),
        },
      ],
      data: filteredUsers,
      summaryItems: [
        { label: "Total Pengguna Terdaftar", value: `${filteredUsers.length} Akun` },
      ],
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-indigo-600" />
            Manajemen Pengguna & Akun (Users)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Kelola akun login personil, kata sandi, dan alokasi peran hak akses sistem.
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
            Tambah User Baru
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <Card className="border-slate-200/80 dark:border-slate-800">
        <CardContent className="p-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Input
                placeholder="Cari nama pengguna, email login, atau nomor HP..."
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
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Semua Peran (Roles)</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.code}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="border-slate-200/80 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase bg-slate-50/80 dark:bg-slate-900/80">
              <tr>
                <th className="py-3 px-3 w-12 text-center">No.</th>
                <th className="py-3.5 px-4">Nama Lengkap</th>
                <th className="py-3.5 px-4">Email Login</th>
                <th className="py-3.5 px-4">Nomor HP</th>
                <th className="py-3.5 px-4">Peran (Roles)</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <TableLoading colSpan={7} message="Memuat akun pengguna..." />
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                    Tidak ada akun pengguna yang cocok.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u, idx) => {
                  const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-3 text-center text-xs font-medium text-slate-400">
                        {rowNumber}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                        {u.full_name}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-600 dark:text-slate-300">
                        {u.email}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {u.phone || "-"}
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <div className="flex flex-wrap gap-1">
                          {u.roles?.map((r: any) => (
                            <Badge key={r.code || r.id} variant="secondary" className="text-[10px]">
                              {r.name}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(u)}
                          className="inline-block cursor-pointer"
                          title="Klik untuk toggle status aktif/nonaktif"
                        >
                          <Badge variant={u.is_active ? "success" : "secondary"}>
                            {u.is_active ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEdit(u)}
                            className="h-8 px-2 text-xs text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                            title="Edit Pengguna"
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteUser(u)}
                            className="h-8 px-2 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="Nonaktifkan User"
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
          totalItems={filteredUsers.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </Card>

      {/* Slide-over: Tambah / Edit User */}
      <SlideOver
        isOpen={isSlideOverOpen}
        onClose={() => setIsSlideOverOpen(false)}
        title={editingUser ? `Edit Pengguna: ${editingUser.full_name}` : "Daftarkan Pengguna (User) Baru"}
        description="Lengkapi identitas kredensial login dan tentukan peran (roles) wewenang hak akses."
        width="xl"
        footer={
          <div className="flex justify-between items-center w-full">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsSlideOverOpen(false)}>
              Batal
            </Button>
            <Button
              type="submit"
              form="create-user-form"
              size="sm"
              isLoading={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Save className="h-4 w-4 mr-1.5" />
              {editingUser ? "Simpan Perubahan" : "Daftarkan User Baru"}
            </Button>
          </div>
        }
      >
        <form id="create-user-form" onSubmit={handleSaveUser} className="space-y-5">
          {/* Identitas Pengguna */}
          <div className="space-y-3.5 bg-slate-50/80 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <User className="h-4 w-4 text-indigo-600" />
              1. Identitas Kredensial Pengguna
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nama Lengkap Pegawai <span className="text-rose-500">*</span>
              </label>
              <Input
                required
                placeholder="Contoh: Budi Santoso"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Email Login <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  type="email"
                  placeholder="budi@company.com"
                  value={formEmail}
                  disabled={!!editingUser}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nomor Telepon / WhatsApp
                </label>
                <Input
                  placeholder="081234567890"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {!editingUser && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Kata Sandi (Password) <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  type="password"
                  placeholder="Minimal 6 karakter..."
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="h-9 text-xs"
                />
                <p className="text-[11px] text-slate-400">
                  Password akan dienkripsi dengan algoritma bcrypt tingkat tinggi sebelum disimpan.
                </p>
              </div>
            )}

            {editingUser && (
              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Akun Aktif (Dapat Login ke Sistem ERP)</span>
                </label>
              </div>
            )}
          </div>

          {/* Alokasi Peran (Roles) */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <Shield className="h-4 w-4 text-indigo-600" />
              2. Alokasi Peran (Roles & Permissions) <span className="text-rose-500">*</span>
            </div>

            <div className="space-y-2">
              {roles.map((r) => {
                const isSelected = formSelectedRoles.includes(r.id);
                return (
                  <label
                    key={r.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-indigo-50/70 border-indigo-300 dark:bg-indigo-950/40 dark:border-indigo-800"
                        : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleRoleSelection(r.id)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-slate-100">{r.name}</span>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          {r.code}
                        </span>
                      </div>
                      <p className="text-slate-500 text-[11px] mt-0.5">{r.description || "Peran hak akses sistem."}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </form>
      </SlideOver>
    </div>
  );
}
