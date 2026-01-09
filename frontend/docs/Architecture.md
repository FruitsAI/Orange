# Orange 财务收款管理系统 - 系统架构设计文档

**版本**: v0.0.1  
**日期**: 2026-01-03

---

## 1. 系统架构概述

### 1.1 架构模式
采用 **SPA (Single Page Application)** 架构，前后端分离设计。

```
┌─────────────────────────────────────────────────────────────┐
│                      客户端 (Browser)                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Vue.js    │  │ Vue Router  │  │       Pinia         │ │
│  │  Components │  │  (路由管理)  │  │    (状态管理)        │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                     Vite Dev Server / Nginx                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      后端 API (待开发)                        │
│              REST API / GraphQL (预留接口)                   │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 技术选型

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 框架 | Vue.js | 3.x | 响应式 UI 框架 |
| 语言 | TypeScript | 5.x | 类型安全 |
| 构建 | Vite | 7.x | 快速开发构建 |
| 路由 | Vue Router | 4.x | SPA 路由 |
| 状态 | Pinia | 3.x | 状态管理 |
| 图表 | Chart.js | 4.x | 数据可视化 |
| 图标 | Remix Icon | - | 图标库 |
| 样式 | CSS | - | Liquid Glass 设计系统 |

---

## 2. 目录结构

```
src/
├── assets/                 # 静态资源和样式
│   ├── base.css            #   CSS 变量定义
│   ├── liquid-glass.css    #   Liquid Glass 设计系统
│   └── main.css            #   样式入口
│
├── components/             # 可复用组件
│   ├── common/             #   通用组件
│   │   ├── GlassCard.vue   #     玻璃卡片
│   │   ├── StatusBadge.vue #     状态标签
│   │   └── ConfirmModal.vue #    确认弹窗
│   ├── dashboard/          #   仪表盘组件
│   │   ├── StatCard.vue    #     统计卡片
│   │   ├── IncomeChart.vue #     收入图表
│   │   ├── RecentProjects.vue #  近期项目
│   │   ├── UpcomingPayments.vue # 即将到期
│   │   └── QuickActions.vue #    快捷操作
│   ├── layout/             #   布局组件
│   │   ├── AppLayout.vue   #     主布局
│   │   ├── AppSidebar.vue  #     侧边栏
│   │   └── AppHeader.vue   #     顶部栏
│   └── icons/              #   图标组件
│
├── composables/            # 组合式函数
│   └── useConfirm.ts       #   确认弹窗 composable
│
├── views/                  # 页面视图
│   ├── LoginView.vue       #   登录页
│   ├── DashboardView.vue   #   工作台
│   ├── ProjectsView.vue    #   项目列表
│   ├── ProjectCreateView.vue #  新建/编辑项目
│   ├── ProjectDetailView.vue #  项目详情
│   ├── PaymentCreateView.vue #  添加收款
│   ├── CalendarView.vue    #   收款日历
│   ├── AnalyticsView.vue   #   数据分析
│   └── SettingsView.vue    #   系统设置
│
├── stores/                 # Pinia 状态
│   ├── auth.ts             #   认证状态
│   ├── theme.ts            #   主题状态
│   └── layout.ts           #   布局状态
│
├── router/                 # 路由配置
│   └── index.ts            #   路由定义和守卫
│
├── App.vue                 # 根组件
└── main.ts                 # 应用入口
```

---

## 3. 路由设计

### 3.1 路由表

| 路径 | 名称 | 组件 | 说明 |
|------|------|------|------|
| `/login` | login | LoginView | 登录页 |
| `/dashboard` | dashboard | DashboardView | 工作台 |
| `/projects` | projects | ProjectsView | 项目列表 |
| `/projects/create` | project-create | ProjectCreateView | 新建项目 |
| `/projects/edit/:id` | project-edit | ProjectCreateView | 编辑项目 |
| `/projects/:id` | project-detail | ProjectDetailView | 项目详情 |
| `/projects/:id/payment/create` | payment-create | PaymentCreateView | 添加收款 |
| `/payment/create` | payment-create-global | PaymentCreateView | 全局添加收款 |
| `/calendar` | calendar | CalendarView | 收款日历 |
| `/analytics` | analytics | AnalyticsView | 数据分析 |
| `/settings` | settings | SettingsView | 系统设置 |

### 3.2 路由守卫
- **认证检查**: 访问需认证页面时，检查登录状态
- **页面标题**: 自动更新 `document.title`

---

## 4. 状态管理

### 4.1 Auth Store
```typescript
interface AuthState {
  isLoggedIn: boolean
  user: UserInfo | null
}
```

### 4.2 Theme Store
```typescript
interface ThemeState {
  theme: 'light' | 'dark'
}
```

### 4.3 Layout Store
```typescript
interface LayoutState {
  sidebarCollapsed: boolean
}
```

---

## 5. 组件通信

```
┌────────────────────────────────────────────────────┐
│                    App.vue                          │
│  ┌──────────────────────────────────────────────┐  │
│  │              AppLayout.vue                    │  │
│  │  ┌─────────────┐  ┌────────────────────────┐ │  │
│  │  │ AppSidebar  │  │     <RouterView>       │ │  │
│  │  │             │  │  ┌──────────────────┐  │ │  │
│  │  │  导航菜单   │  │  │   当前页面视图   │  │ │  │
│  │  │             │  │  │  (Dashboard等)   │  │ │  │
│  │  └─────────────┘  │  └──────────────────┘  │ │  │
│  │                   └────────────────────────┘ │  │
│  └──────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
```

- **父子通信**: Props + Emit
- **全局状态**: Pinia Store
- **跨组件**: Composables

---

## 6. 部署架构

### 6.1 开发环境
```bash
npm run dev
# Vite Dev Server on localhost:5173
```

### 6.2 生产环境
```bash
npm run build
# 输出到 dist/ 目录，部署到 Nginx/CDN
```

### 6.3 Nginx 配置示例
```nginx
server {
    listen 80;
    server_name orange.example.com;
    root /var/www/orange/dist;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```
