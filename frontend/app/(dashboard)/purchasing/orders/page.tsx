"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  ShoppingBag,
  Search,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Eye,
  FileCheck,
  Download,
  Printer,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { exportTableToPDF, exportDocumentToPDF } from "@/lib/pdf-export";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SlideOver } from "@/components/ui/slide-over";
import { DataTablePagination } from "@/components/ui/pagination";
import { TableLoading } from "@/components/ui/table-loading";

function PurchaseOrdersContent() {
  const searchParams = useSearchParams();
  const prIdParam = searchParams.get("pr_id");

  const [orders, setOrders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [approvedPRs, setApprovedPRs] = useState<any[]>([]);
  const [selectedImportPRId, setSelectedImportPRId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // SlideOver States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any>(null);

  // Form State
  const [formSupplierId, setFormSupplierId] = useState("");
  const [formDeliveryDate, setFormDeliveryDate] = useState("");
  const [formTaxPercent, setFormTaxPercent] = useState("11");
  const [formNotes, setFormNotes] = useState("");
  const [formItems, setFormItems] = useState<Array<{ productId: string; qty: number; unitPrice: number }>>([
    { productId: "", qty: 1, unitPrice: 0 },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<any>("/purchasing/purchase-orders", { per_page: 100 });
      if (res.data?.items) {
        setOrders(res.data.items);
      } else if (Array.isArray(res.data)) {
        setOrders(res.data);
      } else {
        setOrders([]);
      }
    } catch (e) {
      console.error("Gagal mengambil data PO dari database:", e);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMasterData = async () => {
    try {
      const sRes = await api.get<any>("/purchasing/suppliers");
      if (sRes.data?.items) setSuppliers(sRes.data.items);

      const pRes = await api.get<any>("/inventory/products");
      if (pRes.data?.items) setProducts(pRes.data.items);

      const prRes = await api.get<any>("/purchasing/purchase-requests", { per_page: 100 });
      if (prRes.data?.items) {
        const approved = prRes.data.items.filter((pr: any) => pr.status === "APPROVED");
        setApprovedPRs(approved);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchOrders();
    fetchMasterData();
  }, []);

  // Auto-open and populate if pr_id is provided in URL
  useEffect(() => {
    if (prIdParam && approvedPRs.length > 0) {
      const targetPR = approvedPRs.find((p) => p.id === prIdParam);
      if (targetPR) {
        setSelectedImportPRId(targetPR.id);
        if (targetPR.items && targetPR.items.length > 0) {
          setFormItems(
            targetPR.items.map((it: any) => ({
              productId: it.product_id || it.product?.id,
              qty: it.qty,
              unitPrice: it.product?.cost_price || 0,
            }))
          );
        }
        setFormNotes(`Diterbitkan dari pengajuan PR: ${targetPR.pr_no}`);
        setIsAddModalOpen(true);
      }
    }
  }, [prIdParam, approvedPRs]);

  const handleSelectPR = (prId: string) => {
    setSelectedImportPRId(prId);
    if (!prId) return;
    const targetPR = approvedPRs.find((p) => p.id === prId);
    if (targetPR && targetPR.items && targetPR.items.length > 0) {
      setFormItems(
        targetPR.items.map((it: any) => ({
          productId: it.product_id || it.product?.id,
          qty: it.qty,
          unitPrice: it.product?.cost_price || 0,
        }))
      );
      setFormNotes(`Diterbitkan dari pengajuan PR: ${targetPR.pr_no}`);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((po) => {
      const matchSearch =
        po.po_no?.toLowerCase().includes(search.toLowerCase()) ||
        po.supplier?.name?.toLowerCase().includes(search.toLowerCase()) ||
        po.notes?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = !statusFilter || po.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [orders, search, statusFilter]);

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  const addItemRow = () => {
    setFormItems([...formItems, { productId: "", qty: 1, unitPrice: 0 }]);
  };

  const removeItemRow = (index: number) => {
    setFormItems(formItems.filter((_, i) => i !== index));
  };

  const handleProductChange = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    const updated = [...formItems];
    updated[index].productId = productId;
    if (prod) {
      updated[index].unitPrice = prod.cost_price || 0;
    }
    setFormItems(updated);
  };

  const handleQtyPriceChange = (index: number, field: "qty" | "unitPrice", value: number) => {
    const updated = [...formItems];
    updated[index][field] = value;
    setFormItems(updated);
  };

  const calculateSubtotal = () => {
    return formItems.reduce((acc, curr) => acc + (curr.qty || 0) * (curr.unitPrice || 0), 0);
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSupplierId) {
      alert("Pilih vendor / supplier terlebih dahulu!");
      return;
    }
    const validItems = formItems.filter((it) => it.productId && it.qty > 0);
    if (validItems.length === 0) {
      alert("Tambahkan minimal 1 jenis barang yang dipesan beserta Qty yang valid!");
      return;
    }
    setIsSubmitting(true);

    try {
      await api.post("/purchasing/purchase-orders", {
        supplier_id: formSupplierId,
        pr_id: selectedImportPRId || undefined,
        expected_delivery_date: formDeliveryDate || undefined,
        tax_percent: parseFloat(formTaxPercent) || 0,
        notes: formNotes,
        items: validItems.map((it) => ({
          product_id: it.productId,
          qty: it.qty,
          unit_price: it.unitPrice,
        })),
      });

      alert("✅ Purchase Order berhasil diterbitkan!");
      setIsAddModalOpen(false);
      setSelectedImportPRId("");
      setFormSupplierId("");
      setFormDeliveryDate("");
      setFormNotes("");
      setFormItems([{ productId: "", qty: 1, unitPrice: 0 }]);
      fetchOrders();
    } catch (err: any) {
      alert(err.message || "Gagal membuat Purchase Order");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprovePO = async (id: string, status: "APPROVED" | "REJECTED") => {
    try {
      await api.post(`/purchasing/purchase-orders/${id}/approve`, { status });
      setIsDetailModalOpen(false);
      fetchOrders();
    } catch (err: any) {
      alert(err.message || "Gagal mengubah status approval PO");
    }
  };

  const handleExportTablePDF = () => {
    const totalVal = filteredOrders.reduce((sum, po) => sum + (po.total_amount || 0), 0);
    exportTableToPDF({
      title: "Laporan Pembelian & Purchase Orders (PO)",
      subtitle: "Rekapitulasi pesanan pembelian ke supplier, status approval, dan nilai tagihan",
      orientation: "landscape",
      columns: [
        { header: "Nomor PO", key: "po_no", width: "130px" },
        {
          header: "Tanggal Order",
          key: "order_date",
          render: (row) => formatDate(row.order_date),
        },
        {
          header: "Vendor / Supplier",
          key: "supplier",
          render: (row) => row.supplier?.name || "Supplier",
        },
        {
          header: "Jumlah Item",
          key: "items",
          align: "center",
          render: (row) => `${row.items?.length || 0} Baris`,
        },
        {
          header: "Subtotal",
          key: "subtotal",
          align: "right",
          render: (row) => formatCurrency(row.subtotal),
        },
        {
          header: "Pajak PPN",
          key: "tax_amount",
          align: "right",
          render: (row) => formatCurrency(row.tax_amount),
        },
        {
          header: "Total Nilai PO",
          key: "total_amount",
          align: "right",
          render: (row) => formatCurrency(row.total_amount),
        },
        {
          header: "Status Approval",
          key: "status",
          align: "center",
          render: (row) => {
            if (row.status === "APPROVED") return "APPROVED";
            if (row.status === "REJECTED" || row.status === "CANCELLED") return "DIBATALKAN";
            if (row.status === "RECEIVED") return "BARANG DITERIMA";
            return "PENDING APPROVAL";
          },
        },
      ],
      data: filteredOrders,
      summaryItems: [
        { label: "Total Dokumen PO", value: `${filteredOrders.length} PO` },
        { label: "Total Akumulasi Pembelian", value: formatCurrency(totalVal) },
      ],
    });
  };

  const handlePrintPODocument = (po: any) => {
    if (!po) return;
    exportDocumentToPDF({
      docType: "PURCHASE_ORDER",
      docTitle: "SURAT PESANAN PEMBELIAN (PURCHASE ORDER)",
      docNo: po.po_no || "PO-DRAFT",
      docDate: formatDate(po.order_date),
      status: po.status,
      partnerInfo: {
        title: "Vendor / Mitra Pemasok:",
        name: po.supplier?.name || "Vendor",
        code: po.supplier?.code,
        contact: po.supplier?.email,
        phone: po.supplier?.phone,
        address: po.supplier?.address || "Alamat Vendor",
      },
      details: [
        { label: "Syarat Pembayaran (TOP)", value: `${po.supplier?.payment_terms_days || 30} Hari Tempo` },
        { label: "Estimasi Pengiriman", value: po.expected_delivery_date ? formatDate(po.expected_delivery_date) : "Segera / Asap" },
        { label: "Dibuat Oleh", value: po.creator?.full_name || "Staf Purchasing" },
      ],
      items: (po.items || []).map((it: any, idx: number) => ({
        no: idx + 1,
        code: it.product?.sku || "-",
        name: it.product?.name || "Produk",
        description: it.product?.category?.name ? `Kategori: ${it.product.category.name}` : undefined,
        qty: it.qty,
        unit: it.product?.unit?.symbol || "Pcs",
        price: it.unit_price,
        total: it.total_price || (it.qty * it.unit_price),
      })),
      financials: {
        subtotal: po.subtotal,
        tax: po.tax_amount,
        total: po.total_amount,
      },
      notes: po.notes || "Harap melampirkan Surat Jalan dan Faktur Asli saat pengiriman barang ke gudang kami.",
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-indigo-600" />
            Purchase Order (PO)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Order pembelian resmi ke vendor dengan workflow approval dan kalkulasi pajak otomatis.
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
          <Button onClick={() => setIsAddModalOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Buat PO Baru
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <Card className="border-slate-200/80 dark:border-slate-800">
        <CardContent className="p-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Input
                placeholder="Cari nomor PO, nama vendor, atau catatan..."
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
                <option value="">Semua Status PO</option>
                <option value="PENDING_APPROVAL">Menunggu Approval</option>
                <option value="APPROVED">Approved</option>
                <option value="RECEIVED">Barang Diterima</option>
                <option value="REJECTED">Ditolak</option>
                <option value="CANCELLED">Dibatalkan</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card className="border-slate-200/80 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase bg-slate-50/80 dark:bg-slate-900/80">
              <tr>
                <th className="py-3 px-3 w-12 text-center">No.</th>
                <th className="py-3.5 px-4">Nomor PO</th>
                <th className="py-3.5 px-4">Vendor / Supplier</th>
                <th className="py-3.5 px-4">Tanggal Order</th>
                <th className="py-3.5 px-4 text-right">Subtotal</th>
                <th className="py-3.5 px-4 text-right">Total (+PPN)</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <TableLoading colSpan={8} message="Memuat daftar Purchase Order..." />
              ) : paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-slate-400">
                    Tidak ada Purchase Order yang cocok.
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((po, idx) => {
                  const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr key={po.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-3 text-center text-xs font-medium text-slate-400">
                        {rowNumber}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                        {po.po_no}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                        {po.supplier?.name}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {formatDate(po.order_date)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-xs text-slate-600 dark:text-slate-400">
                        {formatCurrency(po.subtotal)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(po.total_amount)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {po.status === "PENDING_APPROVAL" && <Badge variant="warning">Menunggu Approval</Badge>}
                        {po.status === "APPROVED" && <Badge variant="success">Approved</Badge>}
                        {po.status === "RECEIVED" && <Badge variant="indigo">Barang Diterima</Badge>}
                        {po.status === "REJECTED" && <Badge variant="destructive">Ditolak</Badge>}
                        {po.status === "CANCELLED" && <Badge variant="secondary">Dibatalkan</Badge>}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handlePrintPODocument(po)}
                            className="h-8 px-2 text-xs text-slate-700 hover:text-indigo-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                            title="Cetak Surat Pesanan PO Resmi (PDF)"
                          >
                            <Printer className="h-3.5 w-3.5 mr-1 text-indigo-600" />
                            Cetak
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedPO(po);
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
          totalItems={filteredOrders.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </Card>

      {/* Slide-over: Buat PO Baru */}
      <SlideOver
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Buat Purchase Order (PO) Baru"
        description="Pilih rekanan supplier, tarif pajak PPN, dan daftar barang yang dipesan."
        width="2xl"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" form="create-po-form" isLoading={isSubmitting}>
              Terbitkan Purchase Order
            </Button>
          </>
        }
      >
        <form id="create-po-form" onSubmit={handleCreatePO} className="space-y-5">
          {/* Section: Impor dari PR */}
          {approvedPRs.length > 0 && (
            <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 space-y-1.5">
              <label className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                <FileCheck className="h-3.5 w-3.5 text-indigo-600" />
                Impor dari Purchase Request (PR) yang Sudah Approved
              </label>
              <select
                value={selectedImportPRId}
                onChange={(e) => handleSelectPR(e.target.value)}
                className="h-10 w-full rounded-lg border border-indigo-200 bg-white px-3 text-xs text-slate-700 dark:border-indigo-800 dark:bg-slate-900 dark:text-slate-200 font-medium"
              >
                <option value="">-- Buat PO Manual / Pilih PR untuk Isi Otomatis --</option>
                {approvedPRs.map((pr) => (
                  <option key={pr.id} value={pr.id}>
                    {pr.pr_no} • {pr.items?.length || 0} Barang ({formatDate(pr.request_date)})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              1. Informasi Rekanan & Ketentuan Order
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Pilih Vendor / Supplier <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formSupplierId}
                  onChange={(e) => setFormSupplierId(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="" disabled>Pilih Vendor / Rekanan...</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Tarif PPN (%)
                </label>
                <Input
                  type="number"
                  value={formTaxPercent}
                  onChange={(e) => setFormTaxPercent(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Dynamic Item Rows */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                2. Daftar Barang yang Dipesan <span className="text-rose-500">*</span>:
              </span>
              <Button type="button" size="sm" variant="outline" onClick={addItemRow} className="text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Tambah Baris Item
              </Button>
            </div>

            <div className="space-y-2.5">
              {formItems.map((item, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row items-center gap-2.5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
                  <div className="flex-1 w-full">
                    <select
                      required
                      value={item.productId}
                      onChange={(e) => handleProductChange(idx, e.target.value)}
                      className="h-10 w-full rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                    >
                      <option value="" disabled>Pilih Produk...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku} - {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-full sm:w-24">
                    <Input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={item.qty}
                      onChange={(e) => handleQtyPriceChange(idx, "qty", parseFloat(e.target.value) || 0)}
                      className="h-10 text-xs"
                    />
                  </div>
                  <div className="w-full sm:w-36">
                    <Input
                      type="number"
                      prefixText="Rp"
                      placeholder="0"
                      value={item.unitPrice ? item.unitPrice : ""}
                      onChange={(e) => handleQtyPriceChange(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                      className="h-10 text-xs"
                    />
                  </div>
                  <div className="w-full sm:w-32 text-right font-semibold text-xs text-slate-900 dark:text-slate-100">
                    {formatCurrency(item.qty * item.unitPrice)}
                  </div>
                  {formItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItemRow(idx)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg dark:hover:bg-rose-950/40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Subtotal & Total Preview */}
          <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-1.5 text-right text-xs">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Subtotal Item:</span>
              <span>{formatCurrency(calculateSubtotal())}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>PPN ({formTaxPercent}%):</span>
              <span>{formatCurrency(calculateSubtotal() * (parseFloat(formTaxPercent) / 100))}</span>
            </div>
            <div className="flex justify-between font-bold text-sm text-indigo-900 dark:text-indigo-200 pt-1.5 border-t border-indigo-200/50 dark:border-indigo-800">
              <span>Estimasi Total PO:</span>
              <span>{formatCurrency(calculateSubtotal() * (1 + parseFloat(formTaxPercent) / 100))}</span>
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Catatan Order / Instruksi Pengiriman
            </label>
            <textarea
              rows={3}
              placeholder="Catatan termin, jadwal estimasi pengiriman vendor, atau kontak PIC..."
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 resize-y"
            />
          </div>
        </form>
      </SlideOver>

      {/* Slide-over: Detail & Approval PO */}
      <SlideOver
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={`Dokumen: ${selectedPO?.po_no || ""}`}
        description={`Supplier: ${selectedPO?.supplier?.name || ""} • Tanggal: ${formatDate(selectedPO?.order_date)}`}
        width="xl"
        footer={
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsDetailModalOpen(false)}>
                Tutup
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePrintPODocument(selectedPO)}
                className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300"
              >
                <Printer className="h-4 w-4 mr-1.5 text-indigo-600" />
                Cetak Dokumen PO (PDF)
              </Button>
            </div>

            {selectedPO?.status === "PENDING_APPROVAL" && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleApprovePO(selectedPO.id, "REJECTED")}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Tolak PO
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleApprovePO(selectedPO.id, "APPROVED")}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Setujui (Approve)
                </Button>
              </div>
            )}
          </div>
        }
      >
        <div className="space-y-4">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {selectedPO?.items?.map((item: any, idx: number) => (
              <div key={idx} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {item.product?.name}
                  </p>
                  <p className="text-slate-400">
                    {item.qty} {item.product?.unit?.symbol || "Pcs"} &times; {formatCurrency(item.unit_price)}
                  </p>
                </div>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {formatCurrency(item.total_price)}
                </span>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-xs space-y-1.5 text-right">
            <div className="flex justify-between">
              <span className="text-slate-400">Total Tagihan:</span>
              <span className="font-bold text-base text-slate-900 dark:text-slate-100">
                {formatCurrency(selectedPO?.total_amount || 0)}
              </span>
            </div>
          </div>
        </div>
      </SlideOver>
    </div>
  );
}

export default function PurchaseOrdersPage() {
  return (
    <Suspense fallback={<TableLoading colSpan={7} message="Memuat halaman Purchase Order..." />}>
      <PurchaseOrdersContent />
    </Suspense>
  );
}
