-- Schema: hr

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
    employment_status VARCHAR(50) DEFAULT 'PERMANENT' NOT NULL, -- PROBATION, CONTRACT, PERMANENT, RESIGNED
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
    status VARCHAR(30) DEFAULT 'PRESENT' NOT NULL, -- PRESENT, LATE, ABSENT, ON_LEAVE
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(employee_id, date)
);

CREATE TABLE IF NOT EXISTS hr.leaves (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES hr.employees(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL, -- ANNUAL, SICK, MATERNITY, UNPAID
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(30) DEFAULT 'PENDING' NOT NULL, -- PENDING, APPROVED, REJECTED
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
    status VARCHAR(30) DEFAULT 'DRAFT' NOT NULL, -- DRAFT, APPROVED, PAID
    paid_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_employees_nik ON hr.employees(nik);
CREATE INDEX IF NOT EXISTS idx_attendances_emp_date ON hr.attendances(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_payrolls_period ON hr.payrolls(period_year, period_month);
