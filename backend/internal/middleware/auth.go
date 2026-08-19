package middleware

import (
	"fmt"
	"strings"

	"erp-backend/pkg/config"
	"erp-backend/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type JWTClaims struct {
	UserID      uuid.UUID `json:"user_id"`
	Email       string    `json:"email"`
	Roles       []string  `json:"roles"`
	Permissions []string  `json:"permissions"`
	jwt.RegisteredClaims
}

func AuthMiddleware(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			response.Unauthorized(c, "Authorization header is missing")
			c.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			response.Unauthorized(c, "Invalid Authorization header format (must be Bearer <token>)")
			c.Abort()
			return
		}

		tokenString := parts[1]
		claims := &JWTClaims{}

		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte(cfg.JWTSecret), nil
		})

		if err != nil || !token.Valid {
			response.Unauthorized(c, "Invalid or expired access token")
			c.Abort()
			return
		}

		// Store user details in context
		c.Set("user_id", claims.UserID)
		c.Set("email", claims.Email)
		c.Set("roles", claims.Roles)
		c.Set("permissions", claims.Permissions)

		c.Next()
	}
}

// RequirePermission checks if the authenticated user has the necessary permission code
func RequirePermission(requiredPerm string) gin.HandlerFunc {
	return func(c *gin.Context) {
		permsRaw, exists := c.Get("permissions")
		if !exists {
			response.Forbidden(c, "Access denied: No permissions associated with user")
			c.Abort()
			return
		}

		permissions, ok := permsRaw.([]string)
		if !ok {
			response.Forbidden(c, "Access denied: Invalid permission format")
			c.Abort()
			return
		}

		// Super Admin bypass check (or exact permission match)
		rolesRaw, roleExists := c.Get("roles")
		if roleExists {
			if roles, ok := rolesRaw.([]string); ok {
				for _, r := range roles {
					if r == "SUPER_ADMIN" {
						c.Next()
						return
					}
				}
			}
		}

		hasPerm := false
		for _, p := range permissions {
			if p == requiredPerm || p == "*" {
				hasPerm = true
				break
			}
		}

		if !hasPerm {
			response.Forbidden(c, fmt.Sprintf("Access denied: missing required permission '%s'", requiredPerm))
			c.Abort()
			return
		}

		c.Next()
	}
}
