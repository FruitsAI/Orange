<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue'
import { authApi, type User, type CreateUserRequest, type UpdateUserRequest } from '@/api/auth'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'

const toast = useToast()
const { confirm } = useConfirm()

// State
const users = ref<User[]>([])
const total = ref(0)
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(5)
const keyword = ref('')

// Modal State
const showModal = ref(false)
const isEditing = ref(false)
const modalLoading = ref(false)
const showResetPwdModal = ref(false)

const form = reactive({
  id: 0,
  username: '',
  name: '',
  email: '',
  phone: '',
  role: 'user',
  position: '',
  department: '',
  status: 1,
  password: '' // Only for create
})

const resetPwdForm = reactive({
  id: 0,
  username: '',
  password: ''
})

// 统计计算
const adminCount = computed(() => users.value.filter(u => u.role === 'admin').length)
const userCount = computed(() => users.value.filter(u => u.role === 'user').length)

// Fetch Data
const fetchUsers = async () => {
  loading.value = true
  try {
    const res = await authApi.getUsers({
      page: currentPage.value,
      page_size: pageSize.value,
      keyword: keyword.value,
      _t: Date.now() // Force refresh
    })
    if (res.data.code === 0) {
      users.value = res.data.data.list
      total.value = res.data.data.total
    }
  } catch (error) {
    console.error(error)
    toast.error('获取用户列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  currentPage.value = 1
  fetchUsers()
}

// Pagination Logic
const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

const paginationInfo = computed(() => {
  if (total.value === 0) return '暂无数据'
  const start = (currentPage.value - 1) * pageSize.value + 1
  const end = Math.min(currentPage.value * pageSize.value, total.value)
  return `显示 ${start}-${end} 条，共 ${total.value} 条`
})

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
    fetchUsers()
  }
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    fetchUsers()
  }
}

const goToPage = (page: number) => {
  if (page !== currentPage.value) {
    currentPage.value = page
    fetchUsers()
  }
}

const visiblePages = computed(() => {
  const total = totalPages.value
  const current = currentPage.value
  const delta = 2 // Show 2 pages before and after current
  
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  
  const pages: (number | string)[] = [1]
  
  // Calculate range
  let start = current - delta
  let end = current + delta
  
  // Adjust window if close to start
  if (start <= 2) {
    start = 2
    end = Math.min(6, total - 1)
  }
  // Adjust window if close to end
  else if (end >= total - 1) {
    end = total - 1
    start = Math.max(total - 5, 2)
  }
  
  if (start > 2) {
    pages.push('...')
  }
  
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  
  if (end < total - 1) {
    pages.push('...')
  }
  
  if (total > 1) {
    pages.push(total)
  }
  
  return pages
})

// Actions
const openAddModal = () => {
  isEditing.value = false
  Object.assign(form, {
    id: 0,
    username: '',
    name: '',
    email: '',
    phone: '',
    role: 'user',
    position: '',
    department: '',
    status: 1,
    password: ''
  })
  showModal.value = true
}

const openEditModal = (user: User) => {
  isEditing.value = true
  Object.assign(form, {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    position: user.position,
    department: user.department,
    status: user.status,
    password: ''
  })
  showModal.value = true
}

