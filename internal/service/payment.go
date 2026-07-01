package service

import (
	"errors"
	"math"
	"time"

	"github.com/FruitsAI/Orange/internal/constants"
	"github.com/FruitsAI/Orange/internal/database"
	"github.com/FruitsAI/Orange/internal/dto"
	"github.com/FruitsAI/Orange/internal/models"
	pkgerrors "github.com/FruitsAI/Orange/internal/pkg/errors"
	"github.com/FruitsAI/Orange/internal/repository"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// PaymentService 款项(回款)服务
// 负责处理所有与款项相关的业务逻辑，包括生成收款计划、更新收款状态、
// 执行回款确认事务以及自动计算回款百分比。
//
// 依赖:
//   - PaymentRepository: 款项数据操作
//   - ProjectRepository: 项目数据操作 (用于更新项目总已收金额)
type PaymentService struct {
	paymentRepo *repository.PaymentRepository
	projectRepo *repository.ProjectRepository
}

// NewPaymentService 创建并初始化收款服务
//
// 返回:
//   - *PaymentService: 初始化的服务实例
func NewPaymentService() *PaymentService {
	return &PaymentService{
		paymentRepo: repository.NewPaymentRepository(),
		projectRepo: repository.NewProjectRepository(),
	}
}

// ListByProject 根据项目ID获取该项目的所有收款计划
// 用于在项目详情页展示款项列表。
//
// 参数:
//   - projectID: 项目ID
//
// 返回:
//   - []models.Payment: 款项列表
//   - error: 数据库查询错误
func (s *PaymentService) ListByProject(projectID int64) ([]models.Payment, error) {
	return s.paymentRepo.ListByProject(projectID)
}

func (s *PaymentService) ListByProjectForUser(userID, projectID int64) ([]models.Payment, error) {
	if _, err := s.projectRepo.FindByIDForUser(projectID, userID); err != nil {
		return nil, err
	}
	return s.paymentRepo.ListByProject(projectID)
}

// ListUpcoming 获取指定用户近期即将到期的待收款项 (Dashboard用)
// 通常用于首页"即将收款"卡片，提醒用户关注近期回款。
//
// 参数:
//   - userID: 用户ID
//   - days: 未来多少天内 (如 7天)
//   - limit: 最大返回数量 (如 5条)
//
// 返回:
//   - []models.Payment: 即将到期的款项列表
//   - error: 数据库查询错误
func (s *PaymentService) ListUpcoming(userID int64, days, limit int) ([]models.Payment, error) {
	return s.paymentRepo.ListUpcoming(userID, days, limit)
}

// ListByDateRange 获取指定日期范围内的所有款项记录 (报表/日历用)
// 包含起始日期和结束日期（闭区间）。
//
// 参数:
//   - userID: 用户ID
//   - startDate: 开始日期 "YYYY-MM-DD"
//   - endDate: 结束日期 "YYYY-MM-DD"
//
// 返回:
//   - []models.Payment: 范围内的款项列表
//   - error: 数据库查询错误
func (s *PaymentService) ListByDateRange(userID int64, startDate, endDate string) ([]models.Payment, error) {
	return s.paymentRepo.ListByDateRange(userID, startDate, endDate)
}

// Create 创建新的收款/回款计划
//
// 参数:
//   - input: 收款请求DTO
//
// 返回:
//   - *models.Payment: 创建成功的款项实体
//   - error: 业务规则校验失败或数据库错误
func (s *PaymentService) Create(input dto.PaymentRequest) (*models.Payment, error) {
	// 外层权限检查
	if _, err := s.projectRepo.FindByIDForUser(input.ProjectID, input.UserID); err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, pkgerrors.ErrProjectNotFound
		}
		return nil, pkgerrors.Wrap(err, "查询项目失败")
	}

	planDate, err := time.Parse("2006-01-02", input.PlanDate)
	if err != nil {
		return nil, pkgerrors.WrapWithCode(err, 400, "计划日期格式错误")
	}

	payment := &models.Payment{
		ProjectID: input.ProjectID,
		Stage:     input.Stage,
		Amount:    input.Amount,
		PlanDate:  planDate,
		Status:    input.Status,
		Method:    input.Method,
		Remark:    input.Remark,
		UserID:    input.UserID,
	}

	// 默认状态为"待收款"
	if payment.Status == "" {
		payment.Status = constants.PaymentStatusPending
	}

	// 在事务中完成创建 + 规则处理 + 项目金额同步，确保一致性
	return payment, database.GetDB().Transaction(func(tx *gorm.DB) error {
		// 执行核心业务规则校验与处理（如计算百分比、自动填充实际日期逻辑等）
		if err := s.processPaymentRulesInTx(tx, payment); err != nil {
			return err
		}

		// 创建收款记录
		if err := tx.Create(payment).Error; err != nil {
			return err
		}

		// 级联更新: 重新计算并同步该项目对应的"已收款总额"字段
		return s.syncProjectReceivedAmountInTx(tx, payment.ProjectID)
	})
}

