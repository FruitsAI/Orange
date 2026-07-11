import { useCallback, useEffect, useMemo, useState } from 'react'
import { tokenApi, type PersonalAccessToken } from '@/api/token'
import { useConfirm } from '@/composables/useConfirm'
import { useToastStore } from '@/composables/useToast'
import { formatRelativeTime } from '@/utils/format'

const expiryOptions = [
  { desc: '短期测试', label: '7天', value: 7 },
  { desc: '开发使用', label: '30天', value: 30 },
  { desc: '生产环境', label: '90天', value: 90 },
  { desc: '长期项目', label: '1年', value: 365 },
  { desc: '关键服务', label: '永不过期', value: 0 },
]

const formatExpiryDate = (dateStr: string | null) => {
  if (!dateStr) return '永不过期'

  const date = new Date(dateStr)
  const now = new Date()
  const daysLeft = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (daysLeft < 0) return '已过期'
  if (daysLeft === 0) return '今天过期'
  if (daysLeft === 1) return '明天过期'
  if (daysLeft <= 7) return `${daysLeft}天后过期`

  return date.toLocaleDateString('zh-CN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const formatLastUsed = (dateStr: string | null) => {
  if (!dateStr) return '从未使用'
  return formatRelativeTime(dateStr)
}

const isExpiringSoon = (dateStr: string | null) => {
  if (!dateStr) return false
  return new Date(dateStr) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
}

export default function TokenManagement() {
  const { confirm } = useConfirm()
  const toastError = useToastStore((state) => state.error)
  const toastSuccess = useToastStore((state) => state.success)
  const toastWarning = useToastStore((state) => state.warning)
  const [tokens, setTokens] = useState<PersonalAccessToken[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newTokenValue, setNewTokenValue] = useState('')
  const [createForm, setCreateForm] = useState({ expires_in: 30, name: '' })

  const activeTokens = useMemo(() => tokens.filter((token) => token.status === 1), [tokens])
  const revokedTokens = useMemo(() => tokens.filter((token) => token.status !== 1), [tokens])

  const fetchTokens = useCallback(async () => {
    setLoading(true)
    try {
      const response = await tokenApi.list()
      setTokens(response.data.data)
    } catch {
      toastError('获取令牌列表失败')
    } finally {
      setLoading(false)
    }
  }, [toastError])

  useEffect(() => {
    const timer = window.setTimeout(fetchTokens, 0)
    return () => window.clearTimeout(timer)
  }, [fetchTokens])

  const openCreateModal = () => {
    setCreateForm({ expires_in: 30, name: '' })
    setShowCreateModal(true)
  }

  const handleCreateToken = async () => {
    if (!createForm.name.trim()) {
      toastWarning('请填写令牌名称')
      return
    }

    setCreating(true)
    try {
      const response = await tokenApi.create({
        expires_in: createForm.expires_in,
        name: createForm.name.trim(),
      })
      setNewTokenValue(response.data.data.token)
      setShowCreateModal(false)
      setShowSuccessModal(true)
      toastSuccess('令牌生成成功')
      await fetchTokens()
    } catch {
      toastError('创建失败')
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = async (token: PersonalAccessToken) => {
    const confirmed = await confirm({
      message: `确定要撤销令牌 "${token.name}" 吗？撤销后该令牌将立即失效，无法恢复使用。`,
      title: '撤销令牌',
    })
    if (!confirmed) return

    try {
      await tokenApi.revoke(token.id)
      toastSuccess('令牌已撤销')
      await fetchTokens()
    } catch {
      toastError('撤销失败')
    }
  }

  const handleDelete = async (token: PersonalAccessToken) => {
    const confirmed = await confirm({
      message: `确定要彻底删除令牌 "${token.name}" 吗？此操作不可恢复，令牌将从系统中永久移除。`,
      title: '删除令牌',
    })
    if (!confirmed) return

    try {
      await tokenApi.delete(token.id)
      toastSuccess('令牌已删除')
      await fetchTokens()
    } catch {
      toastError('删除失败')
    }
  }

  const copyToken = async () => {
    try {
      await navigator.clipboard.writeText(newTokenValue)
      toastSuccess('令牌已复制到剪贴板')
    } catch {
      toastError('复制失败，请手动复制')
    }
  }

  return (
    <div className="developer-settings">
      <div className="dev-header">
        <div className="dev-header-content">
          <div className="dev-title-section">
            <div className="dev-icon-wrapper">
              <i className="ri-terminal-box-line" />
            </div>
            <div className="dev-title-info">
              <h2 className="dev-title">开发设置</h2>
              <p className="dev-subtitle">管理个人访问令牌 (PAT) 用于 API 认证</p>
            </div>
          </div>
          <button className="dev-create-btn" onClick={openCreateModal} type="button">
            <i className="ri-add-line" />
            <span>生成新令牌</span>
          </button>
        </div>

        <div className="dev-stats">
          <div className="dev-stat-card">
            <div className="dev-stat-icon active">
              <i className="ri-shield-check-line" />
            </div>
            <div className="dev-stat-info">
              <span className="dev-stat-value">{activeTokens.length}</span>
              <span className="dev-stat-label">有效令牌</span>
            </div>
          </div>
          <div className="dev-stat-card">
            <div className="dev-stat-icon revoked">
              <i className="ri-forbid-line" />
            </div>
            <div className="dev-stat-info">
              <span className="dev-stat-value">{revokedTokens.length}</span>
              <span className="dev-stat-label">已撤销</span>
            </div>
          </div>
          <div className="dev-stat-card">
            <div className="dev-stat-icon total">
              <i className="ri-key-2-line" />
            </div>
            <div className="dev-stat-info">
              <span className="dev-stat-value">{tokens.length}</span>
              <span className="dev-stat-label">总计</span>
            </div>
          </div>
        </div>
      </div>

      <div className="dev-content">
        {loading ? (
          <div className="dev-loading">
            <div className="dev-loading-spinner">
              <i className="ri-loader-4-line animate-spin" />
            </div>
            <span>正在加载令牌列表...</span>
          </div>
        ) : tokens.length === 0 ? (
          <div className="dev-empty">
            <div className="dev-empty-icon">
              <i className="ri-key-2-line" />
            </div>
            <h3 className="dev-empty-title">暂无访问令牌</h3>
            <p className="dev-empty-desc">生成您的第一个个人访问令牌，开始集成 API</p>
            <button className="dev-empty-btn" onClick={openCreateModal} type="button">
              <i className="ri-add-line" />
              生成令牌
            </button>
          </div>
        ) : (
          <div className="dev-token-list">
            {activeTokens.length > 0 ? (
              <div className="dev-token-section">
                <h3 className="dev-section-title">
                  <i className="ri-shield-check-line" />
                  有效令牌
                  <span className="dev-section-badge">{activeTokens.length}</span>
                </h3>
                <div className="dev-token-grid">
                  {activeTokens.map((token) => (
                    <div className="dev-token-card active" key={token.id}>
                      <div className="dev-token-header">
                        <div className="dev-token-name">
                          <i className="ri-key-line" />
                          <span>{token.name}</span>
                        </div>
                        <span className="dev-token-status active">有效</span>
                      </div>

                      <div className="dev-token-meta">
                        <div className="dev-meta-item">
                          <i className="ri-time-line" />
                          <span>最后使用: {formatLastUsed(token.last_used_at)}</span>
                        </div>
                        <div className={`dev-meta-item ${isExpiringSoon(token.expires_at) ? 'text-warning' : ''}`}>
                          <i className="ri-calendar-line" />
                          <span>{formatExpiryDate(token.expires_at)}</span>
                        </div>
                      </div>

                      <div className="dev-token-actions">
                        <button className="dev-action-btn revoke" onClick={() => void handleRevoke(token)} type="button">
                          <i className="ri-forbid-line" />
                          撤销
                        </button>
                        <button className="dev-action-btn delete" onClick={() => void handleDelete(token)} type="button">
                          <i className="ri-delete-bin-line" />
                          删除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {revokedTokens.length > 0 ? (
              <div className="dev-token-section">
                <h3 className="dev-section-title revoked">
                  <i className="ri-forbid-line" />
                  已撤销令牌
                  <span className="dev-section-badge">{revokedTokens.length}</span>
                </h3>
                <div className="dev-token-grid">
                  {revokedTokens.map((token) => (
                    <div className="dev-token-card revoked" key={token.id}>
                      <div className="dev-token-header">
                        <div className="dev-token-name">
                          <i className="ri-key-line" />
                          <span>{token.name}</span>
                        </div>
                        <span className="dev-token-status revoked">已撤销</span>
                      </div>

                      <div className="dev-token-meta">
                        <div className="dev-meta-item">
                          <i className="ri-time-line" />
                          <span>最后使用: {formatLastUsed(token.last_used_at)}</span>
                        </div>
                        <div className="dev-meta-item revoked">
                          <i className="ri-forbid-line" />
                          <span>已失效</span>
                        </div>
                      </div>

                      <div className="dev-token-actions">
                        <button className="dev-action-btn delete" onClick={() => void handleDelete(token)} type="button">
                          <i className="ri-delete-bin-line" />
                          彻底删除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {showCreateModal ? (
        <div className="dev-modal-overlay" onClick={() => setShowCreateModal(false)} role="presentation">
          <div className="dev-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <div className="dev-modal-header">
              <div className="dev-modal-title">
                <i className="ri-add-circle-line" />
                <span>生成新令牌</span>
              </div>
              <button className="dev-modal-close" onClick={() => setShowCreateModal(false)} type="button">
                <i className="ri-close-line" />
              </button>
            </div>

            <div className="dev-modal-body">
              <div className="dev-form-group">
                <label className="dev-form-label">
                  令牌名称
                  <span className="dev-required">*</span>
                </label>
                <input
                  className="dev-form-input"
                  onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
                  onKeyUp={(event) => {
                    if (event.key === 'Enter') void handleCreateToken()
                  }}
                  placeholder="例如：CI/CD 部署、移动应用、测试环境"
                  type="text"
                  value={createForm.name}
                />
                <span className="dev-form-hint">给令牌起个有意义的名字，方便日后识别用途</span>
              </div>

              <div className="dev-form-group">
                <label className="dev-form-label">过期时间</label>
                <div className="dev-expiry-options">
                  {expiryOptions.map((option) => (
                    <button
                      className={`dev-expiry-option ${createForm.expires_in === option.value ? 'active' : ''}`}
                      key={option.value}
                      onClick={() => setCreateForm((current) => ({ ...current, expires_in: option.value }))}
                      type="button"
                    >
                      <span className="dev-expiry-label">{option.label}</span>
                      <span className="dev-expiry-desc">{option.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="dev-modal-footer">
              <button className="dev-btn secondary" onClick={() => setShowCreateModal(false)} type="button">
                取消
              </button>
              <button
                className="dev-btn primary"
                disabled={creating || !createForm.name.trim()}
                onClick={() => void handleCreateToken()}
                type="button"
              >
                {creating ? <i className="ri-loader-4-line animate-spin" /> : null}
                <span>{creating ? '生成中...' : '生成令牌'}</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showSuccessModal ? (
        <div className="dev-modal-overlay" onClick={() => setShowSuccessModal(false)} role="presentation">
          <div
            aria-modal="true"
            className="dev-modal success"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="dev-modal-header success">
              <div className="dev-modal-title">
                <i className="ri-checkbox-circle-fill" />
                <span>令牌生成成功</span>
              </div>
            </div>

            <div className="dev-modal-body">
              <div className="dev-success-banner">
                <i className="ri-shield-keyhole-line" />
                <span>请立即保存您的令牌</span>
              </div>

              <p className="dev-success-desc">
                这是您<strong>唯一一次</strong>
                能看到该令牌的完整内容。出于安全考虑，令牌只显示一次，请立即复制并保存在安全的地方。
              </p>

              <div className="dev-token-display">
                <code className="dev-token-code">{newTokenValue}</code>
                <button className="dev-copy-token-btn" onClick={() => void copyToken()} type="button">
                  <i className="ri-file-copy-line" />
                  <span>复制令牌</span>
                </button>
              </div>

              <div className="dev-security-tips">
                <div className="dev-tip">
                  <i className="ri-lock-line" />
                  <span>不要分享或公开您的令牌</span>
                </div>
                <div className="dev-tip">
                  <i className="ri-shield-star-line" />
                  <span>建议存储在密码管理器中</span>
                </div>
              </div>
            </div>

            <div className="dev-modal-footer">
              <button className="dev-btn primary" onClick={() => setShowSuccessModal(false)} type="button">
                <i className="ri-check-line" />
                <span>我已保存</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
