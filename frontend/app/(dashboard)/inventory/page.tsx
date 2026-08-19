"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Boxes,
  Search,
  Plus,
  Filter,
  Eye,
  Building,
  Pencil,
  Trash2,
  Download,
  Printer,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { exportTableToPDF } from "@/lib/pdf-export";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { SlideOver } from "@/components/ui/slide-over";
import { DataTablePagination } from "@/components/ui/pagination";
import { TableLoading } from "@/components/ui/table-loading";

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isStockDetailOpen, setIsStockDetailOpen] = useState(false);
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [productStocks, setProductStocks] = useState<any[]>([]);

  // Quick Add Unit state
  const [newUnitCode, setNewUnitCode] = useState("");
  const [newUnitName, setNewUnitName] = useState("");
  const [newUnitSymbol, setNewUnitSymbol] = useState("");
  const [isSavingUnit, setIsSavingUnit] = useState(false);

  // Quick Add Category state
  const [newCatCode, setNewCatCode] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [isSavingCat, setIsSavingCat] = useState(false);

  // Quick Stock Adjustment per Warehouse state
  const [stockWhId, setStockWhId] = useState("");
  const [stockQty, setStockQty] = useState("");
  const [isSavingStock, setIsSavingStock] = useState(false);

  // Form state
  const [formSku, setFormSku] = useState("");
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formUnitId, setFormUnitId] = useState("");
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [formMinStock, setFormMinStock] = useState("");
  const [formCostPrice, setFormCostPrice] = useState("");
  const [formSellingPrice, setFormSellingPrice] = useState("");
  const [formInitialWarehouseId, setFormInitialWarehouseId] = useState("");
  const [formInitialStock, setFormInitialStock] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<any>("/inventory/products", {
        search,
        category_id: selectedCategory,
        per_page: 100,
      });
      if (res.data?.items) {
        setProducts(res.data.items);
      } else if (Array.isArray(res.data)) {
        setProducts(res.data);
      } else {
        setProducts([]);
      }
    } catch (e) {
      console.error("Gagal mengambil data produk dari database:", e);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMasterData = async () => {
    try {
      const catRes = await api.get<any>("/inventory/categories");
      if (catRes.data) {
        setCategories(Array.isArray(catRes.data) ? catRes.data : catRes.data.items || []);
      }

      const unitRes = await api.get<any>("/inventory/units");
      if (unitRes.data) {
        const list = Array.isArray(unitRes.data) ? unitRes.data : unitRes.data.items || [];
        setUnits(list);
      }

      const whRes = await api.get<any>("/inventory/warehouses");
      if (whRes.data) {
        const list = Array.isArray(whRes.data) ? whRes.data : whRes.data.items || [];
        setWarehouses(list);
      }
    } catch (e) {
      console.error("Gagal mengambil master kategori, unit & gudang:", e);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchMasterData();
  }, [selectedCategory]);

  // Client-side filtering & pagination
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.sku?.toLowerCase().includes(search.toLowerCase()) ||
        p.category?.name?.toLowerCase().includes(search.toLowerCase());
      return matchSearch;
    });
  }, [products, search]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormSku("");
    setFormName("");
    setFormDesc("");
    setFormCategoryId("");
    setFormUnitId("");
    setFormMinStock("");
    setFormCostPrice("");
    setFormSellingPrice("");
    setFormInitialWarehouseId(warehouses[0]?.id || "");
    setFormInitialStock("");
    setFormIsActive(true);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (p: any) => {
    setEditingProduct(p);
    setFormSku(p.sku || "");
    setFormName(p.name || "");
    setFormDesc(p.description || "");
    setFormCategoryId(p.category_id || "");
    setFormUnitId(p.unit_id || "");
    setFormMinStock(p.min_stock !== undefined && p.min_stock !== null ? String(p.min_stock) : "");
    setFormCostPrice(p.cost_price !== undefined && p.cost_price !== null ? String(p.cost_price) : "");
    setFormSellingPrice(p.selling_price !== undefined && p.selling_price !== null ? String(p.selling_price) : "");
    if (p.stocks && p.stocks.length > 0) {
      setFormInitialWarehouseId(p.stocks[0].warehouse_id || warehouses[0]?.id || "");
      setFormInitialStock(String(p.stocks[0].current_stock ?? 0));
    } else {
      setFormInitialWarehouseId(warehouses[0]?.id || "");
      setFormInitialStock(p.total_stock ? String(p.total_stock) : "");
    }
    setFormIsActive(p.is_active !== false);
    setIsAddModalOpen(true);
  };

  const handleToggleStatus = async (p: any) => {
    const nextStatus = !(p.is_active !== false);
    try {
      await api.put(`/inventory/products/${p.id}`, {
        name: p.name,
        description: p.description,
        category_id: p.category_id || undefined,
        unit_id: p.unit_id,
        min_stock: p.min_stock || 0,
        cost_price: p.cost_price || 0,
        selling_price: p.selling_price || 0,
        is_active: nextStatus,
      });
      fetchProducts();
    } catch (err: any) {
      alert(err.message || "Gagal mengubah status produk");
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        sku: formSku,
        name: formName,
        description: formDesc,
        category_id: formCategoryId || undefined,
        unit_id: formUnitId || (units[0]?.id ? units[0].id : "d0000000-0000-0000-0000-000000000001"),
        min_stock: parseFloat(formMinStock) || 0,
        cost_price: parseFloat(formCostPrice) || 0,
        selling_price: parseFloat(formSellingPrice) || 0,
        initial_warehouse_id: formInitialWarehouseId || undefined,
        initial_stock: parseFloat(formInitialStock) || 0,
        is_active: formIsActive,
      };

      if (editingProduct) {
        await api.put(`/inventory/products/${editingProduct.id}`, payload);
      } else {
        await api.post("/inventory/products", payload);
      }

      setIsAddModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      alert(err.message || "Gagal menyimpan data produk");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (p: any) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus produk "${p.name}" (${p.sku})?`)) return;
    try {
      await api.delete(`/inventory/products/${p.id}`);
      fetchProducts();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus produk");
    }
  };

  const handleCreateNewUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingUnit(true);
    try {
      const res = await api.post<any>("/inventory/units", {
        code: newUnitCode.toUpperCase(),
        name: newUnitName,
        symbol: newUnitSymbol || newUnitCode,
      });
      setIsAddUnitOpen(false);
      setNewUnitCode("");
      setNewUnitName("");
      setNewUnitSymbol("");
      await fetchMasterData();
      if (res.data?.id) {
        setFormUnitId(res.data.id);
      }
    } catch (err: any) {
      alert(err.message || "Gagal membuat satuan unit baru");
    } finally {
      setIsSavingUnit(false);
    }
  };

  const handleCreateNewCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCat(true);
    try {
      const res = await api.post<any>("/inventory/categories", {
        code: newCatCode.toUpperCase(),
        name: newCatName,
        description: newCatDesc,
      });
      setIsAddCategoryOpen(false);
      setNewCatCode("");
      setNewCatName("");
      setNewCatDesc("");
      await fetchMasterData();
      if (res.data?.id) {
        setFormCategoryId(res.data.id);
      }
    } catch (err: any) {
      alert(err.message || "Gagal membuat kategori baru");
    } finally {
      setIsSavingCat(false);
    }
  };

  const handleViewStocks = async (product: any) => {
    setSelectedProduct(product);
    setStockWhId(warehouses[0]?.id || "");
    setStockQty("");
    setIsStockDetailOpen(true);
    try {
      const res = await api.get<any>(`/inventory/products/${product.id}/stocks`);
      if (res.data) setProductStocks(res.data);
    } catch (e) {
      setProductStocks([]);
    }
  };

  const handleQuickSaveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(stockQty);
    if (!selectedProduct || !stockWhId) {
      alert("Pilih gudang tujuan terlebih dahulu!");
      return;
    }
    if (isNaN(qty) || qty < 0) {
      alert("Silakan ketik jumlah saldo stok fisik (misal: 50)!");
      return;
    }
    setIsSavingStock(true);
    try {
      // Gunakan tipe ADJUSTMENT agar saldo fisik gudang diset tepat ke angka yang diinput (bukan ditambah akumulasi)
      await api.post("/inventory/stock-mutations", {
        product_id: selectedProduct.id,
        to_warehouse_id: stockWhId,
        qty: qty,
        mutation_type: "ADJUSTMENT",
        notes: "Penyesuaian Saldo Stok Fisik Gudang",
      });

      setStockQty("");
      // Refresh rincian stok gudang & tabel produk
      const res = await api.get<any>(`/inventory/products/${selectedProduct.id}/stocks`);
      if (res.data) setProductStocks(res.data);
      fetchProducts();
    } catch (err: any) {
      alert(err.message || "Gagal memperbarui stok gudang");
    } finally {
      setIsSavingStock(false);
    }
  };

  const handleEditStockRow = (st: any) => {
    setStockWhId(st.warehouse_id || st.warehouse?.id || "");
    setStockQty(String(st.current_stock || ""));
  };

  const handleDeleteStockRow = async (st: any) => {
    const whName = st.warehouse?.name || "Gudang";
    const whId = st.warehouse_id || st.warehouse?.id;
    if (!confirm(`Apakah Anda yakin ingin menghapus / mengosongkan saldo stok di "${whName}"?`)) {
      return;
    }
    try {
      await api.delete(`/inventory/products/${selectedProduct.id}/stocks/${whId}`);
      // Refresh rincian stok gudang & tabel produk
      const res = await api.get<any>(`/inventory/products/${selectedProduct.id}/stocks`);
      if (res.data) setProductStocks(res.data);
      fetchProducts();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus stok gudang");
    }
  };

  const handleExportPDF = () => {
    const totalQty = filteredProducts.reduce((sum, p) => sum + (p.total_stock || 0), 0);
    const totalAssetVal = filteredProducts.reduce(
      (sum, p) => sum + (p.cost_price || 0) * (p.total_stock || 0),
      0
    );

    exportTableToPDF({
      title: "Laporan Master Produk & Valuasi Stok Gudang",
      subtitle: "Katalog inventori aktif, saldo stok fisik, dan total nilai aset barang",
      orientation: "landscape",
      columns: [
        { header: "Kode SKU", key: "sku", width: "120px" },
        { header: "Nama Produk", key: "name" },
        {
          header: "Kategori",
          key: "category",
          render: (row) => row.category?.name || "Umum",
        },
        {
          header: "Saldo Stok",
          key: "total_stock",
          align: "right",
          render: (row) => `${row.total_stock || 0} ${row.unit?.symbol || "Pcs"}`,
        },
        {
          header: "Min. Stok",
          key: "min_stock",
          align: "right",
          render: (row) => `${row.min_stock || 0} ${row.unit?.symbol || "Pcs"}`,
        },
        {
          header: "Harga Pokok (HPP)",
          key: "cost_price",
          align: "right",
          render: (row) => formatCurrency(row.cost_price),
        },
        {
          header: "Harga Jual",
          key: "selling_price",
          align: "right",
          render: (row) => formatCurrency(row.selling_price),
        },
        {
          header: "Total Nilai Aset",
          key: "asset_val",
          align: "right",
          render: (row) => formatCurrency((row.cost_price || 0) * (row.total_stock || 0)),
        },
        {
          header: "Status",
          key: "status",
          align: "center",
          render: (row) => (row.is_active !== false ? "Aktif" : "Nonaktif"),
        },
      ],
      data: filteredProducts,
      summaryItems: [
        { label: "Total Varian SKU", value: `${filteredProducts.length} Produk` },
        { label: "Total Kuantitas Fisik", value: `${totalQty} Unit/Pcs` },
        { label: "Total Nilai Aset Stok", value: formatCurrency(totalAssetVal) },
      ],
    });
  };

  return (
    <div className="space-y-5">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Boxes className="h-6 w-6 text-indigo-600" />
            Katalog Produk & Inventori
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pantau stok real-time, harga pokok (HPP), dan alokasi produk di seluruh gudang.
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
            Tambah Produk
          </Button>
        </div>
      </div>

      {/* Filter & Search Controls */}
      <Card className="border-slate-200/80 dark:border-slate-800">
        <CardContent className="p-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <Input
                placeholder="Cari SKU atau nama produk..."
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
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Semua Kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Semua Status Stok</option>
                <option value="AVAILABLE">Tersedia (Aman)</option>
                <option value="LOW">Stok Rendah</option>
                <option value="OUT">Habis (0 Stock)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product Data Table */}
      <Card className="border-slate-200/80 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase bg-slate-50/80 dark:bg-slate-900/80">
              <tr>
                <th className="py-3 px-3 w-12 text-center">No.</th>
                <th className="py-3 px-4">SKU / Kode</th>
                <th className="py-3 px-4">Nama Produk</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4 text-right">Harga Pokok (HPP)</th>
                <th className="py-3 px-4 text-right">Harga Jual</th>
                <th className="py-3 px-4 text-center">Total Stok</th>
                <th className="py-3 px-4 text-center">Kondisi Stok</th>
                <th className="py-3 px-4 text-center w-24">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <TableLoading colSpan={10} message="Memuat katalog produk & stok..." />
              ) : paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-xs text-slate-400">
                    Tidak ada produk yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((p, idx) => {
                  const isLowStock = p.total_stock <= p.min_stock && p.total_stock > 0;
                  const isOutOfStock = p.total_stock <= 0;
                  const rowNumber = (currentPage - 1) * pageSize + idx + 1;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 text-center text-xs font-medium text-slate-400">
                        {rowNumber}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-xs text-indigo-600 dark:text-indigo-400">
                        {p.sku}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{p.name}</p>
                        {p.description && <p className="text-[11px] text-slate-400 truncate max-w-xs">{p.description}</p>}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">
                        {p.category?.name || "-"}
                      </td>
                      <td className="py-3 px-4 text-right text-xs font-medium text-slate-700 dark:text-slate-300">
                        {formatCurrency(p.cost_price)}
                      </td>
                      <td className="py-3 px-4 text-right text-xs font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(p.selling_price || 0)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          {p.total_stock}
                        </span>{" "}
                        <span className="text-xs text-slate-400">{p.unit?.symbol || "Pcs"}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isOutOfStock ? (
                          <Badge variant="destructive">Habis</Badge>
                        ) : isLowStock ? (
                          <Badge variant="warning">Stok Rendah</Badge>
                        ) : (
                          <Badge variant="success">Tersedia</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(p)}
                          className="cursor-pointer hover:scale-105 transition-transform"
                          title="Klik untuk ubah status Aktif / Nonaktif"
                        >
                          <Badge variant={p.is_active !== false ? "success" : "secondary"}>
                            {p.is_active !== false ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewStocks(p)}
                            className="h-8 px-2 text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                            title="Lihat Stok per Gudang"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Gudang
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEdit(p)}
                            className="h-8 px-2 text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                            title="Edit Data Produk"
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteProduct(p)}
                            className="h-8 px-2 text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="Hapus Produk"
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

        {/* Reusable Pagination */}
        <DataTablePagination
          currentPage={currentPage}
          totalItems={filteredProducts.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </Card>

      {/* Slide-over Panel: Tambah / Edit Produk */}
      <SlideOver
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingProduct ? `Edit Data Produk: ${editingProduct.name}` : "Tambah Master Produk Baru"}
        description={
          editingProduct
            ? "Perbarui rincian harga, SKU, kategori, dan batas minimum stok gudang."
            : "Lengkapi informasi spesifikasi produk, SKU, kategori, harga, dan batas minimum stok gudang."
        }
        width="xl"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              form="create-product-form"
              isLoading={isSubmitting}
            >
              {editingProduct ? "Simpan Perubahan Produk" : "Simpan Master Produk"}
            </Button>
          </>
        }
      >
        <form id="create-product-form" onSubmit={handleSaveProduct} className="space-y-5">
          {/* Section 1: Informasi Pokok Produk */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              1. Informasi Pokok Produk
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Kode SKU Produk <span className="text-slate-400 font-normal">(Otomatis Sistem)</span>
                </label>
                <Input
                  placeholder="Otomatis dibuat sistem (atau isi barcode/SKU)"
                  value={formSku}
                  onChange={(e) => setFormSku(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nama Lengkap Produk <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  placeholder="Contoh: Laptop Enterprise Pro 14 inch (i7/16GB/512GB)"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Kategori Barang
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddCategoryOpen(true)}
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="h-3 w-3" /> Tambah Kategori
                  </button>
                </div>
                <select
                  value={formCategoryId}
                  onChange={(e) => setFormCategoryId(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="" disabled>Pilih Kategori...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Satuan Unit <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddUnitOpen(true)}
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="h-3 w-3" /> Tambah Satuan
                  </button>
                </div>
                <select
                  required
                  value={formUnitId}
                  onChange={(e) => setFormUnitId(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="" disabled>Pilih Satuan Unit (Pcs, Box, Kg, dll)...</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.symbol})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Harga & Batas Stok */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              2. Harga & Batas Peringatan Stok
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Batas Min. Stok (Alarm) <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="number"
                  required
                  placeholder="10"
                  value={formMinStock}
                  onChange={(e) => setFormMinStock(e.target.value)}
                />
                <p className="text-[10px] text-slate-400">
                  Batas minimal sebelum muncul alarm "Stok Rendah"
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Harga Pokok (HPP / Modal) <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="number"
                  required
                  prefixText="Rp"
                  placeholder="0"
                  value={formCostPrice}
                  onChange={(e) => setFormCostPrice(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Harga Jual Resmi <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="number"
                  required
                  prefixText="Rp"
                  placeholder="0"
                  value={formSellingPrice}
                  onChange={(e) => setFormSellingPrice(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Alokasi / Penyesuaian Stok Gudang */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              {editingProduct ? "3. Penyesuaian Lokasi Gudang & Saldo Stok Fisik" : "3. Alokasi Lokasi Gudang & Saldo Stok Fisik (Opsional)"}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {editingProduct ? "Gudang Penempatan Stok" : "Gudang Penyimpanan Awal"}
                </label>
                <select
                  value={formInitialWarehouseId}
                  onChange={(e) => setFormInitialWarehouseId(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Pilih Gudang...</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code}) {w.address ? `- ${w.address}` : ""}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400">
                  Lokasi gudang fisik tempat barang ini disimpan
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {editingProduct ? "Saldo Stok Fisik di Gudang Ini" : "Jumlah Saldo Stok Fisik Awal"}
                </label>
                <Input
                  type="number"
                  min="0"
                  placeholder="Contoh: 50"
                  value={formInitialStock}
                  onChange={(e) => setFormInitialStock(e.target.value)}
                />
                <p className="text-[10px] text-slate-400">
                  Jumlah unit barang nyata yang tersedia di gudang
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: Deskripsi Lengkap & Spesifikasi */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            {editingProduct && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Status Produk <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formIsActive ? "true" : "false"}
                  onChange={(e) => setFormIsActive(e.target.value === "true")}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 font-semibold"
                >
                  <option value="true">Aktif (Dapat dijual & ditransaksikan)</option>
                  <option value="false">Nonaktif (Discontinue / Tidak dijual)</option>
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Deskripsi Produk
              </label>
              <textarea
                rows={4}
                placeholder="Catatan spesifikasi teknis, nomor seri, atau keterangan garansi..."
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 resize-y leading-relaxed"
              />
            </div>
          </div>
        </form>
      </SlideOver>

      {/* Slide-over: Tambah Satuan Unit Baru */}
      <SlideOver
        isOpen={isAddUnitOpen}
        onClose={() => setIsAddUnitOpen(false)}
        title="Tambah Satuan Unit Baru"
        description="Daftarkan satuan barang baru (misal: Pcs, Box, Kg, Liter, Set, Rim)."
        width="md"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsAddUnitOpen(false)}>
              Batal
            </Button>
            <Button type="submit" form="create-unit-form" isLoading={isSavingUnit}>
              Simpan Satuan Unit
            </Button>
          </>
        }
      >
        <form id="create-unit-form" onSubmit={handleCreateNewUnit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Kode Satuan <span className="text-rose-500">*</span>
            </label>
            <Input
              required
              placeholder="Contoh: PCS, BOX, KG, LTR, RIM"
              value={newUnitCode}
              onChange={(e) => setNewUnitCode(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nama Lengkap Satuan <span className="text-rose-500">*</span>
            </label>
            <Input
              required
              placeholder="Contoh: Pieces / Buah, Box / Dus, Kilogram"
              value={newUnitName}
              onChange={(e) => setNewUnitName(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Simbol Singkatan <span className="text-rose-500">*</span>
            </label>
            <Input
              required
              placeholder="Contoh: Pcs, Box, Kg, Ltr"
              value={newUnitSymbol}
              onChange={(e) => setNewUnitSymbol(e.target.value)}
            />
          </div>
        </form>
      </SlideOver>

      {/* Slide-over: Tambah Kategori Baru */}
      <SlideOver
        isOpen={isAddCategoryOpen}
        onClose={() => setIsAddCategoryOpen(false)}
        title="Tambah Kategori Produk Baru"
        description="Klasifikasikan jenis komoditas produk dagang atau bahan baku."
        width="md"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsAddCategoryOpen(false)}>
              Batal
            </Button>
            <Button type="submit" form="create-cat-form" isLoading={isSavingCat}>
              Simpan Kategori
            </Button>
          </>
        }
      >
        <form id="create-cat-form" onSubmit={handleCreateNewCategory} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Kode Kategori <span className="text-rose-500">*</span>
            </label>
            <Input
              required
              placeholder="Contoh: ELEC, ATK, RAW, FIN"
              value={newCatCode}
              onChange={(e) => setNewCatCode(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nama Kategori <span className="text-rose-500">*</span>
            </label>
            <Input
              required
              placeholder="Contoh: Elektronik & Komputer, Alat Tulis Kantor"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Deskripsi / Keterangan
            </label>
            <textarea
              rows={3}
              placeholder="Keterangan pengelompokan barang..."
              value={newCatDesc}
              onChange={(e) => setNewCatDesc(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 resize-y"
            />
          </div>
        </form>
      </SlideOver>

      {/* Slide-over: Rincian & Input Stok per Gudang */}
      <SlideOver
        isOpen={isStockDetailOpen}
        onClose={() => setIsStockDetailOpen(false)}
        title={`Rincian & Kelola Stok: ${selectedProduct?.name || ""}`}
        description={`SKU: ${selectedProduct?.sku || ""} • Satuan: ${selectedProduct?.unit?.name || "Pcs"}`}
        width="md"
        footer={
          <Button variant="outline" size="sm" onClick={() => setIsStockDetailOpen(false)}>
            Tutup
          </Button>
        }
      >
        <div className="space-y-6">
          {/* Section: Saldo Stok per Gudang Saat Ini */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Stok Tersedia per Gudang
            </h4>
            {productStocks.length === 0 ? (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-200 text-xs leading-relaxed">
                Belum ada saldo stok fisik untuk produk ini di gudang manapun. Gunakan formulir di bawah untuk mengisi stok ke gudang yang diinginkan.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50/50 dark:bg-slate-950/40">
                {productStocks.map((st, idx) => (
                  <div key={idx} className="p-3.5 flex items-center justify-between hover:bg-slate-100/50 dark:hover:bg-slate-900/60 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <Building className="h-4 w-4 text-indigo-500 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {st.warehouse?.name || "Gudang"}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Kode: {st.warehouse?.code || "-"} {st.warehouse?.address ? `• ${st.warehouse.address}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {st.current_stock} {selectedProduct?.unit?.symbol || "Pcs"}
                        </p>
                        {st.reserved_stock > 0 && (
                          <p className="text-[10px] text-amber-600">
                            ({st.reserved_stock} dipesan)
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEditStockRow(st)}
                          className="p-1.5 text-amber-600 hover:bg-amber-100/60 rounded-md dark:hover:bg-amber-950/60 dark:text-amber-400 transition-colors"
                          title="Ubah Stok di Gudang Ini"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStockRow(st)}
                          className="p-1.5 text-rose-500 hover:bg-rose-100/60 rounded-md dark:hover:bg-rose-950/60 dark:text-rose-400 transition-colors"
                          title="Hapus / Kosongkan Stok di Gudang Ini"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Form Langsung Isi / Sesuaikan Stok di Gudang */}
          <form onSubmit={handleQuickSaveStock} className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-3.5">
            <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Isi / Update Stok ke Gudang
            </h4>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Pilih Gudang Tujuan <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={stockWhId}
                onChange={(e) => setStockWhId(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              >
                <option value="" disabled>Pilih Gudang...</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code}) {w.address ? `- ${w.address}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Jumlah Saldo Stok Fisik <span className="text-rose-500">*</span>
              </label>
              <Input
                type="number"
                required
                min="0"
                placeholder="Contoh: 50"
                value={stockQty}
                onChange={(e) => setStockQty(e.target.value)}
                className="h-10 text-xs"
              />
            </div>
            <Button type="submit" size="sm" isLoading={isSavingStock} className="w-full">
              Simpan Stok ke Gudang Ini
            </Button>
          </form>
        </div>
      </SlideOver>
    </div>
  );
}
