package auth

import (
	"context"
	"errors"

	"erp-backend/pkg/database"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Repository interface {
	FindByEmail(ctx context.Context, email string) (*User, error)
	FindByID(ctx context.Context, id uuid.UUID) (*User, error)
	FindAllUsers(ctx context.Context, query UserFilterQuery) ([]User, int64, error)
	CreateUser(ctx context.Context, user *User) error
	UpdateUser(ctx context.Context, user *User) error
	DeleteUser(ctx context.Context, id uuid.UUID) error
	FindRoleByCode(ctx context.Context, code string) (*Role, error)
	FindRoleByID(ctx context.Context, id uuid.UUID) (*Role, error)
	FindAllRoles(ctx context.Context) ([]Role, error)
	CreateRole(ctx context.Context, role *Role) error
	UpdateRole(ctx context.Context, role *Role) error
	DeleteRole(ctx context.Context, id uuid.UUID) error
	FindAllPermissions(ctx context.Context) ([]Permission, error)
	AssignRole(ctx context.Context, userID, roleID uuid.UUID) error
	SetUserRoles(ctx context.Context, userID uuid.UUID, roleIDs []uuid.UUID) error
	SetRolePermissions(ctx context.Context, roleID uuid.UUID, permissionIDs []uuid.UUID) error
	GetUserPermissions(ctx context.Context, userID uuid.UUID) ([]string, error)
	SaveRefreshToken(ctx context.Context, token *RefreshToken) error
	FindRefreshToken(ctx context.Context, tokenHash string) (*RefreshToken, error)
	RevokeRefreshToken(ctx context.Context, tokenHash string) error
	RevokeAllUserTokens(ctx context.Context, userID uuid.UUID) error
}

type repository struct {
	db *database.DB
}

func NewRepository(db *database.DB) Repository {
	return &repository{db: db}
}

func (r *repository) FindByEmail(ctx context.Context, email string) (*User, error) {
	var user User
	err := r.db.WithContext(ctx).
		Preload("Roles").
		Where("email = ?", email).
		First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

func (r *repository) FindByID(ctx context.Context, id uuid.UUID) (*User, error) {
	var user User
	err := r.db.WithContext(ctx).
		Preload("Roles").
		Where("id = ?", id).
		First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

func (r *repository) FindAllUsers(ctx context.Context, query UserFilterQuery) ([]User, int64, error) {
	var users []User
	var total int64

	dbQuery := r.db.WithContext(ctx).Model(&User{})

	if query.Search != "" {
		searchPattern := "%" + query.Search + "%"
		dbQuery = dbQuery.Where("full_name ILIKE ? OR email ILIKE ?", searchPattern, searchPattern)
	}

	if query.RoleID != "" {
		dbQuery = dbQuery.Joins("JOIN auth.user_roles ur ON auth.users.id = ur.user_id").
			Where("ur.role_id = ?", query.RoleID)
	}

	if err := dbQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (query.Page - 1) * query.PerPage
	err := dbQuery.Preload("Roles").
		Order("created_at DESC").
		Offset(offset).
		Limit(query.PerPage).
		Find(&users).Error

	return users, total, err
}

func (r *repository) CreateUser(ctx context.Context, user *User) error {
	return r.db.WithContext(ctx).Create(user).Error
}

func (r *repository) UpdateUser(ctx context.Context, user *User) error {
	return r.db.WithContext(ctx).Save(user).Error
}

func (r *repository) DeleteUser(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Model(&User{}).Where("id = ?", id).Update("is_active", false).Error
}

func (r *repository) FindRoleByCode(ctx context.Context, code string) (*Role, error) {
	var role Role
	err := r.db.WithContext(ctx).Where("code = ?", code).First(&role).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &role, nil
}

func (r *repository) FindRoleByID(ctx context.Context, id uuid.UUID) (*Role, error) {
	var role Role
	err := r.db.WithContext(ctx).Preload("Permissions").Where("id = ?", id).First(&role).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &role, nil
}

func (r *repository) FindAllRoles(ctx context.Context) ([]Role, error) {
	var roles []Role
	err := r.db.WithContext(ctx).Preload("Permissions").Order("code ASC").Find(&roles).Error
	return roles, err
}

func (r *repository) CreateRole(ctx context.Context, role *Role) error {
	return r.db.WithContext(ctx).Create(role).Error
}

func (r *repository) UpdateRole(ctx context.Context, role *Role) error {
	return r.db.WithContext(ctx).Save(role).Error
}

func (r *repository) DeleteRole(ctx context.Context, id uuid.UUID) error {
	return r.db.WithTransaction(func(tx *gorm.DB) error {
		if err := tx.Exec("DELETE FROM auth.role_permissions WHERE role_id = ?", id).Error; err != nil {
			return err
		}
		if err := tx.Exec("DELETE FROM auth.user_roles WHERE role_id = ?", id).Error; err != nil {
			return err
		}
		return tx.Delete(&Role{}, "id = ?", id).Error
	})
}

func (r *repository) FindAllPermissions(ctx context.Context) ([]Permission, error) {
	var permissions []Permission
	err := r.db.WithContext(ctx).Order("module ASC, code ASC").Find(&permissions).Error
	return permissions, err
}

func (r *repository) AssignRole(ctx context.Context, userID, roleID uuid.UUID) error {
	return r.db.WithContext(ctx).Exec(
		"INSERT INTO auth.user_roles (user_id, role_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
		userID, roleID,
	).Error
}

func (r *repository) SetUserRoles(ctx context.Context, userID uuid.UUID, roleIDs []uuid.UUID) error {
	return r.db.WithTransaction(func(tx *gorm.DB) error {
		if err := tx.Exec("DELETE FROM auth.user_roles WHERE user_id = ?", userID).Error; err != nil {
			return err
		}
		for _, rid := range roleIDs {
			if err := tx.Exec("INSERT INTO auth.user_roles (user_id, role_id) VALUES (?, ?)", userID, rid).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *repository) SetRolePermissions(ctx context.Context, roleID uuid.UUID, permissionIDs []uuid.UUID) error {
	return r.db.WithTransaction(func(tx *gorm.DB) error {
		if err := tx.Exec("DELETE FROM auth.role_permissions WHERE role_id = ?", roleID).Error; err != nil {
			return err
		}
		for _, pid := range permissionIDs {
			if err := tx.Exec("INSERT INTO auth.role_permissions (role_id, permission_id) VALUES (?, ?)", roleID, pid).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *repository) GetUserPermissions(ctx context.Context, userID uuid.UUID) ([]string, error) {
	var permissions []string
	query := `
		SELECT DISTINCT p.code
		FROM auth.permissions p
		JOIN auth.role_permissions rp ON p.id = rp.permission_id
		JOIN auth.user_roles ur ON rp.role_id = ur.role_id
		WHERE ur.user_id = ?
	`
	err := r.db.WithContext(ctx).Raw(query, userID).Scan(&permissions).Error
	return permissions, err
}

func (r *repository) SaveRefreshToken(ctx context.Context, token *RefreshToken) error {
	return r.db.WithContext(ctx).Create(token).Error
}

func (r *repository) FindRefreshToken(ctx context.Context, tokenHash string) (*RefreshToken, error) {
	var token RefreshToken
	err := r.db.WithContext(ctx).
		Where("token_hash = ? AND is_revoked = false", tokenHash).
		First(&token).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &token, nil
}

func (r *repository) RevokeRefreshToken(ctx context.Context, tokenHash string) error {
	return r.db.WithContext(ctx).
		Model(&RefreshToken{}).
		Where("token_hash = ?", tokenHash).
		Update("is_revoked", true).Error
}

func (r *repository) RevokeAllUserTokens(ctx context.Context, userID uuid.UUID) error {
	return r.db.WithContext(ctx).
		Model(&RefreshToken{}).
		Where("user_id = ?", userID).
		Update("is_revoked", true).Error
}
