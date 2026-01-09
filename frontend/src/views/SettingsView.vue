<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authApi } from '@/api/auth'
import api from '@/api'
import { dictionaryApi, type Dictionary, type DictionaryItem } from '@/api/dictionary'
import { notificationApi, type Notification, type UserBrief } from '@/api/notification'
import NotificationDetailModal from '@/components/notification/NotificationDetailModal.vue'
import GlassCard from '@/components/common/GlassCard.vue'
import { useConfirm } from '@/composables/useConfirm'
import { useToast } from '@/composables/useToast'
import { Browser, Events } from '@wailsio/runtime'

import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import pkg from '../../package.json'


const route = useRoute()
const router = useRouter()
const { confirm } = useConfirm()
const toast = useToast()

const activeTab = ref(route.query.tab as string || 'profile')

// Watch route tab change
watch(() => route.query.tab, (newTab) => {
  if (newTab) {
    activeTab.value = newTab as string
  }
})

// Update route when tab changes
watch(activeTab, (newTab) => {
  router.replace({ query: { ...route.query, tab: newTab } })
  
  if (newTab === 'notification') {
    loadNotifications()
    if (isAdmin.value) {
      loadTargetUsers()
    }
  }
})

// Watch route id for deep linking to notification detail
watch(() => route.query.id, async (newId) => {
  if (newId && activeTab.value === 'notification') {
    const id = parseInt(newId as string)
    if (!isNaN(id)) {
      try {
        const res = await notificationApi.get(id)
        if (res.data.code === 0) {
          viewNotificationDetail(res.data.data)
        }
      } catch (error) {
        console.error('Failed to load notification detail:', error)
      }
    }
  }
}, { immediate: true })

const authStore = useAuthStore()

const settingsNav = computed(() => {
  const items = [
    { key: 'profile', icon: 'ri-user-line', label: '个人信息' },
    { key: 'security', icon: 'ri-lock-line', label: '安全设置' },
    { key: 'appearance', icon: 'ri-palette-line', label: '外观设置' },
    { key: 'notification', icon: 'ri-notification-3-line', label: '通知设置' },
    { key: 'about', icon: 'ri-information-line', label: '关于' },
  ]
  
  if (authStore && authStore.user?.role === 'admin') {
    // 管理员专属菜单
    items.splice(1, 0, { key: 'dictionary', icon: 'ri-book-2-line', label: '字典管理' })
  }
  
  return items
})

// ============ Profile Logic ============
const profile = ref({
  name: '',
  position: '',
  email: '',
  phone: '',
  department: '',
})

// Store original profile for comparison
const originalProfile = ref({ ...profile.value }) // Initialize empty

// Fetch current user
const fetchProfile = async () => {
  try {
    const res = await authApi.getCurrentUser()
    if (res.data.code === 0 && res.data.data) {
      const user = res.data.data
      profile.value = {
        name: user.name || '',
        position: user.position || '',
        email: user.email || '',
        phone: user.phone || '',
        department: user.department || '',
      }
      // Update original profile
      originalProfile.value = { ...profile.value }
    }
  } catch (error) {
    console.error('Failed to fetch profile:', error)
  }
}

// Update profile
const saveProfile = async () => {
  // Check if modified
  const isModified =
    profile.value.name !== originalProfile.value.name ||
    profile.value.position !== originalProfile.value.position ||
    profile.value.email !== originalProfile.value.email ||
    profile.value.phone !== originalProfile.value.phone ||
    profile.value.department !== originalProfile.value.department

  if (!isModified) {
    toast.info('未做任何修改')
    return
  }

  try {
    const res = await authApi.updateProfile({
      name: profile.value.name,
      position: profile.value.position,
      email: profile.value.email, // Add email
      phone: profile.value.phone,
      department: profile.value.department,
    })
    if (res.data.code === 0) {
      toast.success('保存成功')
      // Update original profile after success
      originalProfile.value = { ...profile.value }
    } else {
      toast.error(`保存失败: ${res.data.message}`)
    }
  } catch (error) {
    console.error('Failed to update profile:', error)
    toast.error('保存失败')
  }
}

// ============ Dictionary Logic ============
const activeDictId = ref<string>('') // Holds Dictionary Code

const dictionaries = ref<Dictionary[]>([])
const activeDictItems = ref<DictionaryItem[]>([])

// Fetch dictionary list
const fetchDictionaries = async () => {
  try {
    const res = await dictionaryApi.list()
    if (res.data.code === 0) {
      dictionaries.value = res.data.data
      if (dictionaries.value.length > 0 && !activeDictId.value) {
        const firstDict = dictionaries.value[0]
        if (firstDict) {
          activeDictId.value = firstDict.code
        }
      }
    }
  } catch (error) {
    console.error('Failed to fetch dictionaries:', error)
  }
}

// Fetch items for selected dictionary
const fetchDictItems = async (code: string) => {
  if (!code) return
  try {
    const res = await dictionaryApi.getItems(code)
    if (res.data.code === 0) {
      activeDictItems.value = res.data.data
    }
  } catch (error) {
    console.error(`Failed to fetch items for ${code}:`, error)
  }
}

// Watch active dictionary selection change
watch(activeDictId, (newCode) => {
  if (newCode) {
    fetchDictItems(newCode)
  }
})

