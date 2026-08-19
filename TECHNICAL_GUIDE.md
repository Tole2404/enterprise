# ERP ENTERPRISE - PANDUAN LENGKAP ARSITEKTUR & SISTEM

## 1. Ikhtisar Sistem
ERP Enterprise dirancang dengan arsitektur **Clean Architecture (Domain-Driven Design)**, backend bertenaga **Golang (Gin Gonic + GORM)**, database relasional terisolasi **PostgreSQL (Multi-Schema)**, serta antarmuka modern **Next.js 14 App Router + Tailwind CSS**.

---

## 2. Struktur Modul & Skema Database

### 2.1 Modul Auth & User Management (`auth`)
* **Tabel**: `auth.users`, `auth.roles`, `auth.permissions`, `auth.user_roles`, `auth.role_permissions`, `auth.refresh_tokens`
* **Fitur**: JWT Access & Refresh Token rotation, enkripsi bcrypt, middleware RBAC granular (`RequirePermission`).
* **Halaman Frontend**:
  - `/login`: Form login & 1-Click Demo Login Super Admin
  - `/auth-management/users`: Manajemen data user & penugasan role
  - `/auth-management/roles`: Matriks visual hak akses role

### 2.2 Modul Inventori & Gudang (`inventory`)
* **Tabel**: `inventory.categories`, `inventory.units`, `inventory.products`, `inventory.warehouses`, `inventory.warehouse_stocks`, `inventory.stock_mutations`
* **Fitur**: Multi-gudang, mutasi atomik ACID (`IN`, `OUT`, `TRANSFER`, `ADJUSTMENT`/Opname), deteksi stok minimum otomatis.
* **Halaman Frontend**:
  - `/inventory`: Master produk, filter kategori, popup rincian stok per gudang
  - `/inventory/mutations`: Form transfer/mutasi & feed histori pergerakan barang

### 2.3 Modul Pembelian / Purchasing (`purchasing`)
* **Tabel**: `purchasing.suppliers`, `purchasing.purchase_requests`, `purchasing.purchase_request_items`, `purchasing.purchase_orders`, `purchasing.purchase_order_items`, `purchasing.goods_receipts`, `purchasing.goods_receipt_items`
* **Fitur**: Pengajuan PR, Alur Approval PO berjenjang, Penerimaan Fisik Barang (GRN) yang **otomatis menambah stok fisik di gudang secara ACID**.
* **Halaman Frontend**:
  - `/purchasing/suppliers`: Master vendor & termin pembayaran (TOP)
  - `/purchasing/requests`: Form pengajuan PR & approval manager
  - `/purchasing/orders`: Pembuatan PO, kalkulasi PPN 11%, dan status approval
  - `/purchasing/receipts`: Pencatatan penerimaan fisik (GRN)

### 2.4 Modul Penjualan / Sales & CRM (`sales`)
* **Tabel**: `sales.customers`, `sales.sales_orders`, `sales.sales_order_items`, `sales.delivery_orders`, `sales.sales_invoices`
* **Fitur**: Master customer, Sales Order (SO), Surat Jalan (Delivery Order) yang **otomatis memotong stok gudang & menerbitkan faktur tagihan**, serta pencatatan penerimaan kas.
* **Halaman Frontend**:
  - `/sales/customers`: Master data pelanggan B2B & retail
  - `/sales/orders`: Form SO, kalkulasi PPN & grand total otomatis
  - `/sales/deliveries`: Penerbitan Surat Jalan & pengiriman barang
  - `/sales/invoices`: Tagihan piutang pelanggan & pelunasan kas

### 2.5 Modul Keuangan & Akuntansi (`finance`)
* **Tabel**: `finance.accounts`, `finance.journal_entries`, `finance.journal_lines`
* **Fitur**: Bagan Akun Standar (COA), Jurnal Umum berpasangan ganda (*Double-Entry Bookkeeping*) dengan validasi $\sum \text{Debit} = \sum \text{Credit}$, Neraca Saldo (Trial Balance), dan Laba Rugi real-time.
* **Halaman Frontend**:
  - `/finance/accounts`: Master COA (Aset, Kewajiban, Modal, Pendapatan, Beban)
  - `/finance/journals`: Form penjurnalan manual berimbang & audit log transaksi
  - `/finance/reports`: Laporan Neraca Saldo, Laba Bersih, & posisi kas

### 2.6 Modul SDM & Penggajian / HR & Payroll (`hr`)
* **Tabel**: `hr.departments`, `hr.positions`, `hr.employees`, `hr.leave_requests`, `hr.payroll`
* **Fitur**: Biodata karyawan terintegrasi, pengajuan & persetujuan cuti, serta kalkulasi otomatis payroll bulanan (Tunjangan 10%, Potongan Pajak/BPJS 5%, Take Home Pay).
* **Halaman Frontend**:
  - `/hr/employees`: Direktori biodata pegawai & struktur gaji
  - `/hr/leaves`: Permohonan cuti tahunan/sakit & tombol approve atasan
  - `/hr/payroll`: Generator payroll otomatis & cetak slip gaji resmi

---

## 3. Akun Demo & Kredensial Pengujian

| Role Akun | Email Login | Password Default | Hak Akses |
|---|---|---|---|
| **Super Admin** | `admin@erp.local` | `admin123` | Akses Penuh (Full Control ke Seluruh 7 Modul) |
