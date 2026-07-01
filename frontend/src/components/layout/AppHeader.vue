<script setup lang="ts">
/**
 * @file AppHeader.vue
 * @description 应用顶部导航栏
 * 包含页面标题、主题切换、通知中心及用户个人菜单。
 */
import { ref, computed, watch, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useThemeStore } from '@/stores/theme'
import { useAuthStore } from '@/stores/auth'
import { notificationApi, type Notification } from '@/api/notification'
import { Events } from '@wailsio/runtime'
import NotificationDetailModal from '@/components/notification/NotificationDetailModal.vue'

const route = useRoute()
const router = useRouter()
const themeStore = useThemeStore()
const authStore = useAuthStore()

// 计算页面标题 (优先读取路由 meta.title, 默认为 '工作台')
const pageTitle = computed(() => (route.meta.title as string) || '工作台')

// 计算用户首字母头像
const userInitial = computed(() => {
  const name = authStore.user?.name || authStore.user?.username || 'U'
  return name.charAt(0).toUpperCase()
})

// 状态控制
const showUserMenu = ref(false)         // 用户菜单显示状态
const showNotificationDropdown = ref(false) // 通知下拉框显示状态
const unreadCount = ref(0)              // 未读通知数
const recentNotifications = ref<Notification[]>([]) // 最近通知列表
const showDetailModal = ref(false)      // 通知详情模态框
const selectedNotification = ref<Notification | null>(null) // 选中的通知
let pollInterval: number | null = null  // 轮询定时器 ID

function toggleUserMenu() {
  showUserMenu.value = !showUserMenu.value
  showNotificationDropdown.value = false
}

function closeUserMenu() {
  showUserMenu.value = false
}

function closeNotificationDropdown() {
  showNotificationDropdown.value = false
}

// 切换通知下拉框
async function toggleNotificationDropdown() {
  showNotificationDropdown.value = !showNotificationDropdown.value
  showUserMenu.value = false
  if (showNotificationDropdown.value) {
    await fetchRecentNotifications()
  }
}

function goToSettings() {
  closeUserMenu()
  router.push('/settings')
}

// 跳转到通知设置页
function goToNotifications() {
  closeNotificationDropdown()
  router.push('/settings?tab=notification')
}

// 处理通知点击事件
async function handleNotificationClick(item: Notification) {
  closeNotificationDropdown()
  selectedNotification.value = item
  showDetailModal.value = true
  
  // 如果未读，标记为已读
  if (!item.is_read) {
    try {
      await notificationApi.markAsRead(item.id)
      // 更新本地状态
      item.is_read = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
      // 通知其他组件更新 (如通知页面)
      Events.Emit('notification_updated')
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }
}

async function handleLogout() {
  closeUserMenu()
  await authStore.logout()
  router.push('/login')
}

// 获取未读数量
async function fetchUnreadCount() {
  if (!authStore.isAuthenticated) return
  try {
    const res = await notificationApi.getUnreadCount()
    if (res.data.code === 0) {
      unreadCount.value = res.data.data.count
    }
  } catch (error) {
    console.error('Failed to fetch unread count:', error)
  }
}

// 获取最近通知
async function fetchRecentNotifications() {
  try {
    const res = await notificationApi.list(1, 5)
    if (res.data.code === 0) {
      recentNotifications.value = res.data.data.list
    }
  } catch (error) {
    console.error('Failed to fetch recent notifications:', error)
  }
}

const refreshNotifications = () => {
  fetchUnreadCount()
  fetchRecentNotifications()
}

// 事件监听器引用
let eventUnsubscribe: (() => void) | null = null

watch(() => authStore.isAuthenticated, (isAuth) => {
  if (isAuth) {
    // 立即刷新
    refreshNotifications()

    // 启动定时轮询
    if (pollInterval) {
      clearInterval(pollInterval)
    }
    pollInterval = setInterval(refreshNotifications, 30000)

    // 监听更新事件
    eventUnsubscribe = Events.On('notification_updated', () => {
      refreshNotifications()
    })
  } else {
    // 清理定时器和事件监听
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
    if (eventUnsubscribe) {
      eventUnsubscribe()
      eventUnsubscribe = null
    }
  }
}, { immediate: true })

onUnmounted(() => {
  // 清理定时器和事件监听
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
  if (eventUnsubscribe) {
    eventUnsubscribe()
    eventUnsubscribe = null
  }
})
</script>

<template>
  <header class="page-header">
    <div>
      <h1 class="page-title">{{ pageTitle }}</h1>
    </div>
    <div class="page-actions">
      <div class="action-group ml-3">
        <!-- <button class="btn btn-ghost btn-icon" title="搜索">
          <i class="ri-search-line"></i>
        </button> -->
      </div>
      <button
        class="btn btn-ghost btn-icon"
        title="切换主题"
        @click="themeStore.toggleTheme"
      >
        <i :class="themeStore.effectiveTheme === 'dark' ? 'ri-moon-line' : 'ri-sun-line'"></i>
      </button>
      
      <!-- Notification Wrapper -->
      <div class="notification-wrapper relative">
        <button class="btn btn-ghost btn-icon relative" title="通知" @click.stop="toggleNotificationDropdown">
          <i class="ri-notification-3-line"></i>
          <span v-if="unreadCount > 0" class="notification-dot"></span>
        </button>
        
        <!-- Notification Dropdown -->
        <Transition name="dropdown">
          <div v-if="showNotificationDropdown" class="notification-dropdown" @click.stop>
            <div class="dropdown-header">
              <span class="font-medium">最近通知</span>
              <span class="text-xs text-primary cursor-pointer hover:underline" @click="goToNotifications">查看全部</span>
            </div>
            <div class="dropdown-list">
              <div v-if="recentNotifications.length === 0" class="empty-state">
                暂无通知
              </div>
              <div 
                v-for="item in recentNotifications" 
                :key="item.id" 
                class="dropdown-item"
                @click="handleNotificationClick(item)"
              >
                <div class="item-title truncate flex items-center gap-2">
                   <div class="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" v-if="!item.is_read"></div>
                   <span class="notification-type-badge" :class="'type-' + item.type">
                      {{ item.type === 2 ? '活动' : (item.type === 3 ? '私信' : '系统') }}
                   </span>
                   <span :class="{'unread-title': !item.is_read, 'read-title': item.is_read}">{{ item.title }}</span>
                </div>
                <div class="item-time">{{ new Date(item.create_time).toLocaleDateString() }}</div>
              </div>
            </div>
          </div>
        </Transition>
        <div v-if="showNotificationDropdown" class="menu-overlay" @click="closeNotificationDropdown"></div>
      </div>

      <!-- 用户头像下拉菜单 -->
      <div class="user-menu-wrapper">
        <button
          class="user-avatar-btn"
          title="用户菜单"
          @click.stop="toggleUserMenu"
        >
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="user-avatar-svg">
            <defs>
              <linearGradient id="headerAvatarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#FF8A00" />
                <stop offset="100%" style="stop-color:#FF5C00" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="50" fill="url(#headerAvatarGradient)" />
            <text x="50" y="50" fill="white" font-size="40" font-weight="600" text-anchor="middle" dominant-baseline="central">{{ userInitial }}</text>
          </svg>
        </button>
        <!-- 下拉菜单 -->
        <Transition name="dropdown">
          <div v-if="showUserMenu" class="user-dropdown" @click.stop>
            <div class="user-dropdown-item" @click="goToSettings">
              <i class="ri-user-line"></i>
              <span>个人信息</span>
            </div>
            <div class="user-dropdown-divider"></div>
            <div class="user-dropdown-item logout" @click="handleLogout">
              <i class="ri-logout-box-r-line"></i>
              <span>退出登录</span>
            </div>
          </div>
        </Transition>
        <!-- 点击外部关闭 -->
        <div v-if="showUserMenu" class="user-menu-overlay" @click="closeUserMenu"></div>
      </div>
    </div>
    <NotificationDetailModal 
      v-model="showDetailModal"
      :notification="selectedNotification"
    />
  </header>
</template>

<style scoped>
.user-menu-wrapper, .notification-wrapper {
  position: relative;
}

.user-avatar-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  padding: 0;
  cursor: pointer;
  margin-left: var(--spacing-sm);
  transition: transform 0.2s, box-shadow 0.2s;
}

