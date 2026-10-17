import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { paymentApi, projectApi, type PaymentRequest, type Project } from '@/api/project'
import { PaymentPlanEditor } from '@/components/project/PaymentPlanEditor'
import { createPaymentPlanItem, type PaymentPlanItem } from '@/components/project/paymentPlan'
import { Button, Card, Field, FormActions, IconButton, PageHeader, Select } from '@/design-system'
import { useToastStore } from '@/composables/useToast'
import '@/styles/project-domain.css'

const normalizePaymentItems = (items: PaymentPlanItem[], installment: boolean) => {
  if (installment) {
    return items.map((item) => (item.stage === 'all' ? { ...item, stage: 'deposit' } : item))
  }
  const first = items[0] || createPaymentPlanItem()
  return [{ ...first, stage: 'all' }]
}

export default function PaymentCreateView() {
  const params = useParams()
  const navigate = useNavigate()
  const toastError = useToastStore((state) => state.error)
  const toastSuccess = useToastStore((state) => state.success)
  const routeProjectId = Number(params.id) || 0
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState(routeProjectId)
  const [paymentItems, setPaymentItems] = useState<PaymentPlanItem[]>([createPaymentPlanItem()])
  const [saving, setSaving] = useState(false)

  const currentProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId),
    [projects, selectedProjectId],
  )
  const isInstallment = currentProject?.payment_method === '分期付款'
  const projectOptions = useMemo(
    () => projects.map((project) => ({ label: project.name, value: String(project.id) })),
    [projects],
  )

  const loadProjects = useCallback(async () => {
    try {
      const response = await projectApi.list({ page: 1, page_size: 100 })
      const list = response.data.data.list
      const nextProjectId = routeProjectId || list[0]?.id || 0
      const nextProject = list.find((project) => project.id === nextProjectId)
      setProjects(list)
      setSelectedProjectId(nextProjectId)
      setPaymentItems((current) =>
        normalizePaymentItems(current, nextProject?.payment_method === '分期付款'),
      )
    } catch {
      toastError('获取项目列表失败')
    }
  }, [routeProjectId, toastError])

  useEffect(() => {
    const timer = window.setTimeout(loadProjects, 0)
    return () => window.clearTimeout(timer)
  }, [loadProjects])

  const selectProject = (value: string) => {
    const nextProjectId = Number(value)
    const nextProject = projects.find((project) => project.id === nextProjectId)
    setSelectedProjectId(nextProjectId)
    setPaymentItems((current) =>
      normalizePaymentItems(current, nextProject?.payment_method === '分期付款'),
    )
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedProjectId) {
      toastError('请选择项目')
      return
    }
    if (paymentItems.length === 0 || paymentItems.some((item) => !item.amount || !item.planDate)) {
      toastError('请完整填写收款金额和收款日期')
      return
    }

    setSaving(true)
    try {
      const requests = paymentItems.map(
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
      navigate(`/projects/${selectedProjectId}`)
    } catch (error) {
      toastError(error instanceof Error ? error.message : '创建收款失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="payment-create-view project-form-page">
      <PageHeader
        actions={
          routeProjectId ? null : (
            <Field.Root className="payment-project-selector" required>
              <Field.Label>所属项目</Field.Label>
              <Select
                aria-label="选择项目"
                onValueChange={selectProject}
                options={projectOptions}
                placeholder="请选择项目"
                value={selectedProjectId ? String(selectedProjectId) : undefined}
              />
            </Field.Root>
          )
        }
        description={
          currentProject
            ? `为「${currentProject.name}」规划本次收款节点。`
            : '选择项目后添加收款节点。'
        }
        leading={
          <IconButton label="返回上一页" onClick={() => navigate(-1)} variant="ghost">
            <i aria-hidden="true" className="ri-arrow-left-line" />
          </IconButton>
        }
        title="创建收款计划"
      />

      <Card.Root className="project-form-card" padding="lg">
        <form className="payment-form" onSubmit={handleSubmit}>
          <PaymentPlanEditor
            installment={isInstallment}
            items={paymentItems}
            onItemsChange={setPaymentItems}
          />

          <FormActions>
            <Button onClick={() => navigate(-1)} type="button" variant="ghost">
              取消
            </Button>
            <Button disabled={!selectedProjectId} pending={saving} type="submit">
              {saving ? '保存中...' : '确认保存'}
            </Button>
          </FormActions>
        </form>
      </Card.Root>
    </div>
  )
}
