package auth

import (
	"net/http"

	"erp-backend/pkg/config"
	"erp-backend/pkg/response"
	"erp-backend/pkg/validator"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Handler struct {
	service Service
	cfg     *config.Config
}

func NewHandler(service Service, cfg *config.Config) *Handler {
	return &Handler{
		service: service,
		cfg:     cfg,
	}
}

func (h *Handler) RegisterRoutes(rg *gin.RouterGroup, authMiddleware gin.HandlerFunc, requirePerm func(string) gin.HandlerFunc) {
	authGroup := rg.Group("/auth")
	{
		// Public Authentication Routes
		authGroup.POST("/login", h.Login)
		authGroup.POST("/register", h.Register)
		authGroup.POST("/refresh-token", h.RefreshToken)

		// Protected User Routes
		authGroup.POST("/logout", authMiddleware, h.Logout)
		authGroup.GET("/me", authMiddleware, h.GetProfile)

		// User Management Routes (RBAC Protected)
		authGroup.GET("/users", authMiddleware, requirePerm("auth:users:read"), h.ListUsers)
		authGroup.POST("/users", authMiddleware, requirePerm("auth:users:create"), h.CreateUser)
		authGroup.PUT("/users/:id", authMiddleware, requirePerm("auth:users:update"), h.UpdateUser)
		authGroup.DELETE("/users/:id", authMiddleware, requirePerm("auth:users:delete"), h.DeactivateUser)

		// Role & Permission Matrix Routes (RBAC Protected)
		authGroup.GET("/roles", authMiddleware, requirePerm("auth:roles:manage"), h.ListRoles)
		authGroup.POST("/roles", authMiddleware, requirePerm("auth:roles:manage"), h.CreateRole)
		authGroup.PUT("/roles/:id", authMiddleware, requirePerm("auth:roles:manage"), h.UpdateRole)
		authGroup.DELETE("/roles/:id", authMiddleware, requirePerm("auth:roles:manage"), h.DeleteRole)
		authGroup.GET("/permissions", authMiddleware, requirePerm("auth:roles:manage"), h.ListPermissions)
		authGroup.PUT("/roles/:id/permissions", authMiddleware, requirePerm("auth:roles:manage"), h.UpdateRolePermissions)
	}
}

func (h *Handler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid login credentials format", validator.FormatValidationErrors(err))
		return
	}

	res, err := h.service.Login(c.Request.Context(), req)
	if err != nil {
		response.Error(c, http.StatusUnauthorized, err.Error(), nil)
		return
	}

	response.Success(c, http.StatusOK, "Login successful", res)
}

func (h *Handler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid registration data", validator.FormatValidationErrors(err))
		return
	}

	res, err := h.service.Register(c.Request.Context(), req)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}

	response.Success(c, http.StatusCreated, "User registered successfully", res)
}

func (h *Handler) RefreshToken(c *gin.Context) {
	var req RefreshTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Refresh token is required", validator.FormatValidationErrors(err))
		return
	}

	res, err := h.service.RefreshToken(c.Request.Context(), req.RefreshToken)
	if err != nil {
		response.Unauthorized(c, err.Error())
		return
	}

	response.Success(c, http.StatusOK, "Token refreshed successfully", res)
}

func (h *Handler) Logout(c *gin.Context) {
	var req LogoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Refresh token is required to logout", validator.FormatValidationErrors(err))
		return
	}

	if err := h.service.Logout(c.Request.Context(), req.RefreshToken); err != nil {
		response.InternalServerError(c, "Failed to revoke token", err.Error())
		return
	}

	response.Success(c, http.StatusOK, "Logged out successfully", nil)
}

