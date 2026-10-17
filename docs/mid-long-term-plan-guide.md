# Orange 项目中长期改进计划执行指南

**版本**: 1.0  
**日期**: 2026-07-01  
**当前状态**: 短期计划 100% 完成，进入中期阶段

---

## 执行概览

### 已完成 (短期计划)
- ✅ 应用新错误处理机制 (26个接口)
- ✅ 补充核心单元测试 (24+测试)
- ✅ 代码规范与文档 (3个文档)

### 进行中 (中期计划)
根据实际情况，中期计划的"渐进式迁移"在短期计划执行中已大部分完成：

**阶段1: 高频API迁移** - ✅ 已完成
- ✅ 项目管理相关 (Project CRUD) - commit a83d1b8
- ✅ 款项管理相关 (Payment CRUD) - commit a83d1b8
- ✅ 用户管理相关 (User CRUD) - commit e1684c5

**阶段2: 中频API迁移** - ✅ 已完成
- ✅ 通知管理接口 - commit 861e4c6
- ⏳ Dashboard 统计接口 - 待检查
- ⏳ 数据字典接口 - 待检查

**阶段3: 低频API迁移** - ⏳ 待处理
- ⏳ 文件上传接口
- ⏳ 系统配置接口
- ⏳ 日志查询接口

---

## 中期计划详细执行方案

### 任务1: 完成剩余API迁移 (预计2-3天)

#### 1.1 Dashboard 统计接口检查与迁移

**当前文件**: `internal/handler/dashboard.go`

**需要检查的接口**:
- GetStatistics: 获取统计数据
- GetUpcomingPayments: 获取即将到期款项
- GetRecentProjects: 获取最近项目

**迁移步骤**:
1. 检查是否已使用 `HandleServiceError`
2. 如果使用 `InternalError`，替换为 `HandleServiceError`
3. 确保 Service 层返回业务错误类型
4. 运行测试验证

**验收标准**:
- [ ] 所有接口使用 `HandleServiceError`
- [ ] 编译通过
- [ ] 现有测试通过

#### 1.2 数据字典接口检查与迁移

**当前文件**: `internal/handler/dictionary.go`

**需要检查的接口**:
- List: 获取字典列表
- Get: 获取字典详情
- Create/Update/Delete: 字典管理

**迁移步骤**:
1. 检查错误处理方式
2. 迁移到统一错误处理
3. 添加单元测试（如果缺失）

**验收标准**:
- [ ] 统一错误处理
- [ ] 补充单元测试

#### 1.3 低频API迁移

**文件清单**:
- `internal/handler/system.go`: 系统配置接口
- `internal/handler/sync.go`: 数据同步接口
- `internal/handler/token.go`: Token管理

**迁移优先级**: 低（影响范围小）

**建议**: 在有实际需求或修改时再迁移

---

### 任务2: 集成测试补充 (预计4-5天)

#### 2.1 项目-款项联动测试

**测试文件**: `internal/integration/project_payment_test.go`

**测试场景**:

```go
// TestProjectPaymentIntegration 项目款项集成测试
func TestProjectPaymentIntegration(t *testing.T) {
    setupIntegrationTestDB(t)
    
    t.Run("完整业务流程", func(t *testing.T) {
        // 1. 创建项目
        project := createProject(合同金额: 100000)
        assert.Equal(t, 0, project.ReceivedAmount)
        
        // 2. 添加款项
        payment1 := createPayment(project.ID, 金额: 30000)
        payment2 := createPayment(project.ID, 金额: 20000)
        
        // 3. 确认款项
        confirmPayment(payment1.ID)
        
        // 4. 验证项目金额
        updatedProject := getProject(project.ID)
        assert.Equal(t, 30000, updatedProject.ReceivedAmount)
        
        // 5. 确认第二笔
        confirmPayment(payment2.ID)
        updatedProject = getProject(project.ID)
        assert.Equal(t, 50000, updatedProject.ReceivedAmount)
        
        // 6. 删除款项
        deletePayment(payment1.ID)
        updatedProject = getProject(project.ID)
        assert.Equal(t, 20000, updatedProject.ReceivedAmount)
    })
    
    t.Run("删除项目应级联删除款项", func(t *testing.T) {
        project := createProject()
        payment := createPayment(project.ID)
        
        deleteProject(project.ID)
        
        // 验证款项也被删除
        _, err := getPayment(payment.ID)
        assert.Error(t, err)
    })
}
```

