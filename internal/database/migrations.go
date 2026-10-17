package database

import (
	"fmt"
	"log/slog"

	"gorm.io/gorm"

	"github.com/FruitsAI/Orange/internal/constants"
	"github.com/FruitsAI/Orange/internal/models"
)

// NormalizeLegacyPaymentStatuses upgrades the historical paid status before
// queries or payment edits run. It preserves amounts, dates and audit timestamps.
func NormalizeLegacyPaymentStatuses(db *gorm.DB) error {
	// Run on every startup: an older database may be copied in after an upgrade.
	// UpdateColumn deliberately avoids changing the historical update_time.
	result := db.Model(&models.Payment{}).
		Where("status = ?", "paid").
		UpdateColumn("status", constants.PaymentStatusConfirmed)
	if result.Error != nil {
		return fmt.Errorf("normalize legacy payment statuses: %w", result.Error)
	}
	if result.RowsAffected > 0 {
		slog.Info("Normalized legacy payment statuses", "rows", result.RowsAffected)
	}
	return nil
}
