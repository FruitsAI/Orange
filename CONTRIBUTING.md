# Orange 项目贡献指南

感谢你考虑为 Orange 项目做出贡献！🎉

## 📋 目录

- [行为准则](#行为准则)
- [如何贡献](#如何贡献)
- [开发流程](#开发流程)
- [代码规范](#代码规范)
- [提交规范](#提交规范)
- [测试要求](#测试要求)
- [Pull Request 流程](#pull-request-流程)

---

## 行为准则

本项目采用贡献者公约作为行为准则。参与此项目即表示你同意遵守其条款。请阅读 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) 了解详情。

---

## 如何贡献

### 报告 Bug

如果你发现了 bug，请通过 [GitHub Issues](https://github.com/FruitsAI/Orange/issues) 提交报告。

**Bug 报告应包含：**

1. **清晰的标题**：简洁描述问题
2. **复现步骤**：详细的步骤让我们能重现问题
3. **预期行为**：你期望发生什么
4. **实际行为**：实际发生了什么
5. **环境信息**：
   - 操作系统（Windows/Linux/macOS）
   - Go 版本
   - Orange 版本
6. **截图**：如果适用，添加截图帮助解释问题
7. **日志**：相关的错误日志

### 提出新功能

如果你有新功能的想法，欢迎创建 Issue 讨论。

**功能请求应包含：**

1. **功能描述**：清晰详细的功能说明
2. **使用场景**：为什么需要这个功能
3. **实现建议**：如果有想法，可以提供实现建议
4. **替代方案**：是否考虑过其他解决方案

---

## 开发流程

### 1. Fork 并克隆仓库

```bash
# Fork 后克隆你的仓库
git clone https://github.com/YOUR_USERNAME/Orange.git
cd Orange

# 添加上游仓库
git remote add upstream https://github.com/FruitsAI/Orange.git
```

### 2. 创建分支

```bash
# 从 main 创建新分支
git checkout -b feature/your-feature-name
# 或
git checkout -b fix/your-bug-fix
```

**分支命名规范：**
- `feature/` - 新功能
- `fix/` - Bug 修复
- `refactor/` - 代码重构
- `docs/` - 文档更新
- `test/` - 测试相关

### 3. 开发和测试

```bash
# 安装依赖
go mod download
cd frontend && npm install

# 运行测试
go test ./...

# 代码检查
go vet ./...
golangci-lint run

# 构建验证
go build
```

### 4. 提交更改

```bash
git add .
git commit -m "feat: 添加新功能描述"
```

### 5. 推送并创建 PR

```bash
git push origin feature/your-feature-name
```

然后在 GitHub 上创建 Pull Request。

---

## 代码规范

### Go 代码规范

1. **遵循 Go 官方规范**
   - 使用 `gofmt` 格式化代码
   - 遵循 [Effective Go](https://golang.org/doc/effective_go)
   - 使用 `go vet` 检查代码

2. **命名规范**
   ```go
   // ✅ 好的命名
   type UserService struct {}
   func (s *UserService) GetUserByID(id int64) (*User, error) {}
   
   // ❌ 避免的命名
   type user_service struct {}  // 使用下划线
   func (s *UserService) get(id int64) {}  // 导出公共方法
   ```

3. **注释规范**
   ```go
   // GetUserByID 根据ID获取用户信息
   // 参数：
   //   - id: 用户ID
   // 返回：
   //   - *User: 用户信息
   //   - error: 错误信息
   func (s *UserService) GetUserByID(id int64) (*User, error) {
       // 实现...
   }
   ```

4. **错误处理**
   ```go
   // ✅ 正确的错误处理
   if err != nil {
       return fmt.Errorf("failed to get user: %w", err)
   }
   
   // ❌ 不要忽略错误
   data, _ := ioutil.ReadAll(r)  // 危险！
   ```

5. **代码组织**
   - 包名使用小写单词，不使用下划线
   - 文件名使用小写单词，可用下划线分隔
   - 按功能模块组织代码结构

### 前端代码规范（Vue 3 + TypeScript）

1. **TypeScript 类型定义**
   ```typescript
   // ✅ 定义明确的接口
   interface User {
     id: number
     username: string
     email: string
   }
   
   // ❌ 避免 any
   const user: any = {}
   ```

2. **组件命名**
   ```vue
   <!-- 使用 PascalCase -->
   <template>
     <UserCard :user="currentUser" />
   </template>
   
   <script setup lang="ts">
   // 组件名使用 PascalCase
   import UserCard from '@/components/UserCard.vue'
   </script>
   ```

3. **Composition API**
   ```vue
   <script setup lang="ts">
   import { ref, computed } from 'vue'
   
   // 使用 Composition API
   const count = ref(0)
   const doubled = computed(() => count.value * 2)
   </script>
   ```

---

## 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范。

### 提交消息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 类型（type）

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式调整（不影响功能）
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建/工具相关
- `perf`: 性能优化
- `ci`: CI/CD 相关

### 示例

```bash
# 新功能
feat: 添加用户头像上传功能

# Bug 修复
fix(auth): 修复登录 Token 过期未正确处理的问题

# 文档
docs: 更新部署指南中的 Docker 配置说明

# 重构
refactor(service): 优化支付确认事务逻辑

# 测试
test: 添加 AuthService 单元测试
```

---

## 测试要求

### 单元测试

- 新增功能**必须**包含单元测试
- Bug 修复**应该**包含回归测试
- 测试覆盖率**应达到** 70% 以上

### 测试规范

```go
func TestPasswordStrength(t *testing.T) {
    tests := []struct {
        name     string
        password string
        wantErr  bool
    }{
        {"强密码", "MyP@ssw0rd", false},
        {"太短", "abc123", true},
        {"无复杂度", "abcdefgh", true},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            err := validatePasswordStrength(tt.password)
            if tt.wantErr {
                assert.Error(t, err)
            } else {
                assert.NoError(t, err)
            }
        })
    }
}
```

### 运行测试

```bash
# 运行所有测试
go test ./...

# 运行特定包的测试
go test ./internal/service

# 运行测试并生成覆盖率报告
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

---

## Pull Request 流程

### PR 检查清单

在提交 PR 之前，请确保：

- [ ] 代码遵循项目代码规范
- [ ] 所有测试通过
- [ ] 新功能有相应的测试
- [ ] 文档已更新（如有必要）
- [ ] 提交消息符合规范
- [ ] 分支从最新的 `main` 创建

### PR 标题格式

```
<type>(<scope>): <description>
```

示例：
- `feat(user): 添加用户头像上传功能`
- `fix(auth): 修复登录 Token 过期问题`
- `docs: 更新部署指南`

### PR 审查流程

1. **自动检查**：CI 自动运行测试和代码检查
2. **代码审查**：维护者会审查你的代码
3. **讨论修改**：根据反馈进行调整
4. **合并**：审查通过后合并到 main 分支

### CI 检查

每个 PR 都会自动运行以下检查：

- ✅ 单元测试
- ✅ 代码格式检查（go vet, golangci-lint）
- ✅ 安全扫描（gosec）
- ✅ 构建验证

---

## 获取帮助

如果你有任何问题，可以：

1. 查看 [文档](./docs)
2. 搜索 [Issues](https://github.com/FruitsAI/Orange/issues)
3. 创建新的 Issue 提问

---

## 许可证

通过贡献代码，你同意你的代码将根据项目的 MIT 许可证进行授权。

---

感谢你的贡献！🙏