package integration

import (
	"sync"
	"testing"
	"time"

	"github.com/FruitsAI/Orange/internal/config"
	"github.com/FruitsAI/Orange/internal/constants"
	"github.com/FruitsAI/Orange/internal/database"
	"github.com/FruitsAI/Orange/internal/dto"
	"github.com/FruitsAI/Orange/internal/models"
	"github.com/FruitsAI/Orange/internal/service"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var integrationTestDBOnce sync.Once

func setupIntegrationTestDB(t *testing.T) {
	t.Helper()

	integrationTestDBOnce.Do(func() {
		config.AppConfig = &config.Config{
			DBType: "sqlite",
			DBPath: "file:integration_test?mode=memory&cache=shared",
		}

		db := database.GetDB()
		require.NoError(t, db.AutoMigrate(&models.User{}, &models.Project{}, &models.Payment{}))
	})
}

// TestProjectPaymentIntegration 项目款项集成测试
func TestProjectPaymentIntegration(t *testing.T) {
	setupIntegrationTestDB(t)
	projectSvc := service.NewProjectService()
	paymentSvc := service.NewPaymentService()

	// 创建测试用户
	user := &models.User{
		Username: "integtest1",
		Password: "hashed",
		Email:    "integ1@test.com",
		Role:     constants.RoleUser,
		Status:   1,
	}
	db := database.GetDB()
	err := db.Create(user).Error
	require.NoError(t, err)

	t.Run("完整业务流程", func(t *testing.T) {
		// 1. 创建项目
		projectReq := dto.CreateProjectRequest{
			Name:           "集成测试项目",
			Company:        "测试公司",
			ContractNumber: "INT-001",
			TotalAmount:    100000,
			StartDate:      time.Now().Format("2006-01-02"),
			EndDate:        time.Now().AddDate(0, 6, 0).Format("2006-01-02"),
			Status:         constants.ProjectStatusOngoing,
			UserID:         user.ID,
		}
		project, err := projectSvc.Create(projectReq)
		require.NoError(t, err)
		assert.Equal(t, float64(0), project.ReceivedAmount)

		// 2. 添加款项
		payment1Req := dto.PaymentRequest{
			ProjectID: project.ID,
			Amount:    30000,
			Stage:     "预付款",
			PlanDate:  time.Now().Format("2006-01-02"),
			Status:    constants.PaymentStatusPending,
			UserID:    user.ID,
		}
		payment1, err := paymentSvc.Create(payment1Req)
		require.NoError(t, err)

		payment2Req := dto.PaymentRequest{
			ProjectID: project.ID,
			Amount:    20000,
			Stage:     "进度款",
			PlanDate:  time.Now().AddDate(0, 1, 0).Format("2006-01-02"),
			Status:    constants.PaymentStatusPending,
			UserID:    user.ID,
		}
		payment2, err := paymentSvc.Create(payment2Req)
		require.NoError(t, err)

		// 3. 确认第一笔款项
		err = paymentSvc.ConfirmForUser(user.ID, payment1.ID, time.Now().Format("2006-01-02"), "bank_transfer")
		require.NoError(t, err)

		// 4. 验证项目金额同步
		updatedProject, err := projectSvc.GetForUser(user.ID, project.ID)
		require.NoError(t, err)
		assert.Equal(t, float64(30000), updatedProject.ReceivedAmount)

		// 5. 确认第二笔款项
		err = paymentSvc.ConfirmForUser(user.ID, payment2.ID, time.Now().Format("2006-01-02"), "bank_transfer")
		require.NoError(t, err)

		updatedProject, err = projectSvc.GetForUser(user.ID, project.ID)
		require.NoError(t, err)
		assert.Equal(t, float64(50000), updatedProject.ReceivedAmount)

		// 6. 删除第一笔款项
		err = paymentSvc.DeleteForUser(user.ID, payment1.ID)
		require.NoError(t, err)

		updatedProject, err = projectSvc.GetForUser(user.ID, project.ID)
		require.NoError(t, err)
		assert.Equal(t, float64(20000), updatedProject.ReceivedAmount)
	})

	t.Run("删除项目应级联删除款项", func(t *testing.T) {
		// 创建项目和款项
		projectReq := dto.CreateProjectRequest{
			Name:           "级联删除测试",
			Company:        "测试公司",
			ContractNumber: "INT-002",
			TotalAmount:    50000,
			StartDate:      time.Now().Format("2006-01-02"),
			EndDate:        time.Now().AddDate(0, 3, 0).Format("2006-01-02"),
			Status:         constants.ProjectStatusOngoing,
			UserID:         user.ID,
		}
		project, err := projectSvc.Create(projectReq)
		require.NoError(t, err)

		paymentReq := dto.PaymentRequest{
			ProjectID: project.ID,
			Amount:    10000,
			Stage:     "预付款",
			PlanDate:  time.Now().Format("2006-01-02"),
			Status:    constants.PaymentStatusPending,
			UserID:    user.ID,
		}
		payment, err := paymentSvc.Create(paymentReq)
		require.NoError(t, err)

		// 删除项目
		err = projectSvc.DeleteForUser(user.ID, project.ID)
		require.NoError(t, err)

		// 验证款项被级联删除
		db := database.GetDB()
		var count int64
		db.Model(&models.Payment{}).Where("id = ?", payment.ID).Count(&count)
		assert.Equal(t, int64(0), count)
	})
}

// TestPermissionIsolation 权限隔离测试
func TestPermissionIsolation(t *testing.T) {
	setupIntegrationTestDB(t)
	projectSvc := service.NewProjectService()
	paymentSvc := service.NewPaymentService()

	// 创建两个测试用户
	userA := &models.User{
		Username: "userA",
		Password: "hashed",
		Email:    "userA@test.com",
		Role:     constants.RoleUser,
		Status:   1,
	}
	db := database.GetDB()
	err := db.Create(userA).Error
	require.NoError(t, err)

	userB := &models.User{
		Username: "userB",
		Password: "hashed",
		Email:    "userB@test.com",
		Role:     constants.RoleUser,
		Status:   1,
	}
	err = db.Create(userB).Error
	require.NoError(t, err)

	t.Run("用户A创建的项目，用户B无法访问", func(t *testing.T) {
		// 用户A创建项目
		projectReq := dto.CreateProjectRequest{
			Name:           "用户A的项目",
			Company:        "公司A",
			ContractNumber: "PERM-001",
			TotalAmount:    80000,
			StartDate:      time.Now().Format("2006-01-02"),
			EndDate:        time.Now().AddDate(0, 6, 0).Format("2006-01-02"),
			Status:         constants.ProjectStatusOngoing,
			UserID:         userA.ID,
		}
		project, err := projectSvc.Create(projectReq)
		require.NoError(t, err)

		// 用户B尝试访问
		_, err = projectSvc.GetForUser(userB.ID, project.ID)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "项目不存在")
	})

	t.Run("用户A创建的款项，用户B无法确认", func(t *testing.T) {
		// 用户A创建项目和款项
		projectReq := dto.CreateProjectRequest{
			Name:           "用户A的项目2",
			Company:        "公司A",
			ContractNumber: "PERM-002",
			TotalAmount:    60000,
			StartDate:      time.Now().Format("2006-01-02"),
			EndDate:        time.Now().AddDate(0, 6, 0).Format("2006-01-02"),
			Status:         constants.ProjectStatusOngoing,
			UserID:         userA.ID,
		}
		project, err := projectSvc.Create(projectReq)
		require.NoError(t, err)

		paymentReq := dto.PaymentRequest{
			ProjectID: project.ID,
			Amount:    20000,
			Stage:     "预付款",
			PlanDate:  time.Now().Format("2006-01-02"),
			Status:    constants.PaymentStatusPending,
			UserID:    userA.ID,
		}
		payment, err := paymentSvc.Create(paymentReq)
		require.NoError(t, err)

		// 用户B尝试确认款项
		err = paymentSvc.ConfirmForUser(userB.ID, payment.ID, time.Now().Format("2006-01-02"), "bank_transfer")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "款项不存在")
	})
}

