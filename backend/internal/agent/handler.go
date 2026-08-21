package agent

import (
	"net/http"

	"erp-backend/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Handler struct {
	agentService AgentService
}

func NewHandler(agentService AgentService) *Handler {
	return &Handler{agentService: agentService}
}

func (h *Handler) ExecuteCommand(c *gin.Context) {
	var cmd AgentCommand
	if err := c.ShouldBindJSON(&cmd); err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid request payload", err.Error())
		return
	}

	// Attach authenticated user ID from context if available
	if uID, exists := c.Get("user_id"); exists {
		if parsedID, ok := uID.(uuid.UUID); ok {
			cmd.UserID = parsedID
		}
	}

	result, err := h.agentService.ExecuteCommand(c.Request.Context(), cmd)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Agent execution error", err.Error())
		return
	}

	response.Success(c, http.StatusOK, "Command processed", result)
}

func (h *Handler) AutoReplenish(c *gin.Context) {
	var userID uuid.UUID
	if uID, exists := c.Get("user_id"); exists {
		if parsedID, ok := uID.(uuid.UUID); ok {
			userID = parsedID
		}
	}

	result, err := h.agentService.AutoProcureLowStock(c.Request.Context(), userID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Auto replenish failed", err.Error())
		return
	}
	response.Success(c, http.StatusOK, "Auto replenishment processed", result)
}

func (h *Handler) ScanInventory(c *gin.Context) {
	result, err := h.agentService.ScanInventoryHealth(c.Request.Context())
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Inventory scan failed", err.Error())
		return
	}
	response.Success(c, http.StatusOK, "Inventory scanned", result)
}

func (h *Handler) AuditAnomalies(c *gin.Context) {
	result, err := h.agentService.AuditDiscrepancies(c.Request.Context())
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Audit failed", err.Error())
		return
	}
	response.Success(c, http.StatusOK, "Audit completed", result)
}
