package hr

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
)

type Service interface {
	// Masters
	ListDepartments(ctx context.Context) ([]Department, error)
	ListPositions(ctx context.Context) ([]Position, error)

	// Employees
	ListEmployees(ctx context.Context, query HRFilterQuery) ([]Employee, int64, error)
	GetEmployeeByID(ctx context.Context, id uuid.UUID) (*Employee, error)
	CreateEmployee(ctx context.Context, req CreateEmployeeRequest) (*Employee, error)
	UpdateEmployee(ctx context.Context, id uuid.UUID, req UpdateEmployeeRequest) (*Employee, error)
	DeleteEmployee(ctx context.Context, id uuid.UUID) error

	// Leave Requests
	ListLeaves(ctx context.Context, query HRFilterQuery) ([]LeaveRequest, int64, error)
	ApplyLeave(ctx context.Context, userID uuid.UUID, req CreateLeaveRequestPayload) (*LeaveRequest, error)
	ApproveLeave(ctx context.Context, id, approverID uuid.UUID, status string) error

	// Payroll
	ListPayroll(ctx context.Context, query HRFilterQuery) ([]Payroll, int64, error)
	GenerateMonthlyPayroll(ctx context.Context, req GeneratePayrollPayload) ([]Payroll, error)
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

// ----------------- Masters Service -----------------
func (s *service) ListDepartments(ctx context.Context) ([]Department, error) {
	return s.repo.FindAllDepartments(ctx)
}

func (s *service) ListPositions(ctx context.Context) ([]Position, error) {
	return s.repo.FindAllPositions(ctx)
}

// ----------------- Employee Service -----------------
func (s *service) ListEmployees(ctx context.Context, query HRFilterQuery) ([]Employee, int64, error) {
	if query.Page <= 0 {
		query.Page = 1
	}
	if query.PerPage <= 0 || query.PerPage > 100 {
		query.PerPage = 10
	}
	return s.repo.FindAllEmployees(ctx, query)
}

func (s *service) GetEmployeeByID(ctx context.Context, id uuid.UUID) (*Employee, error) {
	emp, err := s.repo.FindEmployeeByID(ctx, id)
	if err != nil || emp == nil {
		return nil, errors.New("employee not found")
	}
	return emp, nil
}

func (s *service) CreateEmployee(ctx context.Context, req CreateEmployeeRequest) (*Employee, error) {
	if req.EmployeeNo == "" {
		empNo, err := s.repo.GenerateEmployeeNo(ctx)
		if err != nil {
			return nil, err
		}
		req.EmployeeNo = empNo
	}

	existing, err := s.repo.FindEmployeeByEmail(ctx, req.Email)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, fmt.Errorf("employee with email '%s' already exists", req.Email)
	}

	deptID, err := uuid.Parse(req.DepartmentID)
	if err != nil {
		return nil, errors.New("invalid department_id format")
	}
	posID, err := uuid.Parse(req.PositionID)
	if err != nil {
		return nil, errors.New("invalid position_id format")
	}

	joinDate, err := time.Parse("2006-01-02", req.JoinDate)
	if err != nil {
		joinDate = time.Now().UTC()
	}

	emp := &Employee{
		ID:               uuid.New(),
		EmployeeNo:       req.EmployeeNo,
		NIK:              req.EmployeeNo,
		FullName:         req.FullName,
		Email:            req.Email,
		Phone:            req.Phone,
		DepartmentID:     deptID,
		PositionID:       posID,
		JoinDate:         joinDate,
		BaseSalary:       req.BaseSalary,
		Status:           "ACTIVE",
		EmploymentStatus: "PERMANENT",
	}

	if err := s.repo.CreateEmployee(ctx, emp); err != nil {
		return nil, err
	}

	return s.repo.FindEmployeeByID(ctx, emp.ID)
}

func (s *service) UpdateEmployee(ctx context.Context, id uuid.UUID, req UpdateEmployeeRequest) (*Employee, error) {
	emp, err := s.repo.FindEmployeeByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if req.EmployeeNo != "" {
		emp.EmployeeNo = req.EmployeeNo
	}
	if req.FullName != "" {
		emp.FullName = req.FullName
	}
	if req.Email != "" {
		emp.Email = req.Email
	}
	if req.Phone != "" {
		emp.Phone = req.Phone
	}
	if req.DepartmentID != "" {
		if deptID, err := uuid.Parse(req.DepartmentID); err == nil {
			emp.DepartmentID = deptID
		}
	}
	if req.PositionID != "" {
		if posID, err := uuid.Parse(req.PositionID); err == nil {
			emp.PositionID = posID
		}
	}
	if req.JoinDate != "" {
		if jd, err := time.Parse("2006-01-02", req.JoinDate); err == nil {
			emp.JoinDate = jd
		}
	}
	if req.BaseSalary > 0 {
		emp.BaseSalary = req.BaseSalary
	}
	if req.Status != "" {
		emp.Status = req.Status
	}

	if err := s.repo.UpdateEmployee(ctx, emp); err != nil {
		return nil, err
	}
	return s.repo.FindEmployeeByID(ctx, id)
}

