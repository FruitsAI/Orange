<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { syncApi, type SyncConfig, type TableCompareResult, type SyncResult } from '@/api/sync'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'

const toast = useToast()
const { confirm } = useConfirm()

// 云端配置
const cloudConfig = reactive<SyncConfig>({
  db_type: 'postgres', // 默认 PostgreSQL
  host: '',
  port: 5432,
  user: '',
  password: '',
  db_name: '',
  ssl_mode: 'require'
})

// UI 状态
const loading = ref(false)
const testLoading = ref(false)
const syncLoading = ref(false)
const compareResults = ref<TableCompareResult[]>([])
const syncResults = ref<SyncResult[]>([])
const step = ref<'config' | 'compare' | 'sync'>('config') // 当前步骤

// 同步成功后延迟刷新对比数据的定时器
let refreshTimer: ReturnType<typeof setTimeout> | null = null
onUnmounted(() => {
  if (refreshTimer) clearTimeout(refreshTimer)
})

// 数据库类型选项
const dbTypeOptions = [
  { label: 'PostgreSQL / Supabase / Nile', value: 'postgres', icon: 'ri-database-2-fill' },
  { label: 'MySQL / TiDB', value: 'mysql', icon: 'ri-database-2-line' }
]

// 监听类型变化调整默认端口
const handleDbTypeChange = () => {
  if (cloudConfig.db_type === 'mysql') {
    cloudConfig.port = 3306
    cloudConfig.ssl_mode = 'false'
  } else {
    cloudConfig.port = 5432
    cloudConfig.ssl_mode = 'require'
  }
}

// 1. 测试连接
const testConnection = async () => {
  if (!cloudConfig.host || !cloudConfig.user || !cloudConfig.db_name) {
    toast.warning('请填写完整的数据库连接信息')
    return
  }

  testLoading.value = true
  try {
    const res = await syncApi.testConnection(cloudConfig)
    if (res.data.code === 0) {
      toast.success('连接成功')
      compareData()
    } else {
      toast.error(`连接失败: ${res.data.message}`)
    }
  } catch (error) {
    console.error(error)
    toast.error('连接失败，请检查网络或配置')
  } finally {
    testLoading.value = false
  }
}

// 2. 对比数据
const compareData = async () => {
  loading.value = true
  step.value = 'compare'
  compareResults.value = []
  syncResults.value = []

  try {
    const res = await syncApi.compare(cloudConfig)
    if (res.data.code === 0) {
      compareResults.value = res.data.data
    } else {
      toast.error(`对比失败: ${res.data.message}`)
    }
  } catch (error) {
    console.error(error)
    toast.error('获取对比数据失败')
  } finally {
    loading.value = false
  }
}

// 3. 执行同步
const startSync = async () => {
  const confirmed = await confirm({
    title: '确认同步',
    message: '此操作将把本地数据覆盖写入到云端数据库，云端已有的同ID数据将被更新。确定要继续吗？'
  })

  if (!confirmed) return

  syncLoading.value = true
  step.value = 'sync'

  const tables = compareResults.value.map(r => r.table_name)

  try {
    const res = await syncApi.execute(cloudConfig, tables)
    if (res.data.code === 0) {
      syncResults.value = res.data.data
      const failed = res.data.data.filter(r => !r.success)
      if (failed.length > 0) {
        toast.warning(`同步完成，但有 ${failed.length} 个表同步失败`)
      } else {
        toast.success('所有数据同步成功！')
        // 记录定时器并在组件卸载时清除，避免卸载后仍发起对比请求
        refreshTimer = setTimeout(compareData, 1000)
      }
    } else {
      toast.error(`同步请求失败: ${res.data.message}`)
    }
  } catch (error) {
    console.error(error)
    toast.error('同步过程中发生错误')
  } finally {
    syncLoading.value = false
  }
}

const getTableLabel = (name: string) => {
  const map: Record<string, string> = {
    'users': '用户表',
    'projects': '项目表',
    'payments': '收款表',
    'dictionaries': '字典分类',
    'dictionary_item': '字典详情',
    'notifications': '通知表',
    'user_notifications': '用户通知状态',
    'personal_access_tokens': '访问令牌'
  }
  return map[name] || name
}

const diffCount = () => {
  return compareResults.value.filter(r => r.local_count !== r.remote_count).length
}

const getSyncResultForTable = (tableName: string) => {
  return syncResults.value.find(sr => sr.table_name === tableName)
}

