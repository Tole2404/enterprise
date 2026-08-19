package auth

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"time"

	"erp-backend/pkg/config"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type Service interface {
	Login(ctx context.Context, req LoginRequest) (*AuthResponse, error)
	Register(ctx context.Context, req RegisterRequest) (*AuthResponse, error)
	RefreshToken(ctx context.Context, tokenString string) (*AuthResponse, error)
	Logout(ctx context.Context, tokenString string) error
	GetProfile(ctx context.Context, userID uuid.UUID) (*User, []string, []string, error)
	ListUsers(ctx context.Context, query UserFilterQuery) ([]User, int64, error)
	CreateUserByAdmin(ctx context.Context, req CreateUserRequest) (*User, error)
	UpdateUser(ctx context.Context, id uuid.UUID, req UpdateUserRequest) (*User, error)
	DeactivateUser(ctx context.Context, id uuid.UUID) error
	ListRoles(ctx context.Context) ([]Role, error)
	CreateRole(ctx context.Context, req CreateRoleRequest) (*Role, error)
	UpdateRole(ctx context.Context, id uuid.UUID, req UpdateRoleRequest) (*Role, error)
	DeleteRole(ctx context.Context, id uuid.UUID) error
	ListPermissions(ctx context.Context) ([]Permission, error)
	UpdateRolePermissions(ctx context.Context, roleID uuid.UUID, req UpdateRolePermissionsRequest) error
}

type service struct {
	repo Repository
	cfg  *config.Config
}

func NewService(repo Repository, cfg *config.Config) Service {
	return &service{
		repo: repo,
		cfg:  cfg,
	}
}

func (s *service) Login(ctx context.Context, req LoginRequest) (*AuthResponse, error) {
	user, err := s.repo.FindByEmail(ctx, req.Email)
	if err != nil {
		return nil, err
	}
	if user == nil || !user.IsActive {
		return nil, errors.New("invalid email or password")
	}

	// Compare password hash
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, errors.New("invalid email or password")
	}

	// Get user roles & permissions
	roles := make([]string, len(user.Roles))
	for i, r := range user.Roles {
		roles[i] = r.Code
	}

	permissions, err := s.repo.GetUserPermissions(ctx, user.ID)
	if err != nil {
		return nil, err
	}

	// Generate Access Token & Refresh Token
	accessToken, err := s.generateAccessToken(user.ID, user.Email, roles, permissions)
	if err != nil {
		return nil, err
	}

	refreshToken, err := s.generateRefreshToken(ctx, user.ID)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User:         *user,
		Roles:        roles,
		Permissions:  permissions,
	}, nil
}

func (s *service) Register(ctx context.Context, req RegisterRequest) (*AuthResponse, error) {
	existing, err := s.repo.FindByEmail(ctx, req.Email)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, errors.New("user with this email already exists")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	newUser := &User{
		ID:           uuid.New(),
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		FullName:     req.FullName,
		Phone:        req.Phone,
		IsActive:     true,
	}

	if err := s.repo.CreateUser(ctx, newUser); err != nil {
		return nil, err
	}

	// Default role: STAFF_OPERATIONAL if not specified
	roleCode := req.RoleCode
	if roleCode == "" {
		roleCode = "STAFF_OPERATIONAL"
	}

	role, err := s.repo.FindRoleByCode(ctx, roleCode)
	if err == nil && role != nil {
		_ = s.repo.AssignRole(ctx, newUser.ID, role.ID)
		newUser.Roles = append(newUser.Roles, *role)
	}

	// Auto-login after registration
	return s.Login(ctx, LoginRequest{Email: req.Email, Password: req.Password})
}

