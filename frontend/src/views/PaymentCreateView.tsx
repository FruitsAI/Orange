import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { paymentApi, projectApi, type PaymentRequest, type Project } from '@/api/project'
import DatePicker from '@/components/common/DatePicker'
import GlassCard from '@/components/common/GlassCard'
import { useToastStore } from '@/composables/useToast'

interface PaymentItem {
  amount: string
  method: string
  planDate: string
  remark: string
  stage: string
  status: string
}

const paymentStageOptions = [
  { label: '全款', value: 'all' },
  { label: '预付款', value: 'deposit' },
  { label: '阶段款', value: 'milestone' },
  { label: '尾款', value: 'final' },
]

const paymentMethodOptions = [
  { label: '银行转账', value: 'bank_transfer' },
  { label: '支付宝', value: 'alipay' },
  { label: '微信', value: 'wechat' },
  { label: '现金', value: 'cash' },
]

const paymentStatuses = [
  { label: '待收款', value: 'pending' },
  { label: '已收款', value: 'paid' },
  { label: '已逾期', value: 'overdue' },
]

const createPaymentItem = (installment = false): PaymentItem => ({
  amount: '',
  method: 'bank_transfer',
  planDate: '',
  remark: '',
  stage: installment ? 'deposit' : 'all',
  status: 'pending',
})

