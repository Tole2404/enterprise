package purchasing

import (
	"context"
	"errors"
	"fmt"
	"time"

	"erp-backend/pkg/database"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Repository interface {
	// Suppliers
	FindAllSuppliers(ctx context.Context, query PurchasingFilterQuery) ([]Supplier, int64, error)
	FindSupplierByID(ctx context.Context, id uuid.UUID) (*Supplier, error)
	FindSupplierByCode(ctx context.Context, code string) (*Supplier, error)
	CreateSupplier(ctx context.Context, supplier *Supplier) error
	UpdateSupplier(ctx context.Context, supplier *Supplier) error
	DeleteSupplier(ctx context.Context, id uuid.UUID) error
	GenerateSupplierCode(ctx context.Context) (string, error)

	// Purchase Requests
	FindAllPR(ctx context.Context, query PurchasingFilterQuery) ([]PurchaseRequest, int64, error)
	FindPRByID(ctx context.Context, id uuid.UUID) (*PurchaseRequest, error)
	CreatePR(ctx context.Context, pr *PurchaseRequest, items []PurchaseRequestItem) error
	UpdatePRStatus(ctx context.Context, id uuid.UUID, status string, approverID uuid.UUID) error
	GeneratePRNumber(ctx context.Context) (string, error)

	// Purchase Orders
	FindAllPO(ctx context.Context, query PurchasingFilterQuery) ([]PurchaseOrder, int64, error)
	FindPOByID(ctx context.Context, id uuid.UUID) (*PurchaseOrder, error)
	CreatePO(ctx context.Context, po *PurchaseOrder, items []PurchaseOrderItem) error
	UpdatePOStatus(ctx context.Context, id uuid.UUID, status string, approverID *uuid.UUID) error
	GeneratePONumber(ctx context.Context) (string, error)

	// Goods Receipts
	FindAllGRN(ctx context.Context, query PurchasingFilterQuery) ([]GoodsReceipt, int64, error)
	FindGRNByID(ctx context.Context, id uuid.UUID) (*GoodsReceipt, error)
	CreateGRN(ctx context.Context, tx *gorm.DB, grn *GoodsReceipt, items []GoodsReceiptItem) error
	GenerateGRNNumber(ctx context.Context) (string, error)

	// DB Transaction Helper
	WithTransaction(fn func(tx *gorm.DB) error) error
}

type repository struct {
	db *database.DB
}

func NewRepository(db *database.DB) Repository {
	return &repository{db: db}
}

func (r *repository) WithTransaction(fn func(tx *gorm.DB) error) error {
	return r.db.WithTransaction(fn)
}

// ----------------- Suppliers -----------------
func (r *repository) FindAllSuppliers(ctx context.Context, query PurchasingFilterQuery) ([]Supplier, int64, error) {
	var suppliers []Supplier
	var total int64

	dbQuery := r.db.WithContext(ctx).Model(&Supplier{})
	if query.Search != "" {
		pat := "%" + query.Search + "%"
		dbQuery = dbQuery.Where("name ILIKE ? OR code ILIKE ? OR email ILIKE ?", pat, pat, pat)
	}

	if err := dbQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (query.Page - 1) * query.PerPage
	err := dbQuery.Order("name ASC").Offset(offset).Limit(query.PerPage).Find(&suppliers).Error
	return suppliers, total, err
}

func (r *repository) FindSupplierByID(ctx context.Context, id uuid.UUID) (*Supplier, error) {
	var s Supplier
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&s).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &s, nil
}

func (r *repository) FindSupplierByCode(ctx context.Context, code string) (*Supplier, error) {
	var s Supplier
	err := r.db.WithContext(ctx).Where("code = ?", code).First(&s).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &s, nil
}

func (r *repository) CreateSupplier(ctx context.Context, supplier *Supplier) error {
	return r.db.WithContext(ctx).Create(supplier).Error
}

