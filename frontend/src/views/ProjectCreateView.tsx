import { FormEvent, useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { projectApi, type ProjectRequest } from '@/api/project'
import DatePicker from '@/components/common/DatePicker'
import GlassCard from '@/components/common/GlassCard'
import { useToastStore } from '@/composables/useToast'

const emptyForm: ProjectRequest = {
  company: '',
  contract_date: '',
  contract_number: '',
  description: '',
  end_date: '',
  name: '',
  payment_method: '',
  start_date: '',
  status: 'active',
  total_amount: 0,
  type: '',
}

export default function ProjectCreateView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToastStore()
  const [form, setForm] = useState<ProjectRequest>(emptyForm)
  const [saving, setSaving] = useState(false)
  const isEdit = Boolean(id)

  const loadProject = useCallback(async () => {
    if (!id) return
    try {
      const response = await projectApi.get(Number(id))
      const project = response.data.data
      setForm({
        company: project.company,
        contract_date: project.contract_date || '',
        contract_number: project.contract_number || '',
        description: project.description || '',
        end_date: project.end_date || '',
        name: project.name,
        payment_method: project.payment_method || '',
        start_date: project.start_date || '',
        status: project.status,
        total_amount: project.total_amount,
        type: project.type || '',
      })
    } catch {
      toast.error('获取项目详情失败')
    }
  }, [id, toast])

  useEffect(() => {
    const timer = window.setTimeout(loadProject, 0)
    return () => window.clearTimeout(timer)
  }, [loadProject])

  const updateForm = (patch: Partial<ProjectRequest>) => setForm((current) => ({ ...current, ...patch }))

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    try {
      const response = isEdit && id ? await projectApi.update(Number(id), form) : await projectApi.create(form)
      toast.success(isEdit ? '项目已更新' : '项目已创建')
      navigate(`/projects/${response.data.data.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存项目失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <GlassCard>
      <form className="form-grid" onSubmit={handleSubmit}>
        <div className="form-field">
          <label>项目名称</label>
          <input required value={form.name} onChange={(event) => updateForm({ name: event.target.value })} />
        </div>
        <div className="form-field">
          <label>客户公司</label>
          <input required value={form.company} onChange={(event) => updateForm({ company: event.target.value })} />
        </div>
        <div className="form-field">
          <label>项目类型</label>
          <input value={form.type} onChange={(event) => updateForm({ type: event.target.value })} />
        </div>
        <div className="form-field">
          <label>合同编号</label>
          <input
            value={form.contract_number}
            onChange={(event) => updateForm({ contract_number: event.target.value })}
          />
        </div>
        <div className="form-field">
          <label>合同金额</label>
          <input
            min="0"
            required
            type="number"
            value={form.total_amount}
            onChange={(event) => updateForm({ total_amount: Number(event.target.value) })}
          />
        </div>
        <div className="form-field">
          <label>状态</label>
          <select value={form.status} onChange={(event) => updateForm({ status: event.target.value })}>
            <option value="active">进行中</option>
            <option value="completed">已完成</option>
            <option value="pending">即将交付</option>
            <option value="notstarted">未开始</option>
            <option value="archived">已归档</option>
          </select>
        </div>
        <div className="form-field">
          <label>签约日期</label>
          <DatePicker value={form.contract_date || ''} onChange={(value) => updateForm({ contract_date: value })} />
        </div>
        <div className="form-field">
          <label>开始日期</label>
          <DatePicker value={form.start_date} onChange={(value) => updateForm({ start_date: value })} />
        </div>
        <div className="form-field">
          <label>结束日期</label>
          <DatePicker value={form.end_date} onChange={(value) => updateForm({ end_date: value })} />
        </div>
        <div className="form-field">
          <label>付款方式</label>
          <input
            value={form.payment_method}
            onChange={(event) => updateForm({ payment_method: event.target.value })}
          />
        </div>
        <div className="form-field form-field-wide">
          <label>备注</label>
          <textarea value={form.description} onChange={(event) => updateForm({ description: event.target.value })} />
        </div>
        <div className="form-actions">
          <button className="btn btn-ghost" onClick={() => navigate('/projects')} type="button">
            取消
          </button>
          <button className="btn btn-primary" disabled={saving} type="submit">
            {saving ? '保存中...' : '保存项目'}
          </button>
        </div>
      </form>
    </GlassCard>
  )
}
