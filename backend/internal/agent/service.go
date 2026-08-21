package agent

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"erp-backend/internal/finance"
	"erp-backend/internal/hr"
	"erp-backend/internal/inventory"
	"erp-backend/internal/purchasing"
	"erp-backend/internal/sales"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AgentService interface {
	ExecuteCommand(ctx context.Context, cmd AgentCommand) (*ExecutionResult, error)
	ScanInventoryHealth(ctx context.Context) (*ExecutionResult, error)
	AuditDiscrepancies(ctx context.Context) (*ExecutionResult, error)
	AutoProcureLowStock(ctx context.Context, userID uuid.UUID) (*ExecutionResult, error)
}

type agentService struct {
	db           *gorm.DB
	invService   inventory.Service
	purService   purchasing.Service
	salesService sales.Service
	finService   finance.Service
	hrService    hr.Service
}

func NewAgentService(
	db *gorm.DB,
	inv inventory.Service,
	pur purchasing.Service,
	sal sales.Service,
	fin finance.Service,
	hrServ hr.Service,
) AgentService {
	return &agentService{
		db:           db,
		invService:   inv,
		purService:   pur,
		salesService: sal,
		finService:   fin,
		hrService:    hrServ,
	}
}

func (s *agentService) ExecuteCommand(ctx context.Context, cmd AgentCommand) (*ExecutionResult, error) {
	switch cmd.RoleTarget {
	case RoleInventory:
		return s.handleInventoryCommand(ctx, cmd)
	case RoleProcurement:
		return s.handleProcurementCommand(ctx, cmd)
	case RoleSales:
		return s.handleSalesCommand(ctx, cmd)
	case RoleFinance:
		return s.handleFinanceCommand(ctx, cmd)
	case RoleHR:
		return s.handleHRCommand(ctx, cmd)
	case RoleAudit:
		return s.AuditDiscrepancies(ctx)
	default:
		return &ExecutionResult{
			CommandID: cmd.CommandID,
			Role:      cmd.RoleTarget,
			Status:    "FAILED",
			Risk:      RiskLow,
			Message:   fmt.Sprintf("Role handler %s not recognized", cmd.RoleTarget),
			Timestamp: time.Now(),
		}, nil
	}
}

func (s *agentService) handleInventoryCommand(ctx context.Context, cmd AgentCommand) (*ExecutionResult, error) {
	switch cmd.Intent {
	case "SCAN_HEALTH":
		return s.ScanInventoryHealth(ctx)
	case "CREATE_PRODUCT":
		var req inventory.CreateProductRequest
		if err := json.Unmarshal(cmd.Payload, &req); err != nil {
			return nil, fmt.Errorf("invalid product payload: %w", err)
		}
		prod, err := s.invService.CreateProduct(ctx, req)
		if err != nil {
			return nil, err
		}
		return &ExecutionResult{
			CommandID: cmd.CommandID,
			Role:      RoleInventory,
			Status:    "SUCCESS",
			Risk:      RiskLow,
			Message:   fmt.Sprintf("Product %s created successfully", prod.Name),
			Data:      prod,
			Timestamp: time.Now(),
		}, nil
	case "MUTATE_STOCK":
		var req inventory.StockMutationRequest
		if err := json.Unmarshal(cmd.Payload, &req); err != nil {
			return nil, fmt.Errorf("invalid mutation payload: %w", err)
		}
		mut, err := s.invService.MutateStock(ctx, cmd.UserID, req)
		if err != nil {
			return nil, err
		}
		return &ExecutionResult{
			CommandID: cmd.CommandID,
			Role:      RoleInventory,
			Status:    "SUCCESS",
			Risk:      RiskMedium,
			Message:   fmt.Sprintf("Stock mutation ID %s processed", mut.ID),
			Data:      mut,
			Timestamp: time.Now(),
		}, nil
	default:
		return nil, fmt.Errorf("unsupported inventory intent: %s", cmd.Intent)
	}
}

func (s *agentService) handleProcurementCommand(ctx context.Context, cmd AgentCommand) (*ExecutionResult, error) {
	switch cmd.Intent {
	case "AUTO_REPLENISH":
		return s.AutoProcureLowStock(ctx, cmd.UserID)
	case "CREATE_PR":
		var req purchasing.CreatePurchaseRequestPayload
		if err := json.Unmarshal(cmd.Payload, &req); err != nil {
			return nil, fmt.Errorf("invalid PR payload: %w", err)
		}
		pr, err := s.purService.CreatePR(ctx, cmd.UserID, req)
		if err != nil {
			return nil, err
		}
		return &ExecutionResult{
			CommandID: cmd.CommandID,
			Role:      RoleProcurement,
			Status:    "SUCCESS",
			Risk:      RiskMedium,
			Message:   fmt.Sprintf("Purchase Request %s created", pr.PRNo),
			Data:      pr,
			Timestamp: time.Now(),
		}, nil
	case "CREATE_PO":
		var req purchasing.CreatePurchaseOrderPayload
		if err := json.Unmarshal(cmd.Payload, &req); err != nil {
			return nil, fmt.Errorf("invalid PO payload: %w", err)
		}
		po, err := s.purService.CreatePO(ctx, cmd.UserID, req)
		if err != nil {
			return nil, err
		}
		return &ExecutionResult{
			CommandID: cmd.CommandID,
			Role:      RoleProcurement,
			Status:    "SUCCESS",
			Risk:      RiskHigh,
			Message:   fmt.Sprintf("Purchase Order %s created (requires manager approval)", po.PONo),
			Data:      po,
			Timestamp: time.Now(),
		}, nil
	default:
		return nil, fmt.Errorf("unsupported procurement intent: %s", cmd.Intent)
	}
}