onMounted(async () => {
  try {
    const res = await syncApi.getConfig()
    if (res.data.code === 0 && res.data.data) {
      const cfg = res.data.data
      if (cfg.host) {
        Object.assign(cloudConfig, {
          ...cfg,
          port: Number(cfg.port) || 5432
        })
      }
    }
  } catch (e) {
    console.error('Failed to load sync config', e)
  }
})
</script>

<template>
  <div class="data-sync-panel">
    <!-- 头部区域 -->
    <div class="sync-header">
      <div class="sync-header-main">
        <div class="sync-title-wrapper">
          <div class="sync-icon">
            <i class="ri-cloud-line"></i>
          </div>
          <div class="sync-title-content">
            <h2 class="sync-title">数据同步</h2>
            <p class="sync-subtitle">将本地 SQLite 数据同步到云端 PostgreSQL 或 MySQL 数据库</p>
          </div>
        </div>
        <button v-if="step !== 'config'" class="sync-action-btn secondary" @click="step = 'config'">
          <i class="ri-settings-3-line"></i>
          <span>修改配置</span>
        </button>
      </div>

      <!-- 统计卡片 -->
      <div class="sync-stats">
        <div class="sync-stat-item">
          <div class="sync-stat-icon blue">
            <i class="ri-database-2-line"></i>
          </div>
          <div class="sync-stat-info">
            <span class="sync-stat-value">{{ compareResults.length }}</span>
            <span class="sync-stat-label">数据表</span>
          </div>
        </div>
        <div class="sync-stat-item">
          <div class="sync-stat-icon orange">
            <i class="ri-exchange-line"></i>
          </div>
          <div class="sync-stat-info">
            <span class="sync-stat-value">{{ diffCount() }}</span>
            <span class="sync-stat-label">待同步</span>
          </div>
        </div>
        <div class="sync-stat-item">
          <div class="sync-stat-icon green">
            <i class="ri-check-double-line"></i>
          </div>
          <div class="sync-stat-info">
            <span class="sync-stat-value">{{ syncResults.filter(r => r.success).length }}</span>
            <span class="sync-stat-label">已同步</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 配置步骤 -->
    <div v-show="step === 'config'" class="sync-content">
      <!-- 说明提示 -->
      <div class="sync-alert">
        <div class="sync-alert-icon">
          <i class="ri-information-line"></i>
        </div>
        <p class="sync-alert-text">将本地 SQLite 数据单向同步到云端 PostgreSQL 或 MySQL 数据库。此操作适合数据备份或多端数据汇总。</p>
      </div>

      <!-- 配置表单卡片 -->
      <div class="sync-form-card">
        <div class="sync-form-header">
          <i class="ri-server-line"></i>
          <span>数据库连接配置</span>
        </div>

        <div class="sync-form-body">
          <!-- 数据库类型选择 -->
          <div class="sync-form-group full-width">
            <label class="sync-form-label">数据库类型</label>
            <div class="sync-db-type-selector">
              <button
                v-for="opt in dbTypeOptions"
                :key="opt.value"
                class="sync-db-type-option"
                :class="{ active: cloudConfig.db_type === opt.value }"
                @click="cloudConfig.db_type = opt.value; handleDbTypeChange()"
              >
                <i :class="opt.icon"></i>
                <span>{{ opt.label }}</span>
              </button>
            </div>
          </div>

          <!-- 主机地址 -->
          <div class="sync-form-group full-width">
            <label class="sync-form-label">
              <i class="ri-global-line"></i>
              主机地址 (Host)
            </label>
            <input
              type="text"
              v-model="cloudConfig.host"
              class="sync-form-input"
              placeholder="例如: aws-0-ap-northeast-1.pooler.supabase.com"
            />
          </div>

          <!-- 端口和数据库名 -->
          <div class="sync-form-row">
            <div class="sync-form-group">
              <label class="sync-form-label">
                <i class="ri-hashtag"></i>
                端口 (Port)
              </label>
              <input type="number" v-model="cloudConfig.port" class="sync-form-input" />
            </div>
            <div class="sync-form-group">
              <label class="sync-form-label">
                <i class="ri-database-2-line"></i>
                数据库名 (Database)
              </label>
              <input type="text" v-model="cloudConfig.db_name" class="sync-form-input" placeholder="例如: postgres" />
            </div>
          </div>

          <!-- 用户名和密码 -->
          <div class="sync-form-row">
            <div class="sync-form-group">
              <label class="sync-form-label">
                <i class="ri-user-line"></i>
                用户名 (User)
              </label>
              <input type="text" v-model="cloudConfig.user" class="sync-form-input" />
            </div>
            <div class="sync-form-group">
              <label class="sync-form-label">
                <i class="ri-lock-password-line"></i>
                密码 (Password)
              </label>
              <input type="password" v-model="cloudConfig.password" class="sync-form-input" placeholder="••••••••" />
            </div>
          </div>

          <!-- SSL 模式 -->
          <div class="sync-form-group full-width" v-if="cloudConfig.db_type === 'postgres'">
            <label class="sync-form-label">
              <i class="ri-shield-check-line"></i>
              SSL 模式
            </label>
            <div class="sync-select-wrapper">
              <select v-model="cloudConfig.ssl_mode" class="sync-form-input sync-form-select">
                <option value="disable">Disable</option>
                <option value="require">Require (推荐)</option>
                <option value="verify-full">Verify Full</option>
              </select>
              <i class="ri-arrow-down-s-line sync-select-arrow"></i>
            </div>
          </div>
        </div>

        <!-- 表单底部 -->
        <div class="sync-form-footer">
          <div class="sync-security-note">
            <i class="ri-shield-check-line"></i>
            <span>你的数据库凭据仅用于本地连接，不会发送到任何第三方服务器</span>
          </div>
          <button class="sync-action-btn primary" @click="testConnection" :disabled="testLoading">
            <i v-if="testLoading" class="ri-loader-4-line animate-spin"></i>
            <span v-else>测试连接并下一步</span>
            <i v-if="!testLoading" class="ri-arrow-right-line"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- 对比与同步步骤 -->
    <div v-show="step !== 'config'" class="sync-content">
      <!-- 连接状态卡片 -->
      <div class="sync-connection-banner">
        <div class="sync-connection-info">
          <div class="sync-connection-icon-wrapper">
            <i class="ri-database-2-line"></i>
          </div>
          <div class="sync-connection-details">
            <div class="sync-connection-label">已连接至目标数据库</div>
            <div class="sync-connection-value">
              <span class="sync-db-badge">{{ cloudConfig.db_type === 'postgres' ? 'PostgreSQL' : 'MySQL' }}</span>
              <span class="sync-connection-host">{{ cloudConfig.host }}</span>
              <span class="sync-connection-indicator">
                <span class="sync-pulse"></span>
                <span class="sync-dot"></span>
              </span>
            </div>
          </div>
        </div>
        <div class="sync-connection-actions">
          <button class="sync-action-btn secondary" @click="compareData" :disabled="loading || syncLoading">
            <i class="ri-refresh-line" :class="{'animate-spin': loading}"></i>
            <span>重新对比</span>
          </button>
          <button class="sync-action-btn primary" @click="startSync" :disabled="loading || syncLoading">
            <i v-if="syncLoading" class="ri-loader-4-line animate-spin"></i>
            <i v-else class="ri-upload-cloud-2-line"></i>
            <span>开始同步</span>
          </button>
        </div>
      </div>

      <!-- 数据对比表格卡片 -->
      <div class="sync-table-card">
        <div class="sync-table-header">
          <div class="sync-table-title">
            <i class="ri-file-list-3-line"></i>
            <span>数据对比明细</span>
            <span class="sync-table-badge">{{ compareResults.length }} 个表</span>
          </div>
        </div>

        <div class="sync-table-body">
          <!-- 加载状态 -->
          <div v-if="loading" class="sync-loading-state">
            <div class="sync-loading-spinner">
              <i class="ri-loader-4-line animate-spin"></i>
            </div>
            <span>正在分析数据库差异...</span>
          </div>

          <!-- 空状态 -->
          <div v-else-if="compareResults.length === 0" class="sync-empty-state">
            <div class="sync-empty-icon">
              <i class="ri-inbox-archive-line"></i>
            </div>
            <h3 class="sync-empty-title">暂无对比数据</h3>
            <p class="sync-empty-desc">请在上方点击「重新对比」按钮开始分析</p>
          </div>

          <!-- 数据表格 -->
          <div v-else class="sync-data-grid">
            <div
              v-for="res in compareResults"
              :key="res.table_name"
              class="sync-data-row"
              :class="{
                'has-diff': res.local_count !== res.remote_count,
                'synced': getSyncResultForTable(res.table_name)?.success
              }"
            >
              <div class="sync-row-main">
                <div class="sync-table-icon">
                  <i class="ri-table-2"></i>
                </div>
                <div class="sync-table-info">
                  <div class="sync-table-name">{{ getTableLabel(res.table_name) }}</div>
                  <div class="sync-table-code">{{ res.table_name }}</div>
                </div>
              </div>

              <div class="sync-row-stats">
                <div class="sync-stat-box">
                  <div class="sync-stat-box-label">本地</div>
                  <div class="sync-stat-box-value">{{ res.local_count }}</div>
                </div>
                <div class="sync-stat-arrow">
                  <i class="ri-arrow-right-line"></i>
                </div>
                <div class="sync-stat-box" :class="{ 'has-error': res.remote_count === -1 }">
                  <div class="sync-stat-box-label">云端</div>
                  <div class="sync-stat-box-value">
                    <span v-if="res.remote_count === -1" class="error-text">连接失败</span>
                    <span v-else>{{ res.remote_count }}</span>
                  </div>
                </div>
              </div>

              <div class="sync-row-status">
                <span v-if="res.local_count !== res.remote_count" class="sync-status-badge warning">
                  <i class="ri-alert-line"></i>
                  <span>差异</span>
                </span>
                <span v-else class="sync-status-badge success">
                  <i class="ri-check-line"></i>
                  <span>一致</span>
                </span>
              </div>

              <div v-if="syncResults.length" class="sync-row-result">
                <template v-if="getSyncResultForTable(res.table_name)">
                  <div v-if="getSyncResultForTable(res.table_name)?.success" class="sync-result-success">
                    <i class="ri-check-double-line"></i>
                    <span>已同步 {{ getSyncResultForTable(res.table_name)?.synced_count }} 条</span>
                  </div>
                  <div v-else class="sync-result-error" :title="getSyncResultForTable(res.table_name)?.error_message">
                    <i class="ri-error-warning-line"></i>
                    <span>同步失败</span>
                  </div>
                </template>
                <span v-else class="sync-result-pending">-</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ===== 数据同步面板 - 精致重构版 ===== */

