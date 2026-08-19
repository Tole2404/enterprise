"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Briefcase,
  Search,
  Plus,
  Trash2,
  Truck,
  Eye,
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

export default function SalesOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // SlideOver States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isShipModalOpen, setIsShipModalOpen] = useState(false);
  const [selectedSO, setSelectedSO] = useState<any>(null);

  // Form State
  const [formCustomerID, setFormCustomerID] = useState("");
  const [formTaxPercent, setFormTaxPercent] = useState(11);
  const [formItems, setFormItems] = useState<Array<{ productId: string; qty: number; unitPrice: number }>>([
    { productId: "", qty: 1, unitPrice: 0 },
  ]);
  const [shipWarehouseID, setShipWarehouseID] = useState("");
  const [shipNotes, setShipNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<any>("/sales/orders", { per_page: 100 });
      if (res.data?.items) {
        setOrders(res.data.items);
      } else if (Array.isArray(res.data)) {
        setOrders(res.data);
      } else {
        setOrders([]);
      }
    } catch (e) {
      console.error("Gagal mengambil data SO dari database:", e);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMaster = async () => {
    try {
      const cRes = await api.get<any>("/sales/customers");
      if (cRes.data?.items) setCustomers(cRes.data.items);

      const pRes = await api.get<any>("/inventory/products");
      if (pRes.data?.items) setProducts(pRes.data.items);

      const wRes = await api.get<any>("/inventory/warehouses");
      if (wRes.data) setWarehouses(wRes.data);
    } catch (e) {}
  };

  useEffect(() => {
    fetchOrders();
    fetchMaster();
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter((so) => {
      const matchSearch =
        so.so_no?.toLowerCase().includes(search.toLowerCase()) ||
        so.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
        so.notes?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = !statusFilter || so.status === statusFilter;
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

  const handleProductSelect = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    const updated = [...formItems];
    updated[index].productId = productId;
    if (prod) {
      updated[index].unitPrice = prod.selling_price || 0;
    }
    setFormItems(updated);
  };

  const handleItemChange = (index: number, field: "qty" | "unitPrice", value: number) => {
    const updated = [...formItems];
    updated[index][field] = value;
    setFormItems(updated);
  };

  const subtotal = formItems.reduce((sum, it) => sum + (it.qty || 0) * (it.unitPrice || 0), 0);
  const taxAmount = (subtotal * formTaxPercent) / 100;
  const grandTotal = subtotal + taxAmount;

  const handleCreateSO = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await api.post("/sales/orders", {
        customer_id: formCustomerID,
        tax_percent: formTaxPercent,
        items: formItems.map((it) => ({
          product_id: it.productId,
          qty: it.qty,
          unit_price: it.unitPrice,
        })),
      });

      setIsAddModalOpen(false);
      fetchOrders();
    } catch (err: any) {
      alert(err.message || "Gagal membuat Sales Order");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShipGoods = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await api.post("/sales/deliveries", {
        so_id: selectedSO.id,
        warehouse_id: shipWarehouseID,
        notes: shipNotes,
      });

      setIsShipModalOpen(false);
      setIsDetailModalOpen(false);
      fetchOrders();
      alert("Pengiriman Surat Jalan (DO) berhasil dibuat! Stok gudang telah dipotong otomatis & Invoice telah terbit.");
    } catch (err: any) {
      alert(err.message || "Gagal mengirim barang");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportTablePDF = () => {
    const totalRevenue = filteredOrders.reduce((sum, so) => sum + (so.total_amount || 0), 0);
    exportTableToPDF({
      title: "Laporan Pesanan Penjualan (Sales Orders)",
      subtitle: "Rekapitulasi order penjualan pelanggan, status pengiriman, dan total omset",
      orientation: "landscape",
      columns: [
        { header: "Nomor SO", key: "so_no", width: "130px" },
        {
          header: "Tanggal Pesanan",
          key: "order_date",
          render: (row) => formatDate(row.order_date),
        },
        {
          header: "Pelanggan / Pembeli",
          key: "customer",
          render: (row) => row.customer?.name || "Customer",
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
          header: "Total Omset (+PPN)",
          key: "total_amount",
          align: "right",
          render: (row) => formatCurrency(row.total_amount),
        },
        {
          header: "Status SO",
          key: "status",
          align: "center",
          render: (row) => {
            if (row.status === "PAID") return "LUNAS";
            if (row.status === "SHIPPED") return "TERKIRIM";
            if (row.status === "CONFIRMED") return "SIAP KIRIM";
            if (row.status === "CANCELLED") return "BATAL";
            return "DRAFT";
          },
        },
      ],
      data: filteredOrders,
      summaryItems: [
        { label: "Total Pesanan SO", value: `${filteredOrders.length} Order` },
        { label: "Total Akumulasi Omset", value: formatCurrency(totalRevenue) },
      ],
    });
  };

  const handlePrintSODocument = (so: any) => {
    if (!so) return;
    exportDocumentToPDF({
      docType: "SALES_ORDER",
      docTitle: "SURAT PESANAN PENJUALAN (SALES ORDER)",
      docNo: so.so_no || "SO-DRAFT",
      docDate: formatDate(so.order_date),
      status: so.status,
      partnerInfo: {
        title: "Pelanggan / Kepada Yth:",
        name: so.customer?.name || "Pelanggan",
        code: so.customer?.code,
        contact: so.customer?.email,
        phone: so.customer?.phone,
        address: so.customer?.address || "Alamat Pengiriman",
      },
      details: [
        { label: "Status Dokumen", value: so.status },
        { label: "Dibuat Oleh", value: so.creator?.full_name || "Sales Admin" },
      ],
      items: (so.items || []).map((it: any, idx: number) => ({
        no: idx + 1,
        code: it.product?.sku || "-",
        name: it.product?.name || "Produk",
        qty: it.qty,
        unit: it.product?.unit?.symbol || "Unit",
        price: it.unit_price,
        total: it.total_price || (it.qty * it.unit_price),
      })),
      financials: {
        subtotal: so.subtotal,
        tax: so.tax_amount,
        total: so.total_amount,
      },
      notes: so.notes || "Pesanan penjualan resmi diproses setelah konfirmasi pembayaran atau verifikasi credit limit.",
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-indigo-600" />
            Pesanan Penjualan (Sales Orders)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Kelola pesanan pelanggan, pembuatan surat jalan (Delivery Order), dan penerbitan faktur penjualan.
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
            Buat Sales Order (SO)
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <Card className="border-slate-200/80 dark:border-slate-800">
        <CardContent className="p-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Input
                placeholder="Cari nomor SO, nama pelanggan, atau catatan..."
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
                <option value="">Semua Status SO</option>
                <option value="CONFIRMED">Siap Dikirim</option>
                <option value="SHIPPED">Barang Terkirim</option>
                <option value="PAID">Lunas</option>
                <option value="DRAFT">Draft</option>
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
                <th className="py-3.5 px-4">Nomor SO</th>
                <th className="py-3.5 px-4">Pelanggan</th>
                <th className="py-3.5 px-4">Tanggal Order</th>
                <th className="py-3.5 px-4 text-right">Nilai Pesanan</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <TableLoading colSpan={7} message="Memuat pesanan penjualan..." />
              ) : paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                    Tidak ada pesanan penjualan yang cocok.
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((so, idx) => {
                  const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr key={so.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-3 text-center text-xs font-medium text-slate-400">
                        {rowNumber}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                        {so.so_no}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                        {so.customer?.name || "-"}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {formatDate(so.order_date)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(so.total_amount)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {so.status === "CONFIRMED" && <Badge variant="warning">Siap Dikirim</Badge>}
                        {so.status === "SHIPPED" && <Badge variant="indigo">Barang Terkirim</Badge>}
                        {so.status === "PAID" && <Badge variant="success">Lunas</Badge>}
                        {so.status === "CANCELLED" && <Badge variant="destructive">Dibatalkan</Badge>}
                        {so.status === "DRAFT" && <Badge variant="secondary">Draft</Badge>}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handlePrintSODocument(so)}
                            className="h-8 px-2 text-xs text-slate-700 hover:text-indigo-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                            title="Cetak Surat Pesanan Penjualan SO (PDF)"
                          >
                            <Printer className="h-3.5 w-3.5 mr-1 text-indigo-600" />
                            Cetak
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedSO(so);
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

      {/* Slide-over: Buat Sales Order */}
      <SlideOver
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Buat Pesanan Penjualan (SO) Baru"
        description="Pilih pelanggan pembeli, tarif pajak PPN, dan daftar item produk yang dipesan."
        width="2xl"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" form="create-so-form" isLoading={isSubmitting}>
              Simpan Sales Order
            </Button>
          </>
        }
      >
        <form id="create-so-form" onSubmit={handleCreateSO} className="space-y-5">
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              1. Pelanggan & Ketentuan Faktur
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Pelanggan (Customer) <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formCustomerID}
                  onChange={(e) => setFormCustomerID(e.target.value)}
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="" disabled>Pilih Pelanggan...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.name}
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
                  onChange={(e) => setFormTaxPercent(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          {/* Dynamic Item Rows */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                2. Daftar Barang Dipesan <span className="text-rose-500">*</span>:
              </span>
              <Button type="button" size="sm" variant="outline" onClick={addItemRow} className="text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Tambah Baris
              </Button>
            </div>

            <div className="space-y-2.5">
              {formItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row items-center gap-2.5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800"
                >
                  <div className="flex-1 w-full">
                    <select
                      required
                      value={item.productId}
                      onChange={(e) => handleProductSelect(idx, e.target.value)}
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
                      onChange={(e) => handleItemChange(idx, "qty", parseFloat(e.target.value) || 1)}
                      className="h-10 text-xs"
                    />
                  </div>
                  <div className="w-full sm:w-36">
                    <Input
                      type="number"
                      prefixText="Rp"
                      placeholder="0"
                      value={item.unitPrice ? item.unitPrice : ""}
                      onChange={(e) => handleItemChange(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                      className="h-10 text-xs"
                    />
                  </div>
                  <div className="w-full sm:w-36 text-right font-bold text-xs text-slate-900 dark:text-slate-100">
                    {formatCurrency((item.qty || 0) * (item.unitPrice || 0))}
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

          {/* Subtotal & Grand Total Summary */}
          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl space-y-1.5 text-xs border border-slate-200/80 dark:border-slate-800">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal Produk:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>PPN ({formTaxPercent}%):</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(taxAmount)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-indigo-600 dark:text-indigo-400 pt-2 border-t border-slate-200 dark:border-slate-800">
              <span>Grand Total Pesanan:</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </form>
      </SlideOver>

      {/* Slide-over: Detail SO */}
      <SlideOver
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={`Sales Order: ${selectedSO?.so_no || ""}`}
        description={`Pelanggan: ${selectedSO?.customer?.name || ""} • Tanggal: ${formatDate(selectedSO?.order_date)}`}
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
                onClick={() => handlePrintSODocument(selectedSO)}
                className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300"
              >
                <Printer className="h-4 w-4 mr-1.5 text-indigo-600" />
                Cetak Dokumen SO (PDF)
              </Button>
            </div>

            {selectedSO?.status === "CONFIRMED" && (
              <Button
                size="sm"
                onClick={() => {
                  if (warehouses.length > 0) setShipWarehouseID(warehouses[0].id);
                  setIsShipModalOpen(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <Truck className="h-4 w-4 mr-1" />
                Terbitkan Surat Jalan (Kirim Barang)
              </Button>
            )}
          </div>
        }
      >
        <div className="space-y-4">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {selectedSO?.items?.map((item: any, idx: number) => (
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

          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl space-y-1.5 text-xs border border-slate-200/80 dark:border-slate-800">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal:</span>
              <span>{formatCurrency(selectedSO?.subtotal || 0)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>PPN:</span>
              <span>{formatCurrency(selectedSO?.tax_amount || 0)}</span>
            </div>
            <div className="flex justify-between font-bold text-base text-indigo-600 pt-1.5 border-t border-slate-200 dark:border-slate-800">
              <span>Total Pesanan:</span>
              <span>{formatCurrency(selectedSO?.total_amount || 0)}</span>
            </div>
          </div>
        </div>
      </SlideOver>

      {/* Slide-over: Pengiriman Surat Jalan (DO) */}
      <SlideOver
        isOpen={isShipModalOpen}
        onClose={() => setIsShipModalOpen(false)}
        title="Terbitkan Surat Jalan (Delivery Order)"
        description={`Kirim barang pesanan untuk ${selectedSO?.so_no}. Stok gudang akan otomatis dipotong.`}
        width="lg"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsShipModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" form="ship-goods-form" isLoading={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700">
              Konfirmasi Kirim & Potong Stok
            </Button>
          </>
        }
      >
        <form id="ship-goods-form" onSubmit={handleShipGoods} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Gudang Pengirim (Asal Barang)
            </label>
            <select
              required
              value={shipWarehouseID}
              onChange={(e) => setShipWarehouseID(e.target.value)}
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              <option value="">Pilih Gudang...</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nomor Resi / Supir / Catatan Ekspedisi
            </label>
            <textarea
              rows={3}
              placeholder="Contoh: Kurir Internal - Mobil Box B 1234 CD / No. Resi JNE TRUCKING..."
              value={shipNotes}
              onChange={(e) => setShipNotes(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 resize-y"
            />
          </div>
        </form>
      </SlideOver>
    </div>
  );
}
