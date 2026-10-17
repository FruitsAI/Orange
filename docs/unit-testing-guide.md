# 单元测试编写指南

**版本**: 1.0  
**日期**: 2026-07-01  
**适用范围**: Orange 项目所有模块

---

## 目标

建立统一的单元测试规范，确保：
1. 测试覆盖核心业务逻辑
2. 测试稳定可重复执行
3. 测试易于维护和扩展
4. 测试执行速度快

---

## 测试框架

使用 Go 官方测试框架 + testify 断言库：

```go
import (
    "testing"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)
```

- **`require`**: 断言失败时立即终止测试（用于前置条件）
- **`assert`**: 断言失败时记录错误但继续执行（用于结果验证）

---

## 测试文件组织

### 文件命名

每个 Service 对应一个测试文件：

```
internal/service/
├── user_service.go
├── user_service_test.go      # UserService 的测试
├── auth.go
├── auth_service_test.go       # AuthService 的测试
├── payment.go
└── payment_service_test.go    # PaymentService 的测试
```

### 测试数据库初始化

使用 `sync.Once` 确保测试数据库只初始化一次：

```go
var testDBOnce sync.Once

func setupTestDB(t *testing.T) {
    t.Helper()  // 标记为辅助函数，错误时报告调用者位置
    
    testDBOnce.Do(func() {
        config.AppConfig = &config.Config{
            DBType: "sqlite",
            DBPath: "file:test?mode=memory&cache=shared",  // 内存数据库
        }
        
        db := database.GetDB()
        require.NoError(t, db.AutoMigrate(&models.User{}, &models.Project{}))
    })
}
```

**要点**:
- 使用 SQLite 内存数据库（`:memory:` 或 `file:name?mode=memory`）
- `cache=shared` 允许多个连接共享同一数据库
- 每个测试文件使用独立的数据库名（避免冲突）

---

## 测试结构

### 基本模式

使用 `t.Run` 组织子测试：

```go
func TestUserService_CreateUser(t *testing.T) {
    setupTestDB(t)
    svc := NewUserService()
    
    t.Run("成功创建用户", func(t *testing.T) {
        // 1. 准备测试数据
        req := dto.CreateUserRequest{
            Username: "testuser",
            Password: "Test1234",
            Email:    "test@example.com",
        }
        
        // 2. 执行业务逻辑
        err := svc.CreateUser(req)
        
        // 3. 验证结果
        require.NoError(t, err)
        
        // 4. 验证副作用
        user, _ := svc.userRepo.FindByCredential("testuser")
        assert.Equal(t, "testuser", user.Username)
    })
    
    t.Run("用户名重复应报错", func(t *testing.T) {
        // ... 测试错误场景
    })
}
```

### 测试命名规范

**函数名**: `Test<Service>_<Method>`

```go
func TestUserService_CreateUser(t *testing.T)
func TestAuthService_Login(t *testing.T)
func TestPaymentService_ConfirmPayment(t *testing.T)
```

**子测试名**: 中文描述预期行为

```go
t.Run("成功创建用户", ...)
t.Run("用户名重复应报错", ...)
t.Run("密码强度不足应报错", ...)
```

---

## 测试覆盖场景

### 核心场景

每个 Service 方法至少测试：

1. **正常流程**: 验证成功场景
2. **边界条件**: 空值、极值、边界值
3. **错误场景**: 参数错误、数据冲突、权限不足
4. **业务规则**: 状态转换、金额同步、级联操作

### 示例：UserService.CreateUser

```go
func TestUserService_CreateUser(t *testing.T) {
    setupTestDB(t)
    svc := NewUserService()
    
    // 1. 正常流程
    t.Run("成功创建用户", func(t *testing.T) {
        req := dto.CreateUserRequest{
            Username: "testuser1",
            Password: "Test1234",
            Email:    "test1@example.com",
        }
        
        err := svc.CreateUser(req)
        require.NoError(t, err)
        
        // 验证用户已创建
        user, _ := svc.userRepo.FindByCredential("testuser1")
        assert.Equal(t, "testuser1", user.Username)
        assert.Equal(t, "test1@example.com", user.Email)
    })
    
    // 2. 错误场景：数据冲突
    t.Run("用户名重复应报错", func(t *testing.T) {
        req := dto.CreateUserRequest{
            Username: "testuser1",  // 与上一个测试重复
            Password: "Test1234",
            Email:    "test2@example.com",
        }
        
        err := svc.CreateUser(req)
        assert.Error(t, err)
        assert.Contains(t, err.Error(), "用户名已存在")
    })
    
    // 3. 业务规则：密码强度
    t.Run("密码强度不足应报错", func(t *testing.T) {
        req := dto.CreateUserRequest{
            Username: "testuser2",
            Password: "123",  // 不满足强度要求
            Email:    "test3@example.com",
        }
        
        err := svc.CreateUser(req)
        assert.Error(t, err)
        assert.Contains(t, err.Error(), "密码长度至少8位")
    })
}
```

