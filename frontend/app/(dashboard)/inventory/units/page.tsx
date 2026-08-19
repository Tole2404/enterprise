"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Scale,
  Search,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SlideOver } from "@/components/ui/slide-over";
import { DataTablePagination } from "@/components/ui/pagination";
import { TableLoading } from "@/components/ui/table-loading";

export default function UnitsPage() {
  const [units, setUnits] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // SlideOver State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<any>(null);
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formSymbol, setFormSymbol] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUnits = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<any>("/inventory/units");
      if (res.data) {
        setUnits(Array.isArray(res.data) ? res.data : res.data.items || []);
      } else {
        setUnits([]);
      }
    } catch (e) {
      console.error("Gagal mengambil data satuan unit dari database:", e);
      setUnits([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  const filteredUnits = useMemo(() => {
    return units.filter((u) => {
      return (
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.code?.toLowerCase().includes(search.toLowerCase()) ||
        u.symbol?.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [units, search]);

  const paginatedUnits = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUnits.slice(start, start + pageSize);
  }, [filteredUnits, currentPage, pageSize]);

  const handleOpenAdd = () => {
    setEditingUnit(null);
    setFormCode("");
    setFormName("");
    setFormSymbol("");
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (unit: any) => {
    setEditingUnit(unit);
    setFormCode(unit.code || "");
    setFormName(unit.name || "");
    setFormSymbol(unit.symbol || "");
    setIsAddModalOpen(true);
  };

  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        code: formCode.toUpperCase(),
        name: formName,
        symbol: formSymbol || formCode,
      };

      if (editingUnit) {
        await api.put(`/inventory/units/${editingUnit.id}`, payload);
      } else {
        await api.post("/inventory/units", payload);
      }

      setIsAddModalOpen(false);
      fetchUnits();
    } catch (err: any) {
      alert(err.message || "Gagal menyimpan data satuan unit");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUnit = async (unit: any) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus satuan unit "${unit.name}" (${unit.code})?`)) return;
    try {
      await api.delete(`/inventory/units/${unit.id}`);
      fetchUnits();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus satuan unit");
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Scale className="h-6 w-6 text-indigo-600" />
            Master Satuan Unit (UoM)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Standar satuan pengukuran barang (Unit of Measure) seperti Pcs, Box, Kg, Liter, Meter, dan Rim.
          </p>
        </div>

        <div>
          <Button onClick={handleOpenAdd} size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Tambah Satuan
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <Card className="border-slate-200/90 dark:border-slate-800">
        <CardContent className="p-3.5">
          <Input
            placeholder="Cari kode satuan, nama satuan, atau simbol..."
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

      {/* Table */}
      <Card className="border-slate-200/90 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase bg-slate-100/90 dark:bg-slate-900/90">
              <tr>
                <th className="py-3 px-3 w-12 text-center">No.</th>
                <th className="py-3.5 px-4 w-44">Kode Satuan</th>
                <th className="py-3.5 px-4 w-72">Nama Lengkap Satuan</th>
                <th className="py-3.5 px-4">Simbol / Singkatan</th>
                <th className="py-3.5 px-4 w-32 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <TableLoading colSpan={5} message="Memuat master satuan unit..." />
              ) : paginatedUnits.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                    Belum ada data satuan unit di database.
                  </td>
                </tr>
              ) : (
                paginatedUnits.map((u, idx) => {
                  const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-3 text-center text-xs font-medium text-slate-400">
                        {rowNumber}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                        {u.code}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                        {u.name}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs font-medium text-slate-600 dark:text-slate-300">
                        {u.symbol}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEdit(u)}
                            className="h-8 px-2 text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                            title="Edit Satuan"
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteUnit(u)}
                            className="h-8 px-2 text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="Hapus Satuan"
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
          totalItems={filteredUnits.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </Card>

      {/* Slide-over: Tambah / Edit Satuan */}
      <SlideOver
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingUnit ? `Edit Satuan Unit: ${editingUnit.name}` : "Tambah Master Satuan Unit Baru"}
        description={
          editingUnit
            ? "Perbarui kode satuan, nama lengkap, dan simbol singkatan."
            : "Daftarkan standar satuan pengukuran barang inventori (Unit of Measure)."
        }
        width="md"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" form="create-unit-form" isLoading={isSubmitting}>
              {editingUnit ? "Simpan Perubahan Satuan" : "Simpan Satuan Unit"}
            </Button>
          </>
        }
      >
        <form id="create-unit-form" onSubmit={handleSaveUnit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Kode Satuan <span className="text-rose-500">*</span>
            </label>
            <Input
              required
              placeholder="Contoh: PCS, BOX, KG, LTR, RIM, SET"
              value={formCode}
              onChange={(e) => setFormCode(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nama Lengkap Satuan <span className="text-rose-500">*</span>
            </label>
            <Input
              required
              placeholder="Contoh: Pieces / Buah, Box / Dus, Kilogram"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Simbol Singkatan <span className="text-rose-500">*</span>
            </label>
            <Input
              required
              placeholder="Contoh: Pcs, Box, Kg, Ltr, Rim"
              value={formSymbol}
              onChange={(e) => setFormSymbol(e.target.value)}
            />
          </div>
        </form>
      </SlideOver>
    </div>
  );
}
