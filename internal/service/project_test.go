package service

import (
	"sync"
	"testing"
	"time"

	"github.com/FruitsAI/Orange/internal/config"
	"github.com/FruitsAI/Orange/internal/constants"
	"github.com/FruitsAI/Orange/internal/database"
	"github.com/FruitsAI/Orange/internal/dto"
	"github.com/FruitsAI/Orange/internal/models"
	"github.com/FruitsAI/Orange/internal/repository"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var projectTestDBOnce sync.Once

// setupTestDB 初始化测试数据库（内存SQLite）
func setupProjectTestDB(t *testing.T) {
	t.Helper()

	projectTestDBOnce.Do(func() {
		config.AppConfig = &config.Config{
			DBType: "sqlite",
			DBPath: "file:project_test?mode=memory&cache=shared",
		}

		db := database.GetDB()
		require.NoError(t, db.AutoMigrate(&models.User{}, &models.Project{}, &models.Payment{}))
	})
}

// createTestUser 创建测试用户
func createTestUser(t *testing.T, userID int64, username string) *models.User {
	t.Helper()
	db := database.GetDB()

	// 先检查是否已存在 (按ID或username)
	var existing models.User
	if err := db.Where("id = ? OR username = ?", userID, username).First(&existing).Error; err == nil {
		return &existing // 已存在,直接返回
	}

	user := &models.User{
		ID:       userID,
		Username: username,
		Password: "hashed_password",
		Email:    username + "@test.com",
		Role:     constants.RoleUser,
	}
	err := db.Create(user).Error
	require.NoError(t, err)
	return user
}

// TestProjectService_CreateProject 测试项目创建 - 合同编号生成
func TestProjectService_CreateProject(t *testing.T) {
	setupProjectTestDB(t)
	svc := NewProjectService()

	user := createTestUser(t, 1001, "testuser")
	now := time.Now()

	t.Run("生成合同编号", func(t *testing.T) {
		// 测试合同编号生成功能
		contractNumber, err := svc.GenerateNextContractNumber(user.ID, now.Format("2006-01-02"))
		require.NoError(t, err)
		assert.NotEmpty(t, contractNumber)
		assert.Contains(t, contractNumber, "HT") // 默认前缀

		// 使用生成的编号创建项目
		input := dto.CreateProjectRequest{
			Name:           "测试项目A",
			Company:        "测试公司A",
			ContractNumber: contractNumber,
			TotalAmount:    100000,
			Status:         constants.ProjectStatusPlanning,
			StartDate:      now.Format("2006-01-02"),
			EndDate:        now.AddDate(0, 6, 0).Format("2006-01-02"),
			UserID:         user.ID,
		}

		project, err := svc.Create(input)
		require.NoError(t, err)
		assert.Equal(t, contractNumber, project.ContractNumber)
		assert.Equal(t, "测试项目A", project.Name)
		assert.Equal(t, float64(100000), project.TotalAmount)
	})

	t.Run("合同编号唯一性", func(t *testing.T) {
		// 生成两个不同的合同编号
		cn1, err := svc.GenerateNextContractNumber(user.ID, now.Format("2006-01-02"))
		require.NoError(t, err)

		input1 := dto.CreateProjectRequest{
			Name:           "项目B",
			Company:        "公司B",
			ContractNumber: cn1,
			TotalAmount:    50000,
			StartDate:      now.Format("2006-01-02"),
			EndDate:        now.AddDate(0, 3, 0).Format("2006-01-02"),
			UserID:         user.ID,
		}
		p1, err := svc.Create(input1)
		require.NoError(t, err)

		cn2, err := svc.GenerateNextContractNumber(user.ID, now.Format("2006-01-02"))
		require.NoError(t, err)

		input2 := dto.CreateProjectRequest{
			Name:           "项目C",
			Company:        "公司C",
			ContractNumber: cn2,
			TotalAmount:    60000,
			StartDate:      now.Format("2006-01-02"),
			EndDate:        now.AddDate(0, 3, 0).Format("2006-01-02"),
			UserID:         user.ID,
		}
		p2, err := svc.Create(input2)
		require.NoError(t, err)

		assert.NotEqual(t, p1.ContractNumber, p2.ContractNumber)
	})

	t.Run("指定合同编号", func(t *testing.T) {
		input := dto.CreateProjectRequest{
			Name:           "项目D",
			Company:        "公司D",
			ContractNumber: "CUSTOM-2024-001",
			TotalAmount:    80000,
			StartDate:      now.Format("2006-01-02"),
			EndDate:        now.AddDate(0, 3, 0).Format("2006-01-02"),
			UserID:         user.ID,
		}

		project, err := svc.Create(input)
		require.NoError(t, err)
		assert.Equal(t, "CUSTOM-2024-001", project.ContractNumber)
	})

	t.Run("合同编号重复应报错", func(t *testing.T) {
		input1 := dto.CreateProjectRequest{
			Name:           "项目E",
			Company:        "公司E",
			ContractNumber: "DUPLICATE-001",
			TotalAmount:    70000,
			StartDate:      now.Format("2006-01-02"),
			EndDate:        now.AddDate(0, 3, 0).Format("2006-01-02"),
			UserID:         user.ID,
		}

		_, err := svc.Create(input1)
		require.NoError(t, err)

		// 尝试创建相同编号
		input2 := dto.CreateProjectRequest{
			Name:           "项目F",
			Company:        "公司F",
			ContractNumber: "DUPLICATE-001",
			TotalAmount:    90000,
			StartDate:      now.Format("2006-01-02"),
			EndDate:        now.AddDate(0, 3, 0).Format("2006-01-02"),
			UserID:         user.ID,
		}

		_, err = svc.Create(input2)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "UNIQUE constraint failed")
	})
}

