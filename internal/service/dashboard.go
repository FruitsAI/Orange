package service

import (
	"fmt"
	"time"

	"github.com/FruitsAI/Orange/internal/dto"
	"github.com/FruitsAI/Orange/internal/models"
	"github.com/FruitsAI/Orange/internal/repository"
)

// DashboardService 仪表盘服务
type DashboardService struct {
	projectRepo *repository.ProjectRepository
	paymentRepo *repository.PaymentRepository
}

// NewDashboardService 创建仪表盘服务
func NewDashboardService() *DashboardService {
	return &DashboardService{
		projectRepo: repository.NewProjectRepository(),
		paymentRepo: repository.NewPaymentRepository(),
	}
}

// GetStats 获取统计数据
// GetStats 获取统计数据
func (s *DashboardService) GetStats(userID int64, period string) (*dto.Stats, error) {
	now := time.Now()
	var startDate, endDate string
	var prevStartDate, prevEndDate string

	// Date calculation logic (Current Period & Previous Period)
	switch period {
	case "week":
		// Current: Last 7 days
		startDate = now.AddDate(0, 0, -6).Format("2006-01-02")
		endDate = now.Format("2006-01-02") + " 23:59:59"
		// Previous: The 7 days before that
		prevStartDate = now.AddDate(0, 0, -13).Format("2006-01-02")
		prevEndDate = now.AddDate(0, 0, -7).Format("2006-01-02") + " 23:59:59"
	case "month":
		// Current: Last 30 days
		startDate = now.AddDate(0, 0, -29).Format("2006-01-02")
		endDate = now.Format("2006-01-02") + " 23:59:59"
		// Previous
		prevStartDate = now.AddDate(0, 0, -59).Format("2006-01-02")
		prevEndDate = now.AddDate(0, 0, -30).Format("2006-01-02") + " 23:59:59"
	case "quarter":
		// Current: Last 3 months (90 days approx)
		startDate = now.AddDate(0, -3, 0).Format("2006-01-02")
		endDate = now.Format("2006-01-02") + " 23:59:59"
		// Previous
		prevStartDate = now.AddDate(0, -6, 0).Format("2006-01-02")
		prevEndDate = now.AddDate(0, -3, 0).Format("2006-01-02") + " 23:59:59"
	case "year":
		// Current: Last 12 months
		startDate = now.AddDate(-1, 0, 0).Format("2006-01-02")
		endDate = now.Format("2006-01-02") + " 23:59:59"
		// Previous
		prevStartDate = now.AddDate(-2, 0, 0).Format("2006-01-02")
		prevEndDate = now.AddDate(-1, 0, 0).Format("2006-01-02") + " 23:59:59"
	default: // Default to Month if empty
		startDate = now.AddDate(0, 0, -29).Format("2006-01-02")
		endDate = now.Format("2006-01-02") + " 23:59:59"
		prevStartDate = now.AddDate(0, 0, -59).Format("2006-01-02")
		prevEndDate = now.AddDate(0, 0, -30).Format("2006-01-02") + " 23:59:59"
	}

	// Current Stats
	currTotal, currPaid, currOverdue, currAvgDays, err := s.paymentRepo.GetStatsByPeriod(userID, startDate, endDate)
	if err != nil {
		return nil, err
	}
	currPending := currTotal - currPaid

	// Previous Stats
	prevTotal, prevPaid, prevOverdue, prevAvgDays, err := s.paymentRepo.GetStatsByPeriod(userID, prevStartDate, prevEndDate)
	if err != nil {
		return nil, err
	}
	prevPending := prevTotal - prevPaid

	// Calculate Trends ((Curr - Prev) / Prev)
	calcTrend := func(curr, prev float64) float64 {
		if prev == 0 {
			if curr > 0 {
				return 100 // 100% growth if from 0 to something
			}
			return 0
		}
		return ((curr - prev) / prev) * 100
	}

	return &dto.Stats{
		TotalAmount:            currTotal,
		PaidAmount:             currPaid,
		PendingAmount:          currPending,
		OverdueAmount:          currOverdue,
		AvgCollectionDays:      currAvgDays,
		TotalTrend:             calcTrend(currTotal, prevTotal),
		PaidTrend:              calcTrend(currPaid, prevPaid),
		PendingTrend:           calcTrend(currPending, prevPending),
		OverdueTrend:           calcTrend(currOverdue, prevOverdue),
		AvgCollectionDaysTrend: calcTrend(currAvgDays, prevAvgDays),
	}, nil
}