---

## 测试数据管理

### 测试数据隔离

每个子测试使用独立的测试数据：

```go
t.Run("测试A", func(t *testing.T) {
    // 创建测试用户1
    user1 := &models.User{Username: "user1", ...}
    svc.userRepo.Create(user1)
    
    // 测试...
})

t.Run("测试B", func(t *testing.T) {
    // 创建测试用户2（不依赖测试A）
    user2 := &models.User{Username: "user2", ...}
    svc.userRepo.Create(user2)
    
    // 测试...
})
```

**避免测试间依赖**，确保测试可独立运行。

### 辅助函数

提取通用的测试数据创建逻辑：

```go
// createTestProject 创建测试项目
func createTestProject(t *testing.T, userID int64, contractNumber string) *models.Project {
    t.Helper()
    db := database.GetDB()
    
    project := &models.Project{
        UserID:         userID,
        Name:           "测试项目",
        ContractNumber: contractNumber,
        TotalAmount:    100000,
        Status:         constants.ProjectStatusOngoing,
        // ...
    }
    err := db.Create(project).Error
    require.NoError(t, err)
    return project
}

// 使用
project := createTestProject(t, userID, "HT-2024-001")
```

### 密码处理

对于需要密码加密的测试：

```go
// mustHashPassword 测试辅助函数
func mustHashPassword(pwd string) string {
    hash, err := password.HashPassword(pwd)
    if err != nil {
        panic(err)
    }
    return hash
}

// 使用
user := &models.User{
    Username: "testuser",
    Password: mustHashPassword("Test1234"),
    // ...
}
```

---

## 断言技巧

### require vs assert

```go
// ❌ 错误用法
user, err := svc.GetUser(id)
assert.NoError(t, err)           // 断言失败但继续执行
assert.Equal(t, "john", user.Name)  // user 可能为 nil，panic！

// ✅ 正确用法
user, err := svc.GetUser(id)
require.NoError(t, err)          // 失败时立即终止
assert.Equal(t, "john", user.Name)  // 安全执行
```

**规则**: 前置条件用 `require`，结果验证用 `assert`。

### 常用断言

```go
// 相等性
assert.Equal(t, expected, actual)
assert.NotEqual(t, value1, value2)

// 错误
assert.NoError(t, err)
assert.Error(t, err)
assert.Contains(t, err.Error(), "用户名已存在")

// 空值
assert.Nil(t, obj)
assert.NotNil(t, obj)
assert.Empty(t, list)
assert.NotEmpty(t, list)

// 布尔
assert.True(t, condition)
assert.False(t, condition)

// 长度
assert.Len(t, list, 3)
```

### 错误消息验证

```go
// 验证错误类型
err := svc.CreateUser(req)
assert.Error(t, err)
assert.Contains(t, err.Error(), "用户名已存在")

// 验证错误状态码（如果错误包含状态码）
var appErr *pkgerrors.AppError
if errors.As(err, &appErr) {
    assert.Equal(t, 400, appErr.Code)
}
```

---

## 测试事务和并发

### 事务测试

验证事务回滚：

```go
func TestPaymentService_ConfirmPayment_Transaction(t *testing.T) {
    setupTestDB(t)
    svc := NewPaymentService()
    
    // 准备数据
    project := createTestProject(t, userID, "HT-001")
    payment := createTestPayment(t, project.ID, 30000)
    
    t.Run("确认失败应回滚", func(t *testing.T) {
        // 模拟确认失败（如传入无效日期）
        err := svc.ConfirmForUser(userID, payment.ID, "invalid-date", "")
        assert.Error(t, err)
        
        // 验证项目金额未变化
        updatedProject, _ := projectSvc.GetForUser(userID, project.ID)
        assert.Equal(t, float64(0), updatedProject.ReceivedAmount)
    })
}
```

### 并发测试

验证并发安全性：

```go
func TestPaymentService_ConcurrentConfirm(t *testing.T) {
    setupTestDB(t)
    svc := NewPaymentService()
    
    project := createTestProject(t, userID, "HT-001")
    payment1 := createTestPayment(t, project.ID, 30000)
    payment2 := createTestPayment(t, project.ID, 20000)
    
    t.Run("并发确认多个款项", func(t *testing.T) {
        var wg sync.WaitGroup
        wg.Add(2)
        
        go func() {
            defer wg.Done()
            svc.ConfirmForUser(userID, payment1.ID, "2024-01-01", "")
        }()
        
        go func() {
            defer wg.Done()
            svc.ConfirmForUser(userID, payment2.ID, "2024-01-02", "")
        }()
        
        wg.Wait()
        
        // 验证项目金额正确
        updatedProject, _ := projectSvc.GetForUser(userID, project.ID)
        assert.Equal(t, float64(50000), updatedProject.ReceivedAmount)
    })
}
```

---

## 测试命令

### 运行测试

