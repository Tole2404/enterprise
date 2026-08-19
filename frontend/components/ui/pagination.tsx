"use client";

import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export function DataTablePagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-xs text-slate-500">
      {/* Left: Info item count */}
      <div className="flex items-center gap-2">
        <span>
          Menampilkan <strong className="text-slate-900 dark:text-slate-100 font-semibold">{startItem}</strong> -{" "}
          <strong className="text-slate-900 dark:text-slate-100 font-semibold">{endItem}</strong> dari{" "}
          <strong className="text-slate-900 dark:text-slate-100 font-semibold">{totalItems}</strong> data
        </span>

        {onPageSizeChange && (
          <div className="hidden sm:flex items-center gap-1.5 ml-4">
            <span>Baris per halaman:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="h-7 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 outline-none"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        )}
      </div>

      {/* Right: Pagination buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          className="h-7 w-7 p-0"
          title="Halaman Pertama"
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="h-7 w-7 p-0"
          title="Halaman Sebelumnya"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>

        <span className="px-2.5 font-medium text-slate-700 dark:text-slate-300">
          Hal. {currentPage} / {totalPages}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="h-7 w-7 p-0"
          title="Halaman Berikutnya"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          className="h-7 w-7 p-0"
          title="Halaman Terakhir"
        >
          <ChevronsRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
