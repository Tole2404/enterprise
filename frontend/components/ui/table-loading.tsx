"use client";

import React from "react";
import { Loader2 } from "lucide-react";

interface TableLoadingProps {
  colSpan: number;
  message?: string;
}

export function TableLoading({ colSpan, message = "Memuat data dari database..." }: TableLoadingProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-12 text-center bg-slate-50/30 dark:bg-slate-900/30">
        <div className="flex flex-col items-center justify-center gap-2.5 animate-in fade-in duration-200">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600 dark:text-indigo-400" />
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{message}</p>
        </div>
      </td>
    </tr>
  );
}