const handleSubmit = async () => {
  if (!form.username || !form.name) {
    toast.warning('请填写必填项(用户名、姓名)')
    return
  }

  // 校验用户名格式 (小写字母开头 + 数字/小写字母组合，长度 <= 10)
  const usernameRegex = /^[a-z][a-z0-9]{0,9}$/
  if (!usernameRegex.test(form.username)) {
    toast.warning('用户名必须以小写字母开头，只能包含小写字母和数字，且长度不超过10位')
    return
  }

  if (!isEditing.value && !form.password) {
      toast.warning('创建用户必须设置初始密码')
      return
  }

  // 校验邮箱格式（如果有输入）
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (form.email && !emailRegex.test(form.email)) {
    toast.warning('邮箱格式不正确')
    return
  }

  // 校验手机号格式（如果有输入）
  const phoneRegex = /^1[3-9]\d{9}$/
  if (form.phone && !phoneRegex.test(form.phone)) {
    toast.warning('手机号格式不正确')
    return
  }
  
  modalLoading.value = true
  try {
    if (isEditing.value) {
      const updateData: UpdateUserRequest = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        department: form.department,
        position: form.position,
        role: form.role as 'admin' | 'user',
        status: form.status
      }
      const res = await authApi.updateUser(form.id, updateData)
      if (res.data.code === 0) {
        toast.success('更新成功')
        showModal.value = false
        fetchUsers()
      } else {
        toast.error(res.data.message || '更新失败')
      }
    } else {
      const createData: CreateUserRequest = {
        username: form.username,
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        role: form.role as 'admin'|'user'
      }
      const res = await authApi.createUser(createData)
      if (res.data.code === 0) {
        toast.success('创建成功')
        showModal.value = false
        
        // Reset state to ensure new user is visible
        keyword.value = '' 
        currentPage.value = 1
        
        // Wait a bit to ensure backend consistency and then fetch
        setTimeout(() => {
          fetchUsers()
        }, 300)
      } else {
        toast.error(res.data.message || '创建失败')
      }
    }
  } catch (error) {
    const msg = (error as Error).message || '操作失败'
    toast.error(msg)
  } finally {
    modalLoading.value = false
  }
}

const handleDelete = async (user: User) => {
  if (await confirm(`确定要删除用户 "${user.name}" 吗？此操作不可恢复。`)) {
    try {
      const res = await authApi.deleteUser(user.id)
      if (res.data.code === 0) {
        toast.success('删除成功')
        fetchUsers()
      } else {
        toast.error(res.data.message || '删除失败')
      }
    } catch {
      toast.error('删除失败')
    }
  }
}

// Reset Password
const openResetPwdModal = (user: User) => {
  resetPwdForm.id = user.id
  resetPwdForm.username = user.username
  resetPwdForm.password = ''
  showResetPwdModal.value = true
}

const handleResetPwd = async () => {
  if (!resetPwdForm.password || resetPwdForm.password.length < 8) {
    toast.warning('密码长度至少6位')
    return
  }
  
  try {
    const res = await authApi.resetPassword(resetPwdForm.id, resetPwdForm.password)
    if (res.data.code === 0) {
      toast.success('密码重置成功')
      showResetPwdModal.value = false
    } else {
      toast.error(res.data.message || '重置失败')
    }
  } catch {
    toast.error('重置失败')
  }
}

onMounted(() => {
  fetchUsers()
})
</script>

