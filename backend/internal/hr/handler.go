package hr

import (
	"net/http"

	"erp-backend/pkg/response"
	"erp-backend/pkg/validator"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) RegisterRoutes(rg *gin.RouterGroup, authMiddleware gin.HandlerFunc, requirePerm func(string) gin.HandlerFunc) {
	hrGroup := rg.Group("/hr", authMiddleware)
	{
		// Masters
		hrGroup.GET("/departments", requirePerm("hr:employees:read"), h.ListDepartments)
		hrGroup.GET("/positions", requirePerm("hr:employees:read"), h.ListPositions)

		// Employees
		hrGroup.GET("/employees", requirePerm("hr:employees:read"), h.ListEmployees)
		hrGroup.GET("/employees/:id", requirePerm("hr:employees:read"), h.GetEmployeeByID)
		hrGroup.POST("/employees", requirePerm("hr:employees:manage"), h.CreateEmployee)
		hrGroup.PUT("/employees/:id", requirePerm("hr:employees:manage"), h.UpdateEmployee)
		hrGroup.DELETE("/employees/:id", requirePerm("hr:employees:manage"), h.DeleteEmployee)

		// Leaves
		hrGroup.GET("/leaves", requirePerm("hr:leaves:read"), h.ListLeaves)
		hrGroup.POST("/leaves", requirePerm("hr:leaves:apply"), h.ApplyLeave)
		hrGroup.POST("/leaves/:id/approve", requirePerm("hr:leaves:approve"), h.ApproveLeave)

		// Payroll
		hrGroup.GET("/payroll", requirePerm("hr:payroll:read"), h.ListPayroll)
		hrGroup.POST("/payroll/generate", requirePerm("hr:payroll:manage"), h.GenerateMonthlyPayroll)
	}
}

// ----------------- Master Handlers -----------------
func (h *Handler) ListDepartments(c *gin.Context) {
	depts, err := h.service.ListDepartments(c.Request.Context())
	if err != nil {
		response.InternalServerError(c, "Failed to retrieve departments", err.Error())
		return
	}
	response.Success(c, http.StatusOK, "Departments retrieved successfully", depts)
}

func (h *Handler) ListPositions(c *gin.Context) {
	positions, err := h.service.ListPositions(c.Request.Context())
	if err != nil {
		response.InternalServerError(c, "Failed to retrieve positions", err.Error())
		return
	}
	response.Success(c, http.StatusOK, "Positions retrieved successfully", positions)
}

// ----------------- Employee Handlers -----------------
func (h *Handler) ListEmployees(c *gin.Context) {
	var query HRFilterQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		response.BadRequest(c, "Invalid query parameters", validator.FormatValidationErrors(err))
		return
	}

	employees, total, err := h.service.ListEmployees(c.Request.Context(), query)
	if err != nil {
		response.InternalServerError(c, "Failed to retrieve employees", err.Error())
		return
	}
	response.Paginated(c, http.StatusOK, "Employees retrieved successfully", employees, query.Page, query.PerPage, total)
}

func (h *Handler) GetEmployeeByID(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.BadRequest(c, "Invalid employee ID format", nil)
		return
	}

	emp, err := h.service.GetEmployeeByID(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, "Employee not found")
		return
	}
	response.Success(c, http.StatusOK, "Employee retrieved successfully", emp)
}

func (h *Handler) CreateEmployee(c *gin.Context) {
	var req CreateEmployeeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid employee data", validator.FormatValidationErrors(err))
		return
	}

	emp, err := h.service.CreateEmployee(c.Request.Context(), req)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}
	response.Success(c, http.StatusCreated, "Employee created successfully", emp)
}

func (h *Handler) UpdateEmployee(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.BadRequest(c, "Invalid employee ID format", nil)
		return
	}

	var req UpdateEmployeeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid employee update data", validator.FormatValidationErrors(err))
		return
	}

	emp, err := h.service.UpdateEmployee(c.Request.Context(), id, req)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}
	response.Success(c, http.StatusOK, "Employee updated successfully", emp)
}

func (h *Handler) DeleteEmployee(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.BadRequest(c, "Invalid employee ID format", nil)
		return
	}

	if err := h.service.DeleteEmployee(c.Request.Context(), id); err != nil {
		response.InternalServerError(c, "Failed to deactivate employee", err.Error())
		return
	}
	response.Success(c, http.StatusOK, "Employee deactivated successfully", nil)
}

// ----------------- Leave Handlers -----------------
func (h *Handler) ListLeaves(c *gin.Context) {
	var query HRFilterQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		response.BadRequest(c, "Invalid query parameters", validator.FormatValidationErrors(err))
		return
	}

	leaves, total, err := h.service.ListLeaves(c.Request.Context(), query)
	if err != nil {
		response.InternalServerError(c, "Failed to retrieve leave requests", err.Error())
		return
	}
	response.Paginated(c, http.StatusOK, "Leave requests retrieved successfully", leaves, query.Page, query.PerPage, total)
}

func (h *Handler) ApplyLeave(c *gin.Context) {
	var req CreateLeaveRequestPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid leave request payload", validator.FormatValidationErrors(err))
		return
	}

	userIDRaw, exists := c.Get("user_id")
	if !exists {
		response.Unauthorized(c, "Unauthorized")
		return
	}
	userID := userIDRaw.(uuid.UUID)

	leave, err := h.service.ApplyLeave(c.Request.Context(), userID, req)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}
	response.Success(c, http.StatusCreated, "Leave request submitted successfully", leave)
}

func (h *Handler) ApproveLeave(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.BadRequest(c, "Invalid leave ID format", nil)
		return
	}

	var req struct {
		Status string `json:"status" binding:"required,oneof=APPROVED REJECTED"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid status (must be APPROVED or REJECTED)", nil)
		return
	}

	userIDRaw, _ := c.Get("user_id")
	approverID := userIDRaw.(uuid.UUID)

	if err := h.service.ApproveLeave(c.Request.Context(), id, approverID, req.Status); err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}
	response.Success(c, http.StatusOK, "Leave status updated successfully", nil)
}

// ----------------- Payroll Handlers -----------------
func (h *Handler) ListPayroll(c *gin.Context) {
	var query HRFilterQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		response.BadRequest(c, "Invalid query parameters", validator.FormatValidationErrors(err))
		return
	}

	payrolls, total, err := h.service.ListPayroll(c.Request.Context(), query)
	if err != nil {
		response.InternalServerError(c, "Failed to retrieve payroll records", err.Error())
		return
	}
	response.Paginated(c, http.StatusOK, "Payroll records retrieved successfully", payrolls, query.Page, query.PerPage, total)
}

func (h *Handler) GenerateMonthlyPayroll(c *gin.Context) {
	var req GeneratePayrollPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid payroll generation parameters", validator.FormatValidationErrors(err))
		return
	}

	records, err := h.service.GenerateMonthlyPayroll(c.Request.Context(), req)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}
	response.Success(c, http.StatusCreated, "Monthly payroll generated successfully", records)
}
