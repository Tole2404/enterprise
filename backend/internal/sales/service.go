package sales

import (
	"context"
	"errors"
	"fmt"
	"time"

	"erp-backend/internal/inventory"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Service interface {
	// Customers
	ListCustomers(ctx context.Context, query SalesFilterQuery) ([]Customer, int64, error)
	GetCustomerByID(ctx context.Context, id uuid.UUID) (*Customer, error)
	CreateCustomer(ctx context.Context, req CreateCustomerRequest) (*Customer, error)
	UpdateCustomer(ctx context.Context, id uuid.UUID, req UpdateCustomerRequest) (*Customer, error)
	DeleteCustomer(ctx context.Context, id uuid.UUID) error

	// Sales Orders
	ListSO(ctx context.Context, query SalesFilterQuery) ([]SalesOrder, int64, error)
	GetSOByID(ctx context.Context, id uuid.UUID) (*SalesOrder, error)
	CreateSO(ctx context.Context, creatorID uuid.UUID, req CreateSalesOrderPayload) (*SalesOrder, error)
	CancelSO(ctx context.Context, id uuid.UUID) error

	// Delivery Orders (Integrated with Inventory deduction & Auto Invoice)
	ListDO(ctx context.Context, query SalesFilterQuery) ([]DeliveryOrder, int64, error)
	GetDOByID(ctx context.Context, id uuid.UUID) (*DeliveryOrder, error)
	DeliverGoods(ctx context.Context, shipperID uuid.UUID, req CreateDeliveryOrderPayload) (*DeliveryOrder, error)

	// Invoices & Payments
	ListInvoices(ctx context.Context, query SalesFilterQuery) ([]SalesInvoice, int64, error)
	GetInvoiceByID(ctx context.Context, id uuid.UUID) (*SalesInvoice, error)
	RecordPayment(ctx context.Context, invoiceID uuid.UUID, req RecordPaymentPayload) (*SalesInvoice, error)
}

type service struct {
	repo    Repository
	invRepo inventory.Repository
}

func NewService(repo Repository, invRepo inventory.Repository) Service {
	return &service{
		repo:    repo,
		invRepo: invRepo,
	}
}

// ----------------- Customer Service -----------------
func (s *service) ListCustomers(ctx context.Context, query SalesFilterQuery) ([]Customer, int64, error) {
	if query.Page <= 0 {
		query.Page = 1
	}
	if query.PerPage <= 0 || query.PerPage > 100 {
		query.PerPage = 10
	}
	return s.repo.FindAllCustomers(ctx, query)
}

func (s *service) GetCustomerByID(ctx context.Context, id uuid.UUID) (*Customer, error) {
	customer, err := s.repo.FindCustomerByID(ctx, id)
	if err != nil || customer == nil {
		return nil, errors.New("customer not found")
	}
	return customer, nil
}

func (s *service) CreateCustomer(ctx context.Context, req CreateCustomerRequest) (*Customer, error) {
	if req.Code == "" {
		code, err := s.repo.GenerateCustomerCode(ctx)
		if err != nil {
			return nil, err
		}
		req.Code = code
	} else {
		existing, err := s.repo.FindCustomerByCode(ctx, req.Code)
		if err != nil {
			return nil, err
		}
		if existing != nil {
			return nil, fmt.Errorf("customer with code '%s' already exists", req.Code)
		}
	}

	customer := &Customer{
		ID:       uuid.New(),
		Code:     req.Code,
		Name:     req.Name,
		Email:    req.Email,
		Phone:    req.Phone,
		Address:  req.Address,
		IsActive: true,
	}

	if err := s.repo.CreateCustomer(ctx, customer); err != nil {
		return nil, err
	}
	return customer, nil
}

func (s *service) UpdateCustomer(ctx context.Context, id uuid.UUID, req UpdateCustomerRequest) (*Customer, error) {
	c, err := s.repo.FindCustomerByID(ctx, id)
	if err != nil || c == nil {
		return nil, errors.New("customer not found")
	}

	c.Name = req.Name
	c.Email = req.Email
	c.Phone = req.Phone
	c.Address = req.Address
	if req.IsActive != nil {
		c.IsActive = *req.IsActive
	}

	if err := s.repo.UpdateCustomer(ctx, c); err != nil {
		return nil, err
	}
	return c, nil
}

func (s *service) DeleteCustomer(ctx context.Context, id uuid.UUID) error {
	return s.repo.DeleteCustomer(ctx, id)
}

// ----------------- Sales Order Service -----------------
func (s *service) ListSO(ctx context.Context, query SalesFilterQuery) ([]SalesOrder, int64, error) {
	if query.Page <= 0 {
		query.Page = 1
	}
	if query.PerPage <= 0 || query.PerPage > 100 {
		query.PerPage = 10
	}
	return s.repo.FindAllSO(ctx, query)
}

func (s *service) GetSOByID(ctx context.Context, id uuid.UUID) (*SalesOrder, error) {
	so, err := s.repo.FindSOByID(ctx, id)
	if err != nil || so == nil {
		return nil, errors.New("sales order not found")
	}
	return so, nil
}

func (s *service) CreateSO(ctx context.Context, creatorID uuid.UUID, req CreateSalesOrderPayload) (*SalesOrder, error) {
	custID, err := uuid.Parse(req.CustomerID)
	if err != nil {
		return nil, errors.New("invalid customer_id format")
	}

	customer, err := s.repo.FindCustomerByID(ctx, custID)
	if err != nil || customer == nil {
		return nil, errors.New("customer not found")
	}

	soNo, err := s.repo.GenerateSONumber(ctx)
	if err != nil {
		return nil, err
	}

	var subtotal float64
	var items []SalesOrderItem

	for _, it := range req.Items {
		pid, err := uuid.Parse(it.ProductID)
		if err != nil {
			return nil, errors.New("invalid product_id in items")
		}
		product, err := s.invRepo.FindProductByID(ctx, pid)
		if err != nil || product == nil {
			return nil, fmt.Errorf("product '%s' not found", it.ProductID)
		}

		lineTotal := it.Qty * it.UnitPrice
		subtotal += lineTotal

		items = append(items, SalesOrderItem{
			ID:         uuid.New(),
			ProductID:  pid,
			Qty:        it.Qty,
			UnitPrice:  it.UnitPrice,
			TotalPrice: lineTotal,
		})
	}

	taxAmount := subtotal * (req.TaxPercent / 100.0)
	totalAmount := subtotal + taxAmount

	so := &SalesOrder{
		ID:          uuid.New(),
		SONo:        soNo,
		OrderNo:     soNo,
		CustomerID:  custID,
		OrderDate:   time.Now().UTC(),
		Status:      "CONFIRMED",
		Subtotal:    subtotal,
		TaxAmount:   taxAmount,
		TotalAmount: totalAmount,
		Notes:       req.Notes,
		CreatedBy:   &creatorID,
	}

	if err := s.repo.CreateSO(ctx, so, items); err != nil {
		return nil, err
	}

	return s.repo.FindSOByID(ctx, so.ID)
}

func (s *service) CancelSO(ctx context.Context, id uuid.UUID) error {
	so, err := s.repo.FindSOByID(ctx, id)
	if err != nil || so == nil {
		return errors.New("sales order not found")
	}
	if so.Status == "SHIPPED" || so.Status == "PAID" {
		return errors.New("cannot cancel a sales order that has already been shipped or paid")
	}
	return s.repo.UpdateSOStatus(ctx, id, "CANCELLED")
}

// ----------------- Delivery Order (Integrated with Inventory ACID) -----------------
func (s *service) ListDO(ctx context.Context, query SalesFilterQuery) ([]DeliveryOrder, int64, error) {
	if query.Page <= 0 {
		query.Page = 1
	}
	if query.PerPage <= 0 || query.PerPage > 100 {
		query.PerPage = 10
	}
	return s.repo.FindAllDO(ctx, query)
}

func (s *service) GetDOByID(ctx context.Context, id uuid.UUID) (*DeliveryOrder, error) {
	do, err := s.repo.FindDOByID(ctx, id)
	if err != nil || do == nil {
		return nil, errors.New("delivery order not found")
	}
	return do, nil
}

func (s *service) DeliverGoods(ctx context.Context, shipperID uuid.UUID, req CreateDeliveryOrderPayload) (*DeliveryOrder, error) {
	soID, err := uuid.Parse(req.SOID)
	if err != nil {
		return nil, errors.New("invalid so_id format")
	}
	warehouseID, err := uuid.Parse(req.WarehouseID)
	if err != nil {
		return nil, errors.New("invalid warehouse_id format")
	}

	so, err := s.repo.FindSOByID(ctx, soID)
	if err != nil || so == nil {
		return nil, errors.New("sales order not found")
	}
	if so.Status != "CONFIRMED" {
		return nil, fmt.Errorf("cannot ship sales order with status '%s' (SO must be CONFIRMED)", so.Status)
	}

	warehouse, err := s.invRepo.FindWarehouseByID(ctx, warehouseID)
	if err != nil || warehouse == nil {
		return nil, errors.New("origin warehouse not found")
	}

	doNo, err := s.repo.GenerateDONumber(ctx)
	if err != nil {
		return nil, err
	}

	do := &DeliveryOrder{
		ID:           uuid.New(),
		DONo:         doNo,
		SOID:         soID,
		WarehouseID:  warehouseID,
		DeliveryDate: time.Now().UTC(),
		ShippedBy:    &shipperID,
		Notes:        req.Notes,
	}

	// Atomically deduct inventory stocks, log mutation OUT, create Delivery Order, update SO, & create Sales Invoice
	err = s.repo.WithTransaction(func(tx *gorm.DB) error {
		// 1. Create Delivery Order
		if err := s.repo.CreateDO(ctx, tx, do); err != nil {
			return err
		}

		// 2. For each item in SO: verify stock and deduct from warehouse_stocks
		for _, it := range so.Items {
			stock, err := s.invRepo.GetStock(ctx, warehouseID, it.ProductID)
			if err != nil {
				return err
			}
			if stock == nil || (stock.CurrentStock-stock.ReservedStock) < it.Qty {
				available := 0.0
				if stock != nil {
					available = stock.CurrentStock - stock.ReservedStock
				}
				return fmt.Errorf("insufficient stock for product in warehouse (available: %.2f, required: %.2f)", available, it.Qty)
			}

			newStock := stock.CurrentStock - it.Qty
			if err := s.invRepo.SetStock(ctx, tx, warehouseID, it.ProductID, newStock, stock.ReservedStock); err != nil {
				return err
			}

			// Mutation Log OUT
			mutation := &inventory.StockMutation{
				ID:              uuid.New(),
				ProductID:       it.ProductID,
				FromWarehouseID: &warehouseID,
				Qty:             it.Qty,
				MutationType:    "OUT",
				ReferenceType:   "SALES_ORDER",
				ReferenceID:     &so.ID,
				Notes:           fmt.Sprintf("Shipped via Delivery Order %s for SO %s", do.DONo, so.SONo),
				CreatedBy:       &shipperID,
			}
			if err := s.invRepo.CreateStockMutation(ctx, tx, mutation); err != nil {
				return err
			}
		}

		// 3. Update SO Status to SHIPPED
		if err := tx.WithContext(ctx).Model(&SalesOrder{}).Where("id = ?", so.ID).Update("status", "SHIPPED").Error; err != nil {
			return err
		}

		// 4. Auto-generate Sales Invoice
		invNo, err := s.repo.GenerateInvoiceNumber(ctx)
		if err != nil {
			return err
		}

		inv := &SalesInvoice{
			ID:          uuid.New(),
			InvoiceNo:   invNo,
			SOID:        so.ID,
			InvoiceDate: time.Now().UTC(),
			DueDate:     time.Now().UTC().AddDate(0, 0, 30),
			TotalAmount: so.TotalAmount,
			PaidAmount:  0,
			Status:      "UNPAID",
		}

		return s.repo.CreateInvoice(ctx, tx, inv)
	})

	if err != nil {
		return nil, err
	}

	return s.repo.FindDOByID(ctx, do.ID)
}

// ----------------- Invoices & Payments -----------------
func (s *service) ListInvoices(ctx context.Context, query SalesFilterQuery) ([]SalesInvoice, int64, error) {
	if query.Page <= 0 {
		query.Page = 1
	}
	if query.PerPage <= 0 || query.PerPage > 100 {
		query.PerPage = 10
	}
	return s.repo.FindAllInvoices(ctx, query)
}

func (s *service) GetInvoiceByID(ctx context.Context, id uuid.UUID) (*SalesInvoice, error) {
	inv, err := s.repo.FindInvoiceByID(ctx, id)
	if err != nil || inv == nil {
		return nil, errors.New("invoice not found")
	}
	return inv, nil
}

func (s *service) RecordPayment(ctx context.Context, invoiceID uuid.UUID, req RecordPaymentPayload) (*SalesInvoice, error) {
	inv, err := s.repo.FindInvoiceByID(ctx, invoiceID)
	if err != nil || inv == nil {
		return nil, errors.New("invoice not found")
	}

	newPaid := inv.PaidAmount + req.Amount
	newStatus := "PARTIAL"
	if newPaid >= inv.TotalAmount {
		newStatus = "PAID"
		newPaid = inv.TotalAmount
		// Mark SO as PAID
		_ = s.repo.UpdateSOStatus(ctx, inv.SOID, "PAID")
	}

	if err := s.repo.UpdateInvoicePayment(ctx, invoiceID, newPaid, newStatus); err != nil {
		return nil, err
	}

	return s.repo.FindInvoiceByID(ctx, invoiceID)
}
