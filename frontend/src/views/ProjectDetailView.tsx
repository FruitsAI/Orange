import dayjs from 'dayjs'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { paymentApi, projectApi, type Payment, type Project } from '@/api/project'
import { PaymentStatusChip, ProjectStatusChip } from '@/components/project/ProjectStatusChip'
import {
  Button,
  ButtonGroup,
  Card,
  CircularProgress,
  EmptyState,
  IconButton,
  PageHeader,
  RouterButton,
  SectionHeader,
  Skeleton,
  Surface,
  Tabs,
} from '@/design-system'
import { useToastStore } from '@/composables/useToast'
import { formatCurrency, formatDate } from '@/utils/format'
import '@/styles/project-domain.css'

const paymentStageLabels: Record<string, string> = {
  all: '全款',
  deposit: '预付款',
  final: '尾款',
  milestone: '阶段款',
  progress: '进度款',
}

const paymentMethodLabels: Record<string, string> = {
  alipay: '支付宝',
  bank_transfer: '银行转账',
  cash: '现金',
  wechat: '微信',
}

const projectTypeLabels: Record<string, string> = {
  consulting: '技术咨询',
  other: '其他',
  service: '运营服务',
  software: '软件开发',
}

const isPaymentSettled = (payment: Payment) =>
  payment.status === 'paid' || payment.status === 'confirmed'

const getPaymentStageLabel = (stage: string) => paymentStageLabels[stage] || stage || '款项'

const getPaymentMethodLabel = (method: string) => paymentMethodLabels[method] || method || '未设置'

