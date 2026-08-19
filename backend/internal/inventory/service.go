package inventory

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Service interface {
	// Categories
	ListCategories(ctx context.Context) ([]Category, error)
	CreateCategory(ctx context.Context, req CreateCategoryRequest) (*Category, error)
	UpdateCategory(ctx context.Context, id uuid.UUID, req UpdateCategoryRequest) (*Category, error)
	DeleteCategory(ctx context.Context, id uuid.UUID) error

	// Units
	ListUnits(ctx context.Context) ([]Unit, error)
	CreateUnit(ctx context.Context, req CreateUnitRequest) (*Unit, error)
	UpdateUnit(ctx context.Context, id uuid.UUID, req UpdateUnitRequest) (*Unit, error)
	DeleteUnit(ctx context.Context, id uuid.UUID) error

	// Products
	ListProducts(ctx context.Context, query ProductFilterQuery) ([]Product, int64, error)
	GetProductByID(ctx context.Context, id uuid.UUID) (*Product, error)
	CreateProduct(ctx context.Context, req CreateProductRequest) (*Product, error)
	UpdateProduct(ctx context.Context, id uuid.UUID, req UpdateProductRequest) (*Product, error)
	DeleteProduct(ctx context.Context, id uuid.UUID) error
	GetLowStockProducts(ctx context.Context) ([]Product, error)

	// Warehouses
	ListWarehouses(ctx context.Context) ([]Warehouse, error)
	GetWarehouseByID(ctx context.Context, id uuid.UUID) (*Warehouse, error)
	CreateWarehouse(ctx context.Context, req CreateWarehouseRequest) (*Warehouse, error)
	UpdateWarehouse(ctx context.Context, id uuid.UUID, req UpdateWarehouseRequest) (*Warehouse, error)
	DeleteWarehouse(ctx context.Context, id uuid.UUID) error

	// Stock Operations
	MutateStock(ctx context.Context, userID uuid.UUID, req StockMutationRequest) (*StockMutation, error)
	ListStockMutations(ctx context.Context, query StockMutationFilterQuery) ([]StockMutation, int64, error)
	GetProductStockDetails(ctx context.Context, productID uuid.UUID) ([]WarehouseStock, error)
	DeleteProductStock(ctx context.Context, productID, warehouseID uuid.UUID) error
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

// ----------------- Category Service -----------------
func (s *service) ListCategories(ctx context.Context) ([]Category, error) {
	return s.repo.FindAllCategories(ctx)
}

func (s *service) CreateCategory(ctx context.Context, req CreateCategoryRequest) (*Category, error) {
	existing, err := s.repo.FindCategoryByCode(ctx, req.Code)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, fmt.Errorf("category with code '%s' already exists", req.Code)
	}

	cat := &Category{
		ID:          uuid.New(),
		Code:        req.Code,
		Name:        req.Name,
		Description: req.Description,
	}

	if err := s.repo.CreateCategory(ctx, cat); err != nil {
		return nil, err
	}
	return cat, nil
}

func (s *service) UpdateCategory(ctx context.Context, id uuid.UUID, req UpdateCategoryRequest) (*Category, error) {
	cat, err := s.repo.FindCategoryByID(ctx, id)
	if err != nil || cat == nil {
		return nil, errors.New("category not found")
	}

	cat.Name = req.Name
	cat.Description = req.Description

	if err := s.repo.UpdateCategory(ctx, cat); err != nil {
		return nil, err
	}
	return cat, nil
}

func (s *service) DeleteCategory(ctx context.Context, id uuid.UUID) error {
	return s.repo.DeleteCategory(ctx, id)
}

// ----------------- Unit Service -----------------
func (s *service) ListUnits(ctx context.Context) ([]Unit, error) {
	return s.repo.FindAllUnits(ctx)
}

