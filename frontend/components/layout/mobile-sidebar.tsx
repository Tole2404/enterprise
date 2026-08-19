"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  X,
  Building2,
  LayoutDashboard,
  Boxes,
  ArrowLeftRight,
  Truck,
  FileCheck,
  ShoppingBag,
  PackageCheck,
  Users,
  ShieldCheck,
  Briefcase,
  Receipt,
  Landmark,
  BookOpen,
  PieChart,
  UserCheck,
  Calendar,
  DollarSign,
  LogOut,
  ChevronDown,
  Tag,
  Scale,
  Warehouse,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-store";

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  permission?: string;
}

interface NavGroup {
  title: string;
  icon: React.ElementType;
  items: NavItem[];
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const pathname = usePathname();
  const { hasPermission, user, roles, logout } = useAuth();

  const navGroups: NavGroup[] = [
    {
      title: "Inventori & Gudang",
      icon: Boxes,
      items: [
        {
          title: "Katalog Produk",
          href: "/inventory",
          icon: Boxes,
          permission: "inventory:products:read",
        },
        {
          title: "Mutasi & Opname",
          href: "/inventory/mutations",
          icon: ArrowLeftRight,
          permission: "inventory:products:read",
        },
        {
          title: "Kategori Produk",
          href: "/inventory/categories",
          icon: Tag,
          permission: "inventory:products:read",
        },
        {
          title: "Satuan Unit (UoM)",
          href: "/inventory/units",
          icon: Scale,
          permission: "inventory:products:read",
        },
        {
          title: "Master Gudang",
          href: "/inventory/warehouses",
          icon: Warehouse,
          permission: "inventory:products:read",
        },
      ],
    },
    {
      title: "Pembelian / Purchasing",
      icon: ShoppingBag,
      items: [
        { title: "Vendor / Supplier", href: "/purchasing/suppliers", icon: Truck, permission: "purchasing:suppliers:manage" },
        { title: "Purchase Request (PR)", href: "/purchasing/requests", icon: FileCheck, permission: "purchasing:pr:create" },
        { title: "Purchase Order (PO)", href: "/purchasing/orders", icon: ShoppingBag, permission: "purchasing:po:create" },
        { title: "Penerimaan Barang (GRN)", href: "/purchasing/receipts", icon: PackageCheck, permission: "purchasing:grn:create" },
      ],
    },
    {
      title: "Penjualan / Sales & CRM",
      icon: Briefcase,
      items: [
        { title: "Master Pelanggan", href: "/sales/customers", icon: Users, permission: "sales:customers:manage" },
        { title: "Pesanan Penjualan (SO)", href: "/sales/orders", icon: Briefcase, permission: "sales:orders:read" },
        { title: "Surat Jalan (DO)", href: "/sales/deliveries", icon: Truck, permission: "sales:deliveries:manage" },
        { title: "Faktur & Piutang", href: "/sales/invoices", icon: Receipt, permission: "sales:invoices:read" },
      ],
    },
    {
      title: "Keuangan & Akuntansi",
      icon: Landmark,
      items: [
        { title: "Bagan Akun (COA)", href: "/finance/accounts", icon: Landmark, permission: "finance:accounts:read" },
        { title: "Buku Jurnal Umum", href: "/finance/journals", icon: BookOpen, permission: "finance:journals:read" },
        { title: "Laporan Keuangan", href: "/finance/reports", icon: PieChart, permission: "finance:reports:read" },
      ],
    },
    {
      title: "SDM & Karyawan (HR)",
      icon: UserCheck,
      items: [
        { title: "Data Karyawan", href: "/hr/employees", icon: UserCheck, permission: "hr:employees:read" },
        { title: "Pengajuan Cuti", href: "/hr/leaves", icon: Calendar, permission: "hr:leaves:read" },
        { title: "Penggajian (Payroll)", href: "/hr/payroll", icon: DollarSign, permission: "hr:payroll:read" },
      ],
    },
    {
      title: "Keamanan & Pengguna",
      icon: ShieldCheck,
      items: [
        { title: "Manajemen User", href: "/auth-management/users", icon: Users, permission: "auth:users:read" },
        { title: "Role & Matrix Izin", href: "/auth-management/roles", icon: ShieldCheck, permission: "auth:roles:manage" },
      ],
    },
  ];

  const isItemActive = (href: string) => {
    if (pathname === href) return true;
    if (href !== "/dashboard" && href !== "/inventory" && pathname.startsWith(href + "/")) {
      return true;
    }
    return false;
  };

  const findMatchingGroup = (path: string) => {
    for (const group of navGroups) {
      if (group.items.some((item) => isItemActive(item.href))) {
        return group.title;
      }
    }
    return null;
  };

  const [activeGroup, setActiveGroup] = useState<string | null>(() => findMatchingGroup(pathname));

  useEffect(() => {
    const matched = findMatchingGroup(pathname);
    if (matched) setActiveGroup(matched);
  }, [pathname]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-slate-900 p-4 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-200">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">
                <Building2 className="h-4 w-4" />
              </div>
              <span className="font-bold text-sm text-slate-900 dark:text-slate-100">ERP ENTERPRISE</span>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-3 space-y-1">
            {/* Dashboard Link */}
            <Link
              href="/dashboard"
              onClick={onClose}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                pathname === "/dashboard"
                  ? "text-indigo-600 dark:text-indigo-400 font-bold bg-slate-100 dark:bg-slate-800"
                  : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
              )}
            >
              <LayoutDashboard className="h-4 w-4 text-indigo-600" />
              <span>Dashboard</span>
            </Link>

            {/* Accordion Groups */}
            {navGroups.map((group) => {
              const visibleItems = group.items.filter(
                (item) => !item.permission || hasPermission(item.permission)
              );

              if (visibleItems.length === 0) return null;
              const isOpen = activeGroup === group.title;
              const GroupIcon = group.icon;

              return (
                <div key={group.title} className="rounded-lg overflow-hidden">
                  <button
                    onClick={() => setActiveGroup((prev) => (prev === group.title ? null : group.title))}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                      isOpen
                        ? "bg-slate-100 dark:bg-slate-800 text-indigo-600 font-semibold"
                        : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <GroupIcon className="h-4 w-4 text-slate-400" />
                      <span>{group.title}</span>
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 transition-transform",
                        isOpen ? "rotate-180 text-indigo-600" : "rotate-0"
                      )}
                    />
                  </button>

                  {isOpen && (
                    <div className="pl-3 pr-1 py-1 space-y-0.5 animate-in slide-in-from-top-1 duration-150">
                      {visibleItems.map((item) => {
                        const ItemIcon = item.icon;
                        const isActive = isItemActive(item.href);

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={onClose}
                            className={cn(
                              "flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs transition-colors",
                              isActive
                                ? "text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50/60 dark:bg-indigo-950/40 border-l-2 border-indigo-600 dark:border-indigo-400"
                                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                            )}
                          >
                            <ItemIcon className="h-3.5 w-3.5" />
                            <span>{item.title}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* User Card & Logout in Mobile */}
        <div className="pt-3 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{user?.full_name || "Super Admin"}</p>
            <p className="text-[10px] text-slate-400">{roles[0] || "SUPER_ADMIN"}</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-semibold"
          >
            <LogOut className="h-4 w-4" />
            <span>Keluar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
