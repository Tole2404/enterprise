import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "success" | "warning" | "destructive" | "outline" | "indigo" | "purple";
}

export function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  const textColors = {
    default: "text-slate-900 dark:text-slate-100",
    secondary: "text-slate-500 dark:text-slate-400",
    success: "text-emerald-600 dark:text-emerald-400 font-semibold",
    warning: "text-amber-600 dark:text-amber-400 font-semibold",
    destructive: "text-rose-600 dark:text-rose-400 font-semibold",
    indigo: "text-indigo-600 dark:text-indigo-400 font-semibold",
    purple: "text-purple-600 dark:text-purple-400 font-semibold",
    outline: "text-slate-700 dark:text-slate-300 font-medium",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center text-xs tracking-normal bg-transparent",
        textColors[variant],
        className
      )}
      {...props}
    >
      <span>{children}</span>
    </div>
  );
}