func (s *service) CreateUnit(ctx context.Context, req CreateUnitRequest) (*Unit, error) {
	existing, err := s.repo.FindUnitByCode(ctx, req.Code)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, fmt.Errorf("unit with code '%s' already exists", req.Code)
	}

	unit := &Unit{
		ID:     uuid.New(),
		Code:   req.Code,
		Name:   req.Name,
		Symbol: req.Symbol,
	}

	if err := s.repo.CreateUnit(ctx, unit); err != nil {
		return nil, err
	}
	return unit, nil
}

func (s *service) UpdateUnit(ctx context.Context, id uuid.UUID, req UpdateUnitRequest) (*Unit, error) {
	unit, err := s.repo.FindUnitByID(ctx, id)
	if err != nil || unit == nil {
		return nil, errors.New("unit not found")
	}

	unit.Name = req.Name
	unit.Symbol = req.Symbol

	if err := s.repo.UpdateUnit(ctx, unit); err != nil {
		return nil, err
	}
	return unit, nil
}

func (s *service) DeleteUnit(ctx context.Context, id uuid.UUID) error {
	return s.repo.DeleteUnit(ctx, id)
}

// ----------------- Product Service -----------------
func (s *service) ListProducts(ctx context.Context, query ProductFilterQuery) ([]Product, int64, error) {
	if query.Page <= 0 {
		query.Page = 1
	}
	if query.PerPage <= 0 || query.PerPage > 100 {
		query.PerPage = 10
	}

	products, total, err := s.repo.FindAllProducts(ctx, query)
	if err != nil {
		return nil, 0, err
	}

	if query.LowStock {
		var lowStockItems []Product
		for _, p := range products {
			if p.TotalStock <= p.MinStock {
				lowStockItems = append(lowStockItems, p)
			}
		}
		return lowStockItems, int64(len(lowStockItems)), nil
	}

	return products, total, nil
}

func (s *service) GetProductByID(ctx context.Context, id uuid.UUID) (*Product, error) {
	product, err := s.repo.FindProductByID(ctx, id)
	if err != nil || product == nil {
		return nil, errors.New("product not found")
	}
	return product, nil
}

func (s *service) CreateProduct(ctx context.Context, req CreateProductRequest) (*Product, error) {
	if req.SKU == "" {
		sku, err := s.repo.GenerateProductSKU(ctx)
		if err != nil {
			return nil, err
		}
		req.SKU = sku
	} else {
		existing, err := s.repo.FindProductBySKU(ctx, req.SKU)
		if err != nil {
			return nil, err
		}
		if existing != nil {
			return nil, fmt.Errorf("product with SKU '%s' already exists", req.SKU)
		}
	}

	unitID, err := uuid.Parse(req.UnitID)
	if err != nil {
		return nil, errors.New("invalid unit_id format")
	}

	unit, err := s.repo.FindUnitByID(ctx, unitID)
	if err != nil || unit == nil {
		return nil, errors.New("unit not found")
	}

	var catUUID *uuid.UUID
	if req.CategoryID != nil && *req.CategoryID != "" {
		cid, err := uuid.Parse(*req.CategoryID)
		if err != nil {
			return nil, errors.New("invalid category_id format")
		}
		catUUID = &cid
	}

	product := &Product{
		ID:           uuid.New(),
		SKU:          req.SKU,
		Name:         req.Name,
		Description:  req.Description,
		CategoryID:   catUUID,
		UnitID:       unitID,
		MinStock:     req.MinStock,
		CostPrice:    req.CostPrice,
		SellingPrice: req.SellingPrice,
		IsActive:     true,
	}

	if err := s.repo.CreateProduct(ctx, product); err != nil {
		return nil, err
	}

	// If initial stock and warehouse are provided, allocate initial stock
	if req.InitialWarehouseID != nil && *req.InitialWarehouseID != "" && req.InitialStock > 0 {
		if whID, err := uuid.Parse(*req.InitialWarehouseID); err == nil {
			_ = s.repo.WithTransaction(func(tx *gorm.DB) error {
				_ = s.repo.SetStock(ctx, tx, whID, product.ID, req.InitialStock, 0)
				initMutation := &StockMutation{
					ID:            uuid.New(),
					ProductID:     product.ID,
					ToWarehouseID: &whID,
					Qty:           req.InitialStock,
					MutationType:  "IN",
					ReferenceType: "INITIAL_STOCK",
					Notes:         "Stok Awal Pendaftaran Produk",
				}
				return s.repo.CreateStockMutation(ctx, tx, initMutation)
			})
		}
	}

	return s.repo.FindProductByID(ctx, product.ID)
}

