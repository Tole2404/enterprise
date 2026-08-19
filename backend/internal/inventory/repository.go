package inventory

import (
	"context"
	"errors"
	"fmt"

	"erp-backend/pkg/database"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Repository interface {
	// Categories
	FindAllCategories(ctx context.Context) ([]Category, error)
	FindCategoryByID(ctx context.Context, id uuid.UUID) (*Category, error)
	FindCategoryByCode(ctx context.Context, code string) (*Category, error)
	CreateCategory(ctx context.Context, category *Category) error
	UpdateCategory(ctx context.Context, category *Category) error
	DeleteCategory(ctx context.Context, id uuid.UUID) error

	// Units
	FindAllUnits(ctx context.Context) ([]Unit, error)
	FindUnitByID(ctx context.Context, id uuid.UUID) (*Unit, error)
	FindUnitByCode(ctx context.Context, code string) (*Unit, error)
	CreateUnit(ctx context.Context, unit *Unit) error
	UpdateUnit(ctx context.Context, unit *Unit) error
	DeleteUnit(ctx context.Context, id uuid.UUID) error

	// Products
	FindAllProducts(ctx context.Context, query ProductFilterQuery) ([]Product, int64, error)
	FindProductByID(ctx context.Context, id uuid.UUID) (*Product, error)
	FindProductBySKU(ctx context.Context, sku string) (*Product, error)
	CreateProduct(ctx context.Context, product *Product) error
	UpdateProduct(ctx context.Context, product *Product) error
	DeleteProduct(ctx context.Context, id uuid.UUID) error
	GenerateProductSKU(ctx context.Context) (string, error)

	// Warehouses
	FindAllWarehouses(ctx context.Context) ([]Warehouse, error)
	FindWarehouseByID(ctx context.Context, id uuid.UUID) (*Warehouse, error)
	FindWarehouseByCode(ctx context.Context, code string) (*Warehouse, error)
	CreateWarehouse(ctx context.Context, warehouse *Warehouse) error
	UpdateWarehouse(ctx context.Context, warehouse *Warehouse) error
	DeleteWarehouse(ctx context.Context, id uuid.UUID) error
	GenerateWarehouseCode(ctx context.Context) (string, error)

	// Stock Operations
	GetStock(ctx context.Context, warehouseID, productID uuid.UUID) (*WarehouseStock, error)
	SetStock(ctx context.Context, tx *gorm.DB, warehouseID, productID uuid.UUID, currentStock, reservedStock float64) error
	DeleteStock(ctx context.Context, tx *gorm.DB, warehouseID, productID uuid.UUID) error
	GetProductStocks(ctx context.Context, productID uuid.UUID) ([]WarehouseStock, error)
	CreateStockMutation(ctx context.Context, tx *gorm.DB, mutation *StockMutation) error
	ListStockMutations(ctx context.Context, query StockMutationFilterQuery) ([]StockMutation, int64, error)

	// Transaction helper
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

// ----------------- Categories -----------------
func (r *repository) FindAllCategories(ctx context.Context) ([]Category, error) {
	var categories []Category
	err := r.db.WithContext(ctx).Order("name ASC").Find(&categories).Error
	return categories, err
}

func (r *repository) FindCategoryByID(ctx context.Context, id uuid.UUID) (*Category, error) {
	var cat Category
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&cat).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &cat, nil
}

func (r *repository) FindCategoryByCode(ctx context.Context, code string) (*Category, error) {
	var cat Category
	err := r.db.WithContext(ctx).Where("code = ?", code).First(&cat).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &cat, nil
}

func (r *repository) CreateCategory(ctx context.Context, category *Category) error {
	return r.db.WithContext(ctx).Create(category).Error
}

func (r *repository) UpdateCategory(ctx context.Context, category *Category) error {
	return r.db.WithContext(ctx).Save(category).Error
}

func (r *repository) DeleteCategory(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Where("id = ?", id).Delete(&Category{}).Error
}

// ----------------- Units -----------------
func (r *repository) FindAllUnits(ctx context.Context) ([]Unit, error) {
	var units []Unit
	err := r.db.WithContext(ctx).Order("name ASC").Find(&units).Error
	return units, err
}

func (r *repository) FindUnitByID(ctx context.Context, id uuid.UUID) (*Unit, error) {
	var unit Unit
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&unit).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &unit, nil
}