<template>
  <div class="user-management">
    <!-- 头部区域 -->
    <div class="dev-header">
      <div class="dev-header-content">
        <div class="dev-title-section">
          <div class="dev-icon-wrapper">
            <i class="ri-team-line"></i>
          </div>
          <div class="dev-title-info">
            <h2 class="dev-title">用户管理</h2>
            <p class="dev-subtitle">管理系统用户账户和权限设置</p>
          </div>
        </div>
        <button class="dev-create-btn" @click="openAddModal">
          <i class="ri-add-line"></i>
          <span>新增用户</span>
        </button>
      </div>

      <!-- 统计卡片 -->
      <div class="dev-stats">
        <div class="dev-stat-card">
          <div class="dev-stat-icon total">
            <i class="ri-group-line"></i>
          </div>
          <div class="dev-stat-info">
            <span class="dev-stat-value">{{ total }}</span>
            <span class="dev-stat-label">总用户</span>
          </div>
        </div>
        <div class="dev-stat-card">
          <div class="dev-stat-icon admin">
            <i class="ri-shield-user-line"></i>
          </div>
          <div class="dev-stat-info">
            <span class="dev-stat-value">{{ adminCount }}</span>
            <span class="dev-stat-label">管理员</span>
          </div>
        </div>
        <div class="dev-stat-card">
          <div class="dev-stat-icon user">
            <i class="ri-user-line"></i>
          </div>
          <div class="dev-stat-info">
            <span class="dev-stat-value">{{ userCount }}</span>
            <span class="dev-stat-label">普通用户</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="dev-content">
      <!-- 搜索栏 -->
      <div class="search-input-wrapper">
        <i class="ri-search-line search-icon"></i>
        <input 
          v-model="keyword" 
          type="text" 
          placeholder="搜索用户名或姓名..." 
          class="search-input"
          spellcheck="false"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          @keyup.enter="handleSearch"
        />
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="dev-loading">
        <div class="dev-loading-spinner">
          <i class="ri-loader-4-line animate-spin"></i>
        </div>
        <span>正在加载用户列表...</span>
      </div>

      <!-- 空状态 -->
      <div v-else-if="users.length === 0" class="dev-empty">
        <div class="dev-empty-icon">
          <i class="ri-user-unfollow-line"></i>
        </div>
        <h3 class="dev-empty-title">暂无用户</h3>
        <p class="dev-empty-desc">点击右上角按钮添加新用户</p>
      </div>

      <!-- 用户列表 -->
      <div v-else class="user-list">
        <div 
          v-for="user in users" 
          :key="user.id"
          class="user-card"
        >
          <!-- 用户头像 -->
          <div class="user-avatar" :class="user.role === 'admin' ? 'avatar-admin' : 'avatar-user'">
            <i :class="user.role === 'admin' ? 'ri-shield-user-fill' : 'ri-user-fill'"></i>
          </div>

          <!-- 用户信息 -->
          <div class="user-info">
            <div class="user-name-row">
              <span class="user-name">{{ user.name }}</span>
              <span class="user-role-badge" :class="user.role === 'admin' ? 'role-admin' : 'role-user'">
                {{ user.role === 'admin' ? '管理员' : '普通用户' }}
              </span>
              <span class="user-status" :class="user.status === 1 ? 'status-active' : 'status-disabled'">
                <span class="status-dot"></span>
                {{ user.status === 1 ? '正常' : '禁用' }}
              </span>
            </div>
            <div class="user-meta">
              <span class="meta-item">
                <i class="ri-at-line"></i> {{ user.username }}
              </span>
              <span v-if="user.department" class="meta-item">
                <i class="ri-building-line"></i> {{ user.department }}
              </span>
              <span v-if="user.position" class="meta-item">
                <i class="ri-briefcase-line"></i> {{ user.position }}
              </span>
            </div>
            <div v-if="user.email || user.phone" class="user-contact">
              <span v-if="user.email" class="contact-item">
                <i class="ri-mail-line"></i> {{ user.email }}
              </span>
              <span v-if="user.phone" class="contact-item">
                <i class="ri-phone-line"></i> {{ user.phone }}
              </span>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="user-actions">
            <button class="action-btn edit" @click="openEditModal(user)" title="编辑">
              <i class="ri-edit-line"></i>
            </button>
            <button class="action-btn key" @click="openResetPwdModal(user)" title="重置密码">
              <i class="ri-key-line"></i>
            </button>
            <button class="action-btn delete" @click="handleDelete(user)" title="删除">
              <i class="ri-delete-bin-line"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div v-if="users.length > 0" class="user-pagination">
        <div class="pagination-inner">
          <span class="pagination-info">{{ paginationInfo }}</span>
          
          <div class="pagination-controls">
            <button 
              class="page-btn" 
              :disabled="currentPage === 1" 
              @click="prevPage"
            >
              <i class="ri-arrow-left-s-line"></i>
            </button>
            
            <div class="page-numbers">
              <button
                v-for="(page, index) in visiblePages"
                :key="index"
                class="page-number"
                :class="{ active: currentPage === page, 'cursor-default': page === '...' }"
                :disabled="currentPage === page || page === '...'"
                @click="typeof page === 'number' && goToPage(page)"
              >
                {{ page }}
              </button>
            </div>
            
            <button 
              class="page-btn" 
              :disabled="currentPage === totalPages" 
              @click="nextPage"
            >
              <i class="ri-arrow-right-s-line"></i>
            </button>
          </div>
          
          <div class="page-size">
            <select v-model="pageSize" class="page-select" @change="handleSearch">
              <option :value="5">5条/页</option>
              <option :value="10">10条/页</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit/Create Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay open" @click.self="showModal = false">
        <div class="modal open" style="width: 560px; max-height: 90vh;">
          <div class="modal-header" style="border-bottom: 1px solid var(--separator-color); padding-bottom: 16px; margin-bottom: 24px;">
            <h3 class="modal-title">{{ isEditing ? '编辑用户' : '新增用户' }}</h3>
            <button class="modal-close" @click="showModal = false"><i class="ri-close-line"></i></button>
          </div>
          <div class="modal-body grid gap-4">
            <div class="grid grid-cols-2 gap-4">
              <div class="form-group">
                  <label class="form-label">用户名 <span class="text-danger">*</span></label>
                  <input type="text" v-model="form.username" class="form-input" :disabled="isEditing" spellcheck="false" autocomplete="off" />
              </div>
               <div class="form-group">
                  <label class="form-label">姓名 <span class="text-danger">*</span></label>
                  <input type="text" v-model="form.name" class="form-input" spellcheck="false" autocomplete="off" />
              </div>
            </div>
            
            <div v-if="!isEditing" class="form-group">
               <label class="form-label">初始密码 <span class="text-danger">*</span></label>
               <input type="password" v-model="form.password" class="form-input" autocomplete="new-password" spellcheck="false" />
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div class="form-group">
                   <label class="form-label">角色</label>
                   <div class="input-wrapper">
                     <select v-model="form.role" class="form-select">
                       <option value="user">普通用户</option>
                       <option value="admin">管理员</option>
                     </select>
                     <i class="ri-arrow-down-s-line select-arrow"></i>
                   </div>
               </div>
                <div class="form-group">
                   <label class="form-label">状态</label>
                   <div class="input-wrapper">
                     <select v-model="form.status" class="form-select">
                       <option :value="1">正常</option>
                       <option :value="0">禁用</option>
                     </select>
                     <i class="ri-arrow-down-s-line select-arrow"></i>
                   </div>
               </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
               <div class="form-group">
                  <label class="form-label">邮箱</label>
                  <input type="email" v-model="form.email" class="form-input" spellcheck="false" autocomplete="off" />
              </div>
               <div class="form-group">
                  <label class="form-label">手机</label>
                  <input type="text" v-model="form.phone" class="form-input" spellcheck="false" autocomplete="off" />
              </div>
            </div>

             <div class="grid grid-cols-2 gap-4">
               <div class="form-group">
                  <label class="form-label">部门</label>
                  <input type="text" v-model="form.department" class="form-input" spellcheck="false" autocomplete="off" />
              </div>
               <div class="form-group">
                  <label class="form-label">职位</label>
                  <input type="text" v-model="form.position" class="form-input" spellcheck="false" autocomplete="off" />
              </div>
            </div>

          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" @click="showModal = false">取消</button>
            <button class="btn btn-primary" :disabled="modalLoading" @click="handleSubmit">保存</button>
          </div>
        </div>
      </div>
    </Teleport>
    
    <!-- Reset Password Modal -->
    <Teleport to="body">
       <div v-if="showResetPwdModal" class="modal-overlay open" @click.self="showResetPwdModal = false">
        <div class="modal open" style="width: 400px">
          <div class="modal-header" style="border-bottom: 1px solid var(--separator-color); padding-bottom: 16px; margin-bottom: 24px;">
            <h3 class="modal-title">重置密码 - {{ resetPwdForm.username }}</h3>
            <button class="modal-close" @click="showResetPwdModal = false"><i class="ri-close-line"></i></button>
          </div>
          <div class="modal-body">
               <div class="form-group">
                  <label class="form-label">新密码 <span class="text-danger">*</span></label>
                  <input type="password" v-model="resetPwdForm.password" class="form-input" placeholder="请输入新密码" spellcheck="false" autocomplete="new-password" />
              </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" @click="showResetPwdModal = false">取消</button>
            <button class="btn btn-primary" @click="handleResetPwd">确认重置</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.user-management {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;
  min-height: 100%;
}

