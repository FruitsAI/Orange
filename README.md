<div align="center">
  <img src="frontend/public/orange.png" alt="Orange Logo" width="120" height="120" />

# Orange

  <p>
    <strong>一个基于 Wails v3 的现代化跨平台桌面应用</strong>
  </p>

  <p>
    <a href="https://wails.io" target="_blank">
      <img src="https://img.shields.io/badge/Wails-v3-red?style=flat-square&logo=wails" alt="Wails v3" />
    </a>
    <a href="https://go.dev" target="_blank">
      <img src="https://img.shields.io/badge/Go-1.25+-00ADD8?style=flat-square&logo=go" alt="Go" />
    </a>
    <a href="https://vuejs.org" target="_blank">
      <img src="https://img.shields.io/badge/Vue.js-3.5+-4FC08D?style=flat-square&logo=vue.js" alt="Vue" />
    </a>
    <a href="https://tailwindcss.com" target="_blank">
      <img src="https://img.shields.io/badge/Tailwind-4.0+-38B2AC?style=flat-square&logo=tailwind-css" alt="Tailwind CSS" />
    </a>
    <a href="./LICENSE">
      <img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square" alt="License" />
    </a>
  </p>

  <p>
    <a href="./README_EN.md">🇺🇸 English</a> | 
    <a href="./README.md">🇨🇳 简体中文</a>
  </p>
</div>

---

## 📖 简介

