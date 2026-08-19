package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	AppEnv   string
	AppPort  string
	AppName  string
	DBHost   string
	DBPort   string
	DBUser   string
	DBPass   string
	DBName   string
	DBSSL    string
	DBTZ     string
	JWTSecret               string
	JWTExpirationHours     int
	JWTRefreshExpirationDays int
}

func LoadConfig() (*Config, error) {
	// Attempt to load .env file if it exists
	_ = godotenv.Load()

	jwtExpHours, err := strconv.Atoi(getEnv("JWT_EXPIRATION_HOURS", "24"))
	if err != nil {
		jwtExpHours = 24
	}

	jwtRefreshExpDays, err := strconv.Atoi(getEnv("JWT_REFRESH_EXPIRATION_DAYS", "7"))
	if err != nil {
		jwtRefreshExpDays = 7
	}

	cfg := &Config{
		AppEnv:                   getEnv("APP_ENV", "development"),
		AppPort:                  getEnv("APP_PORT", "8080"),
		AppName:                  getEnv("APP_NAME", "ERP Enterprise"),
		DBHost:                   getEnv("DB_HOST", "localhost"),
		DBPort:                   getEnv("DB_PORT", "5432"),
		DBUser:                   getEnv("DB_USER", "postgres"),
		DBPass:                   getEnv("DB_PASSWORD", "postgres"),
		DBName:                   getEnv("DB_NAME", "erp_db"),
		DBSSL:                    getEnv("DB_SSLMODE", "disable"),
		DBTZ:                     getEnv("DB_TIMEZONE", "Asia/Jakarta"),
		JWTSecret:                getEnv("JWT_SECRET", "super-secret-jwt-key-change-this-in-production-min-32-chars"),
		JWTExpirationHours:      jwtExpHours,
		JWTRefreshExpirationDays: jwtRefreshExpDays,
	}

	return cfg, nil
}

func (c *Config) GetDSN() string {
	return fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=%s",
		c.DBHost, c.DBUser, c.DBPass, c.DBName, c.DBPort, c.DBSSL, c.DBTZ,
	)
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