.data-sync-panel {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;
  min-height: 100%;
}

/* 头部区域 */
.sync-header {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.sync-header-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.sync-title-wrapper {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.sync-icon {
  width: 3rem;
  height: 3rem;
  border-radius: 0.75rem;
  background: linear-gradient(135deg, rgba(255, 159, 10, 0.2) 0%, rgba(255, 159, 10, 0.05) 100%);
  border: 1px solid rgba(255, 159, 10, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: #FF9F0A;
  box-shadow: 0 4px 12px rgba(255, 159, 10, 0.15);
}

.sync-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.02em;
}

.sync-subtitle {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0.25rem 0 0 0;
}

/* 统计卡片 */
.sync-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.sync-stat-item {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 1rem 1.25rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  transition: all 0.2s ease;
}

.sync-stat-item:hover {
  border-color: rgba(255, 159, 10, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.sync-stat-icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.625rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
}

.sync-stat-icon.blue {
  background: rgba(59, 130, 246, 0.12);
  color: #3B82F6;
}

.sync-stat-icon.orange {
  background: rgba(245, 158, 11, 0.12);
  color: #F59E0B;
}

.sync-stat-icon.green {
  background: rgba(34, 197, 94, 0.12);
  color: #22C55E;
}

.sync-stat-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.sync-stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
}

.sync-stat-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-weight: 500;
}

/* 内容区域 */
.sync-content {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* 提示信息 */
.sync-alert {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 0.75rem;
}

.sync-alert-icon {
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  color: #3B82F6;
  flex-shrink: 0;
}

.sync-alert-text {
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--text-secondary);
  margin: 0;
}

/* 表单卡片 */
.sync-form-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.sync-form-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 1.25rem;
  background: rgba(var(--color-primary-rgb), 0.03);
  border-bottom: 1px solid var(--border-color);
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-primary);
}

