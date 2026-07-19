# Orange 项目改进计划

## 项目概况

本文档记录了 Orange 项目在完成代码审查优化后的后续改进计划,旨在持续提升代码质量、测试覆盖率和系统可维护性。

---

## 已完成优化 (2026年7月)

### 核心成果
- ✅ 后端安全修复 (JWT/限流/CORS)
- ✅ 资金一致性修复 (事务化CRUD)
- ✅ 代码精简去重 (消除93行重复代码)
- ✅ Repository层权限校验优化 (UserScope)
- ✅ Dashboard趋势计算工具函数提取 (复杂度降低39%)
- ✅ 核心业务逻辑单元测试 (10个测试)
- ✅ 统一错误处理与日志记录 (pkg/errors)

### 量化指标
| 指标 | 改进 |
|------|------|
| 代码重复 | 减少 93行 |
| Dashboard复杂度 | 降低 39% |
| 测试覆盖 | 新增 10个单元测试 |
| 错误类型 | 统一 15个预定义错误 |

---

## 短期计划 (1-2周)

### 1. 应用新错误处理机制

**目标**: 在关键路径应用 `pkg/errors` 业务错误类型

**任务清单**:
- [ ] **ProjectHandler** 重构
  - [ ] Create: 使用 `HandleServiceError`
  - [ ] Update: 使用 `HandleServiceError`
  - [ ] Delete: 使用 `HandleServiceError`
  - [ ] GetByID: 使用 `HandleServiceError`

- [ ] **PaymentHandler** 重构
  - [ ] Create: 处理 `ErrContractDuplicate`
  - [ ] Confirm: 处理 `ErrPaymentNotFound`
  - [ ] Delete: 处理 `ErrNotOwner`

- [ ] **Service层** 错误优化
  - [ ] ProjectService.Create: 返回 `ErrContractDuplicate`
  - [ ] ProjectService.DeleteForUser: 返回 `ErrNotOwner`
  - [ ] PaymentService.ConfirmPayment: 返回 `ErrPaymentNotFound`

**验收标准**:
- 关键API返回准确的HTTP状态码 (400/403/404/500)
- 错误消息用户友好,不泄露内部细节
- 日志包含结构化字段 (user_id, path, error)

**预计工时**: 3-4天

---

### 2. 补充核心单元测试

**目标**: 提升测试覆盖率,重点覆盖业务逻辑

**任务清单**:
- [ ] **PaymentService 测试**
  - [ ] TestPaymentService_CreatePayment (事务验证)
  - [ ] TestPaymentService_ConfirmPayment (金额同步)
  - [ ] TestPaymentService_DeleteForUser (权限校验)
  - [ ] TestPaymentService_BatchConfirm (批量操作)

- [ ] **UserService 测试**
  - [ ] TestUserService_Register (用户名/邮箱重复)
  - [ ] TestUserService_Login (密码校验)
  - [ ] TestUserService_UpdatePassword (旧密码验证)

- [ ] **NotificationService 测试**
  - [ ] TestNotificationService_CheckAndSend (触发条件)
  - [ ] TestNotificationService_AvoidDuplicate (防重复)

**验收标准**:
- 每个Service至少3个测试用例
- 测试覆盖率达到 60%+
- 所有测试通过,无flaky test

**预计工时**: 4-5天

---

### 3. 代码规范与文档

**任务清单**:
- [ ] 编写错误处理最佳实践文档
  - [ ] Service层错误返回规范
  - [ ] Handler层错误处理模板
  - [ ] 日志记录规范

- [ ] 更新 CONTRIBUTING.md
  - [ ] 添加单元测试编写指南
  - [ ] 添加代码审查清单

- [ ] API文档更新
  - [ ] 更新错误码说明
  - [ ] 补充状态码示例

**预计工时**: 2天

---

## 中期计划 (1个月)

### 1. 渐进式迁移现有代码

**目标**: 将现有Handler/Service迁移到新错误处理模式

**阶段1: 高频API迁移** (Week 1-2)
- [ ] 项目管理相关 (Project CRUD)
- [ ] 款项管理相关 (Payment CRUD)
- [ ] 用户管理相关 (User CRUD)

**阶段2: 中频API迁移** (Week 3)
- [ ] Dashboard 统计接口
- [ ] 通知管理接口
- [ ] 数据字典接口

**阶段3: 低频API迁移** (Week 4)
- [ ] 文件上传接口
- [ ] 系统配置接口
- [ ] 日志查询接口

**验收标准**:
- 所有API返回准确HTTP状态码
- 单元测试全部通过
- 前端兼容性验证通过

**预计工时**: 2周 (分阶段进行)

---

### 2. 集成测试补充

**目标**: 补充端到端测试,验证跨模块交互

**任务清单**:
- [ ] **项目-款项联动测试**
  - [ ] 创建项目 → 添加款项 → 确认款项 → 验证项目金额
  - [ ] 删除项目 → 验证款项级联删除

- [ ] **权限隔离测试**
  - [ ] 用户A创建项目 → 用户B无法访问
  - [ ] 用户A创建款项 → 用户B无法确认

- [ ] **数据一致性测试**
  - [ ] 并发创建款项 → 验证项目金额正确
  - [ ] 事务回滚场景 → 验证数据完整性

