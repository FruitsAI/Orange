/**
 * @file router/index.ts
 * @description Vue Router 路由配置文件
 * 定义应用的路由表、路由元信息(Meta)及全局导航守卫。
 */
import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  // 使用 Web History 模式 (去掉 URL 中的 #)
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/login', // 根路径默认重定向到登录页
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { title: '登录', requiresAuth: false }, // 无需登录即可访问
    },
    {
      path: '/',
      component: AppLayout, // 使用通用布局组件
      meta: { requiresAuth: true }, // 需要登录
      children: [
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/views/DashboardView.vue'),
          meta: { title: '工作台' },
        },
        {
          path: 'projects',
          name: 'projects',
          component: () => import('@/views/ProjectsView.vue'),
          meta: { title: '项目管理' },
        },
        {
          path: 'projects/create',
          name: 'project-create',
          component: () => import('@/views/ProjectCreateView.vue'),
          meta: { title: '新建项目' },
        },
        {
          path: 'projects/edit/:id',
          name: 'project-edit',
          component: () => import('@/views/ProjectCreateView.vue'),
          meta: { title: '编辑项目' },
        },
        {
          path: 'projects/:id',
          name: 'project-detail',
          component: () => import('@/views/ProjectDetailView.vue'),
          meta: { title: '项目详情' },
        },
        {
          path: 'projects/:id/payment/create',
          name: 'payment-create',
          component: () => import('@/views/PaymentCreateView.vue'),
          meta: { title: '添加收款' },
        },
        {
          path: 'payment/create',
          name: 'payment-create-global',
          component: () => import('@/views/PaymentCreateView.vue'),
          meta: { title: '添加收款' },
        },
        {
          path: 'calendar',
          name: 'calendar',
          component: () => import('@/views/CalendarView.vue'),
          meta: { title: '收款日历' },
        },
        {
          path: 'analytics',
          name: 'analytics',
          component: () => import('@/views/AnalyticsView.vue'),
          meta: { title: '数据分析' },
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/views/SettingsView.vue'),
          meta: { title: '系统设置' },
        },
      ],
    },
  ],
})

// Navigation Guard for Auth and Title
// 全局前置导航守卫
// 用于处理页面权限验证和动态标题设置
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  // 设置页面标题
  const title = to.meta.title as string
  if (title) {
    document.title = `${title} - Orange`
  } else {
    document.title = 'Orange - 项目收款管理系统'
  }

  // 权限检查逻辑
  // 1. 如果目标路由需要鉴权且用户未登录 -> 重定向到登录页
  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    next({ name: 'login' })
  } 
  // 2. 如果已登录状态下访问登录页 -> 重定向到 Dashboard
  else if (to.name === 'login' && authStore.isLoggedIn) {
    next({ name: 'dashboard' })
  } 
  // 3. 其他情况放行
  else {
    next()
  }
})

export default router
