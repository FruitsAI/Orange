package app

import (
	"path/filepath"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"

	"github.com/FruitsAI/Orange/internal/database"
	"github.com/FruitsAI/Orange/internal/models"
	"github.com/FruitsAI/Orange/internal/service"
)

func TestRuntimeModeValues(t *testing.T) {
	if RuntimeModeDesktop != "desktop" {
		t.Fatalf("RuntimeModeDesktop = %q", RuntimeModeDesktop)
	}
	if RuntimeModeServer != "server" {
		t.Fatalf("RuntimeModeServer = %q", RuntimeModeServer)
	}
}

func TestBootstrapMigratesLegacyPaymentsBeforeStatsAndEdits(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "legacy.db")
	legacy, err := gorm.Open(sqlite.Open(path), &gorm.Config{})
	require.NoError(t, err)
	raw, err := legacy.DB()
	require.NoError(t, err)
	t.Cleanup(func() { _ = raw.Close() })
	require.NoError(t, legacy.AutoMigrate(&models.User{}, &models.Project{}, &models.Payment{}))
	users := []models.User{
		{ID: 1, Username: "legacy-user", Name: "Legacy", Password: "test-hash"},
		{ID: 2, Username: "other-user", Name: "Other", Password: "test-hash"},
	}
	require.NoError(t, legacy.Create(&users).Error)
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	projects := []models.Project{
		{ID: 1, UserID: 1, Name: "Legacy project", Company: "Test", TotalAmount: 1000, ReceivedAmount: 500, Status: "active", Type: "web", ContractNumber: "LEGACY-1", StartDate: today, EndDate: today},
		{ID: 2, UserID: 2, Name: "Other project", Company: "Test", TotalAmount: 2000, ReceivedAmount: 400, Status: "active", Type: "web", ContractNumber: "LEGACY-2", StartDate: today, EndDate: today},
	}
	require.NoError(t, legacy.Create(&projects).Error)
	payments := []models.Payment{
		{ID: 1, UserID: 1, ProjectID: 1, Stage: "deposit", Amount: 300, Status: "paid", PlanDate: today, ActualDate: &today},
		{ID: 2, UserID: 1, ProjectID: 1, Stage: "progress", Amount: 200, Status: "confirmed", PlanDate: today, ActualDate: &today},
		{ID: 3, UserID: 1, ProjectID: 1, Stage: "final", Amount: 500, Status: "pending", PlanDate: today},
		{ID: 4, UserID: 2, ProjectID: 2, Stage: "deposit", Amount: 400, Status: "paid", PlanDate: today, ActualDate: &today},
	}
	require.NoError(t, legacy.Create(&payments).Error)
	require.NoError(t, raw.Close())

	t.Setenv("DB_TYPE", "sqlite")
	t.Setenv("DB_PATH", path)
	t.Setenv("LOG_PATH", filepath.Join(dir, "test.log"))
	t.Setenv("JWT_SECRET", "bootstrap-test-secret-with-at-least-32-characters")
	t.Setenv("REDIS_ADDR", "")
	t.Setenv("ENV", "production")
	t.Setenv("RUNTIME_MODE", "desktop")
	runtime, cleanup, err := Bootstrap(RuntimeModeDesktop)
	require.NoError(t, err)
	t.Cleanup(cleanup)
	require.NotNil(t, runtime.Router)

	dashboard := service.NewDashboardService()
	for _, period := range []string{"all", "month"} {
		stats, err := dashboard.GetStats(1, period)
		require.NoError(t, err)
		require.Equal(t, float64(1000), stats.TotalAmount, period)
		require.Equal(t, float64(500), stats.PaidAmount, period)
		require.Equal(t, float64(500), stats.PendingAmount, period)
	}
	trend, err := dashboard.GetIncomeTrend(1, "month")
	require.NoError(t, err)
	var actual float64
	for _, amount := range trend.ActualValues {
		actual += amount
	}
	require.Equal(t, float64(500), actual)

	// Reconfirming an imported receipt must preserve its historical receipt date.
	paymentsService := service.NewPaymentService()
	require.NoError(t, paymentsService.ConfirmForUser(1, 1, today.AddDate(0, 0, -1).Format("2006-01-02"), "cash"))
	var receipt models.Payment
	require.NoError(t, database.GetDB().First(&receipt, 1).Error)
	require.NotNil(t, receipt.ActualDate)
	require.True(t, receipt.ActualDate.Equal(today))

	// A subsequent edit must still include the migrated receipt in project totals.
	require.NoError(t, paymentsService.DeleteForUser(1, 2))
	var project models.Project
	require.NoError(t, database.GetDB().First(&project, 1).Error)
	require.Equal(t, float64(300), project.ReceivedAmount)
}
