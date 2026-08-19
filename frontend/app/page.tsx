"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-store";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
        <p className="text-sm font-medium text-slate-500">Memuat Sistem ERP Enterprise...</p>
      </div>
    </div>
  );
}
