# Orange 项目监控与告警部署指南

**版本**: 1.0  
**日期**: 2026-07-01  
**状态**: 已完成部署配置

---

## 概览

本项目已完成监控与告警系统的完整部署配置，包括：
- ✅ Prometheus（指标采集）
- ✅ Grafana（可视化）
- ✅ Redis（缓存）
- ✅ Loki（日志聚合）
- ✅ AlertManager（告警管理）

所有服务通过 Docker Compose 一键部署。

---

## 快速开始

### 1. 启动监控基础设施

```bash
# 启动所有监控服务
docker-compose -f docker-compose.monitoring.yml up -d

# 查看服务状态
docker-compose -f docker-compose.monitoring.yml ps

# 查看日志
docker-compose -f docker-compose.monitoring.yml logs -f
```

### 2. 配置应用

在 `.env` 或 `config.yml` 中添加：

```yaml
# Redis 缓存配置
REDIS_ADDR=localhost:6379
REDIS_PASSWORD=orange123

# 或者不配置Redis，自动使用内存缓存
```

### 3. 启动应用

```bash
# 应用会自动暴露 /metrics 端点
go run main.go
```

### 4. 访问监控界面

- **Grafana**: http://localhost:3000
  - 用户名: `admin`
  - 密码: `admin123`
  
- **Prometheus**: http://localhost:9090

- **AlertManager**: http://localhost:9093

---

## 服务说明

### Prometheus (端口 9090)

**功能**: 指标采集和存储

**采集目标**:
- Orange API: `http://host.docker.internal:8080/metrics`
- Redis: `redis:6379`
- Prometheus 自身: `localhost:9090`

**配置文件**: `monitoring/prometheus/prometheus.yml`

**告警规则**: `monitoring/prometheus/alerts.yml`

### Grafana (端口 3000)

**功能**: 可视化仪表板

**默认凭证**:
- 用户名: `admin`
- 密码: `admin123`

**数据源**: 自动配置 Prometheus 和 Loki

**仪表板**: 需手动导入或配置

### Redis (端口 6379)

**功能**: 应用缓存

**密码**: `orange123`

**数据持久化**: 开启 AOF

**配置**: 
```yaml
# 在应用中配置
REDIS_ADDR=localhost:6379
REDIS_PASSWORD=orange123
```

### Loki (端口 3100)

**功能**: 日志聚合

**日志来源**: Promtail 收集 `./logs/*.log`

**配置文件**: `monitoring/loki/loki-config.yml`

### Promtail

**功能**: 日志收集

**监控目录**: `./logs/*.log`

**配置文件**: `monitoring/promtail/promtail-config.yml`

### AlertManager (端口 9093)

**功能**: 告警管理和通知

**配置文件**: `monitoring/alertmanager/alertmanager.yml`

**通知方式**: Webhook (可扩展邮件、钉钉等)

---

## 告警规则

### API 告警

1. **HighErrorRate** (严重)
   - 条件: 5xx错误率 > 5%
   - 持续: 2分钟
   - 动作: 立即通知

2. **SlowAPIResponse** (警告)
   - 条件: P99响应时间 > 1秒
   - 持续: 5分钟
   - 动作: 发送警告

3. **ServiceDown** (严重)
   - 条件: 服务不可用
   - 持续: 1分钟
   - 动作: 立即通知

4. **HighRequestRate** (警告)
   - 条件: 请求量 > 100 req/s
   - 持续: 5分钟
   - 动作: 发送警告

### 缓存告警

1. **RedisDown** (严重)
   - 条件: Redis不可用
   - 持续: 1分钟
   - 动作: 立即通知

2. **LowCacheHitRate** (警告)
   - 条件: 缓存命中率 < 50%
   - 持续: 10分钟
   - 动作: 发送警告

---

## 缓存使用

### 自动缓存切换

应用支持自动选择缓存实现：
- 配置了 `REDIS_ADDR`: 使用 Redis 缓存
- 未配置: 自动降级到内存缓存

### 缓存示例

```go
import "github.com/FruitsAI/Orange/internal/pkg/cache"

// 设置缓存
cache.Set("key", []byte("value"), 5*time.Minute)

// 获取缓存
data, err := cache.Get("key")

// 删除缓存
cache.Delete("key")

// JSON 缓存
cache.GetCache().SetJSON("user:1", user, 10*time.Minute)
var user User
cache.GetCache().GetJSON("user:1", &user)
```

