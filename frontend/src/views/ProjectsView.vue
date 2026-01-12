<!--
 * @file ProjectsView.vue
 * @description 项目列表视图
 * 
 * 主要功能：
 * 1. 展示项目分页列表
 * 2. 支持按状态过滤（全部、进行中、已完成等）
 * 3. 支持关键词搜索
 * 4. 项目操作（编辑、删除、归档、添加收款）
 -->
<script setup lang="ts">
import { ref, computed, watch, onMounted, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import GlassCard from '@/components/common/GlassCard.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { useConfirm } from '@/composables/useConfirm'
import { projectApi, type Project } from '@/api/project'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import dayjs from 'dayjs'

const { confirm } = useConfirm()
const toast = useToast()
const router = useRouter()
const authStore = useAuthStore()

// Data state
const projects = ref<Project[]>([])
const loading = ref(false)
const totalItems = ref(0)
const currentPage = ref(1)
const pageSize = ref(5)
const keyword = ref('')

// 筛选状态
const activeFilter = ref('all')
const filters = [
  { key: 'all', label: '全部项目' },
  { key: 'active', label: '进行中' },
  { key: 'completed', label: '已完成' },
  { key: 'notstarted', label: '未开始' },
  { key: 'overdue', label: '已逾期' },
  { key: 'archived', label: '已归档' },
]

// 获取项目列表
const fetchProjects = async () => {
  loading.value = true
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: Record<string, any> = {
      page: currentPage.value,
      page_size: pageSize.value,
      keyword: keyword.value,
      _t: Date.now() // 防止缓存
    }
    
    if (activeFilter.value !== 'all') {
      params.status = activeFilter.value
    }

    const { data } = await projectApi.list(params)
    if (data.code === 0) {
      projects.value = data.data.list
      totalItems.value = data.data.total
    }
  } catch (error) {
    console.error('Failed to fetch projects', error)
    toast.error('获取项目列表失败')
  } finally {
    loading.value = false
  }
}

// Watchers
watch([activeFilter, pageSize], () => {
  currentPage.value = 1
  fetchProjects()
})

watch(currentPage, () => {
  fetchProjects()
})

// Search handler
const handleSearch = () => {
  currentPage.value = 1
  fetchProjects()
}

// Pagination computations
const totalPages = computed(() => Math.ceil(totalItems.value / pageSize.value))

const paginationInfo = computed(() => {
  if (totalItems.value === 0) return '暂无数据'
  const start = (currentPage.value - 1) * pageSize.value + 1
  const end = Math.min(currentPage.value * pageSize.value, totalItems.value)
  return `显示 ${start}-${end} 条，共 ${totalItems.value} 条`
})

// 翻页操作
const nextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value++
}

const prevPage = () => {
  if (currentPage.value > 1) currentPage.value--
}

const goToPage = (page: number) => {
  currentPage.value = page
}

// Helpers
const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    active: '进行中',
    completed: '已完成',
    pending: '即将交付', // Backend might not distinguish 'pending' as a status for project but for payment? Project status enum: active, completed, pending, notstarted, archived.
    notstarted: '未开始',
    archived: '已归档',
    overdue: '已逾期'
  }
  return map[status] || status
}

const formatCurrency = (val: number) => `¥${val.toLocaleString()}`
const getProgress = (p: Project) => {
  if (!p.total_amount) return 0
  return Math.round(((p.received_amount || 0) / p.total_amount) * 100)
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return dayjs(dateStr).format('YYYY-MM-DD')
}

// 下拉菜单逻辑 (使用 activeDropdownId 控制显示)
const activeDropdownId = ref<number | null>(null)
const dropdownStyle = ref({ top: '0px', left: '0px' })
const closeTimeout = ref<ReturnType<typeof setTimeout> | null>(null)

// 显示下拉菜单，计算位置使其显示在按钮附近
const showDropdown = (id: number, event: MouseEvent) => {
  if (closeTimeout.value) {
    clearTimeout(closeTimeout.value)
    closeTimeout.value = null
  }
  if (activeDropdownId.value !== id) {
    activeDropdownId.value = id
    const button = event.currentTarget as HTMLElement
    const rect = button.getBoundingClientRect()
    // 简单的位置策略：显示在按钮下方，稍微偏左以防溢出
    dropdownStyle.value = {
      top: `${rect.bottom + 4}px`,
      left: `${rect.right - 140}px`,
    }
  }
}

// 延迟隐藏下拉菜单，提供更好的用户体验
const hideDropdownWithDelay = () => {
  if (closeTimeout.value) clearTimeout(closeTimeout.value)
  closeTimeout.value = setTimeout(() => {
    activeDropdownId.value = null
  }, 200)
}

const keepDropdownOpen = () => {
  if (closeTimeout.value) {
    clearTimeout(closeTimeout.value)
    closeTimeout.value = null
  }
}

const closeDropdown = () => {
  activeDropdownId.value = null
}

