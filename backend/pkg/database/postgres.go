package database

import (
	"context"
	"fmt"
	"log"
	"time"

	"erp-backend/pkg/config"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type DB struct {
	*gorm.DB
}

func ConnectPostgres(cfg *config.Config) (*DB, error) {
	var gormLogger logger.Interface
	if cfg.AppEnv == "production" {
		gormLogger = logger.Default.LogMode(logger.Error)
	} else {
		gormLogger = logger.Default.LogMode(logger.Info)
	}

	db, err := gorm.Open(postgres.Open(cfg.GetDSN()), &gorm.Config{
		Logger: gormLogger,
		NowFunc: func() time.Time {
			return time.Now().UTC()
		},
	})
	if err != nil {
		// Try fallback port (5432 if 5433, or 5433 if 5432)
		altPort := "5432"
		if cfg.DBPort == "5432" {
			altPort = "5433"
		}
		altDSN := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=%s",
			cfg.DBHost, cfg.DBUser, cfg.DBPass, cfg.DBName, altPort, cfg.DBSSL, cfg.DBTZ)
		
		db, err = gorm.Open(postgres.Open(altDSN), &gorm.Config{
			Logger: gormLogger,
			NowFunc: func() time.Time {
				return time.Now().UTC()
			},
		})
		if err != nil {
			return nil, fmt.Errorf("failed to connect to postgres database (tried %s and %s): %w", cfg.DBPort, altPort, err)
		}
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get sql.DB instance: %w", err)
	}

	// Set Connection Pool Settings
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)
	sqlDB.SetConnMaxIdleTime(15 * time.Minute)

	// Ping database to verify connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := sqlDB.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("database ping failed: %w", err)
	}

	log.Println("✓ Successfully connected to PostgreSQL (erp_db)")
	return &DB{db}, nil
}

// Transaction helper for ACID execution across multiple repository calls
func (db *DB) WithTransaction(fn func(tx *gorm.DB) error) error {
	return db.DB.Transaction(fn)
}
