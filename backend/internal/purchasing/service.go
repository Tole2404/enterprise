package purchasing

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
	// Suppliers
	ListSuppliers(ctx context.Context, query PurchasingFilterQuery) ([]Supplier, int64, error)
	GetSupplierByID(ctx context.Context, id uuid.UUID) (*Supplier, error)
	CreateSupplier(ctx context.Context, req CreateSupplierRequest) (*Supplier, error)
	UpdateSupplier(ctx context.Context, id uuid.UUID, req UpdateSupplierRequest) (*Supplier, error)
	DeleteSupplier(ctx context.Context, id uuid.UUID) error

	// Purchase Requests
	ListPR(ctx context.Context, query PurchasingFilterQuery) ([]PurchaseRequest, int64, error)
	GetPRByID(ctx context.Context, id uuid.UUID) (*PurchaseRequest, error)
	CreatePR(ctx context.Context, requesterID uuid.UUID, req CreatePurchaseRequestPayload) (*PurchaseRequest, error)
	ApprovePR(ctx context.Context, id, approverID uuid.UUID, req ApprovalRequest) error

	// Purchase Orders
	ListPO(ctx context.Context, query PurchasingFilterQuery) ([]PurchaseOrder, int64, error)
	GetPOByID(ctx context.Context, id uuid.UUID) (*PurchaseOrder, error)
	CreatePO(ctx context.Context, creatorID uuid.UUID, req CreatePurchaseOrderPayload) (*PurchaseOrder, error)
	ApprovePO(ctx context.Context, id, approverID uuid.UUID, req ApprovalRequest) error
	CancelPO(ctx context.Context, id uuid.UUID) error

	// Goods Receipts
	ListGRN(ctx context.Context, query PurchasingFilterQuery) ([]GoodsReceipt, int64, error)
	GetGRNByID(ctx context.Context, id uuid.UUID) (*GoodsReceipt, error)
	ReceiveGoods(ctx context.Context, receiverID uuid.UUID, req CreateGoodsReceiptPayload) (*GoodsReceipt, error)
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

// ----------------- Supplier Service -----------------
func (s *service) ListSuppliers(ctx context.Context, query PurchasingFilterQuery) ([]Supplier, int64, error) {
	if query.Page <= 0 {
		query.Page = 1
	}
	if query.PerPage <= 0 || query.PerPage > 100 {
		query.PerPage = 10
	}
	return s.repo.FindAllSuppliers(ctx, query)
}

func (s *service) GetSupplierByID(ctx context.Context, id uuid.UUID) (*Supplier, error) {
	supplier, err := s.repo.FindSupplierByID(ctx, id)
	if err != nil || supplier == nil {
		return nil, errors.New("supplier not found")
	}
	return supplier, nil
}

func (s *service) CreateSupplier(ctx context.Context, req CreateSupplierRequest) (*Supplier, error) {
	if req.Code == "" {
		code, err := s.repo.GenerateSupplierCode(ctx)
		if err != nil {
			return nil, err
		}
		req.Code = code
	} else {
		existing, err := s.repo.FindSupplierByCode(ctx, req.Code)
		if err != nil {
			return nil, err
		}
		if existing != nil {
			return nil, fmt.Errorf("supplier with code '%s' already exists", req.Code)
		}
	}

	supplier := &Supplier{
		ID:               uuid.New(),
		Code:             req.Code,
		Name:             req.Name,
		Email:            req.Email,
		Phone:            req.Phone,
		Address:          req.Address,
		PaymentTermsDays: req.PaymentTermsDays,
		IsActive:         true,
	}

	if err := s.repo.CreateSupplier(ctx, supplier); err != nil {
		return nil, err
	}
	return supplier, nil
}

func (s *service) UpdateSupplier(ctx context.Context, id uuid.UUID, req UpdateSupplierRequest) (*Supplier, error) {
	supplier, err := s.repo.FindSupplierByID(ctx, id)
	if err != nil || supplier == nil {
		return nil, errors.New("supplier not found")
	}

	supplier.Name = req.Name
	supplier.Email = req.Email
	supplier.Phone = req.Phone
	supplier.Address = req.Address
	supplier.PaymentTermsDays = req.PaymentTermsDays
	if req.IsActive != nil {
		supplier.IsActive = *req.IsActive
	}

	if err := s.repo.UpdateSupplier(ctx, supplier); err != nil {
		return nil, err
	}
	return supplier, nil
}

func (s *service) DeleteSupplier(ctx context.Context, id uuid.UUID) error {
	return s.repo.DeleteSupplier(ctx, id)
}

// ----------------- Purchase Request Service -----------------
func (s *service) ListPR(ctx context.Context, query PurchasingFilterQuery) ([]PurchaseRequest, int64, error) {
	if query.Page <= 0 {
		query.Page = 1
	}
	if query.PerPage <= 0 || query.PerPage > 100 {
		query.PerPage = 10
	}
	return s.repo.FindAllPR(ctx, query)
}

