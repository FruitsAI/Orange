package repository

import (
	"time"

	"github.com/FruitsAI/Orange/internal/database"
	"github.com/FruitsAI/Orange/internal/models"
	"gorm.io/gorm"
)

// PaymentRepository 收款数据仓库
type PaymentRepository struct {
	db *gorm.DB
}

// NewPaymentRepository 创建收款仓库
func NewPaymentRepository() *PaymentRepository {
	return &PaymentRepository{db: database.GetDB()}
}

// FindByID 根据ID查找收款
func (r *PaymentRepository) FindByID(id int64) (*models.Payment, error) {
	var payment models.Payment
	if err := r.db.First(&payment, id).Error; err != nil {
		return nil, err
	}
	return &payment, nil
}

// FindByIDWithProject 根据ID查找收款（包含项目信息）
func (r *PaymentRepository) FindByIDWithProject(id int64) (*models.Payment, error) {
	var payment models.Payment
	if err := r.db.Preload("Project").First(&payment, id).Error; err != nil {
		return nil, err
	}
	return &payment, nil
}

// ListByProject 根据项目ID获取收款列表
func (r *PaymentRepository) ListByProject(projectID int64) ([]models.Payment, error) {
	var payments []models.Payment
	if err := r.db.Where("project_id = ?", projectID).
		Order("plan_date ASC").
		Find(&payments).Error; err != nil {
		return nil, err
	}
	return payments, nil
}

// ListUpcoming 获取指定天数内即将到期待收款项
func (r *PaymentRepository) ListUpcoming(userID int64, days int, limit int) ([]models.Payment, error) {
	var payments []models.Payment
	endDate := time.Now().AddDate(0, 0, days).Format("2006-01-02")

	if err := r.db.Preload("Project").
		Where("user_id = ? AND status = ? AND plan_date <= ?", userID, "pending", endDate).
		Order("plan_date ASC").
		Limit(limit).
		Find(&payments).Error; err != nil {
		return nil, err
	}
	return payments, nil
}

// ListOverdue 获取当前已逾期的待收款项
// 逾期定义: status="pending" 且 plan_date 小于今天
func (r *PaymentRepository) ListOverdue(userID int64) ([]models.Payment, error) {
	var payments []models.Payment
	today := time.Now().Format("2006-01-02")

	if err := r.db.Where("user_id = ? AND status = ? AND plan_date < ?", userID, "pending", today).
		Find(&payments).Error; err != nil {
		return nil, err
	}
	return payments, nil
}

// Create 创建收款
func (r *PaymentRepository) Create(payment *models.Payment) error {
	return r.db.Create(payment).Error
}

// Update 更新收款
func (r *PaymentRepository) Update(payment *models.Payment) error {
	return r.db.Save(payment).Error
}

// Delete 删除收款
func (r *PaymentRepository) Delete(id int64) error {
	return r.db.Delete(&models.Payment{}, id).Error
}

// Confirm 执行确认收款
// 将状态更新为 'paid' 并记录实际收款信息
func (r *PaymentRepository) Confirm(id int64, actualDate, method string) error {
	return r.db.Model(&models.Payment{}).Where("id = ?", id).
		Updates(map[string]interface{}{
			"status":      "paid",
			"actual_date": actualDate,
			"method":      method,
		}).Error
}

// SumByStatus 按状态统计金额
func (r *PaymentRepository) SumByStatus(userID int64, status string) float64 {
	var sum float64
	r.db.Model(&models.Payment{}).
		Where("user_id = ? AND status = ?", userID, status).
		Select("COALESCE(SUM(amount), 0)").Scan(&sum)
	return sum
}

// SumOverdue 统计逾期金额
func (r *PaymentRepository) SumOverdue(userID int64) float64 {
	var sum float64
	today := time.Now().Format("2006-01-02")
	r.db.Model(&models.Payment{}).
		Where("user_id = ? AND status = ? AND plan_date < ?", userID, "pending", today).
		Select("COALESCE(SUM(amount), 0)").Scan(&sum)
	return sum
}

// ListByDateRange 根据日期范围获取收款列表
func (r *PaymentRepository) ListByDateRange(userID int64, startDate, endDate string) ([]models.Payment, error) {
	var payments []models.Payment
	if err := r.db.Preload("Project").
		Where("user_id = ? AND plan_date BETWEEN ? AND ?", userID, startDate, endDate).
		Order("plan_date ASC").
		Find(&payments).Error; err != nil {
		return nil, err
	}
	return payments, nil
}

