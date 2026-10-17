# Orange - 财务收款管理系统

<p align="center">
  <strong>🍊 Orange 是一个现代化的财务收款管理系统原型，采用 Liquid Glass 设计语言，提供优雅的用户体验。</strong>
</p>

## ✨ 功能特性

- **📊 工作台** - 概览收款统计、收入趋势图表、近期项目和即将到期收款
- **📁 项目管理** - 管理项目信息，追踪合同金额和收款进度
- **📅 收款日历** - 可视化日历展示收款计划和到期提醒
- **📈 数据分析** - 多维度收款数据分析，收款率、逾期比例等关键指标
- **⚙️ 系统设置** - 个人信息管理和系统配置

## 🎨 设计特色

- **Liquid Glass 设计语言** - 毛玻璃效果、微妙阴影、优雅渐变
- **橙色主题** - 统一的橙色主色调 (#FF9F0A)
- **响应式布局** - 完美适配桌面、平板和手机
- **深色模式** - 支持明暗主题切换

## 🛠 技术栈

| 类别 | 技术                       |
| ---- | -------------------------- |
| 框架 | React 19 + TypeScript      |
| 构建 | Vite 7                     |
| 路由 | React Router               |
| 状态 | Zustand                    |
| 图表 | Chart.js 4                 |
| 图标 | Remix Icon                 |
| 样式 | Vanilla CSS (Liquid Glass) |

## 📁 项目结构

```
src/
├── assets/          # 样式资源
│   ├── base.css       # 基础样式和 CSS 变量
│   ├── liquid-glass.css # Liquid Glass 设计系统
│   └── main.css       # 主样式入口
├── components/      # 组件
│   ├── common/        # 通用组件 (GlassCard, StatusBadge)
│   ├── dashboard/     # 仪表盘组件 (StatCard, IncomeChart...)
│   ├── layout/        # 布局组件 (AppHeader, AppSidebar)
│   └── icons/         # 图标组件
├── views/           # 页面视图
│   ├── DashboardView.tsx   # 工作台
│   ├── ProjectsView.tsx    # 项目管理
│   ├── CalendarView.tsx    # 收款日历
│   ├── AnalyticsView.tsx   # 数据分析
│   ├── SettingsView.tsx    # 系统设置
│   └── LoginView.tsx       # 登录页
├── stores/          # Zustand 状态管理
├── router/          # React Router 路由配置
└── main.tsx         # 应用入口
```

## 🚀 快速开始

### 环境要求

- Node.js 20.19.0+ 或 22.12.0+
- npm 或 pnpm

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 代码检查

```bash
npm run lint
```

## 📱 响应式断点

| 断点            | 目标设备 | 主要变化              |
| --------------- | -------- | --------------------- |
| > 1280px        | 桌面大屏 | 完整布局，侧边栏展开  |
| 1024px - 1280px | 笔记本   | 侧边栏收起，网格调整  |
| 768px - 1024px  | 平板     | 单列布局，统计卡片2列 |
| < 768px         | 手机     | 侧边栏变底部 Dock     |

## 📄 许可证

MIT License
