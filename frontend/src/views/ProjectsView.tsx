import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { projectApi, type Project } from '@/api/project'
import { ProjectStatusChip } from '@/components/project/ProjectStatusChip'
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination'
import {
  Alert,
  AlertDialog,
  Button,
  Card,
  Dropdown,
  EmptyState,
  IconButton,
  PaginationBar,
  PageHeader,
  ProgressBar,
  RouterButton,
  RouterLink,
  SearchField,
  Select,
  Skeleton,
  SummaryMetric,
  Table,
  Tabs,
  type SummaryMetricProps,
} from '@/design-system'
import { useToastStore } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { downloadCsv } from '@/utils/csv'
import { formatCurrency, formatDate } from '@/utils/format'
import '@/styles/project-domain.css'

const filters = [
  { key: 'all', label: '全部项目' },
  { key: 'active', label: '进行中' },
  { key: 'completed', label: '已完成' },
  { key: 'notstarted', label: '未开始' },
  { key: 'overdue', label: '已逾期' },
  { key: 'archived', label: '已归档' },
]

const pageSizeOptions = [
  { label: '5 条 / 页', value: '5' },
  { label: '10 条 / 页', value: '10' },
]

const getProgress = (project: Project) => {
  if (!project.total_amount) return 0
  return Math.min(
    100,
    Math.max(0, Math.round(((project.received_amount || 0) / project.total_amount) * 100)),
  )
}

interface ConfirmationState {
  action: 'archive' | 'delete'
  projectId: number
}