// Modal Logic
const showModal = ref(false)
const isEditing = ref(false)
const modalForm = ref({
  id: 0,
  label: '',
  value: '',
  sort: 0
})

const openAddModal = () => {
  isEditing.value = false
  modalForm.value = { id: 0, label: '', value: '', sort: activeDictItems.value.length + 1 }
  showModal.value = true
}

const openEditModal = (item: DictionaryItem) => {
  isEditing.value = true
  modalForm.value = {
    id: item.id,
    label: item.label,
    value: item.value,
    sort: item.sort
  }
  showModal.value = true
}

const handleModalSubmit = async () => {
  if (!activeDictId.value) return
  
  const label = modalForm.value.label.trim()
  const value = modalForm.value.value.trim()
  
  if (!label || !value) {
    toast.warning('请输入名称和值')
    return
  }
  
  try {
    let res
    if (isEditing.value) {
      res = await dictionaryApi.updateItem(activeDictId.value, modalForm.value.id, {
        label,
        value,
        sort: modalForm.value.sort
      })
    } else {
      res = await dictionaryApi.createItem(activeDictId.value, {
        label,
        value,
        sort: modalForm.value.sort
      })
    }
    
    if (res.data.code === 0) {
      toast.success(isEditing.value ? '修改成功' : '添加成功')
      showModal.value = false
      fetchDictItems(activeDictId.value)
    } else {
      toast.error(`${isEditing.value ? '修改' : '添加'}失败: ${res.data.message}`)
    }
  } catch (error) {
    console.error('Failed to save item:', error)
    toast.error(isEditing.value ? '修改失败' : '添加失败')
  }
}

const deleteDictItem = async (id: number) => {
  if (!activeDictId.value) return
  const confirmed = await confirm('确定要删除这个选项吗？')
  if (confirmed) {
    try {
      const res = await dictionaryApi.deleteItem(activeDictId.value, id)
      if (res.data.code === 0) {
        await fetchDictItems(activeDictId.value)
        toast.success('删除成功')
      }
    } catch (error) {
      console.error('Failed to delete item:', error)
      toast.error('删除失败')
    }
  }
}



// ============ Notification Logic (Everyone) ============
const notifications = ref<Notification[]>([])
const notificationTotal = ref(0)
const targetUsers = ref<UserBrief[]>([])
const notificationLoading = ref(false)
const showCreateNotificationModal = ref(false)
const creatingNotification = ref(false)
const newNotification = ref({
  title: '',
  content: '',
  type: 'system',
  target_user_id: 0,
})

// 分页状态
const notificationCurrentPage = ref(1)
const notificationPageSize = ref(5)

// 详情/编辑弹窗状态
const showNotificationDetailModal = ref(false)
const selectedNotification = ref<Notification | null>(null)
const isEditingNotification = ref(false)

// 简单的权限判断 (从 authStore 获取)
const isAdmin = computed(() => authStore.user?.role === 'admin')

// 分页计算
const notificationTotalPages = computed(() => Math.ceil(notificationTotal.value / notificationPageSize.value))

const notificationPaginationInfo = computed(() => {
  const total = notificationTotal.value
  if (total === 0) return '暂无数据'
  const start = (notificationCurrentPage.value - 1) * notificationPageSize.value + 1
  const end = Math.min(notificationCurrentPage.value * notificationPageSize.value, total)
  return `显示 ${start}-${end} 条，共 ${total} 条`
})

// 分页操作
const notificationPrevPage = () => {
  if (notificationCurrentPage.value > 1) {
    notificationCurrentPage.value--
    loadNotifications()
  }
}

const notificationNextPage = () => {
  if (notificationCurrentPage.value < notificationTotalPages.value) {
    notificationCurrentPage.value++
    loadNotifications()
  }
}

const notificationGoToPage = (page: number) => {
  notificationCurrentPage.value = page
  loadNotifications()
}

// 监听 pageSize 变化重置页码
watch(notificationPageSize, () => {
  notificationCurrentPage.value = 1
  loadNotifications()
})

const loadNotifications = async () => {
  notificationLoading.value = true
  try {
    const res = await notificationApi.list(notificationCurrentPage.value, notificationPageSize.value)
    if (res.data.code === 0) {
      notifications.value = res.data.data.list
      notificationTotal.value = res.data.data.total
    }
  } catch (error) {
    console.error('Failed to load notifications:', error)
  } finally {
    notificationLoading.value = false
  }
}

const loadTargetUsers = async () => {
  try {
    const res = await notificationApi.getUsers()
    if (res.data.code === 0) {
      targetUsers.value = res.data.data
    }
  } catch (error) {
    console.error('Failed to load users:', error)
  }
}

const handleCreateNotification = async () => {
  if (!newNotification.value.title || !newNotification.value.content) {
    toast.error('请填写标题和内容')
    return
  }
  creatingNotification.value = true
  try {
    const res = await notificationApi.create(newNotification.value)
    if (res.data.code === 0) {
      toast.success('发送成功')
      showCreateNotificationModal.value = false
      newNotification.value = { title: '', content: '', type: 'system', target_user_id: 0 }
      loadNotifications()
    } else {
      toast.error(res.data.message || '发送失败')
    }
  } catch (error) {
    console.error('Failed to create notification:', error)
    toast.error('发送失败')
  } finally {
    creatingNotification.value = false
  }
}

