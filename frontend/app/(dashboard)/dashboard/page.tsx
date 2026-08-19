"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Boxes,
  ShoppingBag,
  Truck,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  PackagePlus,
  ArrowLeftRight,
  FilePlus,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-store";
import { api } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { user, roles } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStockCount: 0,
    totalSuppliers: 0,
    pendingPOs: 0,
    totalStockValue: 0,
    totalWarehouses: 0,
    totalCustomers: 0,
    totalSalesOrders: 0,
    totalSalesRevenue: 0,
  });

  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [recentMutations, setRecentMutations] = useState<any[]>([]);

  useEffect(() => {
    async function loadDashboardData() {
      setIsLoading(true);
      try {
        const [
          prodRes,
          whRes,
          suppRes,
          poRes,
          custRes,
          soRes,
          mutRes,
        ] = await Promise.allSettled([
          api.get<any>("/inventory/products", { per_page: 100 }),
          api.get<any>("/inventory/warehouses"),
          api.get<any>("/purchasing/suppliers", { per_page: 100 }),
          api.get<any>("/purchasing/purchase-orders", { per_page: 100 }),
          api.get<any>("/sales/customers", { per_page: 100 }),
          api.get<any>("/sales/orders", { per_page: 100 }),
          api.get<any>("/inventory/stock-mutations", { per_page: 10 }),
        ]);

        let totalProducts = 0;
        let totalStockValue = 0;
        let lowStockList: any[] = [];

        if (prodRes.status === "fulfilled" && prodRes.value?.data?.items) {
          const items = prodRes.value.data.items;
          totalProducts = prodRes.value.data.meta?.total_items || items.length;
          totalStockValue = items.reduce(
            (acc: number, curr: any) => acc + (curr.cost_price || 0) * (curr.total_stock || 0),
            0
          );
          lowStockList = items.filter((p: any) => (p.total_stock || 0) <= (p.min_stock || 0));
        }

        let totalWarehouses = 0;
        if (whRes.status === "fulfilled" && Array.isArray(whRes.value?.data)) {
          totalWarehouses = whRes.value.data.length;
        }

        let totalSuppliers = 0;
        if (suppRes.status === "fulfilled" && suppRes.value?.data?.items) {
          totalSuppliers = suppRes.value.data.meta?.total_items || suppRes.value.data.items.length;
        }

        let pendingPOs = 0;
        if (poRes.status === "fulfilled" && poRes.value?.data?.items) {
          const pos = poRes.value.data.items;
          pendingPOs = pos.filter((p: any) => p.status === "PENDING_APPROVAL" || p.status === "DRAFT").length;
        }

        let totalCustomers = 0;
        if (custRes.status === "fulfilled" && custRes.value?.data?.items) {
          totalCustomers = custRes.value.data.meta?.total_items || custRes.value.data.items.length;
        }

        let totalSalesOrders = 0;
        let totalSalesRevenue = 0;
        if (soRes.status === "fulfilled" && soRes.value?.data?.items) {
          const sos = soRes.value.data.items;
          totalSalesOrders = soRes.value.data.meta?.total_items || sos.length;
          totalSalesRevenue = sos.reduce((acc: number, curr: any) => acc + (curr.total_amount || 0), 0);
        }

        let mutations: any[] = [];
        if (mutRes.status === "fulfilled") {
          if (mutRes.value?.data?.items) {
            mutations = mutRes.value.data.items;
          } else if (Array.isArray(mutRes.value?.data)) {
            mutations = mutRes.value.data;
          }
        }

        setStats({
          totalProducts,
          lowStockCount: lowStockList.length,
          totalSuppliers,
          pendingPOs,
          totalStockValue,
          totalWarehouses,
          totalCustomers,
          totalSalesOrders,
          totalSalesRevenue,
        });

        setLowStockProducts(lowStockList);
        setRecentMutations(mutations);
      } catch (e) {
        console.error("Gagal memuat data dashboard real-time:", e);
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-6 sm:p-8 text-white shadow-xl shadow-indigo-950/20">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs text-indigo-300 font-medium">
              Sistem Aktif & Terlindungi
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2">
              Selamat Datang, {user?.full_name || "Administrator"} 👋
            </h1>
            <p className="text-sm text-indigo-200 mt-1 max-w-xl">
              Platform ERP siap digunakan. Semua database PostgreSQL skema terpusat berjalan optimal.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Link href="/inventory">
              <Button variant="secondary" size="sm" className="bg-white text-indigo-900 hover:bg-indigo-50 font-semibold">
                <Boxes className="h-4 w-4 mr-2" />
                Lihat Stok Produk
              </Button>
            </Link>
            <Link href="/purchasing/orders">
              <Button variant="outline" size="sm" className="border-indigo-400/40 text-white hover:bg-indigo-700/50">
                <ShoppingBag className="h-4 w-4 mr-2" />
                Kelola PO
              </Button>
            </Link>
          </div>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* 4 Primary KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Card 1: Nilai Stok */}
        <Card className="hover:shadow-md transition-shadow border-slate-200/80 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Nilai Aset Stok
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {formatCurrency(stats.totalStockValue)}
            </div>
            <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <ArrowUpRight className="h-3.5 w-3.5" />
              Terkalkulasi Real-Time
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Total SKU */}
        <Card className="hover:shadow-md transition-shadow border-slate-200/80 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total SKU Produk
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <Boxes className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {stats.totalProducts} SKU
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Terdistribusi di {stats.totalWarehouses} Gudang Aktif
            </p>
          </CardContent>
        </Card>

        {/* Card 3: PO Pending */}
        <Card className="hover:shadow-md transition-shadow border-slate-200/80 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              PO Pending Approval
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {stats.pendingPOs} Dokumen
            </div>
            <p className="text-xs text-amber-600 font-medium mt-1">
              {stats.pendingPOs > 0 ? "Memerlukan persetujuan" : "Semua PO telah diproses"}
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Supplier */}
        <Card className="hover:shadow-md transition-shadow border-slate-200/80 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Vendor / Supplier
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
              <Truck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {stats.totalSuppliers} Vendor
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Aktif & Terdaftar
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Row: Low Stock Critical Alert + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Low Stock Alerts (2 Cols) */}
        <Card className="lg:col-span-2 border-slate-200/80 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Peringatan Stok Minimum (Low Stock Alert)
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">
                Produk berikut berada pada atau di bawah ambang batas minimum gudang.
              </p>
            </div>
            <Badge variant={lowStockProducts.length > 0 ? "warning" : "success"}>
              {lowStockProducts.length} Kritis
            </Badge>
          </CardHeader>
          <CardContent>
            {lowStockProducts.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Semua Stok Aman!</span>
                <span>Tidak ada produk yang berada di bawah ambang batas safety stock saat ini.</span>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {lowStockProducts.map((item) => (
                  <div key={item.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        SKU: <span className="font-mono">{item.sku}</span> &bull; Min: {item.min_stock} {item.unit?.symbol || "Pcs"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-bold text-rose-600 dark:text-rose-400">
                          {item.total_stock} {item.unit?.symbol || "Pcs"}
                        </p>
                        <p className="text-[10px] text-slate-400">Sisa Stok Fisik</p>
                      </div>
                      <Link href="/purchasing/orders">
                        <Button size="sm" variant="outline" className="text-xs font-semibold">
                          Reorder PO
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Operations (1 Col) */}
        <Card className="border-slate-200/80 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-base">Aksi Cepat Transaksi</CardTitle>
            <p className="text-xs text-slate-500">Pintasan operasi harian.</p>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <Link href="/inventory" className="block">
              <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-all flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 flex items-center justify-center">
                    <PackagePlus className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Tambah Produk Baru
                    </p>
                    <p className="text-[11px] text-slate-500">Input SKU & Master Harga</p>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
              </div>
            </Link>

            <Link href="/inventory/mutations" className="block">
              <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-all flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 flex items-center justify-center">
                    <ArrowLeftRight className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Mutasi & Transfer Stok
                    </p>
                    <p className="text-[11px] text-slate-500">Pindah stok antar gudang</p>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
              </div>
            </Link>

            <Link href="/purchasing/orders" className="block">
              <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-all flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-600 flex items-center justify-center">
                    <FilePlus className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Buat Purchase Order
                    </p>
                    <p className="text-[11px] text-slate-500">Order pembelian ke supplier</p>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Stock Activity Table */}
      <Card className="border-slate-200/80 dark:border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Histori Pergerakan Stok Terkini</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">Audit log mutasi masuk, keluar, dan transfer gudang langsung dari PostgreSQL.</p>
          </div>
          <Link href="/inventory/mutations">
            <Button variant="ghost" size="sm" className="text-xs text-indigo-600">
              Lihat Semua Log
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase bg-slate-50/50 dark:bg-slate-900/50">
                <tr>
                  <th className="py-3 px-4">Tipe Mutasi</th>
                  <th className="py-3 px-4">Produk</th>
                  <th className="py-3 px-4">Gudang</th>
                  <th className="py-3 px-4 text-right">Kuantitas</th>
                  <th className="py-3 px-4">Catatan</th>
                  <th className="py-3 px-4">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentMutations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                      Belum ada aktivitas transaksi mutasi stok di database.
                    </td>
                  </tr>
                ) : (
                  recentMutations.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4">
                        {m.mutation_type === "IN" && <Badge variant="success">IN (MASUK)</Badge>}
                        {m.mutation_type === "OUT" && <Badge variant="destructive">OUT (KELUAR)</Badge>}
                        {m.mutation_type === "TRANSFER" && <Badge variant="indigo">TRANSFER</Badge>}
                        {m.mutation_type === "ADJUSTMENT" && <Badge variant="warning">OPNAME</Badge>}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                        {m.product?.name || "Produk"}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">
                        {m.to_warehouse?.name || m.from_warehouse?.name || "-"}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-slate-100">
                        {m.qty}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">
                        {m.notes || "-"}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-400 whitespace-nowrap">
                        {formatDate(m.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
