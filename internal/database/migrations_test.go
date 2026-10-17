package database_test

import (
	"path/filepath"
	"reflect"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/FruitsAI/Orange/internal/constants"
	"github.com/FruitsAI/Orange/internal/database"
	"github.com/FruitsAI/Orange/internal/models"
)

func legacyPaymentDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "legacy.db")), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatal(err)
	}
	raw, err := db.DB()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = raw.Close() })
	if err := db.AutoMigrate(&models.User{}, &models.Project{}, &models.Payment{}); err != nil {
		t.Fatal(err)
	}
	return db
}

func readPayments(t *testing.T, db *gorm.DB) []models.Payment {
	t.Helper()
	var rows []models.Payment
	if err := db.Order("id").Find(&rows).Error; err != nil {
		t.Fatal(err)
	}
	return rows
}

func TestNormalizeLegacyPaymentStatusesPreservesFinancialData(t *testing.T) {
	db := legacyPaymentDB(t)
	day := time.Date(2025, time.December, 12, 0, 0, 0, 0, time.UTC)
	rows := []models.Payment{
		{ProjectID: 1, UserID: 1, Stage: "deposit", Amount: 100.25, Percentage: 10.025, Status: "paid", PlanDate: day, ActualDate: &day, CreateTime: day, UpdateTime: day},
		{ProjectID: 1, UserID: 1, Stage: "progress", Amount: 200, Status: "confirmed", PlanDate: day, ActualDate: &day, CreateTime: day, UpdateTime: day},
		{ProjectID: 1, UserID: 1, Stage: "final", Amount: 300, Status: "pending", PlanDate: day, CreateTime: day, UpdateTime: day},
		{ProjectID: 2, UserID: 2, Stage: "deposit", Amount: 400, Status: "overdue", PlanDate: day, CreateTime: day, UpdateTime: day},
		// An old receipt without a date must not acquire an invented receipt date.
		{ProjectID: 2, UserID: 2, Stage: "final", Amount: 500, Status: "paid", PlanDate: day, CreateTime: day, UpdateTime: day},
	}
	if err := db.Create(&rows).Error; err != nil {
		t.Fatal(err)
	}
	want := readPayments(t, db)
	for i := range want {
		if want[i].Status == "paid" {
			want[i].Status = constants.PaymentStatusConfirmed
		}
	}
	for run := 1; run <= 2; run++ {
		if err := database.NormalizeLegacyPaymentStatuses(db); err != nil {
			t.Fatal(err)
		}
		if got := readPayments(t, db); !reflect.DeepEqual(got, want) {
			t.Fatalf("run %d changed fields other than the legacy status or failed to normalize", run)
		}
	}
}

func TestNormalizeLegacyPaymentStatusesReturnsFailureAtomically(t *testing.T) {
	db := legacyPaymentDB(t)
	rows := []models.Payment{
		{ID: 1, ProjectID: 1, UserID: 1, Stage: "deposit", Amount: 100, Status: "paid"},
		{ID: 2, ProjectID: 1, UserID: 1, Stage: "final", Amount: 200, Status: "paid"},
	}
	if err := db.Create(&rows).Error; err != nil {
		t.Fatal(err)
	}
	before := readPayments(t, db)
	if err := db.Exec(`CREATE TRIGGER reject_status_change BEFORE UPDATE OF status ON payments
		WHEN NEW.id = 2 BEGIN SELECT RAISE(ABORT, 'migration blocked'); END`).Error; err != nil {
		t.Fatal(err)
	}
	if err := database.NormalizeLegacyPaymentStatuses(db); err == nil {
		t.Fatal("expected migration failure to be returned to the caller")
	}
	if got := readPayments(t, db); !reflect.DeepEqual(got, before) {
		t.Fatal("failed migration partially changed the payment records")
	}
}
