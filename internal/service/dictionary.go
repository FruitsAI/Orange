package service

import (
	"fmt"
	"log"
	"time"

	"github.com/FruitsAI/Orange/internal/models"
	"github.com/FruitsAI/Orange/internal/pkg/cache"
	"github.com/FruitsAI/Orange/internal/repository"
)

// DictionaryService 数据字典服务
// 提供通用字典数据的查询和维护功能，支持字典项的增删改查。
type DictionaryService struct {
	dictRepo *repository.DictionaryRepository
}

// NewDictionaryService 创建字典服务实例
func NewDictionaryService() *DictionaryService {
	return &DictionaryService{
		dictRepo: repository.NewDictionaryRepository(),
	}
}

// List 获取所有字典定义列表
// 返回系统中定义的所有字典类型。
func (s *DictionaryService) List() ([]models.Dictionary, error) {
	cacheKey := "dict:list:v1"
	var result []models.Dictionary

	// 尝试从缓存读取
	if err := cache.GetJSON(cacheKey, &result); err == nil {
		return result, nil
	}

	// 缓存未命中，从数据库查询
	result, err := s.dictRepo.List()
	if err != nil {
		return nil, err
	}

	// 写入缓存
	_ = cache.SetJSON(cacheKey, result, 5*time.Minute)
	return result, nil
}

// GetItems 根据字典编码获取对应的字典项列表
// 用于前端下拉框等选择组件的数据源。
//
// 参数:
//   - code: 字典编码 (如 "project_status")
//
// 返回:
//   - []models.DictionaryItem: 按 sort 排序的字典项列表
func (s *DictionaryService) GetItems(code string) ([]models.DictionaryItem, error) {
	cacheKey := fmt.Sprintf("dict:items:v1:%s", code)
	var result []models.DictionaryItem

	// 尝试从缓存读取
	if err := cache.GetJSON(cacheKey, &result); err == nil {
		return result, nil
	}

	// 缓存未命中，从数据库查询
	result, err := s.dictRepo.GetItemsByCode(code)
	if err != nil {
		return nil, err
	}

	// 写入缓存
	_ = cache.SetJSON(cacheKey, result, 5*time.Minute)
	return result, nil
}

// CreateItem 为指定字典创建新选项
//
// 参数:
//   - code: 字典编码 (确定归属哪个字典)
//   - label: 显示名称
//   - value: 数据值
//   - sort: 排序权重 (越小越靠前)
//
// 返回:
//   - *models.DictionaryItem: 创建的字典项
func (s *DictionaryService) CreateItem(code, label, value string, sort int) (*models.DictionaryItem, error) {
	// 1. 查找父级字典
	dict, err := s.dictRepo.FindByCode(code)
	if err != nil {
		return nil, err
	}

	// 2. 构建实体
	item := &models.DictionaryItem{
		DictionaryID: dict.ID,
		Label:        label,
		Value:        value,
		Sort:         sort,
		Status:       1, // 默认启用
	}

	// 3. 写入数据库
	if err := s.dictRepo.CreateItem(item); err != nil {
		return nil, err
	}

	invalidateDictCache(code)

	return item, nil
}

// UpdateItem 更新字典项信息
//
// 参数:
//   - id: 字典项ID
//   - label: 新的显示名称
//   - value: 新的数据值
//   - sort: 新的排序权重
//
// 返回:
//   - *models.DictionaryItem: 更新后的实体
func (s *DictionaryService) UpdateItem(id int64, label, value string, sort int) (*models.DictionaryItem, error) {
	// 1. 获取现有记录 (确保ID存在且保留DictionaryID等字段)
	item, err := s.dictRepo.FindItemByID(id)
	if err != nil {
		return nil, err
	}

	// 2. 更新字段
	item.Label = label
	item.Value = value
	item.Sort = sort

	// 3. 执行更新
	if err := s.dictRepo.UpdateItem(item); err != nil {
		return nil, err
	}

	s.invalidateItemCache(item.DictionaryID)

	return item, nil
}

// DeleteItem 删除指定字典项
func (s *DictionaryService) DeleteItem(id int64) error {
	item, err := s.dictRepo.FindItemByID(id)
	if err != nil {
		return err
	}
	if err := s.dictRepo.DeleteItem(id); err != nil {
		return err
	}
	s.invalidateItemCache(item.DictionaryID)
	return nil
}

// invalidateItemCache 依据字典ID清除相关缓存
// 先查出字典编码以精确清除选项缓存；查询失败时至少清除列表缓存兜底。
func (s *DictionaryService) invalidateItemCache(dictID int64) {
	dict, err := s.dictRepo.FindByID(dictID)
	if err != nil {
		log.Printf("Failed to find dictionary for cache invalidation (dictID=%d): %v", dictID, err)
		if err := cache.Delete("dict:list:v1"); err != nil {
			log.Printf("Failed to invalidate dict:list cache (fallback): %v", err)
		}
		return
	}

	invalidateDictCache(dict.Code)
}

// invalidateDictCache 清除指定编码字典的选项缓存与字典列表缓存
// 失效失败仅记录日志，不阻断主流程（缓存有 TTL 兜底）。
func invalidateDictCache(code string) {
	if err := cache.Delete(fmt.Sprintf("dict:items:v1:%s", code)); err != nil {
		log.Printf("Failed to invalidate dict:items cache: %v", err)
	}
	if err := cache.Delete("dict:list:v1"); err != nil {
		log.Printf("Failed to invalidate dict:list cache: %v", err)
	}
}