// TestDataConsistency 数据一致性测试
func TestDataConsistency(t *testing.T) {
	setupIntegrationTestDB(t)
	projectSvc := service.NewProjectService()
	paymentSvc := service.NewPaymentService()

	// 创建测试用户
	user := &models.User{
		Username: "consistuser",
		Password: "hashed",
		Email:    "consist@test.com",
		Role:     constants.RoleUser,
		Status:   1,
	}
	db := database.GetDB()
	err := db.Create(user).Error
	require.NoError(t, err)

	t.Run("并发创建款项，项目金额正确", func(t *testing.T) {
		// 创建项目
		projectReq := dto.CreateProjectRequest{
			Name:           "并发测试项目",
			Company:        "测试公司",
			ContractNumber: "CONC-001",
			TotalAmount:    100000,
			StartDate:      time.Now().Format("2006-01-02"),
			EndDate:        time.Now().AddDate(0, 6, 0).Format("2006-01-02"),
			Status:         constants.ProjectStatusOngoing,
			UserID:         user.ID,
		}
		project, err := projectSvc.Create(projectReq)
		require.NoError(t, err)

		var wg sync.WaitGroup
		paymentIDs := make([]int64, 5)
		errors := make([]error, 5)

		// 并发创建5笔款项
		for i := 0; i < 5; i++ {
			wg.Add(1)
			go func(idx int) {
				defer wg.Done()
				paymentReq := dto.PaymentRequest{
					ProjectID: project.ID,
					Amount:    10000,
					Stage:     "款项" + string(rune('A'+idx)),
					PlanDate:  time.Now().Format("2006-01-02"),
					Status:    constants.PaymentStatusPending,
					UserID:    user.ID,
				}
				payment, err := paymentSvc.Create(paymentReq)
				errors[idx] = err
				if payment != nil {
					paymentIDs[idx] = payment.ID
				}
			}(i)
		}
		wg.Wait()

		// 检查是否所有创建都成功
		for i, err := range errors {
			require.NoError(t, err, "创建款项%d失败", i)
		}

		// 并发确认款项
		for _, id := range paymentIDs {
			if id == 0 {
				continue
			}
			wg.Add(1)
			go func(paymentID int64) {
				defer wg.Done()
				paymentSvc.ConfirmForUser(user.ID, paymentID, time.Now().Format("2006-01-02"), "bank_transfer")
			}(id)
		}
		wg.Wait()

		// 验证项目金额
		time.Sleep(100 * time.Millisecond) // 等待数据库同步
		updatedProject, err := projectSvc.GetForUser(user.ID, project.ID)
		require.NoError(t, err)
		assert.Equal(t, float64(50000), updatedProject.ReceivedAmount)
	})

	t.Run("事务回滚场景", func(t *testing.T) {
		// 创建项目
		projectReq := dto.CreateProjectRequest{
			Name:           "事务测试项目",
			Company:        "测试公司",
			ContractNumber: "TRANS-001",
			TotalAmount:    80000,
			StartDate:      time.Now().Format("2006-01-02"),
			EndDate:        time.Now().AddDate(0, 6, 0).Format("2006-01-02"),
			Status:         constants.ProjectStatusOngoing,
			UserID:         user.ID,
		}
		project, err := projectSvc.Create(projectReq)
		require.NoError(t, err)

		// 创建款项
		paymentReq := dto.PaymentRequest{
			ProjectID: project.ID,
			Amount:    30000,
			Stage:     "预付款",
			PlanDate:  time.Now().Format("2006-01-02"),
			Status:    constants.PaymentStatusPending,
			UserID:    user.ID,
		}
		payment, err := paymentSvc.Create(paymentReq)
		require.NoError(t, err)

		// 尝试用无效日期确认（应该失败）
		err = paymentSvc.ConfirmForUser(user.ID, payment.ID, "invalid-date", "bank_transfer")
		assert.Error(t, err)

		// 验证项目金额未变化
		updatedProject, err := projectSvc.GetForUser(user.ID, project.ID)
		require.NoError(t, err)
		assert.Equal(t, float64(0), updatedProject.ReceivedAmount)
	})
}