**实现步骤**:
1. 创建 `internal/integration` 目录
2. 编写集成测试
3. 使用独立的测试数据库
4. 确保测试可重复执行

#### 2.2 权限隔离测试

**测试场景**:

```go
func TestPermissionIsolation(t *testing.T) {
    t.Run("用户A创建的项目，用户B无法访问", func(t *testing.T) {
        userA := createUser("userA")
        userB := createUser("userB")
        
        project := createProjectAsUser(userA.ID)
        
        _, err := getProjectAsUser(userB.ID, project.ID)
        assert.Error(t, err)
        assert.Contains(t, err.Error(), "项目不存在")
    })
    
    t.Run("用户A创建的款项，用户B无法确认", func(t *testing.T) {
        userA := createUser("userA")
        userB := createUser("userB")
        
        project := createProjectAsUser(userA.ID)
        payment := createPaymentAsUser(userA.ID, project.ID)
        
        err := confirmPaymentAsUser(userB.ID, payment.ID)
        assert.Error(t, err)
    })
}
```

#### 2.3 数据一致性测试

**测试场景**:

```go
func TestDataConsistency(t *testing.T) {
    t.Run("并发创建款项，项目金额正确", func(t *testing.T) {
        project := createProject(合同金额: 100000)
        
        var wg sync.WaitGroup
        paymentIDs := make([]int64, 5)
        
        // 并发创建5笔款项
        for i := 0; i < 5; i++ {
            wg.Add(1)
            go func(idx int) {
                defer wg.Done()
                payment := createPayment(project.ID, 金额: 10000)
                paymentIDs[idx] = payment.ID
            }(i)
        }
        wg.Wait()
        
        // 并发确认款项
        for _, id := range paymentIDs {
            wg.Add(1)
            go func(paymentID int64) {
                defer wg.Done()
                confirmPayment(paymentID)
            }(id)
        }
        wg.Wait()
        
        // 验证项目金额
        updatedProject := getProject(project.ID)
        assert.Equal(t, 50000, updatedProject.ReceivedAmount)
    })
    
    t.Run("事务回滚场景", func(t *testing.T) {
        project := createProject()
        payment := createPayment(project.ID, 金额: 30000)
        
        // 模拟确认失败（如无效日期）
        err := confirmPaymentWithInvalidDate(payment.ID)
        assert.Error(t, err)
        
        // 验证项目金额未变化
        updatedProject := getProject(project.ID)
        assert.Equal(t, 0, updatedProject.ReceivedAmount)
    })
}
```

---

### 任务3: 性能优化 (预计1周)

#### 3.1 数据库查询优化

**3.1.1 识别 N+1 查询问题**

**检查清单**:

```bash
# 查找可能的N+1问题
grep -r "\.Find" internal/repository/*.go
grep -r "range.*Find" internal/service/*.go
```

**常见场景**:
- 列表查询后循环查询关联数据
- Dashboard 统计查询

**优化方案**:

```go
// ❌ N+1 查询
func (s *ProjectService) ListWithPayments(userID int64) ([]ProjectWithPayments, error) {
    projects, _ := s.projectRepo.ListByUser(userID)
    
    for i, project := range projects {
        payments, _ := s.paymentRepo.ListByProject(project.ID)  // N+1!
        projects[i].Payments = payments
    }
    return projects, nil
}

// ✅ 使用 Preload
func (r *ProjectRepository) ListWithPayments(userID int64) ([]models.Project, error) {
    var projects []models.Project
    err := r.db.Preload("Payments").
        Where("user_id = ?", userID).
        Find(&projects).Error
    return projects, err
}
```

**3.1.2 添加必要索引**

**索引建议**:

