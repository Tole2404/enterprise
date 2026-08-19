"use client";

import React from "react";
import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="min-h-[60vh] w-full flex flex-col items-center justify-center gap-3 animate-in fade-in duration-200">
      <div className="relative flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
        <Loader2 className="h-4 w-4 text-indigo-600 absolute animate-pulse" />
      </div>
      <div className="text-center">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          Memuat Modul ERP...
        </p>
        <p className="text-[11px] text-slate-400">
          Mengambil data real-time dari database
        </p>
      </div>
    </div>
  );
}
