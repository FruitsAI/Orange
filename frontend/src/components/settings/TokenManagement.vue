<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { tokenApi, type PersonalAccessToken } from '@/api/token'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { formatRelativeTime } from '@/utils/format'

const toast = useToast()
const { confirm } = useConfirm()

const tokens = ref<PersonalAccessToken[]>([])
const loading = ref(false)
const showCreateModal = ref(false)
const showSuccessModal = ref(false)
const creating = ref(false)
const newTokenValue = ref('')

const createForm = ref({
  name: '',
  expires_in: 30
})

const expiryOptions = [
  { label: '7天', value: 7, desc: '短期测试' },
  { label: '30天', value: 30, desc: '开发使用' },
  { label: '90天', value: 90, desc: '生产环境' },
  { label: '1年', value: 365, desc: '长期项目' },
  { label: '永不过期', value: 0, desc: '关键服务' },
]

// 计算属性
const activeTokens = computed(() => tokens.value.filter(t => t.status === 1))
const revokedTokens = computed(() => tokens.value.filter(t => t.status !== 1))

// 格式化函数
const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '永不过期'
  const date = new Date(dateStr)
  const now = new Date()
  const daysLeft = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  
  if (daysLeft < 0) return '已过期'
  if (daysLeft === 0) return '今天过期'
  if (daysLeft === 1) return '明天过期'
  if (daysLeft <= 7) return `${daysLeft}天后过期`
  
  return date.toLocaleDateString('zh-CN', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  })
}

const formatLastUsed = (dateStr: string | null) => {
  if (!dateStr) return '从未使用'
  return formatRelativeTime(dateStr)
}

// API 调用
const fetchTokens = async () => {
  loading.value = true
  try {
    const res = await tokenApi.list()
    if (res.data.code === 0) {
      tokens.value = res.data.data
    }
  } catch (error) {
    console.error('Failed to fetch tokens:', error)
    toast.error('获取令牌列表失败')
  } finally {
    loading.value = false
  }
}

const openCreateModal = () => {
  createForm.value = { name: '', expires_in: 30 }
  showCreateModal.value = true
}

const handleCreateToken = async () => {
  if (!createForm.value.name.trim()) {
    toast.warning('请填写令牌名称')
    return
  }
  
  creating.value = true
  try {
    const res = await tokenApi.create(createForm.value)
    if (res.data.code === 0) {
      newTokenValue.value = res.data.data.token
      showCreateModal.value = false
      showSuccessModal.value = true
      fetchTokens()
      toast.success('令牌生成成功')
    } else {
      toast.error(res.data.message || '创建失败')
    }
  } catch (error) {
    console.error('Create token failed:', error)
    toast.error('创建失败')
  } finally {
    creating.value = false
  }
}

const handleRevoke = async (token: PersonalAccessToken) => {
  const confirmed = await confirm({
    title: '撤销令牌',
    message: `确定要撤销令牌 "${token.name}" 吗？撤销后该令牌将立即失效，无法恢复使用。`
  })
  
  if (confirmed) {
    try {
      const res = await tokenApi.revoke(token.id)
      if (res.data.code === 0) {
        toast.success('令牌已撤销')
        fetchTokens()
      }
    } catch (error) {
      console.error('Revoke failed:', error)
      toast.error('撤销失败')
    }
  }
}

const handleDelete = async (token: PersonalAccessToken) => {
  const confirmed = await confirm({
    title: '删除令牌',
    message: `确定要彻底删除令牌 "${token.name}" 吗？此操作不可恢复，令牌将从系统中永久移除。`
  })
  
  if (confirmed) {
    try {
      const res = await tokenApi.delete(token.id)
      if (res.data.code === 0) {
        toast.success('令牌已删除')
        fetchTokens()
      }
    } catch (error) {
      console.error('Delete failed:', error)
      toast.error('删除失败')
    }
  }
}

const copyToken = async () => {
  try {
    await navigator.clipboard.writeText(newTokenValue.value)
    toast.success('令牌已复制到剪贴板')
  } catch {
    toast.error('复制失败，请手动复制')
  }
}

onMounted(() => {
  fetchTokens()
})
</script>