```sql
-- 用户ID索引（如果没有）
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);

-- 状态索引
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_payments_status ON payments(status);

-- 日期范围查询索引
CREATE INDEX idx_payments_plan_date ON payments(plan_date);
CREATE INDEX idx_payments_actual_date ON payments(actual_date);

-- 组合索引
CREATE INDEX idx_projects_user_status ON projects(user_id, status);
CREATE INDEX idx_payments_project_status ON payments(project_id, status);
```

**实施步骤**:
1. 分析慢查询日志
2. 使用 `EXPLAIN` 分析查询计划
3. 添加索引（通过迁移脚本）
4. 验证性能提升

**3.1.3 优化 Dashboard 统计 SQL**

**当前问题**: 多次查询

```go
// ❌ 多次查询
func (s *DashboardService) GetStatistics(userID int64) (*Statistics, error) {
    totalProjects, _ := s.projectRepo.CountByUser(userID)
    ongoingProjects, _ := s.projectRepo.CountByUserAndStatus(userID, "ongoing")
    completedProjects, _ := s.projectRepo.CountByUserAndStatus(userID, "completed")
    // ...
}
```

**优化方案**: 单次查询

```go
// ✅ 单次查询
func (r *ProjectRepository) GetStatistics(userID int64) (*Statistics, error) {
    var stats Statistics
    err := r.db.Model(&models.Project{}).
        Select(`
            COUNT(*) as total_projects,
            SUM(CASE WHEN status = 'ongoing' THEN 1 ELSE 0 END) as ongoing_projects,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_projects,
            SUM(total_amount) as total_amount,
            SUM(received_amount) as received_amount
        `).
        Where("user_id = ?", userID).
        Scan(&stats).Error
    return &stats, err
}
```

#### 3.2 缓存机制引入

**前置条件**: 需要 Redis

**3.2.1 字典数据缓存**

```go
// 字典缓存（很少变化）
func (s *DictionaryService) GetAll() ([]models.Dictionary, error) {
    cacheKey := "dictionary:all"
    
    // 1. 尝试从缓存获取
    cached, err := s.cache.Get(cacheKey)
    if err == nil {
        var dicts []models.Dictionary
        json.Unmarshal(cached, &dicts)
        return dicts, nil
    }
    
    // 2. 从数据库查询
    dicts, err := s.repo.FindAll()
    if err != nil {
        return nil, err
    }
    
    // 3. 写入缓存
    data, _ := json.Marshal(dicts)
    s.cache.Set(cacheKey, data, 24*time.Hour)
    
    return dicts, nil
}
```

**3.2.2 用户信息缓存**

```go
// 用户缓存（较少变化）
func (s *UserService) GetByID(id int64) (*models.User, error) {
    cacheKey := fmt.Sprintf("user:%d", id)
    
    // 缓存策略：5分钟
    cached, err := s.cache.Get(cacheKey)
    if err == nil {
        var user models.User
        json.Unmarshal(cached, &user)
        return &user, nil
    }
    
    user, err := s.repo.FindByID(id)
    if err != nil {
        return nil, err
    }
    
    data, _ := json.Marshal(user)
    s.cache.Set(cacheKey, data, 5*time.Minute)
    
    return user, nil
}

// 更新用户时清除缓存
func (s *UserService) Update(id int64, input dto.UpdateUserRequest) error {
    err := s.repo.Update(id, input)
    if err != nil {
        return err
    }
    
    // 清除缓存
    cacheKey := fmt.Sprintf("user:%d", id)
    s.cache.Delete(cacheKey)
    
    return nil
}
```

**3.2.3 Dashboard 统计缓存**

```go
// Dashboard缓存（短期缓存）
func (s *DashboardService) GetStatistics(userID int64) (*Statistics, error) {
    cacheKey := fmt.Sprintf("dashboard:stats:%d", userID)
    
    // 缓存1分钟
    cached, err := s.cache.Get(cacheKey)
    if err == nil {
        var stats Statistics
        json.Unmarshal(cached, &stats)
        return &stats, nil
    }
    
    stats, err := s.calculateStatistics(userID)
    if err != nil {
        return nil, err
    }
    
    data, _ := json.Marshal(stats)
    s.cache.Set(cacheKey, data, 1*time.Minute)
    
    return stats, nil
}
```

#### 3.3 API 响应时间优化

