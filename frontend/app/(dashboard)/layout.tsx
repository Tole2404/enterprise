"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/layout/sidebar";
import { TopNavbar } from "@/components/layout/top-navbar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { useAuth } from "@/lib/auth-store";
import { Loader2, ChevronRight, Home } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  // Generate breadcrumb items from URL
  const pathSegments = pathname.split("/").filter(Boolean);

  const getSegmentTitle = (segment: string) => {
    const titles: Record<string, string> = {
      dashboard: "Dashboard",
      inventory: "Inventori & Gudang",
      mutations: "Mutasi & Opname",
      categories: "Kategori Produk",
      units: "Satuan Unit (UoM)",
      warehouses: "Master Gudang",
      purchasing: "Pembelian",
      suppliers: "Vendor & Supplier",
      requests: "Purchase Requests (PR)",
      orders: "Purchase Orders (PO)",
      receipts: "Penerimaan Barang (GRN)",
      sales: "Penjualan & CRM",
      customers: "Master Pelanggan",
      deliveries: "Surat Jalan (DO)",
      invoices: "Faktur & Piutang",
      finance: "Keuangan & Akuntansi",
      accounts: "Bagan Akun (COA)",
      journals: "Buku Jurnal Umum",
      reports: "Laporan Keuangan",
      hr: "SDM & Karyawan",
      employees: "Data Karyawan",
      leaves: "Pengajuan Cuti",
      payroll: "Penggajian (Payroll)",
      "auth-management": "Keamanan Sistem",
      users: "Manajemen User",
      roles: "Matrix Izin Role",
    };
    return titles[segment] || segment;
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
          <p className="text-sm font-medium text-slate-500">Memuat Sesi Pengguna...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex bg-slate-100/90 dark:bg-slate-950">
      {/* Desktop Sticky Sidebar */}
      <Sidebar />

      {/* Mobile Drawer */}
      <MobileSidebar
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopNavbar onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto animate-in fade-in duration-300">
          {/* In-Content Breadcrumbs Navigation */}
          <nav className="flex items-center text-xs text-slate-400 mb-4 gap-1.5 font-medium">
            <Link href="/dashboard" className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              <Home className="h-3.5 w-3.5" />
              <span>ERP</span>
            </Link>
            {pathSegments.map((seg, idx) => (
              <React.Fragment key={idx}>
                <ChevronRight className="h-3 w-3 text-slate-300 dark:text-slate-700 shrink-0" />
                <span
                  className={
                    idx === pathSegments.length - 1
                      ? "text-slate-900 dark:text-slate-100 font-semibold"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                  }
                >
                  {getSegmentTitle(seg)}
                </span>
              </React.Fragment>
            ))}
          </nav>

          {children}
        </main>
      </div>
    </div>
  );
}
