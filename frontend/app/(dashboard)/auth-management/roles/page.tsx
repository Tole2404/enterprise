"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  Search,
  Check,
  Shield,
  Plus,
  Pencil,
  Trash2,
  Download,
  Lock,
  Sparkles,
  CheckSquare,
  Square,
  Save,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { exportTableToPDF } from "@/lib/pdf-export";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SlideOver } from "@/components/ui/slide-over";
import { DataTablePagination } from "@/components/ui/pagination";
import { TableLoading } from "@/components/ui/table-loading";

export default function RolesMatrixPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // SlideOver State for Add / Edit Role
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formSelectedPermissions, setFormSelectedPermissions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTogglingDirect, setIsTogglingDirect] = useState(false);

  const fetchMatrix = async () => {
    setIsLoading(true);
    try {
      const rRes = await api.get<any>("/auth/roles");
      if (rRes.data) setRoles(Array.isArray(rRes.data) ? rRes.data : rRes.data.items || []);

      const pRes = await api.get<any>("/auth/permissions");
      if (pRes.data) setPermissions(Array.isArray(pRes.data) ? pRes.data : pRes.data.items || []);
    } catch (e) {
      console.error("Gagal mengambil data roles & permissions dari database:", e);
      setRoles([]);
      setPermissions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrix();
  }, []);

  const modules = useMemo(() => {
    return Array.from(new Set(permissions.map((p) => p.module))).filter(Boolean);
  }, [permissions]);

  const filteredPermissions = useMemo(() => {
    return permissions.filter((p) => {
      const matchSearch =
        p.code?.toLowerCase().includes(search.toLowerCase()) ||
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase()) ||
        p.module?.toLowerCase().includes(search.toLowerCase());
      const matchModule = !moduleFilter || p.module === moduleFilter;
      return matchSearch && matchModule;
    });
  }, [permissions, search, moduleFilter]);

  const paginatedPermissions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPermissions.slice(start, start + pageSize);
  }, [filteredPermissions, currentPage, pageSize]);

  // Handle open Add Modal
  const handleOpenAdd = () => {
    setEditingRole(null);
    setFormCode("");
    setFormName("");
    setFormDesc("");
    setFormSelectedPermissions([]);
    setIsSlideOverOpen(true);
  };

  // Handle open Edit Modal
  const handleOpenEdit = (role: any) => {
    setEditingRole(role);
    setFormCode(role.code || "");
    setFormName(role.name || "");
    setFormDesc(role.description || "");

    // Extract current permission IDs
    const currentPermIds = (role.permissions || []).map((p: any) => p.id);
    setFormSelectedPermissions(currentPermIds);
    setIsSlideOverOpen(true);
  };

  // Auto-format Role Code when typing Role Name
  const handleNameChange = (val: string) => {
    setFormName(val);
    if (!editingRole) {
      const autoCode = val
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "");
      setFormCode(autoCode);
    }
  };

  // Toggle single permission checkbox in slideover
  const togglePermission = (permId: string) => {
    if (formSelectedPermissions.includes(permId)) {
      setFormSelectedPermissions(formSelectedPermissions.filter((id) => id !== permId));
    } else {
      setFormSelectedPermissions([...formSelectedPermissions, permId]);
    }
  };

  // Select / Unselect all permissions in a specific module
  const handleToggleModule = (moduleName: string, selectAll: boolean) => {
    const modulePermIds = permissions.filter((p) => p.module === moduleName).map((p) => p.id);
    if (selectAll) {
      const combined = Array.from(new Set([...formSelectedPermissions, ...modulePermIds]));
      setFormSelectedPermissions(combined);
    } else {
      setFormSelectedPermissions(formSelectedPermissions.filter((id) => !modulePermIds.includes(id)));
    }
  };

  // Select / Unselect ALL permissions
  const handleToggleAllPermissions = (selectAll: boolean) => {
    if (selectAll) {
      setFormSelectedPermissions(permissions.map((p) => p.id));
    } else {
      setFormSelectedPermissions([]);
    }
  };

  // Direct toggle on matrix table cell
  const handleDirectToggleMatrix = async (role: any, perm: any) => {
    if (role.code === "SUPER_ADMIN") {
      alert("Role SUPER_ADMIN memiliki hak akses penuh ke seluruh modul sistem secara permanen.");
      return;
    }

    const currentPermIds = (role.permissions || []).map((p: any) => p.id);
    const hasPerm = currentPermIds.includes(perm.id);
    const newPermIds = hasPerm
      ? currentPermIds.filter((id: string) => id !== perm.id)
      : [...currentPermIds, perm.id];

    setIsTogglingDirect(true);
    try {
      await api.put(`/auth/roles/${role.id}/permissions`, {
        permission_ids: newPermIds,
      });
      // Refresh local matrix without full loading indicator
      const rRes = await api.get<any>("/auth/roles");
      if (rRes.data) setRoles(Array.isArray(rRes.data) ? rRes.data : rRes.data.items || []);
    } catch (err: any) {
      alert(err.message || "Gagal memperbarui izin role");
    } finally {
      setIsTogglingDirect(false);
    }
  };

  // Save Role (Create or Update)
  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert("Nama Role wajib diisi!");
      return;
    }
    if (!formCode.trim()) {
      alert("Kode Role wajib diisi!");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingRole) {
        // Update Role
        await api.put(`/auth/roles/${editingRole.id}`, {
          name: formName,
          description: formDesc,
          permission_ids: formSelectedPermissions,
        });
        alert(`✅ Peran "${formName}" dan ${formSelectedPermissions.length} hak akses berhasil diperbarui!`);
      } else {
        // Create Role
        await api.post("/auth/roles", {
          code: formCode,
          name: formName,
          description: formDesc,
          permission_ids: formSelectedPermissions,
        });
        alert(`✅ Peran baru "${formName}" berhasil dibuat!`);
      }

      setIsSlideOverOpen(false);
      fetchMatrix();
    } catch (err: any) {
      alert(err.message || "Gagal menyimpan peran");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Role
  const handleDeleteRole = async (role: any) => {
    if (role.code === "SUPER_ADMIN") {
      alert("Peran SUPER_ADMIN sistem tidak dapat dihapus!");
      return;
    }
    if (!confirm(`Apakah Anda yakin ingin menghapus peran "${role.name}" (${role.code})? Seluruh akun yang memiliki peran ini akan kehilangan akses terkait.`)) {
      return;
    }

    try {
      await api.delete(`/auth/roles/${role.id}`);
      alert("✅ Peran berhasil dihapus");
      fetchMatrix();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus peran");
    }
  };

  // Export Matrix Table to PDF
  const handleExportPDF = () => {
    exportTableToPDF({
      title: "Matriks Hak Akses Peran & Otoritas Sistem (RBAC Matrix)",
      subtitle: "Pemetaan granular izin operasional per modul untuk setiap peran pengguna",
      orientation: "landscape",
      columns: [
        { header: "Modul", key: "module", width: "90px" },
        { header: "Kode Izin (Permission)", key: "code", width: "160px" },
        {
          header: "Deskripsi Hak Akses",
          key: "description",
          render: (row) => row.name || row.description || row.code,
        },
        ...roles.map((r) => ({
          header: r.name,
          key: r.code,
          align: "center" as const,
          render: (row: any) => {
            if (r.code === "SUPER_ADMIN") return "✓ ADA";
            const rolePerms = (r.permissions || []).map((p: any) => p.id || p.code);
            const has = rolePerms.includes(row.id) || rolePerms.includes(row.code);
            return has ? "✓ ADA" : "-";
          },
        })),
      ],
      data: filteredPermissions,
      summaryItems: [
        { label: "Total Peran (Roles)", value: `${roles.length} Role` },
        { label: "Total Hak Akses Granular", value: `${filteredPermissions.length} Izin` },
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
            Role & Permission Matrix (RBAC)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Kelola peran pengguna, granular hak akses modul, dan sesuaikan izin matriks secara fleksibel.
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
            Export Matrix PDF
          </Button>
          <Button onClick={handleOpenAdd} size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Tambah Role Baru
          </Button>
        </div>
      </div>

      {/* Roles Cards Grid with Edit / Delete Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {roles.map((r) => {
          const isSuper = r.code === "SUPER_ADMIN";
          const permCount = isSuper ? permissions.length : (r.permissions || []).length;

          return (
            <Card
              key={r.id}
              className="border-slate-200/80 dark:border-slate-800 hover:shadow-md transition-shadow relative overflow-hidden group"
            >
              <div className="h-1 bg-indigo-600 w-full" />
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-indigo-600" />
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {r.name}
                    </CardTitle>
                  </div>
                  {isSuper ? (
                    <Badge variant="indigo" className="text-[10px] uppercase">
                      Sistem Inti
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">
                      {permCount}/{permissions.length} Izin
                    </Badge>
                  )}
                </div>
                <span className="text-[10px] font-mono text-slate-400 block mt-0.5">{r.code}</span>
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <p className="text-xs text-slate-500 line-clamp-2 min-h-[32px]">
                  {r.description || "Peran pengguna terkonfigurasi pada sistem ERP Enterprise."}
                </p>

                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenEdit(r)}
                    className="h-7 px-2.5 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:border-indigo-800 dark:hover:bg-indigo-950/40 w-full"
                  >
                    <Pencil className="h-3 w-3 mr-1.5" />
                    Edit & Atur Izin
                  </Button>
                  {!isSuper && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteRole(r)}
                      className="h-7 px-2 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      title="Hapus Role"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filter & Search Bar */}
      <Card className="border-slate-200/80 dark:border-slate-800">
        <CardContent className="p-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Input
                placeholder="Cari kode izin atau nama hak akses..."
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
                value={moduleFilter}
                onChange={(e) => {
                  setModuleFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Semua Modul ERP</option>
                {modules.map((m) => (
                  <option key={m} value={m}>
                    Modul {m.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permission Matrix Table */}
      <Card className="border-slate-200/80 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase bg-slate-50/80 dark:bg-slate-900/80">
              <tr>
                <th className="py-3 px-3 w-12 text-center">No.</th>
                <th className="py-3.5 px-4 w-28">Modul</th>
                <th className="py-3.5 px-4 w-52">Kode Izin (Permission)</th>
                <th className="py-3.5 px-4">Deskripsi Hak Akses</th>
                {roles.map((r) => (
                  <th key={r.id} className="py-3.5 px-3 text-center min-w-[110px]">
                    <div className="flex flex-col items-center">
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">{r.name}</span>
                      <button
                        onClick={() => handleOpenEdit(r)}
                        className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 mt-0.5"
                      >
                        <Pencil className="h-2.5 w-2.5" /> Edit
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <TableLoading colSpan={4 + roles.length} message="Memuat matriks perizinan RBAC..." />
              ) : paginatedPermissions.length === 0 ? (
                <tr>
                  <td colSpan={4 + roles.length} className="py-8 text-center text-xs text-slate-400">
                    Tidak ada hak akses yang cocok dengan pencarian.
                  </td>
                </tr>
              ) : (
                paginatedPermissions.map((p, idx) => {
                  const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-3 text-center text-xs font-medium text-slate-400">
                        {rowNumber}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="indigo" className="uppercase text-[10px]">
                          {p.module}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {p.code}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400">
                        {p.name || p.description || p.code}
                      </td>
                      {roles.map((r) => {
                        const isSuper = r.code === "SUPER_ADMIN";
                        const rolePermIds = (r.permissions || []).map((item: any) => item.id || item.code);
                        const isGranted = isSuper || rolePermIds.includes(p.id) || rolePermIds.includes(p.code);

                        return (
                          <td key={r.id} className="py-3 px-3 text-center">
                            {isSuper ? (
                              <div className="flex items-center justify-center text-emerald-600 dark:text-emerald-400" title="Hak Akses Penuh Sistem">
                                <Check className="h-4 w-4 stroke-[2.5]" />
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleDirectToggleMatrix(r, p)}
                                className={`p-1.5 rounded-lg transition-colors inline-flex items-center justify-center ${
                                  isGranted
                                    ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400"
                                    : "bg-slate-100 text-slate-400 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-500"
                                }`}
                                title={isGranted ? "Klik untuk mencabut izin" : "Klik untuk memberikan izin"}
                              >
                                {isGranted ? (
                                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                                ) : (
                                  <span className="text-xs font-bold w-3.5 h-3.5 flex items-center justify-center">&ndash;</span>
                                )}
                              </button>
                            )}
                          </td>
                        );
                      })}
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
          totalItems={filteredPermissions.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </Card>

      {/* SlideOver: Tambah / Edit Peran & Granular Permissions */}
      <SlideOver
        isOpen={isSlideOverOpen}
        onClose={() => setIsSlideOverOpen(false)}
        title={editingRole ? `Edit Peran: ${editingRole.name}` : "Tambah Peran (Role) Baru"}
        description="Atur identitas peran dan centang hak akses yang diizinkan untuk peran ini."
        width="2xl"
        footer={
          <div className="flex justify-between items-center w-full">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsSlideOverOpen(false)}>
              Batal
            </Button>
            <Button
              type="submit"
              form="role-permission-form"
              size="sm"
              isLoading={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Save className="h-4 w-4 mr-1.5" />
              Simpan Peran & Hak Akses
            </Button>
          </div>
        }
      >
        <form id="role-permission-form" onSubmit={handleSaveRole} className="space-y-6">
          {/* Section 1: Identitas Role */}
          <div className="space-y-3.5 bg-slate-50/80 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Shield className="h-4 w-4 text-indigo-600" />
              1. Identitas Peran (Role Information)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nama Peran <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  placeholder="Contoh: Manager Operasional"
                  value={formName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Kode Role (Identifier) <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  placeholder="Contoh: MANAGER_OPERASIONAL"
                  value={formCode}
                  disabled={editingRole?.code === "SUPER_ADMIN"}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  className="h-9 font-mono text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Deskripsi Tanggung Jawab
              </label>
              <textarea
                rows={2}
                placeholder="Jelaskan cakupan wewenang peran ini..."
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 resize-none"
              />
            </div>
          </div>

          {/* Section 2: Alokasi Permissions per Modul */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <Lock className="h-4 w-4 text-indigo-600" />
                  2. Alokasi Hak Akses Modul ({formSelectedPermissions.length} Dipilih)
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Centang izin yang diberikan kepada pengguna dengan peran ini.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleToggleAllPermissions(true)}
                  className="h-7 px-2 text-[11px]"
                >
                  Pilih Semua
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleToggleAllPermissions(false)}
                  className="h-7 px-2 text-[11px] text-slate-500"
                >
                  Kosongkan
                </Button>
              </div>
            </div>

            {/* Modules Accordion / List */}
            <div className="space-y-4">
              {modules.map((mod) => {
                const modPerms = permissions.filter((p) => p.module === mod);
                const selectedModCount = modPerms.filter((p) => formSelectedPermissions.includes(p.id)).length;
                const isAllSelected = selectedModCount === modPerms.length && modPerms.length > 0;

                return (
                  <div
                    key={mod}
                    className="border border-slate-200/90 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-950"
                  >
                    {/* Module Header Bar */}
                    <div className="bg-slate-50 dark:bg-slate-900/60 px-3.5 py-2.5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs uppercase text-slate-900 dark:text-slate-100 tracking-wider">
                          Modul {mod}
                        </span>
                        <Badge variant="indigo" className="text-[10px]">
                          {selectedModCount}/{modPerms.length}
                        </Badge>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleModule(mod, !isAllSelected)}
                        className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-semibold flex items-center gap-1"
                      >
                        {isAllSelected ? (
                          <>
                            <CheckSquare className="h-3.5 w-3.5" /> Batalkan Modul Ini
                          </>
                        ) : (
                          <>
                            <Square className="h-3.5 w-3.5" /> Pilih Semua Modul Ini
                          </>
                        )}
                      </button>
                    </div>

                    {/* Permissions Grid */}
                    <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {modPerms.map((perm) => {
                        const isChecked = formSelectedPermissions.includes(perm.id);

                        return (
                          <label
                            key={perm.id}
                            className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                              isChecked
                                ? "bg-indigo-50/60 border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-900/60"
                                : "border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => togglePermission(perm.id)}
                              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <div className="flex-1 text-xs">
                              <div className="font-semibold text-slate-900 dark:text-slate-100 font-mono text-[11.5px]">
                                {perm.code}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {perm.name || perm.description || "Hak akses modul"}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </form>
      </SlideOver>
    </div>
  );
}
