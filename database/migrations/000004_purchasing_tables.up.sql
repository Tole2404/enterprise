-- Schema: purchasing

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
    status VARCHAR(30) DEFAULT 'DRAFT' NOT NULL, -- DRAFT, SUBMITTED, APPROVED, REJECTED
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
    status VARCHAR(30) DEFAULT 'DRAFT' NOT NULL, -- DRAFT, PENDING_APPROVAL, APPROVED, REJECTED, RECEIVED, CANCELLED
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
CREATE INDEX IF NOT EXISTS idx_grn_po ON purchasing.goods_receipts(po_id);
