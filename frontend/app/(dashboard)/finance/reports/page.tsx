"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  PieChart,
  Search,
  Download,
  Printer,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";
import { exportTableToPDF } from "@/lib/pdf-export";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataTablePagination } from "@/components/ui/pagination";

export default function ReportsPage() {
  const [trialBalance, setTrialBalance] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<any>("/finance/reports/trial-balance");
      if (res.data) {
        setTrialBalance(Array.isArray(res.data) ? res.data : res.data.items || []);
      } else {
        setTrialBalance([]);
      }
    } catch (e) {
      console.error("Gagal mengambil laporan neraca saldo dari database:", e);
      setTrialBalance([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const totalAssets = trialBalance
    .filter((r) => r.account_type === "ASSET")
    .reduce((sum, r) => sum + r.net_balance, 0);

  const totalRevenues = trialBalance
    .filter((r) => r.account_type === "REVENUE")
    .reduce((sum, r) => sum + r.net_balance, 0);

  const totalExpenses = trialBalance
    .filter((r) => r.account_type === "EXPENSE")
    .reduce((sum, r) => sum + r.net_balance, 0);

  const netIncome = totalRevenues - totalExpenses;

  const filteredReports = useMemo(() => {
    return trialBalance.filter((r) => {
      const matchSearch =
        r.account_code?.toLowerCase().includes(search.toLowerCase()) ||
        r.account_name?.toLowerCase().includes(search.toLowerCase());
      const matchType = !typeFilter || r.account_type === typeFilter;
      return matchSearch && matchType;
    });
  }, [trialBalance, search, typeFilter]);

  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredReports.slice(start, start + pageSize);
  }, [filteredReports, currentPage, pageSize]);

  const handleExportPDF = () => {
    const totalDebit = filteredReports.reduce((sum, r) => sum + (r.debit || 0), 0);
    const totalCredit = filteredReports.reduce((sum, r) => sum + (r.credit || 0), 0);

    exportTableToPDF({
      title: "Laporan Neraca Saldo & Posisi Keuangan (Trial Balance)",
      subtitle: "Buku besar akun terkonsolidasi, ikhtisar laba rugi, dan valuasi aset perusahaan",
      columns: [
        { header: "Kode Akun", key: "code", width: "110px" },
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
          header: "Saldo Debit",
          key: "debit",
          align: "right",
          render: (row) => formatCurrency(row.debit),
        },
        {
          header: "Saldo Kredit",
          key: "credit",
          align: "right",
          render: (row) => formatCurrency(row.credit),
        },
      ],
      data: filteredReports,
      summaryItems: [
        { label: "Total Nilai Aset", value: formatCurrency(totalAssets) },
        { label: "Total Pendapatan Usaha", value: formatCurrency(totalRevenues) },
        { label: "Laba Bersih (Net Profit)", value: formatCurrency(netIncome) },
        { label: "Total Keseimbangan Debit", value: formatCurrency(totalDebit) },
        { label: "Total Keseimbangan Kredit", value: formatCurrency(totalCredit) },
      ],
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <PieChart className="h-6 w-6 text-indigo-600" />
            Laporan Keuangan & Neraca Saldo (Financial Statements)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Ringkasan posisi aset, kewajiban, laba/rugi, dan neraca saldo terkonsolidasi real-time.
          </p>
        </div>

        <div>
          <Button
            size="sm"
            onClick={handleExportPDF}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Download className="h-4 w-4 mr-1.5" />
            Export Laporan PDF
          </Button>
        </div>
      </div>

      {/* Summary Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200/80 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">Total Nilai Aset</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              {formatCurrency(totalAssets)}
            </div>
            <p className="text-xs text-slate-400 mt-1">Kas, Bank, Piutang & Persediaan</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">Total Pendapatan Usaha</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-emerald-600">
              {formatCurrency(totalRevenues)}
            </div>
            <p className="text-xs text-slate-400 mt-1">Penjualan produk & jasa</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">Laba Bersih (Net Profit)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
              {formatCurrency(netIncome)}
            </div>
            <p className="text-xs text-emerald-600 font-medium mt-1">
              Pendapatan &minus; Beban Operasional
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <Card className="border-slate-200/80 dark:border-slate-800">
        <CardContent className="p-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Input
                placeholder="Cari kode akun atau nama akun neraca..."
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
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Semua Tipe Akun</option>
                <option value="ASSET">Aset</option>
                <option value="LIABILITY">Kewajiban</option>
                <option value="EQUITY">Modal</option>
                <option value="REVENUE">Pendapatan</option>
                <option value="EXPENSE">Beban</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trial Balance Table */}
      <Card className="border-slate-200/80 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase bg-slate-50/80 dark:bg-slate-900/80">
              <tr>
                <th className="py-3 px-3 w-12 text-center">No.</th>
                <th className="py-3.5 px-4">Kode Akun</th>
                <th className="py-3.5 px-4">Nama Akun Perkiraan</th>
                <th className="py-3.5 px-4">Tipe Akun</th>
                <th className="py-3.5 px-4 text-right">Mutasi Debit</th>
                <th className="py-3.5 px-4 text-right">Mutasi Kredit</th>
                <th className="py-3.5 px-4 text-right">Saldo Akhir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedReports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                    Tidak ada akun neraca yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                paginatedReports.map((r, idx) => {
                  const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-3 text-center text-xs font-medium text-slate-400">
                        {rowNumber}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                        {r.account_code}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                        {r.account_name}
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold">
                        {r.account_type}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-slate-600 dark:text-slate-300">
                        {formatCurrency(r.total_debit)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-slate-600 dark:text-slate-300">
                        {formatCurrency(r.total_credit)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(r.net_balance)}
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
          totalItems={filteredReports.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </Card>
    </div>
  );
}
