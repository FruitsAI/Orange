# 错误处理最佳实践

**版本**: 1.0  
**日期**: 2026-07-01  
**适用范围**: Orange 项目所有模块

---

## 目标

建立统一的错误处理规范，确保：
1. HTTP 状态码准确反映错误类型
2. 错误消息对用户友好且便于调试
3. 代码简洁，避免重复的错误处理逻辑
4. 结构化日志便于追踪和排查

---

## 架构概览

```
┌─────────────┐
│   Handler   │  → 处理 HTTP 请求，使用 HandleServiceError 统一处理错误
└──────┬──────┘
       │
┌──────▼──────┐
│   Service   │  → 业务逻辑层，返回预定义的业务错误类型
└──────┬──────┘
       │
┌──────▼──────┐
│ pkg/errors  │  → 错误类型定义和状态码映射
└─────────────┘
```

---

## Handler 层规范

### 基本模式

**统一使用 `HandleServiceError`**，替代所有 `InternalError` 调用：

```go
func (h *SomeHandler) SomeMethod(c *gin.Context) {
    // 1. 参数校验
    var req dto.SomeRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        response.ParamError(c, err.Error())  // 参数错误仍使用 ParamError
        return
    }

    // 2. 调用服务层
    result, err := h.service.SomeMethod(req)
    if err != nil {
        response.HandleServiceError(c, err, "默认错误消息")  // ✅ 使用统一处理
        return
    }

    // 3. 返回成功响应
    response.Success(c, result)
}
```

### ❌ 错误示例

```go
// 不要这样做
if err != nil {
    response.InternalError(c, "操作失败")  // ❌ 所有错误都返回500
    return
}

// 不要这样做
if err != nil {
    if err == gorm.ErrRecordNotFound {  // ❌ Handler层不应判断具体错误类型
        response.NotFound(c, "资源不存在")
        return
    }
    response.InternalError(c, err.Error())
    return
}
```

### ✅ 正确示例

```go
// 推荐做法
if err != nil {
    response.HandleServiceError(c, err, "操作失败")  // ✅ 自动映射状态码
    return
}
```

---

## Service 层规范

### 业务错误类型

使用预定义的业务错误（位于 `pkg/errors/errors.go`）：

```go
import pkgerrors "github.com/FruitsAI/Orange/internal/pkg/errors"

// 常用业务错误
var (
    ErrProjectNotFound     = New(404, "项目不存在")
    ErrContractDuplicate   = New(400, "合同编号已存在")
    ErrPaymentNotFound     = New(404, "款项不存在")
    ErrUserNotFound        = New(404, "用户不存在")
    ErrUsernameExists      = New(400, "用户名已存在")
    ErrEmailExists         = New(400, "邮箱已被注册")
)
```

### 错误处理模式

#### 1. 资源不存在 (404)

```go
func (s *ProjectService) GetForUser(userID, projectID int64) (*models.Project, error) {
    project, err := s.projectRepo.FindByID(projectID)
    if err != nil {
        if err == gorm.ErrRecordNotFound {
            return nil, pkgerrors.ErrProjectNotFound  // ✅ 返回404
        }
        return nil, pkgerrors.Wrap(err, "查询项目失败")  // ✅ 包装系统错误
    }
    return project, nil
}
```

#### 2. 重复数据 (400)

```go
func (s *ProjectService) Create(input dto.CreateProjectRequest) (*models.Project, error) {
    // 检查合同编号是否重复
    if s.projectRepo.ExistsByContractNumber(input.ContractNumber) {
        return nil, pkgerrors.ErrContractDuplicate  // ✅ 返回400
    }
    
    // 创建项目
    project := &models.Project{...}
    if err := s.projectRepo.Create(project); err != nil {
        return nil, pkgerrors.Wrap(err, "创建项目失败")
    }
    return project, nil
}
```

#### 3. 参数格式错误 (400)