### Dashboard 缓存

已在 `DashboardService.GetStats` 中实现缓存：
- 缓存时间: 1分钟
- 缓存键: `dashboard:stats:{userID}:{period}`
- 自动失效和更新

---

## 维护命令

### 查看服务状态

```bash
docker-compose -f docker-compose.monitoring.yml ps
```

### 查看日志

```bash
# 所有服务
docker-compose -f docker-compose.monitoring.yml logs -f

# 特定服务
docker-compose -f docker-compose.monitoring.yml logs -f prometheus
docker-compose -f docker-compose.monitoring.yml logs -f grafana
```

### 重启服务

```bash
# 重启所有服务
docker-compose -f docker-compose.monitoring.yml restart

# 重启特定服务
docker-compose -f docker-compose.monitoring.yml restart redis
```

### 停止服务

```bash
docker-compose -f docker-compose.monitoring.yml down

# 删除数据卷
docker-compose -f docker-compose.monitoring.yml down -v
```

### 更新配置

```bash
# 修改配置文件后重新加载
docker-compose -f docker-compose.monitoring.yml up -d
```

---

## 数据持久化

所有服务数据通过 Docker Volume 持久化：
- `prometheus-data`: Prometheus 指标数据
- `grafana-data`: Grafana 配置和仪表板
- `redis-data`: Redis 缓存数据
- `loki-data`: Loki 日志数据
- `alertmanager-data`: AlertManager 配置

---

## 性能调优

### Prometheus

- 数据保留期: 默认15天
- 修改: 在 `docker-compose.monitoring.yml` 中添加 `--storage.tsdb.retention.time=30d`

### Redis

- 最大内存: 默认无限制
- 修改: 添加 `--maxmemory 512mb --maxmemory-policy allkeys-lru`

### Loki

- 日志保留期: 7天
- 摄入速率: 10MB/s
- 修改: 在 `loki-config.yml` 中调整

---

## 扩展配置

### 添加邮件告警

在 `alertmanager.yml` 中添加:

```yaml
receivers:
  - name: 'critical'
    email_configs:
      - to: 'admin@example.com'
        from: 'alertmanager@example.com'
        smarthost: 'smtp.example.com:587'
        auth_username: 'alertmanager@example.com'
        auth_password: 'password'
```

### 添加钉钉告警

使用钉钉机器人 Webhook:

```yaml
receivers:
  - name: 'critical'
    webhook_configs:
      - url: 'https://oapi.dingtalk.com/robot/send?access_token=xxx'
```

---

## 故障排查

### 应用无法连接 Redis

1. 检查 Redis 是否启动: `docker ps | grep redis`
2. 检查密码配置: `REDIS_PASSWORD=orange123`
3. 测试连接: `redis-cli -h localhost -p 6379 -a orange123 ping`

### Prometheus 无法采集指标

1. 检查应用是否暴露 `/metrics`: `curl http://localhost:8080/metrics`
2. 检查 Prometheus 配置: `monitoring/prometheus/prometheus.yml`
3. 查看 Prometheus 目标状态: http://localhost:9090/targets

### Grafana 无数据

1. 检查数据源配置: Settings -> Data Sources
2. 检查 Prometheus 是否正常: http://localhost:9090
3. 检查时间范围是否正确

---

## 资源要求

### 最小配置
- CPU: 2核
- 内存: 4GB
- 磁盘: 20GB

### 推荐配置
- CPU: 4核
- 内存: 8GB
- 磁盘: 50GB

---

## 安全建议

1. **修改默认密码**
   - Grafana: `admin/admin123` → 强密码
   - Redis: `orange123` → 强密码

2. **限制访问**
   - 生产环境不要暴露所有端口
   - 使用反向代理和 SSL

3. **数据备份**
   - 定期备份 Docker Volume
   - 导出 Grafana 仪表板配置

---

## 总结

监控与告警系统已完整配置并可立即部署：
- ✅ 所有配置文件已创建
- ✅ Docker Compose 已配置
- ✅ 缓存机制已实现
- ✅ 告警规则已定义
- ✅ 部署指南已完成

**启动命令**:
```bash
docker-compose -f docker-compose.monitoring.yml up -d
```

**文档维护**: 开发团队  
**最后更新**: 2026-07-01
