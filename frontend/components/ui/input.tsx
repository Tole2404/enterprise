import React, { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  prefixText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, prefixText, ...props }, ref) => {
    if (prefixText) {
      return (
        <div className="relative flex items-center w-full">
          <div className="absolute left-3 text-xs font-bold text-slate-400 dark:text-slate-500 pointer-events-none select-none">
            {prefixText}
          </div>
          <input
            type={type}
            className={cn(
              "flex h-10 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 py-2 text-sm text-slate-900 ring-offset-background placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:ring-offset-slate-950 dark:placeholder:text-slate-500 dark:focus-visible:ring-indigo-400 transition-all",
              className
            )}
            ref={ref}
            {...props}
          />
        </div>
      );
    }

    if (icon) {
      return (
        <div className="relative flex items-center w-full">
          <div className="absolute left-3 text-slate-400 pointer-events-none flex items-center justify-center">
            {icon}
          </div>
          <input
            type={type}
            className={cn(
              "flex h-10 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 py-2 text-sm text-slate-900 ring-offset-background placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:ring-offset-slate-950 dark:placeholder:text-slate-500 dark:focus-visible:ring-indigo-400 transition-all",
              className
            )}
            ref={ref}
            {...props}
          />
        </div>
      );
    }

    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 ring-offset-background placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:ring-offset-slate-950 dark:placeholder:text-slate-500 dark:focus-visible:ring-indigo-400 transition-all",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