/* ===== 头部区域 ===== */
.dev-header {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.dev-header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.dev-title-section {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.dev-icon-wrapper {
  width: 3rem;
  height: 3rem;
  border-radius: 0.75rem;
  background: linear-gradient(135deg, rgba(255, 159, 10, 0.15) 0%, rgba(255, 159, 10, 0.05) 100%);
  border: 1px solid rgba(255, 159, 10, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: #FF9F0A;
  backdrop-filter: blur(8px);
}

.dev-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.02em;
}

.dev-subtitle {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0.25rem 0 0 0;
}

.dev-create-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  background: #FF9F0A;
  color: white;
  border: none;
  border-radius: 0.625rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 14px rgba(255, 159, 10, 0.3);
}

.dev-create-btn:hover {
  background: #E58909;
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(255, 159, 10, 0.4);
}

/* ===== 统计卡片 ===== */
.dev-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.dev-stat-card {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 1rem 1.25rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  transition: all 0.2s ease;
}

.dev-stat-card:hover {
  border-color: rgba(255, 159, 10, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.dev-stat-icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.625rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
}

.dev-stat-icon.total {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%);
  color: #3B82F6;
}

.dev-stat-icon.admin {
  background: linear-gradient(135deg, rgba(255, 159, 10, 0.15) 0%, rgba(255, 159, 10, 0.05) 100%);
  color: #FF9F0A;
}

.dev-stat-icon.user {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%);
  color: #22C55E;
}