<template>
  <div class="developer-settings">
    <!-- 头部区域 -->
    <div class="dev-header">
      <div class="dev-header-content">
        <div class="dev-title-section">
          <div class="dev-icon-wrapper">
            <i class="ri-terminal-box-line"></i>
          </div>
          <div class="dev-title-info">
            <h2 class="dev-title">开发设置</h2>
            <p class="dev-subtitle">管理个人访问令牌 (PAT) 用于 API 认证</p>
          </div>
        </div>
        <button class="dev-create-btn" @click="openCreateModal">
          <i class="ri-add-line"></i>
          <span>生成新令牌</span>
        </button>
      </div>
      
      <!-- 统计卡片 -->
      <div class="dev-stats">
        <div class="dev-stat-card">
          <div class="dev-stat-icon active">
            <i class="ri-shield-check-line"></i>
          </div>
          <div class="dev-stat-info">
            <span class="dev-stat-value">{{ activeTokens.length }}</span>
            <span class="dev-stat-label">有效令牌</span>
          </div>
        </div>
        <div class="dev-stat-card">
          <div class="dev-stat-icon revoked">
            <i class="ri-forbid-line"></i>
          </div>
          <div class="dev-stat-info">
            <span class="dev-stat-value">{{ revokedTokens.length }}</span>
            <span class="dev-stat-label">已撤销</span>
          </div>
        </div>
        <div class="dev-stat-card">
          <div class="dev-stat-icon total">
            <i class="ri-key-2-line"></i>
          </div>
          <div class="dev-stat-info">
            <span class="dev-stat-value">{{ tokens.length }}</span>
            <span class="dev-stat-label">总计</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 令牌列表 -->
    <div class="dev-content">
      <!-- 加载状态 -->
      <div v-if="loading" class="dev-loading">
        <div class="dev-loading-spinner">
          <i class="ri-loader-4-line animate-spin"></i>
        </div>
        <span>正在加载令牌列表...</span>
      </div>

      <!-- 空状态 -->
      <div v-else-if="tokens.length === 0" class="dev-empty">
        <div class="dev-empty-icon">
          <i class="ri-key-2-line"></i>
        </div>
        <h3 class="dev-empty-title">暂无访问令牌</h3>
        <p class="dev-empty-desc">生成您的第一个个人访问令牌，开始集成 API</p>
        <button class="dev-empty-btn" @click="openCreateModal">
          <i class="ri-add-line"></i>
          生成令牌
        </button>
      </div>

      <!-- 令牌列表 -->
      <div v-else class="dev-token-list">
        <!-- 活跃令牌 -->
        <div v-if="activeTokens.length > 0" class="dev-token-section">
          <h3 class="dev-section-title">
            <i class="ri-shield-check-line"></i>
            有效令牌
            <span class="dev-section-badge">{{ activeTokens.length }}</span>
          </h3>
          <div class="dev-token-grid">
            <div 
              v-for="token in activeTokens" 
              :key="token.id" 
              class="dev-token-card active"
            >
              <div class="dev-token-header">
                <div class="dev-token-name">
                  <i class="ri-key-line"></i>
                  <span>{{ token.name }}</span>
                </div>
                <span class="dev-token-status active">有效</span>
              </div>
              
              <div class="dev-token-meta">
                <div class="dev-meta-item">
                  <i class="ri-time-line"></i>
                  <span>最后使用: {{ formatLastUsed(token.last_used_at) }}</span>
                </div>
                <div class="dev-meta-item" :class="{ 'text-warning': token.expires_at && new Date(token.expires_at) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }">
                  <i class="ri-calendar-line"></i>
                  <span>{{ formatDate(token.expires_at) }}</span>
                </div>
              </div>
              
              <div class="dev-token-actions">
                <button class="dev-action-btn revoke" @click="handleRevoke(token)">
                  <i class="ri-forbid-line"></i>
                  撤销
                </button>
                <button class="dev-action-btn delete" @click="handleDelete(token)">
                  <i class="ri-delete-bin-line"></i>
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 已撤销令牌 -->
        <div v-if="revokedTokens.length > 0" class="dev-token-section">
          <h3 class="dev-section-title revoked">
            <i class="ri-forbid-line"></i>
            已撤销令牌
            <span class="dev-section-badge">{{ revokedTokens.length }}</span>
          </h3>
          <div class="dev-token-grid">
            <div 
              v-for="token in revokedTokens" 
              :key="token.id" 
              class="dev-token-card revoked"
            >
              <div class="dev-token-header">
                <div class="dev-token-name">
                  <i class="ri-key-line"></i>
                  <span>{{ token.name }}</span>
                </div>
                <span class="dev-token-status revoked">已撤销</span>
              </div>
              
              <div class="dev-token-meta">
                <div class="dev-meta-item">
                  <i class="ri-time-line"></i>
                  <span>最后使用: {{ formatLastUsed(token.last_used_at) }}</span>
                </div>
                <div class="dev-meta-item revoked">
                  <i class="ri-forbid-line"></i>
                  <span>已失效</span>
                </div>
              </div>
              
              <div class="dev-token-actions">
                <button class="dev-action-btn delete" @click="handleDelete(token)">
                  <i class="ri-delete-bin-line"></i>
                  彻底删除
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 创建令牌弹窗 -->
    <Teleport to="body">
      <Transition name="dev-modal">
        <div v-if="showCreateModal" class="dev-modal-overlay" @click.self="showCreateModal = false">
          <div class="dev-modal">
            <div class="dev-modal-header">
              <div class="dev-modal-title">
                <i class="ri-add-circle-line"></i>
                <span>生成新令牌</span>
              </div>
              <button class="dev-modal-close" @click="showCreateModal = false">
                <i class="ri-close-line"></i>
              </button>
            </div>
            
            <div class="dev-modal-body">
              <div class="dev-form-group">
                <label class="dev-form-label">
                  令牌名称
                  <span class="dev-required">*</span>
                </label>
                <input 
                  v-model="createForm.name" 
                  type="text" 
                  class="dev-form-input" 
                  placeholder="例如：CI/CD 部署、移动应用、测试环境"
                  @keyup.enter="handleCreateToken"
                />
                <span class="dev-form-hint">给令牌起个有意义的名字，方便日后识别用途</span>
              </div>
              
              <div class="dev-form-group">
                <label class="dev-form-label">过期时间</label>
                <div class="dev-expiry-options">
                  <button
                    v-for="opt in expiryOptions"
                    :key="opt.value"
                    class="dev-expiry-option"
                    :class="{ active: createForm.expires_in === opt.value }"
                    @click="createForm.expires_in = opt.value"
                  >
                    <span class="dev-expiry-label">{{ opt.label }}</span>
                    <span class="dev-expiry-desc">{{ opt.desc }}</span>
                  </button>
                </div>
              </div>
            </div>
            
            <div class="dev-modal-footer">
              <button class="dev-btn secondary" @click="showCreateModal = false">取消</button>
              <button 
                class="dev-btn primary" 
                :disabled="creating || !createForm.name.trim()"
                @click="handleCreateToken"
              >
                <i v-if="creating" class="ri-loader-4-line animate-spin"></i>
                <span>{{ creating ? '生成中...' : '生成令牌' }}</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 成功弹窗 -->
    <Teleport to="body">
      <Transition name="dev-modal">
        <div v-if="showSuccessModal" class="dev-modal-overlay" @click.self="showSuccessModal = false">
          <div class="dev-modal success">
            <div class="dev-modal-header success">
              <div class="dev-modal-title">
                <i class="ri-checkbox-circle-fill"></i>
                <span>令牌生成成功</span>
              </div>
            </div>
            
            <div class="dev-modal-body">
              <div class="dev-success-banner">
                <i class="ri-shield-keyhole-line"></i>
                <span>请立即保存您的令牌</span>
              </div>
              
              <p class="dev-success-desc">
                这是您<strong>唯一一次</strong>能看到该令牌的完整内容。出于安全考虑，令牌只显示一次，请立即复制并保存在安全的地方。
              </p>
              
              <div class="dev-token-display">
                <code class="dev-token-code">{{ newTokenValue }}</code>
                <button class="dev-copy-token-btn" @click="copyToken">
                  <i class="ri-file-copy-line"></i>
                  <span>复制令牌</span>
                </button>
              </div>
              
              <div class="dev-security-tips">
                <div class="dev-tip">
                  <i class="ri-lock-line"></i>
                  <span>不要分享或公开您的令牌</span>
                </div>
                <div class="dev-tip">
                  <i class="ri-shield-star-line"></i>
                  <span>建议存储在密码管理器中</span>
                </div>
              </div>
            </div>
            
            <div class="dev-modal-footer">
              <button class="dev-btn primary" @click="showSuccessModal = false">
                <i class="ri-check-line"></i>
                <span>我已保存</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* ===== 开发者主题设计 ===== */