```go
func (s *PaymentService) Create(input dto.PaymentRequest) (*models.Payment, error) {
    // 解析日期
    plannedDate, err := time.Parse("2006-01-02", input.PlannedDate)
    if err != nil {
        return nil, pkgerrors.WrapWithCode(err, 400, "计划日期格式错误")  // ✅ 包装为400错误
    }
    
    // ...
}
```

#### 4. 权限不足 (403)

```go
func (s *ProjectService) DeleteForUser(userID, projectID int64) error {
    project, err := s.projectRepo.FindByUserAndID(userID, projectID)
    if err != nil {
        if err == gorm.ErrRecordNotFound {
            return pkgerrors.ErrProjectNotFound  // ✅ 404: 项目不存在
        }
        return pkgerrors.Wrap(err, "查询项目失败")
    }
    
    // 权限检查由 FindByUserAndID 完成
    // 如果查到说明有权限，否则返回 404
    
    return s.projectRepo.Delete(projectID)
}
```

#### 5. 认证失败 (401)

```go
func (s *AuthService) Login(username, password string) (*dto.LoginResult, error) {
    // 查找用户
    user, err := s.userRepo.FindByCredential(username)
    if err != nil {
        if err == gorm.ErrRecordNotFound {
            return nil, pkgerrors.WrapWithCode(err, 401, "用户名或密码错误")  // ✅ 401
        }
        return nil, pkgerrors.Wrap(err, "查询用户失败")
    }
    
    // 验证密码
    if !password.CheckPassword(password, user.Password) {
        return nil, pkgerrors.New(401, "用户名或密码错误")  // ✅ 401
    }
    
    // 检查账户状态
    if user.Status != 1 {
        return nil, pkgerrors.New(403, "账户已被禁用")  // ✅ 403
    }
    
    // ...
}
```

---

## 错误类型选择指南

### HTTP 状态码映射

| 状态码 | 场景 | 使用方法 |
|--------|------|----------|
| **400 Bad Request** | 参数格式错误、数据重复、业务规则不满足 | `pkgerrors.New(400, msg)` 或 `pkgerrors.WrapWithCode(err, 400, msg)` |
| **401 Unauthorized** | 认证失败（用户名/密码错误） | `pkgerrors.New(401, "用户名或密码错误")` |
| **403 Forbidden** | 权限不足、账户禁用 | `pkgerrors.New(403, msg)` |
| **404 Not Found** | 资源不存在 | `pkgerrors.ErrProjectNotFound` 等预定义错误 |
| **409 Conflict** | 资源冲突（如合同编号重复） | `pkgerrors.ErrContractDuplicate` |
| **500 Internal Server Error** | 系统错误（数据库、第三方服务） | `pkgerrors.Wrap(err, msg)` |

### 决策流程图

```
错误发生
  │
  ├─ 是否资源不存在？
  │   └─ 是 → 返回预定义的 ErrXxxNotFound (404)
  │
  ├─ 是否数据重复？
  │   └─ 是 → 返回预定义的 ErrXxxExists (400)
  │
  ├─ 是否参数格式错误？
  │   └─ 是 → WrapWithCode(err, 400, "具体错误")
  │
  ├─ 是否权限不足？
  │   └─ 是 → New(403, "权限不足")
  │
  ├─ 是否认证失败？
  │   └─ 是 → New(401, "认证失败")
  │
  └─ 其他系统错误
      └─ Wrap(err, "操作失败")  → 默认500
```

---

## 错误消息规范

### 用户友好性

**❌ 不友好的错误消息**:
```go
return pkgerrors.New(500, "database error: constraint violation")
return pkgerrors.New(400, "invalid input")
```

**✅ 友好的错误消息**:
```go
return pkgerrors.ErrContractDuplicate  // "合同编号已存在"
return pkgerrors.WrapWithCode(err, 400, "计划日期格式错误，应为 YYYY-MM-DD")
```

### 消息编写原则

1. **使用中文**：面向国内用户
2. **具体明确**：说明哪里出错，而非泛泛的"操作失败"
3. **可操作**：提示用户如何修正
4. **不泄露敏感信息**：不暴露SQL、系统路径等

**示例对比**:

