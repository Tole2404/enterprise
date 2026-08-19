package purchasing

import (
	"time"

	"erp-backend/internal/auth"
	"erp-backend/internal/inventory"

	"github.com/google/uuid"
)

type Supplier struct {
	ID               uuid.UUID `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	Code             string    `gorm:"type:varchar(50);unique;not null" json:"code"`
	Name             string    `gorm:"type:varchar(150);not null" json:"name"`
	Email            string    `gorm:"type:varchar(255)" json:"email"`
	Phone            string    `gorm:"type:varchar(50)" json:"phone"`
	Address          string    `gorm:"type:text" json:"address"`
	PaymentTermsDays int       `gorm:"type:int;default:30;not null" json:"payment_terms_days"`
	IsActive         bool      `gorm:"type:boolean;default:true;not null" json:"is_active"`
	CreatedAt        time.Time `gorm:"autoCreateTime" json:"created_at"`
}

func (Supplier) TableName() string {
	return "purchasing.suppliers"
}

type PurchaseRequest struct {
	ID           uuid.UUID  `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	PRNo         string     `gorm:"type:varchar(50);unique;not null" json:"pr_no"`
	RequestDate  time.Time  `gorm:"type:date;not null" json:"request_date"`
	RequesterID  *uuid.UUID `gorm:"type:uuid" json:"requester_id"`
	Status       string     `gorm:"type:varchar(30);default:'DRAFT';not null" json:"status"` // DRAFT, SUBMITTED, APPROVED, REJECTED
	Notes        string     `gorm:"type:text" json:"notes"`
	ApprovedBy   *uuid.UUID `gorm:"type:uuid" json:"approved_by"`
	ApprovedAt   *time.Time `json:"approved_at"`
	CreatedAt    time.Time  `gorm:"autoCreateTime" json:"created_at"`

	Requester *auth.User            `gorm:"foreignKey:RequesterID" json:"requester,omitempty"`
	Approver  *auth.User            `gorm:"foreignKey:ApprovedBy" json:"approver,omitempty"`
	Items     []PurchaseRequestItem `gorm:"foreignKey:PRID" json:"items,omitempty"`
}

func (PurchaseRequest) TableName() string {
	return "purchasing.purchase_requests"
}

type PurchaseRequestItem struct {
	ID        uuid.UUID          `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	PRID      uuid.UUID          `gorm:"type:uuid;not null" json:"pr_id"`
	ProductID uuid.UUID          `gorm:"type:uuid;not null" json:"product_id"`
	Qty       float64            `gorm:"type:numeric(15,2);not null" json:"qty"`
	Notes     string             `gorm:"type:text" json:"notes"`
	Product   *inventory.Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`
}

func (PurchaseRequestItem) TableName() string {
	return "purchasing.purchase_request_items"
}

type PurchaseOrder struct {
	ID                   uuid.UUID  `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	PONo                 string     `gorm:"type:varchar(50);unique;not null" json:"po_no"`
	PRID                 *uuid.UUID `gorm:"type:uuid" json:"pr_id"`
	SupplierID           uuid.UUID  `gorm:"type:uuid;not null" json:"supplier_id"`
	OrderDate            time.Time  `gorm:"type:date;not null" json:"order_date"`
	ExpectedDeliveryDate *time.Time `gorm:"type:date" json:"expected_delivery_date"`
	Status               string     `gorm:"type:varchar(30);default:'DRAFT';not null" json:"status"` // DRAFT, PENDING_APPROVAL, APPROVED, REJECTED, RECEIVED, CANCELLED
	Subtotal             float64    `gorm:"type:numeric(15,2);default:0;not null" json:"subtotal"`
	TaxAmount            float64    `gorm:"type:numeric(15,2);default:0;not null" json:"tax_amount"`
	TotalAmount          float64    `gorm:"type:numeric(15,2);default:0;not null" json:"total_amount"`
	Notes                string     `gorm:"type:text" json:"notes"`
	ApprovedBy           *uuid.UUID `gorm:"type:uuid" json:"approved_by"`
	ApprovedAt           *time.Time `json:"approved_at"`
	CreatedBy            *uuid.UUID `gorm:"type:uuid" json:"created_by"`
	CreatedAt            time.Time  `gorm:"autoCreateTime" json:"created_at"`

	Supplier        *Supplier           `gorm:"foreignKey:SupplierID" json:"supplier,omitempty"`
	PurchaseRequest *PurchaseRequest    `gorm:"foreignKey:PRID" json:"purchase_request,omitempty"`
	Creator         *auth.User          `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
	Approver        *auth.User          `gorm:"foreignKey:ApprovedBy" json:"approver,omitempty"`
	Items           []PurchaseOrderItem `gorm:"foreignKey:POID" json:"items,omitempty"`
}

func (PurchaseOrder) TableName() string {
	return "purchasing.purchase_orders"
}

type PurchaseOrderItem struct {
	ID         uuid.UUID          `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	POID       uuid.UUID          `gorm:"type:uuid;not null" json:"po_id"`
	ProductID  uuid.UUID          `gorm:"type:uuid;not null" json:"product_id"`
	Qty        float64            `gorm:"type:numeric(15,2);not null" json:"qty"`
	UnitPrice  float64            `gorm:"type:numeric(15,2);not null" json:"unit_price"`
	TotalPrice float64            `gorm:"type:numeric(15,2);not null" json:"total_price"`
	Product    *inventory.Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`
}

