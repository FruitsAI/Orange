import { useCallback, useEffect, useMemo, useState } from 'react'
import { tokenApi, type PersonalAccessToken } from '@/api/token'
import { useConfirm } from '@/composables/useConfirm'
import { useToastStore } from '@/composables/useToast'
import {
  Alert,
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  FormActions,
  Input,
  Modal,
  Radio,
  RadioGroup,
  SectionHeader,
  Snippet,
  Spinner,
  Surface,
} from '@/design-system'
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
    if (creating) return
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
      actionLabel: '撤销令牌',
      actionVariant: 'danger',
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
      actionLabel: '删除令牌',
      actionVariant: 'danger',
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

  return (
    <div className="developer-settings">
      <div className="settings-panel-header">
        <SectionHeader
          actions={
            <Button onClick={openCreateModal}>
              <i className="ri-add-line" />
              <span>生成新令牌</span>
            </Button>
          }
          description="管理个人访问令牌 (PAT) 用于 API 认证"
          icon={<i className="ri-terminal-box-line" />}
          size="lg"
          title="开发设置"
        />

        <div className="dev-stats">
          <Card.Root className="dev-stat-card" gap="sm" orientation="horizontal" padding="sm">
            <Surface className="dev-stat-icon" padding="none" radius="control" tone="success">
              <i className="ri-shield-check-line" />
            </Surface>
            <div className="dev-stat-info">
              <span className="dev-stat-value">{activeTokens.length}</span>
              <span className="dev-stat-label">有效令牌</span>
            </div>
          </Card.Root>
          <Card.Root className="dev-stat-card" gap="sm" orientation="horizontal" padding="sm">
            <Surface className="dev-stat-icon" padding="none" radius="control" tone="danger">
              <i className="ri-forbid-line" />
            </Surface>
            <div className="dev-stat-info">
              <span className="dev-stat-value">{revokedTokens.length}</span>
              <span className="dev-stat-label">已撤销</span>
            </div>
          </Card.Root>
          <Card.Root className="dev-stat-card" gap="sm" orientation="horizontal" padding="sm">
            <Surface className="dev-stat-icon" padding="none" radius="control" tone="info">
              <i className="ri-key-2-line" />
            </Surface>
            <div className="dev-stat-info">
              <span className="dev-stat-value">{tokens.length}</span>
              <span className="dev-stat-label">总计</span>
            </div>
          </Card.Root>
        </div>
      </div>

      <div className="dev-content">
        {loading ? (
          <Spinner className="dev-loading" label="正在加载令牌列表" size="lg" />
        ) : tokens.length === 0 ? (
          <EmptyState
            action={
              <Button onClick={openCreateModal}>
                <i className="ri-add-line" />
                生成令牌
              </Button>
            }
            className="dev-empty"
            description="生成您的第一个个人访问令牌，开始集成 API"
            icon={<i className="ri-key-2-line" />}
            title="暂无访问令牌"
          />
        ) : (
          <div className="dev-token-list">
            {activeTokens.length > 0 ? (
              <div className="dev-token-section">
                <h3 className="dev-section-title">
                  <i className="ri-shield-check-line" />
                  有效令牌
                  <Chip size="sm" tone="success">
                    {activeTokens.length}
                  </Chip>
                </h3>
                <div className="dev-token-grid">
                  {activeTokens.map((token) => (
                    <Card.Root
                      className="dev-token-card"
                      gap="sm"
                      key={token.id}
                      padding="sm"
                      tone="success"
                    >
                      <div className="dev-token-header">
                        <div className="dev-token-name">
                          <i className="ri-key-line" />
                          <span>{token.name}</span>
                        </div>
                        <Chip size="sm" tone="success">
                          有效
                        </Chip>
                      </div>

                      <div className="dev-token-meta">
                        <div className="dev-meta-item">
                          <i className="ri-time-line" />
                          <span>最后使用: {formatLastUsed(token.last_used_at)}</span>
                        </div>
                        <div
                          className={`dev-meta-item ${isExpiringSoon(token.expires_at) ? 'text-warning' : ''}`}
                        >
                          <i className="ri-calendar-line" />
                          <span>{formatExpiryDate(token.expires_at)}</span>
                        </div>
                      </div>

                      <div className="dev-token-actions">
                        <Button
                          onClick={() => void handleRevoke(token)}
                          size="sm"
                          variant="secondary"
                        >
                          <i className="ri-forbid-line" />
                          撤销
                        </Button>
                        <Button onClick={() => void handleDelete(token)} size="sm" variant="danger">
                          <i className="ri-delete-bin-line" />
                          删除
                        </Button>
                      </div>
                    </Card.Root>
                  ))}
                </div>
              </div>
            ) : null}

            {revokedTokens.length > 0 ? (
              <div className="dev-token-section">
                <h3 className="dev-section-title revoked">
                  <i className="ri-forbid-line" />
                  已撤销令牌
                  <Chip size="sm">{revokedTokens.length}</Chip>
                </h3>
                <div className="dev-token-grid">
                  {revokedTokens.map((token) => (
                    <Card.Root
                      className="dev-token-card"
                      gap="sm"
                      key={token.id}
                      padding="sm"
                      tone="danger"
                    >
                      <div className="dev-token-header">
                        <div className="dev-token-name">
                          <i className="ri-key-line" />
                          <span>{token.name}</span>
                        </div>
                        <Chip size="sm" tone="danger">
                          已撤销
                        </Chip>
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
                        <Button onClick={() => void handleDelete(token)} size="sm" variant="danger">
                          <i className="ri-delete-bin-line" />
                          彻底删除
                        </Button>
                      </div>
                    </Card.Root>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <Modal.Root
        dismissable={!creating}
        onClose={() => {
          if (!creating) setShowCreateModal(false)
        }}
        open={showCreateModal}
      >
        <Modal.Header>生成新令牌</Modal.Header>
        {!creating ? <Modal.Close label="关闭生成令牌弹窗" /> : null}
        <Modal.Body className="settings-modal-body">
          <Field.Root required>
            <Field.Label>令牌名称</Field.Label>
            <Input
              disabled={creating}
              onChange={(event) =>
                setCreateForm((current) => ({ ...current, name: event.target.value }))
              }
              onKeyUp={(event) => {
                if (event.key === 'Enter') void handleCreateToken()
              }}
              placeholder="例如：CI/CD 部署、移动应用、测试环境"
              value={createForm.name}
            />
            <Field.Description>给令牌起个有意义的名字，方便日后识别用途</Field.Description>
          </Field.Root>

          <RadioGroup
            aria-label="过期时间"
            columns={2}
            disabled={creating}
            onValueChange={(value) =>
              setCreateForm((current) => ({ ...current, expires_in: Number(value) }))
            }
            value={String(createForm.expires_in)}
          >
            <RadioGroup.Legend>过期时间</RadioGroup.Legend>
            {expiryOptions.map((option) => (
              <Radio key={option.value} value={String(option.value)} variant="card">
                <span className="dev-expiry-content">
                  <span className="dev-expiry-label">{option.label}</span>
                  <span className="dev-expiry-desc">{option.desc}</span>
                </span>
              </Radio>
            ))}
          </RadioGroup>
        </Modal.Body>

        <Modal.Footer>
          <FormActions>
            <Button
              disabled={creating}
              onClick={() => setShowCreateModal(false)}
              variant="secondary"
            >
              取消
            </Button>
            <Button
              disabled={!createForm.name.trim()}
              onClick={() => void handleCreateToken()}
              pending={creating}
            >
              {creating ? '生成中...' : '生成令牌'}
            </Button>
          </FormActions>
        </Modal.Footer>
      </Modal.Root>

      <Modal.Root dismissable={false} onClose={() => undefined} open={showSuccessModal}>
        <Modal.Header>令牌生成成功</Modal.Header>
        <Modal.Body className="settings-modal-body">
          <Alert
            icon={<i className="ri-shield-keyhole-line" />}
            title="请立即保存您的令牌"
            tone="success"
          />

          <p className="dev-success-desc">
            这是您<strong>唯一一次</strong>
            能看到该令牌的完整内容。出于安全考虑，令牌只显示一次，请立即复制并保存在安全的地方。
          </p>

          <Snippet
            className="dev-token-display"
            copyLabel="复制令牌"
            copyValue={newTokenValue}
            hideSymbol
            onCopyError={() => toastError('复制失败，请手动复制')}
            onCopySuccess={() => toastSuccess('令牌已复制到剪贴板')}
            size="lg"
          >
            {newTokenValue}
          </Snippet>

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
        </Modal.Body>

        <Modal.Footer>
          <Button
            onClick={() => {
              setShowSuccessModal(false)
              setNewTokenValue('')
            }}
          >
            <i className="ri-check-line" />
            <span>我已保存</span>
          </Button>
        </Modal.Footer>
      </Modal.Root>
    </div>
  )
}
