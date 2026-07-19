import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { authApi, type User } from '@/api/auth'
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination'
import { useConfirm } from '@/composables/useConfirm'
import { useToastStore } from '@/composables/useToast'
import {
  Avatar,
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  FormActions,
  FormGrid,
  IconButton,
  Input,
  Modal,
  PaginationBar,
  SearchField,
  SectionHeader,
  Select,
  Spinner,
  Surface,
} from '@/design-system'

interface UserForm {
  department: string
  email: string
  name: string
  password: string
  phone: string
  position: string
  role: 'admin' | 'user'
  status: number
  username: string
}

const emptyForm: UserForm = {
  department: '',
  email: '',
  name: '',
  password: '',
  phone: '',
  position: '',
  role: 'user',
  status: 1,
  username: '',
}

export default function UserManagement() {
  const { confirm } = useConfirm()
  const toastError = useToastStore((state) => state.error)
  const toastSuccess = useToastStore((state) => state.success)
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [form, setForm] = useState<UserForm>(emptyForm)
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resettingPassword, setResettingPassword] = useState(false)
  const loadRequestRef = useRef(0)
  const submitInFlightRef = useRef(false)
  const resetInFlightRef = useRef(false)

  const adminCount = users.filter((user) => user.role === 'admin').length
  const userCount = users.filter((user) => user.role !== 'admin').length
  const totalPages = Math.ceil(total / pageSize)
  const paginationInfo = useMemo(() => {
    if (total === 0) return '暂无数据'
    const start = (currentPage - 1) * pageSize + 1
    const end = Math.min(currentPage * pageSize, total)
    return `显示 ${start}-${end} 条，共 ${total} 条`
  }, [currentPage, pageSize, total])

  const loadUsers = useCallback(async () => {
    const requestId = ++loadRequestRef.current
    setLoading(true)
    try {
      const response = await authApi.getUsers({
        keyword: searchKeyword || undefined,
        page: currentPage,
        page_size: pageSize,
      })
      if (requestId === loadRequestRef.current) {
        setUsers(response.data.data.list)
        setTotal(response.data.data.total)
      }
    } catch {
      if (requestId === loadRequestRef.current) toastError('获取用户失败')
    } finally {
      if (requestId === loadRequestRef.current) setLoading(false)
    }
  }, [currentPage, pageSize, searchKeyword, toastError])

  useEffect(() => {
    const timer = window.setTimeout(loadUsers, 0)
    return () => {
      window.clearTimeout(timer)
      loadRequestRef.current += 1
    }
  }, [loadUsers])

  const openAddModal = () => {
    setEditingUser(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  const openEditModal = (user: User) => {
    setEditingUser(user)
    setForm({
      department: user.department || '',
      email: user.email || '',
      name: user.name || '',
      password: '',
      phone: user.phone || '',
      position: user.position || '',
      role: user.role === 'admin' ? 'admin' : 'user',
      status: user.status,
      username: user.username,
    })
    setShowModal(true)
  }

  const handleSearch = () => {
    setCurrentPage(1)
    setSearchKeyword(keyword)
  }

  const handleClearSearch = () => {
    setCurrentPage(1)
    setSearchKeyword('')
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitInFlightRef.current) return
    submitInFlightRef.current = true
    setSubmitting(true)
    try {
      if (editingUser) {
        await authApi.updateUser(editingUser.id, {
          department: form.department,
          email: form.email,
          name: form.name,
          phone: form.phone,
          position: form.position,
          role: form.role,
          status: form.status,
        })
        toastSuccess('用户已更新')
      } else {
        await authApi.createUser({
          email: form.email,
          name: form.name,
          password: form.password,
          phone: form.phone,
          role: form.role,
          username: form.username,
        })
        toastSuccess('用户已创建')
      }

      setShowModal(false)
      await loadUsers()
    } catch {
      toastError(editingUser ? '更新用户失败' : '创建用户失败')
    } finally {
      submitInFlightRef.current = false
      setSubmitting(false)
    }
  }

  const handleDelete = async (user: User) => {
    const confirmed = await confirm({
      actionLabel: '删除用户',
      actionVariant: 'danger',
      message: `确定要删除用户「${user.name || user.username}」吗？此操作不可恢复。`,
      title: '删除用户？',
    })
    if (!confirmed) return

    try {
      await authApi.deleteUser(user.id)
      toastSuccess('用户已删除')
      await loadUsers()
    } catch {
      toastError('删除用户失败')
    }
  }

  const handleResetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!resetPasswordUser || resetInFlightRef.current) return
    resetInFlightRef.current = true
    setResettingPassword(true)

    try {
      await authApi.resetPassword(resetPasswordUser.id, newPassword)
      toastSuccess('密码已重置')
      setResetPasswordUser(null)
      setNewPassword('')
    } catch {
      toastError('重置密码失败')
    } finally {
      resetInFlightRef.current = false
      setResettingPassword(false)
    }
  }

  return (
    <div className="user-management">
      <div className="settings-panel-header">
        <SectionHeader
          actions={
            <Button onClick={openAddModal}>
              <i className="ri-add-line" />
              <span>新增用户</span>
            </Button>
          }
          description="管理系统用户账户和权限设置"
          icon={<i className="ri-team-line" />}
          iconTone="info"
          size="lg"
          title="用户管理"
        />

        <div className="dev-stats">
          <Card.Root className="dev-stat-card" gap="sm" orientation="horizontal" padding="sm">
            <Surface className="dev-stat-icon" padding="none" radius="control" tone="info">
              <i className="ri-group-line" />
            </Surface>
            <div className="dev-stat-info">
              <span className="dev-stat-value">{total}</span>
              <span className="dev-stat-label">总用户</span>
            </div>
          </Card.Root>
          <Card.Root className="dev-stat-card" gap="sm" orientation="horizontal" padding="sm">
            <Surface className="dev-stat-icon" padding="none" radius="control" tone="accent">
              <i className="ri-shield-user-line" />
            </Surface>
            <div className="dev-stat-info">
              <span className="dev-stat-value">{adminCount}</span>
              <span className="dev-stat-label">管理员</span>
            </div>
          </Card.Root>
          <Card.Root className="dev-stat-card" gap="sm" orientation="horizontal" padding="sm">
            <Surface className="dev-stat-icon" padding="none" radius="control" tone="info">
              <i className="ri-user-line" />
            </Surface>
            <div className="dev-stat-info">
              <span className="dev-stat-value">{userCount}</span>
              <span className="dev-stat-label">普通用户</span>
            </div>
          </Card.Root>
        </div>
      </div>

      <div className="dev-content">
        <SearchField
          aria-label="搜索用户"
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          onClear={handleClearSearch}
          onValueChange={setKeyword}
          onKeyUp={(event) => {
            if (event.key === 'Enter') handleSearch()
          }}
          placeholder="搜索用户名或姓名..."
          spellCheck={false}
          value={keyword}
        />

        {loading ? (
          <Spinner className="dev-loading" label="正在加载用户列表" size="lg" />
        ) : users.length === 0 ? (
          <EmptyState
            className="dev-empty"
            description="点击右上角按钮添加新用户"
            icon={<i className="ri-user-unfollow-line" />}
            size="lg"
            title="暂无用户"
          />
        ) : (
          <div className="user-list">
            {users.map((user) => (
              <Card.Root
                className="user-card"
                gap="sm"
                key={user.id}
                orientation="horizontal"
                padding="sm"
              >
                <Avatar
                  fallback={
                    <i className={user.role === 'admin' ? 'ri-shield-user-fill' : 'ri-user-fill'} />
                  }
                  name={user.name || user.username}
                  tone={user.role === 'admin' ? 'accent' : 'neutral'}
                />

                <div className="user-info">
                  <div className="user-name-row">
                    <span className="user-name">{user.name || user.username}</span>
                    <Chip size="sm" tone={user.role === 'admin' ? 'accent' : 'neutral'}>
                      {user.role === 'admin' ? '管理员' : '普通用户'}
                    </Chip>
                    <Chip size="sm" tone={user.status === 1 ? 'success' : 'danger'}>
                      {user.status === 1 ? '正常' : '禁用'}
                    </Chip>
                  </div>
                  <div className="user-meta">
                    <span className="meta-item">
                      <i className="ri-at-line" /> {user.username}
                    </span>
                    {user.department ? (
                      <span className="meta-item">
                        <i className="ri-building-line" /> {user.department}
                      </span>
                    ) : null}
                    {user.position ? (
                      <span className="meta-item">
                        <i className="ri-briefcase-line" /> {user.position}
                      </span>
                    ) : null}
                  </div>
                  {user.email || user.phone ? (
                    <div className="user-contact">
                      {user.email ? (
                        <span className="contact-item">
                          <i className="ri-mail-line" /> {user.email}
                        </span>
                      ) : null}
                      {user.phone ? (
                        <span className="contact-item">
                          <i className="ri-phone-line" /> {user.phone}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="user-actions">
                  <IconButton
                    label="编辑用户"
                    onClick={() => openEditModal(user)}
                    size="sm"
                    title="编辑"
                    variant="ghost"
                  >
                    <i className="ri-edit-line" />
                  </IconButton>
                  <IconButton
                    label="重置用户密码"
                    onClick={() => {
                      setResetPasswordUser(user)
                      setNewPassword('')
                    }}
                    size="sm"
                    title="重置密码"
                    variant="ghost"
                  >
                    <i className="ri-key-line" />
                  </IconButton>
                  <IconButton
                    label="删除用户"
                    onClick={() => void handleDelete(user)}
                    size="sm"
                    title="删除"
                    variant="danger"
                  >
                    <i className="ri-delete-bin-line" />
                  </IconButton>
                </div>
              </Card.Root>
            ))}
          </div>
        )}

        {users.length > 0 ? (
          <PaginationBar
            info={paginationInfo}
            onPageChange={setCurrentPage}
            page={currentPage}
            pageCount={totalPages}
            separated
            trailing={
              <Select
                aria-label="每页条数"
                onValueChange={(value) => {
                  setPageSize(Number(value))
                  setCurrentPage(1)
                }}
                options={[
                  { label: '5条/页', value: '5' },
                  { label: '10条/页', value: '10' },
                ]}
                size="sm"
                value={String(pageSize)}
              />
            }
          />
        ) : null}
      </div>

      <Modal.Root
        dismissable={!submitting}
        onClose={() => setShowModal(false)}
        open={showModal}
        size="lg"
      >
        <Modal.Header>{editingUser ? '编辑用户' : '新增用户'}</Modal.Header>
        {!submitting ? (
          <Modal.Close label={editingUser ? '关闭编辑用户弹窗' : '关闭新增用户弹窗'} />
        ) : null}
        <form onSubmit={handleSubmit}>
          <Modal.Body className="settings-modal-body">
            <FormGrid columns={2}>
              <Field.Root required>
                <Field.Label>用户名</Field.Label>
                <Input
                  disabled={Boolean(editingUser)}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, username: event.target.value }))
                  }
                  value={form.username}
                />
              </Field.Root>
              <Field.Root required>
                <Field.Label>姓名</Field.Label>
                <Input
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  value={form.name}
                />
              </Field.Root>
              {!editingUser ? (
                <Field.Root className="settings-field--full" required>
                  <Field.Label>初始密码</Field.Label>
                  <Input
                    autoComplete="new-password"
                    onChange={(event) =>
                      setForm((current) => ({ ...current, password: event.target.value }))
                    }
                    type="password"
                    value={form.password}
                  />
                </Field.Root>
              ) : null}
              <Field.Root>
                <Field.Label>角色</Field.Label>
                <Select
                  aria-label="角色"
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, role: value as 'admin' | 'user' }))
                  }
                  options={[
                    { label: '普通用户', value: 'user' },
                    { label: '管理员', value: 'admin' },
                  ]}
                  value={form.role}
                />
              </Field.Root>
              <Field.Root>
                <Field.Label>状态</Field.Label>
                <Select
                  aria-label="状态"
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, status: Number(value) }))
                  }
                  options={[
                    { label: '正常', value: '1' },
                    { label: '禁用', value: '0' },
                  ]}
                  value={String(form.status)}
                />
              </Field.Root>
              <Field.Root>
                <Field.Label>邮箱</Field.Label>
                <Input
                  onChange={(event) =>
                    setForm((current) => ({ ...current, email: event.target.value }))
                  }
                  type="email"
                  value={form.email}
                />
              </Field.Root>
              <Field.Root>
                <Field.Label>手机</Field.Label>
                <Input
                  onChange={(event) =>
                    setForm((current) => ({ ...current, phone: event.target.value }))
                  }
                  value={form.phone}
                />
              </Field.Root>
              <Field.Root>
                <Field.Label>部门</Field.Label>
                <Input
                  onChange={(event) =>
                    setForm((current) => ({ ...current, department: event.target.value }))
                  }
                  value={form.department}
                />
              </Field.Root>
              <Field.Root>
                <Field.Label>职位</Field.Label>
                <Input
                  onChange={(event) =>
                    setForm((current) => ({ ...current, position: event.target.value }))
                  }
                  value={form.position}
                />
              </Field.Root>
            </FormGrid>
          </Modal.Body>
          <Modal.Footer>
            <FormActions>
              <Button disabled={submitting} onClick={() => setShowModal(false)} variant="ghost">
                取消
              </Button>
              <Button pending={submitting} type="submit">
                {submitting ? '保存中...' : '保存'}
              </Button>
            </FormActions>
          </Modal.Footer>
        </form>
      </Modal.Root>

      <Modal.Root
        dismissable={!resettingPassword}
        onClose={() => setResetPasswordUser(null)}
        open={Boolean(resetPasswordUser)}
        size="sm"
      >
        <Modal.Header>重置密码 - {resetPasswordUser?.username}</Modal.Header>
        {!resettingPassword ? <Modal.Close label="关闭重置密码弹窗" /> : null}
        <form onSubmit={handleResetPassword}>
          <Modal.Body className="settings-modal-body">
            <Field.Root required>
              <Field.Label>新密码</Field.Label>
              <Input
                autoComplete="new-password"
                onChange={(event) => setNewPassword(event.target.value)}
                type="password"
                value={newPassword}
              />
            </Field.Root>
          </Modal.Body>
          <Modal.Footer>
            <FormActions>
              <Button
                disabled={resettingPassword}
                onClick={() => setResetPasswordUser(null)}
                variant="ghost"
              >
                取消
              </Button>
              <Button pending={resettingPassword} type="submit">
                {resettingPassword ? '重置中...' : '确认重置'}
              </Button>
            </FormActions>
          </Modal.Footer>
        </form>
      </Modal.Root>
    </div>
  )
}
