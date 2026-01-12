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
  if (!isEditing.value && !form.password) {
      toast.warning('创建用户必须设置初始密码')
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
        role: form.role,
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
  if (!resetPwdForm.password || resetPwdForm.password.length < 6) {
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
  <div class="user-management flex flex-col">
    <!-- Header/Toolbar -->
    <div class="glass-card-header border-b p-md flex justify-between items-center" style="border-bottom-color: var(--separator-color);">
      <h3 class="glass-card-title">用户管理</h3>

      <div class="flex gap-sm items-center">
        <!-- Search Input -->
        <div class="search-input-wrapper">
          <i class="ri-search-line search-icon"></i>
          <input 
            v-model="keyword" 
            type="text" 
            placeholder="搜索用户..." 
            class="search-input"
            spellcheck="false"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            @keyup.enter="handleSearch"
          />
        </div>
        
        <button class="btn btn-primary btn-sm" @click="openAddModal">
          <i class="ri-add-line"></i> <span class="btn-text">新增用户</span>
        </button>
      </div>
    </div>

    <!-- Table Container (No GlassCard) -->
    <div class="flex flex-col overflow-hidden">
      <div class="overflow-auto" style="height: 420px;">
        <table class="data-table w-full">
          <thead>
            <tr>
              <th width="80" class="pl-md">ID</th>
              <th>用户名</th>
              <th>姓名</th>
              <th>角色</th>
              <th>职位/部门</th>
              <th>联系方式</th>
              <th>状态</th>
              <th class="col-fixed-right text-right pr-md">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="8" class="text-center py-8 text-secondary">加载中...</td>
            </tr>
            <tr v-else-if="users.length === 0">
              <td colspan="8">
                 <div class="flex flex-col items-center justify-center py-xl text-secondary">
                  <i class="ri-user-unfollow-line text-4xl mb-sm opacity-50"></i>
                  <p>暂无用户数据</p>
                </div>
              </td>
            </tr>
            <tr 
              v-for="user in users" 
              :key="user.id"
              class="user-row hover:bg-white/5 transition-colors"
            >
              <td class="pl-md">{{ user.id }}</td>
              <td class="font-medium">{{ user.username }}</td>
              <td>{{ user.name }}</td>
              <td>
                <span class="badge" :class="user.role === 'admin' ? 'badge-primary' : 'badge-secondary'">
                  {{ user.role === 'admin' ? '管理员' : '普通用户' }}
                </span>
              </td>
              <td>
                <div class="text-sm">{{ user.position || '-' }}</div>
                <div class="text-xs text-secondary">{{ user.department || '-' }}</div>
              </td>
              <td>
                <div class="text-sm">{{ user.email || '-' }}</div>
                <div class="text-xs text-secondary">{{ user.phone || '-' }}</div>
              </td>
              <td>
                <span class="status-dot" :class="user.status === 1 ? 'bg-success' : 'bg-danger'"></span>
                {{ user.status === 1 ? '正常' : '禁用' }}
              </td>
              <td class="col-fixed-right text-right pr-md">
                 <div class="flex items-center justify-end gap-xs">
                   <button class="btn btn-ghost btn-icon btn-sm" @click="openEditModal(user)" title="编辑">
                     <i class="ri-edit-line"></i>
                   </button>
                   <button class="btn btn-ghost btn-icon btn-sm text-warning" @click="openResetPwdModal(user)" title="重置密码">
                     <i class="ri-key-line"></i>
                   </button>
                   <button class="btn btn-ghost btn-icon btn-sm text-danger" @click="handleDelete(user)" title="删除">
                     <i class="ri-delete-bin-line"></i>
                   </button>
                 </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

       <!-- Pagination Footer -->
       <div class="pagination-footer" v-if="users.length > 0">
         <div class="flex items-center gap-md">
           <div class="pagination-info">
             {{ paginationInfo }}
           </div>
           <div class="page-size-selector">
             <select v-model="pageSize" class="page-select" @change="handleSearch">
               <option :value="5">5条/页</option>
               <option :value="10">10条/页</option>
             </select>
             <i class="ri-arrow-down-s-line select-arrow"></i>
           </div>
         </div>
         <div class="pagination-controls">
           <button class="btn btn-sm btn-ghost" :disabled="currentPage === 1" @click="prevPage">
             <i class="ri-arrow-left-s-line"></i>
           </button>
           
           <div class="page-numbers">
              <button
                v-for="page in totalPages"
                :key="page"
                class="btn btn-sm page-btn"
                :class="{ active: currentPage === page }"
                @click="goToPage(page)"
              >
                {{ page }}
              </button>
           </div>

           <button class="btn btn-sm btn-ghost" :disabled="currentPage === totalPages" @click="nextPage">
             <i class="ri-arrow-right-s-line"></i>
           </button>
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
                  <input type="text" v-model="resetPwdForm.password" class="form-input" placeholder="请输入新密码" spellcheck="false" autocomplete="off" />
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
/* Search Input Styles (Copied from ProjectsView) */
.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 6px 12px;
  width: 260px;
  transition: all 0.2s;
}

.search-input-wrapper:focus-within {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.1);
}

