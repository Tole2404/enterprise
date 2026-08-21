"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Boxes,
  ArrowLeftRight,
  Truck,
  FileCheck,
  ShoppingBag,
  PackageCheck,
  Users,
  ShieldCheck,
  ChevronDown,
  Building2,
  Briefcase,
  Receipt,
  Landmark,
  BookOpen,
  PieChart,
  UserCheck,
  Calendar,
  DollarSign,
  LogOut,
  Tag,
  Scale,
  Warehouse,
  Bot,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-store";

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

export function Sidebar() {
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
        {
          title: "Vendor / Supplier",
          href: "/purchasing/suppliers",
          icon: Truck,
          permission: "purchasing:suppliers:manage",
        },
        {
          title: "Purchase Request (PR)",
          href: "/purchasing/requests",
          icon: FileCheck,
          permission: "purchasing:pr:create",
        },
        {
          title: "Purchase Order (PO)",
          href: "/purchasing/orders",
          icon: ShoppingBag,
          permission: "purchasing:po:create",
        },
        {
          title: "Penerimaan Barang (GRN)",
          href: "/purchasing/receipts",
          icon: PackageCheck,
          permission: "purchasing:grn:create",
        },
      ],
    },
    {
      title: "Penjualan / Sales & CRM",
      icon: Briefcase,
      items: [
        {
          title: "Master Pelanggan",
          href: "/sales/customers",
          icon: Users,
          permission: "sales:customers:manage",
        },
        {
          title: "Pesanan Penjualan (SO)",
          href: "/sales/orders",
          icon: Briefcase,
          permission: "sales:orders:read",
        },
        {
          title: "Surat Jalan (DO)",
          href: "/sales/deliveries",
          icon: Truck,
          permission: "sales:deliveries:manage",
        },
        {
          title: "Faktur & Piutang",
          href: "/sales/invoices",
          icon: Receipt,
          permission: "sales:invoices:read",
        },
      ],
    },
    {
      title: "Keuangan & Akuntansi",
      icon: Landmark,
      items: [
        {
          title: "Bagan Akun (COA)",
          href: "/finance/accounts",
          icon: Landmark,
          permission: "finance:accounts:read",
        },
        {
          title: "Buku Jurnal Umum",
          href: "/finance/journals",
          icon: BookOpen,
          permission: "finance:journals:read",
        },
        {
          title: "Laporan Keuangan",
          href: "/finance/reports",
          icon: PieChart,
          permission: "finance:reports:read",
        },
      ],
    },
    {
      title: "SDM & Karyawan (HR)",
      icon: UserCheck,
      items: [
        {
          title: "Data Karyawan",
          href: "/hr/employees",
          icon: UserCheck,
          permission: "hr:employees:read",
        },
        {
          title: "Pengajuan Cuti",
          href: "/hr/leaves",
          icon: Calendar,
          permission: "hr:leaves:read",
        },
        {
          title: "Penggajian (Payroll)",
          href: "/hr/payroll",
          icon: DollarSign,
          permission: "hr:payroll:read",
        },
      ],
    },
    {
      title: "Keamanan & Pengguna",
      icon: ShieldCheck,
      items: [
        {
          title: "Manajemen User",
          href: "/auth-management/users",
          icon: Users,
          permission: "auth:users:read",
        },
        {
          title: "Role & Matrix Izin",
          href: "/auth-management/roles",
          icon: ShieldCheck,
          permission: "auth:roles:manage",
        },
      ],
    },
  ];

  // Helper: check exact matching to prevent prefix collision between /inventory and /inventory/mutations
  const isItemActive = (href: string) => {
    if (pathname === href) return true;
    if (href !== "/dashboard" && href !== "/inventory" && pathname.startsWith(href + "/")) {
      return true;
    }
    return false;
  };

  // Detect which group matches current path
  const findMatchingGroup = (path: string) => {
    for (const group of navGroups) {
      if (group.items.some((item) => isItemActive(item.href))) {
        return group.title;
      }
    }
    return null;
  };

  // Exclusive Accordion state: Only 1 group can be open at a time!
  const [activeGroup, setActiveGroup] = useState<string | null>(() => findMatchingGroup(pathname));

  useEffect(() => {
    const matched = findMatchingGroup(pathname);
    if (matched) {
      setActiveGroup(matched);
    }
  }, [pathname]);

  const handleGroupToggle = (title: string) => {
    setActiveGroup((prev) => (prev === title ? null : title));
  };

  const isDashboardActive = pathname === "/dashboard";

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-slate-200/80 bg-white dark:bg-slate-900 dark:border-slate-800 h-screen sticky top-0 z-30 select-none">
      {/* Brand Header */}
      <div className="h-14 flex items-center px-5 border-b border-slate-200/80 dark:border-slate-800 justify-between shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Building2 className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100 flex items-center">
              ERP ENTERPRISE
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block -mt-1">
              Multi-Module Single DB
            </span>
          </div>
        </Link>
      </div>

      {/* Accordion Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {/* Single Item: Dashboard */}
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150",
            isDashboardActive
              ? "text-indigo-600 dark:text-indigo-400 font-bold bg-slate-100/80 dark:bg-slate-800/80"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/50"
          )}
        >
          <LayoutDashboard className={cn("h-4 w-4", isDashboardActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400")} />
          <span>Dashboard</span>
        </Link>

        {/* Single Item: AI Agentic Center */}
        <Link
          href="/ai-agentic"
          className={cn(
            "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150",
            pathname === "/ai-agentic"
              ? "text-purple-600 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/50"
              : "text-slate-600 hover:text-purple-600 hover:bg-purple-50/50 dark:text-slate-400 dark:hover:text-purple-300 dark:hover:bg-purple-950/20"
          )}
        >
          <Bot className={cn("h-4 w-4", pathname === "/ai-agentic" ? "text-purple-600 dark:text-purple-400" : "text-purple-500")} />
          <span className="flex-1">AI Agentic Hub</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-semibold">
            Auto
          </span>
        </Link>

        {/* Accordion Categories */}
        {navGroups.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !item.permission || hasPermission(item.permission)
          );

          if (visibleItems.length === 0) return null;

          const isOpen = activeGroup === group.title;
          const GroupIcon = group.icon;
          const hasActiveChild = group.items.some((item) => isItemActive(item.href));

          return (
            <div key={group.title} className="rounded-lg overflow-hidden">
              {/* Accordion Group Header */}
              <button
                onClick={() => handleGroupToggle(group.title)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150",
                  isOpen
                    ? "bg-slate-100/90 dark:bg-slate-800/90 text-indigo-700 dark:text-indigo-300 font-semibold"
                    : hasActiveChild
                    ? "text-indigo-600 dark:text-indigo-400 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/40"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <GroupIcon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      isOpen || hasActiveChild
                        ? "text-indigo-600 dark:text-indigo-400"
                        : "text-slate-400"
                    )}
                  />
                  <span>{group.title}</span>
                </div>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 text-slate-400 transition-transform duration-200",
                    isOpen ? "rotate-180 text-indigo-600 dark:text-indigo-400" : "rotate-0"
                  )}
                />
              </button>

              {/* Accordion Collapsible Submenu */}
              {isOpen && (
                <div className="pl-3 pr-1 py-1 space-y-0.5 animate-in slide-in-from-top-1 duration-150">
                  {visibleItems.map((item) => {
                    const ItemIcon = item.icon;
                    const isActive = isItemActive(item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs transition-all duration-150",
                          isActive
                            ? "text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50/60 dark:bg-indigo-950/40 border-l-2 border-indigo-600 dark:border-indigo-400"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/60 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/40"
                        )}
                      >
                        <ItemIcon
                          className={cn(
                            "h-3.5 w-3.5 shrink-0",
                            isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"
                          )}
                        />
                        <span className="truncate">{item.title}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* User Profile Footer with Logout */}
      <div className="p-2.5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 shrink-0">
        <div className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
              {user?.full_name ? user.full_name.substring(0, 2).toUpperCase() : "AD"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                {user?.full_name || "Super Admin"}
              </p>
              <p className="text-[9px] font-medium text-slate-400 truncate">
                {roles[0] || "SUPER_ADMIN"}
              </p>
            </div>
          </div>

          <button
            onClick={logout}
            title="Keluar dari Sistem (Logout)"
            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
