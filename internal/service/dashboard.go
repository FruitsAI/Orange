package service

import (
	"fmt"
	"time"

	"github.com/FruitsAI/Orange/internal/dto"
	"github.com/FruitsAI/Orange/internal/models"
	"github.com/FruitsAI/Orange/internal/pkg/cache"
	"github.com/FruitsAI/Orange/internal/pkg/utils"
	"github.com/FruitsAI/Orange/internal/repository"
)

// DashboardService 仪表盘服务
// 负责处理仪表盘页面的所有数据展示逻辑，包括统计数据、趋势图表、
// 最近项目和即将到期的款项。
//
// 依赖:
//   - ProjectRepository: 用于查询项目相关数据
//   - PaymentRepository: 用于查询款项相关数据
type DashboardService struct {
	projectRepo *repository.ProjectRepository
	paymentRepo *repository.PaymentRepository
}

// NewDashboardService 创建并初始化仪表盘服务实例
//
// 返回:
//   - *DashboardService: 初始化的服务实例，包含必要的 Repository 依赖
func NewDashboardService() *DashboardService {
	return &DashboardService{
		projectRepo: repository.NewProjectRepository(),
		paymentRepo: repository.NewPaymentRepository(),
	}
}

// dashboardPeriods GetStats 支持的统计周期，同时是缓存键与缓存失效的唯一依据
var dashboardPeriods = []string{"all", "week", "month", "quarter", "year"}

// normalizeDashboardPeriod 归一化客户端传入的统计周期
// 空值与未知值一律归为 "all"，保证缓存键有界且失效列表完全覆盖
func normalizeDashboardPeriod(period string) string {
	for _, p := range dashboardPeriods {
		if period == p {
			return period
		}
	}
	return "all"
}

// invalidateDashboardCache 清除指定用户所有周期的 Dashboard 统计缓存
// 供 Payment/Project 服务在数据变更后调用。
func invalidateDashboardCache(userID int64) {
	for _, period := range dashboardPeriods {
		_ = cache.Delete(fmt.Sprintf("dashboard:stats:v1:%d:%s", userID, period))
	}
}

