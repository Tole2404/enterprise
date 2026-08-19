"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  CreditCard,
  Search,
  Sparkles,
  Eye,
  Download,
  Printer,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";
import { exportTableToPDF, exportDocumentToPDF } from "@/lib/pdf-export";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SlideOver } from "@/components/ui/slide-over";
import { DataTablePagination } from "@/components/ui/pagination";
import { TableLoading } from "@/components/ui/table-loading";

export default function PayrollPage() {
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Detail SlideOver State
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedPay, setSelectedPay] = useState<any>(null);

  const fetchPayroll = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<any>("/hr/payroll", { per_page: 100 });
      if (res.data?.items) {
        setPayrolls(res.data.items);
      } else if (Array.isArray(res.data)) {
        setPayrolls(res.data);
      } else {
        setPayrolls([]);
      }
    } catch (e) {
      console.error("Gagal mengambil data payroll dari database:", e);
      setPayrolls([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll();
  }, []);

  const filteredPayrolls = useMemo(() => {
    return payrolls.filter((p) => {
      return (
        p.payroll_no?.toLowerCase().includes(search.toLowerCase()) ||
        p.employee?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        p.employee?.employee_no?.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [payrolls, search]);

  const paginatedPayrolls = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPayrolls.slice(start, start + pageSize);
  }, [filteredPayrolls, currentPage, pageSize]);

  const handleGeneratePayroll = async () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    if (!confirm(`Generate batch payroll seluruh karyawan untuk periode ${month}/${year}?`)) return;

    setIsGenerating(true);
    try {
      await api.post("/hr/payroll/generate", {
        period_month: month,
        period_year: year,
      });
      alert("Batch payroll bulanan berhasil dibuat & dihitung otomatis!");
      fetchPayroll();
    } catch (err: any) {
      alert(err.message || "Gagal generate payroll");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportTablePDF = () => {
    const totalBase = filteredPayrolls.reduce((sum, p) => sum + (p.base_salary || 0), 0);
    const totalAllow = filteredPayrolls.reduce((sum, p) => sum + (p.allowances || 0), 0);
    const totalDeduct = filteredPayrolls.reduce((sum, p) => sum + (p.deductions || 0), 0);
    const totalTHP = filteredPayrolls.reduce((sum, p) => sum + (p.net_salary || 0), 0);

    exportTableToPDF({
      title: "Laporan Rekapitulasi Penggajian Karyawan (Payroll)",
      subtitle: "Daftar beban gaji pokok, tunjangan, potongan pajak/BPJS, dan total Take Home Pay (THP)",
      orientation: "landscape",
      columns: [
        { header: "Nomor Slip", key: "payroll_no", width: "130px" },
        {
          header: "Pegawai / NIK",
          key: "employee",
          render: (row) => `${row.employee?.full_name || "Karyawan"} [${row.employee?.employee_no || "-"}]`,
        },
        {
          header: "Periode",
          key: "period",
          align: "center",
          render: (row) => `${row.period_month}/${row.period_year}`,
        },
        {
          header: "Gaji Pokok",
          key: "base_salary",
          align: "right",
          render: (row) => formatCurrency(row.base_salary),
        },
        {
          header: "Tunjangan",
          key: "allowances",
          align: "right",
          render: (row) => formatCurrency(row.allowances),
        },
        {
          header: "Potongan",
          key: "deductions",
          align: "right",
          render: (row) => formatCurrency(row.deductions),
        },
        {
          header: "Gaji Bersih (THP)",
          key: "net_salary",
          align: "right",
          render: (row) => formatCurrency(row.net_salary),
        },
        {
          header: "Status Bayar",
          key: "status",
          align: "center",
          render: (row) => (row.status === "PAID" ? "TELAH DITRANSFER" : "DRAFT"),
        },
      ],
      data: filteredPayrolls,
      summaryItems: [
        { label: "Total Karyawan Digaji", value: `${filteredPayrolls.length} Orang` },
        { label: "Total Gaji Pokok", value: formatCurrency(totalBase) },
        { label: "Total Tunjangan", value: formatCurrency(totalAllow) },
        { label: "Total Potongan", value: formatCurrency(totalDeduct) },
        { label: "Total Pengeluaran THP", value: formatCurrency(totalTHP) },
      ],
    });
  };

  const handlePrintPayslip = (p: any) => {
    if (!p) return;
    exportDocumentToPDF({
      docType: "PAYSLIP",
      docTitle: "SLIP GAJI KARYAWAN RESMI (OFFICIAL PAYSLIP)",
      docNo: p.payroll_no || "SLIP-DRAFT",
      docDate: new Date().toLocaleDateString("id-ID"),
      status: p.status === "PAID" ? "TELAH DITRANSFER" : "DRAFT / SIAP BAYAR",
      payslipData: {
        employeeNo: p.employee?.employee_no || "-",
        employeeName: p.employee?.full_name || "Karyawan",
        department: p.employee?.department?.name || "Divisi Operasional",
        position: p.employee?.position?.title || "Staff",
        period: `Bulan ${p.period_month} Tahun ${p.period_year}`,
        baseSalary: p.base_salary || 0,
        allowances: p.allowances || 0,
        deductions: p.deductions || 0,
        netSalary: p.net_salary || 0,
        paymentStatus: p.status === "PAID" ? "Lunas Ditransfer" : "Menunggu Payroll Batch",
      },
      notes: "Slip gaji ini merupakan dokumen rahasia (confidential) perusahaan yang diterbitkan secara elektronik oleh Divisi Human Resources & Keuangan.",
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-indigo-600" />
            Penggajian Karyawan & Slip Gaji (Payroll)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Kalkulasi otomatis take-home pay, tunjangan, potongan BPJS/PPh21, dan integrasi jurnal beban gaji.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportTablePDF}
            className="border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
          >
            <Download className="h-4 w-4 mr-1.5 text-indigo-600" />
            Export Rekap PDF
          </Button>
          <Button onClick={handleGeneratePayroll} isLoading={isGenerating} size="sm">
            <Sparkles className="h-4 w-4 mr-1.5" />
            Generate Payroll Bulan Ini
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <Card className="border-slate-200/80 dark:border-slate-800">
        <CardContent className="p-3.5">
          <Input
            placeholder="Cari nomor slip gaji, NIK, atau nama pegawai..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            icon={<Search className="h-4 w-4" />}
            className="h-9 text-xs"
          />
        </CardContent>
      </Card>

      {/* Payrolls Table */}
      <Card className="border-slate-200/80 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase bg-slate-50/80 dark:bg-slate-900/80">
              <tr>
                <th className="py-3 px-3 w-12 text-center">No.</th>
                <th className="py-3.5 px-4">No. Slip Gaji</th>
                <th className="py-3.5 px-4">Pegawai</th>
                <th className="py-3.5 px-4">Periode</th>
                <th className="py-3.5 px-4 text-right">Gaji Pokok</th>
                <th className="py-3.5 px-4 text-right">Tunjangan</th>
                <th className="py-3.5 px-4 text-right">Gaji Bersih (THP)</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <TableLoading colSpan={9} message="Memuat daftar slip gaji payroll..." />
              ) : paginatedPayrolls.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs text-slate-400">
                    Belum ada data payroll yang digenerate.
                  </td>
                </tr>
              ) : (
                paginatedPayrolls.map((p, idx) => {
                  const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-3 text-center text-xs font-medium text-slate-400">
                        {rowNumber}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                        {p.payroll_no}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{p.employee?.full_name}</p>
                        <p className="text-xs text-slate-400 font-mono">{p.employee?.employee_no}</p>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                        {p.period_month}/{p.period_year}
                      </td>
                      <td className="py-3.5 px-4 text-right text-xs text-slate-600 dark:text-slate-400">
                        {formatCurrency(p.base_salary)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-xs text-emerald-600">
                        +{formatCurrency(p.allowances)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(p.net_salary)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge variant={p.status === "PAID" ? "success" : "warning"}>
                          {p.status === "PAID" ? "Telah Ditransfer" : "Draft"}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handlePrintPayslip(p)}
                            className="h-8 px-2 text-xs text-slate-700 hover:text-indigo-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                            title="Cetak Slip Gaji Resmi (PDF)"
                          >
                            <Printer className="h-3.5 w-3.5 mr-1 text-indigo-600" />
                            Cetak
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedPay(p);
                              setIsDetailModalOpen(true);
                            }}
                            className="h-8 px-2 text-xs text-indigo-600"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Detail
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
          totalItems={filteredPayrolls.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </Card>

      {/* Slide-over: Rincian Slip Gaji */}
      <SlideOver
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={`Slip Gaji: ${selectedPay?.payroll_no || ""}`}
        description={`Pegawai: ${selectedPay?.employee?.full_name || ""} • Periode: ${selectedPay?.period_month}/${selectedPay?.period_year}`}
        width="lg"
        footer={
          <div className="flex justify-between items-center w-full">
            <Button variant="outline" size="sm" onClick={() => setIsDetailModalOpen(false)}>
              Tutup
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePrintPayslip(selectedPay)}
              className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300"
            >
              <Printer className="h-4 w-4 mr-1.5 text-indigo-600" />
              Cetak Slip Gaji (PDF)
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <span className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider block border-b border-slate-200 dark:border-slate-800 pb-1.5">
              Rincian Penerimaan:
            </span>
            <div className="flex justify-between">
              <span className="text-slate-500">Gaji Pokok:</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">{formatCurrency(selectedPay?.base_salary || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tunjangan Operasional / Makan:</span>
              <span className="font-medium text-emerald-600">+{formatCurrency(selectedPay?.allowances || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Potongan Pajak & Izin:</span>
              <span className="font-medium text-rose-600">-{formatCurrency(selectedPay?.deductions || 0)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-sm font-bold text-indigo-600 dark:text-indigo-400">
              <span>Gaji Bersih Diterima (THP):</span>
              <span>{formatCurrency(selectedPay?.net_salary || 0)}</span>
            </div>
          </div>
        </div>
      </SlideOver>
    </div>
  );
}
