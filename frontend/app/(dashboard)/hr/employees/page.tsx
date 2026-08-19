"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  UserCheck,
  Search,
  Plus,
  Pencil,
  Trash2,
  Download,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { exportTableToPDF } from "@/lib/pdf-export";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SlideOver } from "@/components/ui/slide-over";
import { DataTablePagination } from "@/components/ui/pagination";
import { TableLoading } from "@/components/ui/table-loading";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // SlideOver State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [isAddDeptOpen, setIsAddDeptOpen] = useState(false);
  const [isAddPosOpen, setIsAddPosOpen] = useState(false);

  // Quick Add Dept state
  const [newDeptCode, setNewDeptCode] = useState("");
  const [newDeptName, setNewDeptName] = useState("");
  const [isSavingDept, setIsSavingDept] = useState(false);

  // Quick Add Pos state
  const [newPosCode, setNewPosCode] = useState("");
  const [newPosTitle, setNewPosTitle] = useState("");
  const [isSavingPos, setIsSavingPos] = useState(false);

  const [formEmpNo, setFormEmpNo] = useState("");
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formDeptId, setFormDeptId] = useState("");
  const [formPosId, setFormPosId] = useState("");
  const [formSalary, setFormSalary] = useState("");
  const [formJoinDate, setFormJoinDate] = useState(new Date().toISOString().split("T")[0]);
  const [formAddress, setFormAddress] = useState("");
  const [formStatus, setFormStatus] = useState("ACTIVE");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<any>("/hr/employees", { per_page: 100 });
      if (res.data?.items) {
        setEmployees(res.data.items);
      } else if (Array.isArray(res.data)) {
        setEmployees(res.data);
      } else {
        setEmployees([]);
      }
    } catch (e) {
      console.error("Gagal mengambil data karyawan dari database:", e);
      setEmployees([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMaster = async () => {
    try {
      const dRes = await api.get<any>("/hr/departments");
      if (dRes.data) setDepartments(Array.isArray(dRes.data) ? dRes.data : dRes.data.items || []);

      const pRes = await api.get<any>("/hr/positions");
      if (pRes.data) setPositions(Array.isArray(pRes.data) ? pRes.data : pRes.data.items || []);
    } catch (e) {}
  };

  useEffect(() => {
    fetchEmployees();
    fetchMaster();
  }, []);

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchSearch =
        emp.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        emp.employee_no?.toLowerCase().includes(search.toLowerCase()) ||
        emp.email?.toLowerCase().includes(search.toLowerCase());
      const matchDept = !deptFilter || emp.department_id === deptFilter || emp.department?.name === deptFilter;
      const matchStatus = !statusFilter || emp.status === statusFilter;
      return matchSearch && matchDept && matchStatus;
    });
  }, [employees, search, deptFilter, statusFilter]);

  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, currentPage, pageSize]);

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingDept(true);
    try {
      const res = await api.post<any>("/hr/departments", {
        code: newDeptCode.toUpperCase(),
        name: newDeptName,
      });
      setIsAddDeptOpen(false);
      setNewDeptCode("");
      setNewDeptName("");
      await fetchMaster();
      if (res.data?.id) setFormDeptId(res.data.id);
    } catch (err: any) {
      alert(err.message || "Gagal membuat departemen baru");
    } finally {
      setIsSavingDept(false);
    }
  };

  const handleCreatePos = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPos(true);
    try {
      const res = await api.post<any>("/hr/positions", {
        code: newPosCode.toUpperCase(),
        title: newPosTitle,
        department_id: formDeptId || undefined,
        base_salary: parseFloat(formSalary) || 0,
      });
      setIsAddPosOpen(false);
      setNewPosCode("");
      setNewPosTitle("");
      await fetchMaster();
      if (res.data?.id) setFormPosId(res.data.id);
    } catch (err: any) {
      alert(err.message || "Gagal membuat jabatan baru");
    } finally {
      setIsSavingPos(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingEmployee(null);
    setFormEmpNo("");
    setFormName("");
    setFormEmail("");
    setFormPhone("");
    setFormDeptId("");
    setFormPosId("");
    setFormSalary("");
    setFormJoinDate(new Date().toISOString().split("T")[0]);
    setFormAddress("");
    setFormStatus("ACTIVE");
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (emp: any) => {
    setEditingEmployee(emp);
    setFormEmpNo(emp.employee_no || "");
    setFormName(emp.full_name || "");
    setFormEmail(emp.email || "");
    setFormPhone(emp.phone || "");
    setFormDeptId(emp.department_id || "");
    setFormPosId(emp.position_id || "");
    setFormSalary(emp.base_salary !== undefined && emp.base_salary !== null ? String(emp.base_salary) : "");
    setFormJoinDate(emp.join_date ? emp.join_date.split("T")[0] : new Date().toISOString().split("T")[0]);
    setFormAddress(emp.address || "");
    setFormStatus(emp.status || "ACTIVE");
    setIsAddModalOpen(true);
  };

  const handleToggleStatus = async (emp: any) => {
    const nextStatus = emp.status === "ACTIVE" ? "TERMINATED" : "ACTIVE";
    try {
      await api.put(`/hr/employees/${emp.id}`, {
        status: nextStatus,
      });
      fetchEmployees();
    } catch (err: any) {
      alert(err.message || "Gagal mengubah status karyawan");
    }
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        employee_no: formEmpNo,
        full_name: formName,
        email: formEmail,
        phone: formPhone,
        department_id: formDeptId || undefined,
        position_id: formPosId || undefined,
        base_salary: parseFloat(formSalary) || 0,
        join_date: formJoinDate,
        address: formAddress,
        status: formStatus,
      };

      if (editingEmployee) {
        await api.put(`/hr/employees/${editingEmployee.id}`, payload);
      } else {
        await api.post("/hr/employees", payload);
      }

      setIsAddModalOpen(false);
      fetchEmployees();
    } catch (err: any) {
      alert(err.message || "Gagal menyimpan data karyawan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEmployee = async (emp: any) => {
    if (!confirm(`Apakah Anda yakin ingin menonaktifkan karyawan "${emp.full_name}" (${emp.employee_no})?`)) return;
    try {
      await api.delete(`/hr/employees/${emp.id}`);
      fetchEmployees();
    } catch (err: any) {
      alert(err.message || "Gagal menonaktifkan karyawan");
    }
  };

  const handleExportPDF = () => {
    const totalPayrollEst = filteredEmployees.reduce((sum, emp) => sum + (emp.base_salary || 0), 0);

    exportTableToPDF({
      title: "Laporan Direktori Data Karyawan & Personalia (HR)",
      subtitle: "Daftar pegawai aktif, departemen, jabatan struktural, dan gaji pokok",
      orientation: "landscape",
      columns: [
        { header: "NIK / No. Pegawai", key: "employee_no", width: "120px" },
        { header: "Nama Lengkap", key: "full_name" },
        {
          header: "Departemen",
          key: "department",
          render: (row) => row.department?.name || "-",
        },
        {
          header: "Posisi / Jabatan",
          key: "position",
          render: (row) => row.position?.title || "-",
        },
        {
          header: "Tanggal Bergabung",
          key: "join_date",
          render: (row) => formatDate(row.join_date),
        },
        {
          header: "Gaji Pokok",
          key: "base_salary",
          align: "right",
          render: (row) => formatCurrency(row.base_salary),
        },
        {
          header: "Status Kerja",
          key: "status",
          align: "center",
          render: (row) => (row.status === "ACTIVE" ? "AKTIF" : "NONAKTIF"),
        },
      ],
      data: filteredEmployees,
      summaryItems: [
        { label: "Total Karyawan", value: `${filteredEmployees.length} Orang` },
        { label: "Estimasi Beban Gaji Pokok", value: formatCurrency(totalPayrollEst) },
      ],
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-indigo-600" />
            Direktori Data Karyawan (HR)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Data identitas personil, penempatan departemen, jabatan, dan struktur gaji pokok.
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
            Tambah Karyawan
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <Card className="border-slate-200/90 dark:border-slate-800">
        <CardContent className="p-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Input
                placeholder="Cari NIK/No Karyawan, nama lengkap, atau email..."
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
                value={deptFilter}
                onChange={(e) => {
                  setDeptFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Semua Departemen</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
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
                <option value="RESIGNED">Resign</option>
                <option value="TERMINATED">Nonaktif / Diberhentikan</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employees Table */}
      <Card className="border-slate-200/90 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase bg-slate-100/90 dark:bg-slate-900/90">
              <tr>
                <th className="py-3 px-3 w-12 text-center">No.</th>
                <th className="py-3.5 px-4 w-36">NIK / No. Pegawai</th>
                <th className="py-3.5 px-4">Nama Lengkap</th>
                <th className="py-3.5 px-4">Departemen & Jabatan</th>
                <th className="py-3.5 px-4 text-right">Gaji Pokok</th>
                <th className="py-3.5 px-4">Tgl Bergabung</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 w-28 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <TableLoading colSpan={8} message="Memuat direktori karyawan..." />
              ) : paginatedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-slate-400">
                    Tidak ada data karyawan yang cocok.
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((emp, idx) => {
                  const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-3 text-center text-xs font-medium text-slate-400">
                        {rowNumber}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                        {emp.employee_no}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{emp.full_name}</p>
                        <p className="text-xs text-slate-400">{emp.email}</p>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <p className="font-medium text-slate-800 dark:text-slate-200">{emp.position?.title || "-"}</p>
                        <p className="text-slate-400">{emp.department?.name || "-"}</p>
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-900 dark:text-slate-100">
                        {formatCurrency(emp.base_salary)}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {formatDate(emp.join_date)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(emp)}
                          className="cursor-pointer hover:scale-105 transition-transform"
                          title="Klik untuk ubah status Aktif / Nonaktif"
                        >
                          <Badge
                            variant={
                              emp.status === "ACTIVE"
                                ? "success"
                                : emp.status === "RESIGNED"
                                ? "warning"
                                : "secondary"
                            }
                          >
                            {emp.status === "ACTIVE"
                              ? "Aktif"
                              : emp.status === "RESIGNED"
                              ? "Resign"
                              : "Nonaktif"}
                          </Badge>
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEdit(emp)}
                            className="h-8 px-2 text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                            title="Edit Karyawan"
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteEmployee(emp)}
                            className="h-8 px-2 text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="Nonaktifkan Karyawan"
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
          totalItems={filteredEmployees.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </Card>

      {/* Slide-over: Tambah / Edit Karyawan */}
      <SlideOver
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingEmployee ? `Edit Data Karyawan: ${editingEmployee.full_name}` : "Daftarkan Pegawai / Karyawan Baru"}
        description={
          editingEmployee
            ? "Perbarui data personal, penempatan departemen, dan ketentuan gaji pokok."
            : "Lengkapi data personal, penempatan departemen, dan ketentuan gaji pokok."
        }
        width="xl"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" form="create-employee-form" isLoading={isSubmitting}>
              {editingEmployee ? "Simpan Perubahan Karyawan" : "Simpan Karyawan"}
            </Button>
          </>
        }
      >
        <form id="create-employee-form" onSubmit={handleSaveEmployee} className="space-y-5">
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              1. Identitas Personal Pegawai
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nomor Induk Karyawan (NIK) <span className="text-slate-400 font-normal">(Otomatis Sistem)</span>
                </label>
                <Input
                  placeholder="Otomatis dibuat sistem (atau ketik manual)"
                  value={formEmpNo}
                  onChange={(e) => setFormEmpNo(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nama Lengkap (Sesuai KTP) <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  placeholder="Nama lengkap..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Email Perusahaan / Pribadi <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="email"
                  required
                  placeholder="nama@perusahaan.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nomor HP / WhatsApp
                </label>
                <Input
                  placeholder="081234567890"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              2. Penempatan & Kompensasi Gaji
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Departemen <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddDeptOpen(true)}
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="h-3 w-3" /> Tambah Dept
                  </button>
                </div>
                <select
                  required
                  value={formDeptId}
                  onChange={(e) => setFormDeptId(e.target.value)}
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                >
                  <option value="" disabled>Pilih Departemen...</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Jabatan / Posisi <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddPosOpen(true)}
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="h-3 w-3" /> Tambah Jabatan
                  </button>
                </div>
                <select
                  required
                  value={formPosId}
                  onChange={(e) => setFormPosId(e.target.value)}
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                >
                  <option value="" disabled>Pilih Jabatan...</option>
                  {positions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Gaji Pokok Bulanan (Rp) <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="number"
                  required
                  prefixText="Rp"
                  placeholder="0"
                  value={formSalary}
                  onChange={(e) => setFormSalary(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Tanggal Mulai Bekerja <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="date"
                  required
                  value={formJoinDate}
                  onChange={(e) => setFormJoinDate(e.target.value)}
                />
              </div>
            </div>

            {editingEmployee && (
              <div className="space-y-1 pt-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Status Kepegawaian <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 font-semibold"
                >
                  <option value="ACTIVE">Aktif (Karyawan Aktif Bekerja)</option>
                  <option value="RESIGNED">Resign (Mengundurkan Diri)</option>
                  <option value="TERMINATED">Nonaktif / Diberhentikan</option>
                </select>
              </div>
            )}
          </div>

          <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Alamat Domisili Lengkap
            </label>
            <textarea
              rows={3}
              placeholder="Alamat tempat tinggal saat ini..."
              value={formAddress}
              onChange={(e) => setFormAddress(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 resize-y"
            />
          </div>
        </form>
      </SlideOver>

      {/* Slide-over: Tambah Departemen Baru */}
      <SlideOver
        isOpen={isAddDeptOpen}
        onClose={() => setIsAddDeptOpen(false)}
        title="Tambah Departemen Baru"
        description="Daftarkan divisi atau unit kerja organisasi perusahaan."
        width="md"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsAddDeptOpen(false)}>
              Batal
            </Button>
            <Button type="submit" form="create-dept-form" isLoading={isSavingDept}>
              Simpan Departemen
            </Button>
          </>
        }
      >
        <form id="create-dept-form" onSubmit={handleCreateDept} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Kode Departemen <span className="text-rose-500">*</span>
            </label>
            <Input
              required
              placeholder="Contoh: IT, HR, FIN, GA, MKT"
              value={newDeptCode}
              onChange={(e) => setNewDeptCode(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nama Departemen <span className="text-rose-500">*</span>
            </label>
            <Input
              required
              placeholder="Contoh: Teknologi Informasi, Keuangan & Pajak"
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
            />
          </div>
        </form>
      </SlideOver>

      {/* Slide-over: Tambah Jabatan Baru */}
      <SlideOver
        isOpen={isAddPosOpen}
        onClose={() => setIsAddPosOpen(false)}
        title="Tambah Jabatan / Posisi Baru"
        description="Daftarkan titel jabatan pekerjaan karyawan."
        width="md"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsAddPosOpen(false)}>
              Batal
            </Button>
            <Button type="submit" form="create-pos-form" isLoading={isSavingPos}>
              Simpan Jabatan
            </Button>
          </>
        }
      >
        <form id="create-pos-form" onSubmit={handleCreatePos} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Kode Posisi <span className="text-rose-500">*</span>
            </label>
            <Input
              required
              placeholder="Contoh: DEV, ACC, MGR, STF"
              value={newPosCode}
              onChange={(e) => setNewPosCode(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nama Jabatan / Title <span className="text-rose-500">*</span>
            </label>
            <Input
              required
              placeholder="Contoh: Senior Fullstack Engineer, Finance Officer"
              value={newPosTitle}
              onChange={(e) => setNewPosTitle(e.target.value)}
            />
          </div>
        </form>
      </SlideOver>
    </div>
  );
}
