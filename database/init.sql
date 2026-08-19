-- ==============================================================================
-- ERP ENTERPRISE INITIALIZATION SCRIPT (DOCKER ENTRYPOINT)
-- ==============================================================================

-- 1. EXTENSIONS & SCHEMAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS inventory;
CREATE SCHEMA IF NOT EXISTS purchasing;
CREATE SCHEMA IF NOT EXISTS sales;
CREATE SCHEMA IF NOT EXISTS finance;
CREATE SCHEMA IF NOT EXISTS hr;
CREATE SCHEMA IF NOT EXISTS audit;

-- 2. AUTH SCHEMA TABLES
CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS auth.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS auth.permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) UNIQUE NOT NULL,
    module VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS auth.role_permissions (
    role_id UUID NOT NULL REFERENCES auth.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES auth.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS auth.user_roles (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES auth.roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS auth.refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON auth.users(email);
CREATE INDEX IF NOT EXISTS idx_permissions_module ON auth.permissions(module);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON auth.refresh_tokens(user_id);

-- 3. INVENTORY SCHEMA TABLES
CREATE TABLE IF NOT EXISTS inventory.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory.units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(50) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES inventory.categories(id) ON DELETE SET NULL,
    unit_id UUID REFERENCES inventory.units(id) ON DELETE RESTRICT,
    min_stock NUMERIC(15, 2) DEFAULT 0 NOT NULL,
    cost_price NUMERIC(15, 2) DEFAULT 0 NOT NULL,
    selling_price NUMERIC(15, 2) DEFAULT 0 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory.warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory.warehouse_stocks (
    warehouse_id UUID NOT NULL REFERENCES inventory.warehouses(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES inventory.products(id) ON DELETE CASCADE,
    current_stock NUMERIC(15, 2) DEFAULT 0 NOT NULL,
    reserved_stock NUMERIC(15, 2) DEFAULT 0 NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (warehouse_id, product_id)
);

CREATE TABLE IF NOT EXISTS inventory.stock_mutations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES inventory.products(id) ON DELETE RESTRICT,
    from_warehouse_id UUID REFERENCES inventory.warehouses(id) ON DELETE RESTRICT,
    to_warehouse_id UUID REFERENCES inventory.warehouses(id) ON DELETE RESTRICT,
    qty NUMERIC(15, 2) NOT NULL,
    mutation_type VARCHAR(50) NOT NULL,
    reference_type VARCHAR(50),
    reference_id UUID,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_sku ON inventory.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON inventory.products(category_id);
CREATE INDEX IF NOT EXISTS idx_stock_mutations_product ON inventory.stock_mutations(product_id);

-- 4. PURCHASING SCHEMA TABLES
CREATE TABLE IF NOT EXISTS purchasing.suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    payment_terms_days INT DEFAULT 30 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS purchasing.purchase_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pr_no VARCHAR(50) UNIQUE NOT NULL,
    request_date DATE NOT NULL,
    requester_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status VARCHAR(30) DEFAULT 'DRAFT' NOT NULL,
    notes TEXT,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS purchasing.purchase_request_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pr_id UUID NOT NULL REFERENCES purchasing.purchase_requests(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES inventory.products(id) ON DELETE RESTRICT,
    qty NUMERIC(15, 2) NOT NULL,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS purchasing.purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_no VARCHAR(50) UNIQUE NOT NULL,
    pr_id UUID REFERENCES purchasing.purchase_requests(id) ON DELETE SET NULL,
    supplier_id UUID NOT NULL REFERENCES purchasing.suppliers(id) ON DELETE RESTRICT,
    order_date DATE NOT NULL,
    expected_delivery_date DATE,
    status VARCHAR(30) DEFAULT 'DRAFT' NOT NULL,
    subtotal NUMERIC(15, 2) DEFAULT 0 NOT NULL,
    tax_amount NUMERIC(15, 2) DEFAULT 0 NOT NULL,
    total_amount NUMERIC(15, 2) DEFAULT 0 NOT NULL,
    notes TEXT,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS purchasing.purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_id UUID NOT NULL REFERENCES purchasing.purchase_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES inventory.products(id) ON DELETE RESTRICT,
    qty NUMERIC(15, 2) NOT NULL,
    unit_price NUMERIC(15, 2) NOT NULL,
    total_price NUMERIC(15, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS purchasing.goods_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grn_no VARCHAR(50) UNIQUE NOT NULL,
    po_id UUID NOT NULL REFERENCES purchasing.purchase_orders(id) ON DELETE RESTRICT,
    warehouse_id UUID NOT NULL REFERENCES inventory.warehouses(id) ON DELETE RESTRICT,
    receipt_date DATE NOT NULL,
    received_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS purchasing.goods_receipt_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goods_receipt_id UUID NOT NULL REFERENCES purchasing.goods_receipts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES inventory.products(id) ON DELETE RESTRICT,
    qty_received NUMERIC(15, 2) NOT NULL,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_po_no ON purchasing.purchase_orders(po_no);
CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchasing.purchase_orders(supplier_id);

-- 5. SALES SCHEMA TABLES
CREATE TABLE IF NOT EXISTS sales.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    tax_id VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS sales.sales_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_no VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES sales.customers(id) ON DELETE RESTRICT,
    order_date DATE NOT NULL,
    status VARCHAR(30) DEFAULT 'DRAFT' NOT NULL,
    subtotal NUMERIC(15, 2) DEFAULT 0 NOT NULL,
    tax_amount NUMERIC(15, 2) DEFAULT 0 NOT NULL,
    total_amount NUMERIC(15, 2) DEFAULT 0 NOT NULL,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS sales.sales_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sales_order_id UUID NOT NULL REFERENCES sales.sales_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES inventory.products(id) ON DELETE RESTRICT,
    qty NUMERIC(15, 2) NOT NULL,
    unit_price NUMERIC(15, 2) NOT NULL,
    discount NUMERIC(15, 2) DEFAULT 0 NOT NULL,
    total_price NUMERIC(15, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS sales.sales_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_no VARCHAR(50) UNIQUE NOT NULL,
    sales_order_id UUID NOT NULL REFERENCES sales.sales_orders(id) ON DELETE RESTRICT,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(30) DEFAULT 'UNPAID' NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL,
    paid_amount NUMERIC(15, 2) DEFAULT 0 NOT NULL,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS sales.sales_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_no VARCHAR(50) UNIQUE NOT NULL,
    sales_invoice_id UUID NOT NULL REFERENCES sales.sales_invoices(id) ON DELETE RESTRICT,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    reference_no VARCHAR(100),
    notes TEXT,
    received_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sales_order_no ON sales.sales_orders(order_no);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales.sales_orders(customer_id);

-- 6. FINANCE SCHEMA TABLES
CREATE TABLE IF NOT EXISTS finance.chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_code VARCHAR(50) UNIQUE NOT NULL,
    account_name VARCHAR(150) NOT NULL,
    account_type VARCHAR(50) NOT NULL,
    parent_id UUID REFERENCES finance.chart_of_accounts(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS finance.journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entry_no VARCHAR(50) UNIQUE NOT NULL,
    entry_date DATE NOT NULL,
    reference_type VARCHAR(50),
    reference_id UUID,
    description TEXT,
    status VARCHAR(30) DEFAULT 'POSTED' NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS finance.journal_entry_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journal_entry_id UUID NOT NULL REFERENCES finance.journal_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES finance.chart_of_accounts(id) ON DELETE RESTRICT,
    debit NUMERIC(15, 2) DEFAULT 0 NOT NULL,
    credit NUMERIC(15, 2) DEFAULT 0 NOT NULL,
    description TEXT
);

CREATE INDEX IF NOT EXISTS idx_coa_code ON finance.chart_of_accounts(account_code);
CREATE INDEX IF NOT EXISTS idx_journal_entry_no ON finance.journal_entries(entry_no);

-- 7. HR SCHEMA TABLES
CREATE TABLE IF NOT EXISTS hr.departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS hr.positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_id UUID NOT NULL REFERENCES hr.departments(id) ON DELETE CASCADE,
    code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS hr.employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    nik VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    department_id UUID REFERENCES hr.departments(id) ON DELETE SET NULL,
    position_id UUID REFERENCES hr.positions(id) ON DELETE SET NULL,
    join_date DATE NOT NULL,
    employment_status VARCHAR(50) DEFAULT 'PERMANENT' NOT NULL,
    base_salary NUMERIC(15, 2) DEFAULT 0 NOT NULL,
    bank_account_no VARCHAR(50),
    bank_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS hr.attendances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES hr.employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    clock_in TIMESTAMP WITH TIME ZONE,
    clock_out TIMESTAMP WITH TIME ZONE,
    status VARCHAR(30) DEFAULT 'PRESENT' NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(employee_id, date)
);

CREATE TABLE IF NOT EXISTS hr.leaves (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES hr.employees(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(30) DEFAULT 'PENDING' NOT NULL,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS hr.payrolls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payroll_no VARCHAR(50) UNIQUE NOT NULL,
    period_month INT NOT NULL,
    period_year INT NOT NULL,
    employee_id UUID NOT NULL REFERENCES hr.employees(id) ON DELETE RESTRICT,
    base_salary NUMERIC(15, 2) NOT NULL,
    allowances NUMERIC(15, 2) DEFAULT 0 NOT NULL,
    deductions NUMERIC(15, 2) DEFAULT 0 NOT NULL,
    net_salary NUMERIC(15, 2) NOT NULL,
    status VARCHAR(30) DEFAULT 'DRAFT' NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_employees_nik ON hr.employees(nik);
CREATE INDEX IF NOT EXISTS idx_attendances_emp_date ON hr.attendances(employee_id, date);

-- 8. AUDIT SCHEMA TABLES
CREATE TABLE IF NOT EXISTS audit.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    module VARCHAR(50) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id VARCHAR(100) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_module ON audit.audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit.audit_logs(created_at DESC);

-- 9. INITIAL SEED DATA
INSERT INTO auth.roles (id, code, name, description) VALUES
    ('11111111-1111-1111-1111-111111111111', 'SUPER_ADMIN', 'Super Admin', 'Full access to all modules and configurations'),
    ('22222222-2222-2222-2222-222222222222', 'ADMIN_INVENTORY', 'Admin Inventori', 'Manage products, stocks, and warehouse mutations'),
    ('33333333-3333-3333-3333-333333333333', 'ADMIN_SALES', 'Admin Penjualan', 'Manage customers, sales orders, and invoices'),
    ('44444444-4444-4444-4444-444444444444', 'ADMIN_PURCHASING', 'Admin Pembelian', 'Manage suppliers, purchase requests, and PO'),
    ('55555555-5555-5555-5555-555555555555', 'ADMIN_FINANCE', 'Admin Keuangan', 'Manage chart of accounts, journals, and payments'),
    ('66666666-6666-6666-6666-666666666666', 'ADMIN_HR', 'Admin HR', 'Manage employees, attendances, leaves, and payroll'),
    ('77777777-7777-7777-7777-777777777777', 'STAFF_OPERATIONAL', 'Staff Operasional', 'Operational daily input staff'),
    ('88888888-8888-8888-8888-888888888888', 'EMPLOYEE', 'Karyawan Umum', 'Self-service employee portal (attendance, leaves, payslip)')
ON CONFLICT (code) DO NOTHING;

INSERT INTO auth.permissions (code, module, description) VALUES
    ('auth:users:read', 'auth', 'View users list and details'),
    ('auth:users:create', 'auth', 'Create new users'),
    ('auth:users:update', 'auth', 'Update existing users'),
    ('auth:users:delete', 'auth', 'Delete or deactivate users'),
    ('auth:roles:manage', 'auth', 'Manage roles and assign permissions'),
    ('inventory:products:read', 'inventory', 'View products and stock levels'),
    ('inventory:products:create', 'inventory', 'Create new products'),
    ('inventory:products:update', 'inventory', 'Update product details and prices'),
    ('inventory:products:delete', 'inventory', 'Delete products'),
    ('inventory:stock:mutate', 'inventory', 'Perform stock in/out/transfer/opname'),
    ('inventory:warehouses:manage', 'inventory', 'Manage warehouses master'),
    ('sales:customers:read', 'sales', 'View customer list'),
    ('sales:customers:create', 'sales', 'Create new customer'),
    ('sales:customers:update', 'sales', 'Update customer details'),
    ('sales:orders:read', 'sales', 'View sales orders'),
    ('sales:orders:create', 'sales', 'Create sales order'),
    ('sales:orders:confirm', 'sales', 'Confirm sales order'),
    ('sales:invoices:manage', 'sales', 'Create and manage sales invoices & payments'),
    ('purchasing:suppliers:manage', 'purchasing', 'Manage vendor and suppliers'),
    ('purchasing:pr:create', 'purchasing', 'Create purchase request'),
    ('purchasing:pr:approve', 'purchasing', 'Approve or reject purchase request'),
    ('purchasing:po:create', 'purchasing', 'Create purchase order'),
    ('purchasing:po:approve', 'purchasing', 'Approve purchase order'),
    ('purchasing:grn:create', 'purchasing', 'Receive goods in warehouse (GRN)'),
    ('finance:coa:manage', 'finance', 'Manage chart of accounts'),
    ('finance:journals:read', 'finance', 'View general journals and ledgers'),
    ('finance:journals:create', 'finance', 'Create manual journal entry'),
    ('finance:reports:view', 'finance', 'View balance sheet, profit & loss, cash flow'),
    ('hr:employees:manage', 'hr', 'Manage employee profiles, contracts, positions'),
    ('hr:attendance:manage', 'hr', 'Record and manage employee attendances'),
    ('hr:leaves:manage', 'hr', 'Approve or reject employee leave requests'),
    ('hr:payroll:process', 'hr', 'Calculate and disburse payroll'),
    ('audit:logs:view', 'audit', 'View system audit logs'),
    ('reports:dashboard:view', 'reporting', 'View executive cross-module dashboard')
ON CONFLICT (code) DO NOTHING;

INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT '11111111-1111-1111-1111-111111111111', id FROM auth.permissions
ON CONFLICT DO NOTHING;

INSERT INTO auth.users (id, email, password_hash, full_name, phone, is_active)
VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'admin@erp.local',
    crypt('admin123', gen_salt('bf', 10)),
    'Super Administrator',
    '+6281234567890',
    TRUE
) ON CONFLICT (email) DO NOTHING;

INSERT INTO auth.user_roles (user_id, role_id)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111')
ON CONFLICT DO NOTHING;

INSERT INTO inventory.units (code, name, symbol) VALUES
    ('PCS', 'Pieces', 'pcs'),
    ('BOX', 'Box / Dus', 'box'),
    ('KG', 'Kilogram', 'kg'),
    ('LTR', 'Liter', 'L'),
    ('MTR', 'Meter', 'm')
ON CONFLICT (code) DO NOTHING;

INSERT INTO inventory.categories (code, name, description) VALUES
    ('CAT-RAW', 'Bahan Baku', 'Raw materials for operations'),
    ('CAT-FIN', 'Barang Jadi', 'Finished goods ready for sales'),
    ('CAT-OFF', 'Alat Tulis Kantor', 'Office supplies and equipment')
ON CONFLICT (code) DO NOTHING;

INSERT INTO inventory.warehouses (code, name, address) VALUES
    ('WH-JKT-01', 'Gudang Utama Jakarta', 'Jl. Industri Raya No. 10, Jakarta Barat'),
    ('WH-SBY-01', 'Gudang Distribusi Surabaya', 'Jl. Rungkut Industri No. 45, Surabaya')
ON CONFLICT (code) DO NOTHING;

INSERT INTO finance.chart_of_accounts (account_code, account_name, account_type) VALUES
    ('1-1001', 'Kas Operasional', 'ASSET'),
    ('1-1002', 'Bank BCA Utama', 'ASSET'),
    ('1-1100', 'Piutang Usaha (Accounts Receivable)', 'ASSET'),
    ('1-1200', 'Persediaan Barang (Inventory)', 'ASSET'),
    ('2-1001', 'Hutang Usaha (Accounts Payable)', 'ASSET'),
    ('3-1001', 'Modal Saham', 'EQUITY'),
    ('3-2001', 'Laba Ditahan', 'EQUITY'),
    ('4-1001', 'Pendapatan Penjualan Barang', 'REVENUE'),
    ('5-1001', 'Beban Pokok Penjualan (HPP)', 'EXPENSE'),
    ('6-1001', 'Beban Gaji & Upah Karyawan', 'EXPENSE'),
    ('6-1002', 'Beban Operasional & Listrik', 'EXPENSE')
ON CONFLICT (account_code) DO NOTHING;

INSERT INTO hr.departments (id, code, name, description) VALUES
    ('d1111111-1111-1111-1111-111111111111', 'DEPT-IT', 'Information Technology', 'Software & IT Infrastructure'),
    ('d2222222-2222-2222-2222-222222222222', 'DEPT-FIN', 'Finance & Accounting', 'Financial Planning & General Ledger'),
    ('d3333333-3333-3333-3333-333333333333', 'DEPT-SLS', 'Sales & Marketing', 'Sales Operation & Customer Relations'),
    ('d4444444-4444-4444-4444-444444444444', 'DEPT-LOG', 'Logistics & Warehouse', 'Inventory & Goods Distribution'),
    ('d5555555-5555-5555-5555-555555555555', 'DEPT-HRD', 'Human Resources', 'People Operations & Payroll')
ON CONFLICT (code) DO NOTHING;

INSERT INTO hr.positions (department_id, code, title) VALUES
    ('d1111111-1111-1111-1111-111111111111', 'POS-IT-01', 'Lead Software Engineer'),
    ('d2222222-2222-2222-2222-222222222222', 'POS-FIN-01', 'Finance Manager'),
    ('d3333333-3333-3333-3333-333333333333', 'POS-SLS-01', 'Senior Sales Executive'),
    ('d4444444-4444-4444-4444-444444444444', 'POS-LOG-01', 'Warehouse Supervisor'),
    ('d5555555-5555-5555-5555-555555555555', 'POS-HRD-01', 'HR & People Specialist')
ON CONFLICT (code) DO NOTHING;

-- SEED SUPPLIERS
INSERT INTO purchasing.suppliers (id, code, name, email, phone, address, payment_terms_days, is_active) VALUES
    ('s1111111-1111-1111-1111-111111111111', 'SUPP-TECH-001', 'PT Mega Komputindo Perkasa', 'procurement@megakomputindo.co.id', '021-58901234', 'Kawasan Industri Pulo Gadung, Blok D No. 12, Jakarta Timur', 30, TRUE),
    ('s2222222-2222-2222-2222-222222222222', 'SUPP-STAT-002', 'CV Mitra Stationery Sejahtera', 'sales@mitrastationery.com', '031-89765432', 'Rungkut Industri III No. 45, Surabaya', 14, TRUE)
ON CONFLICT (code) DO NOTHING;

-- SEED CUSTOMERS
INSERT INTO sales.customers (id, code, name, email, phone, address, credit_limit, is_active) VALUES
    ('c1111111-1111-1111-1111-111111111111', 'CUST-001', 'PT Sinar Jaya Abadi', 'procurement@sinarjaya.co.id', '021-4567890', 'Gedung Cyber 2 Lt. 15, Jl. HR Rasuna Said, Jakarta Selatan', 500000000, TRUE),
    ('c2222222-2222-2222-2222-222222222222', 'CUST-002', 'CV Mandiri Sejahtera', 'finance@mandirisejahtera.com', '031-7654321', 'Komp. Pergudangan Margomulyo Permai Blok B-8, Surabaya', 250000000, TRUE)
ON CONFLICT (code) DO NOTHING;

-- SEED PRODUCTS
INSERT INTO inventory.products (id, sku, name, description, category_id, unit_id, min_stock, cost_price, selling_price, is_active) VALUES
    ('p1111111-1111-1111-1111-111111111111', 'PRD-LAPTOP-001', 'Laptop Enterprise Pro 14 inch', 'Laptop bisnis i7/16GB/512GB',
     (SELECT id FROM inventory.categories WHERE code = 'CAT-FIN' LIMIT 1),
     (SELECT id FROM inventory.units WHERE code = 'PCS' LIMIT 1),
     5, 12500000, 15000000, TRUE),
    ('p2222222-2222-2222-2222-222222222222', 'PRD-MONITOR-002', 'Monitor IPS 27 inch 4K Ultra HD', 'Monitor warna presisi',
     (SELECT id FROM inventory.categories WHERE code = 'CAT-FIN' LIMIT 1),
     (SELECT id FROM inventory.units WHERE code = 'PCS' LIMIT 1),
     8, 3800000, 4800000, TRUE)
ON CONFLICT (sku) DO NOTHING;

-- SEED EMPLOYEES
INSERT INTO hr.employees (id, employee_no, nik, full_name, email, phone, department_id, position_id, join_date, base_salary, status) VALUES
    ('e1111111-1111-1111-1111-111111111111', 'EMP-2026-001', '3171012345670001', 'Ahmad Fauzi', 'ahmad.fauzi@erp.local', '081234567890',
     (SELECT id FROM hr.departments WHERE code = 'DEPT-IT' LIMIT 1),
     (SELECT id FROM hr.positions WHERE code = 'POS-IT-01' LIMIT 1),
     '2024-01-15', 12000000, 'ACTIVE')
ON CONFLICT (employee_no) DO NOTHING;

