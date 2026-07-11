import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { projectApi, type Project } from '@/api/project'
import GlassCard from '@/components/common/GlassCard'
import StatusBadge from '@/components/common/StatusBadge'
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination'
import { useConfirm } from '@/composables/useConfirm'
import { useToastStore } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { formatCurrency, formatDate } from '@/utils/format'

const filters = [
  { key: 'all', label: '全部项目' },
  { key: 'active', label: '进行中' },
  { key: 'completed', label: '已完成' },
  { key: 'notstarted', label: '未开始' },
  { key: 'overdue', label: '已逾期' },
  { key: 'archived', label: '已归档' },
]

const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    active: '进行中',
    archived: '已归档',
    completed: '已完成',
    notstarted: '未开始',
    overdue: '已逾期',
    pending: '即将交付',
  }
  return map[status] || status
}

const getProgress = (project: Project) => {
  if (!project.total_amount) return 0
  return Math.round(((project.received_amount || 0) / project.total_amount) * 100)
}

export default function ProjectsView() {
  const navigate = useNavigate()
  const { confirm } = useConfirm()
  const toastError = useToastStore((state) => state.error)
  const toastInfo = useToastStore((state) => state.info)
  const toastSuccess = useToastStore((state) => state.success)
  const user = useAuthStore((state) => state.user)
  const isAdmin = user?.role === 'admin'
  const closeTimeout = useRef<number | null>(null)

  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [totalItems, setTotalItems] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [keyword, setKeyword] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null)
  const [dropdownStyle, setDropdownStyle] = useState({ left: '0px', top: '0px' })

  const totalPages = Math.ceil(totalItems / pageSize)
  const colSpan = isAdmin ? 11 : 10

  const paginationInfo = useMemo(() => {
    if (totalItems === 0) return '暂无数据'
    const start = (currentPage - 1) * pageSize + 1
    const end = Math.min(currentPage * pageSize, totalItems)
    return `显示 ${start}-${end} 条，共 ${totalItems} 条`
  }, [currentPage, pageSize, totalItems])

  const visiblePages = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1)
    }

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
  }, [currentPage, totalPages])

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    try {
      const response = await projectApi.list({
        keyword: searchKeyword || undefined,
        page: currentPage,
        page_size: pageSize,
        status: activeFilter !== 'all' ? activeFilter : undefined,
      })
      setProjects(response.data.data.list)
      setTotalItems(response.data.data.total)
    } catch {
      toastError('获取项目列表失败')
    } finally {
      setLoading(false)
    }
  }, [activeFilter, currentPage, pageSize, searchKeyword, toastError])

  useEffect(() => {
    const timer = window.setTimeout(fetchProjects, 0)
    return () => window.clearTimeout(timer)
  }, [fetchProjects])

  const closeDropdown = () => setActiveDropdownId(null)

  const keepDropdownOpen = () => {
    if (closeTimeout.current) {
      window.clearTimeout(closeTimeout.current)
      closeTimeout.current = null
    }
  }

  const hideDropdownWithDelay = () => {
    if (closeTimeout.current) window.clearTimeout(closeTimeout.current)
    closeTimeout.current = window.setTimeout(closeDropdown, 200)
  }

  const showDropdown = (id: number, event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    keepDropdownOpen()
    const rect = event.currentTarget.getBoundingClientRect()
    setDropdownStyle({
      left: `${rect.right - 140}px`,
      top: `${rect.bottom + 4}px`,
    })
    setActiveDropdownId((current) => (current === id ? null : id))
  }

  const handleSearch = () => {
    setCurrentPage(1)
    setSearchKeyword(keyword)
  }

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter)
    setCurrentPage(1)
  }

  const handleDelete = async (id: number) => {
    const confirmed = await confirm('确定要删除这个项目吗？此操作不可恢复。')
    if (!confirmed) return

    try {
      await projectApi.delete(id)
      toastSuccess('项目删除成功')
      await fetchProjects()
    } catch {
      toastError('删除失败')
    }
  }

  const handleArchive = async (id: number) => {
    closeDropdown()
    const confirmed = await confirm('确定要归档这个项目吗？归档后可以在归档列表中查看。')
    if (!confirmed) return

    try {
      await projectApi.archive(id)
      toastSuccess('项目归档成功')
      await fetchProjects()
    } catch {
      toastError('归档失败')
    }
  }

  const handleExport = () => {
    toastInfo('导出功能开发中')
    closeDropdown()
  }

  const handlePageSizeChange = (value: number) => {
    setPageSize(value)
    setCurrentPage(1)
  }

  return (
    <div className="projects-view">
      <div className="projects-toolbar">
        <div className="filter-tabs">
          {filters.map((filter) => (
            <button
              className={`btn btn-sm transition-all ${
                activeFilter === filter.key ? 'btn-secondary active' : 'btn-ghost'
              }`}
              key={filter.key}
              onClick={() => handleFilterChange(filter.key)}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="flex gap-sm items-center">
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
              placeholder="搜索项目..."
              spellCheck={false}
              type="text"
              value={keyword}
            />
          </div>

          <button
            className="btn btn-primary"
            onClick={() => navigate('/projects/create')}
            type="button"
          >
            <i className="ri-add-line" /> <span className="btn-text">新建项目</span>
          </button>
        </div>
      </div>

      <GlassCard className="p-0">
        <div className="overflow-auto" style={{ height: 440 }}>
          <table className="data-table w-full">
            <thead>
              <tr>
                <th className="col-fixed-width-200">项目名称</th>
                <th>客户</th>
                <th>开始日期</th>
                <th>截止日期</th>
                <th>创建日期</th>
                {isAdmin ? <th>创建人</th> : null}
                <th>合同金额</th>
                <th>已收款</th>
                <th>收款进度</th>
                <th>状态</th>
                <th className="col-fixed-right">操作</th>
              </tr>
            </thead>
            {projects.length > 0 ? (
              <tbody>
                {projects.map((project) => {
                  const progress = getProgress(project)
                  return (
                    <tr
                      className="project-row cursor-pointer hover:bg-white/5 transition-colors"
                      key={project.id}
                      onClick={() => navigate(`/projects/${project.id}`)}
                    >
                      <td className="font-medium col-fixed-width-200" title={project.name}>
                        {project.name}
                      </td>
                      <td className="text-secondary">{project.company}</td>
                      <td>{formatDate(project.start_date)}</td>
                      <td>{formatDate(project.end_date)}</td>
                      <td>{formatDate(project.create_time)}</td>
                      {isAdmin ? <td>{project.user?.name || '-'}</td> : null}
                      <td>{formatCurrency(project.total_amount)}</td>
                      <td>{formatCurrency(project.received_amount || 0)}</td>
                      <td>
                        <div className="flex items-center gap-sm">
                          <div className="progress-bar" style={{ width: 80 }}>
                            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                          </div>
                          <span className="text-sm">{progress}%</span>
                        </div>
                      </td>
                      <td>
                        <StatusBadge
                          label={getStatusLabel(project.status)}
                          status={project.status}
                        />
                      </td>
                      <td className="col-fixed-right">
                        <div className="flex items-center gap-xs relative">
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            onClick={(event) => {
                              event.stopPropagation()
                              navigate(`/projects/edit/${project.id}`)
                            }}
                            title="编辑"
                            type="button"
                          >
                            <i className="ri-edit-line" />
                          </button>
                          <button
                            className="btn btn-ghost btn-icon btn-sm text-danger"
                            onClick={(event) => {
                              event.stopPropagation()
                              void handleDelete(project.id)
                            }}
                            title="删除"
                            type="button"
                          >
                            <i className="ri-delete-bin-line" />
                          </button>
                          <div className="relative">
                            <button
                              className="btn btn-ghost btn-icon btn-sm"
                              onClick={(event) => showDropdown(project.id, event)}
                              onMouseEnter={keepDropdownOpen}
                              onMouseLeave={hideDropdownWithDelay}
                              type="button"
                            >
                              <i className="ri-more-line" />
                            </button>

                            {activeDropdownId === project.id ? (
                              <div
                                className="dropdown-menu-fixed"
                                onClick={(event) => event.stopPropagation()}
                                onMouseEnter={keepDropdownOpen}
                                onMouseLeave={hideDropdownWithDelay}
                                style={dropdownStyle}
                              >
                                <button
                                  className="dropdown-item"
                                  onClick={handleExport}
                                  type="button"
                                >
                                  <i className="ri-download-2-line" />
                                  <span>导出项目</span>
                                </button>
                                <button
                                  className="dropdown-item"
                                  onClick={() => {
                                    closeDropdown()
                                    navigate(`/projects/${project.id}/payment/create`)
                                  }}
                                  type="button"
                                >
                                  <i
                                    className="ri-money-dollar-box-line"
                                    style={{ color: '#10b981' }}
                                  />
                                  <span>添加收款</span>
                                </button>
                                <button
                                  className="dropdown-item"
                                  onClick={() => void handleArchive(project.id)}
                                  type="button"
                                >
                                  <i className="ri-archive-line text-warning" />
                                  <span>归档项目</span>
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            ) : !loading ? (
              <tbody>
                <tr>
                  <td colSpan={colSpan}>
                    <div className="flex flex-col items-center justify-center py-xl text-secondary">
                      <i className="ri-folder-open-line text-4xl mb-sm opacity-50" />
                      <p>暂无项目数据</p>
                      {searchKeyword ? (
                        <button
                          className="btn btn-ghost btn-sm mt-sm text-primary"
                          onClick={() => {
                            setKeyword('')
                            setSearchKeyword('')
                            setCurrentPage(1)
                          }}
                          type="button"
                        >
                          清除搜索
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              </tbody>
            ) : null}
          </table>
        </div>
      </GlassCard>

      {projects.length > 0 ? (
        <div className="projects-pagination">
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
                onChange={(event) => handlePageSizeChange(Number(event.target.value))}
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
  )
}