// Update 更新收款计划详情
//
// 参数:
//   - id: 款项ID
//   - input: 更新内容
//
// 返回:
//   - *models.Payment: 更新后的实体
//   - error: 更新失败
func (s *PaymentService) Update(id int64, input dto.PaymentRequest) (*models.Payment, error) {
	payment, err := s.paymentRepo.FindByID(id)
	if err != nil {
		return nil, err
	}
	return s.applyUpdate(payment, input)
}

func (s *PaymentService) UpdateForUser(userID, id int64, input dto.PaymentRequest) (*models.Payment, error) {
	payment, err := s.paymentRepo.FindByIDForUser(id, userID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, pkgerrors.ErrPaymentNotFound
		}
		return nil, pkgerrors.Wrap(err, "查询款项失败")
	}
	if _, err := s.projectRepo.FindByIDForUser(payment.ProjectID, userID); err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, pkgerrors.ErrProjectNotFound
		}
		return nil, pkgerrors.Wrap(err, "查询项目失败")
	}
	return s.applyUpdate(payment, input)
}

// applyUpdate 应用款项更新的公共逻辑（校验 + 赋值 + 事务内规则处理与金额同步）
// Update 与 UpdateForUser 仅鉴权查询方式不同，其余流程一致，此处统一收敛避免重复。
func (s *PaymentService) applyUpdate(payment *models.Payment, input dto.PaymentRequest) (*models.Payment, error) {
	if input.ProjectID != 0 && input.ProjectID != payment.ProjectID {
		return nil, pkgerrors.WrapWithCode(errors.New("不允许修改款项所属项目"), 400, "不允许修改款项所属项目")
	}
	planDate, err := time.Parse("2006-01-02", input.PlanDate)
	if err != nil {
		return nil, pkgerrors.WrapWithCode(err, 400, "计划日期格式错误")
	}

	// 更新字段
	payment.Stage = input.Stage
	payment.Amount = input.Amount
	payment.PlanDate = planDate
	payment.Status = input.Status
	payment.Method = input.Method
	payment.Remark = input.Remark

	// 在事务中完成规则处理 + 保存 + 项目金额同步
	return payment, database.GetDB().Transaction(func(tx *gorm.DB) error {
		// 重新应用业务规则（如重新计算百分比，因为金额可能变了）
		if err := s.processPaymentRulesInTx(tx, payment); err != nil {
			return err
		}
		if err := tx.Save(payment).Error; err != nil {
			return err
		}
		// 级联更新: 数据变更后，必须重新同步项目的总收款状态
		return s.syncProjectReceivedAmountInTx(tx, payment.ProjectID)
	})
}

