package finance

import (
	"context"
	"errors"
	"fmt"
	"math"
	"time"

	"github.com/google/uuid"
)

type Service interface {
	// Accounts
	ListAccounts(ctx context.Context, query FinanceFilterQuery) ([]Account, error)
	GetAccountByID(ctx context.Context, id uuid.UUID) (*Account, error)
	CreateAccount(ctx context.Context, req CreateAccountRequest) (*Account, error)
	UpdateAccount(ctx context.Context, id uuid.UUID, req CreateAccountRequest) (*Account, error)
	DeleteAccount(ctx context.Context, id uuid.UUID) error

	// Journal Entries (Double-Entry Balance Checked)
	ListJournals(ctx context.Context, query FinanceFilterQuery) ([]JournalEntry, int64, error)
	GetJournalByID(ctx context.Context, id uuid.UUID) (*JournalEntry, error)
	CreateJournal(ctx context.Context, creatorID uuid.UUID, req CreateJournalEntryPayload) (*JournalEntry, error)

	// Reports
	GetTrialBalance(ctx context.Context) ([]TrialBalanceRow, error)
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

// ----------------- Account Service -----------------
func (s *service) ListAccounts(ctx context.Context, query FinanceFilterQuery) ([]Account, error) {
	return s.repo.FindAllAccounts(ctx, query)
}

func (s *service) GetAccountByID(ctx context.Context, id uuid.UUID) (*Account, error) {
	acc, err := s.repo.FindAccountByID(ctx, id)
	if err != nil || acc == nil {
		return nil, errors.New("account not found")
	}
	return acc, nil
}

func (s *service) CreateAccount(ctx context.Context, req CreateAccountRequest) (*Account, error) {
	existing, err := s.repo.FindAccountByCode(ctx, req.Code)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, fmt.Errorf("account with code '%s' already exists", req.Code)
	}

	var parentUUID *uuid.UUID
	if req.ParentID != nil && *req.ParentID != "" {
		pid, err := uuid.Parse(*req.ParentID)
		if err == nil {
			parentUUID = &pid
		}
	}

	acc := &Account{
		ID:        uuid.New(),
		Code:      req.Code,
		Name:      req.Name,
		Type:      req.Type,
		ParentID:  parentUUID,
		IsActive:  true,
	}

	if err := s.repo.CreateAccount(ctx, acc); err != nil {
		return nil, err
	}
	return acc, nil
}

func (s *service) UpdateAccount(ctx context.Context, id uuid.UUID, req CreateAccountRequest) (*Account, error) {
	acc, err := s.repo.FindAccountByID(ctx, id)
	if err != nil || acc == nil {
		return nil, errors.New("account not found")
	}

	acc.Name = req.Name
	acc.Type = req.Type
	if req.IsActive != nil {
		acc.IsActive = *req.IsActive
	}

	if err := s.repo.UpdateAccount(ctx, acc); err != nil {
		return nil, err
	}
	return acc, nil
}

func (s *service) DeleteAccount(ctx context.Context, id uuid.UUID) error {
	return s.repo.DeleteAccount(ctx, id)
}

// ----------------- Journal Entry Service (Double Entry Validation) -----------------
func (s *service) ListJournals(ctx context.Context, query FinanceFilterQuery) ([]JournalEntry, int64, error) {
	if query.Page <= 0 {
		query.Page = 1
	}
	if query.PerPage <= 0 || query.PerPage > 100 {
		query.PerPage = 10
	}
	return s.repo.FindAllJournals(ctx, query)
}

func (s *service) GetJournalByID(ctx context.Context, id uuid.UUID) (*JournalEntry, error) {
	entry, err := s.repo.FindJournalByID(ctx, id)
	if err != nil || entry == nil {
		return nil, errors.New("journal entry not found")
	}
	return entry, nil
}

func (s *service) CreateJournal(ctx context.Context, creatorID uuid.UUID, req CreateJournalEntryPayload) (*JournalEntry, error) {
	entryDate, err := time.Parse("2006-01-02", req.EntryDate)
	if err != nil {
		entryDate = time.Now().UTC()
	}

	var totalDebit, totalCredit float64
	var lines []JournalLine

	for _, l := range req.Lines {
		accID, err := uuid.Parse(l.AccountID)
		if err != nil {
			return nil, errors.New("invalid account_id in journal lines")
		}

		acc, err := s.repo.FindAccountByID(ctx, accID)
		if err != nil || acc == nil {
			return nil, fmt.Errorf("account with id '%s' not found", l.AccountID)
		}

		totalDebit += l.Debit
		totalCredit += l.Credit

		lines = append(lines, JournalLine{
			ID:          uuid.New(),
			AccountID:   accID,
			Debit:       l.Debit,
			Credit:      l.Credit,
			Description: l.Description,
		})
	}

	// Validate double-entry equality (Debit == Credit)
	if math.Abs(totalDebit-totalCredit) > 0.01 {
		return nil, fmt.Errorf("unbalanced journal entry: Total Debit (%.2f) must equal Total Credit (%.2f)", totalDebit, totalCredit)
	}

	entryNo, err := s.repo.GenerateJournalNumber(ctx)
	if err != nil {
		return nil, err
	}

	entry := &JournalEntry{
		ID:          uuid.New(),
		EntryNo:     entryNo,
		EntryDate:   entryDate,
		Description: req.Description,
		Reference:   req.Reference,
		CreatedBy:   &creatorID,
	}

	if err := s.repo.CreateJournal(ctx, entry, lines); err != nil {
		return nil, err
	}

	return s.repo.FindJournalByID(ctx, entry.ID)
}

// ----------------- Financial Reports -----------------
func (s *service) GetTrialBalance(ctx context.Context) ([]TrialBalanceRow, error) {
	return s.repo.GetTrialBalance(ctx)
}
