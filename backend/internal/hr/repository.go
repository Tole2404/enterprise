package hr

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
	// Masters
	FindAllDepartments(ctx context.Context) ([]Department, error)
	FindAllPositions(ctx context.Context) ([]Position, error)

	// Employees
	FindAllEmployees(ctx context.Context, query HRFilterQuery) ([]Employee, int64, error)
	FindEmployeeByID(ctx context.Context, id uuid.UUID) (*Employee, error)
	FindEmployeeByEmail(ctx context.Context, email string) (*Employee, error)
	FindEmployeeByUserID(ctx context.Context, userID uuid.UUID) (*Employee, error)
	CreateEmployee(ctx context.Context, emp *Employee) error
	UpdateEmployee(ctx context.Context, emp *Employee) error
	DeleteEmployee(ctx context.Context, id uuid.UUID) error
	GenerateEmployeeNo(ctx context.Context) (string, error)

	// Leave Requests
	FindAllLeaves(ctx context.Context, query HRFilterQuery) ([]LeaveRequest, int64, error)
	FindLeaveByID(ctx context.Context, id uuid.UUID) (*LeaveRequest, error)
	CreateLeave(ctx context.Context, leave *LeaveRequest) error
	UpdateLeaveStatus(ctx context.Context, id uuid.UUID, status string, approverID uuid.UUID) error

	// Payroll
	FindAllPayroll(ctx context.Context, query HRFilterQuery) ([]Payroll, int64, error)
	FindPayrollByID(ctx context.Context, id uuid.UUID) (*Payroll, error)
	CreatePayrollBulk(ctx context.Context, records []Payroll) error
	GeneratePayrollNumber(ctx context.Context, month, year int) (string, error)

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

// ----------------- Masters -----------------
func (r *repository) FindAllDepartments(ctx context.Context) ([]Department, error) {
	var depts []Department
	err := r.db.WithContext(ctx).Order("name ASC").Find(&depts).Error
	return depts, err
}

func (r *repository) FindAllPositions(ctx context.Context) ([]Position, error) {
	var positions []Position
	err := r.db.WithContext(ctx).Preload("Department").Order("title ASC").Find(&positions).Error
	return positions, err
}

// ----------------- Employees -----------------
func (r *repository) FindAllEmployees(ctx context.Context, query HRFilterQuery) ([]Employee, int64, error) {
	var employees []Employee
	var total int64

	dbQuery := r.db.WithContext(ctx).Model(&Employee{})
	if query.Search != "" {
		pat := "%" + query.Search + "%"
		dbQuery = dbQuery.Where("full_name ILIKE ? OR employee_no ILIKE ? OR email ILIKE ?", pat, pat, pat)
	}
	if query.DepartmentID != "" {
		dbQuery = dbQuery.Where("department_id = ?", query.DepartmentID)
	}

	if err := dbQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (query.Page - 1) * query.PerPage
	err := dbQuery.Preload("Department").
		Preload("Position").
		Order("full_name ASC").
		Offset(offset).
		Limit(query.PerPage).
		Find(&employees).Error

	return employees, total, err
}

func (r *repository) FindEmployeeByID(ctx context.Context, id uuid.UUID) (*Employee, error) {
	var emp Employee
	err := r.db.WithContext(ctx).
		Preload("Department").
		Preload("Position").
		Where("id = ?", id).
		First(&emp).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &emp, nil
}

func (r *repository) FindEmployeeByEmail(ctx context.Context, email string) (*Employee, error) {
	var emp Employee
	err := r.db.WithContext(ctx).Where("email = ?", email).First(&emp).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &emp, nil
}

func (r *repository) FindEmployeeByUserID(ctx context.Context, userID uuid.UUID) (*Employee, error) {
	var emp Employee
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).First(&emp).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &emp, nil
}

func (r *repository) CreateEmployee(ctx context.Context, emp *Employee) error {
	return r.db.WithContext(ctx).Create(emp).Error
}

func (r *repository) UpdateEmployee(ctx context.Context, emp *Employee) error {
	return r.db.WithContext(ctx).Save(emp).Error
}

func (r *repository) DeleteEmployee(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Model(&Employee{}).Where("id = ?", id).Update("status", "TERMINATED").Error
}

func (r *repository) GenerateEmployeeNo(ctx context.Context) (string, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&Employee{}).Count(&count).Error
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("EMP-%04d", count+1), nil
}

// ----------------- Leave Requests -----------------
func (r *repository) FindAllLeaves(ctx context.Context, query HRFilterQuery) ([]LeaveRequest, int64, error) {
	var leaves []LeaveRequest
	var total int64

	dbQuery := r.db.WithContext(ctx).Model(&LeaveRequest{})
	if query.Status != "" {
		dbQuery = dbQuery.Where("status = ?", query.Status)
	}

	if err := dbQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (query.Page - 1) * query.PerPage
	err := dbQuery.Preload("Employee.Department").
		Preload("Approver").
		Order("created_at DESC").
		Offset(offset).
		Limit(query.PerPage).
		Find(&leaves).Error

	return leaves, total, err
}

func (r *repository) FindLeaveByID(ctx context.Context, id uuid.UUID) (*LeaveRequest, error) {
	var leave LeaveRequest
	err := r.db.WithContext(ctx).
		Preload("Employee.Department").
		Preload("Approver").
		Where("id = ?", id).
		First(&leave).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &leave, nil
}

func (r *repository) CreateLeave(ctx context.Context, leave *LeaveRequest) error {
	return r.db.WithContext(ctx).Create(leave).Error
}

func (r *repository) UpdateLeaveStatus(ctx context.Context, id uuid.UUID, status string, approverID uuid.UUID) error {
	now := time.Now().UTC()
	return r.db.WithContext(ctx).Model(&LeaveRequest{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":      status,
		"approved_by": approverID,
		"approved_at": now,
	}).Error
}

// ----------------- Payroll -----------------
func (r *repository) FindAllPayroll(ctx context.Context, query HRFilterQuery) ([]Payroll, int64, error) {
	var payrolls []Payroll
	var total int64

	dbQuery := r.db.WithContext(ctx).Model(&Payroll{})
	if query.PeriodMonth > 0 {
		dbQuery = dbQuery.Where("period_month = ?", query.PeriodMonth)
	}
	if query.PeriodYear > 0 {
		dbQuery = dbQuery.Where("period_year = ?", query.PeriodYear)
	}

	if err := dbQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (query.Page - 1) * query.PerPage
	err := dbQuery.Preload("Employee.Department").
		Preload("Employee.Position").
		Order("created_at DESC").
		Offset(offset).
		Limit(query.PerPage).
		Find(&payrolls).Error

	return payrolls, total, err
}

func (r *repository) FindPayrollByID(ctx context.Context, id uuid.UUID) (*Payroll, error) {
	var pay Payroll
	err := r.db.WithContext(ctx).
		Preload("Employee.Department").
		Preload("Employee.Position").
		Where("id = ?", id).
		First(&pay).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &pay, nil
}

func (r *repository) CreatePayrollBulk(ctx context.Context, records []Payroll) error {
	return r.db.WithContext(ctx).Create(&records).Error
}

func (r *repository) GeneratePayrollNumber(ctx context.Context, month, year int) (string, error) {
	var count int64
	prefix := fmt.Sprintf("PAY-%04d%02d-", year, month)
	err := r.db.WithContext(ctx).Model(&Payroll{}).Where("payroll_no LIKE ?", prefix+"%").Count(&count).Error
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%s%04d", prefix, count+1), nil
}