.user-avatar-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(255, 138, 0, 0.3);
}

.user-avatar-svg {
  width: 100%;
  height: 100%;
  display: block;
}

.user-dropdown, .notification-dropdown {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  background: var(--bg-elevated);
  backdrop-filter: blur(30px) saturate(180%);
  -webkit-backdrop-filter: blur(30px) saturate(180%);
  border-radius: var(--radius-lg);
  box-shadow: 
    0 20px 60px -10px rgba(0, 0, 0, 0.3),
    0 10px 20px -5px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
  z-index: 1001;
  transform-origin: top right;
}

.user-dropdown {
  min-width: 180px;
  padding: var(--spacing-xs) 0;
}

.notification-dropdown {
  width: 320px;
  display: flex;
  flex-direction: column;
}

.dropdown-header {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(0,0,0,0.04);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
}

[data-theme="dark"] .dropdown-header {
  border-bottom-color: rgba(255,255,255,0.06);
}

.dropdown-list {
  max-height: 320px;
  overflow-y: auto;
}

.empty-state {
  padding: 32px;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 13px;
}

.dropdown-item:hover {
  background: linear-gradient(90deg, rgba(var(--color-primary-rgb), 0.08), transparent);
  padding-left: calc(var(--spacing-md) + 4px); /* Shift effect */
}

.dropdown-item {
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
  border-bottom: 1px solid rgba(0,0,0,0.03);
}

[data-theme="dark"] .dropdown-item {
  border-bottom-color: rgba(255,255,255,0.04);
}

.item-title {
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.item-time {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-left: 24px; /* Align with text, skipping badge */
}

.user-dropdown-item:hover {
  background: linear-gradient(90deg, rgba(var(--color-primary-rgb), 0.08), transparent);
  color: var(--color-primary);
}

.user-dropdown-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: 10px 16px;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.user-dropdown-item i {
  font-size: 18px;
  color: var(--text-secondary);
  transition: color 0.2s;
}

.user-dropdown-item:hover i {
  color: var(--color-primary);
}

.user-dropdown-item.logout {
  color: var(--color-danger);
}

.user-dropdown-item.logout i {
  color: var(--color-danger);
}

.user-dropdown-divider {
  height: 1px;
  background: rgba(0,0,0,0.06);
  margin: 4px 0;
}

[data-theme="dark"] .user-dropdown-divider {
  background: rgba(255,255,255,0.08);
}

.user-menu-overlay, .menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
}

/* 下拉动画 */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.96);
}

.unread-title {
  font-weight: 600;
  color: var(--text-primary);
}

.read-title {
  color: var(--text-secondary);
}

/* Neon Badges */
.notification-type-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
  white-space: nowrap;
  letter-spacing: 0.5px;
}

/* System - Slate */
.type-1 {
  background: rgba(100, 116, 139, 0.1);
  color: #64748b;
  box-shadow: 0 0 5px rgba(100, 116, 139, 0.1);
}

/* Activity - Red (Neon) */
.type-2 {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.25);
}

/* Private - Violet (Neon) */
.type-3 {
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
  box-shadow: 0 0 8px rgba(139, 92, 246, 0.25);
}

</style>


