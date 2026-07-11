import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { authApi, type User } from '@/api/auth'
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination'
import { useConfirm } from '@/composables/useConfirm'
import { useToastStore } from '@/composables/useToast'

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

const getVisiblePages = (currentPage: number, totalPages: number) => {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1)

  const pages: Array<number | string> = [1]
  const delta = 2
  let start = currentPage - delta
  let end = currentPage + delta

  if (start <= 2) {
    start = 2
    end = Math.min(6, totalPages - 1)
  } else if (end >= totalPages - 1) {
    end = totalPages - 1
    start = Math.max(totalPages - 5, 2)
  }

  if (start > 2) pages.push('...')
  for (let page = start; page <= end; page += 1) pages.push(page)
  if (end < totalPages - 1) pages.push('...')
  if (totalPages > 1) pages.push(totalPages)

  return pages
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

  const adminCount = users.filter((user) => user.role === 'admin').length
  const userCount = users.filter((user) => user.role !== 'admin').length
  const totalPages = Math.ceil(total / pageSize)
  const visiblePages = useMemo(() => getVisiblePages(currentPage, totalPages), [currentPage, totalPages])

  const paginationInfo = useMemo(() => {
    if (total === 0) return '暂无数据'
    const start = (currentPage - 1) * pageSize + 1
    const end = Math.min(currentPage * pageSize, total)
    return `显示 ${start}-${end} 条，共 ${total} 条`
  }, [currentPage, pageSize, total])

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const response = await authApi.getUsers({
        keyword: searchKeyword || undefined,
        page: currentPage,
        page_size: pageSize,
      })
      setUsers(response.data.data.list)
      setTotal(response.data.data.total)
    } catch {
      toastError('获取用户失败')
    } finally {
      setLoading(false)
    }
  }, [currentPage, pageSize, searchKeyword, toastError])

  useEffect(() => {
    const timer = window.setTimeout(loadUsers, 0)
    return () => window.clearTimeout(timer)
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
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
    }
  }

  const handleDelete = async (user: User) => {
    const confirmed = await confirm(`确定要删除用户「${user.name || user.username}」吗？此操作不可恢复。`)
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
    if (!resetPasswordUser) return

    try {
      await authApi.resetPassword(resetPasswordUser.id, newPassword)
      toastSuccess('密码已重置')
      setResetPasswordUser(null)
      setNewPassword('')
    } catch {
      toastError('重置密码失败')
    }
  }

  return (
    <div className="user-management">
      <div className="dev-header">
        <div className="dev-header-content">
          <div className="dev-title-section">
            <div className="dev-icon-wrapper">
              <i className="ri-team-line" />
            </div>
            <div className="dev-title-info">
              <h2 className="dev-title">用户管理</h2>
              <p className="dev-subtitle">管理系统用户账户和权限设置</p>
            </div>
          </div>
          <button className="dev-create-btn" onClick={openAddModal} type="button">
            <i className="ri-add-line" />
            <span>新增用户</span>
          </button>
        </div>

        <div className="dev-stats">
          <div className="dev-stat-card">
            <div className="dev-stat-icon total">
              <i className="ri-group-line" />
            </div>
            <div className="dev-stat-info">
              <span className="dev-stat-value">{total}</span>
              <span className="dev-stat-label">总用户</span>
            </div>
          </div>
          <div className="dev-stat-card">
            <div className="dev-stat-icon admin">
              <i className="ri-shield-user-line" />
            </div>
            <div className="dev-stat-info">
              <span className="dev-stat-value">{adminCount}</span>
              <span className="dev-stat-label">管理员</span>
            </div>
          </div>
          <div className="dev-stat-card">
            <div className="dev-stat-icon user">
              <i className="ri-user-line" />
            </div>
            <div className="dev-stat-info">
              <span className="dev-stat-value">{userCount}</span>
              <span className="dev-stat-label">普通用户</span>
            </div>
          </div>
        </div>
      </div>

      <div className="dev-content">
        <div className="search-input-wrapper">
          <i className="ri-search-line search-icon" />
          <input
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            className="search-input"
            onChange={(event) => setKeyword(event.target.value)}
            onKeyUp={(event) => {
              if (event.key === 'Enter') handleSearch()
            }}
            placeholder="搜索用户名或姓名..."
            spellCheck={false}
            type="text"
            value={keyword}
          />
        </div>

        {loading ? (
          <div className="dev-loading">
            <div className="dev-loading-spinner">
              <i className="ri-loader-4-line animate-spin" />
            </div>
            <span>正在加载用户列表...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="dev-empty">
            <div className="dev-empty-icon">
              <i className="ri-user-unfollow-line" />
            </div>
            <h3 className="dev-empty-title">暂无用户</h3>
            <p className="dev-empty-desc">点击右上角按钮添加新用户</p>
          </div>
        ) : (
          <div className="user-list">
            {users.map((user) => (
              <div className="user-card" key={user.id}>
                <div className={`user-avatar ${user.role === 'admin' ? 'avatar-admin' : 'avatar-user'}`}>
                  <i className={user.role === 'admin' ? 'ri-shield-user-fill' : 'ri-user-fill'} />
                </div>

                <div className="user-info">
                  <div className="user-name-row">
                    <span className="user-name">{user.name || user.username}</span>
                    <span className={`user-role-badge ${user.role === 'admin' ? 'role-admin' : 'role-user'}`}>
                      {user.role === 'admin' ? '管理员' : '普通用户'}
                    </span>
                    <span className={`user-status ${user.status === 1 ? 'status-active' : 'status-disabled'}`}>
                      <span className="status-dot" />
                      {user.status === 1 ? '正常' : '禁用'}
                    </span>
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
                  <button className="action-btn edit" onClick={() => openEditModal(user)} title="编辑" type="button">
                    <i className="ri-edit-line" />
                  </button>
                  <button
                    className="action-btn key"
                    onClick={() => {
                      setResetPasswordUser(user)
                      setNewPassword('')
                    }}
                    title="重置密码"
                    type="button"
                  >
                    <i className="ri-key-line" />
                  </button>
                  <button
                    className="action-btn delete"
                    onClick={() => void handleDelete(user)}
                    title="删除"
                    type="button"
                  >
                    <i className="ri-delete-bin-line" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {users.length > 0 ? (
          <div className="user-pagination">
            <div className="pagination-inner">
              <span className="pagination-info">{paginationInfo}</span>

              <div className="pagination-controls">
                <button
                  className="page-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  type="button"
                >
                  <i className="ri-arrow-left-s-line" />
                </button>

                <div className="page-numbers">
                  {visiblePages.map((page, index) => (
                    <button
                      className={`page-number ${currentPage === page ? 'active' : ''} ${
                        page === '...' ? 'cursor-default' : ''
                      }`}
                      disabled={currentPage === page || page === '...'}
                      key={`${page}-${index}`}
                      onClick={() => typeof page === 'number' && setCurrentPage(page)}
                      type="button"
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  className="page-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  type="button"
                >
                  <i className="ri-arrow-right-s-line" />
                </button>
              </div>

              <div className="page-size">
                <select
                  className="page-select"
                  onChange={(event) => {
                    setPageSize(Number(event.target.value))
                    setCurrentPage(1)
                  }}
                  value={pageSize}
                >
                  <option value={5}>5条/页</option>
                  <option value={10}>10条/页</option>
                </select>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {showModal ? (
        <div className="modal-overlay open" onClick={() => setShowModal(false)} role="presentation">
          <div className="modal open" onClick={(event) => event.stopPropagation()} style={{ maxHeight: '90vh', width: 560 }}>
            <div
              className="modal-header"
              style={{
                borderBottom: '1px solid var(--separator-color)',
                marginBottom: 24,
                paddingBottom: 16,
              }}
            >
              <h3 className="modal-title">{editingUser ? '编辑用户' : '新增用户'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)} type="button">
                <i className="ri-close-line" />
              </button>
            </div>
            <form className="modal-body grid gap-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">
                    用户名 <span className="text-danger">*</span>
                  </label>
                  <input
                    className="form-input"
                    disabled={Boolean(editingUser)}
                    onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
                    required
                    value={form.username}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    姓名 <span className="text-danger">*</span>
                  </label>
                  <input
                    className="form-input"
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    required
                    value={form.name}
                  />
                </div>
              </div>

              {!editingUser ? (
                <div className="form-group">
                  <label className="form-label">
                    初始密码 <span className="text-danger">*</span>
                  </label>
                  <input
                    autoComplete="new-password"
                    className="form-input"
                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                    required
                    type="password"
                    value={form.password}
                  />
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">角色</label>
                  <div className="input-wrapper">
                    <select
                      className="form-select"
                      onChange={(event) =>
                        setForm((current) => ({ ...current, role: event.target.value as 'admin' | 'user' }))
                      }
                      value={form.role}
                    >
                      <option value="user">普通用户</option>
                      <option value="admin">管理员</option>
                    </select>
                    <i className="ri-arrow-down-s-line select-arrow" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">状态</label>
                  <div className="input-wrapper">
                    <select
                      className="form-select"
                      onChange={(event) => setForm((current) => ({ ...current, status: Number(event.target.value) }))}
                      value={form.status}
                    >
                      <option value={1}>正常</option>
                      <option value={0}>禁用</option>
                    </select>
                    <i className="ri-arrow-down-s-line select-arrow" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">邮箱</label>
                  <input
                    className="form-input"
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    type="email"
                    value={form.email}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">手机</label>
                  <input
                    className="form-input"
                    onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                    value={form.phone}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">部门</label>
                  <input
                    className="form-input"
                    onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))}
                    value={form.department}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">职位</label>
                  <input
                    className="form-input"
                    onChange={(event) => setForm((current) => ({ ...current, position: event.target.value }))}
                    value={form.position}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setShowModal(false)} type="button">
                  取消
                </button>
                <button className="btn btn-primary" type="submit">
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {resetPasswordUser ? (
        <div className="modal-overlay open" onClick={() => setResetPasswordUser(null)} role="presentation">
          <div className="modal open" onClick={(event) => event.stopPropagation()} style={{ width: 420 }}>
            <div className="modal-header">
              <h3 className="modal-title">重置密码 - {resetPasswordUser.username}</h3>
              <button className="modal-close" onClick={() => setResetPasswordUser(null)} type="button">
                <i className="ri-close-line" />
              </button>
            </div>
            <form className="modal-body" onSubmit={handleResetPassword}>
              <div className="form-group">
                <label className="form-label">
                  新密码 <span className="text-danger">*</span>
                </label>
                <input
                  autoComplete="new-password"
                  className="form-input"
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                  type="password"
                  value={newPassword}
                />
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setResetPasswordUser(null)} type="button">
                  取消
                </button>
                <button className="btn btn-primary" type="submit">
                  确认重置
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
