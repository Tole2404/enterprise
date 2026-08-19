package purchasing

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
	purchGroup := rg.Group("/purchasing", authMiddleware)
	{
		// Suppliers
		purchGroup.GET("/suppliers", requirePerm("purchasing:suppliers:manage"), h.ListSuppliers)
		purchGroup.GET("/suppliers/:id", requirePerm("purchasing:suppliers:manage"), h.GetSupplierByID)
		purchGroup.POST("/suppliers", requirePerm("purchasing:suppliers:manage"), h.CreateSupplier)
		purchGroup.PUT("/suppliers/:id", requirePerm("purchasing:suppliers:manage"), h.UpdateSupplier)
		purchGroup.DELETE("/suppliers/:id", requirePerm("purchasing:suppliers:manage"), h.DeleteSupplier)

		// Purchase Requests
		purchGroup.GET("/purchase-requests", requirePerm("purchasing:pr:create"), h.ListPR)
		purchGroup.GET("/purchase-requests/:id", requirePerm("purchasing:pr:create"), h.GetPRByID)
		purchGroup.POST("/purchase-requests", requirePerm("purchasing:pr:create"), h.CreatePR)
		purchGroup.POST("/purchase-requests/:id/approve", requirePerm("purchasing:pr:approve"), h.ApprovePR)

		// Purchase Orders
		purchGroup.GET("/purchase-orders", requirePerm("purchasing:po:create"), h.ListPO)
		purchGroup.GET("/purchase-orders/:id", requirePerm("purchasing:po:create"), h.GetPOByID)
		purchGroup.POST("/purchase-orders", requirePerm("purchasing:po:create"), h.CreatePO)
		purchGroup.POST("/purchase-orders/:id/approve", requirePerm("purchasing:po:approve"), h.ApprovePO)
		purchGroup.POST("/purchase-orders/:id/cancel", requirePerm("purchasing:po:create"), h.CancelPO)

		// Goods Receipts (GRN)
		purchGroup.GET("/goods-receipts", requirePerm("purchasing:grn:create"), h.ListGRN)
		purchGroup.GET("/goods-receipts/:id", requirePerm("purchasing:grn:create"), h.GetGRNByID)
		purchGroup.POST("/goods-receipts", requirePerm("purchasing:grn:create"), h.ReceiveGoods)
	}
}

// ----------------- Supplier Handlers -----------------
func (h *Handler) ListSuppliers(c *gin.Context) {
	var query PurchasingFilterQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		response.BadRequest(c, "Invalid query parameters", validator.FormatValidationErrors(err))
		return
	}

	suppliers, total, err := h.service.ListSuppliers(c.Request.Context(), query)
	if err != nil {
		response.InternalServerError(c, "Failed to retrieve suppliers", err.Error())
		return
	}
	response.Paginated(c, http.StatusOK, "Suppliers retrieved successfully", suppliers, query.Page, query.PerPage, total)
}

func (h *Handler) GetSupplierByID(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.BadRequest(c, "Invalid supplier ID format", nil)
		return
	}

	supplier, err := h.service.GetSupplierByID(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, "Supplier not found")
		return
	}
	response.Success(c, http.StatusOK, "Supplier retrieved successfully", supplier)
}

func (h *Handler) CreateSupplier(c *gin.Context) {
	var req CreateSupplierRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid supplier data", validator.FormatValidationErrors(err))
		return
	}

	supplier, err := h.service.CreateSupplier(c.Request.Context(), req)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}
	response.Success(c, http.StatusCreated, "Supplier created successfully", supplier)
}

func (h *Handler) UpdateSupplier(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.BadRequest(c, "Invalid supplier ID format", nil)
		return
	}

	var req UpdateSupplierRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid update data", validator.FormatValidationErrors(err))
		return
	}

	supplier, err := h.service.UpdateSupplier(c.Request.Context(), id, req)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}
	response.Success(c, http.StatusOK, "Supplier updated successfully", supplier)
}

func (h *Handler) DeleteSupplier(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.BadRequest(c, "Invalid supplier ID format", nil)
		return
	}

	if err := h.service.DeleteSupplier(c.Request.Context(), id); err != nil {
		response.InternalServerError(c, "Failed to delete supplier", err.Error())
		return
	}
	response.Success(c, http.StatusOK, "Supplier deactivated successfully", nil)
}

// ----------------- Purchase Request Handlers -----------------
func (h *Handler) ListPR(c *gin.Context) {
	var query PurchasingFilterQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		response.BadRequest(c, "Invalid query parameters", validator.FormatValidationErrors(err))
		return
	}

	prs, total, err := h.service.ListPR(c.Request.Context(), query)
	if err != nil {
		response.InternalServerError(c, "Failed to retrieve purchase requests", err.Error())
		return
	}
	response.Paginated(c, http.StatusOK, "Purchase requests retrieved successfully", prs, query.Page, query.PerPage, total)
}

