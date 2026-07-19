package repository

import (
	"github.com/FruitsAI/Orange/internal/database"
	"github.com/FruitsAI/Orange/internal/models"
	"gorm.io/gorm"
)

// DictionaryRepository 字典数据仓库
// 封装了对 `dictionaries` 和 `dictionary_items` 表的所有数据库操作。
type DictionaryRepository struct {
	db *gorm.DB
}

// NewDictionaryRepository 创建字典仓库实例
func NewDictionaryRepository() *DictionaryRepository {
	return &DictionaryRepository{db: database.GetDB()}
}

// List 查询所有启用的字典类型
func (r *DictionaryRepository) List() ([]models.Dictionary, error) {
	var dictionaries []models.Dictionary
	if err := r.db.Where("status = ?", 1).Find(&dictionaries).Error; err != nil {
		return nil, err
	}
	return dictionaries, nil
}

// FindByID 根据主键ID查找字典类型
func (r *DictionaryRepository) FindByID(id int64) (*models.Dictionary, error) {
	var dict models.Dictionary
	if err := r.db.First(&dict, id).Error; err != nil {
		return nil, err
	}
	return &dict, nil
}

// FindByCode 根据唯一编码查找字典类型
func (r *DictionaryRepository) FindByCode(code string) (*models.Dictionary, error) {
	var dict models.Dictionary
	if err := r.db.Where("code = ?", code).First(&dict).Error; err != nil {
		return nil, err
	}
	return &dict, nil
}

// FindItemByID 根据主键ID查找字典项
func (r *DictionaryRepository) FindItemByID(id int64) (*models.DictionaryItem, error) {
	var item models.DictionaryItem
	if err := r.db.First(&item, id).Error; err != nil {
		return nil, err
	}
	return &item, nil
}

// GetItems 获取指定字典ID下的所有字典项（按 Sort 升序排列）
func (r *DictionaryRepository) GetItems(dictID int64) ([]models.DictionaryItem, error) {
	var items []models.DictionaryItem
	if err := r.db.Where("dictionary_id = ? AND status = ?", dictID, 1).
		Order("sort ASC").
		Find(&items).Error; err != nil {
		return nil, err
	}
	return items, nil
}

// GetItemsByCode 根据字典编码直接查找其下的字典项
// 这是一个便捷方法，内部会先查字典ID再查项。
func (r *DictionaryRepository) GetItemsByCode(code string) ([]models.DictionaryItem, error) {
	dict, err := r.FindByCode(code)
	if err != nil {
		return nil, err
	}
	return r.GetItems(dict.ID)
}

// CreateItem 创建字典项
func (r *DictionaryRepository) CreateItem(item *models.DictionaryItem) error {
	return r.db.Create(item).Error
}

// UpdateItem 更新字典项
func (r *DictionaryRepository) UpdateItem(item *models.DictionaryItem) error {
	return r.db.Save(item).Error
}

// DeleteItem 删除字典项
func (r *DictionaryRepository) DeleteItem(id int64) error {
	return r.db.Delete(&models.DictionaryItem{}, id).Error
}