.search-icon {
  font-size: 16px;
  color: var(--text-tertiary);
  margin-right: 8px;
  flex-shrink: 0;
}

.search-input {
  border: none;
  background: none;
  outline: none;
  font-size: 14px;
  color: var(--text-primary);
  width: 100%;
  padding: 0;
  height: 20px;
  line-height: 20px;
}

.search-input::placeholder {
  color: var(--text-tertiary);
}

[data-theme='dark'] .search-input-wrapper {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
}

[data-theme='dark'] .search-input-wrapper:focus-within {
  border-color: var(--color-primary);
  background: rgba(255, 255, 255, 0.08);
}

/* Data Table Styles (Copied from ProjectsView) */
.data-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 800px;
}

.data-table th,
.data-table td {
  padding: var(--spacing-md);
  text-align: left;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  white-space: nowrap;
}

[data-theme='dark'] .data-table th,
[data-theme='dark'] .data-table td {
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.data-table th {
  font-weight: 500;
  color: var(--text-secondary);
  font-size: 13px;
}

/* Status Indicators */
.status-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    margin-right: 6px;
}

.badge {
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
    border: 1px solid transparent;
}
.badge-primary { 
  background: rgba(var(--color-primary-rgb), 0.1); 
  color: var(--color-primary); 
  border-color: rgba(var(--color-primary-rgb), 0.2);
}
.badge-secondary { 
  background: rgba(150, 150, 150, 0.1); 
  color: var(--text-secondary); 
  border-color: rgba(150, 150, 150, 0.2);
}

.text-danger { color: var(--color-danger, #ff4d4f); }
.bg-success { background-color: var(--color-success); }
.bg-danger { background-color: var(--color-danger); }

/* Fixed Columns Styles */
.col-fixed-right {
  position: sticky;
  right: 0;
  z-index: 10;
  background: var(--bg-content);
  backdrop-filter: blur(12px);
  border-left: 1px solid rgba(0, 0, 0, 0.05);
}

[data-theme='dark'] .col-fixed-right {
  border-left: none;
  background: #333335 !important;
  backdrop-filter: none;
}

[data-theme='dark'] th.col-fixed-right,
[data-theme='dark'] td.col-fixed-right {
  background: #333335 !important;
}

[data-theme='dark'] tr:hover td.col-fixed-right {
  background: #333335 !important;
}

/* Pagination Footer */
.pagination-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
}

.pagination-info {
  font-size: 13px;
  color: var(--text-secondary);
}

.page-size-selector {
  position: relative;
  display: flex;
  align-items: center;
}

.page-select {
  appearance: none;
  background: transparent;
  border: 1px solid transparent;
  padding: 4px 24px 4px 8px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.page-select:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.page-select:focus {
  outline: none;
  border-color: var(--color-primary);
}

.select-arrow {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  color: var(--text-tertiary);
  pointer-events: none;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

[data-theme='dark'] .pagination-footer {
  border-top-color: rgba(255, 255, 255, 0.05);
}


/* Form Styles (Matched with SettingsView Notification Modal) */
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
  background: var(--bg-base); /* Changed to Match ProjectCreateView */
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  outline: none;
  transition: border-color 0.2s;
  font-size: 14px;
}

.form-input:focus,
.form-select:focus {
  border-color: var(--color-primary);
  background: var(--bg-base); 
}

.form-select {
  appearance: none;
  /* Removed background-image */
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

[data-theme='dark'] .form-input,
[data-theme='dark'] .form-select {
  background: rgba(0, 0, 0, 0.2); /* Darker background for inputs on elevated modal */
  border-color: rgba(255, 255, 255, 0.1);
}

[data-theme='dark'] .form-input:focus,
[data-theme='dark'] .form-select:focus {
  border-color: var(--color-primary);
  background: rgba(0, 0, 0, 0.4);
}
</style>
