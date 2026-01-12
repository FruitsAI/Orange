package repository

import (
	"github.com/FruitsAI/Orange/internal/database"
	"github.com/FruitsAI/Orange/internal/models"
	"gorm.io/gorm"
)

// UserRepository 用户数据仓库
type UserRepository struct {
	db *gorm.DB
}

// NewUserRepository 创建用户仓库
func NewUserRepository() *UserRepository {
	return &UserRepository{db: database.GetDB()}
}

// FindByID 根据ID查找用户
func (r *UserRepository) FindByID(id int64) (*models.User, error) {
	var user models.User
	if err := r.db.First(&user, id).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

// FindByUsername 根据用户名查找用户
func (r *UserRepository) FindByUsername(username string) (*models.User, error) {
	var user models.User
	if err := r.db.Where("username = ?", username).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

// FindByCredential 根据唯一凭证查找用户
// 支持通过 用户名(username)、邮箱(email) 或 手机号(phone) 进行统一登录查询。
func (r *UserRepository) FindByCredential(credential string) (*models.User, error) {
	var user models.User
	// 组合 OR 查询条件
	if err := r.db.Where("username = ? OR email = ? OR phone = ?",
		credential, credential, credential).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

// FindByEmail 根据邮箱查找用户
func (r *UserRepository) FindByEmail(email string) (*models.User, error) {
	var user models.User
	if err := r.db.Where("email = ?", email).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

// ExistsByUsername 检查用户名是否存在
func (r *UserRepository) ExistsByUsername(username string) bool {
	var count int64
	r.db.Model(&models.User{}).Where("username = ?", username).Count(&count)
	return count > 0
}

// ExistsByEmail 检查邮箱是否存在
func (r *UserRepository) ExistsByEmail(email string) bool {
	var count int64
	r.db.Model(&models.User{}).Where("email = ?", email).Count(&count)
	return count > 0
}

// Create 创建用户
func (r *UserRepository) Create(user *models.User) error {
	return r.db.Create(user).Error
}

// Update 更新用户
func (r *UserRepository) Update(user *models.User) error {
	return r.db.Save(user).Error
}

// UpdateFields 动态更新指定字段
// fields 参数为 map[string]interface{}，仅更新 map 中包含的字段。
// 适用于部分更新场景（如仅更新头像、仅修改密码）。
func (r *UserRepository) UpdateFields(id int64, fields map[string]interface{}) error {
	return r.db.Model(&models.User{}).Where("id = ?", id).Updates(fields).Error
}

// List 获取用户列表 (支持分页和搜索)
func (r *UserRepository) List(page, pageSize int, keyword string) ([]models.User, int64, error) {
	var users []models.User
	var total int64
	offset := (page - 1) * pageSize

	query := r.db.Model(&models.User{})
	if keyword != "" {
		likePattern := "%" + keyword + "%"
		query = query.Where("username LIKE ? OR name LIKE ? OR email LIKE ? OR phone LIKE ?",
			likePattern, likePattern, likePattern, likePattern)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := query.Offset(offset).Limit(pageSize).Order("id DESC").Find(&users).Error; err != nil {
		return nil, 0, err
	}

	return users, total, nil
}

// Delete 删除用户
func (r *UserRepository) Delete(id int64) error {
	return r.db.Delete(&models.User{}, id).Error
}