const handleDeleteNotification = async (id: number) => {
  const confirmed = await confirm({ title: '确认删除', message: '确定要删除这条通知吗？' })
  if (confirmed) {
    try {
      const res = await notificationApi.delete(id)
      if (res.data.code === 0) {
        toast.success('删除成功')
        loadNotifications()
      }
    } catch (error) {
      console.error('Failed to delete notification:', error)
      toast.error('删除失败')
    }
  }
}

// 查看详情（自动标记已读）
const viewNotificationDetail = async (notification: Notification) => {
  selectedNotification.value = notification
  isEditingNotification.value = false
  showNotificationDetailModal.value = true
  
  // 仅针对未读通知进行标记
  if (!notification.is_read) {
    try {
      await notificationApi.markAsRead(notification.id)
      notification.is_read = true // 本地更新状态
      Events.Emit('notification_updated') // 通知 Header 更新数量
    } catch (error) {
      console.error('Mark as read failed', error)
    }
  }
}

// 编辑通知
const editNotification = (notification: Notification) => {
  // 类型转换 int -> string
  let typeStr = 'system'
  if (notification.type === 2) typeStr = 'activity'
  
  newNotification.value = {
    title: notification.title,
    content: notification.content,
    type: typeStr,
    target_user_id: notification.is_global === 1 ? 0 : 0 // 默认为0，因为私信我们无法轻易获取原目标用户ID
  }
  selectedNotification.value = notification
  isEditingNotification.value = true
  showCreateNotificationModal.value = true
}

const handleUpdateNotification = async () => {
    if (!selectedNotification.value) return 

    if (!newNotification.value.title || !newNotification.value.content) {
      toast.error('请填写标题和内容')
      return
    }
    
    creatingNotification.value = true
    try {
      const res = await notificationApi.update(selectedNotification.value.id, newNotification.value)
      if (res.data.code === 0) {
        toast.success('更新成功')
        showCreateNotificationModal.value = false
        loadNotifications()
      } else {
        toast.error(res.data.message || '更新失败')
      }
    } catch (error) {
      console.error('Failed to update notification:', error)
      toast.error('更新失败')
    } finally {
      creatingNotification.value = false
    }
}



// ...

// Template changes (Permission guards)
/*
    <GlassCard v-else-if="activeTab === 'notification'">
      <div class="glass-card-header border-b border-color-border p-md flex justify-between items-center">
        <h3 class="glass-card-title">通知管理</h3>
        <button v-if="isAdmin" class="btn btn-primary btn-sm" @click="showCreateNotificationModal = true">
          <i class="ri-add-line mr-2"></i>发送通知
        </button>
      </div>
      ...
          <div
            v-for="notification in notifications" 
            :key="notification.id"
            ...
          >
            ...
            <div class="notification-actions" v-if="isAdmin">
              <button class="btn btn-ghost btn-sm" @click.stop="editNotification(notification)" title="编辑">
                <i class="ri-edit-line"></i>
              </button>
              <button class="btn btn-ghost btn-sm text-danger" @click.stop="handleDeleteNotification(notification.id)" title="删除">
                <i class="ri-delete-bin-line"></i>
              </button>
            </div>
*/

// ============ Appearance Logic ============
const themeStore = useThemeStore()

const themes = [
  { value: 'auto', label: '跟随系统', icon: 'ri-computer-line' },
  { value: 'light', label: '浅色模式', icon: 'ri-sun-line' },
  { value: 'dark', label: '深色模式', icon: 'ri-moon-line' },
]

// ============ About Page Logic ============
const openGitHub = () => {
  Browser.OpenURL('https://github.com/FruitsAI/Orange')
}

// ============ Security Logic ============
const securityForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const handlePasswordChange = async () => {
  const { oldPassword, newPassword, confirmPassword } = securityForm.value

  if (!oldPassword || !newPassword || !confirmPassword) {
    toast.warning('请填写所有密码字段')
    return
  }

  if (newPassword !== confirmPassword) {
    toast.warning('两次输入的新密码不一致')
    return
  }

  if (newPassword.length < 6) {
    toast.warning('新密码长度不能少于6位')
    return
  }

  const success = await authStore.changePassword(oldPassword, newPassword)

  if (success) {
    toast.success('密码修改成功')
    // Reset form
    securityForm.value = {
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
    }
  } else {
    toast.error(authStore.error || '密码修改失败')
  }
}


// ============ About Logic ============
const checkingUpdate = ref(false)

