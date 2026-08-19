package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type APIResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Error   interface{} `json:"error,omitempty"`
}

type PaginationMeta struct {
	CurrentPage int   `json:"current_page"`
	PerPage     int   `json:"per_page"`
	TotalItems  int64 `json:"total_items"`
	TotalPages  int   `json:"total_pages"`
}

type PaginatedData struct {
	Items interface{}    `json:"items"`
	Meta  PaginationMeta `json:"meta"`
}

func Success(c *gin.Context, statusCode int, message string, data interface{}) {
	c.JSON(statusCode, APIResponse{
		Success: true,
		Message: message,
		Data:    data,
		Error:   nil,
	})
}

func Paginated(c *gin.Context, statusCode int, message string, items interface{}, page, perPage int, totalItems int64) {
	totalPages := int(totalItems) / perPage
	if int(totalItems)%perPage != 0 {
		totalPages++
	}

	c.JSON(statusCode, APIResponse{
		Success: true,
		Message: message,
		Data: PaginatedData{
			Items: items,
			Meta: PaginationMeta{
				CurrentPage: page,
				PerPage:     perPage,
				TotalItems:  totalItems,
				TotalPages:  totalPages,
			},
		},
		Error: nil,
	})
}

func Error(c *gin.Context, statusCode int, message string, errDetail interface{}) {
	c.JSON(statusCode, APIResponse{
		Success: false,
		Message: message,
		Data:    nil,
		Error:   errDetail,
	})
}

func BadRequest(c *gin.Context, message string, errDetail interface{}) {
	if message == "" {
		message = "Invalid request payload or parameters"
	}
	Error(c, http.StatusBadRequest, message, errDetail)
}

func Unauthorized(c *gin.Context, message string) {
	if message == "" {
		message = "Authentication required or token expired"
	}
	Error(c, http.StatusUnauthorized, message, nil)
}

func Forbidden(c *gin.Context, message string) {
	if message == "" {
		message = "You do not have permission to perform this action"
	}
	Error(c, http.StatusForbidden, message, nil)
}

func NotFound(c *gin.Context, message string) {
	if message == "" {
		message = "Resource not found"
	}
	Error(c, http.StatusNotFound, message, nil)
}

func InternalServerError(c *gin.Context, message string, errDetail interface{}) {
	if message == "" {
		message = "An unexpected internal server error occurred"
	}
	Error(c, http.StatusInternalServerError, message, errDetail)
}
