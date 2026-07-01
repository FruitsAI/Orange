package service

import (
	"context"
	"sync"
	"testing"

	"github.com/FruitsAI/Orange/internal/config"
	"github.com/FruitsAI/Orange/internal/database"
	"github.com/FruitsAI/Orange/internal/dto"
	"github.com/FruitsAI/Orange/internal/models"
	"github.com/FruitsAI/Orange/internal/pkg/password"
	"github.com/stretchr/testify/require"
)

var serviceTestDBOnce sync.Once

func setupServiceTestDB(t *testing.T) {
	t.Helper()

	serviceTestDBOnce.Do(func() {
		config.AppConfig = &config.Config{
			DBType: "sqlite",
			DBPath: "file:service_test?mode=memory&cache=shared",
		}

		db := database.GetDB()
		require.NoError(t, db.AutoMigrate(&models.User{}, &models.Project{}, &models.Payment{}))
	})
}

func TestGenerateNextContractNumberWorksWithSQLite(t *testing.T) {
	setupServiceTestDB(t)

	service := NewProjectService()

	got, err := service.GenerateNextContractNumber(1, "2026-06-26")

	require.NoError(t, err)
	require.Equal(t, "HT202606260001", got)
}

func TestUpdateUserDoesNotDisableWhenStatusOmitted(t *testing.T) {
	setupServiceTestDB(t)

	hash, err := password.HashPassword("Passw0rd")
	require.NoError(t, err)

	db := database.GetDB()
	created := models.User{
		Username: "status-user",
		Name:     "Before",
		Password: hash,
		Role:     "user",
		Status:   1,
	}
	require.NoError(t, db.Create(&created).Error)

	service := NewUserService()
	require.NoError(t, service.UpdateUser(created.ID, dto.UpdateUserRequest{Name: "After"}))

	var user models.User
	require.NoError(t, db.First(&user, created.ID).Error)
	require.Equal(t, "After", user.Name)
	require.Equal(t, 1, user.Status)
}

func TestContractNumberUniquePerUser(t *testing.T) {
	setupServiceTestDB(t)

	db := database.GetDB()
	require.NoError(t, db.Create(&models.Project{
		Name:           "Project A",
		Company:        "Company A",
		TotalAmount:    100,
		Status:         "active",
		Type:           "web",
		ContractNumber: "HT202606260001",
		UserID:         101,
	}).Error)

	require.NoError(t, db.Create(&models.Project{
		Name:           "Project B",
		Company:        "Company B",
		TotalAmount:    200,
		Status:         "active",
		Type:           "web",
		ContractNumber: "HT202606260001",
		UserID:         202,
	}).Error)
}

func TestProjectServiceRejectsCrossUserAccess(t *testing.T) {
	setupServiceTestDB(t)

	db := database.GetDB()
	project := models.Project{
		Name:           "Private Project",
		Company:        "Private Company",
		TotalAmount:    100,
		Status:         "active",
		Type:           "web",
		ContractNumber: "HT202606290101",
		UserID:         301,
	}
	require.NoError(t, db.Create(&project).Error)

	service := NewProjectService()
	_, err := service.GetForUser(302, project.ID)

	require.Error(t, err)
}

func TestPaymentServiceRejectsCrossUserProjectAccess(t *testing.T) {
	setupServiceTestDB(t)

	db := database.GetDB()
	project := models.Project{
		Name:           "Payment Project",
		Company:        "Payment Company",
		TotalAmount:    100,
		Status:         "active",
		Type:           "web",
		ContractNumber: "HT202606290102",
		UserID:         401,
	}
	require.NoError(t, db.Create(&project).Error)

	service := NewPaymentService()
	_, err := service.ListByProjectForUser(402, project.ID)

	require.Error(t, err)
}

func TestAdminUserCreationRejectsWeakPassword(t *testing.T) {
	setupServiceTestDB(t)

	service := NewUserService()
	err := service.CreateUser(dto.CreateUserRequest{
		Username: "weakpwd1",
		Name:     "Weak Password",
		Password: "123456",
		Role:     "user",
	})

	require.Error(t, err)
}

func TestCreateUserDuplicateUsernameUsesExistingMessage(t *testing.T) {
	setupServiceTestDB(t)

	hash, err := password.HashPassword("Passw0rd")
	require.NoError(t, err)

	db := database.GetDB()
	existing := models.User{
		Username: "duplicate-username-existing",
		Name:     "Duplicate Username Existing",
		Password: hash,
		Role:     "user",
		Status:   1,
	}
	require.NoError(t, db.Create(&existing).Error)

	service := NewUserService()
	err = service.CreateUser(dto.CreateUserRequest{
		Username: existing.Username,
		Name:     "Duplicate Username New",
		Password: "Passw0rd",
		Role:     "user",
	})

	require.EqualError(t, err, "用户名已存在")
}