.dev-stat-info {
  display: flex;
  flex-direction: column;
}

.dev-stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

.dev-stat-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 0.125rem;
}

/* ===== 内容区域 ===== */
.dev-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* 搜索栏 */
.search-input-wrapper {
  display: flex;
  align-items: center;
  padding: 0.625rem 1rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: 0.625rem;
  transition: all 0.2s;
}

.search-input-wrapper:focus-within {
  border-color: #FF9F0A;
  box-shadow: 0 0 0 3px rgba(255, 159, 10, 0.1);
}

.search-icon {
  font-size: 1rem;
  color: var(--text-tertiary);
  margin-right: 0.625rem;
}

.search-input {
  border: none !important;
  background: none !important;
  outline: none !important;
  box-shadow: none !important;
  font-size: 0.875rem;
  color: var(--text-primary);
  width: 100%;
}

.search-input::placeholder {
  color: var(--text-tertiary);
}

/* 加载和空状态 */
.dev-loading, .dev-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.dev-loading-spinner {
  font-size: 2rem;
  color: #FF9F0A;
  margin-bottom: 1rem;
}

.dev-empty-icon {
  width: 4rem;
  height: 4rem;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(255, 159, 10, 0.1) 0%, rgba(255, 159, 10, 0.05) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.75rem;
  color: #FF9F0A;
  margin-bottom: 1rem;
}

.dev-empty-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
}

.dev-empty-desc {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
}

/* ===== 用户列表 ===== */
.user-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  transition: all 0.2s ease;
}

.user-card:hover {
  border-color: rgba(255, 159, 10, 0.3);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}

/* 用户头像 */
.user-avatar {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.user-avatar.avatar-admin {
  background: linear-gradient(135deg, rgba(255, 159, 10, 0.15) 0%, rgba(255, 159, 10, 0.05) 100%);
  color: #FF9F0A;
}

.user-avatar.avatar-user {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%);
  color: #3B82F6;
}

/* 用户信息 */
.user-info {
  flex: 1;
  min-width: 0;
}

.user-name-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-bottom: 0.375rem;
}

.user-name {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-primary);
}