func (s *service) UpdateProduct(ctx context.Context, id uuid.UUID, req UpdateProductRequest) (*Product, error) {
	product, err := s.repo.FindProductByID(ctx, id)
	if err != nil || product == nil {
		return nil, errors.New("product not found")
	}

	unitID, err := uuid.Parse(req.UnitID)
	if err != nil {
		return nil, errors.New("invalid unit_id format")
	}

	unit, err := s.repo.FindUnitByID(ctx, unitID)
	if err != nil || unit == nil {
		return nil, errors.New("unit not found")
	}

	var catUUID *uuid.UUID
	if req.CategoryID != nil && *req.CategoryID != "" {
		cid, err := uuid.Parse(*req.CategoryID)
		if err != nil {
			return nil, errors.New("invalid category_id format")
		}
		catUUID = &cid
	}

	product.Name = req.Name
	product.Description = req.Description
	product.CategoryID = catUUID
	product.UnitID = unitID
	product.MinStock = req.MinStock
	product.CostPrice = req.CostPrice
	product.SellingPrice = req.SellingPrice
	if req.IsActive != nil {
		product.IsActive = *req.IsActive
	}

	if err := s.repo.UpdateProduct(ctx, product); err != nil {
		return nil, err
	}

	// If warehouse and stock are provided, update/adjust stock
	if req.InitialWarehouseID != nil && *req.InitialWarehouseID != "" && req.InitialStock != nil {
		if whID, err := uuid.Parse(*req.InitialWarehouseID); err == nil {
			_ = s.repo.WithTransaction(func(tx *gorm.DB) error {
				_ = s.repo.SetStock(ctx, tx, whID, product.ID, *req.InitialStock, 0)
				initMutation := &StockMutation{
					ID:            uuid.New(),
					ProductID:     product.ID,
					ToWarehouseID: &whID,
					Qty:           *req.InitialStock,
					MutationType:  "ADJUSTMENT",
					ReferenceType: "MANUAL_ADJUSTMENT",
					Notes:         "Penyesuaian Stok dari Edit Produk",
				}
				return s.repo.CreateStockMutation(ctx, tx, initMutation)
			})
		}
	}

	return s.repo.FindProductByID(ctx, product.ID)
}

func (s *service) DeleteProduct(ctx context.Context, id uuid.UUID) error {
	return s.repo.DeleteProduct(ctx, id)
}

func (s *service) GetLowStockProducts(ctx context.Context) ([]Product, error) {
	products, _, err := s.repo.FindAllProducts(ctx, ProductFilterQuery{Page: 1, PerPage: 1000})
	if err != nil {
		return nil, err
	}

	var lowStock []Product
	for _, p := range products {
		if p.TotalStock <= p.MinStock {
			lowStock = append(lowStock, p)
		}
	}
	return lowStock, nil
}

// ----------------- Warehouse Service -----------------
func (s *service) ListWarehouses(ctx context.Context) ([]Warehouse, error) {
	return s.repo.FindAllWarehouses(ctx)
}

func (s *service) GetWarehouseByID(ctx context.Context, id uuid.UUID) (*Warehouse, error) {
	wh, err := s.repo.FindWarehouseByID(ctx, id)
	if err != nil || wh == nil {
		return nil, errors.New("warehouse not found")
	}
	return wh, nil
}

