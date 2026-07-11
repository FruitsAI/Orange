import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  paymentApi,
  projectApi,
  type Payment,
  type PaymentRequest,
  type ProjectRequest,
} from '@/api/project'
import DatePicker from '@/components/common/DatePicker'
import GlassCard from '@/components/common/GlassCard'
import { useToastStore } from '@/composables/useToast'

interface PaymentItem {
  id?: number
  amount: string
  method: string
  planDate: string
  remark: string
  stage: string
  status: string
}

const emptyForm: ProjectRequest = {
  company: '',
  contract_date: '',
  contract_number: '',
  description: '',
  end_date: '',
  name: '',
  payment_method: '一次性付款',
  start_date: '',
  status: 'active',
  total_amount: 0,
  type: '',
}

const projectTypeOptions = [
  { label: '软件开发', value: 'software' },
  { label: '技术咨询', value: 'consulting' },
  { label: '运营服务', value: 'service' },
  { label: '其他', value: 'other' },
]

const projectStatusOptions = [
  { label: '进行中', value: 'active' },
  { label: '已完成', value: 'completed' },
  { label: '即将交付', value: 'pending' },
  { label: '未开始', value: 'notstarted' },
  { label: '已归档', value: 'archived' },
]

const paymentMethods = ['一次性付款', '分期付款']

const collectionStageOptions = [
  { label: '全款', value: 'all' },
  { label: '预付款', value: 'deposit' },
  { label: '阶段款', value: 'milestone' },
  { label: '尾款', value: 'final' },
]

