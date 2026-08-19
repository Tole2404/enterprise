"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Truck,
  Search,
  CheckCircle2,
  Download,
  Printer,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import { exportTableToPDF, exportDocumentToPDF } from "@/lib/pdf-export";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTablePagination } from "@/components/ui/pagination";

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchDeliveries = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<any>("/sales/deliveries", { per_page: 100 });
      if (res.data?.items) {
        setDeliveries(res.data.items);
      } else if (Array.isArray(res.data)) {
        setDeliveries(res.data);
      } else {
        setDeliveries([]);
      }
    } catch (e) {
      console.error("Gagal mengambil surat jalan dari database:", e);
      setDeliveries([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const filteredDeliveries = useMemo(() => {
    return deliveries.filter((d) => {
      const matchSearch =
        d.do_no?.toLowerCase().includes(search.toLowerCase()) ||
        d.sales_order?.so_no?.toLowerCase().includes(search.toLowerCase()) ||
        d.sales_order?.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
        d.notes?.toLowerCase().includes(search.toLowerCase());
      return matchSearch;
    });
  }, [deliveries, search]);

  const paginatedDeliveries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDeliveries.slice(start, start + pageSize);
  }, [filteredDeliveries, currentPage, pageSize]);

  const handleExportTablePDF = () => {
    exportTableToPDF({
      title: "Laporan Pengiriman Barang & Surat Jalan (DO)",
      subtitle: "Daftar pengiriman barang ke pelanggan, gudang asal, dan nomor referensi pesanan",
      orientation: "landscape",
      columns: [
        { header: "Nomor Surat Jalan", key: "do_no", width: "130px" },
        {
          header: "Referensi SO",
          key: "so_no",
          render: (row) => row.sales_order?.so_no || "-",
        },
        {
          header: "Pelanggan / Penerima",
          key: "customer",
          render: (row) => row.sales_order?.customer?.name || "-",
        },
        {
          header: "Gudang Asal",
          key: "warehouse",
          render: (row) => row.warehouse?.name || "-",
        },
        {
          header: "Tanggal Kirim",
          key: "delivery_date",
          render: (row) => formatDate(row.delivery_date),
        },
        {
          header: "Ekspedisi / Catatan",
          key: "notes",
          render: (row) => row.notes || "-",
        },
        {
          header: "Status",
          key: "status",
          align: "center",
          render: () => "TERKIRIM",
        },
      ],
      data: filteredDeliveries,
      summaryItems: [
        { label: "Total Surat Jalan Diterbitkan", value: `${filteredDeliveries.length} DO` },
      ],
    });
  };

  const handlePrintDODocument = (d: any) => {
    if (!d) return;
    const so = d.sales_order;
    exportDocumentToPDF({
      docType: "DELIVERY_ORDER",
      docTitle: "SURAT JALAN PENGIRIMAN (DELIVERY ORDER)",
      docNo: d.do_no || "DO-DRAFT",
      docDate: formatDate(d.delivery_date),
      status: "TERKIRIM & SAH",
      partnerInfo: {
        title: "Tujuan Pengiriman / Penerima:",
        name: so?.customer?.name || "Pelanggan",
        code: so?.customer?.code,
        contact: so?.customer?.email,
        phone: so?.customer?.phone,
        address: so?.customer?.address || "Alamat Tujuan Pengiriman",
      },
      details: [
        { label: "Nomor Referensi SO", value: so?.so_no || "-" },
        { label: "Gudang Pengeluaran", value: d.warehouse?.name || "Gudang Utama" },
        { label: "Armada / Ekspedisi", value: d.notes || "Kurir Internal / Logistik" },
      ],
      items: (so?.items || []).map((it: any, idx: number) => ({
        no: idx + 1,
        code: it.product?.sku || "-",
        name: it.product?.name || "Produk",
        qty: it.qty,
        unit: it.product?.unit?.symbol || "Unit",
        notes: "Kondisi Baik & Tersegel",
      })),
      notes: "Barang telah diperiksa dan diserahkan dalam kondisi lengkap dan baik. Harap ditandatangani dan dicap oleh penerima saat tiba di lokasi.",
      signatures: [
        { role: "Petugas Gudang", name: "Staf Logistik" },
        { role: "Supir / Kurir Pengantar", name: "Pengemudi" },
        { role: "Penerima Barang", name: so?.customer?.name || "Penerima" },
      ],
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Truck className="h-6 w-6 text-indigo-600" />
            Surat Jalan & Pengiriman (Delivery Orders)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Bukti fisik pengiriman barang keluar dari gudang ke pelanggan.
          </p>
        </div>

        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportTablePDF}
            className="border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
          >
            <Download className="h-4 w-4 mr-1.5 text-indigo-600" />
            Export Rekap PDF
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <Card className="border-slate-200/80 dark:border-slate-800">
        <CardContent className="p-3.5">
          <Input
            placeholder="Cari nomor Surat Jalan, nomor SO, nama pelanggan, atau supir..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            icon={<Search className="h-4 w-4" />}
            className="h-9 text-xs max-w-md"
          />
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-slate-200/80 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase bg-slate-50/80 dark:bg-slate-900/80">
              <tr>
                <th className="py-3 px-3 w-12 text-center">No.</th>
                <th className="py-3.5 px-4">Nomor Surat Jalan</th>
                <th className="py-3.5 px-4">Referensi SO</th>
                <th className="py-3.5 px-4">Pelanggan</th>
                <th className="py-3.5 px-4">Gudang Asal</th>
                <th className="py-3.5 px-4">Tanggal Pengiriman</th>
                <th className="py-3.5 px-4">Ekspedisi / Catatan</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedDeliveries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs text-slate-400">
                    Tidak ada data pengiriman surat jalan yang cocok.
                  </td>
                </tr>
              ) : (
                paginatedDeliveries.map((d, idx) => {
                  const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr key={d.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-3 text-center text-xs font-medium text-slate-400">
                        {rowNumber}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                        {d.do_no}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600 dark:text-slate-300">
                        {d.sales_order?.so_no || "-"}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                        {d.sales_order?.customer?.name || "-"}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {d.warehouse?.name || "-"}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {formatDate(d.delivery_date)}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {d.notes || "-"}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge variant="success">Terkirim</Badge>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handlePrintDODocument(d)}
                          className="h-8 px-2 text-xs text-slate-700 hover:text-indigo-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                          title="Cetak Surat Jalan Resmi (PDF)"
                        >
                          <Printer className="h-3.5 w-3.5 mr-1 text-indigo-600" />
                          Cetak DO
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
          totalItems={filteredDeliveries.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </Card>
    </div>
  );
}
