-- Schema: inventory

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
    mutation_type VARCHAR(50) NOT NULL, -- IN, OUT, TRANSFER, ADJUSTMENT
    reference_type VARCHAR(50),         -- SALES_ORDER, PURCHASE_ORDER, STOCK_OPNAME, MANUAL
    reference_id UUID,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_sku ON inventory.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON inventory.products(category_id);
CREATE INDEX IF NOT EXISTS idx_stock_mutations_product ON inventory.stock_mutations(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_mutations_reference ON inventory.stock_mutations(reference_type, reference_id);
