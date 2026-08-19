package sales

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
	// Customers
	FindAllCustomers(ctx context.Context, query SalesFilterQuery) ([]Customer, int64, error)
	FindCustomerByID(ctx context.Context, id uuid.UUID) (*Customer, error)
	FindCustomerByCode(ctx context.Context, code string) (*Customer, error)
	CreateCustomer(ctx context.Context, customer *Customer) error
	UpdateCustomer(ctx context.Context, customer *Customer) error
	DeleteCustomer(ctx context.Context, id uuid.UUID) error
	GenerateCustomerCode(ctx context.Context) (string, error)

	// Sales Orders
	FindAllSO(ctx context.Context, query SalesFilterQuery) ([]SalesOrder, int64, error)
	FindSOByID(ctx context.Context, id uuid.UUID) (*SalesOrder, error)
	CreateSO(ctx context.Context, so *SalesOrder, items []SalesOrderItem) error
	UpdateSOStatus(ctx context.Context, id uuid.UUID, status string) error
	GenerateSONumber(ctx context.Context) (string, error)

	// Delivery Orders
	FindAllDO(ctx context.Context, query SalesFilterQuery) ([]DeliveryOrder, int64, error)
	FindDOByID(ctx context.Context, id uuid.UUID) (*DeliveryOrder, error)
	CreateDO(ctx context.Context, tx *gorm.DB, do *DeliveryOrder) error
	GenerateDONumber(ctx context.Context) (string, error)

	// Invoices
	FindAllInvoices(ctx context.Context, query SalesFilterQuery) ([]SalesInvoice, int64, error)
	FindInvoiceByID(ctx context.Context, id uuid.UUID) (*SalesInvoice, error)
	CreateInvoice(ctx context.Context, tx *gorm.DB, inv *SalesInvoice) error
	UpdateInvoicePayment(ctx context.Context, id uuid.UUID, paidAmount float64, status string) error
	GenerateInvoiceNumber(ctx context.Context) (string, error)

	// DB Transaction
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

// ----------------- Customers -----------------
func (r *repository) FindAllCustomers(ctx context.Context, query SalesFilterQuery) ([]Customer, int64, error) {
	var customers []Customer
	var total int64

	dbQuery := r.db.WithContext(ctx).Model(&Customer{})
	if query.Search != "" {
		pat := "%" + query.Search + "%"
		dbQuery = dbQuery.Where("name ILIKE ? OR code ILIKE ? OR email ILIKE ?", pat, pat, pat)
	}

	if err := dbQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (query.Page - 1) * query.PerPage
	err := dbQuery.Order("name ASC").Offset(offset).Limit(query.PerPage).Find(&customers).Error
	return customers, total, err
}

func (r *repository) FindCustomerByID(ctx context.Context, id uuid.UUID) (*Customer, error) {
	var c Customer
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&c).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &c, nil
}

func (r *repository) FindCustomerByCode(ctx context.Context, code string) (*Customer, error) {
	var c Customer
	err := r.db.WithContext(ctx).Where("code = ?", code).First(&c).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &c, nil
}

func (r *repository) CreateCustomer(ctx context.Context, customer *Customer) error {
	return r.db.WithContext(ctx).Create(customer).Error
}

func (r *repository) UpdateCustomer(ctx context.Context, customer *Customer) error {
	return r.db.WithContext(ctx).Save(customer).Error
}

func (r *repository) DeleteCustomer(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Model(&Customer{}).Where("id = ?", id).Update("is_active", false).Error
}

func (r *repository) GenerateCustomerCode(ctx context.Context) (string, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&Customer{}).Count(&count).Error
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("CUST-%04d", count+1), nil
}

// ----------------- Sales Orders -----------------
func (r *repository) FindAllSO(ctx context.Context, query SalesFilterQuery) ([]SalesOrder, int64, error) {
	var sos []SalesOrder
	var total int64

	dbQuery := r.db.WithContext(ctx).Model(&SalesOrder{})
	if query.Search != "" {
		pat := "%" + query.Search + "%"
		dbQuery = dbQuery.Where("so_no ILIKE ?", pat)
	}
	if query.Status != "" {
		dbQuery = dbQuery.Where("status = ?", query.Status)
	}
	if query.CustomerID != "" {
		dbQuery = dbQuery.Where("customer_id = ?", query.CustomerID)
	}

	if err := dbQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (query.Page - 1) * query.PerPage
	err := dbQuery.Preload("Customer").
		Preload("Creator").
		Preload("Items.Product.Unit").
		Order("created_at DESC").
		Offset(offset).
		Limit(query.PerPage).
		Find(&sos).Error

	return sos, total, err
}

func (r *repository) FindSOByID(ctx context.Context, id uuid.UUID) (*SalesOrder, error) {
	var so SalesOrder
	err := r.db.WithContext(ctx).
		Preload("Customer").
		Preload("Creator").
		Preload("Items.Product.Unit").
		Where("id = ?", id).
		First(&so).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &so, nil
}

