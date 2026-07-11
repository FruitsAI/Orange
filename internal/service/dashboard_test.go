package service

import (
	"sync"
	"testing"
	"time"

	"github.com/FruitsAI/Orange/internal/config"
	"github.com/FruitsAI/Orange/internal/constants"
	"github.com/FruitsAI/Orange/internal/database"
	"github.com/FruitsAI/Orange/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var dashboardTestDBOnce sync.Once

// setupDashboardTestDB 初始化仪表盘测试数据库
func setupDashboardTestDB(t *testing.T) {
	t.Helper()

	dashboardTestDBOnce.Do(func() {
		config.AppConfig = &config.Config{
			DBType: "sqlite",
			DBPath: "file:dashboard_test?mode=memory&cache=shared",
		}

		db := database.GetDB()
		require.NoError(t, db.AutoMigrate(&models.User{}, &models.Project{}, &models.Payment{}))
	})
}

// createTestDataForDashboard 创建测试数据
func createTestDataForDashboard(t *testing.T) (userID int64) {
	t.Helper()
	db := database.GetDB()
	userID = 2001

	// 清理旧数据
	db.Where("user_id = ?", userID).Delete(&models.Payment{})
	db.Where("user_id = ?", userID).Delete(&models.Project{})
	db.Delete(&models.User{}, userID)

	// 创建用户
	user := &models.User{
		ID:       userID,
		Username: "dashuser",
		Password: "hashed",
		Email:    "dash@test.com",
		Role:     constants.RoleUser,
	}
	require.NoError(t, db.Create(user).Error)

	// 创建项目
	now := time.Now()
	// 锚定自然月边界构造日期：Dashboard 的趋势按"本月 vs 上月"统计，
	// 若用 now-N天 的相对偏移，月初运行时日期会落入上月导致测试随日期漂移
	currMonthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	prevMonthMid := currMonthStart.AddDate(0, -1, 0).AddDate(0, 0, 14)
	project := &models.Project{
		ID:             1,
		UserID:         userID,
		Name:           "测试项目",
		Company:        "测试公司",
		ContractNumber: "TEST-001",
		TotalAmount:    300000,
		Status:         constants.ProjectStatusOngoing,
		StartDate:      now,
		EndDate:        now.AddDate(0, 6, 0),
		CreateTime:     now,
	}
	require.NoError(t, db.Create(project).Error)

	// 创建款项数据
	payments := []models.Payment{
		// 本月已确认款项
		{
			UserID:     userID,
			ProjectID:  1,
			Stage:      "首付款",
			Amount:     100000,
			Status:     constants.PaymentStatusConfirmed,
			PlanDate:   currMonthStart,
			ActualDate: ptrTime(currMonthStart),
		},
		// 本月待收款项
		{
			UserID:    userID,
			ProjectID: 1,
			Stage:     "进度款",
			Amount:    100000,
			Status:    constants.PaymentStatusPending,
			PlanDate:  now.AddDate(0, 0, 10),
		},
		// 本月逾期款项
		{
			UserID:    userID,
			ProjectID: 1,
			Stage:     "尾款",
			Amount:    50000,
			Status:    constants.PaymentStatusPending,
			PlanDate:  now.AddDate(0, 0, -5),
		},
		// 上月已确认款项（用于趋势对比）
		{
			UserID:     userID,
			ProjectID:  1,
			Stage:      "上月款",
			Amount:     80000,
			Status:     constants.PaymentStatusConfirmed,
			PlanDate:   prevMonthMid,
			ActualDate: ptrTime(prevMonthMid),
		},
		// 上月待收款项
		{
			UserID:    userID,
			ProjectID: 1,
			Stage:     "上月待收",
			Amount:    60000,
			Status:    constants.PaymentStatusPending,
			PlanDate:  prevMonthMid,
		},
	}

	for _, p := range payments {
		require.NoError(t, db.Create(&p).Error)
	}

	return userID
}

// ptrTime 辅助函数：返回time.Time指针
func ptrTime(t time.Time) *time.Time {
	return &t
}

// TestDashboardService_GetStats_AllMode 测试全局模式统计
func TestDashboardService_GetStats_AllMode(t *testing.T) {
	setupDashboardTestDB(t)
	svc := NewDashboardService()

	userID := createTestDataForDashboard(t)

	t.Run("全局模式统计正确性", func(t *testing.T) {
		stats, err := svc.GetStats(userID, "all")
		require.NoError(t, err)

		// 验证金额统计
		assert.Equal(t, float64(300000), stats.TotalAmount)   // 项目总金额
		assert.Equal(t, float64(180000), stats.PaidAmount)    // 已确认: 100000 + 80000
		assert.Equal(t, float64(120000), stats.PendingAmount) // 待收: 300000 - 180000

		// 逾期金额:本月逾期50000 + 上月逾期60000 = 110000
		// 注意:GetStats的all模式使用SumOverdue统计所有逾期
		assert.Equal(t, float64(110000), stats.OverdueAmount)
	})

	t.Run("趋势计算正确性", func(t *testing.T) {
		stats, err := svc.GetStats(userID, "all")
		require.NoError(t, err)

		// 本月已确认: 100000, 上月已确认: 80000
		// 趋势 = ((100000 - 80000) / 80000) * 100 = 25%
		assert.InDelta(t, 25.0, stats.PaidTrend, 0.1)
	})
}

// TestDashboardService_GetStats_PeriodMode 测试周期模式统计
func TestDashboardService_GetStats_PeriodMode(t *testing.T) {
	setupDashboardTestDB(t)
	svc := NewDashboardService()

	userID := createTestDataForDashboard(t)

	periods := []string{"week", "month", "quarter", "year"}

	for _, period := range periods {
		t.Run("周期模式_"+period, func(t *testing.T) {
			stats, err := svc.GetStats(userID, period)
			require.NoError(t, err)

			// 基本验证
			assert.GreaterOrEqual(t, stats.TotalAmount, float64(0))
			assert.GreaterOrEqual(t, stats.PaidAmount, float64(0))
			assert.LessOrEqual(t, stats.PaidAmount, stats.TotalAmount)

			// 趋势应该是合理的百分比
			assert.GreaterOrEqual(t, stats.TotalTrend, float64(-100))
			assert.GreaterOrEqual(t, stats.PaidTrend, float64(-100))
		})
	}
}

// TestDashboardService_GetIncomeTrend 测试收入趋势图表
func TestDashboardService_GetIncomeTrend(t *testing.T) {
	setupDashboardTestDB(t)
	svc := NewDashboardService()

	userID := createTestDataForDashboard(t)

	t.Run("月度收入趋势", func(t *testing.T) {
		trend, err := svc.GetIncomeTrend(userID, "month")
		require.NoError(t, err)

		assert.NotEmpty(t, trend.Labels)
		assert.NotEmpty(t, trend.ExpectedValues)
		assert.NotEmpty(t, trend.ActualValues)

		// 标签和数据长度应一致
		assert.Equal(t, len(trend.Labels), len(trend.ExpectedValues))
		assert.Equal(t, len(trend.Labels), len(trend.ActualValues))
	})

	t.Run("周度收入趋势", func(t *testing.T) {
		trend, err := svc.GetIncomeTrend(userID, "week")
		require.NoError(t, err)

		assert.NotEmpty(t, trend.Labels)
		assert.Len(t, trend.Labels, 7) // 7天
	})
}

// TestDashboardService_GetRecentProjects 测试最近项目
func TestDashboardService_GetRecentProjects(t *testing.T) {
	setupDashboardTestDB(t)
	svc := NewDashboardService()

	userID := createTestDataForDashboard(t)

	t.Run("获取最近项目", func(t *testing.T) {
		projects, err := svc.GetRecentProjects(userID)
		require.NoError(t, err)

		assert.NotEmpty(t, projects)
	})
}

// TestDashboardService_GetUpcomingPayments 测试即将到期款项
func TestDashboardService_GetUpcomingPayments(t *testing.T) {
	setupDashboardTestDB(t)
	svc := NewDashboardService()

	userID := createTestDataForDashboard(t)

	t.Run("获取即将到期款项", func(t *testing.T) {
		payments, err := svc.GetUpcomingPayments(userID)
		require.NoError(t, err)

		// 应该包含10天后到期的款项
		assert.NotEmpty(t, payments)

		// 所有款项应该是待收状态
		for _, p := range payments {
			assert.Equal(t, constants.PaymentStatusPending, p.Status)
		}
	})
}

func TestDashboardService_GetUpcomingPaymentsIncludesFuturePaymentAfterOverdueItems(t *testing.T) {
	setupDashboardTestDB(t)
	svc := NewDashboardService()
	db := database.GetDB()

	const userID int64 = 2002
	db.Where("user_id = ?", userID).Delete(&models.Payment{})
	db.Where("user_id = ?", userID).Delete(&models.Project{})
	db.Delete(&models.User{}, userID)

	user := &models.User{
		ID:       userID,
		Username: "upcoming-regression",
		Password: "hashed",
		Email:    "upcoming-regression@test.com",
		Role:     constants.RoleUser,
	}
	require.NoError(t, db.Create(user).Error)

	now := time.Now()
	project := &models.Project{
		UserID:         userID,
		Name:           "Upcoming Regression Project",
		Company:        "Test Company",
		ContractNumber: "UPCOMING-REGRESSION-001",
		TotalAmount:    70000,
		Status:         constants.ProjectStatusOngoing,
		StartDate:      now.AddDate(0, -1, 0),
		EndDate:        now.AddDate(0, 1, 0),
	}
	require.NoError(t, db.Create(project).Error)

	payments := make([]models.Payment, 0, 7)
	for i := 0; i < 6; i++ {
		payments = append(payments, models.Payment{
			UserID:    userID,
			ProjectID: project.ID,
			Stage:     "逾期款项",
			Amount:    10000,
			Status:    constants.PaymentStatusPending,
			PlanDate:  now.AddDate(0, 0, -10+i),
		})
	}
	payments = append(payments, models.Payment{
		UserID:    userID,
		ProjectID: project.ID,
		Stage:     "未来三天到期",
		Amount:    10000,
		Status:    constants.PaymentStatusPending,
		PlanDate:  now.AddDate(0, 0, 3),
	})
	require.NoError(t, db.Create(&payments).Error)

	result, err := svc.GetUpcomingPayments(userID)
	require.NoError(t, err)

	foundFuturePayment := false
	for _, payment := range result {
		if payment.Stage == "未来三天到期" {
			foundFuturePayment = true
			break
		}
	}
	assert.True(t, foundFuturePayment, "7天内的未来待收款不应被逾期款项挤出结果")
}

// TestDashboardService_DataIsolation 测试数据隔离
func TestDashboardService_DataIsolation(t *testing.T) {
	setupDashboardTestDB(t)
	svc := NewDashboardService()
	db := database.GetDB()

	// 创建两个用户
	user1ID := int64(3001)
	user2ID := int64(3002)

	user1 := &models.User{ID: user1ID, Username: "user1", Password: "hash", Email: "u1@test.com", Role: constants.RoleUser}
	user2 := &models.User{ID: user2ID, Username: "user2", Password: "hash", Email: "u2@test.com", Role: constants.RoleUser}
	require.NoError(t, db.Create(user1).Error)
	require.NoError(t, db.Create(user2).Error)

	// 为user1创建项目和款项
	now := time.Now()
	project1 := &models.Project{
		UserID:         user1ID,
		Name:           "User1 Project",
		Company:        "Company1",
		ContractNumber: "U1-001",
		TotalAmount:    100000,
		StartDate:      now,
		EndDate:        now.AddDate(0, 6, 0),
	}
	require.NoError(t, db.Create(project1).Error)

	payment1 := &models.Payment{
		UserID:     user1ID,
		ProjectID:  project1.ID,
		Stage:      "首付款",
		Amount:     50000,
		Status:     constants.PaymentStatusConfirmed,
		PlanDate:   now,
		ActualDate: ptrTime(now),
	}
	require.NoError(t, db.Create(payment1).Error)

	t.Run("用户只能看到自己的数据", func(t *testing.T) {
		// user1应该看到自己的数据
		stats1, err := svc.GetStats(user1ID, "all")
		require.NoError(t, err)
		assert.Equal(t, float64(100000), stats1.TotalAmount)
		assert.Equal(t, float64(50000), stats1.PaidAmount)

		// user2应该看到空数据
		stats2, err := svc.GetStats(user2ID, "all")
		require.NoError(t, err)
		assert.Equal(t, float64(0), stats2.TotalAmount)
		assert.Equal(t, float64(0), stats2.PaidAmount)
	})

	t.Run("最近项目只返回自己的", func(t *testing.T) {
		projects, err := svc.GetRecentProjects(user2ID)
		require.NoError(t, err)
		assert.Empty(t, projects)

		projects1, err := svc.GetRecentProjects(user1ID)
		require.NoError(t, err)
		assert.Len(t, projects1, 1)
	})
}
