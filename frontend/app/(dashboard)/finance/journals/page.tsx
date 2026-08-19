"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  BookOpen,
  Search,
  Plus,
  Trash2,
  Eye,
  Download,
  Printer,
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

export default function JournalsPage() {
  const [journals, setJournals] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // SlideOver States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedJournal, setSelectedJournal] = useState<any>(null);

  // Form State
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formDesc, setFormDesc] = useState("");
  const [formRef, setFormRef] = useState("");
  const [formLines, setFormLines] = useState<Array<{ accountId: string; debit: number; credit: number; notes: string }>>([
    { accountId: "", debit: 0, credit: 0, notes: "" },
    { accountId: "", debit: 0, credit: 0, notes: "" },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchJournals = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<any>("/finance/journals", { per_page: 100 });
      if (res.data?.items) {
        setJournals(res.data.items);
      } else if (Array.isArray(res.data)) {
        setJournals(res.data);
      } else {
        setJournals([]);
      }
    } catch (e) {
      console.error("Gagal mengambil data jurnal umum dari database:", e);
      setJournals([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await api.get<any>("/finance/accounts");
      if (res.data) setAccounts(Array.isArray(res.data) ? res.data : res.data.items || []);
    } catch (e) {}
  };

  useEffect(() => {
    fetchJournals();
    fetchAccounts();
  }, []);

  const filteredJournals = useMemo(() => {
    return journals.filter((j) => {
      return (
        j.entry_no?.toLowerCase().includes(search.toLowerCase()) ||
        j.description?.toLowerCase().includes(search.toLowerCase()) ||
        j.reference?.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [journals, search]);

  const paginatedJournals = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredJournals.slice(start, start + pageSize);
  }, [filteredJournals, currentPage, pageSize]);

  const addLineRow = () => {
    setFormLines([...formLines, { accountId: "", debit: 0, credit: 0, notes: "" }]);
  };

  const removeLineRow = (index: number) => {
    setFormLines(formLines.filter((_, i) => i !== index));
  };

  const handleLineChange = (index: number, field: string, value: any) => {
    const updated = [...formLines];
    (updated[index] as any)[field] = value;
    setFormLines(updated);
  };

  const totalDebit = formLines.reduce((sum, l) => sum + (l.debit || 0), 0);
  const totalCredit = formLines.reduce((sum, l) => sum + (l.credit || 0), 0);
  const isBalanced = totalDebit > 0 && totalDebit === totalCredit;

  const handleCreateJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) {
      alert("Total Debit dan Total Kredit harus sama (seimbang/balance)!");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post("/finance/journals", {
        entry_date: formDate,
        description: formDesc,
        reference: formRef,
        lines: formLines.map((l) => ({
          account_id: l.accountId,
          debit: l.debit,
          credit: l.credit,
          notes: l.notes,
        })),
      });
      setIsAddModalOpen(false);
      fetchJournals();
    } catch (err: any) {
      alert(err.message || "Gagal menyimpan jurnal");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportPDF = () => {
    exportTableToPDF({
      title: "Buku Jurnal Umum & Transaksi Keuangan",
      subtitle: "Daftar entri jurnal pembukuan ganda (Double-Entry General Journal) terotorisasi",
      orientation: "landscape",
      columns: [
        { header: "Nomor Entri Jurnal", key: "entry_no", width: "140px" },
        {
          header: "Tanggal Jurnal",
          key: "entry_date",
          render: (row) => formatDate(row.entry_date),
        },
        {
          header: "Uraian / Deskripsi Transaksi",
          key: "description",
          render: (row) => row.description || "-",
        },
        {
          header: "Referensi Dokumen",
          key: "reference",
          render: (row) => row.reference || "-",
        },
        {
          header: "Total Nilai Debit",
          key: "total_debit",
          align: "right",
          render: (row) => {
            const deb = (row.lines || []).reduce((s: number, l: any) => s + (l.debit || 0), 0);
            return formatCurrency(deb);
          },
        },
        {
          header: "Total Nilai Kredit",
          key: "total_credit",
          align: "right",
          render: (row) => {
            const cred = (row.lines || []).reduce((s: number, l: any) => s + (l.credit || 0), 0);
            return formatCurrency(cred);
          },
        },
      ],
      data: filteredJournals,
      summaryItems: [
        { label: "Total Voucher Jurnal", value: `${filteredJournals.length} Entri` },
      ],
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-indigo-600" />
            Jurnal Umum Akuntansi (General Journal)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pencatatan pembukuan ganda (Double-Entry Bookkeeping) transaksi keuangan perusahaan.
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
            Buat Jurnal Manual
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <Card className="border-slate-200/80 dark:border-slate-800">
        <CardContent className="p-3.5">
          <Input
            placeholder="Cari nomor voucher jurnal, deskripsi, atau nomor referensi..."
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

      {/* Journals Table */}
      <Card className="border-slate-200/80 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase bg-slate-50/80 dark:bg-slate-900/80">
              <tr>
                <th className="py-3 px-3 w-12 text-center">No.</th>
                <th className="py-3.5 px-4">Nomor Jurnal</th>
                <th className="py-3.5 px-4">Tanggal Jurnal</th>
                <th className="py-3.5 px-4">Keterangan Transaksi</th>
                <th className="py-3.5 px-4">Referensi</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <TableLoading colSpan={7} message="Memuat jurnal umum..." />
              ) : paginatedJournals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                    Tidak ada catatan jurnal umum yang cocok.
                  </td>
                </tr>
              ) : (
                paginatedJournals.map((j, idx) => {
                  const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr key={j.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-3 text-center text-xs font-medium text-slate-400">
                        {rowNumber}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                        {j.entry_no}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {formatDate(j.entry_date)}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-slate-100">
                        {j.description}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-500">
                        {j.reference || "-"}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge variant="success">POSTED</Badge>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedJournal(j);
                            setIsDetailModalOpen(true);
                          }}
                          className="text-xs text-indigo-600"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Detail
                        </Button>
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
          totalItems={filteredJournals.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </Card>

      {/* Slide-over: Tambah Jurnal Manual */}
      <SlideOver
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Buat Jurnal Penyesuaian / Memorial"
        description="Pastikan total Debit dan Kredit bernilai sama persis (Seimbang / Balanced)."
        width="2xl"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Batal
            </Button>
            <Button
              type="submit"
              form="create-journal-form"
              isLoading={isSubmitting}
              disabled={!isBalanced}
            >
              Simpan & Posting Jurnal
            </Button>
          </>
        }
      >
        <form id="create-journal-form" onSubmit={handleCreateJournal} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tanggal Pembukuan <span className="text-rose-500">*</span>
              </label>
              <Input
                type="date"
                required
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nomor Dokumen Referensi
              </label>
              <Input
                placeholder="Contoh: BUKTI-KAS-001"
                value={formRef}
                onChange={(e) => setFormRef(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Keterangan Transaksi / Memo <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              required
              placeholder="Contoh: Penyesuaian saldo awal kas kantor dan beban penyusutan aktiva..."
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 resize-y"
            />
          </div>

          {/* Baris Debit & Credit */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Baris Akun Pembukuan:
              </span>
              <Button type="button" size="sm" variant="outline" onClick={addLineRow} className="text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Tambah Akun
              </Button>
            </div>

            <div className="space-y-2.5">
              {formLines.map((line, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row items-center gap-2.5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800"
                >
                  <div className="flex-1 w-full">
                    <select
                      required
                      value={line.accountId}
                      onChange={(e) => handleLineChange(idx, "accountId", e.target.value)}
                      className="h-10 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                    >
                      <option value="">Pilih Akun COA...</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} - {a.name} ({a.type})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-full sm:w-36">
                    <Input
                      type="number"
                      placeholder="Debit"
                      value={line.debit}
                      onChange={(e) => handleLineChange(idx, "debit", parseFloat(e.target.value) || 0)}
                      className="h-10 text-xs"
                    />
                  </div>
                  <div className="w-full sm:w-36">
                    <Input
                      type="number"
                      placeholder="Kredit"
                      value={line.credit}
                      onChange={(e) => handleLineChange(idx, "credit", parseFloat(e.target.value) || 0)}
                      className="h-10 text-xs"
                    />
                  </div>
                  {formLines.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeLineRow(idx)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg dark:hover:bg-rose-950/40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Balance Status Indicator */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Total Debit:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(totalDebit)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Kredit:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(totalCredit)}</span>
            </div>
            <div className="flex justify-between pt-1.5 border-t border-slate-200 dark:border-slate-800 font-semibold">
              <span>Status Keseimbangan:</span>
              {isBalanced ? (
                <span className="text-emerald-600 font-bold">BALANCE / SEIMBANG (Siap Posting)</span>
              ) : (
                <span className="text-rose-600 font-bold">TIDAK BALANCE (Selisih: {formatCurrency(Math.abs(totalDebit - totalCredit))})</span>
              )}
            </div>
          </div>
        </form>
      </SlideOver>

      {/* Slide-over: Detail Jurnal */}
      <SlideOver
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={`Voucher Jurnal: ${selectedJournal?.entry_no || ""}`}
        description={`Tanggal: ${formatDate(selectedJournal?.entry_date)} • ${selectedJournal?.description}`}
        width="xl"
        footer={
          <Button variant="outline" size="sm" onClick={() => setIsDetailModalOpen(false)}>
            Tutup
          </Button>
        }
      >
        <div className="space-y-4">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 dark:border-slate-800 font-bold uppercase text-slate-400">
              <tr>
                <th className="py-2">Kode & Nama Akun</th>
                <th className="py-2 text-right">Debit</th>
                <th className="py-2 text-right">Kredit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {selectedJournal?.lines?.map((line: any, idx: number) => (
                <tr key={idx}>
                  <td className="py-2.5">
                    <span className="font-mono font-bold text-indigo-600 mr-2">{line.account?.code}</span>
                    <span className="text-slate-800 dark:text-slate-200">{line.account?.name}</span>
                  </td>
                  <td className="py-2.5 text-right font-medium text-slate-900 dark:text-slate-100">
                    {line.debit > 0 ? formatCurrency(line.debit) : "-"}
                  </td>
                  <td className="py-2.5 text-right font-medium text-slate-900 dark:text-slate-100">
                    {line.credit > 0 ? formatCurrency(line.credit) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SlideOver>
    </div>
  );
}
