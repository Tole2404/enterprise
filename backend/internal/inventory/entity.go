package inventory

import (
	"time"

	"github.com/google/uuid"
)

type Category struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	Code        string    `gorm:"type:varchar(50);unique;not null" json:"code"`
	Name        string    `gorm:"type:varchar(100);not null" json:"name"`
	Description string    `gorm:"type:text" json:"description"`
	CreatedAt   time.Time `gorm:"autoCreateTime" json:"created_at"`
}

func (Category) TableName() string {
	return "inventory.categories"
}

type Unit struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	Code      string    `gorm:"type:varchar(20);unique;not null" json:"code"`
	Name      string    `gorm:"type:varchar(50);not null" json:"name"`
	Symbol    string    `gorm:"type:varchar(10);not null" json:"symbol"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
}

func (Unit) TableName() string {
	return "inventory.units"
}

type Product struct {
	ID           uuid.UUID  `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	SKU          string     `gorm:"type:varchar(100);unique;not null" json:"sku"`
	Name         string     `gorm:"type:varchar(255);not null" json:"name"`
	Description  string     `gorm:"type:text" json:"description"`
	CategoryID   *uuid.UUID `gorm:"type:uuid" json:"category_id"`
	UnitID       uuid.UUID  `gorm:"type:uuid;not null" json:"unit_id"`
	MinStock     float64    `gorm:"type:numeric(15,2);default:0;not null" json:"min_stock"`
	CostPrice    float64    `gorm:"type:numeric(15,2);default:0;not null" json:"cost_price"`
	SellingPrice float64    `gorm:"type:numeric(15,2);default:0;not null" json:"selling_price"`
	IsActive     bool       `gorm:"type:boolean;default:true;not null" json:"is_active"`
	CreatedAt    time.Time  `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt    time.Time  `gorm:"autoUpdateTime" json:"updated_at"`

	Category *Category        `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
	Unit     *Unit            `gorm:"foreignKey:UnitID" json:"unit,omitempty"`
	Stocks   []WarehouseStock `gorm:"foreignKey:ProductID" json:"stocks,omitempty"`

	TotalStock float64 `gorm:"-" json:"total_stock"`
}

func (Product) TableName() string {
	return "inventory.products"
}

