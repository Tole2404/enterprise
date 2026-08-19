package middleware

import (
	"fmt"
	"log"
	"net/http"
	"runtime/debug"

	"erp-backend/pkg/response"

	"github.com/gin-gonic/gin"
)

func RecoveryMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				stack := string(debug.Stack())
				log.Printf("[PANIC RECOVERED] %v\n%s", err, stack)

				response.Error(
					c,
					http.StatusInternalServerError,
					"A critical internal server error occurred",
					fmt.Sprintf("%v", err),
				)
				c.Abort()
			}
		}()
		c.Next()
	}
}