const checkUpdate = async () => {
  checkingUpdate.value = true
  try {
    // 调用后端代理接口，避免 CORS 问题
    const { data } = await api.get('/system/updates/check')
    
    // 兼容后端返回结构: { code: 0, data: { tag_name: "v0.1.2", ... } }
    // api 拦截器会自动解包并返回 AxiosResponse，其中 data 是 ApiResponse
    // 但我们的拦截器 return response，所以这里 data 是 { code: 0, message: "success", data: { tag_name: ... } }
    // 还是说拦截器直接返回了 response.data? Note: api.interceptors.response.use returns response (line 55 of api/index.ts)
    // So 'data' here is the AxiosResponse.data, which is { code: 0, message: "...", data: { ... } }
    
    const releaseInfo = data.data
    const latestVersionTag = releaseInfo.tag_name 
    const htmlUrl = releaseInfo.html_url
    
    const cleanLatest = latestVersionTag.replace(/^v/, '')
    const cleanCurrent = pkg.version.replace(/^v/, '')
    
    if (cleanLatest === cleanCurrent) {
       toast.success(`当前已是最新版本 (v${cleanLatest})`)
    } else {
       const confirmed = await confirm({ 
         title: '发现新版本', 
         message: `检测到新版本 ${latestVersionTag}，当前版本 v${cleanCurrent}。是否前往下载？` 
       })
       
       if (confirmed) {
         Browser.OpenURL(htmlUrl)
       }
    }
  } catch (error) {
    console.error('Check update failed:', error)
    toast.error('检查更新失败，请稍后重试')
  } finally {
    checkingUpdate.value = false
  }
}

onMounted(() => {
  fetchProfile()
  fetchDictionaries()
  
  // Initial load for notification tab
  if (activeTab.value === 'notification') {
    loadNotifications()
    if (isAdmin.value) {
      loadTargetUsers()
    }
  }
})
</script>