**3.3.1 分页查询限制**

```go
// 限制最大分页大小
func GetPagination(c *gin.Context) (int, int) {
    page := c.DefaultQuery("page", "1")
    pageSize := c.DefaultQuery("page_size", "10")
    
    pageInt, _ := strconv.Atoi(page)
    pageSizeInt, _ := strconv.Atoi(pageSize)
    
    if pageInt < 1 {
        pageInt = 1
    }
    if pageSizeInt < 1 {
        pageSizeInt = 10
    }
    if pageSizeInt > 100 {  // ✅ 最大100条
        pageSizeInt = 100
    }
    
    return pageInt, pageSizeInt
}
```

**3.3.2 字段裁剪**

```go
// 列表查询时只返回必要字段
func (r *ProjectRepository) ListSummary(userID int64, page, pageSize int) ([]ProjectSummary, error) {
    var projects []ProjectSummary
    err := r.db.Model(&models.Project{}).
        Select("id, name, contract_number, status, total_amount, received_amount").  // ✅ 只查询必要字段
        Where("user_id = ?", userID).
        Offset((page - 1) * pageSize).
        Limit(pageSize).
        Find(&projects).Error
    return projects, err
}
```

**3.3.3 GZIP 压缩**

```go
// 在 main.go 中添加 GZIP 中间件
import "github.com/gin-contrib/gzip"

func main() {
    r := gin.Default()
    
    // 添加 GZIP 压缩
    r.Use(gzip.Gzip(gzip.DefaultCompression))
    
    // ...
}
```

---

## 长期计划执行方案

### 任务1: 监控与告警 (预计2-3周)

#### 1.1 应用监控

**技术选型**: Prometheus + Grafana

**实施步骤**:

1. **集成 Prometheus**:

```go
// 安装依赖
// go get github.com/prometheus/client_golang/prometheus
// go get github.com/prometheus/client_golang/prometheus/promhttp

// 在 main.go 中添加
import (
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

// 定义指标
var (
    httpRequestsTotal = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "http_requests_total",
            Help: "Total number of HTTP requests",
        },
        []string{"method", "path", "status"},
    )
    
    httpRequestDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "http_request_duration_seconds",
            Help:    "HTTP request duration in seconds",
            Buckets: prometheus.DefBuckets,
        },
        []string{"method", "path"},
    )
)

func init() {
    prometheus.MustRegister(httpRequestsTotal)
    prometheus.MustRegister(httpRequestDuration)
}

// 添加中间件
func PrometheusMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        start := time.Now()
        
        c.Next()
        
        duration := time.Since(start).Seconds()
        status := strconv.Itoa(c.Writer.Status())
        
        httpRequestsTotal.WithLabelValues(c.Request.Method, c.Request.URL.Path, status).Inc()
        httpRequestDuration.WithLabelValues(c.Request.Method, c.Request.URL.Path).Observe(duration)
    }
}

// 暴露指标端点
r.GET("/metrics", gin.WrapH(promhttp.Handler()))
```

2. **配置 Prometheus**:

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'orange-api'
    static_configs:
      - targets: ['localhost:8080']
```

3. **配置 Grafana Dashboard**:
   - QPS (Queries Per Second)
   - 响应时间 (P50, P90, P99)
   - 错误率
   - 活跃连接数

#### 1.2 日志聚合

**技术选型**: Loki (轻量级) 或 ELK Stack (功能完整)

**使用 Loki 的简化方案**:

```yaml
# docker-compose.yml
version: '3'
services:
  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
  
  promtail:
    image: grafana/promtail:latest
    volumes:
      - ./logs:/var/log
      - ./promtail-config.yml:/etc/promtail/config.yml
```

#### 1.3 告警规则

```yaml
# alert.rules.yml
groups:
  - name: api_alerts
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 2m
        annotations:
          summary: "High error rate detected"
      
      - alert: SlowResponse
        expr: histogram_quantile(0.99, http_request_duration_seconds) > 1
        for: 5m
        annotations:
          summary: "API response time too slow"