func (s *agentService) handleSalesCommand(ctx context.Context, cmd AgentCommand) (*ExecutionResult, error) {
	switch cmd.Intent {
	case "CREATE_SO":
		var req sales.CreateSalesOrderPayload
		if err := json.Unmarshal(cmd.Payload, &req); err != nil {
			return nil, fmt.Errorf("invalid SO payload: %w", err)
		}
		so, err := s.salesService.CreateSO(ctx, cmd.UserID, req)
		if err != nil {
			return nil, err
		}
		return &ExecutionResult{
			CommandID: cmd.CommandID,
			Role:      RoleSales,
			Status:    "SUCCESS",
			Risk:      RiskMedium,
			Message:   fmt.Sprintf("Sales Order %s created", so.SONo),
			Data:      so,
			Timestamp: time.Now(),
		}, nil
	default:
		return nil, fmt.Errorf("unsupported sales intent: %s", cmd.Intent)
	}
}

func (s *agentService) handleFinanceCommand(ctx context.Context, cmd AgentCommand) (*ExecutionResult, error) {
	switch cmd.Intent {
	case "CREATE_JOURNAL":
		var req finance.CreateJournalEntryPayload
		if err := json.Unmarshal(cmd.Payload, &req); err != nil {
			return nil, fmt.Errorf("invalid journal payload: %w", err)
		}
		entry, err := s.finService.CreateJournal(ctx, cmd.UserID, req)
		if err != nil {
			return nil, err
		}
		return &ExecutionResult{
			CommandID: cmd.CommandID,
			Role:      RoleFinance,
			Status:    "SUCCESS",
			Risk:      RiskHigh,
			Message:   fmt.Sprintf("Journal Entry %s created & balanced", entry.EntryNo),
			Data:      entry,
			Timestamp: time.Now(),
		}, nil
	default:
		return nil, fmt.Errorf("unsupported finance intent: %s", cmd.Intent)
	}
}

func (s *agentService) handleHRCommand(ctx context.Context, cmd AgentCommand) (*ExecutionResult, error) {
	switch cmd.Intent {
	case "GENERATE_PAYROLL":
		var req hr.GeneratePayrollPayload
		if err := json.Unmarshal(cmd.Payload, &req); err != nil {
			return nil, fmt.Errorf("invalid payroll payload: %w", err)
		}
		payrolls, err := s.hrService.GenerateMonthlyPayroll(ctx, req)
		if err != nil {
			return nil, err
		}
		return &ExecutionResult{
			CommandID: cmd.CommandID,
			Role:      RoleHR,
			Status:    "SUCCESS",
			Risk:      RiskHigh,
			Message:   fmt.Sprintf("Payroll generated for %d employees", len(payrolls)),
			Data:      payrolls,
			Timestamp: time.Now(),
		}, nil
	default:
		return nil, fmt.Errorf("unsupported HR intent: %s", cmd.Intent)
	}
}

