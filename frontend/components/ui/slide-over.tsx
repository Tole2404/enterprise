"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: "sm" | "md" | "lg" | "xl" | "2xl";
}

export function SlideOver({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  width = "lg",
}: SlideOverProps) {
  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const widthClasses = {
    sm: "sm:max-w-md",
    md: "sm:max-w-lg lg:max-w-xl",
    lg: "sm:max-w-xl lg:max-w-2xl",
    xl: "sm:max-w-2xl lg:max-w-3xl",
    "2xl": "sm:max-w-3xl lg:max-w-4xl",
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* Dimmed backdrop with smooth fade */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
      />

      {/* Slide-over panel container */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-6 pointer-events-none">
        <div
          className={cn(
            "w-screen bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col pointer-events-auto animate-in slide-in-from-right duration-250 ease-out",
            widthClasses[width]
          )}
        >
          {/* Header */}
          <div className="px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between shrink-0 bg-slate-50/60 dark:bg-slate-950/50">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {title}
              </h2>
              {description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors -mr-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Scrollable Form Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
            {children}
          </div>

          {/* Footer Actions */}
          {footer && (
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 shrink-0 flex items-center justify-end gap-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