// TestProjectService_UpdateProject 测试项目更新 - 金额同步
func TestProjectService_UpdateProject(t *testing.T) {
	setupProjectTestDB(t)
	svc := NewProjectService()
	now := time.Now()

	user := createTestUser(t, 1002, "user2")

	// 创建测试项目
	input := dto.CreateProjectRequest{
		Name:        "初始项目",
		Company:     "初始公司",
		TotalAmount: 100000,
		StartDate:   now.Format("2006-01-02"),
		EndDate:     now.AddDate(0, 3, 0).Format("2006-01-02"),
		UserID:      user.ID,
	}
	project, err := svc.Create(input)
	require.NoError(t, err)

	t.Run("更新项目金额", func(t *testing.T) {
		updateInput := dto.CreateProjectRequest{
			Name:        "更新后的项目",
			Company:     "更新后的公司",
			TotalAmount: 150000, // 增加金额
			Status:      constants.ProjectStatusOngoing,
			StartDate:   now.Format("2006-01-02"),
			EndDate:     now.AddDate(0, 3, 0).Format("2006-01-02"),
			UserID:      user.ID,
		}

		updated, err := svc.UpdateForUser(user.ID, project.ID, updateInput)
		require.NoError(t, err)
		assert.Equal(t, float64(150000), updated.TotalAmount)
		assert.Equal(t, "更新后的项目", updated.Name)
		assert.Equal(t, constants.ProjectStatusOngoing, updated.Status)
	})

	t.Run("非所有者无法更新", func(t *testing.T) {
		otherUser := createTestUser(t, 1003, "user3")

		updateInput := dto.CreateProjectRequest{
			Name:      "恶意更新",
			StartDate: now.Format("2006-01-02"),
			EndDate:   now.AddDate(0, 3, 0).Format("2006-01-02"),
			UserID:    otherUser.ID,
		}

		_, err := svc.UpdateForUser(otherUser.ID, project.ID, updateInput)
		assert.Error(t, err)
	})
}

// TestProjectService_DeleteForUser 测试项目删除 - 级联删除款项
func TestProjectService_DeleteForUser(t *testing.T) {
	setupProjectTestDB(t)
	projectSvc := NewProjectService()
	paymentSvc := NewPaymentService()
	now := time.Now()

	user := createTestUser(t, 1004, "user4")

	// 创建项目
	projectInput := dto.CreateProjectRequest{
		Name:        "待删除项目",
		Company:     "公司X",
		TotalAmount: 100000,
		StartDate:   now.Format("2006-01-02"),
		EndDate:     now.AddDate(0, 3, 0).Format("2006-01-02"),
		UserID:      user.ID,
	}
	project, err := projectSvc.Create(projectInput)
	require.NoError(t, err)

	// 创建关联款项
	paymentInput := dto.PaymentRequest{
		ProjectID: project.ID,
		UserID:    user.ID,
		Amount:    50000,
		Stage:     "首付款",
		PlanDate:  now.AddDate(0, 0, 30).Format("2006-01-02"),
	}
	payment, err := paymentSvc.Create(paymentInput)
	require.NoError(t, err)

	t.Run("删除项目应级联删除款项", func(t *testing.T) {
		err := projectSvc.DeleteForUser(user.ID, project.ID)
		require.NoError(t, err)

		// 验证项目已删除
		_, err = repository.NewProjectRepository().FindByID(project.ID)
		assert.Error(t, err)

		// 验证关联款项已删除
		_, err = repository.NewPaymentRepository().FindByID(payment.ID)
		assert.Error(t, err)
	})

	t.Run("非所有者无法删除", func(t *testing.T) {
		otherUser := createTestUser(t, 1005, "user5")
		otherProjectInput := dto.CreateProjectRequest{
			Name:        "其他项目",
			Company:     "其他公司",
			TotalAmount: 80000,
			StartDate:   now.Format("2006-01-02"),
			EndDate:     now.AddDate(0, 3, 0).Format("2006-01-02"),
			UserID:      otherUser.ID,
		}
		otherProject, _ := projectSvc.Create(otherProjectInput)

		err := projectSvc.DeleteForUser(user.ID, otherProject.ID)
		assert.Error(t, err)
	})
}