/* 采用技术/终端风格，配合 Liquid Glass 效果 */

.developer-settings {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;
  min-height: 100%;
}

/* 头部区域 */
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

.dev-create-btn:active {
  transform: translateY(0);
}

/* 统计卡片 */
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
  backdrop-filter: blur(12px);
  transition: all 0.2s ease;
}

.dev-stat-card:hover {
  border-color: rgba(255, 159, 10, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
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

.dev-stat-icon.active {
  background: rgba(34, 197, 94, 0.1);
  color: #22C55E;
}

.dev-stat-icon.revoked {
  background: rgba(239, 68, 68, 0.1);
  color: #EF4444;
}

.dev-stat-icon.total {
  background: rgba(255, 159, 10, 0.1);
  color: #FF9F0A;
}

.dev-stat-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.dev-stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
}

.dev-stat-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-weight: 500;
}

/* 内容区域 */
.dev-content {
  flex: 1;
}

/* 加载状态 */
.dev-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 4rem 0;
  color: var(--text-secondary);
}

.dev-loading-spinner {
  width: 3rem;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: #FF9F0A;
}

/* 空状态 */
.dev-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 0;
  text-align: center;
}

.dev-empty-icon {
  width: 5rem;
  height: 5rem;
  border-radius: 1rem;
  background: linear-gradient(135deg, rgba(255, 159, 10, 0.1) 0%, rgba(255, 159, 10, 0.02) 100%);
  border: 1px solid rgba(255, 159, 10, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  color: #FF9F0A;
  margin-bottom: 1.5rem;
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
  margin: 0 0 1.5rem 0;
}

.dev-empty-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  background: transparent;
  color: #FF9F0A;
  border: 1px solid rgba(255, 159, 10, 0.3);
  border-radius: 0.625rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.dev-empty-btn:hover {
  background: rgba(255, 159, 10, 0.1);
  border-color: #FF9F0A;
}

/* 令牌列表 */
.dev-token-list {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.dev-token-section {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.dev-section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.dev-section-title i {
  color: #22C55E;
  font-size: 1rem;
}

.dev-section-title.revoked i {
  color: #EF4444;
}

.dev-section-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-secondary);
  margin-left: 0.25rem;
}

.dev-token-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1rem;
}