func (r *repository) FindUnitByCode(ctx context.Context, code string) (*Unit, error) {
	var unit Unit
	err := r.db.WithContext(ctx).Where("code = ?", code).First(&unit).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &unit, nil
}

func (r *repository) CreateUnit(ctx context.Context, unit *Unit) error {
	return r.db.WithContext(ctx).Create(unit).Error
}

func (r *repository) UpdateUnit(ctx context.Context, unit *Unit) error {
	return r.db.WithContext(ctx).Save(unit).Error
}

func (r *repository) DeleteUnit(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Where("id = ?", id).Delete(&Unit{}).Error
}

// ----------------- Products -----------------
func (r *repository) FindAllProducts(ctx context.Context, query ProductFilterQuery) ([]Product, int64, error) {
	var products []Product
	var total int64

	dbQuery := r.db.WithContext(ctx).Model(&Product{})

	if query.Search != "" {
		searchPattern := "%" + query.Search + "%"
		dbQuery = dbQuery.Where("name ILIKE ? OR sku ILIKE ?", searchPattern, searchPattern)
	}

	if query.CategoryID != "" {
		dbQuery = dbQuery.Where("category_id = ?", query.CategoryID)
	}

	if err := dbQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (query.Page - 1) * query.PerPage
	err := dbQuery.Preload("Category").
		Preload("Unit").
		Preload("Stocks.Warehouse").
		Order("name ASC").
		Offset(offset).
		Limit(query.PerPage).
		Find(&products).Error

	// Compute total stock for each product
	for i := range products {
		var totalStock float64
		for _, s := range products[i].Stocks {
			totalStock += s.CurrentStock
		}
		products[i].TotalStock = totalStock
	}

	return products, total, err
}

func (r *repository) FindProductByID(ctx context.Context, id uuid.UUID) (*Product, error) {
	var product Product
	err := r.db.WithContext(ctx).
		Preload("Category").
		Preload("Unit").
		Preload("Stocks.Warehouse").
		Where("id = ?", id).
		First(&product).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}

	var totalStock float64
	for _, s := range product.Stocks {
		totalStock += s.CurrentStock
	}
	product.TotalStock = totalStock

	return &product, nil
}

func (r *repository) FindProductBySKU(ctx context.Context, sku string) (*Product, error) {
	var product Product
	err := r.db.WithContext(ctx).Where("sku = ?", sku).First(&product).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &product, nil
}

func (r *repository) CreateProduct(ctx context.Context, product *Product) error {
	return r.db.WithContext(ctx).Create(product).Error
}

func (r *repository) UpdateProduct(ctx context.Context, product *Product) error {
	return r.db.WithContext(ctx).Save(product).Error
}

func (r *repository) DeleteProduct(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Model(&Product{}).Where("id = ?", id).Update("is_active", false).Error
}

// ----------------- Warehouses -----------------
func (r *repository) FindAllWarehouses(ctx context.Context) ([]Warehouse, error) {
	var warehouses []Warehouse
	err := r.db.WithContext(ctx).Order("name ASC").Find(&warehouses).Error
	return warehouses, err
}

func (r *repository) FindWarehouseByID(ctx context.Context, id uuid.UUID) (*Warehouse, error) {
	var warehouse Warehouse
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&warehouse).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &warehouse, nil
}

func (r *repository) FindWarehouseByCode(ctx context.Context, code string) (*Warehouse, error) {
	var warehouse Warehouse
	err := r.db.WithContext(ctx).Where("code = ?", code).First(&warehouse).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &warehouse, nil
}

