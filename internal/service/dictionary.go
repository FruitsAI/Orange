package service

import (
	"encoding/json"
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
	if cached, err := cache.Get(cacheKey); err == nil {
		if json.Unmarshal(cached, &result) == nil {
			return result, nil
		}
		// Unmarshal 失败说明缓存数据损坏，主动删除
		_ = cache.Delete(cacheKey)
	}

	result, err := s.dictRepo.List()
	if err != nil {
		return nil, err
	}
	if data, err := json.Marshal(result); err == nil {
		_ = cache.Set(cacheKey, data, 5*time.Minute)
	} else {
		log.Printf("Failed to marshal dictionary list for cache: %v", err)
	}
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
	if cached, err := cache.Get(cacheKey); err == nil {
		if json.Unmarshal(cached, &result) == nil {
			return result, nil
		}
		// Unmarshal 失败说明缓存数据损坏，主动删除
		_ = cache.Delete(cacheKey)
	}

	result, err := s.dictRepo.GetItemsByCode(code)
	if err != nil {
		return nil, err
	}
	if data, err := json.Marshal(result); err == nil {
		_ = cache.Set(cacheKey, data, 5*time.Minute)
	} else {
		log.Printf("Failed to marshal dictionary items for cache: %v", err)
	}
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

	// 缓存失效 - 记录失败但不阻止主流程
	if err := cache.Delete(fmt.Sprintf("dict:items:v1:%s", code)); err != nil {
		log.Printf("Failed to invalidate dict:items cache: %v", err)
	}
	if err := cache.Delete("dict:list:v1"); err != nil {
		log.Printf("Failed to invalidate dict:list cache: %v", err)
	}

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

func (s *DictionaryService) invalidateItemCache(dictID int64) {
	// 使用 FindByID 直接查询，避免全表扫描
	dict, err := s.dictRepo.FindByID(dictID)
	if err != nil {
		log.Printf("Failed to find dictionary for cache invalidation (dictID=%d): %v", dictID, err)
		return
	}

	if err := cache.Delete(fmt.Sprintf("dict:items:v1:%s", dict.Code)); err != nil {
		log.Printf("Failed to invalidate dict:items cache: %v", err)
	}
	if err := cache.Delete("dict:list:v1"); err != nil {
		log.Printf("Failed to invalidate dict:list cache: %v", err)
	}
}
