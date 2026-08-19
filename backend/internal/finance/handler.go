package finance

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
	finGroup := rg.Group("/finance", authMiddleware)
	{
		// Accounts / COA
		finGroup.GET("/accounts", requirePerm("finance:accounts:read"), h.ListAccounts)
		finGroup.GET("/accounts/:id", requirePerm("finance:accounts:read"), h.GetAccountByID)
		finGroup.POST("/accounts", requirePerm("finance:accounts:manage"), h.CreateAccount)
		finGroup.PUT("/accounts/:id", requirePerm("finance:accounts:manage"), h.UpdateAccount)
		finGroup.DELETE("/accounts/:id", requirePerm("finance:accounts:manage"), h.DeleteAccount)

		// General Ledger Journals
		finGroup.GET("/journals", requirePerm("finance:journals:read"), h.ListJournals)
		finGroup.GET("/journals/:id", requirePerm("finance:journals:read"), h.GetJournalByID)
		finGroup.POST("/journals", requirePerm("finance:journals:create"), h.CreateJournal)

		// Financial Reports
		finGroup.GET("/reports/trial-balance", requirePerm("finance:reports:read"), h.GetTrialBalance)
	}
}

// ----------------- Account Handlers -----------------
func (h *Handler) ListAccounts(c *gin.Context) {
	var query FinanceFilterQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		response.BadRequest(c, "Invalid query parameters", validator.FormatValidationErrors(err))
		return
	}

	accounts, err := h.service.ListAccounts(c.Request.Context(), query)
	if err != nil {
		response.InternalServerError(c, "Failed to retrieve accounts", err.Error())
		return
	}
	response.Success(c, http.StatusOK, "Accounts retrieved successfully", accounts)
}

func (h *Handler) GetAccountByID(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.BadRequest(c, "Invalid account ID format", nil)
		return
	}

	account, err := h.service.GetAccountByID(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, "Account not found")
		return
	}
	response.Success(c, http.StatusOK, "Account retrieved successfully", account)
}

func (h *Handler) CreateAccount(c *gin.Context) {
	var req CreateAccountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid account data", validator.FormatValidationErrors(err))
		return
	}

	account, err := h.service.CreateAccount(c.Request.Context(), req)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}
	response.Success(c, http.StatusCreated, "Account created successfully", account)
}

func (h *Handler) UpdateAccount(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.BadRequest(c, "Invalid account ID format", nil)
		return
	}

	var req CreateAccountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid account data", validator.FormatValidationErrors(err))
		return
	}

	account, err := h.service.UpdateAccount(c.Request.Context(), id, req)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}
	response.Success(c, http.StatusOK, "Account updated successfully", account)
}

func (h *Handler) DeleteAccount(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.BadRequest(c, "Invalid account ID format", nil)
		return
	}

	if err := h.service.DeleteAccount(c.Request.Context(), id); err != nil {
		response.InternalServerError(c, "Failed to deactivate account", err.Error())
		return
	}
	response.Success(c, http.StatusOK, "Account deactivated successfully", nil)
}

// ----------------- Journal Handlers -----------------
func (h *Handler) ListJournals(c *gin.Context) {
	var query FinanceFilterQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		response.BadRequest(c, "Invalid query parameters", validator.FormatValidationErrors(err))
		return
	}

	journals, total, err := h.service.ListJournals(c.Request.Context(), query)
	if err != nil {
		response.InternalServerError(c, "Failed to retrieve journal entries", err.Error())
		return
	}
	response.Paginated(c, http.StatusOK, "Journal entries retrieved successfully", journals, query.Page, query.PerPage, total)
}

func (h *Handler) GetJournalByID(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.BadRequest(c, "Invalid journal entry ID format", nil)
		return
	}

	journal, err := h.service.GetJournalByID(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, "Journal entry not found")
		return
	}
	response.Success(c, http.StatusOK, "Journal entry retrieved successfully", journal)
}

func (h *Handler) CreateJournal(c *gin.Context) {
	var req CreateJournalEntryPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid journal entry payload", validator.FormatValidationErrors(err))
		return
	}

	userIDRaw, exists := c.Get("user_id")
	if !exists {
		response.Unauthorized(c, "Unauthorized")
		return
	}
	creatorID := userIDRaw.(uuid.UUID)

	journal, err := h.service.CreateJournal(c.Request.Context(), creatorID, req)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}
	response.Success(c, http.StatusCreated, "Journal entry created successfully", journal)
}

// ----------------- Financial Reports -----------------
func (h *Handler) GetTrialBalance(c *gin.Context) {
	rows, err := h.service.GetTrialBalance(c.Request.Context())
	if err != nil {
		response.InternalServerError(c, "Failed to generate trial balance report", err.Error())
		return
	}
	response.Success(c, http.StatusOK, "Trial balance report generated successfully", rows)
}
