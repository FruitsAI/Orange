package service

import (
	"fmt"
	"time"

	"github.com/FruitsAI/Orange/internal/database"
	"github.com/FruitsAI/Orange/internal/dto"
	"github.com/FruitsAI/Orange/internal/models"
	"github.com/FruitsAI/Orange/internal/repository"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// ProjectService 项目服务
// 负责处理项目管理模块的所有核心业务逻辑，包括项目的增删改查、状态管理、
// 合同编号生成以及相关的款项级联操作。
//
// 依赖:
//   - ProjectRepository: 项目数据持久化接口
//   - PaymentRepository: 款项数据持久化接口
type ProjectService struct {
	projectRepo *repository.ProjectRepository
	paymentRepo *repository.PaymentRepository
}

// NewProjectService 创建并初始化项目服务实例
//
// 返回:
//   - *ProjectService: 包含已初始化 Repository 的服务实例
func NewProjectService() *ProjectService {
	return &ProjectService{
		projectRepo: repository.NewProjectRepository(),
		paymentRepo: repository.NewPaymentRepository(),
	}
}

// List 分页获取项目列表
// 支持根据用户ID、项目状态和关键词进行过滤查询。
//
// 参数:
//   - userID: 当前用户ID，强制数据隔离
//   - status: 项目状态筛选 (如 "active", "completed", "archived")，为空则查全部
//   - keyword: 搜索关键词，支持匹配项目名称、公司名或合同编号
//   - page: 页码，从1开始
//   - pageSize: 每页数量
//
// 返回:
//   - *dto.ProjectListResult: 包含项目列表数据、总数及分页信息
//   - error: 数据库查询错误
func (s *ProjectService) List(userID int64, status, keyword string, page, pageSize int) (*dto.ProjectListResult, error) {
	// 参数校验与默认值填充
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 10
	}

	// 执行查询
	projects, total, err := s.projectRepo.List(userID, status, keyword, page, pageSize)
	if err != nil {
		return nil, err
	}

	// 组装返回结果
	return &dto.ProjectListResult{
		List:     projects,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

// Get 获取项目详情
// 根据项目ID获取单个项目的详细信息，并默认包含该项目关联的所有款项数据。
//
// 参数:
//   - id: 项目ID
//
// 返回:
//   - *models.Project: 项目实体（包含 Preloaded Payments）
//   - error: 记录不存在或数据库错误
func (s *ProjectService) Get(id int64) (*models.Project, error) {
	// 使用 FindByIDWithPayments 确保在详情页能展示关联的收款计划
	return s.projectRepo.FindByIDWithPayments(id)
}

func (s *ProjectService) GetForUser(userID, id int64) (*models.Project, error) {
	return s.projectRepo.FindByIDWithPaymentsForUser(id, userID)
}

// Create 创建新项目
// 接收前端表单数据，进行日期解析和默认值处理后，将项目存入数据库。
//
// 参数:
//   - input: 创建项目的请求DTO，包含前端传递的所有表单字段
//
// 返回:
//   - *models.Project: 创建成功的项目实体
//   - error: 日期解析失败或数据库写入错误
func (s *ProjectService) Create(input dto.CreateProjectRequest) (*models.Project, error) {
	// 1. 日期字段解析 (字符串 "YYYY-MM-DD" -> time.Time)
	startDate, err := time.Parse("2006-01-02", input.StartDate)
	if err != nil {
		return nil, err
	}
	endDate, err := time.Parse("2006-01-02", input.EndDate)
	if err != nil {
		return nil, err
	}

	// 合同日期为选填项，需处理空值情况
	var contractDate *time.Time
	if input.ContractDate != "" {
		t, err := time.Parse("2006-01-02", input.ContractDate)
		if err != nil {
			return nil, err
		}
		contractDate = &t
	}

	// 2. 构建项目实体
	project := &models.Project{
		Name:           input.Name,
		Company:        input.Company,
		TotalAmount:    input.TotalAmount,
		Status:         input.Status,
		Type:           input.Type,
		ContractNumber: input.ContractNumber,
		ContractDate:   contractDate,
		PaymentMethod:  input.PaymentMethod,
		StartDate:      startDate,
		EndDate:        endDate,
		Description:    input.Description,
		UserID:         input.UserID,
	}

	// 3. 设置默认状态
	if project.Status == "" {
		project.Status = "active"
	}

	// 4. 持久化到数据库
	if err := s.projectRepo.Create(project); err != nil {
		return nil, err
	}

	return project, nil
}

// Update 更新项目详情
// 根据项目ID更新指定字段。
//
// 参数:
//   - id: 项目ID
//   - input: 更新请求DTO
//
// 返回:
//   - *models.Project: 更新后的项目实体
//   - error: 记录不存在或更新失败
func (s *ProjectService) Update(id int64, input dto.CreateProjectRequest) (*models.Project, error) {
	// 1. 检查是否存在
	project, err := s.projectRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	// 2. 解析日期字段
	startDate, err := time.Parse("2006-01-02", input.StartDate)
	if err != nil {
		return nil, err
	}
	endDate, err := time.Parse("2006-01-02", input.EndDate)
	if err != nil {
		return nil, err
	}
	var contractDate *time.Time
	if input.ContractDate != "" {
		t, err := time.Parse("2006-01-02", input.ContractDate)
		if err != nil {
			return nil, err
		}
		contractDate = &t
	}

	// 3. 更新实体字段
	project.Name = input.Name
	project.Company = input.Company
	project.TotalAmount = input.TotalAmount
	project.Status = input.Status
	project.Type = input.Type
	project.ContractNumber = input.ContractNumber
	project.ContractDate = contractDate
	project.PaymentMethod = input.PaymentMethod
	project.StartDate = startDate
	project.EndDate = endDate
	project.Description = input.Description

	// 4. 执行数据库更新
	if err := s.projectRepo.Update(project); err != nil {
		return nil, err
	}

	return project, nil
}

// Delete 删除项目及关联数据
// 这是一个事务操作，会同时删除项目本身及其下属的所有款项记录。
//
// 参数:
//   - id: 待删除的项目ID
//
// 返回:
//   - error: 事务执行错误
func (s *ProjectService) UpdateForUser(userID, id int64, input dto.CreateProjectRequest) (*models.Project, error) {
	project, err := s.projectRepo.FindByIDForUser(id, userID)
	if err != nil {
		return nil, err
	}

	startDate, err := time.Parse("2006-01-02", input.StartDate)
	if err != nil {
		return nil, err
	}
	endDate, err := time.Parse("2006-01-02", input.EndDate)
	if err != nil {
		return nil, err
	}
	var contractDate *time.Time
	if input.ContractDate != "" {
		t, err := time.Parse("2006-01-02", input.ContractDate)
		if err != nil {
			return nil, err
		}
		contractDate = &t
	}

	project.Name = input.Name
	project.Company = input.Company
	project.TotalAmount = input.TotalAmount
	project.Status = input.Status
	project.Type = input.Type
	project.ContractNumber = input.ContractNumber
	project.ContractDate = contractDate
	project.PaymentMethod = input.PaymentMethod
	project.StartDate = startDate
	project.EndDate = endDate
	project.Description = input.Description

	if err := s.projectRepo.Update(project); err != nil {
		return nil, err
	}

	return project, nil
}

func (s *ProjectService) Delete(id int64) error {
	return database.GetDB().Transaction(func(tx *gorm.DB) error {
		// 1. 级联删除: 先删除项目关联的所有款项 (Payments)
		if err := tx.Where("project_id = ?", id).Delete(&models.Payment{}).Error; err != nil {
			return err
		}
		// 2. 主体删除: 删除项目本身
		if err := tx.Delete(&models.Project{}, id).Error; err != nil {
			return err
		}
		return nil
	})
}

func (s *ProjectService) DeleteForUser(userID, id int64) error {
	return database.GetDB().Transaction(func(tx *gorm.DB) error {
		var project models.Project
		if err := tx.Where("id = ? AND user_id = ?", id, userID).First(&project).Error; err != nil {
			return err
		}
		if err := tx.Where("project_id = ?", id).Delete(&models.Payment{}).Error; err != nil {
			return err
		}
		return tx.Where("id = ? AND user_id = ?", id, userID).Delete(&models.Project{}).Error
	})
}

// Archive 归档项目
// 将项目状态更新为 "archived"，归档后的项目通常只读或不显示在主列表中。
func (s *ProjectService) Archive(id int64) error {
	return s.projectRepo.UpdateStatus(id, "archived")
}

func (s *ProjectService) ArchiveForUser(userID, id int64) error {
	if _, err := s.projectRepo.FindByIDForUser(id, userID); err != nil {
		return err
	}
	return s.projectRepo.UpdateStatusForUser(id, userID, "archived")
}

// CheckContractNumberExists 检查合同编号是否在库中已存在
//
// 参数:
//   - userID: 用户ID
//   - contractNumber: 待检查的合同编号
//   - excludeID: 排除的项目ID（更新项目时使用，排除因为自己导致的重复）
//
// 返回:
//   - bool: true表示存在(不可用)，false表示不存在(可用)
//   - error: 数据库查询错误
func (s *ProjectService) CheckContractNumberExists(userID int64, contractNumber string, excludeID int64) (bool, error) {
	return s.projectRepo.ExistsByContractNumber(userID, contractNumber, excludeID)
}

// GenerateNextContractNumber 生成智能建议合同编号
// 规则: HT + YYYYMMDD + 0001 (流水号)
//
// 逻辑:
//  1. 基于输入的日期构建前缀 (HT20260111)
//  2. 查找数据库中当天最大的流水号
//  3. 如果存在则+1，否则从 0001 开始
//
// 参数:
//   - userID: 保证用户间编号独立
//   - date: 基础日期字符串 "YYYY-MM-DD"
//
// 返回:
//   - string: 生成的合同编号
func (s *ProjectService) GenerateNextContractNumber(userID int64, date string) (string, error) {
	// 解析日期
	t, err := time.Parse("2006-01-02", date)
	if err != nil {
		return "", err
	}

	// 构造前缀: HT + YYYYMMDD
	prefix := "HT" + t.Format("20060102")

	var result string

	// 使用事务缩小读写窗口；SQLite 不支持 FOR UPDATE，其他数据库使用行锁降低并发竞态。
	err = database.GetDB().Transaction(func(tx *gorm.DB) error {
		var maxNumber string
		query := tx.Model(&models.Project{}).
			Where("user_id = ? AND contract_number LIKE ?", userID, prefix+"%").
			Order("contract_number DESC").
			Limit(1)
		if database.GetDBType() != "sqlite" {
			query = query.Clauses(clause.Locking{Strength: "UPDATE"})
		}
		if err := query.Pluck("contract_number", &maxNumber).Error; err != nil {
			return err
		}

		// 计算下一个序号
		nextSeq := 1
		if maxNumber != "" && len(maxNumber) >= len(prefix)+4 {
			// 提取现有最大编号的末尾4位作为序号
			seqStr := maxNumber[len(prefix):]
			var seq int
			if _, err := fmt.Sscanf(seqStr, "%d", &seq); err == nil {
				nextSeq = seq + 1
			}
		}

		// 格式化输出: 前缀 + 4位序号(补零)
		result = fmt.Sprintf("%s%04d", prefix, nextSeq)
		return nil
	})

	return result, err
}