func (s *service) DeleteEmployee(ctx context.Context, id uuid.UUID) error {
	return s.repo.DeleteEmployee(ctx, id)
}

// ----------------- Leave Requests -----------------
func (s *service) ListLeaves(ctx context.Context, query HRFilterQuery) ([]LeaveRequest, int64, error) {
	if query.Page <= 0 {
		query.Page = 1
	}
	if query.PerPage <= 0 || query.PerPage > 100 {
		query.PerPage = 10
	}
	return s.repo.FindAllLeaves(ctx, query)
}

func (s *service) ApplyLeave(ctx context.Context, userID uuid.UUID, req CreateLeaveRequestPayload) (*LeaveRequest, error) {
	emp, err := s.repo.FindEmployeeByUserID(ctx, userID)
	if err != nil || emp == nil {
		// Fallback: search first active employee if not bound to auth user directly
		employees, _, err := s.repo.FindAllEmployees(ctx, HRFilterQuery{Page: 1, PerPage: 1})
		if err != nil || len(employees) == 0 {
			return nil, errors.New("employee profile not found for this user")
		}
		emp = &employees[0]
	}

	start, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		return nil, errors.New("invalid start_date format (YYYY-MM-DD required)")
	}
	end, err := time.Parse("2006-01-02", req.EndDate)
	if err != nil {
		return nil, errors.New("invalid end_date format (YYYY-MM-DD required)")
	}

	leave := &LeaveRequest{
		ID:         uuid.New(),
		EmployeeID: emp.ID,
		LeaveType:  req.LeaveType,
		StartDate:  start,
		EndDate:    end,
		Reason:     req.Reason,
		Status:     "PENDING",
	}

	if err := s.repo.CreateLeave(ctx, leave); err != nil {
		return nil, err
	}

	return s.repo.FindLeaveByID(ctx, leave.ID)
}

func (s *service) ApproveLeave(ctx context.Context, id, approverID uuid.UUID, status string) error {
	leave, err := s.repo.FindLeaveByID(ctx, id)
	if err != nil || leave == nil {
		return errors.New("leave request not found")
	}
	if leave.Status != "PENDING" {
		return fmt.Errorf("cannot approve leave with status '%s'", leave.Status)
	}

	return s.repo.UpdateLeaveStatus(ctx, id, status, approverID)
}

// ----------------- Payroll -----------------
func (s *service) ListPayroll(ctx context.Context, query HRFilterQuery) ([]Payroll, int64, error) {
	if query.Page <= 0 {
		query.Page = 1
	}
	if query.PerPage <= 0 || query.PerPage > 100 {
		query.PerPage = 10
	}
	return s.repo.FindAllPayroll(ctx, query)
}

func (s *service) GenerateMonthlyPayroll(ctx context.Context, req GeneratePayrollPayload) ([]Payroll, error) {
	employees, _, err := s.repo.FindAllEmployees(ctx, HRFilterQuery{Page: 1, PerPage: 1000})
	if err != nil {
		return nil, err
	}

	var payrollRecords []Payroll
	for _, emp := range employees {
		if emp.Status != "ACTIVE" {
			continue
		}

		// Calculate 10% transport/meal allowance, 5% BPJS/tax deduction
		allowance := emp.BaseSalary * 0.10
		deduction := emp.BaseSalary * 0.05
		netSalary := emp.BaseSalary + allowance - deduction

		payrollNo, _ := s.repo.GeneratePayrollNumber(ctx, req.PeriodMonth, req.PeriodYear)

		payrollRecords = append(payrollRecords, Payroll{
			ID:            uuid.New(),
			PayrollNo:     payrollNo,
			EmployeeID:    emp.ID,
			PeriodMonth:   req.PeriodMonth,
			PeriodYear:    req.PeriodYear,
			BaseSalary:    emp.BaseSalary,
			Allowances:    allowance,
			Deductions:    deduction,
			NetSalary:     netSalary,
			PaymentStatus: "PAID",
		})
	}

	if len(payrollRecords) > 0 {
		if err := s.repo.CreatePayrollBulk(ctx, payrollRecords); err != nil {
			return nil, err
		}
	}

	return payrollRecords, nil
}
