package inventory

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
	invGroup := rg.Group("/inventory", authMiddleware)
	{
		// Categories
		invGroup.GET("/categories", requirePerm("inventory:products:read"), h.ListCategories)
		invGroup.POST("/categories", requirePerm("inventory:products:create"), h.CreateCategory)
		invGroup.PUT("/categories/:id", requirePerm("inventory:products:update"), h.UpdateCategory)
		invGroup.DELETE("/categories/:id", requirePerm("inventory:products:delete"), h.DeleteCategory)

		// Units
		invGroup.GET("/units", requirePerm("inventory:products:read"), h.ListUnits)
		invGroup.POST("/units", requirePerm("inventory:products:create"), h.CreateUnit)
		invGroup.PUT("/units/:id", requirePerm("inventory:products:update"), h.UpdateUnit)
		invGroup.DELETE("/units/:id", requirePerm("inventory:products:delete"), h.DeleteUnit)

		// Products
		invGroup.GET("/products", requirePerm("inventory:products:read"), h.ListProducts)
		invGroup.GET("/products/low-stock", requirePerm("inventory:products:read"), h.GetLowStockProducts)
		invGroup.GET("/products/:id", requirePerm("inventory:products:read"), h.GetProductByID)
		invGroup.POST("/products", requirePerm("inventory:products:create"), h.CreateProduct)
		invGroup.PUT("/products/:id", requirePerm("inventory:products:update"), h.UpdateProduct)
		invGroup.DELETE("/products/:id", requirePerm("inventory:products:delete"), h.DeleteProduct)
		invGroup.GET("/products/:id/stocks", requirePerm("inventory:products:read"), h.GetProductStockDetails)
		invGroup.DELETE("/products/:id/stocks/:warehouse_id", requirePerm("inventory:products:update"), h.DeleteProductStock)

		// Warehouses
		invGroup.GET("/warehouses", requirePerm("inventory:warehouses:manage"), h.ListWarehouses)
		invGroup.GET("/warehouses/:id", requirePerm("inventory:warehouses:manage"), h.GetWarehouseByID)
		invGroup.POST("/warehouses", requirePerm("inventory:warehouses:manage"), h.CreateWarehouse)
		invGroup.PUT("/warehouses/:id", requirePerm("inventory:warehouses:manage"), h.UpdateWarehouse)
		invGroup.DELETE("/warehouses/:id", requirePerm("inventory:warehouses:manage"), h.DeleteWarehouse)

		// Stock Mutations
		invGroup.POST("/stock-mutations", requirePerm("inventory:stock:mutate"), h.MutateStock)
		invGroup.GET("/stock-mutations", requirePerm("inventory:products:read"), h.ListStockMutations)
		invGroup.POST("/mutations", requirePerm("inventory:stock:mutate"), h.MutateStock)
		invGroup.GET("/mutations", requirePerm("inventory:products:read"), h.ListStockMutations)
	}
}

// ----------------- Category Handlers -----------------
func (h *Handler) ListCategories(c *gin.Context) {
	categories, err := h.service.ListCategories(c.Request.Context())
	if err != nil {
		response.InternalServerError(c, "Failed to retrieve categories", err.Error())
		return
	}
	response.Success(c, http.StatusOK, "Categories retrieved successfully", categories)
}

func (h *Handler) CreateCategory(c *gin.Context) {
	var req CreateCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid category data", validator.FormatValidationErrors(err))
		return
	}

	cat, err := h.service.CreateCategory(c.Request.Context(), req)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}
	response.Success(c, http.StatusCreated, "Category created successfully", cat)
}

func (h *Handler) UpdateCategory(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.BadRequest(c, "Invalid category ID format", nil)
		return
	}

	var req UpdateCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid update data", validator.FormatValidationErrors(err))
		return
	}

	cat, err := h.service.UpdateCategory(c.Request.Context(), id, req)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}
	response.Success(c, http.StatusOK, "Category updated successfully", cat)
}

