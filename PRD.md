# PRD — Sistem ERP Enterprise

## 1. Ringkasan Produk

Sistem ERP (Enterprise Resource Planning) berbasis web untuk mengelola operasional perusahaan skala enterprise secara terpusat, mencakup modul Inventori, Penjualan, Pembelian, Keuangan, dan Karyawan (HR). Sistem dibangun dengan arsitektur modular menggunakan satu database PostgreSQL terpusat (dengan schema separation per modul) agar setiap domain bisnis terisolasi dengan rapi, mudah dikembangkan, sekaligus menjamin konsistensi data finansial secara ACID.

**Target pengguna saat ini**: 1 perusahaan (single company), belum multi-cabang/multi-tenant.

## 2. Tujuan

- Menyatukan data operasional lintas departemen dalam satu sistem, menghilangkan silo data (Excel terpisah per divisi).
- Menyediakan kontrol akses granular per modul sesuai peran (role) karyawan.
- Menghasilkan laporan real-time lintas modul untuk pengambilan keputusan.
- Membangun fondasi arsitektur yang siap discale (microservices) meski saat ini single company.

## 3. Target Pengguna & Role

| Role | Deskripsi | Contoh Akses |
|---|---|---|
| Super Admin | Kontrol penuh seluruh sistem & konfigurasi role | Semua modul, manajemen user & permission |
| Admin Modul | Admin di satu modul spesifik (mis. Admin Keuangan) | Full akses ke 1 modul, read-only ke modul terkait |
| Staff Operasional | Input data harian (mis. staff gudang, staff sales) | Create/update data sesuai tugas, tanpa akses approval |
| Approver/Manager | Menyetujui transaksi (PO, cuti, pengeluaran) | Read + approve/reject di modul terkait |
| Karyawan Umum | Akses terbatas ke data pribadi | Self-service: absensi, slip gaji, pengajuan cuti |

Role & permission diatur granular per modul (RBAC — Role-Based Access Control), bukan hanya level global admin/staff.

## 4. Lingkup Modul (Semua Diprioritaskan Bersama)

### 4.1 Modul Auth & User Management
- Login, logout, refresh token (JWT)
- Manajemen user, role, dan permission matrix per modul
- Audit log aktivitas user (siapa mengubah apa, kapan)

### 4.2 Modul Inventori
- Master data barang/produk (SKU, kategori, satuan)
- Stok masuk/keluar, mutasi antar gudang
- Stock opname & alert stok minimum

### 4.3 Modul Penjualan (Sales/CRM)
- Data pelanggan
- Sales order, invoice
- Tracking status order (draft → confirmed → shipped → paid)

### 4.4 Modul Pembelian (Purchasing)
- Data supplier
- Purchase request → Purchase order → penerimaan barang
- Alur approval PO berdasarkan nominal/role

### 4.5 Modul Keuangan
- Chart of accounts, jurnal umum
- Invoice masuk/keluar, pembayaran
- Laporan keuangan dasar (neraca, laba rugi, cashflow)
- Terhubung ke transaksi dari modul Penjualan, Pembelian, dan payroll HR

### 4.6 Modul Karyawan (HR)
- Data karyawan (profil, kontrak, jabatan)
- Absensi & pengajuan cuti (dengan alur approval)
- Payroll/penggajian dasar (gaji pokok, tunjangan, potongan)
- Struktur organisasi

### 4.7 Modul Laporan & Analitik
- Dashboard ringkasan lintas modul
- Laporan per modul (stok, penjualan, pembelian, keuangan, HR)
- Export laporan (PDF/Excel)

## 5. Alur Data Utama

Semua modul operasional (Inventori, Penjualan, Pembelian, HR) mengirim data transaksi ke Modul Keuangan sebagai sumber kebenaran finansial, dan ke Modul Laporan untuk agregasi lintas modul. Komunikasi antar service menggunakan event/message broker (async) untuk data yang tidak butuh respons real-time (mis. update stok setelah sales order dikonfirmasi), dan REST API sinkron untuk operasi yang butuh respons langsung (mis. validasi stok saat checkout).

## 6. Kebutuhan Non-Fungsional

- **Skalabilitas**: Setiap modul dapat diskalakan sesuai beban (mis. modul Penjualan lebih sering diakses saat peak season).
- **Keamanan**: JWT dengan expiry pendek + refresh token, password hashing (bcrypt/argon2), rate limiting di API gateway, audit log wajib untuk aksi sensitif (approval, perubahan data keuangan).
- **Ketersediaan**: Target uptime 99.5%, setiap service punya health check endpoint.
- **Konsistensi data**: Menggunakan transaksi ACID database PostgreSQL pada operasi kritikal dan pemisahan skema (schema isolation) antar modul untuk menjaga integritas data.
- **Auditability**: Setiap perubahan data kritikal (transaksi keuangan, payroll, perubahan role) tercatat dengan siapa, kapan, dan nilai sebelum/sesudah.
- **Observability**: Logging terstruktur, metrics per service, tracing request.

## 7. Di Luar Lingkup (Saat Ini)

- Multi-cabang / multi-tenant
- Integrasi pihak ketiga (payment gateway, e-invoicing, e-faktur pajak)
- Mobile app native (fokus web responsive dulu)
- Modul manufaktur/produksi

## 8. Tech Stack

- **Backend**: Golang (Gin) — modular architecture / service per modul
- **Database**: PostgreSQL (Single Database `erp_db` dengan pemisahan schema per modul: `auth`, `inventory`, `sales`, `purchasing`, `finance`, `hr`, `audit`)
- **Frontend**: Next.js (React) + Tailwind CSS
- **Auth**: JWT + refresh token, dikelola oleh Auth Service / Auth Module
- **Komunikasi antar modul/service**: REST / direct internal call + event broker jika diperlukan
- **Infrastruktur**: Docker + Docker Compose (dev/prod)

## 9. Fase Pengembangan (Disarankan)

1. **Fase 1 — Fondasi**: Auth Service, API Gateway, struktur database per modul, CI/CD dasar
2. **Fase 2 — Modul Inti**: Inventori, Penjualan, Pembelian (alur transaksi utama)
3. **Fase 3 — Keuangan & HR**: Integrasi data transaksi ke Keuangan, modul HR & payroll
4. **Fase 4 — Laporan & Penyempurnaan**: Dashboard lintas modul, audit log, optimasi performa

## 10. Metrik Keberhasilan

- Waktu proses transaksi (PO, sales order) berkurang dibanding proses manual/Excel
- Data lintas modul konsisten (tidak ada selisih stok/keuangan akibat pencatatan ganda)
- Semua aksi sensitif tercatat di audit log (100% coverage)
