"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setErrorMsg(err.message || "Email atau kata sandi tidak sesuai. Silakan periksa kembali.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col lg:flex-row relative overflow-hidden font-sans select-none">

      {/* BACKGROUND IMAGE PANEL (Extends full screen with subtle gradient overlay) */}
      <div className="absolute inset-0 w-full h-full lg:left-[35%] lg:w-[65%] z-0">
        <Image
          src="/assets/erp_network_login_bg.jpg"
          alt="Enterprise Digital Hub"
          fill
          priority
          className="object-cover object-center scale-105"
        />
        {/* Deep tech gradients over image */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950/20 lg:bg-gradient-to-r lg:from-slate-950 lg:via-transparent lg:to-slate-950/20 pointer-events-none" />
      </div>

      {/* LEFT SECTION WITH DYNAMIC SLANTED / DIAGONAL EDGE ("Nyerong") */}
      <div className="relative z-10 w-full lg:w-[48%] min-h-screen flex items-center justify-center lg:justify-end px-4 sm:px-8 py-10 lg:py-0">

        {/* Slanted White Canvas Backdrop (Desktop Diagonal Cut) */}
        <div
          className="hidden lg:block absolute inset-y-0 left-0 right-0 bg-white dark:bg-slate-900 shadow-2xl z-0"
          style={{
            clipPath: "polygon(0 0, 100% 0, 84% 100%, 0 100%)",
          }}
        >
          {/* Subtle sleek accent line along the diagonal */}
          <div
            className="absolute inset-y-0 right-0 w-1 bg-gradient-to-b from-cyan-400 via-indigo-600 to-blue-500 opacity-60"
            style={{
              clipPath: "polygon(calc(100% - 4px) 0, 100% 0, calc(100% - 4px) 100%, 100% 100%)",
            }}
          />
        </div>

        {/* Mobile Background Fallback */}
        <div className="lg:hidden absolute inset-0 bg-slate-950/75 backdrop-blur-md z-0" />

        {/* FLOATING LOGIN CARD CONTAINER */}
        <div className="relative z-10 w-full max-w-sm lg:max-w-md lg:mr-12 xl:mr-16 bg-white dark:bg-slate-900 rounded-[28px] lg:rounded-none lg:bg-transparent lg:shadow-none shadow-2xl p-7 sm:p-10 lg:p-4">

          {/* Top Emblem Logo & Header */}
          <div className="text-center space-y-3 mb-7">
            <div className="inline-flex h-16 w-16 rounded-full bg-gradient-to-tr from-indigo-600 via-blue-600 to-amber-500 p-0.5 shadow-lg shadow-indigo-500/20 ring-4 ring-slate-100 dark:ring-slate-800">
              <div className="w-full h-full bg-white dark:bg-slate-900 rounded-full flex items-center justify-center">
                <div className="flex items-center justify-center font-extrabold text-2xl tracking-tighter">
                  <span className="text-blue-600">S</span>
                  <span className="text-amber-500">i</span>
                  <span className="text-indigo-600">E</span>
                </div>
              </div>
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                ERP Enterprise System
              </h1>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-400 mt-1">
                User Login
              </p>
            </div>
          </div>

          {/* Error Message Alert */}
          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* User Email Field */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Mail className="h-4 w-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="User Email"
                className="w-full h-11 pl-11 pr-4 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition-all shadow-sm"
              />
            </div>

            {/* Password Field */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full h-11 pl-11 pr-11 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition-all shadow-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                title={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Forgot Password Link */}
            <div className="text-left px-1">
              <button
                type="button"
                onClick={() => alert("Silakan hubungi Administrator IT / HR untuk bantuan pemulihan kata sandi.")}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline transition-colors"
              >
                Forgot Password?
              </button>
            </div>

            {/* Primary Navy Blue Pill Login Button */}
            <Button
              type="submit"
              isLoading={isLoading}
              className="w-full h-11 rounded-full bg-[#0a2c5a] hover:bg-[#071f40] dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-semibold text-sm shadow-md shadow-[#0a2c5a]/30 transition-all duration-200 mt-2"
            >
              Login
            </Button>
          </form>

          {/* Card Bottom Attribution */}
          <div className="text-center pt-8 text-[11px] text-slate-400 dark:text-slate-500">
            Powered By: <span className="font-semibold text-slate-600 dark:text-slate-400">TOLEPATIDOLKEN</span>
          </div>
        </div>

      </div>

      {/* FLOATING ACTIVE STATUS BADGE ON ARTWORK (DESKTOP) */}
      <div className="hidden lg:flex absolute top-6 right-8 z-20 items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-cyan-500/30 text-cyan-300 text-xs font-mono shadow-xl">
        <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
        <span>ENTERPRISE HUB ACTIVE</span>
      </div>

    </div>
  );
}