func (h *Handler) GetPRByID(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.BadRequest(c, "Invalid PR ID format", nil)
		return
	}

	pr, err := h.service.GetPRByID(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, "Purchase request not found")
		return
	}
	response.Success(c, http.StatusOK, "Purchase request retrieved successfully", pr)
}

func (h *Handler) CreatePR(c *gin.Context) {
	var req CreatePurchaseRequestPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid PR data", validator.FormatValidationErrors(err))
		return
	}

	userIDRaw, exists := c.Get("user_id")
	if !exists {
		response.Unauthorized(c, "Unauthorized")
		return
	}
	requesterID := userIDRaw.(uuid.UUID)

	pr, err := h.service.CreatePR(c.Request.Context(), requesterID, req)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}
	response.Success(c, http.StatusCreated, "Purchase request created successfully", pr)
}

func (h *Handler) ApprovePR(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.BadRequest(c, "Invalid PR ID format", nil)
		return
	}

	var req ApprovalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid approval status", validator.FormatValidationErrors(err))
		return
	}

	userIDRaw, _ := c.Get("user_id")
	approverID := userIDRaw.(uuid.UUID)

	if err := h.service.ApprovePR(c.Request.Context(), id, approverID, req); err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}
	response.Success(c, http.StatusOK, "Purchase request status updated successfully", nil)
}

// ----------------- Purchase Order Handlers -----------------
func (h *Handler) ListPO(c *gin.Context) {
	var query PurchasingFilterQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		response.BadRequest(c, "Invalid query parameters", validator.FormatValidationErrors(err))
		return
	}

	pos, total, err := h.service.ListPO(c.Request.Context(), query)
	if err != nil {
		response.InternalServerError(c, "Failed to retrieve purchase orders", err.Error())
		return
	}
	response.Paginated(c, http.StatusOK, "Purchase orders retrieved successfully", pos, query.Page, query.PerPage, total)
}

func (h *Handler) GetPOByID(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.BadRequest(c, "Invalid PO ID format", nil)
		return
	}

	po, err := h.service.GetPOByID(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, "Purchase order not found")
		return
	}
	response.Success(c, http.StatusOK, "Purchase order retrieved successfully", po)
}

func (h *Handler) CreatePO(c *gin.Context) {
	var req CreatePurchaseOrderPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid PO data", validator.FormatValidationErrors(err))
		return
	}

	userIDRaw, exists := c.Get("user_id")
	if !exists {
		response.Unauthorized(c, "Unauthorized")
		return
	}
	creatorID := userIDRaw.(uuid.UUID)

	po, err := h.service.CreatePO(c.Request.Context(), creatorID, req)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}
	response.Success(c, http.StatusCreated, "Purchase order created successfully", po)
}

func (h *Handler) ApprovePO(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.BadRequest(c, "Invalid PO ID format", nil)
		return
	}

	var req ApprovalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid approval payload", validator.FormatValidationErrors(err))
		return
	}

	userIDRaw, _ := c.Get("user_id")
	approverID := userIDRaw.(uuid.UUID)

	if err := h.service.ApprovePO(c.Request.Context(), id, approverID, req); err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}
	response.Success(c, http.StatusOK, "Purchase order status updated successfully", nil)
}

func (h *Handler) CancelPO(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.BadRequest(c, "Invalid PO ID format", nil)
		return
	}

	if err := h.service.CancelPO(c.Request.Context(), id); err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}
	response.Success(c, http.StatusOK, "Purchase order cancelled successfully", nil)
}

// ----------------- Goods Receipt Handlers -----------------
func (h *Handler) ListGRN(c *gin.Context) {
	var query PurchasingFilterQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		response.BadRequest(c, "Invalid query parameters", validator.FormatValidationErrors(err))
		return
	}

	grns, total, err := h.service.ListGRN(c.Request.Context(), query)
	if err != nil {
		response.InternalServerError(c, "Failed to retrieve goods receipts", err.Error())
		return
	}
	response.Paginated(c, http.StatusOK, "Goods receipts retrieved successfully", grns, query.Page, query.PerPage, total)
}

func (h *Handler) GetGRNByID(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.BadRequest(c, "Invalid GRN ID format", nil)
		return
	}

	grn, err := h.service.GetGRNByID(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, "Goods receipt not found")
		return
	}
	response.Success(c, http.StatusOK, "Goods receipt retrieved successfully", grn)
}

func (h *Handler) ReceiveGoods(c *gin.Context) {
	var req CreateGoodsReceiptPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid goods receipt data", validator.FormatValidationErrors(err))
		return
	}

	userIDRaw, exists := c.Get("user_id")
	if !exists {
		response.Unauthorized(c, "Unauthorized")
		return
	}
	receiverID := userIDRaw.(uuid.UUID)

	grn, err := h.service.ReceiveGoods(c.Request.Context(), receiverID, req)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}
	response.Success(c, http.StatusCreated, "Goods received and inventory stock updated successfully", grn)
}