.sync-form-header i {
  color: var(--color-primary);
  font-size: 1.125rem;
}

.sync-form-body {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.5rem;
}

.sync-form-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.25rem;
}

.sync-form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sync-form-group.full-width {
  grid-column: 1 / -1;
}

.sync-form-label {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
}

.sync-form-label i {
  color: var(--text-tertiary);
  font-size: 1rem;
}

.sync-form-input {
  width: 100%;
  padding: 0.75rem 1rem;
  background: var(--bg-base);
  border: 1px solid var(--border-color);
  border-radius: 0.625rem;
  font-size: 0.9375rem;
  color: var(--text-primary);
  transition: all 0.2s ease;
  outline: none;
}

.sync-form-input:focus {
  border-color: #FF9F0A;
  background: var(--bg-elevated);
  box-shadow: 0 0 0 3px rgba(255, 159, 10, 0.1);
}

.sync-form-input::placeholder {
  color: var(--text-tertiary);
}

/* 数据库类型选择器 */
.sync-db-type-selector {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.sync-db-type-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  background: var(--bg-base);
  border: 1px solid var(--border-color);
  border-radius: 0.625rem;
  font-size: 0.9375rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.sync-db-type-option:hover {
  border-color: rgba(255, 159, 10, 0.4);
  background: rgba(255, 159, 10, 0.03);
}

.sync-db-type-option.active {
  border-color: #FF9F0A;
  background: rgba(255, 159, 10, 0.08);
  color: #FF9F0A;
  font-weight: 500;
}

.sync-db-type-option i {
  font-size: 1.25rem;
}

/* 选择框 */
.sync-select-wrapper {
  position: relative;
}

.sync-form-select {
  appearance: none;
  padding-right: 2.5rem;
  cursor: pointer;
}

.sync-select-arrow {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-tertiary);
  font-size: 1.25rem;
  pointer-events: none;
}

