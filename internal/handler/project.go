package handler

import (
	"strconv"

	"github.com/FruitsAI/Orange/internal/dto"
	"github.com/FruitsAI/Orange/internal/pkg/response"
	"github.com/FruitsAI/Orange/internal/service"
	"github.com/gin-gonic/gin"
)

// ProjectHandler 项目管理模块接口处理器
// 负责处理项目的增删改查、归档及相关辅助功能(如合同编号生成)的请求。
type ProjectHandler struct {
	projectService *service.ProjectService
}

// NewProjectHandler 创建项目处理器实例
func NewProjectHandler() *ProjectHandler {
	return &ProjectHandler{
		projectService: service.NewProjectService(),
	}
}

// List 获取项目列表
// @Summary 获取项目列表
// @Description 分页查询项目，支持按状态(status)和关键词(keyword)搜索
// @Tags Project
// @Security Bearer
// @Param page query int false "页码" default(1)
// @Param page_size query int false "每页数量" default(10)
// @Param status query string false "项目状态: pending, processing, completed, archived"
// @Param keyword query string false "搜索关键词: 项目名称或合同编号"
// @Success 200 {object} response.PageResult
// @Router /api/v1/projects [get]
func (h *ProjectHandler) List(c *gin.Context) {
	userID := c.GetInt64("user_id")
	status := c.Query("status")
	keyword := c.Query("keyword")
	page, pageSize := response.GetPagination(c)

	result, err := h.projectService.List(userID, status, keyword, page, pageSize)
	if err != nil {
		response.InternalError(c, "获取项目列表失败")
		return
	}

	response.SuccessPage(c, result.List, result.Total, result.Page, result.PageSize)
}

// Get 获取项目详情
// @Summary 项目详情
// @Description 根据项目ID获取详细信息
// @Tags Project
// @Security Bearer
// @Param id path int true "项目ID"
// @Success 200 {object} models.Project
// @Router /api/v1/projects/{id} [get]
func (h *ProjectHandler) Get(c *gin.Context) {
	userID := c.GetInt64("user_id")
	id, err := response.ParseIDParam(c, "id")
	if err != nil {
		response.ParamError(c, "无效的项目ID")
		return
	}

	project, err := h.projectService.GetForUser(userID, id)
	if err != nil {
		response.HandleServiceError(c, err, "查询项目失败")
		return
	}

	response.Success(c, project)
}

// Create 创建新项目
// @Summary 创建项目
// @Description 创建一个新的项目记录
// @Tags Project
// @Security Bearer
// @Param project body dto.CreateProjectRequest true "项目信息"
// @Success 200 {object} models.Project
// @Router /api/v1/projects [post]
func (h *ProjectHandler) Create(c *gin.Context) {
	userID := c.GetInt64("user_id")

	var req dto.CreateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, err.Error())
		return
	}

	req.UserID = userID // 手动设置 UserID

	project, err := h.projectService.Create(req)
	if err != nil {
		response.HandleServiceError(c, err, "创建项目失败")
		return
	}

	response.Success(c, project)
}

// Update 更新项目
// @Summary 更新项目
// @Description 更新项目的基础信息、状态或合同金额
// @Tags Project
// @Security Bearer
// @Param id path int true "项目ID"
// @Param project body dto.CreateProjectRequest true "更新信息"
// @Success 200 {object} models.Project
// @Router /api/v1/projects/{id} [put]
func (h *ProjectHandler) Update(c *gin.Context) {
	userID := c.GetInt64("user_id")
	id, err := response.ParseIDParam(c, "id")
	if err != nil {
		response.ParamError(c, "无效的项目ID")
		return
	}

	var req dto.CreateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, err.Error())
		return
	}

	project, err := h.projectService.UpdateForUser(userID, id, req)
	if err != nil {
		response.HandleServiceError(c, err, "更新项目失败")
		return
	}

	response.Success(c, project)
}

// Delete 删除项目
// @Summary 删除项目
// @Description 软删除或硬删除项目记录(视Repo实现而定)，通常会级联删除关联款项
// @Tags Project
// @Security Bearer
// @Param id path int true "项目ID"
// @Success 200 {string} string "删除成功"
// @Router /api/v1/projects/{id} [delete]
func (h *ProjectHandler) Delete(c *gin.Context) {
	userID := c.GetInt64("user_id")
	id, err := response.ParseIDParam(c, "id")
	if err != nil {
		response.ParamError(c, "无效的项目ID")
		return
	}

	if err := h.projectService.DeleteForUser(userID, id); err != nil {
		response.HandleServiceError(c, err, "删除项目失败")
		return
	}

	response.SuccessWithMessage(c, "删除成功", nil)
}

// Archive 归档项目
// @Summary 归档项目
// @Description 将项目标记为已归档，不再在常规列表中显示
// @Tags Project
// @Security Bearer
// @Param id path int true "项目ID"
// @Success 200 {string} string "归档成功"
// @Router /api/v1/projects/{id}/archive [post]
func (h *ProjectHandler) Archive(c *gin.Context) {
	userID := c.GetInt64("user_id")
	id, err := response.ParseIDParam(c, "id")
	if err != nil {
		response.ParamError(c, "无效的项目ID")
		return
	}

	if err := h.projectService.ArchiveForUser(userID, id); err != nil {
		response.InternalError(c, "归档项目失败")
		return
	}

	response.SuccessWithMessage(c, "归档成功", nil)
}

// CheckContractNumber 检查合同编号是否可用
// @Summary 检查合同号唯一性
// @Description 检查输入的合同编号是否已被其他项目使用
// @Tags Project
// @Security Bearer
// @Param contract_number query string true "待检查的合同编号"
// @Param exclude_id query int false "排除的项目ID(编辑时使用)"
// @Success 200 {object} map[string]bool
// @Router /api/v1/projects/check-contract-number [get]
func (h *ProjectHandler) CheckContractNumber(c *gin.Context) {
	userID := c.GetInt64("user_id")
	contractNumber := c.Query("contract_number")
	if contractNumber == "" {
		response.ParamError(c, "合同编号不能为空")
		return
	}

	excludeID, err := strconv.ParseInt(c.DefaultQuery("exclude_id", "0"), 10, 64)
	if err != nil {
		excludeID = 0
	}

	exists, err := h.projectService.CheckContractNumberExists(userID, contractNumber, excludeID)
	if err != nil {
		response.InternalError(c, "检查合同编号失败")
		return
	}

	response.Success(c, gin.H{"exists": exists})
}

// GenerateContractNumber 生成建议合同编号
// @Summary 生成合同编号
// @Description 根据日期生成格式为 HTYYYYMMDDXXXX 的智能建议编号
// @Tags Project
// @Security Bearer
// @Param date query string true "项目日期 (YYYY-MM-DD)"
// @Success 200 {object} map[string]string
// @Router /api/v1/projects/generate-contract-number [get]
func (h *ProjectHandler) GenerateContractNumber(c *gin.Context) {
	userID := c.GetInt64("user_id")
	date := c.Query("date")
	if date == "" {
		response.ParamError(c, "日期不能为空")
		return
	}

	contractNumber, err := h.projectService.GenerateNextContractNumber(userID, date)
	if err != nil {
		response.InternalError(c, "生成合同编号失败")
		return
	}

	response.Success(c, gin.H{"contract_number": contractNumber})
}
