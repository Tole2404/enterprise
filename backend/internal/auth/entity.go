package auth

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	Email        string    `gorm:"type:varchar(255);unique;not null" json:"email"`
	PasswordHash string    `gorm:"type:varchar(255);not null" json:"-"`
	FullName     string    `gorm:"type:varchar(150);not null" json:"full_name"`
	Phone        string    `gorm:"type:varchar(50)" json:"phone"`
	IsActive     bool      `gorm:"type:boolean;default:true;not null" json:"is_active"`
	CreatedAt    time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt    time.Time `gorm:"autoUpdateTime" json:"updated_at"`

	Roles []Role `gorm:"many2many:auth.user_roles;foreignKey:ID;joinForeignKey:UserID;References:ID;joinReferences:RoleID" json:"roles,omitempty"`
}

func (User) TableName() string {
	return "auth.users"
}

type Role struct {
	ID          uuid.UUID    `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	Code        string       `gorm:"type:varchar(50);unique;not null" json:"code"`
	Name        string       `gorm:"type:varchar(100);not null" json:"name"`
	Description string       `gorm:"type:text" json:"description"`
	CreatedAt   time.Time    `gorm:"autoCreateTime" json:"created_at"`
	Permissions []Permission `gorm:"many2many:auth.role_permissions;foreignKey:ID;joinForeignKey:RoleID;References:ID;joinReferences:PermissionID" json:"permissions,omitempty"`
}

func (Role) TableName() string {
	return "auth.roles"
}

type Permission struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	Code        string    `gorm:"type:varchar(100);unique;not null" json:"code"`
	Module      string    `gorm:"type:varchar(50);not null" json:"module"`
	Description string    `gorm:"type:text" json:"description"`
	CreatedAt   time.Time `gorm:"autoCreateTime" json:"created_at"`
}

func (Permission) TableName() string {
	return "auth.permissions"
}

type RefreshToken struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
	TokenHash string    `gorm:"type:varchar(255);unique;not null" json:"token_hash"`
	ExpiresAt time.Time `gorm:"not null" json:"expires_at"`
	IsRevoked bool      `gorm:"type:boolean;default:false;not null" json:"is_revoked"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
}

func (RefreshToken) TableName() string {
	return "auth.refresh_tokens"
}

// Request & Response DTOs
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	FullName string `json:"full_name" binding:"required,min=2"`
	Phone    string `json:"phone"`
	RoleCode string `json:"role_code"`
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

type LogoutRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

type CreateUserRequest struct {
	Email    string   `json:"email" binding:"required,email"`
	Password string   `json:"password" binding:"required,min=6"`
	FullName string   `json:"full_name" binding:"required,min=2"`
	Phone    string   `json:"phone"`
	RoleIDs  []string `json:"role_ids" binding:"required"`
}

type UpdateUserRequest struct {
	FullName string   `json:"full_name"`
	Phone    string   `json:"phone"`
	IsActive *bool    `json:"is_active"`
	RoleIDs  []string `json:"role_ids"`
}

type CreateRoleRequest struct {
	Code          string   `json:"code" binding:"required"`
	Name          string   `json:"name" binding:"required"`
	Description   string   `json:"description"`
	PermissionIDs []string `json:"permission_ids"`
}

type UpdateRoleRequest struct {
	Name          string   `json:"name"`
	Description   string   `json:"description"`
	PermissionIDs []string `json:"permission_ids"`
}

type UpdateRolePermissionsRequest struct {
	PermissionIDs []string `json:"permission_ids" binding:"required"`
}

type UserFilterQuery struct {
	Page    int    `form:"page,default=1"`
	PerPage int    `form:"per_page,default=10"`
	Search  string `form:"search"`
	RoleID  string `form:"role_id"`
}

type AuthResponse struct {
	AccessToken  string   `json:"access_token"`
	RefreshToken string   `json:"refresh_token"`
	User         User     `json:"user"`
	Roles        []string `json:"roles"`
	Permissions  []string `json:"permissions"`
}