<template>
  <div class="settings-view grid gap-lg">
    <!-- Settings Navigation -->
    <GlassCard class="p-0 h-fit nav-card">
      <div class="nav-header">设置</div>
      <div class="nav-list">
        <a
          v-for="item in settingsNav"
          :key="item.key"
          href="#"
          class="nav-item-settings"
          :class="{ active: activeTab === item.key }"
          @click.prevent="activeTab = item.key"
        >
          <i :class="[item.icon, 'nav-icon']"></i> <span class="nav-label">{{ item.label }}</span>
        </a>
      </div>
    </GlassCard>

    <!-- Main Content Area -->
    <GlassCard v-if="activeTab === 'profile'">
      <div class="glass-card-header border-b border-color-border p-md flex justify-between items-center">
        <h3 class="glass-card-title">个人信息</h3>
        <button class="btn btn-primary btn-sm" @click="saveProfile">保存更改</button>
      </div>
      <div class="profile-form">
        <div>
          <label class="form-label">姓名</label>
          <input type="text" v-model="profile.name" class="form-input" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off" />
        </div>
        <div>
          <label class="form-label">职位</label>
          <input type="text" v-model="profile.position" class="form-input" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off" />
        </div>
        <div>
          <label class="form-label">邮箱</label>
          <input type="email" v-model="profile.email" class="form-input" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off" />
        </div>
        <div>
          <label class="form-label">手机</label>
          <input type="tel" v-model="profile.phone" class="form-input" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off" />
        </div>
        <div class="col-span-2">
          <label class="form-label">部门</label>
          <input type="text" v-model="profile.department" class="form-input" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off" />
        </div>
      </div>
    </GlassCard>

    <!-- Dictionary Management -->
    <GlassCard
      v-else-if="activeTab === 'dictionary'"
      class="h-[600px] flex flex-col p-0 overflow-hidden"
    >
      <div class="glass-card-header border-b border-color-border p-md flex justify-between items-center">
        <h3 class="glass-card-title">字典管理</h3>
        <button class="btn btn-primary btn-sm" @click="openAddModal">
          <i class="ri-add-line"></i> 新增条目
        </button>
      </div>
      <div class="dict-layout flex-1 overflow-hidden">
        <!-- Left: Categories -->
        <div class="dict-sidebar">
          <div
            v-for="dict in dictionaries"
            :key="dict.id"
            class="dict-nav-item"
            :class="{ active: activeDictId === dict.code }"
            @click="activeDictId = dict.code"
          >
            {{ dict.name }}
          </div>
        </div>
        <!-- Right: Items -->
        <div class="dict-content">
          <div class="dict-list">
            <div v-for="item in activeDictItems" :key="item.id" class="dict-item">
              <div class="flex flex-col">
                 <span class="font-medium">{{ item.label }}</span>
                 <span class="text-xs text-secondary">{{ item.value }}</span>
              </div>
              <div class="flex gap-2">
                <button
                  class="btn btn-ghost btn-icon btn-sm text-primary"
                  @click="openEditModal(item)"
                >
                  <i class="ri-edit-line"></i>
                </button>
                <button
                  class="btn btn-ghost btn-icon btn-sm text-danger"
                  @click="deleteDictItem(item.id)"
                >
                  <i class="ri-delete-bin-line"></i>
                </button>
              </div>
            </div>
            <div v-if="activeDictItems.length === 0" class="text-secondary text-sm text-center py-4">
               暂无数据
            </div>
          </div>
        </div>
      </div>
    </GlassCard>



    <!-- Security Settings -->
    <GlassCard v-else-if="activeTab === 'security'">
      <div class="glass-card-header border-b border-color-border p-md flex justify-between items-center">
        <h3 class="glass-card-title">安全设置</h3>
        <button class="btn btn-primary btn-sm" @click="handlePasswordChange">修改密码</button>
      </div>
      <div class="security-form p-md">
        <div class="form-group mb-md">
          <label class="form-label">当前密码</label>
          <input
            type="password"
            v-model="securityForm.oldPassword"
            class="form-input"
            placeholder="请输入当前密码"
            spellcheck="false"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
          />
        </div>
        <div class="form-group mb-md">
          <label class="form-label">新密码</label>
          <input
            type="password"
            v-model="securityForm.newPassword"
            class="form-input"
            placeholder="请输入新密码（至少6位）"
            spellcheck="false"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
          />
        </div>
        <div class="form-group mb-md">
          <label class="form-label">确认新密码</label>
          <input
            type="password"
            v-model="securityForm.confirmPassword"
            class="form-input"
            placeholder="请再次输入新密码"
            spellcheck="false"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
          />
        </div>
      </div>
    </GlassCard>

    <!-- Notification Settings (Admin Only) -->
    <GlassCard v-else-if="activeTab === 'notification'">
      <div class="glass-card-header border-b border-color-border p-md flex justify-between items-center">
        <h3 class="glass-card-title">通知管理</h3>
        <button v-if="isAdmin" class="btn btn-primary btn-sm" @click="showCreateNotificationModal = true">
          <i class="ri-add-line mr-2"></i>发送通知
        </button>
      </div>
      <div class="p-md">
        <!-- 通知列表 -->
        <div v-if="notificationLoading" class="text-center py-lg">
          <i class="ri-loader-4-line animate-spin text-2xl text-secondary"></i>
        </div>
        <div v-else-if="notifications.length === 0" class="text-center py-lg text-secondary">
          暂无通知
        </div>
        <div v-else class="notification-list">
          <div
            v-for="notification in notifications"
            :key="notification.id"
            class="notification-card"
            @click="viewNotificationDetail(notification)"
          >
            <div class="notification-content">
              <div class="notification-header">
                <span class="notification-type-badge" :class="'type-' + notification.type">
                  {{ notification.type === 2 ? '活动' : (notification.type === 3 ? '私信' : '系统') }}
                </span>
                <span class="notification-target">
                  {{ notification.is_global === 1 ? '全员通知' : '私信通知' }}
                </span>
              </div>
              <h4 class="notification-title flex items-center gap-2">
                <div class="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" v-if="!notification.is_read"></div>
                <span :class="{'unread-title': !notification.is_read, 'read-title': notification.is_read}">{{ notification.title }}</span>
              </h4>
              <p class="notification-desc">{{ notification.content }}</p>
              <div class="notification-meta">
                {{ new Date(notification.create_time).toLocaleString() }}
                <span v-if="notification.sender"> · 发送者: {{ notification.sender.name }}</span>
              </div>
            </div>
            <div class="notification-actions" v-if="isAdmin">
              <button
                class="btn btn-ghost btn-sm"
                @click.stop="editNotification(notification)"
                title="编辑"
              >
                <i class="ri-edit-line"></i>
              </button>
              <button
                class="btn btn-ghost btn-sm text-danger"
                @click.stop="handleDeleteNotification(notification.id)"
                title="删除"
              >
                <i class="ri-delete-bin-line"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- 分页 -->
        <div v-if="notifications.length > 0" class="notification-pagination">
          <div class="pagination-left">
            <span class="pagination-info">{{ notificationPaginationInfo }}</span>
            <div class="page-size-selector">
              <select v-model="notificationPageSize" class="page-select">
                <option :value="5">5条/页</option>
                <option :value="10">10条/页</option>
              </select>
            </div>
          </div>
          <div class="pagination-controls">
            <button class="btn btn-sm btn-ghost" :disabled="notificationCurrentPage === 1" @click="notificationPrevPage">
              <i class="ri-arrow-left-s-line"></i>
            </button>
            <div class="page-numbers">
              <button
                v-for="page in notificationTotalPages"
                :key="page"
                class="btn btn-sm page-btn"
                :class="{ active: notificationCurrentPage === page }"
                @click="notificationGoToPage(page)"
              >
                {{ page }}
              </button>
            </div>
            <button class="btn btn-sm btn-ghost" :disabled="notificationCurrentPage === notificationTotalPages" @click="notificationNextPage">
              <i class="ri-arrow-right-s-line"></i>
            </button>
          </div>
        </div>
      </div>
    </GlassCard>

    <!-- Appearance Settings -->
    <GlassCard v-else-if="activeTab === 'appearance'">
      <div class="glass-card-header border-b border-color-border p-md">
        <h3 class="glass-card-title">外观设置</h3>
      </div>
      <div class="appearance-form p-md">
        <div class="form-group">

          <div class="grid grid-cols-3 gap-4">
            <div
              v-for="t in themes"
              :key="t.value"
              class="theme-card"
              :class="{ active: themeStore.theme === t.value }"
              @click="themeStore.setTheme(t.value)"
            >
              <div class="theme-icon">
                 <i :class="t.icon"></i>
              </div>
              <span class="theme-label">{{ t.label }}</span>
              <div class="theme-check" v-if="themeStore.theme === t.value">
                <i class="ri-check-line"></i>
              </div>
            </div>
          </div>

        </div>
      </div>
    </GlassCard>



    <!-- About Page -->
    <GlassCard v-else-if="activeTab === 'about'" class="h-auto min-h-full">
      <div class="flex flex-col items-center justify-center py-40 px-12 gap-8">
        <!-- Logo & Title -->
        <div class="text-center w-full flex flex-col items-center">
          <img src="/orange.png" alt="Orange Logo" style="margin-bottom: 1rem;" class="w-28 h-28 object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-500" />
          <h2 style="margin-bottom: 0.3rem; color: #FF9F0A;" class="text-4xl font-bold tracking-tight">Orange</h2>
          <div class="flex items-center justify-center gap-4">
            <span style="padding: 0.2rem 0.3rem;" class="rounded-full bg-blue-500/10 text-blue-500 text-sm font-bold border border-blue-500/20 shadow-sm">v{{ pkg.version }}</span>
            <span class="text-secondary text-base">小旭姐专属记账工具</span>
          </div>
        </div>

        <!-- Info Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-12 w-full max-w-6xl">
          <!-- Author Card -->
          <div style="padding: 2.5rem 2rem;" class="group relative bg-gray-100 dark:bg-white/10 border border-gray-300 dark:border-white/10 rounded-[2rem] flex flex-col items-center text-center transition-all hover:-translate-y-2 hover:bg-white dark:hover:bg-white/20 hover:shadow-2xl hover:shadow-blue-500/10 hover:border-blue-500/30 shadow-sm">
            <div style="margin-bottom: 1rem;" class="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <i class="ri-user-smile-line text-3xl"></i>
            </div>
            <div style="margin-bottom: 0.3rem;" class="text-sm text-secondary font-medium">作者</div>
            <div style="color: #FF9F0A;" class="text-xl font-bold">willxue</div>
          </div>
          
          <!-- WeChat Card -->
          <div style="padding: 2.5rem 2rem;" class="group relative bg-gray-100 dark:bg-white/10 border border-gray-300 dark:border-white/10 rounded-[2rem] flex flex-col items-center text-center transition-all hover:-translate-y-2 hover:bg-white dark:hover:bg-white/20 hover:shadow-2xl hover:shadow-green-500/10 hover:border-green-500/30 shadow-sm">
            <div style="margin-bottom: 1rem;" class="w-16 h-16 rounded-2xl bg-green-500/10 text-green-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <i class="ri-wechat-line text-3xl"></i>
            </div>
            <div style="margin-bottom: 0.3rem;" class="text-sm text-secondary font-medium">微信公众号</div>
            <div style="color: #FF9F0A;" class="text-xl font-bold">为学书院</div>
          </div>

          <!-- GitHub Card -->
          <div @click="openGitHub" style="padding: 2.5rem 2rem;" class="group relative bg-gray-100 dark:bg-white/10 border border-gray-300 dark:border-white/10 rounded-[2rem] flex flex-col items-center text-center transition-all hover:-translate-y-2 hover:bg-white dark:hover:bg-white/20 hover:shadow-2xl hover:shadow-gray-500/10 hover:border-gray-500/30 cursor-pointer shadow-sm">
            <div style="margin-bottom: 1rem;" class="w-16 h-16 rounded-2xl bg-gray-500/10 text-gray-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <i class="ri-github-line text-3xl"></i>
            </div>
            <div style="margin-bottom: 0.3rem;" class="text-sm text-secondary font-medium">开源地址</div>
            <div style="color: #FF9F0A;" class="text-xl font-bold flex items-center gap-2">
              FruitsAI/Orange <i class="ri-external-link-line text-base opacity-50"></i>
            </div>
          </div>
        </div>

        <!-- Tech Stack -->
        <div class="flex flex-wrap justify-center gap-5">
          <span style="padding: 0.2rem 0.3rem;" class="rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/20 text-base text-secondary font-medium font-mono hover:bg-white dark:hover:bg-white/10 transition-colors cursor-default shadow-sm">Wails v3</span>
          <span style="padding: 0.2rem 0.3rem;" class="rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/20 text-base text-secondary font-medium font-mono hover:bg-white dark:hover:bg-white/10 transition-colors cursor-default shadow-sm">Vue 3</span>
          <span style="padding: 0.2rem 0.3rem;" class="rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/20 text-base text-secondary font-medium font-mono hover:bg-white dark:hover:bg-white/10 transition-colors cursor-default shadow-sm">TypeScript</span>
          <span style="padding: 0.2rem 0.3rem;" class="rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/20 text-base text-secondary font-medium font-mono hover:bg-white dark:hover:bg-white/10 transition-colors cursor-default shadow-sm">Go</span>
        </div>

        <!-- Update Button -->
        <button class="btn btn-primary px-12 py-4 h-auto text-lg font-medium shadow-2xl shadow-orange-500/30 hover:shadow-orange-500/40 hover:-translate-y-1 transition-all rounded-xl" @click="checkUpdate" :disabled="checkingUpdate">
          <i class="ri-loop-left-line mr-3" :class="{ 'animate-spin': checkingUpdate }"></i>
          {{ checkingUpdate ? '正在检测...' : '检测更新' }}
        </button>

        <!-- Copyright -->
        <div class="text-sm text-tertiary opacity-60">
          Copyright © {{ new Date().getFullYear() }} FruitsAI. All rights reserved.
        </div>
      </div>
    </GlassCard>


    <!-- Notification Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showCreateNotificationModal" class="modal-overlay open" @click.self="showCreateNotificationModal = false">
          <div class="modal open">
            <div class="modal-header">
              <h3 class="modal-title">{{ isEditingNotification ? '编辑通知' : '发送通知' }}</h3>
              <button class="modal-close" @click="showCreateNotificationModal = false">
                <i class="ri-close-line"></i>
              </button>
            </div>
            <div class="modal-body">
              <div class="form-group mb-md">
                <label class="form-label">通知标题</label>
                <input
                  type="text"
                  v-model="newNotification.title"
                  class="form-input"
                  placeholder="请输入通知标题"
                />
              </div>
              <div class="form-group mb-md">
                <label class="form-label">通知内容</label>
                <textarea
                  v-model="newNotification.content"
                  class="form-input"
                  rows="4"
                  placeholder="请输入通知内容"
                ></textarea>
              </div>
              <div class="form-group mb-md">
                <label class="form-label">通知类型</label>
                <select v-model="newNotification.type" class="form-input">
                  <option value="system">系统通知</option>
                  <option value="activity">活动通知</option>
                </select>
              </div>
              <div class="form-group mb-md">
                <label class="form-label">发送对象</label>
                <select v-model="newNotification.target_user_id" class="form-input">
                  <option :value="0">全员通知</option>
                  <option v-for="user in targetUsers" :key="user.id" :value="user.id">
                    {{ user.name }} ({{ user.username }})
                  </option>
                </select>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" @click="showCreateNotificationModal = false">取消</button>
              <button class="btn btn-primary" @click="isEditingNotification ? handleUpdateNotification() : handleCreateNotification()" :disabled="creatingNotification">
                {{ creatingNotification ? '提交中...' : (isEditingNotification ? '更新' : '发送') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Notification Detail Modal -->
    <NotificationDetailModal
      v-model="showNotificationDetailModal"
      :notification="selectedNotification"
    />

    <!-- Dict Item Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showModal" class="confirm-overlay" @click.self="showModal = false">
          <div class="confirm-modal">
            <h3 class="confirm-title">{{ isEditing ? '编辑条目' : '新增条目' }}</h3>
            <div class="form-group mb-md text-left">
              <label class="form-label">名称 (Label)</label>
              <input
                v-model="modalForm.label"
                type="text"
                class="form-input"
                spellcheck="false"
                autocomplete="off"
              />
            </div>
            <div class="form-group mb-md text-left">
              <label class="form-label">值 (Value)</label>
              <input
                v-model="modalForm.value"
                type="text"
                class="form-input"
                spellcheck="false"
                autocomplete="off"
              />
            </div>
            <div class="form-group mb-xl text-left">
              <label class="form-label">排序 (Sort)</label>
              <input
                v-model.number="modalForm.sort"
                type="number"
                class="form-input"
                spellcheck="false"
                autocomplete="off"
              />
            </div>
            <div class="confirm-actions">
              <button class="btn btn-ghost" @click="showModal = false">取消</button>
              <button class="btn btn-primary" @click="handleModalSubmit">保存</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.settings-view {
  display: grid;
  grid-template-columns: 250px 1fr;
  min-height: 100%;
}

@media (max-width: 768px) {
  .settings-view {
    grid-template-columns: 1fr;
  }
}

.border-color-border {
  border-color: var(--separator-color);
}

.appearance-form {
  max-width: 600px;
}

.theme-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all 0.2s;
  gap: 12px;
}

.theme-card:hover {
  background: var(--bg-hover);
  border-color: var(--color-primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.theme-card.active {
  background: rgba(var(--color-primary-rgb), 0.05);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.theme-icon {
  font-size: 24px;
  margin-bottom: 4px;
}

.theme-label {
  font-size: 14px;
  font-weight: 500;
}

.theme-check {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}


.nav-header {
  padding: var(--spacing-md);
  font-weight: 600;
  border-bottom: 1px solid var(--separator-color);
}

.nav-list {
  display: flex;
  flex-direction: column;
}

.nav-item-settings {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  color: var(--text-secondary);
  transition: all 0.2s;
  border-radius: 0;
  text-decoration: none;
  border-left: 3px solid transparent;
  white-space: nowrap;
}

.nav-icon {
  margin-right: var(--spacing-sm);
}

.nav-item-settings:hover {
  background: rgba(var(--text-primary-rgb), 0.03);
  color: var(--text-primary);
}

[data-theme='dark'] .nav-item-settings:hover {
  background: rgba(255, 255, 255, 0.05);
}

.nav-item-settings.active {
  background: rgba(var(--color-primary-rgb), 0.1);
  color: var(--color-primary);
  border-left-color: var(--color-primary);
}

.form-label {
  display: block;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: var(--spacing-sm);
}

.form-input {
  width: 100%;
  padding: 8px 12px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  outline: none;
  transition: border-color 0.2s;
}

.form-input:focus {
  border-color: var(--color-primary);
}

/* 表单网格布局 */
.profile-form {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-lg);
}

.profile-form .col-span-2 {
  grid-column: span 2;
}

/* 小屏幕响应式 */
@media (max-width: 768px) {
  .profile-form {
    grid-template-columns: 1fr;
  }

  .profile-form .col-span-2 {
    grid-column: span 1;
  }

  /* 导航卡片改为水平滚动 */
  .nav-card {
    order: -1;
  }

  .nav-header {
    display: none;
  }

  .nav-list {
    flex-direction: row;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .nav-list::-webkit-scrollbar {
    display: none;
  }

  .nav-item-settings {
    border-left: none;
    border-bottom: 2px solid transparent;
    padding: var(--spacing-sm) var(--spacing-md);
    flex-shrink: 0;
  }

  .nav-item-settings.active {
    border-bottom-color: var(--color-primary);
    border-left-color: transparent;
  }

  .nav-icon {
    margin-right: var(--spacing-xs);
  }
}
/* Notification Settings Styles */
.notification-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.notification-card {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: var(--spacing-md);
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  transition: all 0.2s;
  cursor: pointer;
}

.notification-card:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.notification-content {
  flex: 1;
  min-width: 0;
  margin-right: var(--spacing-md);
}

.notification-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-xs);
}

.notification-type-badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid currentColor;
  font-weight: 500;
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

.notification-target {
  font-size: 12px;
  color: var(--text-tertiary);
}

.notification-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
  line-height: 1.4;
}

.notification-desc {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.notification-meta {
  font-size: 12px;
  color: var(--text-tertiary);
}

.notification-actions {
  display: flex;
  gap: var(--spacing-xs);
  opacity: 0;
  transition: opacity 0.2s;
}

.notification-card:hover .notification-actions {
  opacity: 1;
}

/* Dictionary Management Styles */
.dict-layout {
  display: flex;
  height: 100%;
}

.dict-sidebar {
  width: 200px;
  border-right: 1px solid var(--border-color);
  background: transparent;
  overflow-y: auto;
}

.dict-nav-item {
  padding: 12px 16px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-secondary);
  border-left: 3px solid transparent;
  transition: all 0.2s;
}

.dict-nav-item:hover {
  background: rgba(0, 0, 0, 0.05);
  color: var(--text-primary);
}

.dict-nav-item.active {
  background: white;
  color: var(--color-primary);
  border-left-color: var(--color-primary);
  font-weight: 500;
}

[data-theme='dark'] .dict-nav-item.active {
  background: rgba(255, 255, 255, 0.05);
}

.dict-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.dict-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dict-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f9fafb; /* Slightly gray for contrast */
  border: var(--glass-border-subtle);
  border-radius: var(--radius-sm);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: all 0.2s;
}