| 场景 | ❌ 错误消息 | ✅ 正确消息 |
|------|------------|------------|
| 合同编号重复 | "创建失败" | "合同编号已存在" |
| 日期格式错误 | "invalid date" | "计划日期格式错误，应为 YYYY-MM-DD" |
| 项目不存在 | "record not found" | "项目不存在" |
| 密码强度不足 | "bad password" | "密码长度至少8位，且包含大小写字母和数字" |

---

## 日志记录规范

### 结构化日志

错误应包含结构化字段，便于追踪：

```go
func (s *ProjectService) Create(input dto.CreateProjectRequest) (*models.Project, error) {
    if err := s.projectRepo.Create(project); err != nil {
        slog.Error("创建项目失败",
            "user_id", input.UserID,
            "contract_number", input.ContractNumber,
            "error", err,
        )
        return nil, pkgerrors.Wrap(err, "创建项目失败")
    }
    return project, nil
}
```

### 日志级别

- **Error**: 业务操作失败（数据库错误、第三方服务失败）
- **Warn**: 非关键操作失败（更新最后登录时间失败）
- **Info**: 关键业务事件（用户登录、项目创建）
- **Debug**: 调试信息（查询参数、中间结果）

---

## 新增业务错误类型

### 步骤

1. 在 `pkg/errors/errors.go` 中定义错误：

```go
var (
    ErrInvoiceNotFound = New(404, "发票不存在")
    ErrInvoiceDuplicate = New(400, "发票编号已存在")
)
```

2. 在 Service 层使用：

```go
func (s *InvoiceService) GetByID(id int64) (*models.Invoice, error) {
    invoice, err := s.repo.FindByID(id)
    if err != nil {
        if err == gorm.ErrRecordNotFound {
            return nil, pkgerrors.ErrInvoiceNotFound
        }
        return nil, pkgerrors.Wrap(err, "查询发票失败")
    }
    return invoice, nil
}
```

3. Handler 层自动映射，无需修改：

```go
func (h *InvoiceHandler) Get(c *gin.Context) {
    id, _ := response.ParseIDParam(c, "id")
    invoice, err := h.service.GetByID(id)
    if err != nil {
        response.HandleServiceError(c, err, "获取发票失败")  // 自动返回404
        return
    }
    response.Success(c, invoice)
}
```

---

## 常见错误处理场景

### 场景1: 创建资源

```go
func (s *ProjectService) Create(input dto.CreateProjectRequest) (*models.Project, error) {
    // 1. 检查重复
    if exists {
        return nil, pkgerrors.ErrContractDuplicate  // 400
    }
    
    // 2. 验证外键
    project, err := s.projectRepo.FindByID(input.ProjectID)
    if err != nil {
        if err == gorm.ErrRecordNotFound {
            return nil, pkgerrors.ErrProjectNotFound  // 404
        }
        return nil, pkgerrors.Wrap(err, "查询项目失败")  // 500
    }
    
    // 3. 创建资源
    resource := &models.Resource{...}
    if err := s.repo.Create(resource); err != nil {
        return nil, pkgerrors.Wrap(err, "创建资源失败")  // 500
    }
    
    return resource, nil
}
```

### 场景2: 更新资源

```go
func (s *ProjectService) Update(userID, id int64, input dto.UpdateProjectRequest) (*models.Project, error) {
    // 1. 检查资源是否存在 + 权限
    project, err := s.projectRepo.FindByUserAndID(userID, id)
    if err != nil {
        if err == gorm.ErrRecordNotFound {
            return nil, pkgerrors.ErrProjectNotFound  // 404
        }
        return nil, pkgerrors.Wrap(err, "查询项目失败")  // 500
    }
    
    // 2. 检查是否有冲突
    if input.ContractNumber != project.ContractNumber {
        if s.projectRepo.ExistsByContractNumber(input.ContractNumber) {
            return nil, pkgerrors.ErrContractDuplicate  // 400
        }
    }
    
    // 3. 执行更新
    if err := s.projectRepo.Update(project); err != nil {
        return nil, pkgerrors.Wrap(err, "更新项目失败")  // 500
    }
    
    return project, nil
}
```