const handleExport = () => {
  toast.info('导出功能开发中')
  closeDropdown()
}

const handleAddPayment = (id: number) => {
  router.push(`/projects/${id}/payment/create`)
  closeDropdown()
}

const handleArchive = async (id: number) => {
  closeDropdown()
  const confirmed = await confirm('确定要归档这个项目吗？归档后可以在归档列表中查看。')
  if (confirmed) {
    try {
      const { data } = await projectApi.archive(id)
      if (data.code === 0) {
        toast.success('项目归档成功')
        fetchProjects()
      }
    } catch {
      toast.error('归档失败')
    }
  }
}

const handleDelete = async (id: number) => {
  const confirmed = await confirm('确定要删除这个项目吗？此操作不可恢复。')
  if (confirmed) {
    try {
      const { data } = await projectApi.delete(id)
      if (data.code === 0) {
        toast.success('项目删除成功')
        fetchProjects()
      }
    } catch {
      toast.error('删除失败')
    }
  }
}

const handleRowDbClick = (id: number) => {
  router.push(`/projects/${id}`)
}

onMounted(() => {
  fetchProjects()
})

onActivated(() => {
  fetchProjects()
})
</script>

<template>
  <div class="projects-view">
    <div class="projects-toolbar">
      <div class="filter-tabs">
        <button
          v-for="filter in filters"
          :key="filter.key"
          class="btn btn-sm transition-all"
          :class="activeFilter === filter.key ? 'btn-secondary active' : 'btn-ghost'"
          @click="activeFilter = filter.key"
        >
          {{ filter.label }}
        </button>
      </div>
      <div class="flex gap-sm items-center">
        <!-- Search Input -->
        <div class="search-input-wrapper">
          <i class="ri-search-line search-icon"></i>
          <input 
            v-model="keyword" 
            type="text" 
            placeholder="搜索项目..." 
            class="search-input"
            spellcheck="false"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            @keyup.enter="handleSearch"
          />
        </div>
        
        <button class="btn btn-primary" @click="router.push('/projects/create')">
          <i class="ri-add-line"></i> <span class="btn-text">新建项目</span>
        </button>
      </div>
    </div>

    <GlassCard class="p-0">
      <div class="overflow-auto" style="height: 440px;">
        <table class="data-table w-full">
          <thead>
            <tr>
              <th class="col-fixed-width-200">项目名称</th>
              <th>客户</th>
              <th>开始日期</th>
              <th>截止日期</th>
              <th>创建日期</th>
              <th v-if="authStore.user?.role === 'admin'">创建人</th>
              <th>合同金额</th>
              <th>已收款</th>
              <th>收款进度</th>
              <th>状态</th>
              <th class="col-fixed-right">操作</th>
            </tr>
          </thead>
          <tbody v-if="projects.length > 0">
            <tr
              v-for="p in projects"
              :key="p.id"
              class="project-row cursor-pointer hover:bg-white/5 transition-colors"
              @click="handleRowDbClick(p.id)"
            >
              <td class="font-medium col-fixed-width-200" :title="p.name">{{ p.name }}</td>
              <td class="text-secondary">{{ p.company }}</td>
              <td>{{ formatDate(p.start_date) }}</td>
              <td>{{ formatDate(p.end_date) }}</td>
              <td>{{ formatDate(p.create_time) }}</td>
              <td v-if="authStore.user?.role === 'admin'">{{ p.user?.name || '-' }}</td>
              <td>{{ formatCurrency(p.total_amount) }}</td>
              <td>{{ formatCurrency(p.received_amount || 0) }}</td>
              <td>
                <div class="flex items-center gap-sm">
                  <div class="progress-bar" style="width: 80px">
                    <div class="progress-bar-fill" :style="{ width: getProgress(p) + '%' }"></div>
                  </div>
                  <span class="text-sm">{{ getProgress(p) }}%</span>
                </div>
              </td>
              <td>
                <StatusBadge :status="p.status">
                  {{ getStatusLabel(p.status) }}
                </StatusBadge>
              </td>
              <td class="col-fixed-right">
                <div class="flex items-center gap-xs relative">
                  <button
                    class="btn btn-ghost btn-icon btn-sm"
                    title="编辑"
                    @click.stop="router.push(`/projects/edit/${p.id}`)"
                  >
                    <i class="ri-edit-line"></i>
                  </button>
                  <button
                    class="btn btn-ghost btn-icon btn-sm text-danger"
                    title="删除"
                    @click.stop="handleDelete(p.id)"
                  >
                    <i class="ri-delete-bin-line"></i>
                  </button>
                  <div class="relative">
                    <button
                      class="btn btn-ghost btn-icon btn-sm"
                      @click.stop="showDropdown(p.id, $event)"
                      @mouseenter="keepDropdownOpen"
                      @mouseleave="hideDropdownWithDelay"
                    >
                      <i class="ri-more-line"></i>
                    </button>

                    <Teleport to="body">
                      <div
                        v-if="activeDropdownId === p.id"
                        class="dropdown-menu-fixed"
                        :style="dropdownStyle"
                        @mouseenter="keepDropdownOpen"
                        @mouseleave="hideDropdownWithDelay"
                        @click.stop
                      >
                        <button class="dropdown-item" @click="handleExport()">
                          <i class="ri-download-2-line"></i>
                          <span>导出项目</span>
                        </button>
                        <button class="dropdown-item" @click="handleAddPayment(p.id)">
                          <i class="ri-money-dollar-box-line" style="color: #10b981"></i>
                          <span>添加收款</span>
                        </button>
                        <button class="dropdown-item" @click="handleArchive(p.id)">
                          <i class="ri-archive-line text-warning"></i>
                          <span>归档项目</span>
                        </button>
                      </div>
                    </Teleport>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
          <tbody v-else-if="!loading">
            <tr>
              <td colspan="9">
                <div class="flex flex-col items-center justify-center py-xl text-secondary">
                  <i class="ri-folder-open-line text-4xl mb-sm opacity-50"></i>
                  <p>暂无项目数据</p>
                  <button v-if="keyword" class="btn btn-ghost btn-sm mt-sm text-primary" @click="keyword = ''; handleSearch()">
                    清除搜索
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </GlassCard>

    <!-- Pagination Footer -->
    <div class="pagination-footer" v-if="projects.length > 0">
      <div class="flex items-center gap-md">
        <div class="pagination-info">
          {{ paginationInfo }}
        </div>
        <div class="page-size-selector">
          <select v-model="pageSize" class="page-select">
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

        <button
          class="btn btn-sm btn-ghost"
          :disabled="currentPage === totalPages"
          @click="nextPage"
        >
          <i class="ri-arrow-right-s-line"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 工具栏 */