func (s *service) RefreshToken(ctx context.Context, tokenString string) (*AuthResponse, error) {
	tokenRecord, err := s.repo.FindRefreshToken(ctx, tokenString)
	if err != nil {
		return nil, err
	}
	if tokenRecord == nil || tokenRecord.ExpiresAt.Before(time.Now()) {
		return nil, errors.New("refresh token is invalid or expired")
	}

	// Invalidate old refresh token (Token Rotation)
	_ = s.repo.RevokeRefreshToken(ctx, tokenString)

	user, err := s.repo.FindByID(ctx, tokenRecord.UserID)
	if err != nil || user == nil || !user.IsActive {
		return nil, errors.New("user not found or inactive")
	}

	roles := make([]string, len(user.Roles))
	for i, r := range user.Roles {
		roles[i] = r.Code
	}

	permissions, err := s.repo.GetUserPermissions(ctx, user.ID)
	if err != nil {
		return nil, err
	}

	newAccessToken, err := s.generateAccessToken(user.ID, user.Email, roles, permissions)
	if err != nil {
		return nil, err
	}

	newRefreshToken, err := s.generateRefreshToken(ctx, user.ID)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{
		AccessToken:  newAccessToken,
		RefreshToken: newRefreshToken,
		User:         *user,
		Roles:        roles,
		Permissions:  permissions,
	}, nil
}

func (s *service) Logout(ctx context.Context, tokenString string) error {
	return s.repo.RevokeRefreshToken(ctx, tokenString)
}

func (s *service) GetProfile(ctx context.Context, userID uuid.UUID) (*User, []string, []string, error) {
	user, err := s.repo.FindByID(ctx, userID)
	if err != nil || user == nil {
		return nil, nil, nil, errors.New("user not found")
	}

	roles := make([]string, len(user.Roles))
	for i, r := range user.Roles {
		roles[i] = r.Code
	}

	permissions, err := s.repo.GetUserPermissions(ctx, user.ID)
	if err != nil {
		return nil, nil, nil, err
	}

	return user, roles, permissions, nil
}

func (s *service) ListUsers(ctx context.Context, query UserFilterQuery) ([]User, int64, error) {
	if query.Page <= 0 {
		query.Page = 1
	}
	if query.PerPage <= 0 || query.PerPage > 100 {
		query.PerPage = 10
	}
	return s.repo.FindAllUsers(ctx, query)
}

func (s *service) CreateUserByAdmin(ctx context.Context, req CreateUserRequest) (*User, error) {
	existing, err := s.repo.FindByEmail(ctx, req.Email)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, errors.New("user with this email already exists")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	newUser := &User{
		ID:           uuid.New(),
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		FullName:     req.FullName,
		Phone:        req.Phone,
		IsActive:     true,
	}

	if err := s.repo.CreateUser(ctx, newUser); err != nil {
		return nil, err
	}

	var roleUUIDs []uuid.UUID
	for _, ridStr := range req.RoleIDs {
		if rid, err := uuid.Parse(ridStr); err == nil {
			roleUUIDs = append(roleUUIDs, rid)
		}
	}
	if len(roleUUIDs) > 0 {
		_ = s.repo.SetUserRoles(ctx, newUser.ID, roleUUIDs)
	}

	return s.repo.FindByID(ctx, newUser.ID)
}

func (s *service) UpdateUser(ctx context.Context, id uuid.UUID, req UpdateUserRequest) (*User, error) {
	user, err := s.repo.FindByID(ctx, id)
	if err != nil || user == nil {
		return nil, errors.New("user not found")
	}

	if req.FullName != "" {
		user.FullName = req.FullName
	}
	if req.Phone != "" {
		user.Phone = req.Phone
	}
	if req.IsActive != nil {
		user.IsActive = *req.IsActive
	}

	if err := s.repo.UpdateUser(ctx, user); err != nil {
		return nil, err
	}

	if req.RoleIDs != nil {
		var roleUUIDs []uuid.UUID
		for _, ridStr := range req.RoleIDs {
			if rid, err := uuid.Parse(ridStr); err == nil {
				roleUUIDs = append(roleUUIDs, rid)
			}
		}
		_ = s.repo.SetUserRoles(ctx, user.ID, roleUUIDs)
	}

	return s.repo.FindByID(ctx, user.ID)
}

func (s *service) DeactivateUser(ctx context.Context, id uuid.UUID) error {
	_ = s.repo.RevokeAllUserTokens(ctx, id)
	return s.repo.DeleteUser(ctx, id)
}

func (s *service) ListRoles(ctx context.Context) ([]Role, error) {
	return s.repo.FindAllRoles(ctx)
}

