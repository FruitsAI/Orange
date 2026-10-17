package repository

import (
	"testing"
	"time"

	"github.com/FruitsAI/Orange/internal/config"
	"github.com/FruitsAI/Orange/internal/database"
	"github.com/FruitsAI/Orange/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPaymentRepositoryListUpcomingUsesBoundedFutureWindow(t *testing.T) {
	config.AppConfig = &config.Config{DBType: "sqlite", DBPath: "file:payment_repository_test?mode=memory&cache=shared"}
	db := database.GetDB()
	require.NoError(t, db.AutoMigrate(&models.User{}, &models.Project{}, &models.Payment{}))

	const userID int64 = 3101
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 12, 0, 0, 0, now.Location())
	require.NoError(t, db.Create(&models.User{ID: userID, Username: "repo-upcoming", Password: "hashed", Email: "repo-upcoming@test.com"}).Error)
	project := models.Project{UserID: userID, Name: "Repo project", Company: "Test", ContractNumber: "REPO-1", TotalAmount: 1000, StartDate: now, EndDate: now.AddDate(0, 1, 0)}
	require.NoError(t, db.Create(&project).Error)

	payments := []models.Payment{
		{UserID: userID, ProjectID: project.ID, Stage: "历史", Amount: 1, Status: "pending", PlanDate: today.AddDate(0, 0, -1)},
		{UserID: userID, ProjectID: project.ID, Stage: "今天", Amount: 1, Status: "pending", PlanDate: today},
		{UserID: userID, ProjectID: project.ID, Stage: "七天", Amount: 1, Status: "pending", PlanDate: today.AddDate(0, 0, 7)},
		{UserID: userID, ProjectID: project.ID, Stage: "八天", Amount: 1, Status: "pending", PlanDate: today.AddDate(0, 0, 8)},
	}
	require.NoError(t, db.Create(&payments).Error)

	result, err := NewPaymentRepository().ListUpcoming(userID, 7, 20)
	require.NoError(t, err)
	require.Len(t, result, 2)
	assert.Equal(t, "今天", result[0].Stage)
	assert.Equal(t, "七天", result[1].Stage)
}

func TestPaymentRepositoryListOverdueScopesUserAndExcludesSettledPayments(t *testing.T) {
	config.AppConfig = &config.Config{DBType: "sqlite", DBPath: "file:payment_repository_overdue_test?mode=memory&cache=shared"}
	db := database.GetDB()
	require.NoError(t, db.AutoMigrate(&models.User{}, &models.Project{}, &models.Payment{}))

	const userID int64 = 3201
	const otherUserID int64 = 3202
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 12, 0, 0, 0, now.Location())
	for _, user := range []models.User{
		{ID: userID, Username: "repo-overdue", Password: "hashed", Email: "repo-overdue@test.com"},
		{ID: otherUserID, Username: "repo-overdue-other", Password: "hashed", Email: "repo-overdue-other@test.com"},
	} {
		require.NoError(t, db.Create(&user).Error)
	}
	project := models.Project{UserID: userID, Name: "Overdue project", Company: "Test", ContractNumber: "REPO-OVERDUE-1", TotalAmount: 1000, StartDate: now, EndDate: now.AddDate(0, 1, 0)}
	require.NoError(t, db.Create(&project).Error)
	otherProject := models.Project{UserID: otherUserID, Name: "Other project", Company: "Test", ContractNumber: "REPO-OVERDUE-2", TotalAmount: 1000, StartDate: now, EndDate: now.AddDate(0, 1, 0)}
	require.NoError(t, db.Create(&otherProject).Error)

	payments := []models.Payment{
		{UserID: userID, ProjectID: project.ID, Stage: "较新逾期", Amount: 100, Status: "pending", PlanDate: today.AddDate(0, 0, -1)},
		{UserID: userID, ProjectID: project.ID, Stage: "较早逾期", Amount: 200, Status: "pending", PlanDate: today.AddDate(0, 0, -10)},
		{UserID: userID, ProjectID: project.ID, Stage: "已收", Amount: 300, Status: "confirmed", PlanDate: today.AddDate(0, 0, -5)},
		{UserID: userID, ProjectID: project.ID, Stage: "今天", Amount: 400, Status: "pending", PlanDate: today},
		{UserID: otherUserID, ProjectID: otherProject.ID, Stage: "其他用户", Amount: 500, Status: "pending", PlanDate: today.AddDate(0, 0, -7)},
	}
	require.NoError(t, db.Create(&payments).Error)

	result, err := NewPaymentRepository().ListOverdue(userID)
	require.NoError(t, err)
	require.Len(t, result, 2)
	assert.Equal(t, "较早逾期", result[0].Stage)
	assert.Equal(t, "较新逾期", result[1].Stage)
	assert.Equal(t, "Overdue project", result[0].Project.Name)
}
