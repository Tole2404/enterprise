package finance

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
	// Accounts
	FindAllAccounts(ctx context.Context, query FinanceFilterQuery) ([]Account, error)
	FindAccountByID(ctx context.Context, id uuid.UUID) (*Account, error)
	FindAccountByCode(ctx context.Context, code string) (*Account, error)
	CreateAccount(ctx context.Context, account *Account) error
	UpdateAccount(ctx context.Context, account *Account) error
	DeleteAccount(ctx context.Context, id uuid.UUID) error

	// Journal Entries
	FindAllJournals(ctx context.Context, query FinanceFilterQuery) ([]JournalEntry, int64, error)
	FindJournalByID(ctx context.Context, id uuid.UUID) (*JournalEntry, error)
	CreateJournal(ctx context.Context, entry *JournalEntry, lines []JournalLine) error
	GenerateJournalNumber(ctx context.Context) (string, error)

	// Financial Reports
	GetTrialBalance(ctx context.Context) ([]TrialBalanceRow, error)
}

type repository struct {
	db *database.DB
}

func NewRepository(db *database.DB) Repository {
	return &repository{db: db}
}

// ----------------- Accounts -----------------
func (r *repository) FindAllAccounts(ctx context.Context, query FinanceFilterQuery) ([]Account, error) {
	var accounts []Account
	dbQuery := r.db.WithContext(ctx).Model(&Account{})

	if query.Type != "" {
		dbQuery = dbQuery.Where("type = ?", query.Type)
	}
	if query.Search != "" {
		pat := "%" + query.Search + "%"
		dbQuery = dbQuery.Where("code ILIKE ? OR name ILIKE ?", pat, pat)
	}

	err := dbQuery.Order("code ASC").Find(&accounts).Error
	return accounts, err
}

func (r *repository) FindAccountByID(ctx context.Context, id uuid.UUID) (*Account, error) {
	var acc Account
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&acc).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &acc, nil
}

func (r *repository) FindAccountByCode(ctx context.Context, code string) (*Account, error) {
	var acc Account
	err := r.db.WithContext(ctx).Where("code = ?", code).First(&acc).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &acc, nil
}

func (r *repository) CreateAccount(ctx context.Context, account *Account) error {
	return r.db.WithContext(ctx).Create(account).Error
}

func (r *repository) UpdateAccount(ctx context.Context, account *Account) error {
	return r.db.WithContext(ctx).Save(account).Error
}

func (r *repository) DeleteAccount(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Model(&Account{}).Where("id = ?", id).Update("is_active", false).Error
}

// ----------------- Journal Entries -----------------
func (r *repository) FindAllJournals(ctx context.Context, query FinanceFilterQuery) ([]JournalEntry, int64, error) {
	var entries []JournalEntry
	var total int64

	dbQuery := r.db.WithContext(ctx).Model(&JournalEntry{})
	if query.Search != "" {
		pat := "%" + query.Search + "%"
		dbQuery = dbQuery.Where("entry_no ILIKE ? OR description ILIKE ? OR reference ILIKE ?", pat, pat, pat)
	}

	if err := dbQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (query.Page - 1) * query.PerPage
	err := dbQuery.Preload("Creator").
		Preload("Lines.Account").
		Order("entry_date DESC, created_at DESC").
		Offset(offset).
		Limit(query.PerPage).
		Find(&entries).Error

	return entries, total, err
}

func (r *repository) FindJournalByID(ctx context.Context, id uuid.UUID) (*JournalEntry, error) {
	var entry JournalEntry
	err := r.db.WithContext(ctx).
		Preload("Creator").
		Preload("Lines.Account").
		Where("id = ?", id).
		First(&entry).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &entry, nil
}

func (r *repository) CreateJournal(ctx context.Context, entry *JournalEntry, lines []JournalLine) error {
	return r.db.WithTransaction(func(tx *gorm.DB) error {
		if err := tx.WithContext(ctx).Create(entry).Error; err != nil {
			return err
		}
		for i := range lines {
			lines[i].JournalID = entry.ID
			if err := tx.WithContext(ctx).Create(&lines[i]).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *repository) GenerateJournalNumber(ctx context.Context) (string, error) {
	var count int64
	todayPrefix := fmt.Sprintf("JV-%s-", time.Now().Format("20060102"))
	err := r.db.WithContext(ctx).Model(&JournalEntry{}).Where("entry_no LIKE ?", todayPrefix+"%").Count(&count).Error
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%s%04d", todayPrefix, count+1), nil
}

// ----------------- Financial Reports (Trial Balance) -----------------
func (r *repository) GetTrialBalance(ctx context.Context) ([]TrialBalanceRow, error) {
	var rows []TrialBalanceRow
	query := `
		SELECT 
			a.code AS account_code,
			a.name AS account_name,
			a.type AS account_type,
			COALESCE(SUM(jl.debit), 0) AS total_debit,
			COALESCE(SUM(jl.credit), 0) AS total_credit,
			CASE 
				WHEN a.type IN ('ASSET', 'EXPENSE') THEN COALESCE(SUM(jl.debit), 0) - COALESCE(SUM(jl.credit), 0)
				ELSE COALESCE(SUM(jl.credit), 0) - COALESCE(SUM(jl.debit), 0)
			END AS net_balance
		FROM finance.accounts a
		LEFT JOIN finance.journal_lines jl ON a.id = jl.account_id
		WHERE a.is_active = true
		GROUP BY a.id, a.code, a.name, a.type
		ORDER BY a.code ASC
	`
	err := r.db.WithContext(ctx).Raw(query).Scan(&rows).Error
	return rows, err
}
