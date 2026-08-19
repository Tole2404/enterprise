"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  CalendarCheck,
  Search,
  Plus,
  CheckCircle,
  XCircle,
  Download,
  Printer,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import { exportTableToPDF } from "@/lib/pdf-export";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SlideOver } from "@/components/ui/slide-over";
import { DataTablePagination } from "@/components/ui/pagination";
import { TableLoading } from "@/components/ui/table-loading";

export default function LeavesPage() {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // SlideOver State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formEmpId, setFormEmpId] = useState("");
  const [formType, setFormType] = useState("ANNUAL");
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [formEndDate, setFormEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [formReason, setFormReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchLeaves = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<any>("/hr/leaves", { per_page: 100 });
      if (res.data?.items) {
        setLeaves(res.data.items);
      } else if (Array.isArray(res.data)) {
        setLeaves(res.data);
      } else {
        setLeaves([]);
      }
    } catch (e) {
      console.error("Gagal mengambil permohonan cuti dari database:", e);
      setLeaves([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get<any>("/hr/employees");
      if (res.data?.items) setEmployees(res.data.items);
    } catch (e) {}
  };

  useEffect(() => {
    fetchLeaves();
    fetchEmployees();
  }, []);

  const filteredLeaves = useMemo(() => {
    return leaves.filter((l) => {
      const matchSearch =
        l.employee?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        l.reason?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = !statusFilter || l.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [leaves, search, statusFilter]);

  const paginatedLeaves = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLeaves.slice(start, start + pageSize);
  }, [filteredLeaves, currentPage, pageSize]);

  const handleCreateLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post("/hr/leaves", {
        employee_id: formEmpId,
        leave_type: formType,
        start_date: formStartDate,
        end_date: formEndDate,
        reason: formReason,
      });
      setIsAddModalOpen(false);
      fetchLeaves();
    } catch (err: any) {
      alert(err.message || "Gagal mengajukan cuti");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveLeave = async (id: string, status: "APPROVED" | "REJECTED") => {
    try {
      await api.post(`/hr/leaves/${id}/approve`, { status });
      fetchLeaves();
    } catch (err: any) {
      alert(err.message || "Gagal mengubah status permohonan cuti");
    }
  };

  const handleExportPDF = () => {
    exportTableToPDF({
      title: "Laporan Rekapitulasi Pengajuan Cuti Karyawan",
      subtitle: "Daftar permohonan izin cuti, jenis cuti, rentang tanggal, dan status persetujuan",
      columns: [
        {
          header: "Nama Pegawai",
          key: "employee",
          render: (row) => `${row.employee?.full_name || "Karyawan"} [${row.employee?.employee_no || "-"}]`,
        },
        {
          header: "Jenis Cuti",
          key: "leave_type",
          align: "center",
          render: (row) => {
            if (row.leave_type === "ANNUAL") return "Cuti Tahunan";
            if (row.leave_type === "SICK") return "Sakit (Surat Dokter)";
            if (row.leave_type === "MATERNITY") return "Cuti Melahirkan";
            return "Izin Tidak Dibayar (Unpaid)";
          },
        },
        {
          header: "Tanggal Mulai",
          key: "start_date",
          render: (row) => formatDate(row.start_date),
        },
        {
          header: "Tanggal Selesai",
          key: "end_date",
          render: (row) => formatDate(row.end_date),
        },
        {
          header: "Alasan / Keperluan",
          key: "reason",
          render: (row) => row.reason || "-",
        },
        {
          header: "Status Otorisasi",
          key: "status",
          align: "center",
          render: (row) => {
            if (row.status === "APPROVED") return "DISETUJUI (APPROVED)";
            if (row.status === "REJECTED") return "DITOLAK";
            return "MENUNGGU PERSETUJUAN";
          },
        },
      ],
      data: filteredLeaves,
      summaryItems: [
        { label: "Total Pengajuan Cuti", value: `${filteredLeaves.length} Permohonan` },
      ],
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CalendarCheck className="h-6 w-6 text-indigo-600" />
            Pengajuan Cuti & Izin Karyawan
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Permohonan cuti tahunan, sakit, atau izin khusus beserta persetujuan atasan.
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
            Ajukan Cuti Baru
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <Card className="border-slate-200/80 dark:border-slate-800">
        <CardContent className="p-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Input
                placeholder="Cari nama karyawan atau alasan cuti..."
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
                <option value="">Semua Status Pengajuan</option>
                <option value="PENDING">Menunggu Persetujuan</option>
                <option value="APPROVED">Disetujui (Approved)</option>
                <option value="REJECTED">Ditolak</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leaves Table */}
      <Card className="border-slate-200/80 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase bg-slate-50/80 dark:bg-slate-900/80">
              <tr>
                <th className="py-3 px-3 w-12 text-center">No.</th>
                <th className="py-3.5 px-4">Nama Pegawai</th>
                <th className="py-3.5 px-4">Jenis Cuti</th>
                <th className="py-3.5 px-4">Periode Tanggal</th>
                <th className="py-3.5 px-4">Alasan Cuti</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <TableLoading colSpan={7} message="Memuat pengajuan cuti..." />
              ) : paginatedLeaves.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                    Tidak ada permohonan cuti yang cocok.
                  </td>
                </tr>
              ) : (
                paginatedLeaves.map((l, idx) => {
                  const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr key={l.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-3 text-center text-xs font-medium text-slate-400">
                        {rowNumber}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                        {l.employee?.full_name}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                        {l.leave_type === "ANNUAL" && "Cuti Tahunan"}
                        {l.leave_type === "SICK" && "Cuti Sakit"}
                        {l.leave_type === "MATERNITY" && "Cuti Melahirkan"}
                        {l.leave_type === "UNPAID" && "Izin Tanpa Gaji"}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {formatDate(l.start_date)} s/d {formatDate(l.end_date)}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 max-w-xs truncate">
                        {l.reason}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {l.status === "PENDING" && <Badge variant="warning">Menunggu</Badge>}
                        {l.status === "APPROVED" && <Badge variant="success">Disetujui</Badge>}
                        {l.status === "REJECTED" && <Badge variant="destructive">Ditolak</Badge>}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {l.status === "PENDING" && (
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApproveLeave(l.id, "APPROVED")}
                              className="text-xs text-emerald-600 hover:bg-emerald-50 h-7 px-2"
                            >
                              <CheckCircle className="h-3.5 w-3.5 mr-1" />
                              Setujui
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApproveLeave(l.id, "REJECTED")}
                              className="text-xs text-rose-600 hover:bg-rose-50 h-7 px-2"
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              Tolak
                            </Button>
                          </div>
                        )}
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
          totalItems={filteredLeaves.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </Card>

      {/* Slide-over: Ajukan Cuti */}
      <SlideOver
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Formulir Pengajuan Cuti / Izin"
        description="Pilih pegawai yang mengajukan dan tentukan rentang tanggal izin."
        width="lg"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" form="create-leave-form" isLoading={isSubmitting}>
              Kirim Permohonan
            </Button>
          </>
        }
      >
        <form id="create-leave-form" onSubmit={handleCreateLeave} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Pilih Pegawai <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={formEmpId}
              onChange={(e) => setFormEmpId(e.target.value)}
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              <option value="" disabled>Pilih Pegawai...</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.employee_no} - {e.full_name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Jenis Permohonan <span className="text-rose-500">*</span>
            </label>
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value)}
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              <option value="ANNUAL">Cuti Tahunan</option>
              <option value="SICK">Cuti Sakit</option>
              <option value="MATERNITY">Cuti Melahirkan</option>
              <option value="UNPAID">Izin Tanpa Gaji (Unpaid)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tanggal Mulai <span className="text-rose-500">*</span>
              </label>
              <Input
                type="date"
                required
                value={formStartDate}
                onChange={(e) => setFormStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tanggal Selesai <span className="text-rose-500">*</span>
              </label>
              <Input
                type="date"
                required
                value={formEndDate}
                onChange={(e) => setFormEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Alasan Pengajuan Cuti / Keterangan Medis
            </label>
            <textarea
              rows={3}
              placeholder="Contoh: Keperluan keluarga mendesak di luar kota / Istirahat sakit surat dokter..."
              value={formReason}
              onChange={(e) => setFormReason(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 resize-y"
            />
          </div>
        </form>
      </SlideOver>
    </div>
  );
}