/* 表单底部 */
.sync-form-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  background: rgba(var(--color-primary-rgb), 0.02);
  border-top: 1px solid var(--border-color);
}

.sync-security-note {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  color: var(--text-tertiary);
}

.sync-security-note i {
  color: #22C55E;
  font-size: 1rem;
}

/* 按钮样式 */
.sync-action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border-radius: 0.625rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  white-space: nowrap;
}

.sync-action-btn.primary {
  background: #FF9F0A;
  color: white;
  box-shadow: 0 4px 14px rgba(255, 159, 10, 0.35);
}

.sync-action-btn.primary:hover:not(:disabled) {
  background: #E58909;
  box-shadow: 0 6px 20px rgba(255, 159, 10, 0.45);
  transform: translateY(-1px);
}

.sync-action-btn.primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sync-action-btn.secondary {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.sync-action-btn.secondary:hover:not(:disabled) {
  background: var(--bg-base);
  color: var(--text-primary);
  border-color: var(--text-tertiary);
}

.sync-action-btn.secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 连接状态横幅 */
.sync-connection-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(34, 197, 94, 0.02) 100%);
  border: 1px solid rgba(34, 197, 94, 0.2);
  border-radius: 1rem;
}

.sync-connection-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.sync-connection-icon-wrapper {
  width: 3rem;
  height: 3rem;
  border-radius: 0.75rem;
  background: rgba(34, 197, 94, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: #22C55E;
}

.sync-connection-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.sync-connection-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #22C55E;
}

.sync-connection-value {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sync-db-badge {
  padding: 0.25rem 0.625rem;
  background: rgba(34, 197, 94, 0.12);
  border-radius: 0.375rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #22C55E;
}

.sync-connection-host {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--text-primary);
  max-width: 250px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sync-connection-indicator {
  position: relative;
  display: inline-flex;
  width: 0.625rem;
  height: 0.625rem;
}

.sync-pulse {
  position: absolute;
  inset: 0;
  border-radius: 9999px;
  background: #22C55E;
  animation: pulse-ring 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
}

.sync-dot {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 9999px;
  background: #22C55E;
}

@keyframes pulse-ring {
  75%, 100% {
    transform: scale(2.5);
    opacity: 0;
  }
}

.sync-connection-actions {
  display: flex;
  gap: 0.75rem;
}

.sync-connection-actions .sync-action-btn {
  padding: 0.75rem 1.5rem;
}

/* 表格卡片 */
.sync-table-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.sync-table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  background: rgba(var(--color-primary-rgb), 0.03);
  border-bottom: 1px solid var(--border-color);
}

.sync-table-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.sync-table-title i {
  color: var(--color-primary);
}

.sync-table-badge {
  margin-left: 0.5rem;
  padding: 0.25rem 0.625rem;
  background: var(--bg-base);
  border: 1px solid var(--border-color);
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.sync-table-body {
  padding: 1rem;
}

/* 加载状态 */
.sync-loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 3rem 0;
  color: var(--text-secondary);
}

.sync-loading-spinner {
  width: 3rem;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: var(--color-primary);
}

