-- ==============================================================================
-- ERP ENTERPRISE - SAMPLE SEED DATA SCRIPT FOR DBEAVER / POSTGRESQL
-- Jalankan script ini di DBeaver (SQL Editor -> Execute Script / Alt+X)
-- ==============================================================================

-- 1. SEED SUPPLIERS (PURCHASING)
INSERT INTO purchasing.suppliers (id, code, name, email, phone, address, payment_terms_days, is_active)
VALUES
    ('s1111111-1111-1111-1111-111111111111', 'SUPP-TECH-001', 'PT Mega Komputindo Perkasa', 'procurement@megakomputindo.co.id', '021-58901234', 'Kawasan Industri Pulo Gadung, Blok D No. 12, Jakarta Timur', 30, TRUE),
    ('s2222222-2222-2222-2222-222222222222', 'SUPP-STAT-002', 'CV Mitra Stationery Sejahtera', 'sales@mitrastationery.com', '031-89765432', 'Rungkut Industri III No. 45, Surabaya', 14, TRUE),
    ('s3333333-3333-3333-3333-333333333333', 'SUPP-LOGS-003', 'PT Nusantara Logistik Prima', 'contact@nusantaralogistik.id', '021-77889900', 'Jl. Pelabuhan Tanjung Priok No. 88, Jakarta Utara', 45, TRUE)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    payment_terms_days = EXCLUDED.payment_terms_days;

-- 2. SEED CUSTOMERS (SALES & CRM)
INSERT INTO sales.customers (id, code, name, email, phone, address, credit_limit, is_active)
VALUES
    ('c1111111-1111-1111-1111-111111111111', 'CUST-001', 'PT Sinar Jaya Abadi', 'procurement@sinarjaya.co.id', '021-4567890', 'Gedung Cyber 2 Lt. 15, Jl. HR Rasuna Said, Jakarta Selatan', 500000000, TRUE),
    ('c2222222-2222-2222-2222-222222222222', 'CUST-002', 'CV Mandiri Sejahtera', 'finance@mandirisejahtera.com', '031-7654321', 'Komp. Pergudangan Margomulyo Permai Blok B-8, Surabaya', 250000000, TRUE),
    ('c3333333-3333-3333-3333-333333333333', 'CUST-003', 'PT Global Digital Solusindo', 'purchasing@gds.co.id', '022-8877665', 'Jl. Dago Asri No. 10, Bandung', 150000000, TRUE)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address;

-- 3. SEED PRODUCTS (INVENTORY)
INSERT INTO inventory.products (id, sku, name, description, category_id, unit_id, min_stock, cost_price, selling_price, is_active)
VALUES
    ('p1111111-1111-1111-1111-111111111111', 'PRD-LAPTOP-001', 'Laptop Enterprise Pro 14 inch (i7/16GB/512GB)', 'Laptop spesifikasi bisnis dengan durabilitas tinggi', 
     (SELECT id FROM inventory.categories WHERE code = 'CAT-FIN' LIMIT 1),
     (SELECT id FROM inventory.units WHERE code = 'PCS' LIMIT 1),
     5, 12500000, 15000000, TRUE),
    ('p2222222-2222-2222-2222-222222222222', 'PRD-MONITOR-002', 'Monitor IPS 27 inch 4K Ultra HD', 'Monitor warna presisi untuk desain & coding',
     (SELECT id FROM inventory.categories WHERE code = 'CAT-FIN' LIMIT 1),
     (SELECT id FROM inventory.units WHERE code = 'PCS' LIMIT 1),
     8, 3800000, 4800000, TRUE),
    ('p3333333-3333-3333-3333-333333333333', 'PRD-KERTAS-003', 'Kertas HVS A4 80gsm (1 Rim / 500 Lembar)', 'Kertas print kantor berkualitas tinggi',
     (SELECT id FROM inventory.categories WHERE code = 'CAT-OFF' LIMIT 1),
     (SELECT id FROM inventory.units WHERE code = 'BOX' LIMIT 1),
     20, 45000, 58000, TRUE),
    ('p4444444-4444-4444-4444-444444444444', 'PRD-KABEL-004', 'Kabel LAN Cat6 FTP Outdoor (305 Meter)', 'Kabel transmisi data gigabit tahan cuaca',
     (SELECT id FROM inventory.categories WHERE code = 'CAT-RAW' LIMIT 1),
     (SELECT id FROM inventory.units WHERE code = 'BOX' LIMIT 1),
     3, 1200000, 1650000, TRUE)
ON CONFLICT (sku) DO UPDATE SET
    name = EXCLUDED.name,
    cost_price = EXCLUDED.cost_price,
    selling_price = EXCLUDED.selling_price;

-- 4. SEED EMPLOYEES (HR)
INSERT INTO hr.employees (id, employee_no, nik, full_name, email, phone, department_id, position_id, join_date, base_salary, status)
VALUES
    ('e1111111-1111-1111-1111-111111111111', 'EMP-2026-001', '3171012345670001', 'Ahmad Fauzi', 'ahmad.fauzi@erp.local', '081234567890',
     (SELECT id FROM hr.departments WHERE code = 'DEPT-IT' LIMIT 1),
     (SELECT id FROM hr.positions WHERE code = 'POS-IT-01' LIMIT 1),
     '2024-01-15', 12000000, 'ACTIVE'),
    ('e2222222-2222-2222-2222-222222222222', 'EMP-2026-002', '3171012345670002', 'Siti Rahmawati', 'siti.rahma@erp.local', '081987654321',
     (SELECT id FROM hr.departments WHERE code = 'DEPT-FIN' LIMIT 1),
     (SELECT id FROM hr.positions WHERE code = 'POS-FIN-01' LIMIT 1),
     '2023-06-01', 9500000, 'ACTIVE'),
    ('e3333333-3333-3333-3333-333333333333', 'EMP-2026-003', '3171012345670003', 'Budi Santoso', 'budi.santoso@erp.local', '081345678912',
     (SELECT id FROM hr.departments WHERE code = 'DEPT-SLS' LIMIT 1),
     (SELECT id FROM hr.positions WHERE code = 'POS-SLS-01' LIMIT 1),
     '2024-03-10', 8000000, 'ACTIVE')
ON CONFLICT (employee_no) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    base_salary = EXCLUDED.base_salary;