func (s *service) CreateWarehouse(ctx context.Context, req CreateWarehouseRequest) (*Warehouse, error) {
	if req.Code == "" {
		code, err := s.repo.GenerateWarehouseCode(ctx)
		if err != nil {
			return nil, err
		}
		req.Code = code
	} else {
		existing, err := s.repo.FindWarehouseByCode(ctx, req.Code)
		if err != nil {
			return nil, err
		}
		if existing != nil {
			return nil, fmt.Errorf("warehouse with code '%s' already exists", req.Code)
		}
	}

	addr := req.Address
	if addr == "" {
		addr = req.Location
	}

	wh := &Warehouse{
		ID:       uuid.New(),
		Code:     req.Code,
		Name:     req.Name,
		Address:  addr,
		IsActive: true,
	}

	if err := s.repo.CreateWarehouse(ctx, wh); err != nil {
		return nil, err
	}
	return wh, nil
}

func (s *service) UpdateWarehouse(ctx context.Context, id uuid.UUID, req UpdateWarehouseRequest) (*Warehouse, error) {
	wh, err := s.repo.FindWarehouseByID(ctx, id)
	if err != nil || wh == nil {
		return nil, errors.New("warehouse not found")
	}

	wh.Name = req.Name
	if req.Address != "" {
		wh.Address = req.Address
	} else if req.Location != "" {
		wh.Address = req.Location
	}
	if req.IsActive != nil {
		wh.IsActive = *req.IsActive
	}

	if err := s.repo.UpdateWarehouse(ctx, wh); err != nil {
		return nil, err
	}
	return wh, nil
}

func (s *service) DeleteWarehouse(ctx context.Context, id uuid.UUID) error {
	return s.repo.DeleteWarehouse(ctx, id)
}

