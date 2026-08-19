package sales

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
	salesGroup := rg.Group("/sales", authMiddleware)
	{
		// Customers
		salesGroup.GET("/customers", requirePerm("sales:customers:manage"), h.ListCustomers)
		salesGroup.GET("/customers/:id", requirePerm("sales:customers:manage"), h.GetCustomerByID)
		salesGroup.POST("/customers", requirePerm("sales:customers:manage"), h.CreateCustomer)
		salesGroup.PUT("/customers/:id", requirePerm("sales:customers:manage"), h.UpdateCustomer)
		salesGroup.DELETE("/customers/:id", requirePerm("sales:customers:manage"), h.DeleteCustomer)

		// Sales Orders
		salesGroup.GET("/orders", requirePerm("sales:orders:read"), h.ListSO)
		salesGroup.GET("/orders/:id", requirePerm("sales:orders:read"), h.GetSOByID)
		salesGroup.POST("/orders", requirePerm("sales:orders:create"), h.CreateSO)
		salesGroup.POST("/orders/:id/cancel", requirePerm("sales:orders:create"), h.CancelSO)

		// Delivery Orders (Surat Jalan)
		salesGroup.GET("/deliveries", requirePerm("sales:deliveries:manage"), h.ListDO)
		salesGroup.GET("/deliveries/:id", requirePerm("sales:deliveries:manage"), h.GetDOByID)
		salesGroup.POST("/deliveries", requirePerm("sales:deliveries:manage"), h.DeliverGoods)

		// Invoices & Payments
		salesGroup.GET("/invoices", requirePerm("sales:invoices:read"), h.ListInvoices)
		salesGroup.GET("/invoices/:id", requirePerm("sales:invoices:read"), h.GetInvoiceByID)
		salesGroup.POST("/invoices/:id/payment", requirePerm("sales:invoices:manage"), h.RecordPayment)
	}
}

// ----------------- Customer Handlers -----------------
func (h *Handler) ListCustomers(c *gin.Context) {
	var query SalesFilterQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		response.BadRequest(c, "Invalid query parameters", validator.FormatValidationErrors(err))
		return
	}

	customers, total, err := h.service.ListCustomers(c.Request.Context(), query)
	if err != nil {
		response.InternalServerError(c, "Failed to retrieve customers", err.Error())
		return
	}
	response.Paginated(c, http.StatusOK, "Customers retrieved successfully", customers, query.Page, query.PerPage, total)
}

func (h *Handler) GetCustomerByID(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.BadRequest(c, "Invalid customer ID format", nil)
		return
	}

	customer, err := h.service.GetCustomerByID(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, "Customer not found")
		return
	}
	response.Success(c, http.StatusOK, "Customer retrieved successfully", customer)
}

func (h *Handler) CreateCustomer(c *gin.Context) {
	var req CreateCustomerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid customer data", validator.FormatValidationErrors(err))
		return
	}

	customer, err := h.service.CreateCustomer(c.Request.Context(), req)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}
	response.Success(c, http.StatusCreated, "Customer created successfully", customer)
}

func (h *Handler) UpdateCustomer(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.BadRequest(c, "Invalid customer ID format", nil)
		return
	}

	var req UpdateCustomerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid update data", validator.FormatValidationErrors(err))
		return
	}

	customer, err := h.service.UpdateCustomer(c.Request.Context(), id, req)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}
	response.Success(c, http.StatusOK, "Customer updated successfully", customer)
}

func (h *Handler) DeleteCustomer(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.BadRequest(c, "Invalid customer ID format", nil)
		return
	}

	if err := h.service.DeleteCustomer(c.Request.Context(), id); err != nil {
		response.InternalServerError(c, "Failed to delete customer", err.Error())
		return
	}
	response.Success(c, http.StatusOK, "Customer deactivated successfully", nil)
}