/* 空状态 */
.sync-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 0;
  text-align: center;
}

.sync-empty-icon {
  width: 4rem;
  height: 4rem;
  border-radius: 1rem;
  background: linear-gradient(135deg, rgba(255, 159, 10, 0.1) 0%, rgba(255, 159, 10, 0.02) 100%);
  border: 1px solid rgba(255, 159, 10, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: #FF9F0A;
  margin-bottom: 1rem;
}

.sync-empty-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.25rem 0;
}

.sync-empty-desc {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
}

/* 数据网格 */
.sync-data-grid {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.sync-data-row {
  display: grid;
  grid-template-columns: 3fr 4fr 1.5fr 1.5fr;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: var(--bg-base);
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  transition: all 0.2s ease;
}

.sync-data-row:hover {
  border-color: rgba(255, 159, 10, 0.3);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transform: translateY(-1px);
}

.sync-data-row.has-diff {
  border-left: 3px solid #F59E0B;
}

.sync-data-row.synced {
  border-left: 3px solid #22C55E;
}

.sync-row-main {
  display: flex;
  align-items: center;
  gap: 0.875rem;
}

.sync-table-icon {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.5rem;
  background: rgba(var(--color-primary-rgb), 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.125rem;
  color: var(--color-primary);
}

.sync-table-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.sync-table-name {
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--text-primary);
}

.sync-table-code {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.sync-row-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  justify-self: center;
}

.sync-stat-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.125rem;
  padding: 0.5rem 0.875rem;
  background: rgba(var(--bg-base-rgb), 0.5);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  min-width: 4rem;
}

.sync-stat-box.has-error {
  border-color: rgba(239, 68, 68, 0.3);
  background: rgba(239, 68, 68, 0.05);
}

.sync-stat-box-label {
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-tertiary);
}

.sync-stat-box-value {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-primary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.sync-stat-box-value .error-text {
  color: #EF4444;
  font-size: 0.75rem;
}

.sync-stat-arrow {
  color: var(--text-tertiary);
  font-size: 1rem;
}

.sync-row-status {
  display: flex;
  justify-content: flex-end;
  justify-self: end;
}

/* 当它是最后一个元素时（即没有 sync-result 时），跨越最后两列，实现右对齐且不留空隙 */
.sync-row-status:last-child {
  grid-column: 3 / -1;
}

.sync-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.875rem;
  border-radius: 9999px;
  font-size: 0.8125rem;
  font-weight: 600;
}

.sync-status-badge.success {
  color: #22C55E;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.2);
}

.sync-status-badge.warning {
  color: #F59E0B;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.2);
}

.sync-status-badge i {
  font-size: 1rem;
}

.sync-row-result {
  display: flex;
  justify-content: flex-end;
  justify-self: end;
}

.sync-result-success {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.875rem;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.2);
  border-radius: 0.5rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #22C55E;
}

.sync-result-error {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.875rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 0.5rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #EF4444;
  cursor: help;
}

.sync-result-pending {
  color: var(--text-tertiary);
  font-size: 0.875rem;
}

/* 响应式适配 */
@media (max-width: 1024px) {
  .sync-data-row {
    grid-template-columns: 1fr 1fr;
    gap: 1rem 0.5rem;
  }

  .sync-row-status,
  .sync-row-result {
    justify-content: flex-start;
  }
}

@media (max-width: 768px) {
  .data-sync-panel {
    padding: 1rem;
  }

  .sync-header-main {
    flex-direction: column;
    align-items: stretch;
  }

  .sync-stats {
    gap: 0.5rem;
  }

  .sync-stat-item {
    flex-direction: column;
    text-align: center;
    padding: 0.75rem;
  }

  .sync-form-row {
    grid-template-columns: 1fr;
  }

  .sync-db-type-selector {
    grid-template-columns: 1fr;
  }

  .sync-form-footer {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .sync-security-note {
    text-align: center;
    justify-content: center;
  }

  .sync-connection-banner {
    flex-direction: column;
    text-align: center;
  }

  .sync-connection-info {
    flex-direction: column;
  }

  .sync-connection-actions {
    width: 100%;
  }

  .sync-connection-actions .sync-action-btn {
    flex: 1;
    justify-content: center;
  }

  .sync-data-row {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .sync-row-stats {
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .sync-stat-value {
    font-size: 1.25rem;
  }

  .sync-stat-label {
    font-size: 0.6875rem;
  }
}
</style>