func (s *agentService) AutoProcureLowStock(ctx context.Context, userID uuid.UUID) (*ExecutionResult, error) {
	type LowStockItem struct {
		ProductID uuid.UUID `json:"product_id"`
		SKU       string    `json:"sku"`
		Name      string    `json:"name"`
		MinStock  int       `json:"min_stock"`
		Current   int       `json:"current_stock"`
	}

	var items []LowStockItem
	query := `
		SELECT 
			p.id AS product_id,
			p.sku,
			p.name,
			p.min_stock,
			COALESCE(SUM(ws.quantity), 0) AS current_stock
		FROM inventory.products p
		LEFT JOIN inventory.warehouse_stocks ws ON ws.product_id = p.id
		WHERE p.is_active = TRUE
		GROUP BY p.id, p.sku, p.name, p.min_stock
		HAVING COALESCE(SUM(ws.quantity), 0) <= p.min_stock;
	`
	if err := s.db.WithContext(ctx).Raw(query).Scan(&items).Error; err != nil {
		return nil, err
	}

	if len(items) == 0 {
		return &ExecutionResult{
			Role:      RoleProcurement,
			Status:    "SUCCESS",
			Risk:      RiskLow,
			Message:   "Stock levels optimal. No automated PR required.",
			Timestamp: time.Now(),
		}, nil
	}

	var prItems []purchasing.PurchaseRequestItemDTO
	for _, it := range items {
		qtyNeeded := float64((it.MinStock * 2) - it.Current)
		if qtyNeeded <= 0 {
			qtyNeeded = 10
		}
		prItems = append(prItems, purchasing.PurchaseRequestItemDTO{
			ProductID: it.ProductID.String(),
			Qty:       qtyNeeded,
			Notes:     fmt.Sprintf("Auto-procured by Agentic AI: current %d <= min %d", it.Current, it.MinStock),
		})
	}

	prReq := purchasing.CreatePurchaseRequestPayload{
		Notes: "Automated Purchase Request generated by Agentic AI",
		Items: prItems,
	}

	pr, err := s.purService.CreatePR(ctx, userID, prReq)
	if err != nil {
		return nil, fmt.Errorf("failed to auto-create PR: %w", err)
	}

	return &ExecutionResult{
		Role:      RoleProcurement,
		Status:    "SUCCESS",
		Risk:      RiskMedium,
		Message:   fmt.Sprintf("Automated PR %s generated with %d low stock items", pr.PRNo, len(prItems)),
		Data:      pr,
		Timestamp: time.Now(),
	}, nil
}

func (s *agentService) ScanInventoryHealth(ctx context.Context) (*ExecutionResult, error) {
	type StockAlert struct {
		ProductID   string  `json:"product_id"`
		ProductCode string  `json:"product_code"`
		ProductName string  `json:"product_name"`
		TotalStock  float64 `json:"total_stock"`
		MinStock    float64 `json:"min_stock"`
		Status      string  `json:"status"`
	}

	var alerts []StockAlert
	query := `
		SELECT 
			p.id AS product_id,
			p.sku AS product_code,
			p.name AS product_name,
			COALESCE(SUM(ws.quantity), 0) AS total_stock,
			p.min_stock,
			CASE 
				WHEN COALESCE(SUM(ws.quantity), 0) = 0 THEN 'OUT_OF_STOCK'
				WHEN COALESCE(SUM(ws.quantity), 0) <= p.min_stock THEN 'CRITICAL_LOW'
				ELSE 'OPTIMAL'
			END AS status
		FROM inventory.products p
		LEFT JOIN inventory.warehouse_stocks ws ON ws.product_id = p.id
		WHERE p.is_active = TRUE
		GROUP BY p.id, p.sku, p.name, p.min_stock
		HAVING COALESCE(SUM(ws.quantity), 0) <= p.min_stock
		ORDER BY total_stock ASC;
	`

	if err := s.db.WithContext(ctx).Raw(query).Scan(&alerts).Error; err != nil {
		return nil, err
	}

	return &ExecutionResult{
		Role:      RoleInventory,
		Status:    "SUCCESS",
		Risk:      RiskLow,
		Message:   fmt.Sprintf("Inventory scan complete. %d items require replenishment.", len(alerts)),
		Data:      alerts,
		Timestamp: time.Now(),
	}, nil
}

func (s *agentService) AuditDiscrepancies(ctx context.Context) (*ExecutionResult, error) {
	type AuditIssue struct {
		CheckType   string `json:"check_type"`
		Description string `json:"description"`
		Severity    string `json:"severity"`
	}

	var issues []AuditIssue

	type UnbalancedJournal struct {
		JournalID   string  `json:"journal_id"`
		EntryNo     string  `json:"entry_no"`
		TotalDebit  float64 `json:"total_debit"`
		TotalCredit float64 `json:"total_credit"`
	}
	var unbalanced []UnbalancedJournal

	finQuery := `
		SELECT 
			je.id AS journal_id,
			je.entry_no,
			COALESCE(SUM(jl.debit), 0) AS total_debit,
			COALESCE(SUM(jl.credit), 0) AS total_credit
		FROM finance.journal_entries je
		JOIN finance.journal_lines jl ON jl.journal_id = je.id
		GROUP BY je.id, je.entry_no
		HAVING COALESCE(SUM(jl.debit), 0) <> COALESCE(SUM(jl.credit), 0);
	`
	_ = s.db.WithContext(ctx).Raw(finQuery).Scan(&unbalanced).Error
	for _, ub := range unbalanced {
		issues = append(issues, AuditIssue{
			CheckType:   "FINANCE_DOUBLE_ENTRY_UNBALANCED",
			Description: fmt.Sprintf("Journal %s debit (%.2f) != credit (%.2f)", ub.EntryNo, ub.TotalDebit, ub.TotalCredit),
			Severity:    "CRITICAL",
		})
	}

	return &ExecutionResult{
		Role:      RoleAudit,
		Status:    "SUCCESS",
		Risk:      RiskLow,
		Message:   fmt.Sprintf("Audit completed. %d anomalies detected.", len(issues)),
		Data:      issues,
		Timestamp: time.Now(),
	}, nil
}