func (h *Handler) DeleteCategory(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.BadRequest(c, "Invalid category ID format", nil)
		return
	}

	if err := h.service.DeleteCategory(c.Request.Context(), id); err != nil {
		response.InternalServerError(c, "Failed to delete category", err.Error())
		return
	}
	response.Success(c, http.StatusOK, "Category deleted successfully", nil)
}

// ----------------- Unit Handlers -----------------
func (h *Handler) ListUnits(c *gin.Context) {
	units, err := h.service.ListUnits(c.Request.Context())
	if err != nil {
		response.InternalServerError(c, "Failed to retrieve units", err.Error())
		return
	}
	response.Success(c, http.StatusOK, "Units retrieved successfully", units)
}

func (h *Handler) CreateUnit(c *gin.Context) {
	var req CreateUnitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid unit data", validator.FormatValidationErrors(err))
		return
	}

	unit, err := h.service.CreateUnit(c.Request.Context(), req)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}
	response.Success(c, http.StatusCreated, "Unit created successfully", unit)
}

func (h *Handler) UpdateUnit(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.BadRequest(c, "Invalid unit ID format", nil)
		return
	}

	var req UpdateUnitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid update data", validator.FormatValidationErrors(err))
		return
	}

	unit, err := h.service.UpdateUnit(c.Request.Context(), id, req)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}
	response.Success(c, http.StatusOK, "Unit updated successfully", unit)
}

func (h *Handler) DeleteUnit(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.BadRequest(c, "Invalid unit ID format", nil)
		return
	}

	if err := h.service.DeleteUnit(c.Request.Context(), id); err != nil {
		response.InternalServerError(c, "Failed to delete unit", err.Error())
		return
	}
	response.Success(c, http.StatusOK, "Unit deleted successfully", nil)
}

// ----------------- Product Handlers -----------------
func (h *Handler) ListProducts(c *gin.Context) {
	var query ProductFilterQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		response.BadRequest(c, "Invalid query parameters", validator.FormatValidationErrors(err))
		return
	}

	products, total, err := h.service.ListProducts(c.Request.Context(), query)
	if err != nil {
		response.InternalServerError(c, "Failed to retrieve products", err.Error())
		return
	}
	response.Paginated(c, http.StatusOK, "Products retrieved successfully", products, query.Page, query.PerPage, total)
}

func (h *Handler) GetLowStockProducts(c *gin.Context) {
	products, err := h.service.GetLowStockProducts(c.Request.Context())
	if err != nil {
		response.InternalServerError(c, "Failed to retrieve low stock products", err.Error())
		return
	}
	response.Success(c, http.StatusOK, "Low stock products retrieved successfully", products)
}

func (h *Handler) GetProductByID(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.BadRequest(c, "Invalid product ID format", nil)
		return
	}

	product, err := h.service.GetProductByID(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, "Product not found")
		return
	}
	response.Success(c, http.StatusOK, "Product retrieved successfully", product)
}

func (h *Handler) CreateProduct(c *gin.Context) {
	var req CreateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid product data", validator.FormatValidationErrors(err))
		return
	}

	product, err := h.service.CreateProduct(c.Request.Context(), req)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}
	response.Success(c, http.StatusCreated, "Product created successfully", product)
}

func (h *Handler) UpdateProduct(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.BadRequest(c, "Invalid product ID format", nil)
		return
	}

	var req UpdateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid update data", validator.FormatValidationErrors(err))
		return
	}

	product, err := h.service.UpdateProduct(c.Request.Context(), id, req)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}
	response.Success(c, http.StatusOK, "Product updated successfully", product)
}

func (h *Handler) DeleteProduct(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.BadRequest(c, "Invalid product ID format", nil)
		return
	}

	if err := h.service.DeleteProduct(c.Request.Context(), id); err != nil {
		response.InternalServerError(c, "Failed to delete product", err.Error())
		return
	}
	response.Success(c, http.StatusOK, "Product deactivated successfully", nil)
}

