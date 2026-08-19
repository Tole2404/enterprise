-- Schema: audit

CREATE TABLE IF NOT EXISTS audit.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE, APPROVE, REJECT, LOGIN
    module VARCHAR(50) NOT NULL, -- auth, inventory, purchasing, sales, finance, hr
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
