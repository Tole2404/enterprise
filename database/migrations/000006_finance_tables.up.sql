-- Schema: finance

CREATE TABLE IF NOT EXISTS finance.chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_code VARCHAR(50) UNIQUE NOT NULL,
    account_name VARCHAR(150) NOT NULL,
    account_type VARCHAR(50) NOT NULL, -- ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
    parent_id UUID REFERENCES finance.chart_of_accounts(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS finance.journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entry_no VARCHAR(50) UNIQUE NOT NULL,
    entry_date DATE NOT NULL,
    reference_type VARCHAR(50), -- SALES_INVOICE, SALES_PAYMENT, PO, PAYROLL, MANUAL
    reference_id UUID,
    description TEXT,
    status VARCHAR(30) DEFAULT 'POSTED' NOT NULL, -- DRAFT, POSTED, VOID
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
CREATE INDEX IF NOT EXISTS idx_journal_reference ON finance.journal_entries(reference_type, reference_id);