export default function ProjectDetailView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const requestedPayment = searchParams.get('payment')
  const toastError = useToastStore((state) => state.error)
  const toastInfo = useToastStore((state) => state.info)
  const toastSuccess = useToastStore((state) => state.success)
  const [project, setProject] = useState<Project | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const positionedPaymentRef = useRef<string | null>(null)
  const isMountedRef = useRef(false)
  const loadGenerationRef = useRef(0)
  const projectId = id ? Number(id) : null
  const activeProjectIdRef = useRef<number | null>(projectId)

  const activeTab = requestedTab === 'payments' ? 'payments' : 'overview'

  useLayoutEffect(() => {
    activeProjectIdRef.current = projectId
  }, [projectId])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      loadGenerationRef.current += 1
    }
  }, [])

  const selectTab = (tab: string) => {
    const nextSearchParams = new URLSearchParams(searchParams)
    if (tab === 'payments') {
      nextSearchParams.set('tab', 'payments')
    } else {
      nextSearchParams.delete('tab')
      nextSearchParams.delete('payment')
    }
    setSearchParams(nextSearchParams, { replace: true })
  }

  const loadProject = useCallback(
    async (requestedProjectId: number) => {
      if (!isMountedRef.current || activeProjectIdRef.current !== requestedProjectId) return

      const loadGeneration = ++loadGenerationRef.current
      try {
        const [projectRes, paymentsRes] = await Promise.all([
          projectApi.get(requestedProjectId),
          projectApi.getPayments(requestedProjectId),
        ])
        if (
          !isMountedRef.current ||
          loadGeneration !== loadGenerationRef.current ||
          activeProjectIdRef.current !== requestedProjectId
        ) {
          return
        }
        setProject(projectRes.data.data)
        setPayments(paymentsRes.data.data)
      } catch {
        if (
          !isMountedRef.current ||
          loadGeneration !== loadGenerationRef.current ||
          activeProjectIdRef.current !== requestedProjectId
        ) {
          return
        }
        toastError('获取项目详情失败')
      }
    },
    [toastError],
  )

  useEffect(() => {
    const routeGeneration = ++loadGenerationRef.current
    if (projectId === null) return

    const timer = window.setTimeout(() => {
      if (routeGeneration === loadGenerationRef.current) void loadProject(projectId)
    }, 0)
    return () => {
      window.clearTimeout(timer)
      loadGenerationRef.current += 1
    }
  }, [loadProject, projectId])

  useEffect(() => {
    if (activeTab !== 'payments' || !requestedPayment || payments.length === 0) return

    const positionKey = `${id}:${requestedPayment}`
    if (positionedPaymentRef.current === positionKey) return

    const target = document.getElementById(`payment-${requestedPayment}`)
    if (!target) return

    positionedPaymentRef.current = positionKey
    target.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    target.focus?.({ preventScroll: true })
  }, [activeTab, id, payments, requestedPayment])

  const confirmPayment = async (paymentId: number) => {
    if (projectId === null) return
    const requestedProjectId = projectId

    try {
      await paymentApi.confirm(paymentId, { actual_date: dayjs().format('YYYY-MM-DD') })
      if (!isMountedRef.current || activeProjectIdRef.current !== requestedProjectId) return
      toastSuccess('收款已确认')
      await loadProject(requestedProjectId)
    } catch {
      if (!isMountedRef.current || activeProjectIdRef.current !== requestedProjectId) return
      toastError('确认收款失败')
    }
  }

  if (!project || project.id !== projectId) {
    return (
      <Card.Root aria-label="正在加载项目详情" className="project-detail-loading">
        <Skeleton height={28} shape="text" width="42%" />
        <Skeleton height={160} />
      </Card.Root>
    )
  }

  const paidAmount = Math.max(project.received_amount || 0, 0)
  const remainingAmount = Math.max(project.total_amount - paidAmount, 0)
  const progress = project.total_amount
    ? Math.min(100, Math.max(0, Math.round((paidAmount / project.total_amount) * 100)))
    : 0
  const settledPaymentCount = payments.filter(isPaymentSettled).length
  const nextPayment = [...payments]
    .filter((payment) => !isPaymentSettled(payment))
    .sort((left, right) => left.plan_date.localeCompare(right.plan_date))[0]
  const runwayStage =
    project.status === 'completed' || project.status === 'archived'
      ? 3
      : project.status === 'notstarted'
        ? 1
        : 2
  const runwayProgress = ((runwayStage - 1) / 2) * 100
  const runwayItems = [
    { date: project.contract_date, label: '合同签署' },
    { date: project.start_date, label: '项目启动' },
    { date: project.end_date, label: '预计完成' },
  ]

  return (
    <div className="project-detail-view" data-motion-scope="project-detail">
      <PageHeader
        actions={
          <ButtonGroup aria-label="项目操作" className="project-detail-actions">
            <IconButton
              label="编辑项目"
              onClick={() => navigate(`/projects/edit/${project.id}`)}
              title="编辑项目"
              variant="ghost"
            >
              <i aria-hidden="true" className="ri-edit-line" />
            </IconButton>
            <IconButton
              label={`导出项目：${project.name}`}
              onClick={() => toastInfo('导出功能开发中')}
              title="导出项目"
              variant="ghost"
            >
              <i aria-hidden="true" className="ri-download-2-line" />
            </IconButton>
          </ButtonGroup>
        }
        description={
          <span className="project-detail-meta">
            <span>客户：{project.company}</span>
            <ProjectStatusChip status={project.status} />
          </span>
        }
        eyebrow={
          <span className="project-detail-kicker">
            <i aria-hidden="true" className="ri-folder-chart-line" />
            项目台账
            <span>{project.contract_number || `#${project.id}`}</span>
          </span>
        }
        leading={
          <IconButton label="返回项目列表" onClick={() => navigate('/projects')} variant="ghost">
            <i aria-hidden="true" className="ri-arrow-left-line" />
          </IconButton>
        }
        title={project.name}
      />

      <Tabs.Root className="project-detail-tabs" onValueChange={selectTab} value={activeTab}>
        <Tabs.List aria-label="项目详情视图" className="project-detail-tab-list" variant="accent">
          <Tabs.Tab
            className={`project-detail-tab${activeTab === 'overview' ? ' active' : ''}`}
            value="overview"
          >
            <i aria-hidden="true" className="ri-layout-grid-line" />
            项目概览
          </Tabs.Tab>
          <Tabs.Tab
            className={`project-detail-tab${activeTab === 'payments' ? ' active' : ''}`}
            value="payments"
          >
            <i aria-hidden="true" className="ri-secure-payment-line" />
            收款计划
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview">
          {activeTab === 'overview' ? (
            <div className="project-detail-content">
              <Card.Root
                aria-label="项目结算概览"
                className="project-settlement-board"
                data-motion="entrance"
                gap="none"
                padding="none"
                variant="secondary"
              >
                <div className="project-settlement-board__main">
                  <div className="project-settlement-board__headline">
                    <span className="project-settlement-board__eyebrow">
                      <span aria-hidden="true" className="project-live-dot" />
                      项目结算盘面
                    </span>
                    <span className="project-settlement-board__label">待回款</span>
                    <strong className="project-settlement-board__amount">
                      {formatCurrency(remainingAmount)}
                    </strong>
                    <p>
                      {progress >= 100
                        ? '合同款项已全部回收，项目财务闭环已完成。'
                        : `已回收合同金额的 ${progress}%，剩余款项按计划持续跟进。`}
                    </p>
                  </div>

                  <div className="project-settlement-progress">
                    <CircularProgress
                      aria-label="项目总进度"
                      className="project-overview-progress"
                      showValueLabel
                      size="lg"
                      tone={progress >= 100 ? 'success' : 'accent'}
                      value={progress}
                    />
                    <div>
                      <strong className="project-settlement-progress__label">项目整体进度</strong>
                      <span>以合同回款计算</span>
                    </div>
                  </div>

                  <dl className="project-settlement-stats">
                    <div>
                      <dt>合同总额</dt>
                      <dd>{formatCurrency(project.total_amount)}</dd>
                    </div>
                    <div>
                      <dt>已收款</dt>
                      <dd className="project-settlement-stats__success">
                        {formatCurrency(paidAmount)}
                      </dd>
                    </div>
                    <div>
                      <dt>收款节点</dt>
                      <dd>
                        {settledPaymentCount}
                        <span> / {payments.length}</span>
                      </dd>
                    </div>
                  </dl>
                </div>

                <div
                  className="project-runway"
                  style={{ '--project-runway-scale': runwayProgress / 100 } as CSSProperties}
                >
                  <div className="project-runway__header">
                    <strong>项目履约轨道</strong>
                    <span>{project.status === 'completed' ? '已完成' : '按合同周期推进'}</span>
                  </div>
                  <ol className="project-runway__track">
                    {runwayItems.map((item, index) => (
                      <li data-reached={index + 1 <= runwayStage} key={item.label}>
                        <span aria-hidden="true" className="project-runway__node">
                          {index + 1 <= runwayStage ? <i className="ri-check-line" /> : index + 1}
                        </span>
                        <strong>{item.label}</strong>
                        <time dateTime={item.date}>{formatDate(item.date)}</time>
                      </li>
                    ))}
                  </ol>
                </div>
              </Card.Root>

              <div className="project-overview-grid" data-motion="entrance">
                <Card.Root className="project-record-card" padding="lg">
                  <Card.Header>
                    <Card.Title>项目档案</Card.Title>
                    <Card.Description>合同与交付的核心信息</Card.Description>
                  </Card.Header>
                  <Card.Content>
                    <dl className="project-record-list">
                      <div>
                        <dt>项目类型</dt>
                        <dd>{projectTypeLabels[project.type] || project.type || '-'}</dd>
                      </div>
                      <div>
                        <dt>付款方式</dt>
                        <dd>{project.payment_method || '-'}</dd>
                      </div>
                      <div>
                        <dt>合同编号</dt>
                        <dd className="font-mono">{project.contract_number || '-'}</dd>
                      </div>
                      <div>
                        <dt>签约日期</dt>
                        <dd>{formatDate(project.contract_date)}</dd>
                      </div>
                      <div>
                        <dt>项目周期</dt>
                        <dd>
                          {formatDate(project.start_date)} - {formatDate(project.end_date)}
                        </dd>
                      </div>
                      <div>
                        <dt>建档日期</dt>
                        <dd>{formatDate(project.create_time)}</dd>
                      </div>
                    </dl>
                  </Card.Content>
                </Card.Root>

                <div className="project-overview-aside">
                  <Card.Root className="project-next-payment-card" padding="lg">
                    <Card.Header>
                      <div className="project-card-heading-row">
                        <div>
                          <Card.Title>下一笔计划</Card.Title>
                          <Card.Description>当前最需要跟进的收款节点</Card.Description>
                        </div>
                        <Surface
                          className="project-card-heading-icon"
                          padding="none"
                          radius="control"
                          tone="accent"
                          variant="inset"
                        >
                          <i aria-hidden="true" className="ri-calendar-check-line" />
                        </Surface>
                      </div>
                    </Card.Header>
                    <Card.Content>
                      {nextPayment ? (
                        <div className="project-next-payment">
                          <div>
                            <span>{getPaymentStageLabel(nextPayment.stage)}</span>
                            <strong>{formatCurrency(nextPayment.amount)}</strong>
                          </div>
                          <time dateTime={nextPayment.plan_date}>
                            {formatDate(nextPayment.plan_date)}
                          </time>
                          <RouterButton
                            size="sm"
                            to={`/projects/${project.id}?tab=payments&payment=${nextPayment.id}`}
                            variant="secondary"
                          >
                            查看收款节点
                            <i aria-hidden="true" className="ri-arrow-right-line" />
                          </RouterButton>
                        </div>
                      ) : (
                        <div className="project-next-payment project-next-payment--empty">
                          <i aria-hidden="true" className="ri-checkbox-circle-line" />
                          <strong>
                            {payments.length ? '所有款项均已完成' : '尚未安排收款节点'}
                          </strong>
                          <span>
                            {payments.length ? '无需继续跟进收款。' : '添加计划后可在此追踪。'}
                          </span>
                        </div>
                      )}
                    </Card.Content>
                  </Card.Root>

                  <Card.Root className="project-notes-card" padding="lg" variant="secondary">
                    <Card.Header>
                      <Card.Title>项目说明</Card.Title>
                    </Card.Header>
                    <Card.Content>
                      <p className="project-description">{project.description || '暂无项目描述'}</p>
                    </Card.Content>
                  </Card.Root>
                </div>
              </div>
            </div>
          ) : null}
        </Tabs.Panel>

        <Tabs.Panel value="payments">
          {activeTab === 'payments' ? (
            <div className="project-detail-content">
              <SectionHeader
                actions={
                  <RouterButton size="sm" to={`/projects/${project.id}/payment/create`}>
                    <i aria-hidden="true" className="ri-add-line" />
                    添加收款
                  </RouterButton>
                }
                className="payments-header-card"
                description={`共 ${payments.length} 笔收款计划`}
                headingLevel={3}
                title="收款记录"
              />

              {payments.length === 0 ? (
                <Card.Root>
                  <EmptyState
                    action={
                      <RouterButton size="sm" to={`/projects/${project.id}/payment/create`}>
                        添加首笔收款
                      </RouterButton>
                    }
                    description="创建收款节点后，可在这里跟踪到账进度。"
                    icon={<i className="ri-secure-payment-line" />}
                    size="lg"
                    title="暂无收款计划"
                  />
                </Card.Root>
              ) : (
                <div className="payments-list">
                  {payments.map((payment, index) => (
                    <Card.Root
                      className="payment-item"
                      data-motion-item
                      data-payment-id={payment.id}
                      data-testid={`payment-${payment.id}`}
                      id={`payment-${payment.id}`}
                      key={payment.id}
                      orientation="horizontal"
                      tabIndex={-1}
                      tone={String(payment.id) === requestedPayment ? 'accent' : 'neutral'}
                    >
                      <span aria-hidden="true" className="payment-sequence">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div className="payment-left">
                        <Surface
                          className="payment-icon"
                          padding="none"
                          radius="pill"
                          tone="accent"
                          variant="inset"
                        >
                          <i aria-hidden="true" className="ri-secure-payment-line" />
                        </Surface>
                        <div>
                          <div className="payment-title-row">
                            <strong>{getPaymentStageLabel(payment.stage)}</strong>
                            <PaymentStatusChip status={payment.status} />
                          </div>
                          <div className="payment-meta-row">
                            <span className="payment-date">
                              {isPaymentSettled(payment) ? '实际收款' : '预计收款'}：
                              {formatDate(payment.actual_date || payment.plan_date)}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{getPaymentMethodLabel(payment.method)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="payment-right">
                        <div className="amount-text">{formatCurrency(payment.amount)}</div>
                        {!isPaymentSettled(payment) ? (
                          <Button
                            aria-label={`${getPaymentStageLabel(payment.stage)}：确认收款`}
                            onClick={() => void confirmPayment(payment.id)}
                            size="sm"
                            variant="ghost"
                          >
                            <i aria-hidden="true" className="ri-check-double-line" />
                            确认收款
                          </Button>
                        ) : null}
                      </div>
                    </Card.Root>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </Tabs.Panel>
      </Tabs.Root>
    </div>
  )
}
