import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { paymentApi, projectApi, type Payment, type Project } from '@/api/project'
import GlassCard from '@/components/common/GlassCard'
import StatusBadge from '@/components/common/StatusBadge'
import { useToastStore } from '@/composables/useToast'
import { formatCurrency, formatDate } from '@/utils/format'

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

const getPaymentStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    confirmed: '已收款',
    overdue: '已逾期',
    paid: '已收款',
    pending: '待收款',
  }
  return map[status] || status
}

const getPaymentStatusClass = (status: string) => {
  if (status === 'paid' || status === 'confirmed') return 'status-success'
  if (status === 'overdue') return 'status-warning'
  return 'status-gray'
}

export default function ProjectDetailView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const requestedPayment = searchParams.get('payment')
  const toastError = useToastStore((state) => state.error)
  const toastSuccess = useToastStore((state) => state.success)
  const [project, setProject] = useState<Project | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const positionedPaymentRef = useRef<string | null>(null)
  const activeTab = requestedTab === 'payments' ? 1 : 0

  const selectTab = (tab: number) => {
    const nextSearchParams = new URLSearchParams(searchParams)
    if (tab === 1) {
      nextSearchParams.set('tab', 'payments')
    } else {
      nextSearchParams.delete('tab')
      nextSearchParams.delete('payment')
    }
    setSearchParams(nextSearchParams, { replace: true })
  }

  const loadProject = useCallback(async () => {
    if (!id) return
    try {
      const [projectRes, paymentsRes] = await Promise.all([
        projectApi.get(Number(id)),
        projectApi.getPayments(Number(id)),
      ])
      setProject(projectRes.data.data)
      setPayments(paymentsRes.data.data)
    } catch {
      toastError('获取项目详情失败')
    }
  }, [id, toastError])

  useEffect(() => {
    const timer = window.setTimeout(loadProject, 0)
    return () => window.clearTimeout(timer)
  }, [loadProject])

  useEffect(() => {
    if (activeTab !== 1 || !requestedPayment || payments.length === 0) return

    const positionKey = `${id}:${requestedPayment}`
    if (positionedPaymentRef.current === positionKey) return

    const target = document.getElementById(`payment-${requestedPayment}`)
    if (!target) return

    positionedPaymentRef.current = positionKey
    target.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    target.focus?.({ preventScroll: true })
  }, [activeTab, id, payments, requestedPayment])

  const confirmPayment = async (paymentId: number) => {
    try {
      await paymentApi.confirm(paymentId, { actual_date: new Date().toISOString().slice(0, 10) })
      toastSuccess('收款已确认')
      await loadProject()
    } catch {
      toastError('确认收款失败')
    }
  }

  if (!project) {
    return <GlassCard>正在加载项目详情...</GlassCard>
  }

  const paidAmount = project.received_amount || 0
  const progress = project.total_amount ? Math.round((paidAmount / project.total_amount) * 100) : 0
  const progressOffset = 314 - (314 * progress) / 100

  return (
    <div className="project-detail-view pb-12">
      <div className="header-section">
        <div className="flex items-center gap-4">
          <button
            aria-label="返回项目列表"
            className="btn btn-ghost btn-icon"
            onClick={() => navigate('/projects')}
            type="button"
          >
            <i aria-hidden="true" className="ri-arrow-left-line text-2xl text-primary" />
          </button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">{project.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-secondary text-sm">客户: {project.company}</p>
              <StatusBadge label={getStatusLabel(project.status)} status={project.status} />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            aria-label="编辑项目"
            className="btn btn-ghost btn-icon"
            onClick={() => navigate(`/projects/edit/${project.id}`)}
            title="编辑项目"
            type="button"
          >
            <i aria-hidden="true" className="ri-edit-line" />
          </button>
          <button
            aria-label="导出项目"
            className="btn btn-ghost btn-icon"
            title="导出项目"
            type="button"
          >
            <i aria-hidden="true" className="ri-download-2-line" />
          </button>
        </div>
      </div>

      <div className="detail-layout">
        <div className="tabs-container">
          <button
            className={`tab-btn ${activeTab === 0 ? 'active' : ''}`}
            onClick={() => selectTab(0)}
            type="button"
          >
            项目概览
          </button>
          <button
            className={`tab-btn ${activeTab === 1 ? 'active' : ''}`}
            onClick={() => selectTab(1)}
            type="button"
          >
            收款计划
          </button>
        </div>

        {activeTab === 0 ? (
          <div className="content-animate">
            <GlassCard className="card-spacing">
              <div className="progress-card-content">
                <div className="circle-container">
                  <svg className="progress-ring" height="120" viewBox="0 0 120 120" width="120">
                    <circle
                      className="progress-ring-track"
                      cx="60"
                      cy="60"
                      fill="transparent"
                      r="50"
                      strokeWidth="10"
                    />
                    <circle
                      className="progress-ring-circle"
                      cx="60"
                      cy="60"
                      fill="transparent"
                      r="50"
                      strokeWidth="10"
                      style={{ strokeDashoffset: progressOffset }}
                    />
                  </svg>
                  <div className="circle-text">
                    <span className="percent">{progress}%</span>
                    <span className="label">总进度</span>
                  </div>
                </div>

                <div className="progress-info">
                  <h3 className="card-title">项目整体进度</h3>
                  <p className="description-text">
                    {progress >= 100
                      ? '项目已全部完成，等待最终交付确认。'
                      : '当前项目正如期进行中，已完成关键里程碑。'}
                  </p>
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
            </GlassCard>

            <GlassCard className="card-spacing">
              <h3 className="card-header">收款概况</h3>
              <div className="financial-grid">
                <div className="finance-card bg-gray">
                  <span className="label">合同总额</span>
                  <span className="amount">{formatCurrency(project.total_amount)}</span>
                </div>
                <div className="finance-card bg-green">
                  <span className="label success">已收款</span>
                  <span className="amount text-success">{formatCurrency(paidAmount)}</span>
                </div>
                <div className="finance-card bg-orange">
                  <span className="label warning">待收款</span>
                  <span className="amount text-warning">
                    {formatCurrency(project.total_amount - paidAmount)}
                  </span>
                </div>
              </div>

              <div className="payment-progress">
                <div className="progress-header">
                  <span className="text-secondary">收款进度</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <h3 className="card-header mb-2">项目描述</h3>
              <p className="description-text leading-relaxed">
                {project.description || '暂无项目描述'}
              </p>
            </GlassCard>
          </div>
        ) : (
          <div className="content-animate">
            <div className="payments-header-card">
              <div>
                <h3 className="font-bold text-lg">收款记录</h3>
                <p className="text-xs text-secondary mt-0.5">共 {payments.length} 笔收款计划</p>
              </div>

              <button
                className="btn btn-sm btn-primary"
                onClick={() => navigate(`/projects/${project.id}/payment/create`)}
                type="button"
              >
                <i className="ri-add-line mr-1" />
                添加收款
              </button>
            </div>

            <div className="payments-list">
              {payments.length === 0 ? (
                <GlassCard className="payment-item">
                  <div className="text-secondary">暂无收款计划</div>
                </GlassCard>
              ) : (
                payments.map((payment) => (
                  <GlassCard
                    className={`payment-item ${String(payment.id) === requestedPayment ? 'payment-item--highlighted' : ''}`}
                    data-payment-id={payment.id}
                    data-testid={`payment-${payment.id}`}
                    id={`payment-${payment.id}`}
                    key={payment.id}
                    tabIndex={-1}
                  >
                    <div className="payment-left">
                      <div className="icon-circle">
                        <i className="ri-secure-payment-line" />
                      </div>
                      <div>
                        <div className="payment-title-row">
                          <span className="font-bold text-sm">{payment.stage}</span>
                          <span className={`status-tag ${getPaymentStatusClass(payment.status)}`}>
                            {getPaymentStatusLabel(payment.status)}
                          </span>
                        </div>
                        <div className="text-xs text-secondary">
                          {payment.status === 'paid' || payment.status === 'confirmed'
                            ? '实际收款'
                            : '预计收款'}
                          : {formatDate(payment.actual_date || payment.plan_date)}
                        </div>
                      </div>
                    </div>
                    <div className="payment-right">
                      <div className="amount-text">{formatCurrency(payment.amount)}</div>
                      {payment.status !== 'paid' && payment.status !== 'confirmed' ? (
                        <button
                          className="confirm-btn"
                          onClick={() => void confirmPayment(payment.id)}
                          type="button"
                        >
                          <i className="ri-check-double-line mr-0.5" />
                          确认收款
                        </button>
                      ) : null}
                    </div>
                  </GlassCard>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
