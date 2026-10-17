# Orange 财务收款管理系统 - 前端架构设计文档

**版本**: v0.7.2
**日期**: 2026-07-09

---

## 1. 系统架构概述

Orange 前端是运行在 Wails v3 桌面壳中的 React 单页应用。桌面端通过 Wails 加载前端资源，前端通过本地 HTTP API 与 Go 后端通信；开发时使用 Vite 提供热更新。

```
┌─────────────────────────────────────────────────────────────┐
│                      Wails Desktop WebView                   │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │    React    │  │ React Router │  │      Zustand       │ │
│  │ Components  │  │  SPA Routes  │  │   Global Stores    │ │
│  └─────────────┘  └──────────────┘  └────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                         Vite / Static Assets                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                          Go Backend API                      │
│                 Gin / GORM / SQLite-MySQL-PostgreSQL         │
└─────────────────────────────────────────────────────────────┘
```

## 2. 技术选型

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 框架 | React | 19.x | UI 组件框架 |
| 语言 | TypeScript | 5.x | 类型安全 |
| 构建 | Vite | 7.x | 开发服务器与生产构建 |
| 路由 | React Router | 7.x | SPA 路由和守卫 |
| 状态 | Zustand | 5.x | 全局状态管理 |
| 图表 | Chart.js | 4.x | 数据可视化 |
| 图标 | Remix Icon | 4.x | 图标库 |
| 样式 | CSS / Tailwind CSS | 4.x | Liquid Glass 设计系统 |

## 3. 目录结构

```
src/
├── App.tsx                  # 根组件
├── main.tsx                 # 应用入口
├── api/                     # API 客户端
├── assets/                  # 样式资源
│   ├── base.css             # CSS 变量定义
│   ├── liquid-glass.css     # Liquid Glass 设计系统
│   └── main.css             # 页面和组件样式
├── components/              # 可复用组件
│   ├── common/              # 通用组件
│   ├── dashboard/           # 工作台组件
│   ├── layout/              # 应用布局
│   ├── notification/        # 通知组件
│   └── settings/            # 设置页组件
├── composables/             # React 兼容的通用交互工具
├── config/                  # 前端配置
├── constants/               # 常量
├── router/                  # React Router 路由定义和守卫
├── stores/                  # Zustand 状态
│   ├── auth.ts              # 认证状态
│   ├── layout.ts            # 布局状态
│   └── theme.ts             # 主题状态
├── types/                   # 类型定义
├── utils/                   # 工具函数
└── views/                   # 页面视图
    ├── LoginView.tsx
    ├── DashboardView.tsx
    ├── ProjectsView.tsx
    ├── ProjectCreateView.tsx
    ├── ProjectDetailView.tsx
    ├── PaymentCreateView.tsx
    ├── CalendarView.tsx
    ├── AnalyticsView.tsx
    └── SettingsView.tsx
```

## 4. 路由设计

| 路径 | 组件 | 说明 |
|------|------|------|
| `/login` | `LoginView` | 登录页 |
| `/dashboard` | `DashboardView` | 工作台 |
| `/projects` | `ProjectsView` | 项目列表 |
| `/projects/create` | `ProjectCreateView` | 新建项目 |
| `/projects/edit/:id` | `ProjectCreateView` | 编辑项目 |
| `/projects/:id` | `ProjectDetailView` | 项目详情 |
| `/projects/:id/payment/create` | `PaymentCreateView` | 为项目添加收款 |
| `/payment/create` | `PaymentCreateView` | 全局添加收款 |
| `/calendar` | `CalendarView` | 收款日历 |
| `/analytics` | `AnalyticsView` | 数据分析 |
| `/settings` | `SettingsView` | 系统设置 |

路由守卫由 `ProtectedRoute.tsx` 负责，未登录用户会被重定向到登录页。

## 5. 状态管理

### Auth Store

```typescript
interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  login: (credentials: LoginRequest) => Promise<boolean>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}
```

### Theme Store

```typescript
interface ThemeState {
  theme: 'light' | 'dark' | 'auto'
  setTheme: (theme: ThemeMode) => void
}
```

### Layout Store

```typescript
interface LayoutState {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
}
```

## 6. 组件通信

```
┌────────────────────────────────────────────────────┐
│                    App.tsx                          │
│  ┌──────────────────────────────────────────────┐  │
│  │              AppLayout.tsx                    │  │
│  │  ┌─────────────┐  ┌────────────────────────┐ │  │
│  │  │ AppSidebar  │  │        <Outlet>        │ │  │
│  │  │             │  │  ┌──────────────────┐  │ │  │
│  │  │  导航菜单   │  │  │   当前页面视图   │  │ │  │
│  │  │             │  │  └──────────────────┘  │ │  │
│  │  └─────────────┘  └────────────────────────┘ │  │
│  └──────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
```

- **父子通信**: Props + 回调函数
- **全局状态**: Zustand Store
- **跨组件交互**: 自定义 hooks / Store selectors
- **API 通信**: Axios 实例统一处理鉴权、错误和 Token 过期

## 7. 构建与验证

### 开发环境

```bash
npm run dev
```

### 生产构建

```bash
npm run build
```

### 代码检查

```bash
npm run lint
```