// processPaymentRulesInTx 执行通用款项业务规则处理（事务内版本）
// 包含以下逻辑:
//  1. 状态与日期的联动: 如果状态改为"paid"(已收款)，自动填充ActualDate(实际收款日)，反之置空。
//  2. 百分比自动计算: 根据款项金额与项目合同总额，自动计算该笔款项的占比。
func (s *PaymentService) processPaymentRulesInTx(tx *gorm.DB, payment *models.Payment) error {
	// 1. 处理实际收款日期逻辑
	if payment.Status == "paid" && payment.ActualDate == nil {
		// 如果标记为已收款但用户未填实际日期，默认等于计划日期
		payment.ActualDate = &payment.PlanDate
	}
	// 如果不是已收款状态，清除实际收款日期
	if payment.Status != "paid" {
		payment.ActualDate = nil
	}

	// 2. 自动计算百分比（在同一事务内读取项目总额，避免脏读）
	var project models.Project
	if err := tx.First(&project, payment.ProjectID).Error; err != nil {
		return err
	}

	if project.TotalAmount > 0 {
		payment.Percentage = (payment.Amount / project.TotalAmount) * 100
	} else {
		payment.Percentage = 0
	}

	return nil
}

// amountEpsilon 金额比较容差
// 由于金额当前以 float64 存储，直接用 != 比较会因浮点累加误差产生误判，
// 统一以该容差判断"金额是否发生实质变化"。
const amountEpsilon = 0.005

// syncProjectReceivedAmountInTx 重新计算并同步项目的"已收款总额"（事务内版本）
// 此方法应在任何款项金额或状态发生变化后被调用，以确保 Project 表数据的一致性。
// 全程在同一事务 tx 内读改写，避免读后写竞态导致的 lost update。
func (s *PaymentService) syncProjectReceivedAmountInTx(tx *gorm.DB, projectID int64) error {
	var project models.Project
	if err := tx.First(&project, projectID).Error; err != nil {
		return err
	}

	// 聚合计算所有已收款项的总额
	var totalReceived float64
	if err := tx.Model(&models.Payment{}).
		Where("project_id = ? AND status = ?", projectID, "paid").
		Select("COALESCE(SUM(amount), 0)").
		Scan(&totalReceived).Error; err != nil {
		return err
	}

	// 仅在金额确实变化时执行更新（带容差，规避浮点误判）
	if math.Abs(project.ReceivedAmount-totalReceived) > amountEpsilon {
		if err := tx.Model(&models.Project{}).
			Where("id = ?", projectID).
			Update("received_amount", totalReceived).Error; err != nil {
			return err
		}
	}

	return nil
}

// Delete 删除收款（同步更新项目已收款金额）
func (s *PaymentService) Delete(id int64) error {
	// 1. 先查询款项获取 project_id
	payment, err := s.paymentRepo.FindByID(id)
	if err != nil {
		return err
	}
	projectID := payment.ProjectID

	// 2. 在事务中删除款项并同步项目已收款金额，保证一致性
	return database.GetDB().Transaction(func(tx *gorm.DB) error {
		if err := tx.Delete(&models.Payment{}, id).Error; err != nil {
			return err
		}
		return s.syncProjectReceivedAmountInTx(tx, projectID)
	})
}

func (s *PaymentService) DeleteForUser(userID, id int64) error {
	payment, err := s.paymentRepo.FindByIDForUser(id, userID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return pkgerrors.ErrPaymentNotFound
		}
		return pkgerrors.Wrap(err, "查询款项失败")
	}
	projectID := payment.ProjectID

	return database.GetDB().Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("id = ? AND user_id = ?", id, userID).Delete(&models.Payment{}).Error; err != nil {
			return pkgerrors.Wrap(err, "删除款项失败")
		}
		return s.syncProjectReceivedAmountInTx(tx, projectID)
	})
}