func (r *repository) CreateSO(ctx context.Context, so *SalesOrder, items []SalesOrderItem) error {
	return r.db.WithTransaction(func(tx *gorm.DB) error {
		if err := tx.WithContext(ctx).Create(so).Error; err != nil {
			return err
		}
		for i := range items {
			items[i].SOID = so.ID
			if err := tx.WithContext(ctx).Create(&items[i]).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *repository) UpdateSOStatus(ctx context.Context, id uuid.UUID, status string) error {
	return r.db.WithContext(ctx).Model(&SalesOrder{}).Where("id = ?", id).Update("status", status).Error
}

func (r *repository) GenerateSONumber(ctx context.Context) (string, error) {
	var count int64
	todayPrefix := fmt.Sprintf("SO-%s-", time.Now().Format("20060102"))
	err := r.db.WithContext(ctx).Model(&SalesOrder{}).Where("so_no LIKE ?", todayPrefix+"%").Count(&count).Error
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%s%04d", todayPrefix, count+1), nil
}

// ----------------- Delivery Orders -----------------
func (r *repository) FindAllDO(ctx context.Context, query SalesFilterQuery) ([]DeliveryOrder, int64, error) {
	var dos []DeliveryOrder
	var total int64

	dbQuery := r.db.WithContext(ctx).Model(&DeliveryOrder{})
	if query.Search != "" {
		pat := "%" + query.Search + "%"
		dbQuery = dbQuery.Where("do_no ILIKE ?", pat)
	}

	if err := dbQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (query.Page - 1) * query.PerPage
	err := dbQuery.Preload("SalesOrder.Customer").
		Preload("Warehouse").
		Preload("Shipper").
		Order("created_at DESC").
		Offset(offset).
		Limit(query.PerPage).
		Find(&dos).Error

	return dos, total, err
}

func (r *repository) FindDOByID(ctx context.Context, id uuid.UUID) (*DeliveryOrder, error) {
	var do DeliveryOrder
	err := r.db.WithContext(ctx).
		Preload("SalesOrder.Customer").
		Preload("SalesOrder.Items.Product").
		Preload("Warehouse").
		Preload("Shipper").
		Where("id = ?", id).
		First(&do).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &do, nil
}

func (r *repository) CreateDO(ctx context.Context, tx *gorm.DB, do *DeliveryOrder) error {
	dbInstance := r.db.DB
	if tx != nil {
		dbInstance = tx
	}
	return dbInstance.WithContext(ctx).Create(do).Error
}

func (r *repository) GenerateDONumber(ctx context.Context) (string, error) {
	var count int64
	todayPrefix := fmt.Sprintf("DO-%s-", time.Now().Format("20060102"))
	err := r.db.WithContext(ctx).Model(&DeliveryOrder{}).Where("do_no LIKE ?", todayPrefix+"%").Count(&count).Error
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%s%04d", todayPrefix, count+1), nil
}

// ----------------- Invoices -----------------
func (r *repository) FindAllInvoices(ctx context.Context, query SalesFilterQuery) ([]SalesInvoice, int64, error) {
	var invoices []SalesInvoice
	var total int64

	dbQuery := r.db.WithContext(ctx).Model(&SalesInvoice{})
	if query.Search != "" {
		pat := "%" + query.Search + "%"
		dbQuery = dbQuery.Where("invoice_no ILIKE ?", pat)
	}
	if query.Status != "" {
		dbQuery = dbQuery.Where("status = ?", query.Status)
	}

	if err := dbQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (query.Page - 1) * query.PerPage
	err := dbQuery.Preload("SalesOrder.Customer").
		Order("created_at DESC").
		Offset(offset).
		Limit(query.PerPage).
		Find(&invoices).Error

	return invoices, total, err
}

func (r *repository) FindInvoiceByID(ctx context.Context, id uuid.UUID) (*SalesInvoice, error) {
	var inv SalesInvoice
	err := r.db.WithContext(ctx).
		Preload("SalesOrder.Customer").
		Preload("SalesOrder.Items.Product").
		Where("id = ?", id).
		First(&inv).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &inv, nil
}

func (r *repository) CreateInvoice(ctx context.Context, tx *gorm.DB, inv *SalesInvoice) error {
	dbInstance := r.db.DB
	if tx != nil {
		dbInstance = tx
	}
	return dbInstance.WithContext(ctx).Create(inv).Error
}

func (r *repository) UpdateInvoicePayment(ctx context.Context, id uuid.UUID, paidAmount float64, status string) error {
	return r.db.WithContext(ctx).Model(&SalesInvoice{}).Where("id = ?", id).Updates(map[string]interface{}{
		"paid_amount": paidAmount,
		"status":      status,
	}).Error
}

func (r *repository) GenerateInvoiceNumber(ctx context.Context) (string, error) {
	var count int64
	todayPrefix := fmt.Sprintf("INV-%s-", time.Now().Format("20060102"))
	err := r.db.WithContext(ctx).Model(&SalesInvoice{}).Where("invoice_no LIKE ?", todayPrefix+"%").Count(&count).Error
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%s%04d", todayPrefix, count+1), nil
}
