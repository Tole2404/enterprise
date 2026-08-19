package sales

import (
	"time"

	"erp-backend/internal/auth"
	"erp-backend/internal/inventory"

	"github.com/google/uuid"
)

type Customer struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	Code      string    `gorm:"type:varchar(50);unique;not null" json:"code"`
	Name      string    `gorm:"type:varchar(150);not null" json:"name"`
	Email     string    `gorm:"type:varchar(255)" json:"email"`
	Phone     string    `gorm:"type:varchar(50)" json:"phone"`
	Address   string    `gorm:"type:text" json:"address"`
	IsActive  bool      `gorm:"type:boolean;default:true;not null" json:"is_active"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
}

func (Customer) TableName() string {
	return "sales.customers"
}

type SalesOrder struct {
	ID          uuid.UUID  `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	SONo        string     `gorm:"type:varchar(50);unique;not null" json:"so_no"`
	OrderNo     string     `gorm:"type:varchar(50)" json:"order_no"`
	CustomerID  uuid.UUID  `gorm:"type:uuid;not null" json:"customer_id"`
	OrderDate   time.Time  `gorm:"type:date;not null" json:"order_date"`
	Status      string     `gorm:"type:varchar(30);default:'DRAFT';not null" json:"status"` // DRAFT, CONFIRMED, SHIPPED, PAID, CANCELLED
	Subtotal    float64    `gorm:"type:numeric(15,2);default:0;not null" json:"subtotal"`
	TaxAmount   float64    `gorm:"type:numeric(15,2);default:0;not null" json:"tax_amount"`
	TotalAmount float64    `gorm:"type:numeric(15,2);default:0;not null" json:"total_amount"`
	Notes       string     `gorm:"type:text" json:"notes"`
	CreatedBy   *uuid.UUID `gorm:"type:uuid" json:"created_by"`
	CreatedAt   time.Time  `gorm:"autoCreateTime" json:"created_at"`

	Customer *Customer        `gorm:"foreignKey:CustomerID" json:"customer,omitempty"`
	Creator  *auth.User       `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
	Items    []SalesOrderItem `gorm:"foreignKey:SOID" json:"items,omitempty"`
}

func (SalesOrder) TableName() string {
	return "sales.sales_orders"
}

type SalesOrderItem struct {
	ID           uuid.UUID          `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	SOID         uuid.UUID          `gorm:"type:uuid;not null" json:"so_id"`
	SalesOrderID *uuid.UUID         `gorm:"type:uuid" json:"sales_order_id"`
	ProductID    uuid.UUID          `gorm:"type:uuid;not null" json:"product_id"`
	Qty          float64            `gorm:"type:numeric(15,2);not null" json:"qty"`
	UnitPrice    float64            `gorm:"type:numeric(15,2);not null" json:"unit_price"`
	TotalPrice   float64            `gorm:"type:numeric(15,2);not null" json:"total_price"`
	Product      *inventory.Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`
}

func (SalesOrderItem) TableName() string {
	return "sales.sales_order_items"
}

type DeliveryOrder struct {
	ID           uuid.UUID  `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	DONo         string     `gorm:"type:varchar(50);unique;not null" json:"do_no"`
	SOID         uuid.UUID  `gorm:"type:uuid;not null" json:"so_id"`
	WarehouseID  uuid.UUID  `gorm:"type:uuid;not null" json:"warehouse_id"`
	DeliveryDate time.Time  `gorm:"type:date;not null" json:"delivery_date"`
	ShippedBy    *uuid.UUID `gorm:"type:uuid" json:"shipped_by"`
	Notes        string     `gorm:"type:text" json:"notes"`
	CreatedAt    time.Time  `gorm:"autoCreateTime" json:"created_at"`

	SalesOrder *SalesOrder          `gorm:"foreignKey:SOID" json:"sales_order,omitempty"`
	Warehouse  *inventory.Warehouse `gorm:"foreignKey:WarehouseID" json:"warehouse,omitempty"`
	Shipper    *auth.User           `gorm:"foreignKey:ShippedBy" json:"shipper,omitempty"`
}

func (DeliveryOrder) TableName() string {
	return "sales.delivery_orders"
}

type SalesInvoice struct {
	ID           uuid.UUID  `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	InvoiceNo    string     `gorm:"type:varchar(50);unique;not null" json:"invoice_no"`
	SOID         uuid.UUID  `gorm:"type:uuid;not null" json:"so_id"`
	SalesOrderID *uuid.UUID `gorm:"type:uuid" json:"sales_order_id"`
	InvoiceDate  time.Time  `gorm:"type:date;not null" json:"invoice_date"`
	DueDate      time.Time  `gorm:"type:date;not null" json:"due_date"`
	TotalAmount  float64    `gorm:"type:numeric(15,2);not null" json:"total_amount"`
	PaidAmount   float64    `gorm:"type:numeric(15,2);default:0;not null" json:"paid_amount"`
	Status       string     `gorm:"type:varchar(30);default:'UNPAID';not null" json:"status"` // UNPAID, PARTIAL, PAID
	CreatedAt    time.Time  `gorm:"autoCreateTime" json:"created_at"`

	SalesOrder *SalesOrder `gorm:"foreignKey:SOID" json:"sales_order,omitempty"`
}

func (SalesInvoice) TableName() string {
	return "sales.sales_invoices"
}

// Request DTOs
type CreateCustomerRequest struct {
	Code    string `json:"code"`
	Name    string `json:"name" binding:"required,min=2,max=150"`
	Email   string `json:"email" binding:"omitempty,email"`
	Phone   string `json:"phone"`
	Address string `json:"address"`
}

type UpdateCustomerRequest struct {
	Name     string `json:"name" binding:"required,min=2,max=150"`
	Email    string `json:"email" binding:"omitempty,email"`
	Phone    string `json:"phone"`
	Address  string `json:"address"`
	IsActive *bool  `json:"is_active"`
}

type SalesOrderItemDTO struct {
	ProductID string  `json:"product_id" binding:"required,uuid"`
	Qty       float64 `json:"qty" binding:"required,gt=0"`
	UnitPrice float64 `json:"unit_price" binding:"required,gte=0"`
}

type CreateSalesOrderPayload struct {
	CustomerID string              `json:"customer_id" binding:"required,uuid"`
	TaxPercent float64             `json:"tax_percent" binding:"gte=0,lte=100"`
	Notes      string              `json:"notes"`
	Items      []SalesOrderItemDTO `json:"items" binding:"required,min=1"`
}

type CreateDeliveryOrderPayload struct {
	SOID        string `json:"so_id" binding:"required,uuid"`
	WarehouseID string `json:"warehouse_id" binding:"required,uuid"`
	Notes       string `json:"notes"`
}

type RecordPaymentPayload struct {
	Amount float64 `json:"amount" binding:"required,gt=0"`
	Notes  string  `json:"notes"`
}

type SalesFilterQuery struct {
	Page       int    `form:"page,default=1"`
	PerPage    int    `form:"per_page,default=10"`
	Search     string `form:"search"`
	Status     string `form:"status"`
	CustomerID string `form:"customer_id"`
}