const collectionMethodOptions = [
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

const createPaymentItem = (payment?: Payment): PaymentItem => ({
  amount: payment ? String(payment.amount) : '',
  id: payment?.id,
  method: payment?.method || 'bank_transfer',
  planDate: payment?.plan_date || '',
  remark: payment?.remark || '',
  stage: payment?.stage || 'all',
  status: payment?.status || 'pending',
})

export default function ProjectCreateView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toastError = useToastStore((state) => state.error)
  const toastSuccess = useToastStore((state) => state.success)
  const [form, setForm] = useState<ProjectRequest>(emptyForm)
  const [paymentItems, setPaymentItems] = useState<PaymentItem[]>([createPaymentItem()])
  const originalPaymentIds = useRef<number[]>([])
  const [saving, setSaving] = useState(false)
  const isEdit = Boolean(id)

  const updateForm = (patch: Partial<ProjectRequest>) =>
    setForm((current) => ({ ...current, ...patch }))

  const isInstallment = form.payment_method === '分期付款'

  const defaultStageOptions = useMemo(() => {
    if (isInstallment) return collectionStageOptions.filter((stage) => stage.value !== 'all')
    return collectionStageOptions
  }, [isInstallment])

  const ensurePaymentItems = useCallback(
    (paymentMethod = form.payment_method) => {
      setPaymentItems((current) => {
        if (paymentMethod === '一次性付款') {
          const first = current[0] || createPaymentItem()
          return [{ ...first, stage: 'all' }]
        }
        return current.length
          ? current.map((item) => (item.stage === 'all' ? { ...item, stage: 'deposit' } : item))
          : [{ ...createPaymentItem(), stage: 'deposit' }]
      })
    },
    [form.payment_method],
  )

  const loadProject = useCallback(async () => {
    if (!id) return
    setSaving(true)
    try {
      const [projectRes, paymentsRes] = await Promise.all([
        projectApi.get(Number(id)),
        projectApi.getPayments(Number(id)),
      ])
      const project = projectRes.data.data
      setForm({
        company: project.company,
        contract_date: project.contract_date || '',
        contract_number: project.contract_number || '',
        description: project.description || '',
        end_date: project.end_date || '',
        name: project.name,
        payment_method: project.payment_method || '一次性付款',
        start_date: project.start_date || '',
        status: project.status,
        total_amount: project.total_amount,
        type: project.type || '',
      })

      originalPaymentIds.current = paymentsRes.data.data.map((payment) => payment.id)
      setPaymentItems(
        paymentsRes.data.data.length
          ? paymentsRes.data.data.map(createPaymentItem)
          : [createPaymentItem()],
      )
    } catch {
      toastError('获取项目详情失败')
    } finally {
      setSaving(false)
    }
  }, [id, toastError])

  useEffect(() => {
    const timer = window.setTimeout(loadProject, 0)
    return () => window.clearTimeout(timer)
  }, [loadProject])

  const updatePaymentItem = (index: number, patch: Partial<PaymentItem>) => {
    setPaymentItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    )
  }

  const addPaymentItem = () => {
    setPaymentItems((current) => [...current, { ...createPaymentItem(), stage: 'deposit' }])
  }

  const removePaymentItem = (index: number) => {
    if (!isInstallment) return
    setPaymentItems((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  const savePayments = async (projectId: number) => {
    const currentIds = new Set(
      paymentItems.map((item) => item.id).filter((itemId): itemId is number => Boolean(itemId)),
    )
    const removedIds = originalPaymentIds.current.filter((paymentId) => !currentIds.has(paymentId))

    await Promise.all(removedIds.map((paymentId) => paymentApi.delete(paymentId)))

    for (const item of paymentItems) {
      if (!item.amount || !item.planDate) continue

      const payload: PaymentRequest = {
        amount: Number(item.amount) || 0,
        method: item.method || 'bank_transfer',
        plan_date: item.planDate,
        project_id: projectId,
        remark: item.remark,
        stage: item.stage || '款项',
        status: item.status,
      }

      if (item.id) {
        await paymentApi.update(item.id, payload)
      } else {
        await paymentApi.create(payload)
      }
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    try {
      const response =
        isEdit && id ? await projectApi.update(Number(id), form) : await projectApi.create(form)
      const projectId = isEdit && id ? Number(id) : response.data.data.id
      await savePayments(projectId)
      toastSuccess(isEdit ? '项目与收款已更新' : '项目已创建')
      navigate('/projects')
    } catch (error) {
      toastError(error instanceof Error ? error.message : '保存项目失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="project-create-view">
      <div style={{ marginBottom: 12, marginTop: -12 }}>
        <button
          className="btn btn-ghost btn-sm pl-0 hover:bg-transparent"
          onClick={() => navigate(-1)}
          type="button"
        >
          <i className="ri-arrow-left-line text-2xl text-primary" />
        </button>
      </div>

      <GlassCard className="w-full">
        <form className="project-form" onSubmit={handleSubmit}>
          <h3 className="section-title">基本信息</h3>
          <div className="form-grid">
            <div className="input-group">
              <label>
                项目名称 <span className="text-red-500">*</span>
              </label>
              <div className="input-wrapper">
                <input
                  autoCapitalize="off"
                  autoComplete="off"
                  autoCorrect="off"
                  onChange={(event) => updateForm({ name: event.target.value })}
                  placeholder="请输入项目名称"
                  required
                  spellCheck={false}
                  type="text"
                  value={form.name}
                />
              </div>
            </div>

            <div className="input-group">
              <label>
                客户名称 <span className="text-red-500">*</span>
              </label>
              <div className="input-wrapper">
                <input
                  autoCapitalize="off"
                  autoComplete="off"
                  autoCorrect="off"
                  onChange={(event) => updateForm({ company: event.target.value })}
                  placeholder="请输入客户名称"
                  required
                  spellCheck={false}
                  type="text"
                  value={form.company}
                />
              </div>
            </div>

            <div className="input-group">
              <label>
                项目类型 <span className="text-red-500">*</span>
              </label>
              <div className="input-wrapper">
                <select
                  className="form-select"
                  onChange={(event) => updateForm({ type: event.target.value })}
                  value={form.type}
                >
                  <option value="">请选择项目类型</option>
                  {projectTypeOptions.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <i className="ri-arrow-down-s-line select-arrow" />
              </div>
            </div>

            <div className="input-group">
              <label>
                项目状态 <span className="text-red-500">*</span>
              </label>
              <div className="input-wrapper">
                <select
                  className="form-select"
                  onChange={(event) => updateForm({ status: event.target.value })}
                  value={form.status}
                >
                  {projectStatusOptions.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
                <i className="ri-arrow-down-s-line select-arrow" />
              </div>
            </div>

            <div className="input-group">
              <label>
                开始日期 <span className="text-red-500">*</span>
              </label>
              <div className="input-wrapper">
                <DatePicker
                  placeholder="请选择开始日期"
                  required
                  value={form.start_date}
                  onChange={(value) => updateForm({ start_date: value })}
                />
              </div>
            </div>

            <div className="input-group">
              <label>
                截止日期 <span className="text-red-500">*</span>
              </label>
              <div className="input-wrapper">
                <DatePicker
                  placeholder="请选择截止日期"
                  required
                  value={form.end_date}
                  onChange={(value) => updateForm({ end_date: value })}
                />
              </div>
            </div>
          </div>

          <h3 className="section-title mt-md">财务信息</h3>
          <div className="form-grid">
            <div className="input-group">
              <label>
                合同总金额 (¥) <span className="text-red-500">*</span>
              </label>
              <div className="input-wrapper">
                <input
                  autoCapitalize="off"
                  autoComplete="off"
                  autoCorrect="off"
                  min="0"
                  onChange={(event) => updateForm({ total_amount: Number(event.target.value) })}
                  placeholder="0.00"
                  required
                  spellCheck={false}
                  step="0.01"
                  type="number"
                  value={form.total_amount}
                />
              </div>
            </div>

            <div className="input-group">
              <label>
                合同日期 <span className="text-red-500">*</span>
              </label>
              <div className="input-wrapper">
                <DatePicker
                  placeholder="请选择合同日期"
                  value={form.contract_date || ''}
                  onChange={(value) => updateForm({ contract_date: value })}
                />
              </div>
            </div>

            <div className="input-group">
              <label>
                合同编号 <span className="text-red-500">*</span>
              </label>
              <div className="input-wrapper">
                <input
                  autoCapitalize="off"
                  autoComplete="off"
                  autoCorrect="off"
                  onChange={(event) => updateForm({ contract_number: event.target.value })}
                  placeholder="选择合同日期后自动生成"
                  spellCheck={false}
                  type="text"
                  value={form.contract_number}
                />
              </div>
            </div>

            <div className="input-group">
              <label>
                付款模式 <span className="text-red-500">*</span>
              </label>
              <div className="input-wrapper">
                <select
                  className="form-select"
                  onChange={(event) => {
                    updateForm({ payment_method: event.target.value })
                    ensurePaymentItems(event.target.value)
                  }}
                  value={form.payment_method}
                >
                  {paymentMethods.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
                <i className="ri-arrow-down-s-line select-arrow" />
              </div>
            </div>
          </div>

          <div className="installments-section mt-md mb-md">
            <div className="flex justify-between items-center mb-sm">
              <h3 className="section-title text-base mb-0 border-none pb-0 pl-0">收款计划</h3>
              {isInstallment ? (
                <button className="btn btn-sm btn-primary" onClick={addPaymentItem} type="button">
                  <i className="ri-add-line mr-1" />
                  添加分期
                </button>
              ) : null}
            </div>

            {paymentItems.map((item, index) => (
              <div
                className="installment-item glass-panel p-md mb-md rounded-lg"
                key={item.id ?? index}
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
                        onChange={(event) =>
                          updatePaymentItem(index, { amount: event.target.value })
                        }
                        placeholder="0.00"
                        required
                        spellCheck={false}
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
                        onChange={(event) =>
                          updatePaymentItem(index, { stage: event.target.value })
                        }
                        value={item.stage}
                      >
                        {defaultStageOptions.map((stage) => (
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
                        onChange={(event) =>
                          updatePaymentItem(index, { method: event.target.value })
                        }
                        value={item.method}
                      >
                        {collectionMethodOptions.map((method) => (
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
                        onChange={(event) =>
                          updatePaymentItem(index, { status: event.target.value })
                        }
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
                        onChange={(event) =>
                          updatePaymentItem(index, { remark: event.target.value })
                        }
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
          </div>

          <div className="input-group span-2">
            <label>项目描述</label>
            <div className="input-wrapper">
              <textarea
                className="form-textarea"
                onChange={(event) => updateForm({ description: event.target.value })}
                placeholder="请输入项目描述（选填）"
                rows={3}
                value={form.description}
              />
            </div>
          </div>

          <div className="form-actions mt-xl">
            <button className="btn btn-ghost" onClick={() => navigate(-1)} type="button">
              取消
            </button>
            <button className="btn btn-primary" disabled={saving} type="submit">
              {saving ? '保存中...' : '确认保存'}
            </button>
          </div>
        </form>
      </GlassCard>
    </div>
  )
}
