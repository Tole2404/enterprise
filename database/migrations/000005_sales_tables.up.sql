-- Schema: sales

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
    status VARCHAR(30) DEFAULT 'DRAFT' NOT NULL, -- DRAFT, CONFIRMED, SHIPPED, COMPLETED, CANCELLED
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
    status VARCHAR(30) DEFAULT 'UNPAID' NOT NULL, -- UNPAID, PARTIAL, PAID, CANCELLED
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
    payment_method VARCHAR(50) NOT NULL, -- BANK_TRANSFER, CASH, CREDIT_CARD
    amount NUMERIC(15, 2) NOT NULL,
    reference_no VARCHAR(100),
    notes TEXT,
    received_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sales_order_no ON sales.sales_orders(order_no);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales.sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_no ON sales.sales_invoices(invoice_no);