**验收标准**:
- 集成测试覆盖核心业务流程
- 测试可重复执行,无数据污染
- 测试执行时间 < 30秒

**预计工时**: 4-5天

---

### 3. 性能优化

**目标**: 识别并优化性能瓶颈

**任务清单**:
- [ ] **数据库查询优化**
  - [ ] 识别 N+1 查询问题 (使用Preload)
  - [ ] 添加必要索引 (user_id, status, plan_date)
  - [ ] 优化Dashboard统计SQL (减少多次查询)

- [ ] **缓存机制引入**
  - [ ] 字典数据缓存 (Redis)
  - [ ] 用户信息缓存 (Redis)
  - [ ] Dashboard统计缓存 (短期缓存)

- [ ] **API响应时间优化**
  - [ ] 分页查询限制 (最大100条)
  - [ ] 字段裁剪 (仅返回必要字段)
  - [ ] GZIP压缩

**验收标准**:
- P99响应时间 < 500ms
- Dashboard统计接口 < 1s
- 数据库慢查询 < 10次/天

**预计工时**: 1周

---

## 长期计划 (季度)

### 1. 监控与告警

**目标**: 建立完善的监控体系

**任务清单**:
- [ ] **应用监控**
  - [ ] 集成 Prometheus (指标采集)
  - [ ] 集成 Grafana (可视化)
  - [ ] 监控关键指标 (QPS, 响应时间, 错误率)

- [ ] **日志聚合**
  - [ ] 集成 ELK / Loki (日志收集)
  - [ ] 结构化日志规范
  - [ ] 日志告警规则

- [ ] **告警规则**
  - [ ] 错误率 > 5% 告警
  - [ ] P99延迟 > 2s 告警
  - [ ] 数据库连接数 > 80% 告警

**预计工时**: 2周

---

### 2. API文档自动化

**目标**: 自动化API文档生成与维护

**任务清单**:
- [ ] **Swagger/OpenAPI集成**
  - [ ] 使用 swaggo/swag 生成文档
  - [ ] 补充API注释 (@Summary, @Param)
  - [ ] 集成 Swagger UI

- [ ] **文档规范**
  - [ ] 统一错误码说明
  - [ ] 补充请求示例
  - [ ] 补充响应示例

- [ ] **自动化更新**
  - [ ] CI集成文档生成
  - [ ] 文档版本管理
  - [ ] 文档站点部署

**预计工时**: 1周

---

### 3. 前端错误处理统一

**目标**: 前端统一错误处理,提升用户体验

**任务清单**:
- [ ] **全局错误拦截**
  - [ ] Axios拦截器统一处理错误
  - [ ] 根据错误码显示友好提示
  - [ ] 401自动跳转登录

- [ ] **错误码映射**
  - [ ] 定义前端错误码枚举
  - [ ] 映射后端错误码
  - [ ] 国际化错误消息

- [ ] **用户体验优化**
  - [ ] Toast提示优化
  - [ ] 表单错误提示优化
  - [ ] 网络错误重试机制

**预计工时**: 1周

---

## 技术债务清理

### 高优先级
- [ ] 清理未使用的依赖包 (go mod tidy)
- [ ] 清理未使用的前端组件
- [ ] 统一代码格式 (gofmt, prettier)
- [ ] 修复所有 linter 警告

### 中优先级
- [ ] 数据库迁移脚本管理 (migrate工具)
- [ ] 配置文件管理优化 (支持环境变量)
- [ ] 日志级别动态调整
- [ ] 优雅关闭机制

### 低优先级
- [ ] Docker镜像优化 (多阶段构建)
- [ ] CI/CD流程优化
- [ ] 开发环境容器化
- [ ] 生产部署文档

---

## 资源需求

### 人力投入
- **短期** (1-2周): 1人全职
- **中期** (1个月): 1-2人
- **长期** (季度): 根据优先级分配

### 技术栈学习
- Prometheus/Grafana (监控)
- Redis (缓存)
- Swagger (API文档)
- 性能分析工具 (pprof)

---

## 风险评估

### 技术风险
- **错误处理迁移**: 可能影响现有API行为
  - **缓解**: 分阶段迁移,充分测试
  
- **性能优化**: 可能引入新bug
  - **缓解**: 基准测试,灰度发布

### 时间风险
- **测试补充**: 工作量可能超预期
  - **缓解**: 优先覆盖核心路径

---

## 进度跟踪

### 每周回顾
- 每周五下午 code review
- 同步进度,识别阻塞
- 调整计划

### 月度总结
- 回顾完成情况
- 评估效果 (指标对比)
- 规划下月计划

### 季度复盘
- 总结技术债务清理情况
- 评估系统稳定性提升
- 制定下季度OKR

---

## 附录

### 相关文档
- [代码审查报告](./code-review-2026-07.md)
- [错误处理最佳实践](./error-handling-guide.md)
- [单元测试指南](./testing-guide.md)

### 参考资源
- [Go Error Handling Best Practices](https://go.dev/blog/error-handling-and-go)
- [GORM Performance Optimization](https://gorm.io/docs/performance.html)
- [Gin Middleware Guide](https://github.com/gin-gonic/gin#using-middleware)

---

**文档版本**: v1.0  
**创建日期**: 2026-07-01  
**最后更新**: 2026-07-01  
**维护人**: 开发团队