.user-role-badge {
  padding: 0.125rem 0.5rem;
  border-radius: 100px;
  font-size: 0.6875rem;
  font-weight: 600;
}

.user-role-badge.role-admin {
  background: rgba(255, 159, 10, 0.1);
  color: #FF9F0A;
}

.user-role-badge.role-user {
  background: rgba(150, 150, 150, 0.1);
  color: var(--text-secondary);
}

.user-status {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
}

.user-status .status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.user-status.status-active {
  color: #22C55E;
}

.user-status.status-active .status-dot {
  background: #22C55E;
}

.user-status.status-disabled {
  color: #EF4444;
}

.user-status.status-disabled .status-dot {
  background: #EF4444;
}

.user-meta, .user-contact {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.user-meta {
  margin-bottom: 0.25rem;
}

.meta-item, .contact-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.meta-item i, .contact-item i {
  font-size: 0.875rem;
  opacity: 0.7;
}

/* 操作按钮 */
.user-actions {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.action-btn {
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  transition: all 0.2s ease;
}

.action-btn.edit {
  color: #3B82F6;
}

.action-btn.edit:hover {
  background: rgba(59, 130, 246, 0.1);
}

.action-btn.key {
  color: #FF9F0A;
}

.action-btn.key:hover {
  background: rgba(255, 159, 10, 0.1);
}

.action-btn.delete {
  color: #EF4444;
}

.action-btn.delete:hover {
  background: rgba(239, 68, 68, 0.1);
}

/* ===== 分页 - 使用 !important 覆盖 main.css ===== */
.user-pagination {
  display: block !important;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-color);
}

.pagination-inner {
  display: grid !important;
  grid-template-columns: 1fr auto 1fr !important;
  align-items: center !important;
  gap: 1rem;
}

.pagination-info {
  font-size: 0.875rem;
  color: var(--text-secondary);
  font-weight: 500;
  justify-self: start !important;
}

.pagination-controls {
  display: flex !important;
  align-items: center !important;
  gap: 0.375rem !important;
  justify-self: center !important;
}

.page-btn {
  width: 2.25rem;
  height: 2.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-base);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  font-size: 1.125rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
  background: var(--bg-elevated);
  color: var(--text-primary);
  border-color: var(--text-tertiary);
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-numbers {
  display: flex;
  gap: 0.25rem;
}

.page-number {
  min-width: 2.25rem;
  height: 2.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  padding: 0 0.625rem;
}

.page-number:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
}

.page-number.active {
  background: #FF9F0A;
  border-color: transparent;
  color: white;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(255, 159, 10, 0.3);
}

.page-size {
  display: flex !important;
  justify-content: flex-end !important;
  justify-self: end !important;
}

.page-size .page-select {
  padding: 0.5rem 2rem 0.5rem 0.875rem;
  background: var(--bg-base);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-primary);
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
}

/* ===== 表单样式 ===== */
.form-group {
  margin-bottom: var(--spacing-md);
}

.form-label {
  display: block;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: var(--spacing-sm);
  font-weight: 500;
}

.form-input,
.form-select {
  width: 100%;
  padding: 10px 14px;
  background: var(--bg-base);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  outline: none;
  transition: border-color 0.2s;
  font-size: 14px;
}

.form-input:focus,
.form-select:focus {
  border-color: #FF9F0A;
  background: var(--bg-base);
}

.form-select {
  appearance: none;
  padding-right: 28px;
}

.input-wrapper {
  position: relative;
}

.input-wrapper .select-arrow {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 16px;
  color: var(--text-tertiary);
  pointer-events: none;
}

.text-danger { color: var(--color-danger, #ff4d4f); }

[data-theme='dark'] .form-input,
[data-theme='dark'] .form-select {
  background: rgba(0, 0, 0, 0.2);
  border-color: rgba(255, 255, 255, 0.1);
}

[data-theme='dark'] .form-input:focus,
[data-theme='dark'] .form-select:focus {
  border-color: #FF9F0A;
  background: rgba(0, 0, 0, 0.4);
}

/* 动画 */
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