func (r *repository) UpdateSupplier(ctx context.Context, supplier *Supplier) error {
	return r.db.WithContext(ctx).Save(supplier).Error
}

func (r *repository) DeleteSupplier(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Model(&Supplier{}).Where("id = ?", id).Update("is_active", false).Error
}

func (r *repository) GenerateSupplierCode(ctx context.Context) (string, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&Supplier{}).Count(&count).Error
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("SUPP-%04d", count+1), nil
}

// ----------------- Purchase Requests -----------------
func (r *repository) FindAllPR(ctx context.Context, query PurchasingFilterQuery) ([]PurchaseRequest, int64, error) {
	var prs []PurchaseRequest
	var total int64

	dbQuery := r.db.WithContext(ctx).Model(&PurchaseRequest{})
	if query.Search != "" {
		pat := "%" + query.Search + "%"
		dbQuery = dbQuery.Where("pr_no ILIKE ?", pat)
	}
	if query.Status != "" {
		dbQuery = dbQuery.Where("status = ?", query.Status)
	}

	if err := dbQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (query.Page - 1) * query.PerPage
	err := dbQuery.Preload("Requester").
		Preload("Approver").
		Preload("Items.Product").
		Order("created_at DESC").
		Offset(offset).
		Limit(query.PerPage).
		Find(&prs).Error

	return prs, total, err
}

func (r *repository) FindPRByID(ctx context.Context, id uuid.UUID) (*PurchaseRequest, error) {
	var pr PurchaseRequest
	err := r.db.WithContext(ctx).
		Preload("Requester").
		Preload("Approver").
		Preload("Items.Product.Unit").
		Where("id = ?", id).
		First(&pr).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &pr, nil
}

