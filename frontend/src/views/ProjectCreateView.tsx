import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  paymentApi,
  projectApi,
  type Payment,
  type PaymentRequest,
  type ProjectRequest,
} from '@/api/project'
import { PaymentPlanEditor } from '@/components/project/PaymentPlanEditor'
import { createPaymentPlanItem, type PaymentPlanItem } from '@/components/project/paymentPlan'
import { ProjectStatusChip } from '@/components/project/ProjectStatusChip'
import {
  Button,
  Card,
  DatePicker,
  Field,
  FormActions,
  FormGrid,
  FormSection,
  IconButton,
  Input,
  NumberInput,
  PageHeader,
  ProgressBar,
  Select,
  Surface,
  TextArea,
  type SelectOption,
} from '@/design-system'
import { useToastStore } from '@/composables/useToast'
import { formatCurrency } from '@/utils/format'
import '@/styles/project-domain.css'

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

const projectTypeOptions: SelectOption[] = [
  { label: '软件开发', value: 'software' },
  { label: '技术咨询', value: 'consulting' },
  { label: '运营服务', value: 'service' },
  { label: '其他', value: 'other' },
]

const projectStatusOptions: SelectOption[] = [
  { label: '进行中', value: 'active' },
  { label: '已完成', value: 'completed' },
  { label: '即将交付', value: 'pending' },
  { label: '未开始', value: 'notstarted' },
  { label: '已归档', value: 'archived' },
]

const paymentMethodOptions: SelectOption[] = [
  { label: '一次性付款', value: '一次性付款' },
  { label: '分期付款', value: '分期付款' },
]

const installmentStageOptions: SelectOption[] = [
  { label: '预付款', value: 'deposit' },
  { label: '阶段款', value: 'milestone' },
  { label: '尾款', value: 'final' },
]

const oneTimeStageOptions: SelectOption[] = [
  { label: '全款', value: 'all' },
  ...installmentStageOptions,
]

const getOptionLabel = (options: SelectOption[], value: string | undefined) =>
  options.find((option) => option.value === value)?.label || value || '待填写'

function ProjectFormSectionTitle({
  icon,
  index,
  title,
}: {
  icon: string
  index: number
  title: string
}) {
  return (
    <span className="project-form-section-title">
      <Surface
        className="project-section-icon"
        padding="none"
        radius="control"
        tone="accent"
        variant="inset"
      >
        <i aria-hidden="true" className={icon} />
      </Surface>
      <span>
        <small>STEP {String(index).padStart(2, '0')}</small>
        {title}
      </span>
    </span>
  )
}

const toPaymentPlanItem = (payment: Payment): PaymentPlanItem => ({
  ...createPaymentPlanItem(payment.stage !== 'all'),
  amount: String(payment.amount),
  id: payment.id,
  method: payment.method || 'bank_transfer',
  planDate: payment.plan_date || '',
  remark: payment.remark || '',
  stage: payment.stage || 'all',
  status: payment.status || 'pending',
})

