package finance

import (
	"time"

	"erp-backend/internal/auth"

	"github.com/google/uuid"
)

type Account struct {
	ID        uuid.UUID  `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	Code      string     `gorm:"type:varchar(50);unique;not null" json:"code"`
	Name      string     `gorm:"type:varchar(150);not null" json:"name"`
	Type      string     `gorm:"type:varchar(50);not null" json:"type"` // ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
	ParentID  *uuid.UUID `gorm:"type:uuid" json:"parent_id"`
	IsActive  bool       `gorm:"type:boolean;default:true;not null" json:"is_active"`
	CreatedAt time.Time  `gorm:"autoCreateTime" json:"created_at"`

	Parent   *Account  `gorm:"foreignKey:ParentID" json:"parent,omitempty"`
	Children []Account `gorm:"foreignKey:ParentID" json:"children,omitempty"`
}

func (Account) TableName() string {
	return "finance.accounts"
}

type JournalEntry struct {
	ID          uuid.UUID     `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	EntryNo     string        `gorm:"type:varchar(50);unique;not null" json:"entry_no"`
	EntryDate   time.Time     `gorm:"type:date;not null" json:"entry_date"`
	Description string        `gorm:"type:text" json:"description"`
	Reference   string        `gorm:"type:varchar(100)" json:"reference"`
	CreatedBy   *uuid.UUID    `gorm:"type:uuid" json:"created_by"`
	CreatedAt   time.Time     `gorm:"autoCreateTime" json:"created_at"`

	Creator *auth.User    `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
	Lines   []JournalLine `gorm:"foreignKey:JournalID" json:"lines,omitempty"`
}

func (JournalEntry) TableName() string {
	return "finance.journal_entries"
}

type JournalLine struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	JournalID   uuid.UUID `gorm:"type:uuid;not null" json:"journal_id"`
	AccountID   uuid.UUID `gorm:"type:uuid;not null" json:"account_id"`
	Debit       float64   `gorm:"type:numeric(15,2);default:0;not null" json:"debit"`
	Credit      float64   `gorm:"type:numeric(15,2);default:0;not null" json:"credit"`
	Description string    `gorm:"type:text" json:"description"`

	Account *Account `gorm:"foreignKey:AccountID" json:"account,omitempty"`
}

func (JournalLine) TableName() string {
	return "finance.journal_lines"
}

// Request & Report DTOs
type CreateAccountRequest struct {
	Code     string  `json:"code" binding:"required,min=3,max=50"`
	Name     string  `json:"name" binding:"required,min=2,max=150"`
	Type     string  `json:"type" binding:"required,oneof=ASSET LIABILITY EQUITY REVENUE EXPENSE"`
	ParentID *string `json:"parent_id"`
	IsActive *bool   `json:"is_active"`
}

type JournalLineDTO struct {
	AccountID   string  `json:"account_id" binding:"required,uuid"`
	Debit       float64 `json:"debit" binding:"gte=0"`
	Credit      float64 `json:"credit" binding:"gte=0"`
	Description string  `json:"description"`
}

type CreateJournalEntryPayload struct {
	EntryDate   string           `json:"entry_date" binding:"required"`
	Description string           `json:"description" binding:"required"`
	Reference   string           `json:"reference"`
	Lines       []JournalLineDTO `json:"lines" binding:"required,min=2"`
}

type FinanceFilterQuery struct {
	Page      int    `form:"page,default=1"`
	PerPage   int    `form:"per_page,default=10"`
	Search    string `form:"search"`
	Type      string `form:"type"`
	StartDate string `form:"start_date"`
	EndDate   string `form:"end_date"`
}

type TrialBalanceRow struct {
	AccountCode string  `json:"account_code"`
	AccountName string  `json:"account_name"`
	AccountType string  `json:"account_type"`
	TotalDebit  float64 `json:"total_debit"`
	TotalCredit float64 `json:"total_credit"`
	NetBalance  float64 `json:"net_balance"`
}