func (s *service) GetPRByID(ctx context.Context, id uuid.UUID) (*PurchaseRequest, error) {
	pr, err := s.repo.FindPRByID(ctx, id)
	if err != nil || pr == nil {
		return nil, errors.New("purchase request not found")
	}
	return pr, nil
}

func (s *service) CreatePR(ctx context.Context, requesterID uuid.UUID, req CreatePurchaseRequestPayload) (*PurchaseRequest, error) {
	prNo, err := s.repo.GeneratePRNumber(ctx)
	if err != nil {
		return nil, err
	}

	pr := &PurchaseRequest{
		ID:          uuid.New(),
		PRNo:        prNo,
		RequestDate: time.Now().UTC(),
		RequesterID: &requesterID,
		Status:      "SUBMITTED",
		Notes:       req.Notes,
	}

	var items []PurchaseRequestItem
	for _, it := range req.Items {
		pid, err := uuid.Parse(it.ProductID)
		if err != nil {
			return nil, errors.New("invalid product_id in items")
		}
		product, err := s.invRepo.FindProductByID(ctx, pid)
		if err != nil || product == nil {
			return nil, fmt.Errorf("product '%s' not found", it.ProductID)
		}

		items = append(items, PurchaseRequestItem{
			ID:        uuid.New(),
			ProductID: pid,
			Qty:       it.Qty,
			Notes:     it.Notes,
		})
	}

	if err := s.repo.CreatePR(ctx, pr, items); err != nil {
		return nil, err
	}

	return s.repo.FindPRByID(ctx, pr.ID)
}

func (s *service) ApprovePR(ctx context.Context, id, approverID uuid.UUID, req ApprovalRequest) error {
	pr, err := s.repo.FindPRByID(ctx, id)
	if err != nil || pr == nil {
		return errors.New("purchase request not found")
	}
	if pr.Status != "SUBMITTED" {
		return fmt.Errorf("cannot approve/reject PR with current status '%s'", pr.Status)
	}

	return s.repo.UpdatePRStatus(ctx, id, req.Status, approverID)
}

// ----------------- Purchase Order Service -----------------
func (s *service) ListPO(ctx context.Context, query PurchasingFilterQuery) ([]PurchaseOrder, int64, error) {
	if query.Page <= 0 {
		query.Page = 1
	}
	if query.PerPage <= 0 || query.PerPage > 100 {
		query.PerPage = 10
	}
	return s.repo.FindAllPO(ctx, query)
}

func (s *service) GetPOByID(ctx context.Context, id uuid.UUID) (*PurchaseOrder, error) {
	po, err := s.repo.FindPOByID(ctx, id)
	if err != nil || po == nil {
		return nil, errors.New("purchase order not found")
	}
	return po, nil
}

func (s *service) CreatePO(ctx context.Context, creatorID uuid.UUID, req CreatePurchaseOrderPayload) (*PurchaseOrder, error) {
	suppID, err := uuid.Parse(req.SupplierID)
	if err != nil {
		return nil, errors.New("invalid supplier_id format")
	}

	supplier, err := s.repo.FindSupplierByID(ctx, suppID)
	if err != nil || supplier == nil {
		return nil, errors.New("supplier not found")
	}

	var prUUID *uuid.UUID
	if req.PRID != nil && *req.PRID != "" {
		prid, err := uuid.Parse(*req.PRID)
		if err == nil {
			prUUID = &prid
		}
	}

	var expDelivery *time.Time
	if req.ExpectedDeliveryDate != nil && *req.ExpectedDeliveryDate != "" {
		t, err := time.Parse("2006-01-02", *req.ExpectedDeliveryDate)
		if err == nil {
			expDelivery = &t
		}
	}

	poNo, err := s.repo.GeneratePONumber(ctx)
	if err != nil {
		return nil, err
	}

	var subtotal float64
	var items []PurchaseOrderItem

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

		items = append(items, PurchaseOrderItem{
			ID:         uuid.New(),
			ProductID:  pid,
			Qty:        it.Qty,
			UnitPrice:  it.UnitPrice,
			TotalPrice: lineTotal,
		})
	}

	taxAmount := subtotal * (req.TaxPercent / 100.0)
	totalAmount := subtotal + taxAmount

	po := &PurchaseOrder{
		ID:                   uuid.New(),
		PONo:                 poNo,
		PRID:                 prUUID,
		SupplierID:           suppID,
		OrderDate:            time.Now().UTC(),
		ExpectedDeliveryDate: expDelivery,
		Status:               "PENDING_APPROVAL",
		Subtotal:             subtotal,
		TaxAmount:            taxAmount,
		TotalAmount:          totalAmount,
		Notes:                req.Notes,
		CreatedBy:            &creatorID,
	}

	if err := s.repo.CreatePO(ctx, po, items); err != nil {
		return nil, err
	}

	return s.repo.FindPOByID(ctx, po.ID)
}