func (r *repository) CreateWarehouse(ctx context.Context, warehouse *Warehouse) error {
	return r.db.WithContext(ctx).Create(warehouse).Error
}

func (r *repository) UpdateWarehouse(ctx context.Context, warehouse *Warehouse) error {
	return r.db.WithContext(ctx).Save(warehouse).Error
}

func (r *repository) DeleteWarehouse(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Model(&Warehouse{}).Where("id = ?", id).Update("is_active", false).Error
}

func (r *repository) GenerateWarehouseCode(ctx context.Context) (string, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&Warehouse{}).Count(&count).Error
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("WH-%03d", count+1), nil
}

func (r *repository) GenerateProductSKU(ctx context.Context) (string, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&Product{}).Count(&count).Error
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("PRD-%04d", count+1), nil
}

// ----------------- Stock Operations -----------------
func (r *repository) GetStock(ctx context.Context, warehouseID, productID uuid.UUID) (*WarehouseStock, error) {
	var stock WarehouseStock
	err := r.db.WithContext(ctx).
		Where("warehouse_id = ? AND product_id = ?", warehouseID, productID).
		First(&stock).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &stock, nil
}

func (r *repository) SetStock(ctx context.Context, tx *gorm.DB, warehouseID, productID uuid.UUID, currentStock, reservedStock float64) error {
	dbInstance := r.db.DB
	if tx != nil {
		dbInstance = tx
	}

	query := `
		INSERT INTO inventory.warehouse_stocks (warehouse_id, product_id, current_stock, reserved_stock, updated_at)
		VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
		ON CONFLICT (warehouse_id, product_id)
		DO UPDATE SET current_stock = EXCLUDED.current_stock, reserved_stock = EXCLUDED.reserved_stock, updated_at = CURRENT_TIMESTAMP
	`
	return dbInstance.WithContext(ctx).Exec(query, warehouseID, productID, currentStock, reservedStock).Error
}

func (r *repository) DeleteStock(ctx context.Context, tx *gorm.DB, warehouseID, productID uuid.UUID) error {
	dbInstance := r.db.DB
	if tx != nil {
		dbInstance = tx
	}
	return dbInstance.WithContext(ctx).Where("warehouse_id = ? AND product_id = ?", warehouseID, productID).Delete(&WarehouseStock{}).Error
}

func (r *repository) GetProductStocks(ctx context.Context, productID uuid.UUID) ([]WarehouseStock, error) {
	var stocks []WarehouseStock
	err := r.db.WithContext(ctx).
		Preload("Warehouse").
		Where("product_id = ?", productID).
		Find(&stocks).Error
	return stocks, err
}

func (r *repository) CreateStockMutation(ctx context.Context, tx *gorm.DB, mutation *StockMutation) error {
	dbInstance := r.db.DB
	if tx != nil {
		dbInstance = tx
	}
	return dbInstance.WithContext(ctx).Create(mutation).Error
}

func (r *repository) ListStockMutations(ctx context.Context, query StockMutationFilterQuery) ([]StockMutation, int64, error) {
	var mutations []StockMutation
	var total int64

	dbQuery := r.db.WithContext(ctx).Model(&StockMutation{})

	if query.ProductID != "" {
		dbQuery = dbQuery.Where("product_id = ?", query.ProductID)
	}
	if query.WarehouseID != "" {
		dbQuery = dbQuery.Where("from_warehouse_id = ? OR to_warehouse_id = ?", query.WarehouseID, query.WarehouseID)
	}
	if query.MutationType != "" {
		dbQuery = dbQuery.Where("mutation_type = ?", query.MutationType)
	}

	if err := dbQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (query.Page - 1) * query.PerPage
	err := dbQuery.Preload("Product").
		Preload("FromWarehouse").
		Preload("ToWarehouse").
		Order("created_at DESC").
		Offset(offset).
		Limit(query.PerPage).
		Find(&mutations).Error

	return mutations, total, err
}