func (h *Handler) GetProductStockDetails(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.BadRequest(c, "Invalid product ID format", nil)
		return
	}

	stocks, err := h.service.GetProductStockDetails(c.Request.Context(), id)
	if err != nil {
		response.InternalServerError(c, "Failed to retrieve stock details", err.Error())
		return
	}
	response.Success(c, http.StatusOK, "Product stocks retrieved successfully", stocks)
}

// ----------------- Warehouse Handlers -----------------
func (h *Handler) ListWarehouses(c *gin.Context) {
	warehouses, err := h.service.ListWarehouses(c.Request.Context())
	if err != nil {
		response.InternalServerError(c, "Failed to retrieve warehouses", err.Error())
		return
	}
	response.Success(c, http.StatusOK, "Warehouses retrieved successfully", warehouses)
}

func (h *Handler) GetWarehouseByID(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.BadRequest(c, "Invalid warehouse ID format", nil)
		return
	}

	wh, err := h.service.GetWarehouseByID(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, "Warehouse not found")
		return
	}
	response.Success(c, http.StatusOK, "Warehouse retrieved successfully", wh)
}

func (h *Handler) CreateWarehouse(c *gin.Context) {
	var req CreateWarehouseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid warehouse data", validator.FormatValidationErrors(err))
		return
	}

	wh, err := h.service.CreateWarehouse(c.Request.Context(), req)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}
	response.Success(c, http.StatusCreated, "Warehouse created successfully", wh)
}

func (h *Handler) UpdateWarehouse(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.BadRequest(c, "Invalid warehouse ID format", nil)
		return
	}

	var req UpdateWarehouseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid update data", validator.FormatValidationErrors(err))
		return
	}

	wh, err := h.service.UpdateWarehouse(c.Request.Context(), id, req)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}
	response.Success(c, http.StatusOK, "Warehouse updated successfully", wh)
}

func (h *Handler) DeleteWarehouse(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.BadRequest(c, "Invalid warehouse ID format", nil)
		return
	}

	if err := h.service.DeleteWarehouse(c.Request.Context(), id); err != nil {
		response.InternalServerError(c, "Failed to delete warehouse", err.Error())
		return
	}
	response.Success(c, http.StatusOK, "Warehouse deactivated successfully", nil)
}

// ----------------- Stock Mutation Handlers -----------------
func (h *Handler) MutateStock(c *gin.Context) {
	var req StockMutationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid mutation data", validator.FormatValidationErrors(err))
		return
	}

	userIDRaw, exists := c.Get("user_id")
	if !exists {
		response.Unauthorized(c, "Unauthorized")
		return
	}
	userID := userIDRaw.(uuid.UUID)

	mutation, err := h.service.MutateStock(c.Request.Context(), userID, req)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}

	response.Success(c, http.StatusCreated, "Stock mutation executed successfully", mutation)
}

func (h *Handler) ListStockMutations(c *gin.Context) {
	var query StockMutationFilterQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		response.BadRequest(c, "Invalid query parameters", validator.FormatValidationErrors(err))
		return
	}

	mutations, total, err := h.service.ListStockMutations(c.Request.Context(), query)
	if err != nil {
		response.InternalServerError(c, "Failed to retrieve stock mutations", err.Error())
		return
	}
	response.Paginated(c, http.StatusOK, "Stock mutations retrieved successfully", mutations, query.Page, query.PerPage, total)
}

func (h *Handler) DeleteProductStock(c *gin.Context) {
	productID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid product ID", nil)
		return
	}
	warehouseID, err := uuid.Parse(c.Param("warehouse_id"))
	if err != nil {
		response.BadRequest(c, "Invalid warehouse ID", nil)
		return
	}

	if err := h.service.DeleteProductStock(c.Request.Context(), productID, warehouseID); err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}
	response.Success(c, http.StatusOK, "Stock record deleted successfully", nil)
}
