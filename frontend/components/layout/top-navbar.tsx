"use client";

import React, { useState } from "react";
import {
  Menu,
  Sun,
  Moon,
  Search,
  Command,
} from "lucide-react";

interface TopNavbarProps {
  onOpenMobileMenu: () => void;
}

export function TopNavbar({ onOpenMobileMenu }: TopNavbarProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleDarkMode = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove("dark");
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add("dark");
      setIsDarkMode(true);
    }
  };

  return (
    <header className="h-14 border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between transition-all">
      {/* Left: Mobile Toggle & Global Search Bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Global Quick Search Input */}
        <div className="relative hidden sm:block w-72 md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari transaksi, menu, SKU, atau vendor..."
            className="w-full h-8 pl-9 pr-8 rounded-lg bg-slate-100/80 dark:bg-slate-800/80 border border-transparent focus:border-indigo-500/50 focus:bg-white dark:focus:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 outline-none transition-all placeholder:text-slate-400"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-[10px] font-medium text-slate-400 bg-slate-200/60 dark:bg-slate-700/60 px-1.5 py-0.2 rounded">
            <Command className="h-2.5 w-2.5" /> K
          </div>
        </div>
      </div>

      {/* Right: Dark Mode Toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleDarkMode}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 transition-colors"
          title="Toggle Dark / Light Mode"
        >
          {isDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
}