.projects-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
  flex-wrap: wrap;
}

.filter-tabs {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.filter-tabs .btn.active {
  color: var(--color-primary) !important;
  background-color: white; /* Ensure bright background */
}

/* Dark mode support */
:global([data-theme='dark']) .filter-tabs .btn.active {
  background-color: rgba(255, 255, 255, 0.1); /* Keep dark mode background subtle */
  color: var(--color-primary) !important;
}

/* 确保表格样式正确 */
.data-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 800px; /* 确保有最小宽度支持滚动 */
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

.progress-bar {
  height: 6px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 3px;
  overflow: hidden;
}

[data-theme='dark'] .progress-bar {
  background: rgba(255, 255, 255, 0.1);
}

.progress-bar-fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: 3px;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .projects-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-tabs {
    display: flex;
    flex-wrap: nowrap;
    overflow-x: auto;
    overflow-y: hidden;
    padding-bottom: var(--spacing-xs);
    -webkit-overflow-scrolling: touch;
    max-width: 100%;
  }

  .filter-tabs .btn {
    flex-shrink: 0;
    white-space: nowrap;
  }

  .filter-tabs::-webkit-scrollbar {
    display: none;
  }

  .filter-tabs {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .btn-text {
    display: none;
  }
}

.filter-tabs .btn.active {
  color: var(--color-primary) !important;
  background-color: white;
}

/* Dark mode support */
:global([data-theme='dark']) .filter-tabs .btn.active {
  background-color: rgba(255, 255, 255, 0.1);
  color: var(--color-primary) !important;
}

/* Old absolute dropdown removed, using fixed now */
.dropdown-menu-fixed {
  position: fixed;
  width: 140px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 4px;
  z-index: 9999;
  backdrop-filter: blur(12px);
}

.dropdown-menu::before {
  content: '';
  position: absolute;
  top: -10px;
  left: 0;
  right: 0;
  height: 10px;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: none;
  color: var(--text-primary);
  font-size: 13px;
  text-align: left;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s;
}

.dropdown-item:hover {
  background: var(--bg-base);
}

.dropdown-item i {
  font-size: 16px;
  opacity: 0.7;
}

.text-danger {
  color: var(--color-danger);
}
.text-warning {
  color: var(--color-warning);
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

.page-numbers {
  display: flex;
  gap: 4px;
}

.page-btn {
  min-width: 32px;
  height: 32px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-weight: 500;
  background: transparent;
}

.page-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.page-btn.active {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

[data-theme='dark'] .pagination-footer {
  border-top-color: rgba(255, 255, 255, 0.05);
}

/* Search Input Styles */
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
  height: 20px; /* ensuring line-height alignment */
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

/* Fixed Columns Styles */
.col-fixed-right {
  position: sticky;
  right: 0;
  z-index: 10;
  background: var(--bg-content);
  backdrop-filter: blur(12px);
  border-left: 1px solid rgba(0, 0, 0, 0.05);
}

/* 暗色模式下操作列使用不透明背景，遮挡滚动内容 */
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

.col-fixed-width-200 {
  width: 200px;
  min-width: 200px;
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