func (PurchaseOrderItem) TableName() string {
	return "purchasing.purchase_order_items"
}

type GoodsReceipt struct {
	ID          uuid.UUID  `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	GRNNo       string     `gorm:"type:varchar(50);unique;not null" json:"grn_no"`
	POID        uuid.UUID  `gorm:"type:uuid;not null" json:"po_id"`
	WarehouseID uuid.UUID  `gorm:"type:uuid;not null" json:"warehouse_id"`
	ReceiptDate time.Time  `gorm:"type:date;not null" json:"receipt_date"`
	ReceivedBy  *uuid.UUID `gorm:"type:uuid" json:"received_by"`
	Notes       string     `gorm:"type:text" json:"notes"`
	CreatedAt   time.Time  `gorm:"autoCreateTime" json:"created_at"`

	PurchaseOrder *PurchaseOrder          `gorm:"foreignKey:POID" json:"purchase_order,omitempty"`
	Warehouse     *inventory.Warehouse    `gorm:"foreignKey:WarehouseID" json:"warehouse,omitempty"`
	Receiver      *auth.User              `gorm:"foreignKey:ReceivedBy" json:"receiver,omitempty"`
	Items         []GoodsReceiptItem      `gorm:"foreignKey:GoodsReceiptID" json:"items,omitempty"`
}

func (GoodsReceipt) TableName() string {
	return "purchasing.goods_receipts"
}

type GoodsReceiptItem struct {
	ID             uuid.UUID          `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	GoodsReceiptID uuid.UUID          `gorm:"type:uuid;not null" json:"goods_receipt_id"`
	ProductID      uuid.UUID          `gorm:"type:uuid;not null" json:"product_id"`
	QtyReceived    float64            `gorm:"type:numeric(15,2);not null" json:"qty_received"`
	Notes          string             `gorm:"type:text" json:"notes"`
	Product        *inventory.Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`
}

func (GoodsReceiptItem) TableName() string {
	return "purchasing.goods_receipt_items"
}

// Request DTOs
type CreateSupplierRequest struct {
	Code             string `json:"code"`
	Name             string `json:"name" binding:"required,min=2,max=150"`
	Email            string `json:"email" binding:"omitempty,email"`
	Phone            string `json:"phone"`
	Address          string `json:"address"`
	PaymentTermsDays int    `json:"payment_terms_days" binding:"gte=0"`
}

type UpdateSupplierRequest struct {
	Name             string `json:"name" binding:"required,min=2,max=150"`
	Email            string `json:"email" binding:"omitempty,email"`
	Phone            string `json:"phone"`
	Address          string `json:"address"`
	PaymentTermsDays int    `json:"payment_terms_days" binding:"gte=0"`
	IsActive         *bool  `json:"is_active"`
}

type PurchaseRequestItemDTO struct {
	ProductID string  `json:"product_id" binding:"required,uuid"`
	Qty       float64 `json:"qty" binding:"required,gt=0"`
	Notes     string  `json:"notes"`
}

type CreatePurchaseRequestPayload struct {
	Notes string                   `json:"notes"`
	Items []PurchaseRequestItemDTO `json:"items" binding:"required,min=1"`
}

type PurchaseOrderItemDTO struct {
	ProductID string  `json:"product_id" binding:"required,uuid"`
	Qty       float64 `json:"qty" binding:"required,gt=0"`
	UnitPrice float64 `json:"unit_price" binding:"required,gte=0"`
}

type CreatePurchaseOrderPayload struct {
	PRID                 *string                `json:"pr_id"`
	SupplierID           string                 `json:"supplier_id" binding:"required,uuid"`
	ExpectedDeliveryDate *string                `json:"expected_delivery_date"`
	TaxPercent           float64                `json:"tax_percent" binding:"gte=0,lte=100"`
	Notes                string                 `json:"notes"`
	Items                []PurchaseOrderItemDTO `json:"items" binding:"required,min=1"`
}

type GoodsReceiptItemDTO struct {
	ProductID   string  `json:"product_id" binding:"required,uuid"`
	QtyReceived float64 `json:"qty_received" binding:"required,gt=0"`
	Notes       string  `json:"notes"`
}

type CreateGoodsReceiptPayload struct {
	POID        string                `json:"po_id" binding:"required,uuid"`
	WarehouseID string                `json:"warehouse_id" binding:"required,uuid"`
	Notes       string                `json:"notes"`
	Items       []GoodsReceiptItemDTO `json:"items" binding:"required,min=1"`
}

type ApprovalRequest struct {
	Status string `json:"status" binding:"required,oneof=APPROVED REJECTED"`
	Notes  string `json:"notes"`
}

type PurchasingFilterQuery struct {
	Page       int    `form:"page,default=1"`
	PerPage    int    `form:"per_page,default=10"`
	Search     string `form:"search"`
	Status     string `form:"status"`
	SupplierID string `form:"supplier_id"`
}