func (h *Handler) GetProfile(c *gin.Context) {
	userIDRaw, exists := c.Get("user_id")
	if !exists {
		response.Unauthorized(c, "Unauthorized")
		return
	}

	userID, ok := userIDRaw.(uuid.UUID)
	if !ok {
		response.Unauthorized(c, "Invalid user identifier")
		return
	}

	user, roles, permissions, err := h.service.GetProfile(c.Request.Context(), userID)
	if err != nil {
		response.NotFound(c, "User profile not found")
		return
	}

	response.Success(c, http.StatusOK, "Profile retrieved successfully", gin.H{
		"user":        user,
		"roles":       roles,
		"permissions": permissions,
	})
}

func (h *Handler) ListUsers(c *gin.Context) {
	var query UserFilterQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		response.BadRequest(c, "Invalid query parameters", validator.FormatValidationErrors(err))
		return
	}

	users, total, err := h.service.ListUsers(c.Request.Context(), query)
	if err != nil {
		response.InternalServerError(c, "Failed to retrieve users", err.Error())
		return
	}

	response.Paginated(c, http.StatusOK, "Users retrieved successfully", users, query.Page, query.PerPage, total)
}

func (h *Handler) CreateUser(c *gin.Context) {
	var req CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid user data", validator.FormatValidationErrors(err))
		return
	}

	user, err := h.service.CreateUserByAdmin(c.Request.Context(), req)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}

	response.Success(c, http.StatusCreated, "User created successfully", user)
}

func (h *Handler) UpdateUser(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.BadRequest(c, "Invalid user ID format", nil)
		return
	}

	var req UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid update data", validator.FormatValidationErrors(err))
		return
	}

	user, err := h.service.UpdateUser(c.Request.Context(), id, req)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}

	response.Success(c, http.StatusOK, "User updated successfully", user)
}

func (h *Handler) DeactivateUser(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.BadRequest(c, "Invalid user ID format", nil)
		return
	}

	if err := h.service.DeactivateUser(c.Request.Context(), id); err != nil {
		response.InternalServerError(c, "Failed to deactivate user", err.Error())
		return
	}

	response.Success(c, http.StatusOK, "User deactivated successfully", nil)
}

func (h *Handler) ListRoles(c *gin.Context) {
	roles, err := h.service.ListRoles(c.Request.Context())
	if err != nil {
		response.InternalServerError(c, "Failed to retrieve roles", err.Error())
		return
	}

	response.Success(c, http.StatusOK, "Roles retrieved successfully", roles)
}

func (h *Handler) CreateRole(c *gin.Context) {
	var req CreateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid role data", validator.FormatValidationErrors(err))
		return
	}

	role, err := h.service.CreateRole(c.Request.Context(), req)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}

	response.Success(c, http.StatusCreated, "Role created successfully", role)
}

func (h *Handler) UpdateRole(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.BadRequest(c, "Invalid role ID format", nil)
		return
	}

	var req UpdateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid role update data", validator.FormatValidationErrors(err))
		return
	}

	role, err := h.service.UpdateRole(c.Request.Context(), id, req)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}

	response.Success(c, http.StatusOK, "Role updated successfully", role)
}

func (h *Handler) DeleteRole(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.BadRequest(c, "Invalid role ID format", nil)
		return
	}

	if err := h.service.DeleteRole(c.Request.Context(), id); err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}

	response.Success(c, http.StatusOK, "Role deleted successfully", nil)
}

func (h *Handler) ListPermissions(c *gin.Context) {
	permissions, err := h.service.ListPermissions(c.Request.Context())
	if err != nil {
		response.InternalServerError(c, "Failed to retrieve permissions", err.Error())
		return
	}

	response.Success(c, http.StatusOK, "Permissions retrieved successfully", permissions)
}

func (h *Handler) UpdateRolePermissions(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.BadRequest(c, "Invalid role ID format", nil)
		return
	}

	var req UpdateRolePermissionsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid permission assignment data", validator.FormatValidationErrors(err))
		return
	}

	if err := h.service.UpdateRolePermissions(c.Request.Context(), id, req); err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}

	response.Success(c, http.StatusOK, "Role permissions updated successfully", nil)
}
