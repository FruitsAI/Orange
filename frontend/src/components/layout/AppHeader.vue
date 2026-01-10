<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
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

const pageTitle = computed(() => (route.meta.title as string) || '工作台')
const userInitial = computed(() => {
  const name = authStore.user?.name || authStore.user?.username || 'U'
  return name.charAt(0).toUpperCase()
})
const showUserMenu = ref(false)
const showNotificationDropdown = ref(false)
const unreadCount = ref(0)
const recentNotifications = ref<Notification[]>([])
const showDetailModal = ref(false)
const selectedNotification = ref<Notification | null>(null)
let pollInterval: number | null = null

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

async function handleNotificationClick(item: Notification) {
  closeNotificationDropdown()
  selectedNotification.value = item
  showDetailModal.value = true
  
  if (!item.is_read) {
    try {
      await notificationApi.markAsRead(item.id)
      // 更新本地状态
      item.is_read = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
      // 通知其他组件更新
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

onMounted(() => {
  if (authStore.isAuthenticated) {
    refreshNotifications()
    // 简单的轮询机制，每30秒更新一次
    pollInterval = setInterval(refreshNotifications, 30000)
    
    // 监听自定义事件
    Events.On('notification_updated', refreshNotifications)
  }
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
  Events.Off('notification_updated')
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
  top: calc(100% + 8px);
  right: 0;
  background: var(--bg-elevated);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  border: 1px solid var(--border-color);
  z-index: 1001;
}

.user-dropdown {
  min-width: 160px;
  padding: var(--spacing-xs) 0;
}

.notification-dropdown {
  width: 280px;
  display: flex;
  flex-direction: column;
}

.dropdown-header {
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.dropdown-list {
  max-height: 300px;
  overflow-y: auto;
}

.dropdown-item {
  padding: var(--spacing-sm) var(--spacing-md);
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid var(--border-color-light);
}

.dropdown-item:hover {
  background: rgba(var(--text-primary-rgb), 0.05);
}

.item-title {
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.item-time {
  font-size: 12px;
  color: var(--text-tertiary);
}

.empty-state {
  padding: var(--spacing-md);
  text-align: center;
  color: var(--text-tertiary);
  font-size: 13px;
}

.dropdown-footer {
  padding: var(--spacing-xs) 0;
  text-align: center;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  border-top: 1px solid var(--border-color);
  transition: color 0.2s;
}

.dropdown-footer:hover {
  color: var(--color-primary);
}

.user-dropdown-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  color: var(--text-primary);
  cursor: pointer;
  transition: background 0.2s;
  font-size: 14px;
}

.user-dropdown-item:hover {
  background: rgba(var(--text-primary-rgb), 0.05);
}

.user-dropdown-item i {
  font-size: 18px;
  color: var(--text-secondary);
}

.user-dropdown-item.logout {
  color: var(--color-danger);
}

.user-dropdown-item.logout i {
  color: var(--color-danger);
}

.user-dropdown-divider {
  height: 1px;
  background: var(--border-color);
  margin: var(--spacing-xs) 0;
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
  transition: opacity 0.2s, transform 0.2s;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.unread-title {
  font-weight: 600;
  color: #111827;
}

[data-theme='dark'] .unread-title {
  color: #f3f4f6;
}

.read-title {
  color: #9ca3af;
}

.notification-type-badge {
  font-size: 11px;
  padding: 1px 4px;
  border-radius: 4px;
  border: 1px solid currentColor;
  font-weight: 500;
  margin-right: 4px;
  white-space: nowrap;
}

/* System Notification */
.type-1 {
  color: #64748b; /* Slate-500 */
  background: #f8fafc; /* Slate-50 */
  border-color: #cbd5e1; /* Slate-300 */
}

/* Activity Notification */
.type-2 {
  color: #ef4444; /* Red-500 */
  background: #fef2f2; /* Red-50 */
  border-color: #fca5a5; /* Red-300 */
}

/* Private Notification */
.type-3 {
  color: #8b5cf6; /* Violet-500 */
  background: #f5f3ff; /* Violet-50 */
  border-color: #c4b5fd; /* Violet-300 */
}

</style>