**Orange** 是一个基于 [Wails v3](https://wails.io) 构建的现代化桌面应用程序，展示了如何使用 Go (后端) 和 Vue 3 (前端) 打造高性能、原生体验的跨平台应用。

该项目集成了一套完整的业务管理功能，包括用户权限管理、项目合同追踪、财务款项管理以及系统字典配置，旨在为企业级桌面应用开发提供最佳实践参考。

## ✨ 特性

- **跨平台支持**: 基于 Wails v3，完美运行于 macOS, Windows 和 Linux。
- **现代化 UI**: 采用 Vue 3 + Tailwind CSS 4.0，配合 Glassmorphism 风格设计，界面精致流畅。
- **高性能后端**: Go 语言驱动，集成 Gin Web 框架、GORM ORM 库及 SQLite 数据库。
- **安全可靠**: 
  - JWT 身份认证（支持即时撤销，禁用账号后最迟 60 秒内失效）
  - Bcrypt 密码加密
  - 常数时间凭据比对防止时序侧信道
  - 中间件鉴权机制与最小权限原则
- **完整业务流**:
  - 📊 **仪表盘**: 实时数据可视化与统计分析（带缓存自动失效）。
  - 👥 **用户管理**: 包含角色、部门、职位及多凭证登录支持。
  - 🚀 **项目管理**: 全生命周期管理，支持状态流转与合同编号自动生成。
  - 💰 **财务管理**: 详细的款项阶段（首付款/进度款/尾款）追踪与逾期提醒。
  - 🔔 **通知系统**: 支持全局广播与点对点私信通知。
  - ⚙️ **系统配置**: 灵活的字典管理与版本更新检测。
- **代码质量**:
  - 通过全量单元测试与集成测试覆盖（`go test ./...`）
  - 严格遵循 KISS/DRY/SOLID 原则
  - 零死代码（定期审计清理）

## 🛠 技术栈

<table>
  <tr>
    <th width="150" align="center">分类</th>
    <th align="left">技术选型</th>
  </tr>
  <tr>
    <td align="center"><b>Core</b></td>
    <td><a href="https://wails.io">Wails v3</a> (Alpha)</td>
  </tr>
  <tr>
    <td align="center"><b>Backend (Go)</b></td>
    <td>
      <ul>
        <li><b>Web Framework</b>: <a href="https://github.com/gin-gonic/gin">Gin</a></li>
        <li><b>ORM</b>: <a href="https://gorm.io">GORM</a> (SQLite / MySQL / PostgreSQL)</li>
        <li><b>Logging</b>: <a href="https://github.com/uber-go/zap">Zap</a> + Lumberjack</li>
        <li><b>Auth</b>: JWT (golang-jwt/v5)</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td align="center"><b>Frontend (Vue)</b></td>
    <td>
      <ul>
        <li><b>Framework</b>: Vue 3 (Composition API)</li>
        <li><b>Build Tool</b>: Vite 7</li>
        <li><b>Styling</b>: Tailwind CSS 4</li>
        <li><b>State Management</b>: Pinia</li>
        <li><b>Routing</b>: Vue Router 4</li>
        <li><b>Icons</b>: Remix Icon</li>
        <li><b>Charts</b>: Chart.js</li>
      </ul>
    </td>
  </tr>
</table>

## 🚀 快速开始

### 环境依赖

- **Go**: >= 1.25
- **Node.js**: >= 20
- **NPM**: >= 10

### 安装

1. **克隆仓库**

```bash
git clone https://github.com/FruitsAI/Orange.git
cd Orange
```

2. **安装前端依赖**

```bash
cd frontend
npm install
cd ..
```

3. **运行开发模式**

```bash
#这将启动 Wails 开发服务器，支持热重载
wails3 dev
```

4. **构建生产版本**

```bash
wails3 build
```

构建产物将位于 `bin` 目录下。

### 初始登录

应用首次启动时会自动创建管理员账号和普通用户账号：

- **管理员用户名**: `admin`
- **普通用户名**: `xu`
- **初始密码**: 首次启动时会随机生成强密码并写入用户配置目录下的 `initial-credentials.txt` 文件

**重要**: 登录后请立即修改初始密码，并妥善保管凭据文件。

> **凭据文件位置**:
> - Windows: `%APPDATA%\Orange\initial-credentials.txt`
> - macOS: `~/Library/Application Support/Orange/initial-credentials.txt`
> - Linux: `~/.config/Orange/initial-credentials.txt`

## ⚙️ 配置说明

项目支持使用 `.env` 文件进行配置。你可以复制 `.env.example` 为 `.env` 并根据需要修改：

### 数据库配置

Orange 支持三种数据库：**SQLite** (默认)、**MySQL** 和 **PostgreSQL**。

```ini
# 数据库类型: sqlite (默认), mysql, postgres
DB_TYPE=sqlite

# 数据库路径 (默认: 系统用户配置目录下的 orange.db)
# SQLite 配置 (仅 DB_TYPE=sqlite 时有效)
DB_PATH=orange.db

# MySQL/PostgreSQL 配置
DB_HOST=localhost
DB_PORT=3306          # MySQL: 3306, PostgreSQL: 5432
DB_USER=root
DB_PASSWORD=          # 生产环境必须设置强密码
DB_NAME=orange

# SSL 连接模式 (PostgreSQL)
# disable: 本地开发环境
# require: 云托管数据库 (Nile, Supabase, AWS RDS 等)
DB_SSL_MODE=disable

# 是否自动创建数据库
# true: 本地环境，首次连接时自动创建
# false: 云托管数据库，由服务商预先创建
DB_AUTO_CREATE=true
```

> **安全提示**: 
> - 生产环境必须为 `DB_PASSWORD` 设置强密码
> - 使用云数据库时，请设置 `DB_SSL_MODE=require` 和 `DB_AUTO_CREATE=false`
> - Docker 部署需要配置环境变量，密码为必填项（`:?` 语法校验）

### 其他配置

```ini
# JWT Configuration
# JWT 签名密钥 (生产环境务必修改为 32+ 字节强随机密钥)
JWT_SECRET=
TOKEN_EXPIRY=24

# Logger Configuration
# 是否启用文件日志
LOG_ENABLE=true
# 日志级别: debug, info, warn, error
LOG_LEVEL=info
# 日志文件路径 (默认: 系统用户配置目录/log/orange.log)
LOG_PATH=orange.log
# 单个日志文件最大大小 (MB)
LOG_MAX_SIZE=10
# 保留旧日志文件的最大个数
LOG_MAX_BACKUPS=5
# 保留旧日志文件的最大天数
LOG_MAX_AGE=30
# 是否压缩旧日志文件
LOG_COMPRESS=true

# Cache Configuration (可选)
# 留空使用内存缓存；填写地址使用 Redis（推荐用于多实例部署）
REDIS_ADDR=
REDIS_PASSWORD=
REDIS_DB=0

# Prometheus Metrics (可选)
# 为 /metrics 端点配置 Basic Auth；留空则允许无认证访问（仅建议本地开发）
PROMETHEUS_USER=
PROMETHEUS_PASSWORD=

# GitHub Updates
# 用于检查更新的仓库地址
GITHUB_REPO=FruitsAI/Orange
```

> **安全最佳实践**:
> - `JWT_SECRET` 必须设置为至少 32 字节的随机字符串（生产环境）
> - 启用 Redis 时建议设置 `REDIS_PASSWORD`
> - `/metrics` 端点应配置 Basic Auth 或通过防火墙限制访问

## 📸 界面预览

<div align="center">
<table>
<tr>
<td align="center"><b>工作台</b></td>
<td align="center"><b>项目管理</b></td>
<td align="center"><b>收款日历</b></td>
</tr>
<tr>
<td><img src="frontend/public/dashboard.png" alt="工作台" width="400"></td>
<td><img src="frontend/public/projects.png" alt="项目管理" width="400"></td>
<td><img src="frontend/public/calendar.png" alt="收款日历" width="400"></td>
</tr>
<tr>
<td align="center"><b>数据分析</b></td>
<td align="center"><b>字典管理</b></td>
<td align="center"><b>关于</b></td>
</tr>
<tr>
<td><img src="frontend/public/analytics.png" alt="数据分析" width="400"></td>
<td><img src="frontend/public/dictionary.png" alt="字典管理" width="400"></td>
<td><img src="frontend/public/about.png" alt="关于" width="400"></td>
</tr>
</table>
</div>

## 📂 目录结构

```
Orange/
├── build/              # Wails 构建相关配置与资源 (AppIcon 等)
├── cmd/                # Go 应用程序入口
├── frontend/           # Vue 3 前端源代码
│   ├── src/
│   │   ├── components/ # 可复用组件
│   │   ├── views/      # 页面视图
│   │   ├── stores/     # Pinia 状态存储
│   │   └── ...
├── internal/           # Go 后端业务逻辑 (私有包)
│   ├── config/         # 配置加载
│   ├── database/       # 数据库初始化与 Seed
│   ├── handler/        # HTTP 请求处理器 (Controller)
│   ├── middleware/     # Gin 中间件 (Auth, Logger)
│   ├── models/         # GORM 数据模型
│   ├── pkg/            # 通用工具库 (JWT, Response, Logger)
│   ├── repository/     # 数据访问层 (DAO)
│   ├── router/         # 路由定义
│   └── service/        # 业务逻辑层
├── main.go             # 应用主入口
├── go.mod              # Go 依赖定义
└── wails.json          # Wails 项目配置
```

## 🤝 贡献

欢迎提交 Pull Request 或 Issue 来帮助改进 Orange！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 📄 许可证

本项目基于 MIT 许可证开源。详见 [LICENSE](./LICENSE) 文件。