// GetIncomeStats 获取收入对比统计 (预期 vs 实际)
// 分组聚合查询，支持按日或按月统计。
// 返回:
//   - expected: map[日期]计划收款金额
//   - actual: map[日期]实际已收款金额
func (r *PaymentRepository) GetIncomeStats(userID int64, startDate, endDate, interval string) (map[string]float64, map[string]float64, error) {
	expected := make(map[string]float64)
	actual := make(map[string]float64)

	// SQLite 日期格式化语法
	dateFormat := "%Y-%m-%d"
	if interval == "month" {
		dateFormat = "%Y-%m"
	}

	type Result struct {
		Date  string
		Total float64
	}

	// 1. 预期收入: 依据 plan_date 统计所有款项
	var expectedResults []Result
	if err := r.db.Model(&models.Payment{}).
		Select("strftime('"+dateFormat+"', plan_date) as date, COALESCE(SUM(amount), 0) as total").
		Where("user_id = ? AND plan_date BETWEEN ? AND ?", userID, startDate, endDate).
		Group("date").
		Scan(&expectedResults).Error; err != nil {
		return nil, nil, err
	}
	for _, res := range expectedResults {
		expected[res.Date] = res.Total
	}

	// 2. 实际收入: 依据 actual_date 统计已完成(paid)的款项
	var actualResults []Result
	if err := r.db.Model(&models.Payment{}).
		Select("strftime('"+dateFormat+"', actual_date) as date, COALESCE(SUM(amount), 0) as total").
		Where("user_id = ? AND status = 'paid' AND actual_date BETWEEN ? AND ?", userID, startDate, endDate).
		Group("date").
		Scan(&actualResults).Error; err != nil {
		return nil, nil, err
	}
	for _, res := range actualResults {
		actual[res.Date] = res.Total
	}

	return expected, actual, nil
}

// GetStatsByPeriod 获取指定时间周期内的综合指标
// 返回值:
//   - totalExpected: 计划在此期间应收总额
//   - paid: 实际在此期间收到的金额
//   - pending: 计划在此期间但尚未收到的金额 (包含逾期)
//   - overdue: 计划在此期间且已逾期的金额 (plan_date < today)
//   - avgPeriod: 平均回款周期 (天)
func (r *PaymentRepository) GetStatsByPeriod(userID int64, startDate, endDate string) (total, paid, pending, overdue, avgPeriod float64, err error) {
	// 1. Total (TotalExpected): 计划日期在范围内的款项总和
	r.db.Model(&models.Payment{}).
		Where("user_id = ? AND plan_date BETWEEN ? AND ?", userID, startDate, endDate).
		Select("COALESCE(SUM(amount), 0)").Scan(&total)

	// 2. Paid: 实际日期在范围内已支付的款项
	r.db.Model(&models.Payment{}).
		Where("user_id = ? AND status = 'paid' AND actual_date BETWEEN ? AND ?", userID, startDate, endDate).
		Select("COALESCE(SUM(amount), 0)").Scan(&paid)

	// 3. Pending: 计划日期在范围内，当前状态仍为 pending 的款项
	r.db.Model(&models.Payment{}).
		Where("user_id = ? AND status = 'pending' AND plan_date BETWEEN ? AND ?", userID, startDate, endDate).
		Select("COALESCE(SUM(amount), 0)").Scan(&pending)

	// 4. Overdue: 计划日期在范围内，且已逾期 (plan_date < today)
	//    这是 Pending 的子集
	today := time.Now().Format("2006-01-02")
	r.db.Model(&models.Payment{}).
		Where("user_id = ? AND status = 'pending' AND plan_date BETWEEN ? AND ? AND plan_date < ?", userID, startDate, endDate, today).
		Select("COALESCE(SUM(amount), 0)").Scan(&overdue)

	// 5. AvgPeriod: 平均回款周期 (Actual Date - Plan Date)
	//    仅统计在此期间实际到账的款项
	r.db.Model(&models.Payment{}).
		Where("user_id = ? AND status = 'paid' AND actual_date BETWEEN ? AND ?", userID, startDate, endDate).
		Select("COALESCE(AVG(julianday(actual_date) - julianday(plan_date)), 0)").Scan(&avgPeriod)

	return total, paid, pending, overdue, avgPeriod, nil
}

// SumPaidByProject 计算项目中已支付的总金额
func (r *PaymentRepository) SumPaidByProject(projectID int64) (float64, error) {
	var total float64
	err := r.db.Model(&models.Payment{}).
		Where("project_id = ? AND status = ?", projectID, "paid").
		Select("COALESCE(SUM(amount), 0)").Scan(&total).Error
	return total, err
}