// Confirm 确认收款（One-Click 操作）
// 将款项标记为已收款，并自动更新实际收款日期和方式。通过数据库事务保证原子性。
//
// 事务流程:
//  1. 悲观锁锁定该款项记录 (Avoid Race Conditions)
//  2. 检查幂等性 (如果已支付直接返回)
//  3. 更新 Payment 记录状态
//  4. 重新计算该项目下所有已支付总额 (Sum)
//  5. 更新 Project 记录的 received_amount
//
// 参数:
//   - id: 款项ID
//   - actualDate: 实际收款日期字符串
//   - method: 收款方式 (如 银行转账, 支付宝)
//
// 返回:
//   - error: 事务执行失败
func (s *PaymentService) Confirm(id int64, actualDate, method string) error {
	actualAt, err := time.Parse("2006-01-02", actualDate)
	if err != nil {
		return err
	}

	return database.GetDB().Transaction(func(tx *gorm.DB) error {
		// 1. 先不加锁快速检查状态
		var payment models.Payment
		if err := tx.First(&payment, id).Error; err != nil {
			return err
		}

		// 2. 幂等性检查: 防止重复确认（无锁）
		if payment.Status == "paid" {
			return nil
		}

		// 3. 需要更新时才加锁
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&payment, id).Error; err != nil {
			return err
		}

		// 4. Double-check（防止锁等待期间被其他事务更新）
		if payment.Status == "paid" {
			return nil
		}

		// 5. 更新收款状态为"已收款"
		if err := tx.Model(&payment).Updates(map[string]interface{}{
			"status":      "paid",
			"actual_date": actualAt,
			"method":      method,
		}).Error; err != nil {
			return err
		}

		// 6. 同步计算项目已收款总额
		// 注意: 必须使用当前事务 tx 进行查询，否则读不到刚才更新的状态
		var totalReceived float64
		if err := tx.Model(&models.Payment{}).
			Where("project_id = ? AND status = ?", payment.ProjectID, "paid").
			Select("COALESCE(SUM(amount), 0)").
			Scan(&totalReceived).Error; err != nil {
			return err
		}

		// 7. 更新项目主表 sum 值
		if err := tx.Model(&models.Project{}).
			Where("id = ?", payment.ProjectID).
			Update("received_amount", totalReceived).Error; err != nil {
			return err
		}

		return nil
	})
}

func (s *PaymentService) ConfirmForUser(userID, id int64, actualDate, method string) error {
	actualAt, err := time.Parse("2006-01-02", actualDate)
	if err != nil {
		return pkgerrors.WrapWithCode(err, 400, "实际日期格式错误")
	}

	return database.GetDB().Transaction(func(tx *gorm.DB) error {
		var payment models.Payment
		if err := tx.Where("id = ? AND user_id = ?", id, userID).First(&payment).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return pkgerrors.ErrPaymentNotFound
			}
			return pkgerrors.Wrap(err, "查询款项失败")
		}

		if payment.Status == "paid" {
			return nil
		}

		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ? AND user_id = ?", id, userID).
			First(&payment).Error; err != nil {
			return pkgerrors.Wrap(err, "锁定款项失败")
		}

		if payment.Status == "paid" {
			return nil
		}

		if err := tx.Model(&payment).Updates(map[string]interface{}{
			"status":      "paid",
			"actual_date": actualAt,
			"method":      method,
		}).Error; err != nil {
			return pkgerrors.Wrap(err, "更新款项状态失败")
		}

		var totalReceived float64
		if err := tx.Model(&models.Payment{}).
			Where("project_id = ? AND user_id = ? AND status = ?", payment.ProjectID, userID, "paid").
			Select("COALESCE(SUM(amount), 0)").
			Scan(&totalReceived).Error; err != nil {
			return pkgerrors.Wrap(err, "计算已收款总额失败")
		}

		return tx.Model(&models.Project{}).
			Where("id = ? AND user_id = ?", payment.ProjectID, userID).
			Update("received_amount", totalReceived).Error
	})
}