```bash
# 运行所有测试
go test ./internal/service

# 运行特定测试
go test ./internal/service -run TestUserService

# 运行特定子测试
go test ./internal/service -run TestUserService_CreateUser/成功创建用户

# 显示详细输出
go test ./internal/service -v

# 查看覆盖率
go test ./internal/service -cover

# 生成覆盖率报告
go test ./internal/service -coverprofile=coverage.out
go tool cover -html=coverage.out
```

### 调试测试

```bash
# 打印日志
go test ./internal/service -v -run TestUserService

# 设置超时
go test ./internal/service -timeout 30s

# 禁用缓存
go test ./internal/service -count=1
```

---

## 最佳实践

### 1. 测试独立性

**✅ 正确**:
```go
func TestUserService_CreateUser(t *testing.T) {
    t.Run("测试A", func(t *testing.T) {
        // 创建独立的测试数据
        user1 := createTestUser(t, "user1")
        // 测试...
    })
    
    t.Run("测试B", func(t *testing.T) {
        // 创建独立的测试数据
        user2 := createTestUser(t, "user2")
        // 测试...
    })
}
```

**❌ 错误**:
```go
func TestUserService_CreateUser(t *testing.T) {
    user := createTestUser(t, "user1")  // 共享数据
    
    t.Run("测试A", func(t *testing.T) {
        // 修改 user
        user.Name = "新名称"
    })
    
    t.Run("测试B", func(t *testing.T) {
        // 依赖测试A的修改 - 错误！
        assert.Equal(t, "新名称", user.Name)
    })
}
```

### 2. 测试命名清晰

**✅ 正确**:
```go
t.Run("成功创建用户", ...)
t.Run("用户名重复应报错", ...)
t.Run("密码强度不足应报错", ...)
```

**❌ 错误**:
```go
t.Run("test1", ...)
t.Run("error_case", ...)
t.Run("边界条件", ...)  // 不够具体
```

### 3. 测试覆盖核心逻辑

**优先测试**:
- 创建/更新/删除操作
- 业务规则（金额同步、状态转换）
- 权限校验
- 数据验证

**可选测试**:
- 查询操作（除非有复杂逻辑）
- Getter/Setter
- 简单的工具函数

### 4. 测试执行速度

- 使用内存数据库（SQLite `:memory:`）
- 避免不必要的 `time.Sleep`
- 控制测试数据量（足够验证即可）
- 并行运行独立测试（`t.Parallel()`，谨慎使用）

### 5. 测试可维护性

- 提取通用的辅助函数
- 使用常量而非魔法值
- 避免测试代码重复
- 测试失败时提供清晰的错误信息

---

## 测试模板

### Service 测试模板

```go
package service

import (
    "sync"
    "testing"
    
    "github.com/FruitsAI/Orange/internal/config"
    "github.com/FruitsAI/Orange/internal/database"
    "github.com/FruitsAI/Orange/internal/dto"
    "github.com/FruitsAI/Orange/internal/models"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

var xxxTestDBOnce sync.Once

func setupXxxTestDB(t *testing.T) {
    t.Helper()
    
    xxxTestDBOnce.Do(func() {
        config.AppConfig = &config.Config{
            DBType: "sqlite",
            DBPath: "file:xxx_test?mode=memory&cache=shared",
        }
        
        db := database.GetDB()
        require.NoError(t, db.AutoMigrate(&models.Xxx))
    })
}

func TestXxxService_Method(t *testing.T) {
    setupXxxTestDB(t)
    svc := NewXxxService()
    
    t.Run("成功场景", func(t *testing.T) {
        // 准备测试数据
        req := dto.XxxRequest{...}
        
        // 执行业务逻辑
        result, err := svc.Method(req)
        
        // 验证结果
        require.NoError(t, err)
        assert.Equal(t, expected, result)
    })
    
    t.Run("错误场景", func(t *testing.T) {
        // 准备测试数据
        req := dto.XxxRequest{...}
        
        // 执行业务逻辑
        _, err := svc.Method(req)
        
        // 验证错误
        assert.Error(t, err)
        assert.Contains(t, err.Error(), "预期错误消息")
    })
}
```

---

## 附录

### 常见问题

**Q: 测试数据库中的数据会持久化吗？**
A: 不会。使用 `mode=memory` 的内存数据库，进程退出后数据自动清除。

**Q: 如何清理测试数据？**
A: 使用内存数据库无需清理。如果使用文件数据库，在 `TestMain` 中清理：

```go
func TestMain(m *testing.M) {
    code := m.Run()
    os.Remove("test.db")
    os.Exit(code)
}
```

**Q: 测试之间如何共享数据库连接？**
A: 使用 `sync.Once` 确保数据库只初始化一次，连接自动复用。

**Q: 如何测试需要时间延迟的逻辑？**
A: 避免使用 `time.Sleep`，而是：
1. 注入时间依赖（`timeProvider` 接口）
2. 使用 mock 时间
3. 调整业务逻辑使其可测试

---

**文档维护**: 开发团队  
**最后更新**: 2026-07-01