// GetStats 获取仪表盘核心统计数据
// 根据指定的用户ID和时间周期，计算总金额、已收款、待收款、逾期金额及各项数据的环比趋势。
//
// 参数:
//   - userID: 当前登录用户的ID
//   - period: 统计周期，可选值: "week"(本周), "month"(本月), "quarter"(本季度), "year"(本年), "all"(全部/全局)
//
// 返回:
//   - *dto.Stats: 包含各项统计数值和趋势百分比的结构体
//   - error: 数据库查询或其他错误
//
// 说明:
//   - 当 period 为 "all" 或空字符串时，返回全局统计数据（基于项目合同总额），此时不计算趋势（趋势值为0）。
//   - 其他周期模式下，统计数据基于实际产生的款项（Payment）计算，并会计算与上一周期的环比趋势。
func (s *DashboardService) GetStats(userID int64, period string) (*dto.Stats, error) {
	// 归一化周期，未知/空值 → "all"，防止任意字符串撑爆缓存键空间
	period = normalizeDashboardPeriod(period)

	// 尝试从缓存获取 (v1 表示缓存数据结构版本)
	cacheKey := fmt.Sprintf("dashboard:stats:v1:%d:%s", userID, period)
	var stats dto.Stats

	// 尝试从缓存读取
	if err := cache.GetJSON(cacheKey, &stats); err == nil {
		return &stats, nil
	}

	// 缓存未命中，从数据库查询
	// 模式 1: 全局统计模式（通常用于工作台概览）
	if period == "all" {
		// 核心逻辑: 从 Project 表获取基于合同金额的宏观统计
		// 也就是所有项目的总合同额、已收和待收
		totalAmount, paidAmount, pendingAmount, err := s.projectRepo.GetStats(userID)
		if err != nil {
			return nil, err
		}

		// 补充逻辑: 计算逾期金额
		// 逾期金额需要基于 Payment 表中具体款项的截止日期来判断
		overdueAmount, err := s.paymentRepo.SumOverdue(userID)
		if err != nil {
			return nil, err
		}

		// ---------------------------------------------------------------------
		// 优化: 计算趋势 (Trend)
		// 即使主数值是"全量"统计，趋势值我们希望展示 "本月 vs 上月" 的环比变化，
		// 而不是无意义的 0% 或 全量 vs 0。
		// ---------------------------------------------------------------------

		// 1. 定义 "本月" 和 "上月" 的时间范围（使用自然月）
		now := time.Now()

		// 本月：从月初到现在
		currentMonthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
		startDate := currentMonthStart.Format("2006-01-02")
		endDate := now.Format("2006-01-02") + " 23:59:59"

		// 上月：上个月的第一天到最后一天
		prevMonthStart := currentMonthStart.AddDate(0, -1, 0)
		prevMonthEnd := currentMonthStart.Add(-time.Second)
		prevStartDate := prevMonthStart.Format("2006-01-02")
		prevEndDate := prevMonthEnd.Format("2006-01-02") + " 23:59:59"

		// 2. 获取本月统计作为 "当前周期值" (只用于计算 Trend)
		currTotal, currPaid, currPending, currOverdue, currAvgDays, err := s.paymentRepo.GetStatsByPeriod(userID, startDate, endDate)
		if err != nil {
			return nil, err
		}
		// 临时计算本月逾期 (注意：这里严格来说是当前快照，但为了趋势对比，我们需要历史数据。
		// PaymentRepo.SumOverdue 是查当前状态。如果要查"上个月的逾期"，比较困难，因为状态是流动的。
		// 用户的需求是 "逾期金额也要计算"。

		// 3. 获取上月统计作为 "上一周期值"
		prevTotal, prevPaid, prevPending, prevOverdue, prevAvgDays, err := s.paymentRepo.GetStatsByPeriod(userID, prevStartDate, prevEndDate)
		if err != nil {
			return nil, err
		}

		// 5. 组装返回结构
		// 注意: Amount 字段使用全量数据 (ProjectRepo)；
		// AvgCollectionDays 与所有 Trend 字段一致，采用"本月 vs 上月"口径，
		// 避免出现数值为 0 而趋势非 0 的矛盾展示
		result := &dto.Stats{
			TotalAmount:            totalAmount,   // 全量
			PaidAmount:             paidAmount,    // 全量
			PendingAmount:          pendingAmount, // 全量
			OverdueAmount:          overdueAmount, // 全量
			AvgCollectionDays:      currAvgDays,   // 本月均值
			TotalTrend:             utils.CalcPercentageTrend(currTotal, prevTotal),
			PaidTrend:              utils.CalcPercentageTrend(currPaid, prevPaid),
			PendingTrend:           utils.CalcPercentageTrend(currPending, prevPending),
			OverdueTrend:           utils.CalcPercentageTrend(currOverdue, prevOverdue),
			AvgCollectionDaysTrend: utils.CalcPercentageTrend(currAvgDays, prevAvgDays),
		}

		// 写入缓存
		_ = cache.SetJSON(cacheKey, result, 1*time.Minute)
		return result, nil
	}

	// 模式 2: 按周期统计模式（通常用于数据分析页面）
	// 需要计算当前周期和上一周期的数据，以得出趋势百分比
	current, previous := utils.GetCurrentAndPreviousPeriod(period)

	// 步骤 1: 获取当前周期的各项统计指标
	currTotal, currPaid, currPending, currOverdue, currAvgDays, err := s.paymentRepo.GetStatsByPeriod(userID, current.StartDate, current.EndDate)
	if err != nil {
		return nil, err
	}

	// 步骤 2: 获取上一周期的各项统计指标（用于对比）
	prevTotal, prevPaid, prevPending, prevOverdue, prevAvgDays, err := s.paymentRepo.GetStatsByPeriod(userID, previous.StartDate, previous.EndDate)
	if err != nil {
		return nil, err
	}

	// 步骤 3: 组装返回结构
	result := &dto.Stats{
		TotalAmount:            currTotal,
		PaidAmount:             currPaid,
		PendingAmount:          currPending,
		OverdueAmount:          currOverdue,
		AvgCollectionDays:      currAvgDays,
		TotalTrend:             utils.CalcPercentageTrend(currTotal, prevTotal),
		PaidTrend:              utils.CalcPercentageTrend(currPaid, prevPaid),
		PendingTrend:           utils.CalcPercentageTrend(currPending, prevPending),
		OverdueTrend:           utils.CalcPercentageTrend(currOverdue, prevOverdue),
		AvgCollectionDaysTrend: utils.CalcPercentageTrend(currAvgDays, prevAvgDays),
	}

	// 写入缓存
	_ = cache.SetJSON(cacheKey, result, 1*time.Minute)
	return result, nil
}

