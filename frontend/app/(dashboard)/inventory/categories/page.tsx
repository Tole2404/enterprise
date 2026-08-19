"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Tag,
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

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // SlideOver State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<any>("/inventory/categories");
      if (res.data) {
        setCategories(Array.isArray(res.data) ? res.data : res.data.items || []);
      } else {
        setCategories([]);
      }
    } catch (e) {
      console.error("Gagal mengambil data kategori dari database:", e);
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      return (
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.code?.toLowerCase().includes(search.toLowerCase()) ||
        c.description?.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [categories, search]);

  const paginatedCategories = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCategories.slice(start, start + pageSize);
  }, [filteredCategories, currentPage, pageSize]);

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setFormCode("");
    setFormName("");
    setFormDesc("");
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (cat: any) => {
    setEditingCategory(cat);
    setFormCode(cat.code || "");
    setFormName(cat.name || "");
    setFormDesc(cat.description || "");
    setIsAddModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        code: formCode.toUpperCase(),
        name: formName,
        description: formDesc,
      };

      if (editingCategory) {
        await api.put(`/inventory/categories/${editingCategory.id}`, payload);
      } else {
        await api.post("/inventory/categories", payload);
      }

      setIsAddModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      alert(err.message || "Gagal menyimpan data kategori");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (cat: any) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus kategori "${cat.name}" (${cat.code})?`)) return;
    try {
      await api.delete(`/inventory/categories/${cat.id}`);
      fetchCategories();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus kategori");
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Tag className="h-6 w-6 text-indigo-600" />
            Master Kategori Produk
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Klasifikasi kelompok barang dagang, bahan baku, atau perlengkapan operasional.
          </p>
        </div>

        <div>
          <Button onClick={handleOpenAdd} size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Tambah Kategori
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <Card className="border-slate-200/90 dark:border-slate-800">
        <CardContent className="p-3.5">
          <Input
            placeholder="Cari kode kategori, nama kategori, atau deskripsi..."
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
                <th className="py-3.5 px-4 w-44">Kode Kategori</th>
                <th className="py-3.5 px-4 w-72">Nama Kategori</th>
                <th className="py-3.5 px-4">Deskripsi / Keterangan</th>
                <th className="py-3.5 px-4 w-32 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <TableLoading colSpan={5} message="Memuat master kategori produk..." />
              ) : paginatedCategories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                    Belum ada data kategori produk di database.
                  </td>
                </tr>
              ) : (
                paginatedCategories.map((c, idx) => {
                  const rowNumber = (currentPage - 1) * pageSize + idx + 1;
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
                        {c.description || "-"}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEdit(c)}
                            className="h-8 px-2 text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                            title="Edit Kategori"
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteCategory(c)}
                            className="h-8 px-2 text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="Hapus Kategori"
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
          totalItems={filteredCategories.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </Card>

      {/* Slide-over: Tambah / Edit Kategori */}
      <SlideOver
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingCategory ? `Edit Data Kategori: ${editingCategory.name}` : "Tambah Master Kategori Produk"}
        description={
          editingCategory
            ? "Perbarui kode, nama kategori, dan deskripsi pengelompokan barang."
            : "Klasifikasikan kode dan nama pengelompokan barang inventori."
        }
        width="md"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" form="create-category-form" isLoading={isSubmitting}>
              {editingCategory ? "Simpan Perubahan Kategori" : "Simpan Kategori"}
            </Button>
          </>
        }
      >
        <form id="create-category-form" onSubmit={handleSaveCategory} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Kode Kategori <span className="text-rose-500">*</span>
            </label>
            <Input
              required
              placeholder="Contoh: ELEC, ATK, RAW, FURN"
              value={formCode}
              onChange={(e) => setFormCode(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nama Kategori <span className="text-rose-500">*</span>
            </label>
            <Input
              required
              placeholder="Contoh: Elektronik & Komputer"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Deskripsi Pengelompokan
            </label>
            <textarea
              rows={3}
              placeholder="Keterangan jenis barang dalam kategori ini..."
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 resize-y leading-relaxed"
            />
          </div>
        </form>
      </SlideOver>
    </div>
  );
}
