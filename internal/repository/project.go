package repository

import (
	"github.com/FruitsAI/Orange/internal/database"
	"github.com/FruitsAI/Orange/internal/models"
	"gorm.io/gorm"
)

// ProjectRepository 项目数据仓库
type ProjectRepository struct {
	db *gorm.DB
}

// NewProjectRepository 创建项目仓库
func NewProjectRepository() *ProjectRepository {
	return &ProjectRepository{db: database.GetDB()}
}

// FindByID 根据ID查找项目
func (r *ProjectRepository) FindByID(id int64) (*models.Project, error) {
	var project models.Project
	if err := r.db.First(&project, id).Error; err != nil {
		return nil, err
	}
	return &project, nil
}

func (r *ProjectRepository) FindByIDForUser(id, userID int64) (*models.Project, error) {
	var project models.Project
	if err := r.db.Where("id = ? AND user_id = ?", id, userID).First(&project).Error; err != nil {
		return nil, err
	}
	return &project, nil
}

// FindByIDWithPayments 根据ID查找项目（包含收款列表）
func (r *ProjectRepository) FindByIDWithPayments(id int64) (*models.Project, error) {
	var project models.Project
	if err := r.db.Preload("Payments", func(db *gorm.DB) *gorm.DB {
		return db.Order("plan_date DESC")
	}).First(&project, id).Error; err != nil {
		return nil, err
	}
	return &project, nil
}

func (r *ProjectRepository) FindByIDWithPaymentsForUser(id, userID int64) (*models.Project, error) {
	var project models.Project
	if err := r.db.Preload("Payments", func(db *gorm.DB) *gorm.DB {
		return db.Order("plan_date DESC")
	}).Where("id = ? AND user_id = ?", id, userID).First(&project).Error; err != nil {
		return nil, err
	}
	return &project, nil
}

// List 分页查询项目列表
// 支持按用户ID(数据隔离)、状态、关键词(名称或公司名)进行筛选。
// Preload("User"): 预加载关联的用户信息。
func (r *ProjectRepository) List(userID int64, status, keyword string, page, pageSize int) ([]models.Project, int64, error) {
	var projects []models.Project
	var total int64

	// 构建基础查询：限定用户，预加载关联
	query := r.db.Model(&models.Project{}).Preload("User").Where("user_id = ?", userID)

	// 动态条件筛选
	if status != "" && status != "all" {
		query = query.Where("status = ?", status)
	}
	if keyword != "" {
		query = query.Where("(name LIKE ? OR company LIKE ?)", "%"+keyword+"%", "%"+keyword+"%")
	}

	// 计算总数
	query.Count(&total)

	// 分页查询，按创建时间倒序
	offset := (page - 1) * pageSize
	if err := query.Order("create_time DESC").Offset(offset).Limit(pageSize).Find(&projects).Error; err != nil {
		return nil, 0, err
	}

	return projects, total, nil
}

// ListRecent 获取最近项目
func (r *ProjectRepository) ListRecent(userID int64, limit int) ([]models.Project, error) {
	var projects []models.Project
	if err := r.db.Where("user_id = ?", userID).
		Order("create_time DESC").
		Limit(limit).
		Find(&projects).Error; err != nil {
		return nil, err
	}
	return projects, nil
}

// Create 创建项目
func (r *ProjectRepository) Create(project *models.Project) error {
	return r.db.Create(project).Error
}

// Update 更新项目
func (r *ProjectRepository) Update(project *models.Project) error {
	return r.db.Save(project).Error
}

// Delete 删除项目
func (r *ProjectRepository) Delete(id int64) error {
	return r.db.Delete(&models.Project{}, id).Error
}

func (r *ProjectRepository) DeleteForUser(id, userID int64) error {
	return r.db.Where("id = ? AND user_id = ?", id, userID).Delete(&models.Project{}).Error
}

// UpdateStatus 更新项目状态
func (r *ProjectRepository) UpdateStatus(id int64, status string) error {
	return r.db.Model(&models.Project{}).Where("id = ?", id).Update("status", status).Error
}

func (r *ProjectRepository) UpdateStatusForUser(id, userID int64, status string) error {
	return r.db.Model(&models.Project{}).Where("id = ? AND user_id = ?", id, userID).Update("status", status).Error
}

// GetStats 获取用户维度的项目财务统计
// 返回:
//   - totalAmount: 所有项目的总合同金额之和
//   - paidAmount: 所有实收金额之和 (关联 Payments 表统计)
//   - pendingAmount: 待收金额 (total - paid)
func (r *ProjectRepository) GetStats(userID int64) (totalAmount, paidAmount, pendingAmount float64, err error) {
	// 1. 统计总合同金额 (SUM project.total_amount)
	r.db.Model(&models.Project{}).Where("user_id = ?", userID).
		Select("COALESCE(SUM(total_amount), 0)").Scan(&totalAmount)

	// 2. 统计已收金额 (关联查询 payment 表中 status='paid' 的记录)
	r.db.Model(&models.Payment{}).
		Joins("JOIN projects ON payments.project_id = projects.id").
		Where("projects.user_id = ? AND payments.status = ?", userID, "paid").
		Select("COALESCE(SUM(payments.amount), 0)").Scan(&paidAmount)

	// 3. 计算待收金额
	pendingAmount = totalAmount - paidAmount

	return
}

// ExistsByContractNumber 检查合同编号是否存在（限定用户）
func (r *ProjectRepository) ExistsByContractNumber(userID int64, contractNumber string, excludeID int64) (bool, error) {
	var count int64
	query := r.db.Model(&models.Project{}).Where("user_id = ? AND contract_number = ?", userID, contractNumber)
	if excludeID > 0 {
		query = query.Where("id != ?", excludeID)
	}
	if err := query.Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

// GetMaxContractNumberByPrefix 获取指定日期的最大合同编号
// 用于生成新的合同编号。例如查询 "HT20231001" 前缀的最新编号。
// 返回:
//   - maxContractNumber: 存在的最大编号 (如 "HT202310010005")，如果没有则返回空字符串。
func (r *ProjectRepository) GetMaxContractNumberByPrefix(userID int64, prefix string) (string, error) {
	var contractNumber string
	err := r.db.Model(&models.Project{}).
		Where("user_id = ? AND contract_number LIKE ?", userID, prefix+"%").
		Order("contract_number DESC").
		Limit(1).
		Pluck("contract_number", &contractNumber).Error
	if err != nil {
		return "", err
	}
	return contractNumber, nil
}
