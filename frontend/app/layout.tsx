import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-store";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ERP Enterprise | Platform Manajemen Terintegrasi",
  description: "Enterprise Resource Planning Modern untuk Inventori, Pembelian, Penjualan, Keuangan & SDM.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="dark h-full">
      <body className={`${inter.className} h-full bg-slate-950 text-slate-100 dark:bg-slate-950 dark:text-slate-50 antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