export default function ProjectsView() {
  const navigate = useNavigate()
  const toastError = useToastStore((state) => state.error)
  const toastSuccess = useToastStore((state) => state.success)
  const user = useAuthStore((state) => state.user)
  const isAdmin = user?.role === 'admin'

  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [totalItems, setTotalItems] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [keyword, setKeyword] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null)
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null)
  const [confirming, setConfirming] = useState(false)
  const mountedRef = useRef(false)
  const requestIdRef = useRef(0)

  const totalPages = Math.ceil(totalItems / pageSize)
  const colSpan = isAdmin ? 11 : 10

  const pageMetrics = useMemo(() => {
    const contractAmount = projects.reduce((sum, project) => sum + (project.total_amount || 0), 0)
    const receivedAmount = projects.reduce(
      (sum, project) => sum + (project.received_amount || 0),
      0,
    )
    const collectionRate = contractAmount
      ? `${Math.round((receivedAmount / contractAmount) * 100)}%`
      : '0%'

    return { collectionRate, contractAmount }
  }, [projects])

  const paginationInfo = useMemo(() => {
    if (!hasLoaded) return loadError ? '数据暂不可用' : '正在加载'
    if (totalItems === 0) return '暂无数据'
    const start = (currentPage - 1) * pageSize + 1
    const end = Math.min(currentPage * pageSize, totalItems)
    return `显示 ${start}-${end} 条，共 ${totalItems} 条`
  }, [currentPage, hasLoaded, loadError, pageSize, totalItems])

  const fetchProjects = useCallback(async () => {
    if (!mountedRef.current) return
    const requestId = ++requestIdRef.current
    setLoading(true)
    setLoadError(false)
    try {
      const response = await projectApi.list({
        keyword: searchKeyword || undefined,
        page: currentPage,
        page_size: pageSize,
        status: activeFilter !== 'all' ? activeFilter : undefined,
      })
      if (!mountedRef.current || requestId !== requestIdRef.current) return
      setProjects(response.data.data.list)
      setTotalItems(response.data.data.total)
      setHasLoaded(true)
    } catch {
      if (!mountedRef.current || requestId !== requestIdRef.current) return
      setLoadError(true)
      toastError('获取项目列表失败')
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) setLoading(false)
    }
  }, [activeFilter, currentPage, pageSize, searchKeyword, toastError])

  useEffect(() => {
    mountedRef.current = true
    const timer = window.setTimeout(fetchProjects, 0)
    return () => {
      mountedRef.current = false
      requestIdRef.current += 1
      window.clearTimeout(timer)
    }
  }, [fetchProjects])

  const handleSearch = () => {
    setCurrentPage(1)
    setSearchKeyword(keyword)
  }

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter)
    setCurrentPage(1)
  }

  const performConfirmedAction = async () => {
    if (!confirmation) return
    const pendingConfirmation = confirmation
    setConfirming(true)
    try {
      if (pendingConfirmation.action === 'delete') {
        await projectApi.delete(pendingConfirmation.projectId)
        if (!mountedRef.current) return
        toastSuccess('项目删除成功')
      } else {
        await projectApi.archive(pendingConfirmation.projectId)
        if (!mountedRef.current) return
        toastSuccess('项目归档成功')
      }
      setConfirmation(null)
      if (projects.length === 1 && currentPage > 1) {
        setCurrentPage((page) => page - 1)
      } else {
        await fetchProjects()
      }
    } catch {
      if (!mountedRef.current) return
      toastError(pendingConfirmation.action === 'delete' ? '删除失败' : '归档失败')
    } finally {
      if (mountedRef.current) setConfirming(false)
    }
  }

  const clearSearch = () => {
    setKeyword('')
    setSearchKeyword('')
    setCurrentPage(1)
  }

  const exportProject = (project: Project) => {
    downloadCsv(`Orange-project-${project.id}.csv`, [
      ['项目名称', '客户', '开始日期', '截止日期', '合同金额', '已收款', '收款进度', '状态'],
      [
        project.name,
        project.company,
        project.start_date,
        project.end_date,
        project.total_amount,
        project.received_amount || 0,
        `${getProgress(project)}%`,
        project.status,
      ],
    ])
  }

  const summaryMetrics: SummaryMetricProps[] = !hasLoaded
    ? [
        {
          icon: 'ri-folder-2-line',
          label: '项目总数',
          status: loadError ? 'error' : 'loading',
        },
        {
          icon: 'ri-contract-line',
          label: '当前页合同额',
          status: loadError ? 'error' : 'loading',
        },
        {
          icon: 'ri-pie-chart-line',
          label: '当前页收款率',
          status: loadError ? 'error' : 'loading',
        },
      ]
    : [
        {
          icon: 'ri-folder-2-line',
          label: '项目总数',
          status: 'data',
          value: `${totalItems} 个`,
        },
        {
          icon: 'ri-contract-line',
          label: '当前页合同额',
          status: 'data',
          value: formatCurrency(pageMetrics.contractAmount),
        },
        {
          icon: 'ri-pie-chart-line',
          label: '当前页收款率',
          status: 'data',
          value: pageMetrics.collectionRate,
        },
      ]

  return (
    <div className="projects-view" data-motion-scope="projects">
      <PageHeader
        actions={
          <RouterButton to="/projects/create">
            <i aria-hidden="true" className="ri-add-line" />
            <span>新建项目</span>
          </RouterButton>
        }
        description={
          !hasLoaded && loading
            ? '正在同步项目台账…'
            : !hasLoaded && loadError
              ? '项目数据暂不可用，请重试'
              : `${totalItems} 个项目 · ${paginationInfo}`
        }
        eyebrow="WORKSPACE / PROJECTS"
        title="项目管理"
      />

      <section aria-label="项目概览" className="projects-summary-grid">
        {summaryMetrics.map((metric) => (
          <SummaryMetric key={String(metric.label)} {...metric} />
        ))}
      </section>

      <section aria-label="项目台账" className="projects-workspace" data-motion="entrance">
        <Tabs.Root
          className="project-filter-tabs"
          onValueChange={handleFilterChange}
          value={activeFilter}
        >
          <div className="projects-toolbar">
            <div className="projects-toolbar__context">
              <span className="projects-toolbar__eyebrow">PROJECT LEDGER</span>
              <span className="projects-toolbar__summary">{paginationInfo}</span>
            </div>
            <Tabs.List
              aria-label="项目状态筛选"
              className="project-filter-tabs__list"
              variant="accent"
            >
              {filters.map((filter) => (
                <Tabs.Tab key={filter.key} value={filter.key}>
                  {filter.label}
                </Tabs.Tab>
              ))}
            </Tabs.List>

            <div className="project-list-actions">
              <SearchField
                aria-label="搜索项目"
                className="project-search"
                onClear={clearSearch}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleSearch()
                }}
                onValueChange={setKeyword}
                pending={loading}
                placeholder="搜索项目…"
                value={keyword}
              />
            </div>
          </div>

          {filters.map((filter) => (
            <Tabs.Panel className="project-filter-tabs__panel" key={filter.key} value={filter.key}>
              {filter.key === activeFilter ? (
                <>
                  <Card.Root
                    aria-busy={loading}
                    className="project-table-card"
                    padding="none"
                    variant="tertiary"
                  >
                    <div className="project-table-frame">
                      <Table.Root
                        aria-label="项目列表"
                        className="project-table"
                        stickyHeader
                        wrapperClassName="project-table-scroll"
                      >
                        <Table.Header>
                          <Table.Row>
                            <Table.Column className="project-name-column">项目名称</Table.Column>
                            <Table.Column>客户</Table.Column>
                            <Table.Column>开始日期</Table.Column>
                            <Table.Column>截止日期</Table.Column>
                            <Table.Column>创建日期</Table.Column>
                            {isAdmin ? <Table.Column>创建人</Table.Column> : null}
                            <Table.Column align="end">合同金额</Table.Column>
                            <Table.Column align="end">已收款</Table.Column>
                            <Table.Column>收款进度</Table.Column>
                            <Table.Column>状态</Table.Column>
                            <Table.Column align="end" sticky="end">
                              操作
                            </Table.Column>
                          </Table.Row>
                        </Table.Header>
                        <Table.Body>
                          {loadError ? (
                            <Table.Row>
                              <Table.Cell colSpan={colSpan}>
                                <Alert
                                  action={
                                    <Button
                                      aria-label="重试项目列表"
                                      onClick={() => void fetchProjects()}
                                      size="sm"
                                      variant="secondary"
                                    >
                                      <i aria-hidden="true" className="ri-refresh-line" />
                                      重试
                                    </Button>
                                  }
                                  icon={<i className="ri-error-warning-line" />}
                                  title="项目列表加载失败"
                                  tone="danger"
                                >
                                  {hasLoaded
                                    ? '当前展示最近一次成功加载的数据。'
                                    : '暂时无法获取项目数据，请稍后重试。'}
                                </Alert>
                              </Table.Cell>
                            </Table.Row>
                          ) : null}

                          {projects.map((project) => {
                            const progress = getProgress(project)
                            return (
                              <Table.Row
                                data-motion-item
                                interactive
                                key={project.id}
                                onClick={() => navigate(`/projects/${project.id}`)}
                              >
                                <Table.Cell className="project-name-column" title={project.name}>
                                  <RouterLink
                                    className="project-name-link"
                                    onClick={(event) => event.stopPropagation()}
                                    to={`/projects/${project.id}`}
                                  >
                                    <strong>{project.name}</strong>
                                  </RouterLink>
                                </Table.Cell>
                                <Table.Cell>{project.company}</Table.Cell>
                                <Table.Cell>{formatDate(project.start_date)}</Table.Cell>
                                <Table.Cell>{formatDate(project.end_date)}</Table.Cell>
                                <Table.Cell>{formatDate(project.create_time)}</Table.Cell>
                                {isAdmin ? (
                                  <Table.Cell>{project.user?.name || '-'}</Table.Cell>
                                ) : null}
                                <Table.Cell align="end">
                                  {formatCurrency(project.total_amount)}
                                </Table.Cell>
                                <Table.Cell align="end">
                                  {formatCurrency(project.received_amount || 0)}
                                </Table.Cell>
                                <Table.Cell>
                                  <div className="project-progress-cell">
                                    <ProgressBar
                                      className="project-table-progress"
                                      label={`${project.name} 收款进度`}
                                      motion="reveal"
                                      size="sm"
                                      tone={project.status === 'completed' ? 'success' : 'accent'}
                                      value={progress}
                                      valueLabel={`${progress}%`}
                                    />
                                    <span>{progress}%</span>
                                  </div>
                                </Table.Cell>
                                <Table.Cell>
                                  <ProjectStatusChip status={project.status} />
                                </Table.Cell>
                                <Table.Cell align="end" sticky="end">
                                  <div className="project-row-actions">
                                    <IconButton
                                      label={`${project.name}：编辑项目`}
                                      onClick={(event) => {
                                        event.stopPropagation()
                                        navigate(`/projects/edit/${project.id}`)
                                      }}
                                      size="sm"
                                      title="编辑"
                                      variant="ghost"
                                    >
                                      <i aria-hidden="true" className="ri-edit-line" />
                                    </IconButton>
                                    <IconButton
                                      label={`${project.name}：删除项目`}
                                      onClick={(event) => {
                                        event.stopPropagation()
                                        setConfirmation({ action: 'delete', projectId: project.id })
                                      }}
                                      size="sm"
                                      title="删除"
                                      variant="ghost"
                                    >
                                      <i aria-hidden="true" className="ri-delete-bin-line" />
                                    </IconButton>
                                    <Dropdown
                                      onOpenChange={(open) =>
                                        setActiveDropdownId(open ? project.id : null)
                                      }
                                      open={activeDropdownId === project.id}
                                      placement="bottom-end"
                                    >
                                      <Dropdown.Trigger>
                                        <IconButton
                                          aria-haspopup="menu"
                                          label={`${project.name}：更多项目操作`}
                                          onClick={(event) => event.stopPropagation()}
                                          size="sm"
                                          variant="ghost"
                                        >
                                          <i aria-hidden="true" className="ri-more-line" />
                                        </IconButton>
                                      </Dropdown.Trigger>
                                      <Dropdown.Menu
                                        label={`${project.name} 的更多操作`}
                                        onClick={(event) => event.stopPropagation()}
                                      >
                                        <Dropdown.Item
                                          onSelect={() => {
                                            exportProject(project)
                                            setActiveDropdownId(null)
                                          }}
                                          startContent={
                                            <i aria-hidden="true" className="ri-download-2-line" />
                                          }
                                        >
                                          导出项目
                                        </Dropdown.Item>
                                        <Dropdown.Item
                                          onSelect={() =>
                                            navigate(`/projects/${project.id}/payment/create`)
                                          }
                                          startContent={
                                            <i
                                              aria-hidden="true"
                                              className="ri-money-dollar-box-line"
                                            />
                                          }
                                        >
                                          添加收款
                                        </Dropdown.Item>
                                        <Dropdown.Item
                                          onSelect={() => {
                                            setActiveDropdownId(null)
                                            setConfirmation({
                                              action: 'archive',
                                              projectId: project.id,
                                            })
                                          }}
                                          startContent={
                                            <i aria-hidden="true" className="ri-archive-line" />
                                          }
                                        >
                                          归档项目
                                        </Dropdown.Item>
                                      </Dropdown.Menu>
                                    </Dropdown>
                                  </div>
                                </Table.Cell>
                              </Table.Row>
                            )
                          })}

                          {loading && !hasLoaded
                            ? Array.from({ length: 4 }, (_, index) => (
                                <Table.Row aria-hidden="true" key={`project-loading-${index}`}>
                                  <Table.Cell colSpan={colSpan}>
                                    <div className="project-loading-row">
                                      <Skeleton height="1.25rem" width="42%" />
                                      <Skeleton height="0.75rem" width="24%" />
                                    </div>
                                  </Table.Cell>
                                </Table.Row>
                              ))
                            : null}

                          {hasLoaded && projects.length === 0 && !loadError ? (
                            <Table.Row>
                              <Table.Cell colSpan={colSpan}>
                                <EmptyState
                                  action={
                                    searchKeyword ? (
                                      <Button onClick={clearSearch} size="sm" variant="ghost">
                                        清除搜索
                                      </Button>
                                    ) : null
                                  }
                                  description={
                                    searchKeyword ? '换个关键词试试，或清除当前搜索。' : undefined
                                  }
                                  icon={<i className="ri-folder-open-line" />}
                                  size="lg"
                                  title="暂无项目数据"
                                />
                              </Table.Cell>
                            </Table.Row>
                          ) : null}
                        </Table.Body>
                      </Table.Root>
                    </div>
                  </Card.Root>

                  {totalItems > 0 && totalPages > 0 ? (
                    <PaginationBar
                      info={paginationInfo}
                      layout="centered"
                      onPageChange={setCurrentPage}
                      page={currentPage}
                      pageCount={totalPages}
                      paginationLabel="项目分页"
                      separated
                      trailing={
                        <Select
                          aria-label="每页条数"
                          onValueChange={(value) => {
                            setPageSize(Number(value))
                            setCurrentPage(1)
                          }}
                          options={pageSizeOptions}
                          size="sm"
                          value={String(pageSize)}
                          width="content"
                        />
                      }
                    />
                  ) : null}
                </>
              ) : null}
            </Tabs.Panel>
          ))}
        </Tabs.Root>

        <AlertDialog
          action={confirmation?.action === 'archive' ? '确认归档' : '确认删除'}
          actionVariant={confirmation?.action === 'archive' ? 'primary' : 'danger'}
          description={
            confirmation?.action === 'archive'
              ? '归档后仍可在归档项目筛选中查看。'
              : '删除后无法恢复，相关项目数据也将不可访问。'
          }
          onAction={() => void performConfirmedAction()}
          onClose={() => setConfirmation(null)}
          open={confirmation !== null}
          pending={confirming}
          title={confirmation?.action === 'archive' ? '归档项目？' : '删除项目？'}
        />
      </section>
    </div>
  )
}
