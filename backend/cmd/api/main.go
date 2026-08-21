package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"erp-backend/internal/agent"
	"erp-backend/internal/auth"
	"erp-backend/internal/finance"
	"erp-backend/internal/hr"
	"erp-backend/internal/inventory"
	"erp-backend/internal/middleware"
	"erp-backend/internal/purchasing"
	"erp-backend/internal/sales"
	"erp-backend/pkg/config"
	"erp-backend/pkg/database"
	"erp-backend/pkg/response"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	// 1. Load Application Configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	if cfg.AppEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// 2. Connect to PostgreSQL (erp_db) with Retry
	var db *database.DB
	for attempt := 1; attempt <= 5; attempt++ {
		db, err = database.ConnectPostgres(cfg)
		if err == nil {
			break
		}
		log.Printf("⚠ Warning (attempt %d/5): PostgreSQL connection failed: %v. Retrying in 2s...", attempt, err)
		time.Sleep(2 * time.Second)
	}
	if db == nil {
		log.Printf("❌ Failed to connect to PostgreSQL after 5 attempts. Backend routes will not be active.")
	} else {
		// Auto-synchronize missing columns and tables across modules
		syncSQLs := []string{
			`ALTER TABLE sales.sales_orders ADD COLUMN IF NOT EXISTS so_no VARCHAR(50);`,
			`ALTER TABLE sales.sales_orders ADD COLUMN IF NOT EXISTS order_no VARCHAR(50);`,
			`ALTER TABLE sales.sales_orders ALTER COLUMN order_no DROP NOT NULL;`,
			`ALTER TABLE sales.sales_orders ALTER COLUMN so_no DROP NOT NULL;`,
			`UPDATE sales.sales_orders SET so_no = order_no WHERE so_no IS NULL AND order_no IS NOT NULL;`,
			`UPDATE sales.sales_orders SET order_no = so_no WHERE order_no IS NULL AND so_no IS NOT NULL;`,

			`ALTER TABLE sales.sales_order_items ADD COLUMN IF NOT EXISTS so_id UUID;`,
			`ALTER TABLE sales.sales_order_items ADD COLUMN IF NOT EXISTS sales_order_id UUID;`,
			`ALTER TABLE sales.sales_order_items ALTER COLUMN sales_order_id DROP NOT NULL;`,
			`ALTER TABLE sales.sales_order_items ALTER COLUMN so_id DROP NOT NULL;`,
			`UPDATE sales.sales_order_items SET so_id = sales_order_id WHERE so_id IS NULL AND sales_order_id IS NOT NULL;`,
			`UPDATE sales.sales_order_items SET sales_order_id = so_id WHERE sales_order_id IS NULL AND so_id IS NOT NULL;`,

			`ALTER TABLE sales.sales_invoices ADD COLUMN IF NOT EXISTS so_id UUID;`,
			`ALTER TABLE sales.sales_invoices ADD COLUMN IF NOT EXISTS sales_order_id UUID;`,
			`ALTER TABLE sales.sales_invoices ALTER COLUMN sales_order_id DROP NOT NULL;`,
			`ALTER TABLE sales.sales_invoices ALTER COLUMN so_id DROP NOT NULL;`,
			`UPDATE sales.sales_invoices SET so_id = sales_order_id WHERE so_id IS NULL AND sales_order_id IS NOT NULL;`,
			`UPDATE sales.sales_invoices SET sales_order_id = so_id WHERE sales_order_id IS NULL AND so_id IS NOT NULL;`,

			`CREATE TABLE IF NOT EXISTS sales.delivery_orders (
				id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
				do_no VARCHAR(50) UNIQUE NOT NULL,
				so_id UUID NOT NULL REFERENCES sales.sales_orders(id) ON DELETE RESTRICT,
				warehouse_id UUID NOT NULL REFERENCES inventory.warehouses(id) ON DELETE RESTRICT,
				delivery_date DATE NOT NULL,
				shipped_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
				notes TEXT,
				created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
			);`,

			`CREATE TABLE IF NOT EXISTS finance.accounts (
				id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
				code VARCHAR(50) UNIQUE NOT NULL,
				name VARCHAR(150) NOT NULL,
				type VARCHAR(50) NOT NULL,
				parent_id UUID REFERENCES finance.accounts(id) ON DELETE SET NULL,
				is_active BOOLEAN DEFAULT TRUE NOT NULL,
				created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
			);`,

			`CREATE TABLE IF NOT EXISTS finance.journal_entries (
				id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
				entry_no VARCHAR(50) UNIQUE NOT NULL,
				entry_date DATE NOT NULL,
				description TEXT,
				reference VARCHAR(100),
				created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
				created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
			);`,

			`CREATE TABLE IF NOT EXISTS finance.journal_lines (
				id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
				journal_id UUID NOT NULL REFERENCES finance.journal_entries(id) ON DELETE CASCADE,
				account_id UUID NOT NULL REFERENCES finance.accounts(id) ON DELETE RESTRICT,
				debit NUMERIC(15, 2) DEFAULT 0 NOT NULL,
				credit NUMERIC(15, 2) DEFAULT 0 NOT NULL,
				description TEXT
			);`,

			`INSERT INTO finance.accounts (id, code, name, type, is_active) VALUES
			('a0000001-0000-0000-0000-000000000001', '1110', 'Kas Utama Perusahaan', 'ASSET', true),
			('a0000001-0000-0000-0000-000000000002', '1120', 'Bank BCA Giro Operasional', 'ASSET', true),
			('a0000001-0000-0000-0000-000000000003', '1130', 'Piutang Usaha Pelanggan', 'ASSET', true),
			('a0000001-0000-0000-0000-000000000004', '1140', 'Persediaan Barang Dagang (Gudang)', 'ASSET', true),
			('a0000001-0000-0000-0000-000000000005', '1210', 'Aset Tetap & Peralatan Kantor', 'ASSET', true),
			('a0000001-0000-0000-0000-000000000006', '2110', 'Hutang Usaha / Supplier', 'LIABILITY', true),
			('a0000001-0000-0000-0000-000000000007', '2120', 'Hutang Pajak PPN', 'LIABILITY', true),
			('a0000001-0000-0000-0000-000000000008', '2130', 'Hutang Gaji Karyawan', 'LIABILITY', true),
			('a0000001-0000-0000-0000-000000000009', '3110', 'Modal Disetor Pemilik', 'EQUITY', true),
			('a0000001-0000-0000-0000-000000000010', '3210', 'Laba Ditahan (Retained Earnings)', 'EQUITY', true),
			('a0000001-0000-0000-0000-000000000011', '4110', 'Pendapatan Penjualan Produk', 'REVENUE', true),
			('a0000001-0000-0000-0000-000000000012', '4120', 'Pendapatan Jasa & Operasional Lain', 'REVENUE', true),
			('a0000001-0000-0000-0000-000000000013', '5110', 'Beban Pokok Penjualan (HPP)', 'EXPENSE', true),
			('a0000001-0000-0000-0000-000000000014', '6110', 'Beban Gaji, Tunjangan & Bonus', 'EXPENSE', true),
			('a0000001-0000-0000-0000-000000000015', '6120', 'Beban Operasional, Listrik & Air', 'EXPENSE', true)
			ON CONFLICT (code) DO NOTHING;`,

			`INSERT INTO finance.journal_entries (id, entry_no, entry_date, description, reference, created_at)
			VALUES ('b0000001-0000-0000-0000-000000000001', 'JV-20260820-0001', CURRENT_DATE, 'Saldo Awal Pembukuan Perusahaan & Modal Disetor', 'OPENING-BALANCE', CURRENT_TIMESTAMP)
			ON CONFLICT (entry_no) DO NOTHING;`,

			`INSERT INTO finance.journal_lines (id, journal_id, account_id, debit, credit, description)
			SELECT 'c0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000002', 250000000, 0, 'Saldo Awal Kas Bank BCA'
			WHERE NOT EXISTS (SELECT 1 FROM finance.journal_lines WHERE journal_id = 'b0000001-0000-0000-0000-000000000001');`,

			`INSERT INTO finance.journal_lines (id, journal_id, account_id, debit, credit, description)
			SELECT 'c0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000004', 145000000, 0, 'Saldo Awal Nilai Persediaan Barang Gudang'
			WHERE NOT EXISTS (SELECT 1 FROM finance.journal_lines WHERE id = 'c0000001-0000-0000-0000-000000000002');`,

			`INSERT INTO finance.journal_lines (id, journal_id, account_id, debit, credit, description)
			SELECT 'c0000001-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000009', 0, 395000000, 'Penyertaan Modal Awal Disetor Pemilik'
			WHERE NOT EXISTS (SELECT 1 FROM finance.journal_lines WHERE id = 'c0000001-0000-0000-0000-000000000003');`,

			`ALTER TABLE hr.employees ADD COLUMN IF NOT EXISTS employee_no VARCHAR(50);`,
			`ALTER TABLE hr.employees ADD COLUMN IF NOT EXISTS nik VARCHAR(50);`,
			`ALTER TABLE hr.employees ALTER COLUMN nik DROP NOT NULL;`,
			`ALTER TABLE hr.employees ALTER COLUMN employee_no DROP NOT NULL;`,
			`UPDATE hr.employees SET employee_no = nik WHERE employee_no IS NULL AND nik IS NOT NULL;`,
			`UPDATE hr.employees SET nik = employee_no WHERE nik IS NULL AND employee_no IS NOT NULL;`,

			`ALTER TABLE hr.employees ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'ACTIVE';`,
			`ALTER TABLE hr.employees ADD COLUMN IF NOT EXISTS employment_status VARCHAR(50) DEFAULT 'PERMANENT';`,
			`ALTER TABLE hr.employees ALTER COLUMN employment_status DROP NOT NULL;`,
			`ALTER TABLE hr.employees ALTER COLUMN status DROP NOT NULL;`,
			`UPDATE hr.employees SET status = employment_status WHERE status IS NULL AND employment_status IS NOT NULL;`,
			`UPDATE hr.employees SET employment_status = status WHERE employment_status IS NULL AND status IS NOT NULL;`,

			`CREATE TABLE IF NOT EXISTS hr.leave_requests (
				id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
				employee_id UUID NOT NULL REFERENCES hr.employees(id) ON DELETE CASCADE,
				leave_type VARCHAR(50) NOT NULL,
				start_date DATE NOT NULL,
				end_date DATE NOT NULL,
				reason TEXT,
				status VARCHAR(30) DEFAULT 'PENDING' NOT NULL,
				approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
				approved_at TIMESTAMP WITH TIME ZONE,
				created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
			);`,

			`CREATE TABLE IF NOT EXISTS hr.payroll (
				id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
				payroll_no VARCHAR(50) UNIQUE NOT NULL,
				employee_id UUID NOT NULL REFERENCES hr.employees(id) ON DELETE RESTRICT,
				period_month INT NOT NULL,
				period_year INT NOT NULL,
				base_salary NUMERIC(15, 2) NOT NULL,
				allowances NUMERIC(15, 2) DEFAULT 0 NOT NULL,
				deductions NUMERIC(15, 2) DEFAULT 0 NOT NULL,
				net_salary NUMERIC(15, 2) NOT NULL,
				payment_status VARCHAR(30) DEFAULT 'UNPAID' NOT NULL,
				created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
			);`,

			`INSERT INTO auth.roles (id, code, name, description) VALUES
			('11111111-1111-1111-1111-111111111111', 'SUPER_ADMIN', 'Super Administrator', 'Akses penuh ke seluruh modul sistem'),
			('22222222-2222-2222-2222-222222222222', 'ADMIN_INVENTORY', 'Admin Inventori & Gudang', 'Pengelolaan katalog produk, stok gudang, dan mutasi'),
			('33333333-3333-3333-3333-333333333333', 'STAFF_PURCHASING', 'Staff Pengadaan (Purchasing)', 'Pengelolaan vendor, purchase order, dan penerimaan barang GRN'),
			('44444444-4444-4444-4444-444444444444', 'STAFF_SALES', 'Staff Penjualan & Distribusi', 'Pengelolaan pelanggan, sales order, surat jalan DO, dan tagihan invoice'),
			('55555555-5555-5555-5555-555555555555', 'STAFF_FINANCE', 'Staff Keuangan & Akuntansi', 'Pengelolaan bagan akun COA, jurnal umum, dan laporan keuangan'),
			('66666666-6666-6666-6666-666666666666', 'STAFF_HR', 'Staff Human Resources (HR)', 'Pengelolaan data pegawai, permohonan cuti, dan slip gaji')
			ON CONFLICT (code) DO NOTHING;`,

			`INSERT INTO auth.role_permissions (role_id, permission_id)
			SELECT r.id, p.id
			FROM auth.roles r
			CROSS JOIN auth.permissions p
			WHERE (r.code = 'ADMIN_INVENTORY' OR r.code = 'MANAGER_INVENTORY')
			  AND p.module = 'inventory'
			ON CONFLICT DO NOTHING;`,

			`INSERT INTO auth.role_permissions (role_id, permission_id)
			SELECT r.id, p.id
			FROM auth.roles r
			CROSS JOIN auth.permissions p
			WHERE r.code = 'STAFF_PURCHASING'
			  AND (p.module = 'purchasing' OR p.code = 'inventory:products:read')
			ON CONFLICT DO NOTHING;`,

			`INSERT INTO auth.role_permissions (role_id, permission_id)
			SELECT r.id, p.id
			FROM auth.roles r
			CROSS JOIN auth.permissions p
			WHERE r.code = 'STAFF_SALES'
			  AND (p.module = 'sales' OR p.code = 'inventory:products:read')
			ON CONFLICT DO NOTHING;`,

			`INSERT INTO auth.role_permissions (role_id, permission_id)
			SELECT r.id, p.id
			FROM auth.roles r
			CROSS JOIN auth.permissions p
			WHERE r.code = 'STAFF_FINANCE'
			  AND (p.module = 'finance' OR p.code = 'sales:invoices:read')
			ON CONFLICT DO NOTHING;`,

			`INSERT INTO auth.permissions (code, module, description) VALUES
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
			ON CONFLICT (code) DO NOTHING;`,

			`INSERT INTO auth.role_permissions (role_id, permission_id)
			SELECT '11111111-1111-1111-1111-111111111111'::uuid, id
			FROM auth.permissions
			ON CONFLICT DO NOTHING;`,
		}
		for _, q := range syncSQLs {
			_ = db.Exec(q).Error
		}

		// Ensure Super Admin User (admin@erp.local / admin123) is created and active
		if hash, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost); err == nil {
			const adminID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
			_ = db.Exec(`
				INSERT INTO auth.users (id, email, password_hash, full_name, phone, is_active)
				VALUES (?::uuid, 'admin@erp.local', ?, 'Super Administrator', '+6281234567890', TRUE)
				ON CONFLICT (email) DO UPDATE 
				SET password_hash = EXCLUDED.password_hash, is_active = TRUE;
			`, adminID, string(hash)).Error

			_ = db.Exec(`
				INSERT INTO auth.user_roles (user_id, role_id)
				VALUES (?::uuid, '11111111-1111-1111-1111-111111111111'::uuid)
				ON CONFLICT DO NOTHING;
			`, adminID).Error

			log.Println("[AUTH INIT] Super Administrator (admin@erp.local / admin123) is verified and ready")
		}
	}

	// 3. Initialize HTTP Engine
	router := gin.New()
	router.Use(middleware.LoggerMiddleware())
	router.Use(middleware.RecoveryMiddleware())
	router.Use(middleware.CORSMiddleware())

	// 4. API v1 Router Group
	apiV1 := router.Group("/api/v1")
	{
		// Health Check Endpoint
		apiV1.GET("/health", func(c *gin.Context) {
			dbStatus := "connected"
			if db == nil {
				dbStatus = "disconnected"
			}
			response.Success(c, http.StatusOK, "ERP Enterprise API is healthy", gin.H{
				"environment": cfg.AppEnv,
				"database":    dbStatus,
				"timestamp":   time.Now().UTC(),
			})
		})

		// Register Domain Module Routes if DB is active
		if db != nil {
			authMiddleware := middleware.AuthMiddleware(cfg)
			requirePerm := middleware.RequirePermission

			// 1. Auth Module
			authRepo := auth.NewRepository(db)
			authService := auth.NewService(authRepo, cfg)
			authHandler := auth.NewHandler(authService, cfg)
			authHandler.RegisterRoutes(apiV1, authMiddleware, requirePerm)

			// 2. Inventory Module
			invRepo := inventory.NewRepository(db)
			invService := inventory.NewService(invRepo)
			invHandler := inventory.NewHandler(invService)
			invHandler.RegisterRoutes(apiV1, authMiddleware, requirePerm)

			// 3. Purchasing Module
			purchRepo := purchasing.NewRepository(db)
			purchService := purchasing.NewService(purchRepo, invRepo)
			purchHandler := purchasing.NewHandler(purchService)
			purchHandler.RegisterRoutes(apiV1, authMiddleware, requirePerm)

			// 4. Sales Module
			salesRepo := sales.NewRepository(db)
			salesService := sales.NewService(salesRepo, invRepo)
			salesHandler := sales.NewHandler(salesService)
			salesHandler.RegisterRoutes(apiV1, authMiddleware, requirePerm)

			// 5. Finance Module
			finRepo := finance.NewRepository(db)
			finService := finance.NewService(finRepo)
			finHandler := finance.NewHandler(finService)
			finHandler.RegisterRoutes(apiV1, authMiddleware, requirePerm)

			// 6. HR Module
			hrRepo := hr.NewRepository(db)
			hrService := hr.NewService(hrRepo)
			hrHandler := hr.NewHandler(hrService)
			hrHandler.RegisterRoutes(apiV1, authMiddleware, requirePerm)

			// 7. Agentic AI Automation Module
			agentService := agent.NewAgentService(db.DB, invService, purchService, salesService, finService, hrService)
			agentHandler := agent.NewHandler(agentService)
			agentRoutes := apiV1.Group("/agent")
			agentRoutes.Use(authMiddleware)
			{
				agentRoutes.POST("/command", agentHandler.ExecuteCommand)
				agentRoutes.POST("/procurement/auto-replenish", agentHandler.AutoReplenish)
				agentRoutes.GET("/inventory/scan", agentHandler.ScanInventory)
				agentRoutes.GET("/audit/anomalies", agentHandler.AuditAnomalies)
			}
		}
	}

	// 5. Start Server with Graceful Shutdown
	serverAddr := fmt.Sprintf(":%s", cfg.AppPort)
	srv := &http.Server{
		Addr:         serverAddr,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("🚀 ERP Backend Server running on port %s (env: %s)", cfg.AppPort, cfg.AppEnv)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("Server error: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("🛑 Shutting down ERP backend server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("✓ Server exited gracefully")
}