// GetIncomeTrend 获取收入趋势
func (s *DashboardService) GetIncomeTrend(userID int64, period string) (*dto.IncomeTrend, error) {
	now := time.Now()
	var startDate, endDate string
	var interval string
	var loopStart time.Time
	var days, months int

	// Default to year (monthly view) if not specified or "year"
	// However, original design was "Month" (6 months).
	// Let's redefine based on UI:
	// "week": Past 7 days (Daily)
	// "month": Past 30 days (Daily)
	// "quarter": Past 3 months (Weekly? No, let's do Monthly for now as it's cleaner, or Weekly if we want more detail.
	//           Let's stick to Monthly for Quarter/Year for now to match Year logic).
	//           Wait, Quarter is 3 months. Monthly points = 3. A bit sparse.
	//           Let's try: "quarter" -> Past 12 Weeks? (Weekly).
	//           Backend `GetIncomeStats` takes "interval".
	//           SQLite grouping by 'week' is tricky (%W). Let's stick to "day" or "month" for now.
	//           If "quarter", let's show "Past 3 Months" (Monthly). User can drill down to "Month" for daily.
	// "year": Past 12 months (Monthly).

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
		// Start from N-1 months ago 1st day
		loopStart = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()).AddDate(0, -months+1, 0)
		startDate = loopStart.Format("2006-01-02")
		endDate = now.Format("2006-01-02") + " 23:59:59"
	case "year":
		months = 12
		interval = "month"
		loopStart = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()).AddDate(0, -months+1, 0)
		startDate = loopStart.Format("2006-01-02")
		endDate = now.Format("2006-01-02") + " 23:59:59"
	default: // Default used to be 6 months. Let's make default "month" (30 days daily) or "year" (12 months monthly)?
		// The frontend default might be "month" (meaning 30 days daily) OR existing "6 months".
		// Let's keep a "default" that mimics the old behavior if needed, OR map "month" to 30 days.
		// If frontend sends "month", it falls into case "month" (30 days).
		// If frontend sends empty, let's default to "year" (12 months).
		months = 6
		interval = "month"
		loopStart = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()).AddDate(0, -months+1, 0)
		startDate = loopStart.Format("2006-01-02")
		endDate = now.Format("2006-01-02") + " 23:59:59"
	}

	expected, actual, err := s.paymentRepo.GetIncomeStats(userID, startDate, endDate, interval)
	if err != nil {
		return nil, err
	}

	var labels []string
	var actualValues []float64
	var expectedValues []float64

	if interval == "day" {
		for i := 0; i < days; i++ {
			date := loopStart.AddDate(0, 0, i)
			key := date.Format("2006-01-02")
			label := date.Format("01-02")
			if period == "week" {
				// Weekday name?
				// label = date.Weekday().String() // English
				// Simple mm-dd is fine.
			}

			labels = append(labels, label)
			actualValues = append(actualValues, actual[key])
			expectedValues = append(expectedValues, expected[key])
		}
	} else {
		count := months
		for i := 0; i < count; i++ {
			date := loopStart.AddDate(0, i, 0)
			key := date.Format("2006-01")
			label := fmt.Sprintf("%d月", date.Month())

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

// GetRecentProjects 获取最近项目
func (s *DashboardService) GetRecentProjects(userID int64) ([]models.Project, error) {
	return s.projectRepo.ListRecent(userID, 5)
}

// GetUpcomingPayments 获取即将到期收款
func (s *DashboardService) GetUpcomingPayments(userID int64) ([]models.Payment, error) {
	return s.paymentRepo.ListUpcoming(userID, 7, 5)
}
