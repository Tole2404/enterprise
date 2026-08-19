package hr

import (
	"time"

	"erp-backend/internal/auth"

	"github.com/google/uuid"
)

type Department struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	Code      string    `gorm:"type:varchar(50);unique;not null" json:"code"`
	Name      string    `gorm:"type:varchar(100);not null" json:"name"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
}

func (Department) TableName() string {
	return "hr.departments"
}

type Position struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	Code         string    `gorm:"type:varchar(50);unique;not null" json:"code"`
	Title        string    `gorm:"type:varchar(100);not null" json:"title"`
	DepartmentID uuid.UUID `gorm:"type:uuid;not null" json:"department_id"`
	CreatedAt    time.Time `gorm:"autoCreateTime" json:"created_at"`

	Department *Department `gorm:"foreignKey:DepartmentID" json:"department,omitempty"`
}

func (Position) TableName() string {
	return "hr.positions"
}

type Employee struct {
	ID               uuid.UUID  `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	EmployeeNo       string     `gorm:"type:varchar(50);unique;not null" json:"employee_no"`
	NIK              string     `gorm:"type:varchar(50)" json:"nik"`
	UserID           *uuid.UUID `gorm:"type:uuid" json:"user_id"`
	FullName         string     `gorm:"type:varchar(150);not null" json:"full_name"`
	Email            string     `gorm:"type:varchar(255);unique;not null" json:"email"`
	Phone            string     `gorm:"type:varchar(50)" json:"phone"`
	DepartmentID     uuid.UUID  `gorm:"type:uuid;not null" json:"department_id"`
	PositionID       uuid.UUID  `gorm:"type:uuid;not null" json:"position_id"`
	JoinDate         time.Time  `gorm:"type:date;not null" json:"join_date"`
	BaseSalary       float64    `gorm:"type:numeric(15,2);default:0;not null" json:"base_salary"`
	Status           string     `gorm:"type:varchar(30);default:'ACTIVE';not null" json:"status"` // ACTIVE, RESIGNED, TERMINATED
	EmploymentStatus string     `gorm:"type:varchar(50);default:'PERMANENT'" json:"employment_status"`
	CreatedAt        time.Time  `gorm:"autoCreateTime" json:"created_at"`

	Department *Department `gorm:"foreignKey:DepartmentID" json:"department,omitempty"`
	Position   *Position   `gorm:"foreignKey:PositionID" json:"position,omitempty"`
	User       *auth.User  `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (Employee) TableName() string {
	return "hr.employees"
}

type LeaveRequest struct {
	ID         uuid.UUID  `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	EmployeeID uuid.UUID  `gorm:"type:uuid;not null" json:"employee_id"`
	LeaveType  string     `gorm:"type:varchar(50);not null" json:"leave_type"` // ANNUAL, SICK, MATERNITY, UNPAID
	StartDate  time.Time  `gorm:"type:date;not null" json:"start_date"`
	EndDate    time.Time  `gorm:"type:date;not null" json:"end_date"`
	Reason     string     `gorm:"type:text" json:"reason"`
	Status     string     `gorm:"type:varchar(30);default:'PENDING';not null" json:"status"` // PENDING, APPROVED, REJECTED
	ApprovedBy *uuid.UUID `gorm:"type:uuid" json:"approved_by"`
	ApprovedAt *time.Time `json:"approved_at"`
	CreatedAt  time.Time  `gorm:"autoCreateTime" json:"created_at"`

	Employee *Employee  `gorm:"foreignKey:EmployeeID" json:"employee,omitempty"`
	Approver *auth.User `gorm:"foreignKey:ApprovedBy" json:"approver,omitempty"`
}

func (LeaveRequest) TableName() string {
	return "hr.leave_requests"
}

type Payroll struct {
	ID            uuid.UUID `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	PayrollNo     string    `gorm:"type:varchar(50);unique;not null" json:"payroll_no"`
	EmployeeID    uuid.UUID `gorm:"type:uuid;not null" json:"employee_id"`
	PeriodMonth   int       `gorm:"not null" json:"period_month"`
	PeriodYear    int       `gorm:"not null" json:"period_year"`
	BaseSalary    float64   `gorm:"type:numeric(15,2);not null" json:"base_salary"`
	Allowances    float64   `gorm:"type:numeric(15,2);default:0;not null" json:"allowances"`
	Deductions    float64   `gorm:"type:numeric(15,2);default:0;not null" json:"deductions"`
	NetSalary     float64   `gorm:"type:numeric(15,2);not null" json:"net_salary"`
	PaymentStatus string    `gorm:"type:varchar(30);default:'UNPAID';not null" json:"payment_status"` // UNPAID, PAID
	CreatedAt     time.Time `gorm:"autoCreateTime" json:"created_at"`

	Employee *Employee `gorm:"foreignKey:EmployeeID" json:"employee,omitempty"`
}

func (Payroll) TableName() string {
	return "hr.payroll"
}

// Request DTOs
type CreateEmployeeRequest struct {
	EmployeeNo   string  `json:"employee_no"`
	FullName     string  `json:"full_name" binding:"required,min=2,max=150"`
	Email        string  `json:"email" binding:"required,email"`
	Phone        string  `json:"phone"`
	DepartmentID string  `json:"department_id" binding:"required,uuid"`
	PositionID   string  `json:"position_id" binding:"required,uuid"`
	JoinDate     string  `json:"join_date" binding:"required"`
	BaseSalary   float64 `json:"base_salary" binding:"gte=0"`
}

type UpdateEmployeeRequest struct {
	EmployeeNo   string  `json:"employee_no"`
	FullName     string  `json:"full_name"`
	Email        string  `json:"email"`
	Phone        string  `json:"phone"`
	DepartmentID string  `json:"department_id"`
	PositionID   string  `json:"position_id"`
	JoinDate     string  `json:"join_date"`
	BaseSalary   float64 `json:"base_salary"`
	Status       string  `json:"status"`
}

type CreateLeaveRequestPayload struct {
	LeaveType string `json:"leave_type" binding:"required,oneof=ANNUAL SICK MATERNITY UNPAID"`
	StartDate string `json:"start_date" binding:"required"`
	EndDate   string `json:"end_date" binding:"required"`
	Reason    string `json:"reason" binding:"required"`
}

type GeneratePayrollPayload struct {
	PeriodMonth int       `json:"period_month" binding:"required,min=1,max=12"`
	PeriodYear  int       `json:"period_year" binding:"required,min=2020"`
	EmployeeIDs []string  `json:"employee_ids"` // Empty to generate for all active employees
}

type HRFilterQuery struct {
	Page         int    `form:"page,default=1"`
	PerPage      int    `form:"per_page,default=10"`
	Search       string `form:"search"`
	DepartmentID string `form:"department_id"`
	Status       string `form:"status"`
	PeriodMonth  int    `form:"period_month"`
	PeriodYear   int    `form:"period_year"`
}
