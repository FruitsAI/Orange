import { FormEvent, useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { paymentApi, projectApi, type PaymentRequest, type Project } from '@/api/project'
import DatePicker from '@/components/common/DatePicker'
import GlassCard from '@/components/common/GlassCard'
import { useToastStore } from '@/composables/useToast'

export default function PaymentCreateView() {
  const params = useParams()
  const navigate = useNavigate()
  const toast = useToastStore()
  const [projects, setProjects] = useState<Project[]>([])
  const [form, setForm] = useState<PaymentRequest>({
    amount: 0,
    method: '',
    percentage: 0,
    plan_date: '',
    project_id: Number(params.id) || 0,
    remark: '',
    stage: '',
    status: 'pending',
  })
  const [saving, setSaving] = useState(false)

  const loadProjects = useCallback(async () => {
    try {
      const response = await projectApi.list({ page: 1, page_size: 100 })
      setProjects(response.data.data.list)
      if (!form.project_id && response.data.data.list[0]) {
        setForm((current) => ({ ...current, project_id: response.data.data.list[0].id }))
      }
    } catch {
      toast.error('获取项目列表失败')
    }
  }, [form.project_id, toast])

  useEffect(() => {
    const timer = window.setTimeout(loadProjects, 0)
    return () => window.clearTimeout(timer)
  }, [loadProjects])

  const updateForm = (patch: Partial<PaymentRequest>) => setForm((current) => ({ ...current, ...patch }))

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    try {
      await paymentApi.create(form)
      toast.success('收款计划已创建')
      navigate(form.project_id ? `/projects/${form.project_id}` : '/projects')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '创建收款失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <GlassCard>
      <form className="form-grid" onSubmit={handleSubmit}>
        <div className="form-field">
          <label>所属项目</label>
          <select
            required
            value={form.project_id}
            onChange={(event) => updateForm({ project_id: Number(event.target.value) })}
          >
            <option value={0}>请选择项目</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label>阶段名称</label>
          <input required value={form.stage} onChange={(event) => updateForm({ stage: event.target.value })} />
        </div>
        <div className="form-field">
          <label>金额</label>
          <input
            min="0"
            required
            type="number"
            value={form.amount}
            onChange={(event) => updateForm({ amount: Number(event.target.value) })}
          />
        </div>
        <div className="form-field">
          <label>占比</label>
          <input
            min="0"
            type="number"
            value={form.percentage}
            onChange={(event) => updateForm({ percentage: Number(event.target.value) })}
          />
        </div>
        <div className="form-field">
          <label>计划日期</label>
          <DatePicker required value={form.plan_date} onChange={(value) => updateForm({ plan_date: value })} />
        </div>
        <div className="form-field">
          <label>收款方式</label>
          <input value={form.method} onChange={(event) => updateForm({ method: event.target.value })} />
        </div>
        <div className="form-field form-field-wide">
          <label>备注</label>
          <textarea value={form.remark} onChange={(event) => updateForm({ remark: event.target.value })} />
        </div>
        <div className="form-actions">
          <button className="btn btn-ghost" onClick={() => navigate(-1)} type="button">
            取消
          </button>
          <button className="btn btn-primary" disabled={saving} type="submit">
            {saving ? '创建中...' : '创建收款'}
          </button>
        </div>
      </form>
    </GlassCard>
  )
}