.dict-item:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}
[data-theme='dark'] .dict-item {
  background: rgba(255, 255, 255, 0.05);
}

@media (max-width: 640px) {
  .dict-layout {
    flex-direction: column;
  }
  .dict-sidebar {
    width: 100%;
    height: auto;
    border-right: none;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    overflow-x: auto;
  }
  .dict-nav-item {
    border-left: none;
    border-bottom: 2px solid transparent;
    white-space: nowrap;
  }
  .dict-nav-item.active {
    border-left: none;
    border-bottom-color: var(--color-primary);
  }
}

/* Reusing ConfirmModal styles for consistency */
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: all 0.5s cubic-bezier(0.19, 1, 0.22, 1);
}

[data-theme='dark'] .confirm-overlay {
  background: rgba(0, 0, 0, 0.5);
}

.confirm-modal {
  /* Liquid Glass Base */
  background: var(--bg-elevated);
  backdrop-filter: 
    blur(var(--glass-blur)) 
    saturate(var(--glass-saturation))
    brightness(var(--glass-brightness));
  -webkit-backdrop-filter: 
    blur(var(--glass-blur)) 
    saturate(var(--glass-saturation))
    brightness(var(--glass-brightness));
    
  border: var(--glass-border);
  border-radius: var(--radius-xl);
  box-shadow: 
    var(--glass-shadow-outer),
    0 20px 40px rgba(0,0,0,0.1);
    
  padding: 32px;
  width: 90%;
  max-width: 400px;
  text-align: center;
  position: relative;
  overflow: hidden;
  isolation: isolate;
}

/* Specular Highlight */
.confirm-modal::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--glass-specular);
  pointer-events: none;
  z-index: 0;
  border-radius: inherit;
  opacity: 0.6;
  mix-blend-mode: overlay;
}

/* Inner Glow */
.confirm-modal::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.15),
    inset 0 1px 2px rgba(255, 255, 255, 0.2);
  pointer-events: none;
  z-index: 1;
}

[data-theme='dark'] .confirm-modal::after {
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.08),
    inset 0 1px 2px rgba(255, 255, 255, 0.05);
}

.confirm-title, .form-group, .confirm-actions {
  position: relative;
  z-index: 2;
}

.confirm-title {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 24px;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.confirm-actions {
  display: flex;
  gap: 16px;
  justify-content: flex-end;
}
/* Transitions - Apple Spring */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-enter-active .confirm-modal,
.fade-leave-active .confirm-modal {
  transition: transform 0.5s cubic-bezier(0.19, 1, 0.22, 1);
}

.fade-enter-from .confirm-modal {
  transform: scale(0.9) translateY(20px);
}

.fade-leave-to .confirm-modal {
  transform: scale(0.95) translateY(10px);
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
</style>
