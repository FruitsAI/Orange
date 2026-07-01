package repository

import "gorm.io/gorm"

// UserScope GORM作用域：按用户ID过滤数据
//
// 用于实现多租户数据隔离，确保每个用户只能访问自己的数据。
// 当 userID > 0 时，自动添加 "user_id = ?" 条件；
// 当 userID = 0 时，不添加过滤条件（管理员查询全局数据场景）。
//
// 使用示例:
//
//	// 查询某个用户的项目列表
//	var projects []models.Project
//	db.Scopes(UserScope(userID)).Find(&projects)
//
//	// 查询某个用户的特定项目
//	var project models.Project
//	db.Scopes(UserScope(userID)).First(&project, projectID)
//
//	// 管理员查询所有项目（userID=0）
//	db.Scopes(UserScope(0)).Find(&projects)
//
// 参数:
//   - userID: 用户ID，0表示不过滤（管理员模式）
//
// 返回:
//   - func(*gorm.DB) *gorm.DB: GORM Scope函数
func UserScope(userID int64) func(db *gorm.DB) *gorm.DB {
	return func(db *gorm.DB) *gorm.DB {
		if userID > 0 {
			return db.Where("user_id = ?", userID)
		}
		return db
	}
}
