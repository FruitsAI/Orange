import dayjs from 'dayjs'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
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
  ProgressBar,
  RouterButton,
  SectionHeader,
  Skeleton,
  Surface,
  Tabs,
} from '@/design-system'
import { useToastStore } from '@/composables/useToast'
import { formatCurrency, formatDate } from '@/utils/format'
import '@/styles/project-domain.css'

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

  const paidAmount = project.received_amount || 0
  const progress = project.total_amount ? Math.round((paidAmount / project.total_amount) * 100) : 0

  return (
    <div className="project-detail-view">
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
        leading={
          <IconButton label="返回项目列表" onClick={() => navigate('/projects')} variant="ghost">
            <i aria-hidden="true" className="ri-arrow-left-line" />
          </IconButton>
        }
        title={project.name}
      />

      <Tabs.Root className="project-detail-tabs" onValueChange={selectTab} value={activeTab}>
        <Tabs.List aria-label="项目详情视图">
          <Tabs.Tab className={activeTab === 'overview' ? 'active' : undefined} value="overview">
            项目概览
          </Tabs.Tab>
          <Tabs.Tab className={activeTab === 'payments' ? 'active' : undefined} value="payments">
            收款计划
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview">
          {activeTab === 'overview' ? (
            <div className="project-detail-content">
              <Card.Root className="project-detail-card">
                <div className="progress-card-content">
                  <CircularProgress
                    aria-label="项目总进度"
                    className="project-overview-progress"
                    showValueLabel
                    size="lg"
                    value={progress}
                  />

                  <div className="progress-info">
                    <Card.Title>项目整体进度</Card.Title>
                    <Card.Description>
                      {progress >= 100
                        ? '项目已全部完成，等待最终交付确认。'
                        : '当前项目正如期进行中，已完成关键里程碑。'}
                    </Card.Description>
                    <div className="info-grid">
                      <div className="info-item">
                        <div className="label">开始日期</div>
                        <div className="value">{formatDate(project.start_date)}</div>
                      </div>
                      <div className="info-item">
                        <div className="label">预计完成</div>
                        <div className="value">{formatDate(project.end_date)}</div>
                      </div>
                      <div className="info-item">
                        <div className="label">合同编号</div>
                        <div className="value font-mono">{project.contract_number || '-'}</div>
                      </div>
                      <div className="info-item">
                        <div className="label">签约日期</div>
                        <div className="value">{formatDate(project.contract_date)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card.Root>

              <Card.Root className="project-detail-card">
                <Card.Header>
                  <Card.Title>收款概况</Card.Title>
                </Card.Header>
                <Card.Content>
                  <div className="financial-grid">
                    <Card.Root className="finance-card" gap="none" padding="md" variant="secondary">
                      <span className="label">合同总额</span>
                      <span className="amount">{formatCurrency(project.total_amount)}</span>
                    </Card.Root>
                    <Card.Root className="finance-card" gap="none" padding="md" tone="success">
                      <span className="label">已收款</span>
                      <span className="amount">{formatCurrency(paidAmount)}</span>
                    </Card.Root>
                    <Card.Root className="finance-card" gap="none" padding="md" tone="warning">
                      <span className="label">待收款</span>
                      <span className="amount">
                        {formatCurrency(project.total_amount - paidAmount)}
                      </span>
                    </Card.Root>
                  </div>

                  <div className="project-payment-progress">
                    <div className="project-payment-progress__header">
                      <span>收款进度</span>
                      <strong>{progress}%</strong>
                    </div>
                    <ProgressBar
                      label="项目收款进度"
                      tone="success"
                      value={progress}
                      valueLabel={`${progress}%`}
                    />
                  </div>
                </Card.Content>
              </Card.Root>

              <Card.Root>
                <Card.Header>
                  <Card.Title>项目描述</Card.Title>
                </Card.Header>
                <Card.Content>
                  <p className="project-description">{project.description || '暂无项目描述'}</p>
                </Card.Content>
              </Card.Root>
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
                    title="暂无收款计划"
                  />
                </Card.Root>
              ) : (
                <div className="payments-list">
                  {payments.map((payment) => (
                    <Card.Root
                      className="payment-item"
                      data-payment-id={payment.id}
                      data-testid={`payment-${payment.id}`}
                      id={`payment-${payment.id}`}
                      key={payment.id}
                      orientation="horizontal"
                      tabIndex={-1}
                      tone={String(payment.id) === requestedPayment ? 'accent' : 'neutral'}
                    >
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
                            <strong>{payment.stage}</strong>
                            <PaymentStatusChip status={payment.status} />
                          </div>
                          <div className="payment-date">
                            {payment.status === 'paid' || payment.status === 'confirmed'
                              ? '实际收款'
                              : '预计收款'}
                            ：{formatDate(payment.actual_date || payment.plan_date)}
                          </div>
                        </div>
                      </div>
                      <div className="payment-right">
                        <div className="amount-text">{formatCurrency(payment.amount)}</div>
                        {payment.status !== 'paid' && payment.status !== 'confirmed' ? (
                          <Button
                            aria-label={`${payment.stage}：确认收款`}
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