### 场景3: 删除资源

```go
func (s *ProjectService) Delete(userID, id int64) error {
    // 1. 检查资源是否存在 + 权限
    _, err := s.projectRepo.FindByUserAndID(userID, id)
    if err != nil {
        if err == gorm.ErrRecordNotFound {
            return pkgerrors.ErrProjectNotFound  // 404
        }
        return pkgerrors.Wrap(err, "查询项目失败")  // 500
    }
    
    // 2. 执行删除（级联删除在数据库层处理）
    if err := s.projectRepo.Delete(id); err != nil {
        return pkgerrors.Wrap(err, "删除项目失败")  // 500
    }
    
    return nil
}
```

---

## 测试规范

### 单元测试中验证错误类型

```go
func TestProjectService_Create_ContractDuplicate(t *testing.T) {
    setupTestDB(t)
    svc := NewProjectService()
    
    // 创建第一个项目
    input1 := dto.CreateProjectRequest{
        ContractNumber: "HT-2024-001",
        // ...
    }
    _, err := svc.Create(input1)
    require.NoError(t, err)
    
    // 尝试创建重复合同编号
    input2 := dto.CreateProjectRequest{
        ContractNumber: "HT-2024-001",  // 重复
        // ...
    }
    _, err = svc.Create(input2)
    
    // 验证错误
    assert.Error(t, err)
    assert.Contains(t, err.Error(), "合同编号已存在")
    
    // 验证状态码（如果错误包含状态码信息）
    var appErr *pkgerrors.AppError
    if errors.As(err, &appErr) {
        assert.Equal(t, 400, appErr.Code)
    }
}
```

---

## 迁移指南

### 对于现有代码

1. **Handler 层**：将所有 `response.InternalError` 替换为 `response.HandleServiceError`
2. **Service 层**：
   - 将 `errors.New("xxx")` 替换为预定义的业务错误
   - 将 `gorm.ErrRecordNotFound` 判断移到 Service 层
3. **测试**：验证返回的状态码是否正确

### 迁移示例

**Before**:
```go
// Handler
if err != nil {
    response.InternalError(c, "操作失败")
    return
}

// Service
if err == gorm.ErrRecordNotFound {
    return nil, errors.New("项目不存在")
}
return nil, err
```

**After**:
```go
// Handler
if err != nil {
    response.HandleServiceError(c, err, "操作失败")
    return
}

// Service
if err == gorm.ErrRecordNotFound {
    return nil, pkgerrors.ErrProjectNotFound
}
return nil, pkgerrors.Wrap(err, "查询项目失败")
```

---

## 附录

### pkg/errors 包 API

```go
// 创建新错误
func New(code int, message string) error

// 包装系统错误（保留原错误链）
func Wrap(err error, message string) error

// 包装并指定状态码
func WrapWithCode(err error, code int, message string) error

// 预定义的业务错误
var (
    ErrProjectNotFound     = New(404, "项目不存在")
    ErrPaymentNotFound     = New(404, "款项不存在")
    ErrContractDuplicate   = New(400, "合同编号已存在")
    ErrUserNotFound        = New(404, "用户不存在")
    ErrUsernameExists      = New(400, "用户名已存在")
    ErrEmailExists         = New(400, "邮箱已被注册")
)
```

### response 包 API

```go
// 统一错误处理（推荐）
func HandleServiceError(c *gin.Context, err error, defaultMsg string)

// 参数错误（400）
func ParamError(c *gin.Context, message string)

// 成功响应
func Success(c *gin.Context, data interface{})
func SuccessWithMessage(c *gin.Context, message string, data interface{})
func SuccessPage(c *gin.Context, list interface{}, total int64, page, pageSize int)
```

---

## 参考资料

- [HTTP 状态码规范](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Status)
- [Go 错误处理最佳实践](https://go.dev/blog/error-handling-and-go)
- [结构化日志指南](https://pkg.go.dev/log/slog)

---

**文档维护**: 开发团队  
**最后更新**: 2026-07-01