/* 令牌卡片 */
.dev-token-card {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  padding: 1.25rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: 0.875rem;
  backdrop-filter: blur(12px);
  transition: all 0.2s ease;
}

.dev-token-card:hover {
  border-color: rgba(255, 159, 10, 0.3);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  transform: translateY(-2px);
}

.dev-token-card.active {
  border-left: 3px solid #22C55E;
}

.dev-token-card.revoked {
  border-left: 3px solid #EF4444;
  opacity: 0.75;
}

.dev-token-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}

.dev-token-name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.9375rem;
}

.dev-token-name i {
  color: #FF9F0A;
  font-size: 1rem;
}

.dev-token-status {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.dev-token-status.active {
  background: rgba(34, 197, 94, 0.1);
  color: #22C55E;
  border: 1px solid rgba(34, 197, 94, 0.2);
}

.dev-token-status.revoked {
  background: rgba(239, 68, 68, 0.1);
  color: #EF4444;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.dev-token-meta {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.dev-meta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  color: var(--text-secondary);
}

.dev-meta-item i {
  font-size: 0.875rem;
  color: var(--text-tertiary);
}

.dev-meta-item.text-warning {
  color: #F59E0B;
}

.dev-meta-item.text-warning i {
  color: #F59E0B;
}

.dev-meta-item.revoked {
  color: #EF4444;
}

.dev-meta-item.revoked i {
  color: #EF4444;
}

.dev-token-actions {
  display: flex;
  gap: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--border-color);
}

.dev-action-btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.dev-action-btn:hover {
  background: var(--bg-base);
  border-color: var(--text-tertiary);
  color: var(--text-primary);
}

.dev-action-btn.revoke:hover {
  background: rgba(245, 158, 11, 0.1);
  border-color: #F59E0B;
  color: #F59E0B;
}

.dev-action-btn.delete:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: #EF4444;
  color: #EF4444;
}

/* ===== 弹窗样式 ===== */
.dev-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 1.5rem;
}

.dev-modal {
  width: 100%;
  max-width: 480px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: 1rem;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  animation: dev-modal-in 0.3s ease;
}

.dev-modal.success {
  max-width: 520px;
}

@keyframes dev-modal-in {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.dev-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.dev-modal-header.success {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.02) 100%);
  border-bottom-color: rgba(34, 197, 94, 0.2);
}

.dev-modal-title {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
}

.dev-modal-title i {
  color: #FF9F0A;
  font-size: 1.25rem;
}

.dev-modal-header.success .dev-modal-title i {
  color: #22C55E;
}

.dev-modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  background: transparent;
  border: none;
  border-radius: 0.5rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 1.25rem;
}

.dev-modal-close:hover {
  background: var(--bg-base);
  color: var(--text-primary);
}

.dev-modal-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.dev-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-color);
  background: rgba(0, 0, 0, 0.02);
}

[data-theme='dark'] .dev-modal-footer {
  background: rgba(255, 255, 255, 0.02);
}

/* 表单样式 */
.dev-form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.dev-form-label {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
}

.dev-required {
  color: #EF4444;
}

