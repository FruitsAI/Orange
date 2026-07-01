package handler

import (
	"strconv"

	"github.com/FruitsAI/Orange/internal/constants"
	"github.com/FruitsAI/Orange/internal/dto"
	"github.com/FruitsAI/Orange/internal/pkg/response"
	"github.com/FruitsAI/Orange/internal/service"
	"github.com/gin-gonic/gin"
)

// DictionaryHandler 字典模块接口处理器
// 负责处理数据字典及其选项的增删改查 HTTP 请求。
type DictionaryHandler struct {
	dictService *service.DictionaryService
}

// NewDictionaryHandler 创建字典处理器实例
func NewDictionaryHandler() *DictionaryHandler {
	return &DictionaryHandler{
		dictService: service.NewDictionaryService(),
	}
}

// List 获取所有字典定义
// @Summary 获取字典列表
// @Description 获取系统中所有可用的字典类型定义
// @Tags Dictionary
// @Security Bearer
// @Success 200 {array} models.Dictionary
// @Router /api/v1/dictionaries [get]
func (h *DictionaryHandler) List(c *gin.Context) {
	dictionaries, err := h.dictService.List()
	if err != nil {
		response.HandleServiceError(c, err, "获取字典列表失败")
		return
	}

	response.Success(c, dictionaries)
}

// GetItems 获取指定字典的所有选项
// @Summary 获取字典选项列表
// @Description 根据字典编码(Code)获取其下属的所有选项
// @Tags Dictionary
// @Security Bearer
// @Param code path string true "字典编码 (如 project_status)"
// @Success 200 {array} models.DictionaryItem
// @Router /api/v1/dictionaries/{code}/items [get]
func (h *DictionaryHandler) GetItems(c *gin.Context) {
	code := c.Param("code")

	items, err := h.dictService.GetItems(code)
	if err != nil {
		response.HandleServiceError(c, err, "获取字典选项失败")
		return
	}

	response.Success(c, items)
}

// CreateItem 新增字典选项
// @Summary 创建字典项
// @Description 为指定字典添加一个新的选项值(仅限管理员)
// @Tags Dictionary
// @Security Bearer
// @Param code path string true "字典编码"
// @Param item body dto.CreateDictionaryItemRequest true "字典项参数"
// @Success 200 {object} models.DictionaryItem
// @Failure 403 {string} string "无权操作"
// @Router /api/v1/dictionaries/{code}/items [post]
func (h *DictionaryHandler) CreateItem(c *gin.Context) {
	// 1. 权限校验
	if c.GetString("role") != constants.RoleAdmin {
		response.Forbidden(c, "无权操作")
		return
	}
	code := c.Param("code")

	// 2. 参数绑定
	var req dto.CreateDictionaryItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, err.Error())
		return
	}

	// 3. 执行创建
	item, err := h.dictService.CreateItem(code, req.Label, req.Value, req.Sort)
	if err != nil {
		response.HandleServiceError(c, err, "创建字典项失败")
		return
	}

	response.Success(c, item)
}

// UpdateItem 更新字典选项
// @Summary 更新字典项
// @Description 更新现有字典选项的名称、值或排序(仅限管理员)
// @Tags Dictionary
// @Security Bearer
// @Param code path string true "字典编码 (仅作路由占位)"
// @Param id path int true "字典项ID"
// @Param item body dto.CreateDictionaryItemRequest true "更新参数"
// @Success 200 {object} models.DictionaryItem
// @Failure 403 {string} string "无权操作"
// @Router /api/v1/dictionaries/{code}/items/{id} [put]
func (h *DictionaryHandler) UpdateItem(c *gin.Context) {
	// 1. 权限校验
	if c.GetString("role") != constants.RoleAdmin {
		response.Forbidden(c, "无权操作")
		return
	}

	// 2. ID解析
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.ParamError(c, "无效的字典项ID")
		return
	}

	// 3. 参数绑定
	var req dto.CreateDictionaryItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, err.Error())
		return
	}

	// 4. 执行更新
	item, err := h.dictService.UpdateItem(id, req.Label, req.Value, req.Sort)
	if err != nil {
		response.HandleServiceError(c, err, "更新字典项失败")
		return
	}

	response.Success(c, item)
}

// DeleteItem 删除字典选项
// @Summary 删除字典项
// @Description 物理删除指定的字典选项(仅限管理员)
// @Tags Dictionary
// @Security Bearer
// @Param code path string true "字典编码 (仅作路由占位)"
// @Param id path int true "字典项ID"
// @Success 200 {string} string "删除成功"
// @Failure 403 {string} string "无权操作"
// @Router /api/v1/dictionaries/{code}/items/{id} [delete]
func (h *DictionaryHandler) DeleteItem(c *gin.Context) {
	if c.GetString("role") != constants.RoleAdmin {
		response.Forbidden(c, "无权操作")
		return
	}
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.ParamError(c, "无效的字典项ID")
		return
	}

	if err := h.dictService.DeleteItem(id); err != nil {
		response.HandleServiceError(c, err, "删除字典项失败")
		return
	}

	response.SuccessWithMessage(c, "删除成功", nil)
}