export default function ProjectCreateView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toastError = useToastStore((state) => state.error)
  const toastSuccess = useToastStore((state) => state.success)
  const [form, setForm] = useState<ProjectRequest>(emptyForm)
  const [paymentItems, setPaymentItems] = useState<PaymentPlanItem[]>([createPaymentPlanItem()])
  const originalPaymentIds = useRef<number[]>([])
  const [saving, setSaving] = useState(false)
  const isMountedRef = useRef(false)
  const loadGenerationRef = useRef(0)
  const projectId = id ? Number(id) : null
  const activeProjectIdRef = useRef<number | null>(projectId)
  const isEdit = projectId !== null
  const isInstallment = form.payment_method === '分期付款'
  const plannedAmount = paymentItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  const requiredFields = [
    form.name.trim(),
    form.company.trim(),
    form.type,
    form.start_date,
    form.end_date,
    form.contract_date,
    form.total_amount > 0,
    paymentItems.every((item) => Boolean(item.amount && item.planDate)),
  ]
  const completion = Math.round(
    (requiredFields.filter(Boolean).length / requiredFields.length) * 100,
  )
  const planDifference = form.total_amount - plannedAmount
  const planAligned = form.total_amount > 0 && Math.abs(planDifference) < 0.01
  const planState = !form.total_amount ? 'neutral' : planAligned ? 'success' : 'warning'

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      loadGenerationRef.current += 1
    }
  }, [])

  useLayoutEffect(() => {
    activeProjectIdRef.current = projectId
  }, [projectId])

  const updateForm = (patch: Partial<ProjectRequest>) =>
    setForm((current) => ({ ...current, ...patch }))

  const ensurePaymentItems = (paymentMethod: string) => {
    setPaymentItems((current) => {
      if (paymentMethod === '一次性付款') {
        const first = current[0] || createPaymentPlanItem()
        return [{ ...first, stage: 'all' }]
      }
      return current.length
        ? current.map((item) => (item.stage === 'all' ? { ...item, stage: 'deposit' } : item))
        : [createPaymentPlanItem(true)]
    })
  }

  const loadProject = useCallback(
    async (requestedProjectId: number) => {
      if (!isMountedRef.current || activeProjectIdRef.current !== requestedProjectId) return

      const loadGeneration = ++loadGenerationRef.current
      setSaving(true)
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
            ? paymentsRes.data.data.map(toPaymentPlanItem)
            : [createPaymentPlanItem()],
        )
      } catch {
        if (
          !isMountedRef.current ||
          loadGeneration !== loadGenerationRef.current ||
          activeProjectIdRef.current !== requestedProjectId
        ) {
          return
        }
        toastError('获取项目详情失败')
      } finally {
        if (
          isMountedRef.current &&
          loadGeneration === loadGenerationRef.current &&
          activeProjectIdRef.current === requestedProjectId
        ) {
          setSaving(false)
        }
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

  const savePayments = async (projectId: number) => {
    const currentIds = new Set(
      paymentItems.map((item) => item.id).filter((itemId): itemId is number => Boolean(itemId)),
    )
    const removedIds = originalPaymentIds.current.filter((paymentId) => !currentIds.has(paymentId))

    await Promise.all(removedIds.map((paymentId) => paymentApi.delete(paymentId)))

    const writes = paymentItems.flatMap((item) => {
      if (!item.amount || !item.planDate) return []

      const payload: PaymentRequest = {
        amount: Number(item.amount) || 0,
        method: item.method || 'bank_transfer',
        plan_date: item.planDate,
        project_id: projectId,
        remark: item.remark,
        stage: item.stage || '款项',
        status: item.status,
      }

      return [item.id ? paymentApi.update(item.id, payload) : paymentApi.create(payload)]
    })

    await Promise.all(writes)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.type) {
      toastError('请选择项目类型')
      return
    }
    if (!form.start_date || !form.end_date) {
      toastError('请选择项目开始和截止日期')
      return
    }
    if (!form.contract_date) {
      toastError('请选择合同日期')
      return
    }
    if (paymentItems.some((item) => !item.amount || !item.planDate)) {
      toastError('请完整填写收款金额和收款日期')
      return
    }

    setSaving(true)
    try {
      const response =
        isEdit && projectId
          ? await projectApi.update(projectId, form)
          : await projectApi.create(form)
      const savedProjectId = isEdit && projectId ? projectId : response.data.data.id
      await savePayments(savedProjectId)
      toastSuccess(isEdit ? '项目与收款已更新' : '项目已创建')
      navigate('/projects')
    } catch (error) {
      toastError(error instanceof Error ? error.message : '保存项目失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="project-create-view project-form-page" data-motion-scope="project-create">
      <PageHeader
        description={isEdit ? '更新项目档案与收款计划。' : '建立项目档案并规划回款节点。'}
        eyebrow={
          <span className="project-create-kicker">
            <i aria-hidden="true" className={isEdit ? 'ri-edit-box-line' : 'ri-add-box-line'} />
            {isEdit ? 'PROJECT EDITOR' : 'NEW PROJECT'}
          </span>
        }
        leading={
          <IconButton label="返回上一页" onClick={() => navigate(-1)} variant="ghost">
            <i aria-hidden="true" className="ri-arrow-left-line" />
          </IconButton>
        }
        title={isEdit ? '编辑项目' : '创建项目'}
      />

      <div className="project-compose-layout">
        <Card.Root className="project-form-card" padding="none" variant="secondary">
          <form aria-label="项目编辑表单" className="project-form" onSubmit={handleSubmit}>
            <FormSection
              className="project-form-section"
              description="确定项目归属、服务类型和交付周期。"
              title={
                <ProjectFormSectionTitle icon="ri-folder-user-line" index={1} title="基本信息" />
              }
            >
              <FormGrid columns={2}>
                <Field.Root required>
                  <Field.Label>项目名称</Field.Label>
                  <Input
                    autoCapitalize="off"
                    autoComplete="off"
                    autoCorrect="off"
                    onChange={(event) => updateForm({ name: event.currentTarget.value })}
                    placeholder="请输入项目名称"
                    spellCheck={false}
                    type="text"
                    value={form.name}
                  />
                </Field.Root>

                <Field.Root required>
                  <Field.Label>客户名称</Field.Label>
                  <Input
                    autoCapitalize="off"
                    autoComplete="off"
                    autoCorrect="off"
                    onChange={(event) => updateForm({ company: event.currentTarget.value })}
                    placeholder="请输入客户名称"
                    spellCheck={false}
                    type="text"
                    value={form.company}
                  />
                </Field.Root>

                <Field.Root required>
                  <Field.Label>项目类型</Field.Label>
                  <Select
                    aria-label="项目类型"
                    onValueChange={(value) => updateForm({ type: value })}
                    options={projectTypeOptions}
                    placeholder="请选择项目类型"
                    value={form.type}
                  />
                </Field.Root>

                <Field.Root required>
                  <Field.Label>项目状态</Field.Label>
                  <Select
                    aria-label="项目状态"
                    onValueChange={(value) => updateForm({ status: value })}
                    options={projectStatusOptions}
                    value={form.status}
                  />
                </Field.Root>

                <Field.Root required>
                  <Field.Label>开始日期</Field.Label>
                  <DatePicker
                    aria-label="开始日期"
                    onValueChange={(value) => updateForm({ start_date: value })}
                    placeholder="请选择开始日期"
                    value={form.start_date}
                  />
                </Field.Root>

                <Field.Root required>
                  <Field.Label>截止日期</Field.Label>
                  <DatePicker
                    aria-label="截止日期"
                    min={form.start_date || undefined}
                    onValueChange={(value) => updateForm({ end_date: value })}
                    placeholder="请选择截止日期"
                    value={form.end_date}
                  />
                </Field.Root>
              </FormGrid>
            </FormSection>

            <FormSection
              className="project-form-section"
              description="记录合同金额、签署信息和约定付款方式。"
              title={
                <ProjectFormSectionTitle icon="ri-file-list-3-line" index={2} title="合同信息" />
              }
            >
              <FormGrid columns={2}>
                <Field.Root required>
                  <Field.Label>合同总金额 (¥)</Field.Label>
                  <NumberInput
                    min={0}
                    onValueChange={(value) => updateForm({ total_amount: value })}
                    step={0.01}
                    value={form.total_amount}
                  />
                </Field.Root>

                <Field.Root required>
                  <Field.Label>合同日期</Field.Label>
                  <DatePicker
                    aria-label="合同日期"
                    onValueChange={(value) => updateForm({ contract_date: value })}
                    placeholder="请选择合同日期"
                    value={form.contract_date || ''}
                  />
                </Field.Root>

                <Field.Root>
                  <Field.Label>合同编号</Field.Label>
                  <Input
                    autoCapitalize="off"
                    autoComplete="off"
                    autoCorrect="off"
                    onChange={(event) => updateForm({ contract_number: event.currentTarget.value })}
                    placeholder="选择合同日期后自动生成"
                    spellCheck={false}
                    type="text"
                    value={form.contract_number || ''}
                  />
                </Field.Root>

                <Field.Root required>
                  <Field.Label>付款模式</Field.Label>
                  <Select
                    aria-label="付款模式"
                    onValueChange={(value) => {
                      updateForm({ payment_method: value })
                      ensurePaymentItems(value)
                    }}
                    options={paymentMethodOptions}
                    value={form.payment_method}
                  />
                </Field.Root>
              </FormGrid>
            </FormSection>

            <PaymentPlanEditor
              className="project-form-section"
              description="设置每笔应收金额与计划到账日期。"
              installment={isInstallment}
              items={paymentItems}
              onItemsChange={setPaymentItems}
              stageOptions={isInstallment ? installmentStageOptions : oneTimeStageOptions}
              title={
                <ProjectFormSectionTitle icon="ri-secure-payment-line" index={3} title="收款计划" />
              }
            />

            <FormSection
              className="project-form-section"
              description="补充团队需要了解的交付背景。"
              title={
                <ProjectFormSectionTitle icon="ri-sticky-note-line" index={4} title="补充说明" />
              }
            >
              <Field.Root>
                <Field.Label>项目描述</Field.Label>
                <TextArea
                  onChange={(event) => updateForm({ description: event.currentTarget.value })}
                  placeholder="请输入项目描述（选填）"
                  rows={4}
                  value={form.description || ''}
                />
              </Field.Root>
            </FormSection>

            <div className="project-form-actions-shell">
              <FormActions>
                <Button onClick={() => navigate(-1)} type="button" variant="ghost">
                  取消
                </Button>
                <Button pending={saving} type="submit">
                  {saving ? '保存中...' : '确认保存'}
                </Button>
              </FormActions>
            </div>
          </form>
        </Card.Root>

        <aside aria-label="项目草稿摘要" className="project-form-aside">
          <Card.Root className="project-draft-card" padding="lg" variant="secondary">
            <div className="project-draft-card__heading">
              <div>
                <span className="project-draft-card__eyebrow">PROJECT DRAFT</span>
                <h2>{form.name.trim() || '未命名项目'}</h2>
                <p>{form.company.trim() || '客户待填写'}</p>
              </div>
              <Surface
                className="project-draft-card__icon"
                padding="none"
                radius="control"
                tone="accent"
                variant="inset"
              >
                <i aria-hidden="true" className="ri-folder-chart-line" />
              </Surface>
            </div>

            <div className="project-draft-progress">
              <div>
                <span>档案完整度</span>
                <strong>{completion}%</strong>
              </div>
              <ProgressBar
                label="项目档案完整度"
                motion="reveal"
                size="sm"
                value={completion}
                valueLabel={`${completion}%`}
              />
            </div>

            <dl className="project-draft-meta">
              <div>
                <dt>项目状态</dt>
                <dd>
                  <ProjectStatusChip status={form.status || 'active'} />
                </dd>
              </div>
              <div>
                <dt>项目类型</dt>
                <dd>{getOptionLabel(projectTypeOptions, form.type)}</dd>
              </div>
              <div>
                <dt>合同总额</dt>
                <dd>{formatCurrency(form.total_amount)}</dd>
              </div>
              <div>
                <dt>付款模式</dt>
                <dd>{form.payment_method || '待填写'}</dd>
              </div>
              <div>
                <dt>收款节点</dt>
                <dd>{paymentItems.length} 笔</dd>
              </div>
            </dl>

            <div className="project-plan-check" data-state={planState}>
              <Surface padding="none" radius="control" tone={planState} variant="inset">
                <i
                  aria-hidden="true"
                  className={planAligned ? 'ri-check-line' : 'ri-scales-3-line'}
                />
              </Surface>
              <div>
                <span>计划金额</span>
                <strong>{formatCurrency(plannedAmount)}</strong>
                <small>
                  {!form.total_amount
                    ? '填写合同金额后自动核对'
                    : planAligned
                      ? '与合同金额一致'
                      : planDifference > 0
                        ? `还有 ${formatCurrency(planDifference)} 待分配`
                        : `已超出 ${formatCurrency(Math.abs(planDifference))}`}
                </small>
              </div>
            </div>
          </Card.Root>

          <p className="project-form-aside__note">
            <i aria-hidden="true" className="ri-shield-check-line" />
            保存后将同步生成项目台账与收款跟踪记录
          </p>
        </aside>
      </div>
    </div>
  )
}
