package validator

import (
	"errors"
	"fmt"

	"github.com/go-playground/validator/v10"
)

type FieldError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

func FormatValidationErrors(err error) []FieldError {
	var errs []FieldError
	var ve validator.ValidationErrors
	if errors.As(err, &ve) {
		for _, fe := range ve {
			errs = append(errs, FieldError{
				Field:   fe.Field(),
				Message: getErrorMsg(fe),
			})
		}
	} else {
		errs = append(errs, FieldError{
			Field:   "general",
			Message: err.Error(),
		})
	}
	return errs
}

func getErrorMsg(fe validator.FieldError) string {
	switch fe.Tag() {
	case "required":
		return fmt.Sprintf("%s is required", fe.Field())
	case "email":
		return fmt.Sprintf("%s must be a valid email address", fe.Field())
	case "min":
		return fmt.Sprintf("%s must be at least %s characters/value", fe.Field(), fe.Param())
	case "max":
		return fmt.Sprintf("%s must be at most %s characters/value", fe.Field(), fe.Param())
	case "uuid":
		return fmt.Sprintf("%s must be a valid UUID", fe.Field())
	default:
		return fmt.Sprintf("%s is invalid (%s)", fe.Field(), fe.Tag())
	}
}