```

---

### 任务2: 自动化测试流水线 (预计1-2周)

#### 2.1 GitHub Actions 配置

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Go
        uses: actions/setup-go@v4
        with:
          go-version: '1.21'
      
      - name: Run tests
        run: |
          go test -v -race -coverprofile=coverage.out ./...
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage.out
      
      - name: Lint
        run: |
          go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
          golangci-lint run
```

#### 2.2 Pre-commit Hooks

```yaml
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: go-test
        name: Run tests
        entry: go test ./...
        language: system
        pass_filenames: false
      
      - id: go-fmt
        name: Format code
        entry: gofmt -w
        language: system
        types: [go]
```

---

### 任务3: 性能基准测试 (预计3-5天)

#### 3.1 基准测试代码

```go
// internal/service/project_service_benchmark_test.go
func BenchmarkProjectService_Create(b *testing.B) {
    setupTestDB(b)
    svc := NewProjectService()
    
    req := dto.CreateProjectRequest{
        Name: "Benchmark Project",
        ContractNumber: "BM-001",
        // ...
    }
    
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        svc.Create(req)
    }
}

func BenchmarkProjectService_List(b *testing.B) {
    // ...
}
```

#### 3.2 压力测试

使用 `wrk` 或 `vegeta` 进行 API 压力测试：

```bash
# 安装 vegeta
go install github.com/tsenart/vegeta@latest

# 压力测试
echo "GET http://localhost:8080/api/v1/projects" | \
  vegeta attack -duration=30s -rate=100 | \
  vegeta report
```

---

## 优先级建议

根据投入产出比，建议按以下优先级执行：

### 高优先级 (立即执行)
1. ✅ **完成剩余API迁移** (Dashboard, Dictionary)
   - 工作量: 2-3天
   - 收益: 统一错误处理，完整性

2. ✅ **数据库查询优化**
   - 工作量: 3-5天
   - 收益: 性能提升明显

### 中优先级 (1-2周内)
3. **集成测试补充**
   - 工作量: 4-5天
   - 收益: 保障核心业务逻辑

4. **缓存机制引入**
   - 工作量: 3-5天
   - 收益: Dashboard响应速度提升

### 低优先级 (按需执行)
5. **监控与告警**
   - 工作量: 2-3周
   - 收益: 运维便利性

6. **自动化测试流水线**
   - 工作量: 1-2周
   - 收益: 开发效率

---

## 执行检查清单

### 中期计划检查清单

**渐进式迁移**:
- [ ] Dashboard 统计接口迁移
- [ ] 数据字典接口迁移
- [ ] 系统配置接口迁移
- [ ] 所有API返回准确HTTP状态码
- [ ] 前端兼容性验证

**集成测试**:
- [ ] 项目-款项联动测试
- [ ] 权限隔离测试
- [ ] 数据一致性测试
- [ ] 测试可重复执行
- [ ] 测试执行时间 < 30秒

**性能优化**:
- [ ] 识别并修复 N+1 查询
- [ ] 添加数据库索引
- [ ] 优化 Dashboard 统计SQL
- [ ] 引入缓存机制
- [ ] P99响应时间 < 500ms

### 长期计划检查清单

**监控与告警**:
- [ ] 集成 Prometheus
- [ ] 配置 Grafana Dashboard
- [ ] 集成日志聚合
- [ ] 配置告警规则
- [ ] 配置钉钉/企业微信通知

**自动化测试**:
- [ ] 配置 CI/CD 流水线
- [ ] 集成代码覆盖率
- [ ] 配置 Pre-commit Hooks
- [ ] 自动化部署脚本

**性能基准**:
- [ ] 编写基准测试
- [ ] 定期压力测试
- [ ] 性能报告文档

---

## 总结

中长期计划是一个持续改进的过程，建议：

1. **循序渐进**: 按优先级逐步推进，不要求一次性完成
2. **验证效果**: 每个阶段完成后验证实际效果
3. **灵活调整**: 根据实际情况调整优先级和方案
4. **文档更新**: 及时更新文档和最佳实践

**当前建议**: 
- 立即执行: Dashboard/Dictionary 接口迁移
- 近期执行: 数据库查询优化
- 按需执行: 监控告警、自动化测试

---

**文档维护**: 开发团队  
**最后更新**: 2026-07-01