// GetIncomeTrend 获取收入趋势图表数据
// 根据指定的时间段返回用于绘制折线图的标签和数值。
//
// 参数:
//   - userID: 用户ID
//   - period: 时间维度，"week"和"month"按天聚合，"quarter"和"year"按月聚合
//
// 返回:
//   - *dto.IncomeTrend: 包含 Labels (X轴), ActualValues (实际收入), ExpectedValues (预计收入)
//   - error: 错误信息
func (s *DashboardService) GetIncomeTrend(userID int64, period string) (*dto.IncomeTrend, error) {
	now := time.Now()
	var startDate, endDate string
	var interval string     // 聚合粒度: "day" 或 "month"
	var loopStart time.Time // 循环起始点（用于生成完整的时间轴标签）
	var days, months int    // 循环次数

	// 原始注释保留及说明:
	// Default to year (monthly view) if not specified or "year"
	// However, original design was "Month" (6 months).
	// Let's redefine based on UI:
	// "week": Past 7 days (Daily) -> 过去7天，按日展示
	// "month": Past 30 days (Daily) -> 过去30天，按日展示
	// "quarter": Past 3 (or 12 weeks) -> 过去3个月，按月展示
	// "year": Past 12 months (Monthly) -> 过去一年，按月展示

	switch period {
	case "week":
		days = 7
		interval = "day"
		loopStart = now.AddDate(0, 0, -days+1)
		startDate = loopStart.Format("2006-01-02")
		endDate = now.Format("2006-01-02") + " 23:59:59"
	case "month":
		days = 30
		interval = "day"
		loopStart = now.AddDate(0, 0, -days+1)
		startDate = loopStart.Format("2006-01-02")
		endDate = now.Format("2006-01-02") + " 23:59:59"
	case "quarter":
		months = 3
		interval = "month"
		// 起始于 N-1 个月前的当月1号
		loopStart = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()).AddDate(0, -months+1, 0)
		startDate = loopStart.Format("2006-01-02")
		endDate = now.Format("2006-01-02") + " 23:59:59"
	case "year":
		months = 12
		interval = "month"
		loopStart = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()).AddDate(0, -months+1, 0)
		startDate = loopStart.Format("2006-01-02")
		endDate = now.Format("2006-01-02") + " 23:59:59"
	default:
		// 默认策略: 同 "month" 之前的逻辑，或是 6个月。
		// 这里保留其为 "半年视图(6个月)" 作为 fallback
		months = 6
		interval = "month"
		loopStart = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()).AddDate(0, -months+1, 0)
		startDate = loopStart.Format("2006-01-02")
		endDate = now.Format("2006-01-02") + " 23:59:59"
	}

	// 从数据库查询聚合好的收入数据（Map形式）
	expected, actual, err := s.paymentRepo.GetIncomeStats(userID, startDate, endDate, interval)
	if err != nil {
		return nil, err
	}

	var labels []string
	var actualValues []float64
	var expectedValues []float64

	// 数据补全: 数据库只返回有数据的日期，需要遍历完整时间轴填补0值
	if interval == "day" {
		for i := 0; i < days; i++ {
			date := loopStart.AddDate(0, 0, i)
			key := date.Format("2006-01-02") // 数据库返回的Key格式
			label := date.Format("01-02")    // 前端展示的X轴标签

			labels = append(labels, label)
			actualValues = append(actualValues, actual[key])
			expectedValues = append(expectedValues, expected[key])
		}
	} else {
		count := months
		for i := 0; i < count; i++ {
			date := loopStart.AddDate(0, i, 0)
			key := date.Format("2006-01")             // 数据库返回的Key格式
			label := fmt.Sprintf("%d月", date.Month()) // 前端展示: "1月", "2月"...

			labels = append(labels, label)
			actualValues = append(actualValues, actual[key])
			expectedValues = append(expectedValues, expected[key])
		}
	}

	return &dto.IncomeTrend{
		Labels:         labels,
		ActualValues:   actualValues,
		ExpectedValues: expectedValues,
	}, nil
}

// GetRecentProjects 获取最近更新的5个项目
// 用于仪表盘"最近项目"列表展示。
//
// 参数:
//   - userID: 用户ID
//
// 返回:
//   - []models.Project: 项目列表切片
//   - error: 错误信息
func (s *DashboardService) GetRecentProjects(userID int64) ([]models.Project, error) {
	return s.projectRepo.ListRecent(userID, 5)
}

// GetUpcomingPayments 获取即将到期的款项
// 查询未来7天内到期以及已经逾期的待收款项。
//
// 参数:
//   - userID: 用户ID
//
// 返回:
//   - []models.Payment: 款项列表切片
//   - error: 错误信息
func (s *DashboardService) GetUpcomingPayments(userID int64) ([]models.Payment, error) {
	// 不在仓库层截断，避免大量逾期款项把未来7天内到期的款项挤出结果。
	return s.paymentRepo.ListUpcoming(userID, 7, 0)
}
