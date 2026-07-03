/**
 * @file main.ts
 * @description 前端应用入口文件
 * 用于初始化 Vue 应用实例，配置 Pinia 状态管理、Vue Router 路由，及全局样式和拦截器。
 */
import './assets/liquid-glass.css'
import './assets/main.css'
import 'remixicon/fonts/remixicon.css'

// Fonts
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import '@fontsource/jetbrains-mono/600.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { setAuthLogout } from '@/api'
import { useAuthStore } from '@/stores/auth'

// 创建 Vue 应用实例
const app = createApp(App)

// 注册 Pinia 状态管理插件
app.use(createPinia())
// 注册 Router 路由插件
app.use(router)

// 设置 API 登出回调
// 当后端返回 401 Unauthorized 时，会自动调用此回调清理本地状态并跳转登录页
setAuthLogout(async () => {
  const authStore = useAuthStore()
  await authStore.logout()
  router.push('/login')
})

// 挂载应用到 DOM
app.mount('#app')