func (r *repository) CreatePR(ctx context.Context, pr *PurchaseRequest, items []PurchaseRequestItem) error {
	return r.db.WithTransaction(func(tx *gorm.DB) error {
		if err := tx.WithContext(ctx).Create(pr).Error; err != nil {
			return err
		}
		for i := range items {
			items[i].PRID = pr.ID
			if err := tx.WithContext(ctx).Create(&items[i]).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *repository) UpdatePRStatus(ctx context.Context, id uuid.UUID, status string, approverID uuid.UUID) error {
	now := time.Now().UTC()
	return r.db.WithContext(ctx).Model(&PurchaseRequest{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":      status,
		"approved_by": approverID,
		"approved_at": now,
	}).Error
}

func (r *repository) GeneratePRNumber(ctx context.Context) (string, error) {
	var count int64
	todayPrefix := fmt.Sprintf("PR-%s-", time.Now().Format("20060102"))
	err := r.db.WithContext(ctx).Model(&PurchaseRequest{}).Where("pr_no LIKE ?", todayPrefix+"%").Count(&count).Error
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%s%04d", todayPrefix, count+1), nil
}

// ----------------- Purchase Orders -----------------
func (r *repository) FindAllPO(ctx context.Context, query PurchasingFilterQuery) ([]PurchaseOrder, int64, error) {
	var pos []PurchaseOrder
	var total int64

	dbQuery := r.db.WithContext(ctx).Model(&PurchaseOrder{})
	if query.Search != "" {
		pat := "%" + query.Search + "%"
		dbQuery = dbQuery.Where("po_no ILIKE ?", pat)
	}
	if query.Status != "" {
		dbQuery = dbQuery.Where("status = ?", query.Status)
	}
	if query.SupplierID != "" {
		dbQuery = dbQuery.Where("supplier_id = ?", query.SupplierID)
	}

	if err := dbQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (query.Page - 1) * query.PerPage
	err := dbQuery.Preload("Supplier").
		Preload("Creator").
		Preload("Approver").
		Preload("Items.Product.Unit").
		Order("created_at DESC").
		Offset(offset).
		Limit(query.PerPage).
		Find(&pos).Error

	return pos, total, err
}

func (r *repository) FindPOByID(ctx context.Context, id uuid.UUID) (*PurchaseOrder, error) {
	var po PurchaseOrder
	err := r.db.WithContext(ctx).
		Preload("Supplier").
		Preload("PurchaseRequest").
		Preload("Creator").
		Preload("Approver").
		Preload("Items.Product.Unit").
		Where("id = ?", id).
		First(&po).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &po, nil
}

func (r *repository) CreatePO(ctx context.Context, po *PurchaseOrder, items []PurchaseOrderItem) error {
	return r.db.WithTransaction(func(tx *gorm.DB) error {
		if err := tx.WithContext(ctx).Create(po).Error; err != nil {
			return err
		}
		for i := range items {
			items[i].POID = po.ID
			if err := tx.WithContext(ctx).Create(&items[i]).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *repository) UpdatePOStatus(ctx context.Context, id uuid.UUID, status string, approverID *uuid.UUID) error {
	updates := map[string]interface{}{
		"status": status,
	}
	if approverID != nil {
		updates["approved_by"] = *approverID
		now := time.Now().UTC()
		updates["approved_at"] = now
	}
	return r.db.WithContext(ctx).Model(&PurchaseOrder{}).Where("id = ?", id).Updates(updates).Error
}

func (r *repository) GeneratePONumber(ctx context.Context) (string, error) {
	var count int64
	todayPrefix := fmt.Sprintf("PO-%s-", time.Now().Format("20060102"))
	err := r.db.WithContext(ctx).Model(&PurchaseOrder{}).Where("po_no LIKE ?", todayPrefix+"%").Count(&count).Error
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%s%04d", todayPrefix, count+1), nil
}

// ----------------- Goods Receipts -----------------
func (r *repository) FindAllGRN(ctx context.Context, query PurchasingFilterQuery) ([]GoodsReceipt, int64, error) {
	var grns []GoodsReceipt
	var total int64

	dbQuery := r.db.WithContext(ctx).Model(&GoodsReceipt{})
	if query.Search != "" {
		pat := "%" + query.Search + "%"
		dbQuery = dbQuery.Where("grn_no ILIKE ?", pat)
	}

	if err := dbQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (query.Page - 1) * query.PerPage
	err := dbQuery.Preload("PurchaseOrder.Supplier").
		Preload("Warehouse").
		Preload("Receiver").
		Preload("Items.Product.Unit").
		Order("created_at DESC").
		Offset(offset).
		Limit(query.PerPage).
		Find(&grns).Error

	return grns, total, err
}

func (r *repository) FindGRNByID(ctx context.Context, id uuid.UUID) (*GoodsReceipt, error) {
	var grn GoodsReceipt
	err := r.db.WithContext(ctx).
		Preload("PurchaseOrder.Supplier").
		Preload("Warehouse").
		Preload("Receiver").
		Preload("Items.Product.Unit").
		Where("id = ?", id).
		First(&grn).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &grn, nil
}

func (r *repository) CreateGRN(ctx context.Context, tx *gorm.DB, grn *GoodsReceipt, items []GoodsReceiptItem) error {
	dbInstance := r.db.DB
	if tx != nil {
		dbInstance = tx
	}

	if err := dbInstance.WithContext(ctx).Create(grn).Error; err != nil {
		return err
	}
	for i := range items {
		items[i].GoodsReceiptID = grn.ID
		if err := dbInstance.WithContext(ctx).Create(&items[i]).Error; err != nil {
			return err
		}
	}
	return nil
}

func (r *repository) GenerateGRNNumber(ctx context.Context) (string, error) {
	var count int64
	todayPrefix := fmt.Sprintf("GRN-%s-", time.Now().Format("20060102"))
	err := r.db.WithContext(ctx).Model(&GoodsReceipt{}).Where("grn_no LIKE ?", todayPrefix+"%").Count(&count).Error
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%s%04d", todayPrefix, count+1), nil
}
