-- ==============================================================================
-- INITIAL SEED DATA FOR ERP ENTERPRISE
-- ==============================================================================

-- 1. SEED ROLES
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

-- 2. SEED PERMISSIONS
INSERT INTO auth.permissions (code, module, description) VALUES
    -- Auth & User Permissions
    ('auth:users:read', 'auth', 'View users list and details'),
    ('auth:users:create', 'auth', 'Create new users'),
    ('auth:users:update', 'auth', 'Update existing users'),
    ('auth:users:delete', 'auth', 'Delete or deactivate users'),
    ('auth:roles:manage', 'auth', 'Manage roles and assign permissions'),
    
    -- Inventory Permissions
    ('inventory:products:read', 'inventory', 'View products and stock levels'),
    ('inventory:products:create', 'inventory', 'Create new products'),
    ('inventory:products:update', 'inventory', 'Update product details and prices'),
    ('inventory:products:delete', 'inventory', 'Delete products'),
    ('inventory:stock:mutate', 'inventory', 'Perform stock in/out/transfer/opname'),
    ('inventory:warehouses:manage', 'inventory', 'Manage warehouses master'),
    
    -- Sales Permissions
    ('sales:customers:read', 'sales', 'View customer list'),
    ('sales:customers:create', 'sales', 'Create new customer'),
    ('sales:customers:update', 'sales', 'Update customer details'),
    ('sales:orders:read', 'sales', 'View sales orders'),
    ('sales:orders:create', 'sales', 'Create sales order'),
    ('sales:orders:confirm', 'sales', 'Confirm sales order'),
    ('sales:invoices:manage', 'sales', 'Create and manage sales invoices & payments'),
    
    -- Purchasing Permissions
    ('purchasing:suppliers:manage', 'purchasing', 'Manage vendor and suppliers'),
    ('purchasing:pr:create', 'purchasing', 'Create purchase request'),
    ('purchasing:pr:approve', 'purchasing', 'Approve or reject purchase request'),
    ('purchasing:po:create', 'purchasing', 'Create purchase order'),
    ('purchasing:po:approve', 'purchasing', 'Approve purchase order'),
    ('purchasing:grn:create', 'purchasing', 'Receive goods in warehouse (GRN)'),
    
    -- Finance Permissions
    ('finance:coa:manage', 'finance', 'Manage chart of accounts'),
    ('finance:journals:read', 'finance', 'View general journals and ledgers'),
    ('finance:journals:create', 'finance', 'Create manual journal entry'),
    ('finance:reports:view', 'finance', 'View balance sheet, profit & loss, cash flow'),
    
    -- HR Permissions
    ('hr:employees:manage', 'hr', 'Manage employee profiles, contracts, positions'),
    ('hr:attendance:manage', 'hr', 'Record and manage employee attendances'),
    ('hr:leaves:manage', 'hr', 'Approve or reject employee leave requests'),
    ('hr:payroll:process', 'hr', 'Calculate and disburse payroll'),
    
    -- Audit & Reports
    ('audit:logs:view', 'audit', 'View system audit logs'),
    ('reports:dashboard:view', 'reporting', 'View executive cross-module dashboard')
ON CONFLICT (code) DO NOTHING;

-- 3. ASSIGN ALL PERMISSIONS TO SUPER_ADMIN
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT '11111111-1111-1111-1111-111111111111', id FROM auth.permissions
ON CONFLICT DO NOTHING;

-- 4. SEED DEFAULT SUPER ADMIN USER (Password: admin123)
INSERT INTO auth.users (id, email, password_hash, full_name, phone, is_active)
VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'admin@erp.local',
    crypt('admin123', gen_salt('bf', 10)),
    'Super Administrator',
    '+6281234567890',
    TRUE
) ON CONFLICT (email) DO NOTHING;

-- 5. ASSIGN SUPER ADMIN ROLE TO USER
INSERT INTO auth.user_roles (user_id, role_id)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111')
ON CONFLICT DO NOTHING;

-- 6. SEED INVENTORY MASTER (Units, Categories, Warehouses)
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

-- 7. SEED FINANCE (Chart of Accounts)
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

-- 8. SEED HR (Departments & Positions)
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