func (s *service) ApprovePO(ctx context.Context, id, approverID uuid.UUID, req ApprovalRequest) error {
	po, err := s.repo.FindPOByID(ctx, id)
	if err != nil || po == nil {
		return errors.New("purchase order not found")
	}
	if po.Status != "PENDING_APPROVAL" && po.Status != "DRAFT" {
		return fmt.Errorf("cannot approve/reject PO with status '%s'", po.Status)
	}

	return s.repo.UpdatePOStatus(ctx, id, req.Status, &approverID)
}

func (s *service) CancelPO(ctx context.Context, id uuid.UUID) error {
	po, err := s.repo.FindPOByID(ctx, id)
	if err != nil || po == nil {
		return errors.New("purchase order not found")
	}
	if po.Status == "RECEIVED" {
		return errors.New("cannot cancel PO that has already been received")
	}

	return s.repo.UpdatePOStatus(ctx, id, "CANCELLED", nil)
}

// ----------------- Goods Receipt Service (Integrated with Inventory ACID) -----------------
func (s *service) ListGRN(ctx context.Context, query PurchasingFilterQuery) ([]GoodsReceipt, int64, error) {
	if query.Page <= 0 {
		query.Page = 1
	}
	if query.PerPage <= 0 || query.PerPage > 100 {
		query.PerPage = 10
	}
	return s.repo.FindAllGRN(ctx, query)
}

func (s *service) GetGRNByID(ctx context.Context, id uuid.UUID) (*GoodsReceipt, error) {
	grn, err := s.repo.FindGRNByID(ctx, id)
	if err != nil || grn == nil {
		return nil, errors.New("goods receipt not found")
	}
	return grn, nil
}

func (s *service) ReceiveGoods(ctx context.Context, receiverID uuid.UUID, req CreateGoodsReceiptPayload) (*GoodsReceipt, error) {
	poID, err := uuid.Parse(req.POID)
	if err != nil {
		return nil, errors.New("invalid po_id format")
	}
	warehouseID, err := uuid.Parse(req.WarehouseID)
	if err != nil {
		return nil, errors.New("invalid warehouse_id format")
	}

	po, err := s.repo.FindPOByID(ctx, poID)
	if err != nil || po == nil {
		return nil, errors.New("purchase order not found")
	}
	if po.Status != "APPROVED" {
		return nil, fmt.Errorf("cannot receive goods for PO with status '%s' (PO must be APPROVED first)", po.Status)
	}

	warehouse, err := s.invRepo.FindWarehouseByID(ctx, warehouseID)
	if err != nil || warehouse == nil {
		return nil, errors.New("destination warehouse not found")
	}

	grnNo, err := s.repo.GenerateGRNNumber(ctx)
	if err != nil {
		return nil, err
	}

	grn := &GoodsReceipt{
		ID:          uuid.New(),
		GRNNo:       grnNo,
		POID:        poID,
		WarehouseID: warehouseID,
		ReceiptDate: time.Now().UTC(),
		ReceivedBy:  &receiverID,
		Notes:       req.Notes,
	}

	var items []GoodsReceiptItem
	for _, it := range req.Items {
		pid, err := uuid.Parse(it.ProductID)
		if err != nil {
			return nil, errors.New("invalid product_id in receipt items")
		}

		items = append(items, GoodsReceiptItem{
			ID:             uuid.New(),
			ProductID:      pid,
			QtyReceived:    it.QtyReceived,
			Notes:          it.Notes,
		})
	}

	// Execute Goods Receipt & Inventory Stock Increment atomically in 1 Transaction
	err = s.repo.WithTransaction(func(tx *gorm.DB) error {
		// 1. Create GRN and items
		if err := s.repo.CreateGRN(ctx, tx, grn, items); err != nil {
			return err
		}

		// 2. Increase stock for each item in destination warehouse & record stock mutation IN
		for _, it := range items {
			currentStock := 0.0
			reservedStock := 0.0
			stock, err := s.invRepo.GetStock(ctx, warehouseID, it.ProductID)
			if err == nil && stock != nil {
				currentStock = stock.CurrentStock
				reservedStock = stock.ReservedStock
			}
			newStock := currentStock + it.QtyReceived
			if err := s.invRepo.SetStock(ctx, tx, warehouseID, it.ProductID, newStock, reservedStock); err != nil {
				return err
			}

			// Stock Mutation Log
			mutation := &inventory.StockMutation{
				ID:            uuid.New(),
				ProductID:     it.ProductID,
				ToWarehouseID: &warehouseID,
				Qty:           it.QtyReceived,
				MutationType:  "IN",
				ReferenceType: "PURCHASE_ORDER",
				ReferenceID:   &po.ID,
				Notes:         fmt.Sprintf("Goods received via GRN %s for PO %s", grn.GRNNo, po.PONo),
				CreatedBy:     &receiverID,
			}
			if err := s.invRepo.CreateStockMutation(ctx, tx, mutation); err != nil {
				return err
			}
		}

		// 3. Update PO status to RECEIVED
		return s.repo.UpdatePOStatus(ctx, po.ID, "RECEIVED", nil)
	})

	if err != nil {
		return nil, err
	}

	return s.repo.FindGRNByID(ctx, grn.ID)
}