export default function PaymentCreateView() {
  const params = useParams()
  const navigate = useNavigate()
  const toastError = useToastStore((state) => state.error)
  const toastSuccess = useToastStore((state) => state.success)
  const routeProjectId = Number(params.id) || 0
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState(routeProjectId)
  const [paymentItems, setPaymentItems] = useState<PaymentItem[]>([createPaymentItem()])
  const [saving, setSaving] = useState(false)

  const currentProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId),
    [projects, selectedProjectId],
  )
  const isInstallment = currentProject?.payment_method === '分期付款'

  const loadProjects = useCallback(async () => {
    try {
      const response = await projectApi.list({ page: 1, page_size: 100 })
      const list = response.data.data.list
      setProjects(list)
      if (!selectedProjectId && list[0]) {
        setSelectedProjectId(list[0].id)
      }
    } catch {
      toastError('获取项目列表失败')
    }
  }, [selectedProjectId, toastError])

  useEffect(() => {
    const timer = window.setTimeout(loadProjects, 0)
    return () => window.clearTimeout(timer)
  }, [loadProjects])

  useEffect(() => {
    const timer = window.setTimeout(
      () =>
        setPaymentItems((current) => {
          if (isInstallment) {
            return current.map((item) =>
              item.stage === 'all' ? { ...item, stage: 'deposit' } : item,
            )
          }
          const first = current[0] || createPaymentItem()
          return [{ ...first, stage: 'all' }]
        }),
      0,
    )
    return () => window.clearTimeout(timer)
  }, [isInstallment])

  const updatePaymentItem = (index: number, patch: Partial<PaymentItem>) => {
    setPaymentItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    )
  }

  const addPaymentItem = () => setPaymentItems((current) => [...current, createPaymentItem(true)])

  const removePaymentItem = (index: number) => {
    if (!isInstallment) return
    setPaymentItems((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    try {
      const requests = paymentItems
        .filter((item) => item.amount && item.planDate)
        .map(
          (item): PaymentRequest => ({
            amount: Number(item.amount) || 0,
            method: item.method,
            plan_date: item.planDate,
            project_id: selectedProjectId,
            remark: item.remark,
            stage: item.stage,
            status: item.status,
          }),
        )

      await Promise.all(requests.map((request) => paymentApi.create(request)))
      toastSuccess('收款计划已创建')
      navigate(selectedProjectId ? `/projects/${selectedProjectId}` : '/projects')
    } catch (error) {
      toastError(error instanceof Error ? error.message : '创建收款失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="payment-create-view">
      <div className="flex items-center gap-md" style={{ marginBottom: 24, marginTop: -12 }}>
        <button
          className="btn btn-ghost btn-sm pl-0 hover:bg-transparent"
          onClick={() => navigate(-1)}
          type="button"
        >
          <i className="ri-arrow-left-line text-2xl text-primary" />
        </button>

        <div className="project-context">
          {routeProjectId ? (
            <div className="text-xl font-bold">{currentProject?.name || '当前项目'}</div>
          ) : (
            <div className="w-64">
              <div className="input-wrapper">
                <select
                  className="form-select bg-glass"
                  onChange={(event) => setSelectedProjectId(Number(event.target.value))}
                  required
                  value={selectedProjectId}
                >
                  <option disabled value={0}>
                    请选择项目
                  </option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                <i className="ri-arrow-down-s-line select-arrow" />
              </div>
            </div>
          )}
        </div>
      </div>

      <GlassCard className="w-full">
        <form className="payment-form" onSubmit={handleSubmit}>
          <div className="flex justify-between items-center mb-md">
            <h3 className="section-title mb-0 border-none pb-0 pl-0">收款计划</h3>
            {isInstallment ? (
              <button className="btn btn-sm btn-primary" onClick={addPaymentItem} type="button">
                <i className="ri-add-line mr-1" />
                添加分期
              </button>
            ) : null}
          </div>

          {paymentItems.map((item, index) => (
            <div
              className="glass-panel p-md mb-md rounded-lg"
              key={index}
              style={{ border: '1px solid var(--color-primary)' }}
            >
              {isInstallment ? (
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm font-bold text-primary">第 {index + 1} 期</span>
                  <button
                    className="text-xs text-danger hover:underline"
                    onClick={() => removePaymentItem(index)}
                    type="button"
                  >
                    删除
                  </button>
                </div>
              ) : null}

              <div className="form-grid">
                <div className="input-group">
                  <label>
                    收款金额 (¥) <span className="text-red-500">*</span>
                  </label>
                  <div className="input-wrapper">
                    <input
                      autoCapitalize="off"
                      autoComplete="off"
                      autoCorrect="off"
                      min="0"
                      onChange={(event) => updatePaymentItem(index, { amount: event.target.value })}
                      placeholder="0.00"
                      required
                      spellCheck={false}
                      step="0.01"
                      type="number"
                      value={item.amount}
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label>
                    收款日期 <span className="text-red-500">*</span>
                  </label>
                  <div className="input-wrapper">
                    <DatePicker
                      placeholder="请选择收款日期"
                      required
                      value={item.planDate}
                      onChange={(value) => updatePaymentItem(index, { planDate: value })}
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label>
                    款项阶段 <span className="text-red-500">*</span>
                  </label>
                  <div className="input-wrapper">
                    <select
                      className="form-select"
                      disabled={!isInstallment}
                      onChange={(event) => updatePaymentItem(index, { stage: event.target.value })}
                      value={item.stage}
                    >
                      {paymentStageOptions.map((stage) => (
                        <option key={stage.value} value={stage.value}>
                          {stage.label}
                        </option>
                      ))}
                    </select>
                    <i className="ri-arrow-down-s-line select-arrow" />
                  </div>
                </div>

                <div className="input-group">
                  <label>
                    收款方式 <span className="text-red-500">*</span>
                  </label>
                  <div className="input-wrapper">
                    <select
                      className="form-select"
                      onChange={(event) => updatePaymentItem(index, { method: event.target.value })}
                      value={item.method}
                    >
                      {paymentMethodOptions.map((method) => (
                        <option key={method.value} value={method.value}>
                          {method.label}
                        </option>
                      ))}
                    </select>
                    <i className="ri-arrow-down-s-line select-arrow" />
                  </div>
                </div>

                <div className="input-group">
                  <label>
                    状态 <span className="text-red-500">*</span>
                  </label>
                  <div className="input-wrapper">
                    <select
                      className="form-select"
                      onChange={(event) => updatePaymentItem(index, { status: event.target.value })}
                      value={item.status}
                    >
                      {paymentStatuses.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                    <i className="ri-arrow-down-s-line select-arrow" />
                  </div>
                </div>

                <div className="input-group span-2">
                  <label>备注</label>
                  <div className="input-wrapper">
                    <textarea
                      autoCapitalize="off"
                      autoComplete="off"
                      autoCorrect="off"
                      className="form-textarea"
                      onChange={(event) => updatePaymentItem(index, { remark: event.target.value })}
                      placeholder="请输入备注信息（选填）"
                      rows={2}
                      spellCheck={false}
                      value={item.remark}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {paymentItems.length === 0 ? (
            <div className="text-center text-secondary py-lg">暂无收款计划，请添加。</div>
          ) : null}

          <div className="form-actions mt-xl">
            <button className="btn btn-ghost" onClick={() => navigate(-1)} type="button">
              取消
            </button>
            <button
              className="btn btn-primary"
              disabled={saving || !selectedProjectId}
              type="submit"
            >
              {saving ? '保存中...' : '确认保存'}
            </button>
          </div>
        </form>
      </GlassCard>
    </div>
  )
}