// ----------------- Stock Mutation Service (ACID) -----------------
func (s *service) MutateStock(ctx context.Context, userID uuid.UUID, req StockMutationRequest) (*StockMutation, error) {
	productID, err := uuid.Parse(req.ProductID)
	if err != nil {
		return nil, errors.New("invalid product_id format")
	}

	product, err := s.repo.FindProductByID(ctx, productID)
	if err != nil || product == nil {
		return nil, errors.New("product not found")
	}

	var fromWHUUID, toWHUUID *uuid.UUID
	if req.FromWarehouseID != nil && *req.FromWarehouseID != "" {
		fid, err := uuid.Parse(*req.FromWarehouseID)
		if err != nil {
			return nil, errors.New("invalid from_warehouse_id format")
		}
		fromWHUUID = &fid
	}
	if req.ToWarehouseID != nil && *req.ToWarehouseID != "" {
		tid, err := uuid.Parse(*req.ToWarehouseID)
		if err != nil {
			return nil, errors.New("invalid to_warehouse_id format")
		}
		toWHUUID = &tid
	}

	var refUUID *uuid.UUID
	if req.ReferenceID != nil && *req.ReferenceID != "" {
		rid, err := uuid.Parse(*req.ReferenceID)
		if err == nil {
			refUUID = &rid
		}
	}

	mutation := &StockMutation{
		ID:              uuid.New(),
		ProductID:       productID,
		FromWarehouseID: fromWHUUID,
		ToWarehouseID:   toWHUUID,
		Qty:             req.Qty,
		MutationType:    req.MutationType,
		ReferenceType:   req.ReferenceType,
		ReferenceID:     refUUID,
		Notes:           req.Notes,
		CreatedBy:       &userID,
	}

	// Perform stock balance calculation inside atomic ACID database transaction
	err = s.repo.WithTransaction(func(tx *gorm.DB) error {
		switch req.MutationType {
		case "IN":
			if toWHUUID == nil {
				return errors.New("to_warehouse_id is required for IN mutation")
			}
			stock, err := s.repo.GetStock(ctx, *toWHUUID, productID)
			if err != nil {
				return err
			}
			currentStock := 0.0
			reservedStock := 0.0
			if stock != nil {
				currentStock = stock.CurrentStock
				reservedStock = stock.ReservedStock
			}
			newStock := currentStock + req.Qty
			if err := s.repo.SetStock(ctx, tx, *toWHUUID, productID, newStock, reservedStock); err != nil {
				return err
			}

		case "OUT":
			if fromWHUUID == nil {
				return errors.New("from_warehouse_id is required for OUT mutation")
			}
			stock, err := s.repo.GetStock(ctx, *fromWHUUID, productID)
			if err != nil {
				return err
			}
			if stock == nil || (stock.CurrentStock-stock.ReservedStock) < req.Qty {
				available := 0.0
				if stock != nil {
					available = stock.CurrentStock - stock.ReservedStock
				}
				return fmt.Errorf("insufficient stock in warehouse (available: %.2f, requested: %.2f)", available, req.Qty)
			}
			newStock := stock.CurrentStock - req.Qty
			if err := s.repo.SetStock(ctx, tx, *fromWHUUID, productID, newStock, stock.ReservedStock); err != nil {
				return err
			}

		case "TRANSFER":
			if fromWHUUID == nil || toWHUUID == nil {
				return errors.New("both from_warehouse_id and to_warehouse_id are required for TRANSFER")
			}
			if *fromWHUUID == *toWHUUID {
				return errors.New("source and destination warehouses cannot be the same")
			}

			// Deduct source
			srcStock, err := s.repo.GetStock(ctx, *fromWHUUID, productID)
			if err != nil {
				return err
			}
			if srcStock == nil || (srcStock.CurrentStock-srcStock.ReservedStock) < req.Qty {
				available := 0.0
				if srcStock != nil {
					available = srcStock.CurrentStock - srcStock.ReservedStock
				}
				return fmt.Errorf("insufficient stock in source warehouse (available: %.2f, transfer qty: %.2f)", available, req.Qty)
			}
			newSrcStock := srcStock.CurrentStock - req.Qty
			if err := s.repo.SetStock(ctx, tx, *fromWHUUID, productID, newSrcStock, srcStock.ReservedStock); err != nil {
				return err
			}

			// Add destination
			dstStock, err := s.repo.GetStock(ctx, *toWHUUID, productID)
			if err != nil {
				return err
			}
			dstCurrent := 0.0
			dstReserved := 0.0
			if dstStock != nil {
				dstCurrent = dstStock.CurrentStock
				dstReserved = dstStock.ReservedStock
			}
			newDstStock := dstCurrent + req.Qty
			if err := s.repo.SetStock(ctx, tx, *toWHUUID, productID, newDstStock, dstReserved); err != nil {
				return err
			}

		case "ADJUSTMENT":
			// Stock Opname: Sets exact physical count
			targetWH := toWHUUID
			if targetWH == nil {
				targetWH = fromWHUUID
			}
			if targetWH == nil {
				return errors.New("warehouse ID is required for ADJUSTMENT / Stock Opname")
			}
			reservedStock := 0.0
			stock, err := s.repo.GetStock(ctx, *targetWH, productID)
			if err == nil && stock != nil {
				reservedStock = stock.ReservedStock
			}
			// req.Qty represents the newly confirmed physical stock
			if err := s.repo.SetStock(ctx, tx, *targetWH, productID, req.Qty, reservedStock); err != nil {
				return err
			}
		}

		// Record mutation log
		return s.repo.CreateStockMutation(ctx, tx, mutation)
	})

	if err != nil {
		return nil, err
	}

	return mutation, nil
}

func (s *service) ListStockMutations(ctx context.Context, query StockMutationFilterQuery) ([]StockMutation, int64, error) {
	if query.Page <= 0 {
		query.Page = 1
	}
	if query.PerPage <= 0 || query.PerPage > 100 {
		query.PerPage = 10
	}
	return s.repo.ListStockMutations(ctx, query)
}

func (s *service) GetProductStockDetails(ctx context.Context, productID uuid.UUID) ([]WarehouseStock, error) {
	return s.repo.GetProductStocks(ctx, productID)
}

func (s *service) DeleteProductStock(ctx context.Context, productID, warehouseID uuid.UUID) error {
	return s.repo.DeleteStock(ctx, nil, warehouseID, productID)
}