// ----------------- Sales Order Handlers -----------------
func (h *Handler) ListSO(c *gin.Context) {
	var query SalesFilterQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		response.BadRequest(c, "Invalid query parameters", validator.FormatValidationErrors(err))
		return
	}

	sos, total, err := h.service.ListSO(c.Request.Context(), query)
	if err != nil {
		response.InternalServerError(c, "Failed to retrieve sales orders", err.Error())
		return
	}
	response.Paginated(c, http.StatusOK, "Sales orders retrieved successfully", sos, query.Page, query.PerPage, total)
}

func (h *Handler) GetSOByID(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.BadRequest(c, "Invalid SO ID format", nil)
		return
	}

	so, err := h.service.GetSOByID(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, "Sales order not found")
		return
	}
	response.Success(c, http.StatusOK, "Sales order retrieved successfully", so)
}

func (h *Handler) CreateSO(c *gin.Context) {
	var req CreateSalesOrderPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid sales order data", validator.FormatValidationErrors(err))
		return
	}

	userIDRaw, exists := c.Get("user_id")
	if !exists {
		response.Unauthorized(c, "Unauthorized")
		return
	}
	creatorID := userIDRaw.(uuid.UUID)

	so, err := h.service.CreateSO(c.Request.Context(), creatorID, req)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}
	response.Success(c, http.StatusCreated, "Sales order created successfully", so)
}

func (h *Handler) CancelSO(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.BadRequest(c, "Invalid SO ID format", nil)
		return
	}

	if err := h.service.CancelSO(c.Request.Context(), id); err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}
	response.Success(c, http.StatusOK, "Sales order cancelled successfully", nil)
}

// ----------------- Delivery Order Handlers -----------------
func (h *Handler) ListDO(c *gin.Context) {
	var query SalesFilterQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		response.BadRequest(c, "Invalid query parameters", validator.FormatValidationErrors(err))
		return
	}

	dos, total, err := h.service.ListDO(c.Request.Context(), query)
	if err != nil {
		response.InternalServerError(c, "Failed to retrieve delivery orders", err.Error())
		return
	}
	response.Paginated(c, http.StatusOK, "Delivery orders retrieved successfully", dos, query.Page, query.PerPage, total)
}

func (h *Handler) GetDOByID(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.BadRequest(c, "Invalid DO ID format", nil)
		return
	}

	do, err := h.service.GetDOByID(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, "Delivery order not found")
		return
	}
	response.Success(c, http.StatusOK, "Delivery order retrieved successfully", do)
}

func (h *Handler) DeliverGoods(c *gin.Context) {
	var req CreateDeliveryOrderPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid delivery order data", validator.FormatValidationErrors(err))
		return
	}

	userIDRaw, exists := c.Get("user_id")
	if !exists {
		response.Unauthorized(c, "Unauthorized")
		return
	}
	shipperID := userIDRaw.(uuid.UUID)

	do, err := h.service.DeliverGoods(c.Request.Context(), shipperID, req)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}
	response.Success(c, http.StatusCreated, "Goods delivered, stocks deducted, and invoice generated successfully", do)
}

// ----------------- Invoice Handlers -----------------
func (h *Handler) ListInvoices(c *gin.Context) {
	var query SalesFilterQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		response.BadRequest(c, "Invalid query parameters", validator.FormatValidationErrors(err))
		return
	}

	invoices, total, err := h.service.ListInvoices(c.Request.Context(), query)
	if err != nil {
		response.InternalServerError(c, "Failed to retrieve invoices", err.Error())
		return
	}
	response.Paginated(c, http.StatusOK, "Invoices retrieved successfully", invoices, query.Page, query.PerPage, total)
}

func (h *Handler) GetInvoiceByID(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.BadRequest(c, "Invalid invoice ID format", nil)
		return
	}

	inv, err := h.service.GetInvoiceByID(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, "Invoice not found")
		return
	}
	response.Success(c, http.StatusOK, "Invoice retrieved successfully", inv)
}

func (h *Handler) RecordPayment(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.BadRequest(c, "Invalid invoice ID format", nil)
		return
	}

	var req RecordPaymentPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid payment payload", validator.FormatValidationErrors(err))
		return
	}

	inv, err := h.service.RecordPayment(c.Request.Context(), id, req)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}
	response.Success(c, http.StatusOK, "Payment recorded successfully", inv)
}