type Warehouse struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	Code      string    `gorm:"type:varchar(50);unique;not null" json:"code"`
	Name      string    `gorm:"type:varchar(100);not null" json:"name"`
	Address   string    `gorm:"type:text" json:"address"`
	Location  string    `gorm:"-" json:"location,omitempty"`
	IsActive  bool      `gorm:"type:boolean;default:true;not null" json:"is_active"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
}

func (Warehouse) TableName() string {
	return "inventory.warehouses"
}

type WarehouseStock struct {
	WarehouseID   uuid.UUID  `gorm:"type:uuid;primaryKey" json:"warehouse_id"`
	ProductID     uuid.UUID  `gorm:"type:uuid;primaryKey" json:"product_id"`
	CurrentStock  float64    `gorm:"type:numeric(15,2);default:0;not null" json:"current_stock"`
	ReservedStock float64    `gorm:"type:numeric(15,2);default:0;not null" json:"reserved_stock"`
	UpdatedAt     time.Time  `gorm:"autoUpdateTime" json:"updated_at"`
	Warehouse     *Warehouse `gorm:"foreignKey:WarehouseID" json:"warehouse,omitempty"`
}

func (WarehouseStock) TableName() string {
	return "inventory.warehouse_stocks"
}

type StockMutation struct {
	ID              uuid.UUID  `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	ProductID       uuid.UUID  `gorm:"type:uuid;not null" json:"product_id"`
	FromWarehouseID *uuid.UUID `gorm:"type:uuid" json:"from_warehouse_id"`
	ToWarehouseID   *uuid.UUID `gorm:"type:uuid" json:"to_warehouse_id"`
	Qty             float64    `gorm:"type:numeric(15,2);not null" json:"qty"`
	MutationType    string     `gorm:"type:varchar(50);not null" json:"mutation_type"` // IN, OUT, TRANSFER, ADJUSTMENT
	ReferenceType   string     `gorm:"type:varchar(50)" json:"reference_type"`         // SALES_ORDER, PURCHASE_ORDER, STOCK_OPNAME, MANUAL
	ReferenceID     *uuid.UUID `gorm:"type:uuid" json:"reference_id"`
	Notes           string     `gorm:"type:text" json:"notes"`
	CreatedBy       *uuid.UUID `gorm:"type:uuid" json:"created_by"`
	CreatedAt       time.Time  `gorm:"autoCreateTime" json:"created_at"`

	Product       *Product   `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	FromWarehouse *Warehouse `gorm:"foreignKey:FromWarehouseID" json:"from_warehouse,omitempty"`
	ToWarehouse   *Warehouse `gorm:"foreignKey:ToWarehouseID" json:"to_warehouse,omitempty"`
}

func (StockMutation) TableName() string {
	return "inventory.stock_mutations"
}

// Request DTOs
type CreateCategoryRequest struct {
	Code        string `json:"code" binding:"required,min=2,max=50"`
	Name        string `json:"name" binding:"required,min=2,max=100"`
	Description string `json:"description"`
}

type UpdateCategoryRequest struct {
	Name        string `json:"name" binding:"required,min=2,max=100"`
	Description string `json:"description"`
}

type CreateUnitRequest struct {
	Code   string `json:"code" binding:"required,min=1,max=20"`
	Name   string `json:"name" binding:"required,min=1,max=50"`
	Symbol string `json:"symbol" binding:"required,max=10"`
}

type UpdateUnitRequest struct {
	Name   string `json:"name" binding:"required,min=1,max=50"`
	Symbol string `json:"symbol" binding:"required,max=10"`
}

type CreateProductRequest struct {
	SKU                string  `json:"sku"`
	Name               string  `json:"name" binding:"required,min=2,max=255"`
	Description        string  `json:"description"`
	CategoryID         *string `json:"category_id"`
	UnitID             string  `json:"unit_id" binding:"required,uuid"`
	MinStock           float64 `json:"min_stock" binding:"gte=0"`
	CostPrice          float64 `json:"cost_price" binding:"gte=0"`
	SellingPrice       float64 `json:"selling_price" binding:"gte=0"`
	InitialWarehouseID *string `json:"initial_warehouse_id"`
	InitialStock       float64 `json:"initial_stock"`
}

type UpdateProductRequest struct {
	Name               string   `json:"name" binding:"required,min=2,max=255"`
	Description        string   `json:"description"`
	CategoryID         *string  `json:"category_id"`
	UnitID             string   `json:"unit_id" binding:"required,uuid"`
	MinStock           float64  `json:"min_stock" binding:"gte=0"`
	CostPrice          float64  `json:"cost_price" binding:"gte=0"`
	SellingPrice       float64  `json:"selling_price" binding:"gte=0"`
	InitialWarehouseID *string  `json:"initial_warehouse_id"`
	InitialStock       *float64 `json:"initial_stock"`
	IsActive           *bool    `json:"is_active"`
}

type ProductFilterQuery struct {
	Page       int    `form:"page,default=1"`
	PerPage    int    `form:"per_page,default=10"`
	Search     string `form:"search"`
	CategoryID string `form:"category_id"`
	LowStock   bool   `form:"low_stock"`
}

type CreateWarehouseRequest struct {
	Code     string `json:"code"`
	Name     string `json:"name" binding:"required,min=2,max=100"`
	Address  string `json:"address"`
	Location string `json:"location"`
}

type UpdateWarehouseRequest struct {
	Name     string `json:"name" binding:"required,min=2,max=100"`
	Address  string `json:"address"`
	Location string `json:"location"`
	IsActive *bool  `json:"is_active"`
}

type StockMutationRequest struct {
	ProductID       string  `json:"product_id" binding:"required,uuid"`
	FromWarehouseID *string `json:"from_warehouse_id"`
	ToWarehouseID   *string `json:"to_warehouse_id"`
	Qty             float64 `json:"qty" binding:"required,gt=0"`
	MutationType    string  `json:"mutation_type" binding:"required,oneof=IN OUT TRANSFER ADJUSTMENT"`
	ReferenceType   string  `json:"reference_type"`
	ReferenceID     *string `json:"reference_id"`
	Notes           string  `json:"notes"`
}

type StockMutationFilterQuery struct {
	Page         int    `form:"page,default=1"`
	PerPage      int    `form:"per_page,default=10"`
	ProductID    string `form:"product_id"`
	WarehouseID  string `form:"warehouse_id"`
	MutationType string `form:"mutation_type"`
}