func (s *service) CreateRole(ctx context.Context, req CreateRoleRequest) (*Role, error) {
	existing, err := s.repo.FindRoleByCode(ctx, req.Code)
	if err == nil && existing != nil {
		return nil, errors.New("role with this code already exists")
	}

	newRole := &Role{
		ID:          uuid.New(),
		Code:        req.Code,
		Name:        req.Name,
		Description: req.Description,
	}

	if err := s.repo.CreateRole(ctx, newRole); err != nil {
		return nil, err
	}

	if len(req.PermissionIDs) > 0 {
		var permUUIDs []uuid.UUID
		for _, pidStr := range req.PermissionIDs {
			if pid, err := uuid.Parse(pidStr); err == nil {
				permUUIDs = append(permUUIDs, pid)
			}
		}
		if len(permUUIDs) > 0 {
			_ = s.repo.SetRolePermissions(ctx, newRole.ID, permUUIDs)
		}
	}

	return s.repo.FindRoleByID(ctx, newRole.ID)
}

func (s *service) UpdateRole(ctx context.Context, id uuid.UUID, req UpdateRoleRequest) (*Role, error) {
	role, err := s.repo.FindRoleByID(ctx, id)
	if err != nil || role == nil {
		return nil, errors.New("role not found")
	}

	if req.Name != "" {
		role.Name = req.Name
	}
	if req.Description != "" {
		role.Description = req.Description
	}

	if err := s.repo.UpdateRole(ctx, role); err != nil {
		return nil, err
	}

	if req.PermissionIDs != nil {
		var permUUIDs []uuid.UUID
		for _, pidStr := range req.PermissionIDs {
			if pid, err := uuid.Parse(pidStr); err == nil {
				permUUIDs = append(permUUIDs, pid)
			}
		}
		_ = s.repo.SetRolePermissions(ctx, id, permUUIDs)
	}

	return s.repo.FindRoleByID(ctx, id)
}

func (s *service) DeleteRole(ctx context.Context, id uuid.UUID) error {
	role, err := s.repo.FindRoleByID(ctx, id)
	if err != nil || role == nil {
		return errors.New("role not found")
	}
	if role.Code == "SUPER_ADMIN" {
		return errors.New("cannot delete SUPER_ADMIN system role")
	}
	return s.repo.DeleteRole(ctx, id)
}

func (s *service) ListPermissions(ctx context.Context) ([]Permission, error) {
	return s.repo.FindAllPermissions(ctx)
}

func (s *service) UpdateRolePermissions(ctx context.Context, roleID uuid.UUID, req UpdateRolePermissionsRequest) error {
	role, err := s.repo.FindRoleByID(ctx, roleID)
	if err != nil || role == nil {
		return errors.New("role not found")
	}

	var permUUIDs []uuid.UUID
	for _, pidStr := range req.PermissionIDs {
		if pid, err := uuid.Parse(pidStr); err == nil {
			permUUIDs = append(permUUIDs, pid)
		}
	}

	return s.repo.SetRolePermissions(ctx, roleID, permUUIDs)
}

func (s *service) generateAccessToken(userID uuid.UUID, email string, roles []string, permissions []string) (string, error) {
	claims := jwt.MapClaims{
		"user_id":     userID,
		"email":       email,
		"roles":       roles,
		"permissions": permissions,
		"exp":         time.Now().Add(time.Duration(s.cfg.JWTExpirationHours) * time.Hour).Unix(),
		"iat":         time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.cfg.JWTSecret))
}

func (s *service) generateRefreshToken(ctx context.Context, userID uuid.UUID) (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	tokenString := hex.EncodeToString(bytes)

	refreshToken := &RefreshToken{
		ID:        uuid.New(),
		UserID:    userID,
		TokenHash: tokenString,
		ExpiresAt: time.Now().Add(time.Duration(s.cfg.JWTRefreshExpirationDays) * 24 * time.Hour),
		IsRevoked: false,
	}

	if err := s.repo.SaveRefreshToken(ctx, refreshToken); err != nil {
		return "", err
	}

	return tokenString, nil
}