func TestCreateUserDuplicateEmailUsesExistingMessage(t *testing.T) {
	setupServiceTestDB(t)

	hash, err := password.HashPassword("Passw0rd")
	require.NoError(t, err)

	db := database.GetDB()
	existing := models.User{
		Username: "duplicate-email-existing",
		Name:     "Duplicate Email Existing",
		Email:    "duplicate-email-existing@example.com",
		Password: hash,
		Role:     "user",
		Status:   1,
	}
	require.NoError(t, db.Create(&existing).Error)

	service := NewUserService()
	err = service.CreateUser(dto.CreateUserRequest{
		Username: "duplicate-email-new",
		Name:     "Duplicate Email New",
		Email:    existing.Email,
		Password: "Passw0rd",
		Role:     "user",
	})

	require.EqualError(t, err, "邮箱已存在")
}
func TestUpdateUserRejectsInvalidRole(t *testing.T) {
	setupServiceTestDB(t)

	hash, err := password.HashPassword("Passw0rd")
	require.NoError(t, err)

	db := database.GetDB()
	created := models.User{
		Username: "invalid-role-user",
		Name:     "Invalid Role",
		Password: hash,
		Role:     "user",
		Status:   1,
	}
	require.NoError(t, db.Create(&created).Error)

	service := NewUserService()
	err = service.UpdateUser(created.ID, dto.UpdateUserRequest{Role: "owner"})

	require.Error(t, err)
}

func TestUpdateUserRejectsDuplicateEmail(t *testing.T) {
	setupServiceTestDB(t)

	hash, err := password.HashPassword("Passw0rd")
	require.NoError(t, err)

	db := database.GetDB()
	first := models.User{
		Username: "email-owner",
		Name:     "Email Owner",
		Email:    "owner@example.com",
		Password: hash,
		Role:     "user",
		Status:   1,
	}
	require.NoError(t, db.Create(&first).Error)
	second := models.User{
		Username: "email-target",
		Name:     "Email Target",
		Email:    "target@example.com",
		Password: hash,
		Role:     "user",
		Status:   1,
	}
	require.NoError(t, db.Create(&second).Error)

	service := NewUserService()
	err = service.UpdateUser(second.ID, dto.UpdateUserRequest{Email: first.Email})

	require.EqualError(t, err, "邮箱已存在")
}

func TestConfirmForUserRejectsInvalidActualDate(t *testing.T) {
	setupServiceTestDB(t)

	db := database.GetDB()
	project := models.Project{
		Name:           "Confirm Project",
		Company:        "Confirm Company",
		TotalAmount:    100,
		Status:         "active",
		Type:           "web",
		ContractNumber: "HT202606300001",
		UserID:         501,
	}
	require.NoError(t, db.Create(&project).Error)
	payment := models.Payment{
		ProjectID: project.ID,
		Stage:     "first",
		Amount:    100,
		PlanDate:  project.CreateTime,
		Status:    "pending",
		UserID:    501,
	}
	require.NoError(t, db.Create(&payment).Error)

	service := NewPaymentService()
	err := service.ConfirmForUser(501, payment.ID, "not-a-date", "cash")

	require.Error(t, err)
	require.NoError(t, db.First(&payment, payment.ID).Error)
	require.Equal(t, "pending", payment.Status)
}

func TestDeleteExtrasRejectsFullDeleteWhenLocalIDsAreEmpty(t *testing.T) {
	setupServiceTestDB(t)

	hash, err := password.HashPassword("Passw0rd")
	require.NoError(t, err)

	db := database.GetDB()
	user := models.User{
		Username: "sync-empty-ids-user",
		Name:     "Sync Empty IDs",
		Password: hash,
		Role:     "user",
		Status:   1,
	}
	require.NoError(t, db.Create(&user).Error)

	sqlDB, err := db.DB()
	require.NoError(t, err)

	service := NewSyncService()
	require.Error(t, service.deleteExtras(context.Background(), sqlDB, "users", nil, "postgres"))

	var count int64
	require.NoError(t, db.Model(&models.User{}).Where("id = ?", user.ID).Count(&count).Error)
	require.Equal(t, int64(1), count)
}