.dev-form-input {
  padding: 0.625rem 0.875rem;
  background: var(--bg-base);
  border: 1px solid var(--border-color);
  border-radius: 0.625rem;
  font-size: 0.9375rem;
  color: var(--text-primary);
  transition: all 0.2s ease;
  outline: none;
}

.dev-form-input:focus {
  border-color: #FF9F0A;
  box-shadow: 0 0 0 3px rgba(255, 159, 10, 0.1);
}

.dev-form-input::placeholder {
  color: var(--text-tertiary);
}

.dev-form-hint {
  font-size: 0.8125rem;
  color: var(--text-secondary);
}

/* 过期选项 */
.dev-expiry-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.625rem;
}

.dev-expiry-option {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem;
  background: var(--bg-base);
  border: 1px solid var(--border-color);
  border-radius: 0.625rem;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
}

.dev-expiry-option:hover {
  border-color: rgba(255, 159, 10, 0.4);
  background: rgba(255, 159, 10, 0.03);
}

.dev-expiry-option.active {
  border-color: #FF9F0A;
  background: rgba(255, 159, 10, 0.08);
}

.dev-expiry-label {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-primary);
}

.dev-expiry-option.active .dev-expiry-label {
  color: #FF9F0A;
}

.dev-expiry-desc {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

/* 按钮 */
.dev-btn {
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
}

.dev-btn.primary {
  background: #FF9F0A;
  color: white;
  box-shadow: 0 4px 12px rgba(255, 159, 10, 0.3);
}

.dev-btn.primary:hover:not(:disabled) {
  background: #E58909;
  box-shadow: 0 6px 16px rgba(255, 159, 10, 0.4);
  transform: translateY(-1px);
}

.dev-btn.primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dev-btn.secondary {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.dev-btn.secondary:hover {
  background: var(--bg-base);
  color: var(--text-primary);
  border-color: var(--text-tertiary);
}

/* 成功弹窗特殊样式 */
.dev-success-banner {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 1rem 1.25rem;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.02) 100%);
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: 0.75rem;
  color: #F59E0B;
  font-weight: 600;
  font-size: 0.9375rem;
}

.dev-success-banner i {
  font-size: 1.25rem;
}

.dev-success-desc {
  font-size: 0.9375rem;
  line-height: 1.6;
  color: var(--text-secondary);
  margin: 0;
}

.dev-success-desc strong {
  color: var(--text-primary);
  font-weight: 600;
}

.dev-token-display {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.dev-token-code {
  display: block;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(255, 159, 10, 0.2);
  border-radius: 0.625rem;
  font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace;
  font-size: 0.8125rem;
  color: var(--text-primary);
  word-break: break-all;
  line-height: 1.5;
}

[data-theme='dark'] .dev-token-code {
  background: rgba(255, 255, 255, 0.05);
}

.dev-copy-token-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: rgba(255, 159, 10, 0.1);
  border: 1px solid rgba(255, 159, 10, 0.3);
  border-radius: 0.625rem;
  color: #FF9F0A;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.dev-copy-token-btn:hover {
  background: rgba(255, 159, 10, 0.15);
  border-color: #FF9F0A;
}

.dev-security-tips {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background: var(--bg-base);
  border-radius: 0.625rem;
}

.dev-tip {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  color: var(--text-secondary);
}

.dev-tip i {
  color: var(--text-tertiary);
}

/* 过渡动画 */
.dev-modal-enter-active,
.dev-modal-leave-active {
  transition: all 0.3s ease;
}

.dev-modal-enter-from,
.dev-modal-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* 响应式适配 */
@media (max-width: 768px) {
  .developer-settings {
    padding: 1rem;
    gap: 1rem;
  }
  
  .dev-header-content {
    flex-direction: column;
    align-items: stretch;
  }
  
  .dev-stats {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .dev-stat-card {
    padding: 0.875rem;
  }
  
  .dev-stat-icon {
    width: 2rem;
    height: 2rem;
    font-size: 1rem;
  }
  
  .dev-stat-value {
    font-size: 1.25rem;
  }
  
  .dev-token-grid {
    grid-template-columns: 1fr;
  }
  
  .dev-expiry-options {
    grid-template-columns: 1fr;
  }
  
  .dev-modal-overlay {
    padding: 1rem;
    align-items: flex-end;
  }
  
  .dev-modal {
    max-height: calc(100vh - 2rem);
    overflow-y: auto;
  }
}

@media (max-width: 480px) {
  .dev-stats {
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }
  
  .dev-stat-card {
    flex-direction: column;
    text-align: center;
    gap: 0.5rem;
    padding: 0.75rem 0.5rem;
  }
  
  .dev-stat-label {
    font-size: 0.6875rem;
  }
}
</style>
