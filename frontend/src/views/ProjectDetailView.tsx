import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { paymentApi, projectApi, type Payment, type Project } from '@/api/project'
import GlassCard from '@/components/common/GlassCard'
import StatusBadge from '@/components/common/StatusBadge'
import { useToastStore } from '@/composables/useToast'

export default function ProjectDetailView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToastStore()
  const [project, setProject] = useState<Project | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])

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
      toast.error('获取项目详情失败')
    }
  }, [id, toast])

  useEffect(() => {
    const timer = window.setTimeout(loadProject, 0)
    return () => window.clearTimeout(timer)
  }, [loadProject])

  const confirmPayment = async (paymentId: number) => {
    try {
      await paymentApi.confirm(paymentId, { actual_date: new Date().toISOString().slice(0, 10) })
      toast.success('收款已确认')
      await loadProject()
    } catch {
      toast.error('确认收款失败')
    }
  }

  if (!project) {
    return <GlassCard>正在加载项目详情...</GlassCard>
  }

  const progress = project.total_amount
    ? Math.round(((project.received_amount || 0) / project.total_amount) * 100)
    : 0

  return (
    <div className="page-stack">
      <div className="page-toolbar">
        <button className="btn btn-ghost" onClick={() => navigate('/projects')} type="button">
          <i className="ri-arrow-left-line" /> 返回
        </button>
        <div className="flex gap-sm">
          <Link className="btn btn-ghost" to={`/projects/edit/${project.id}`}>
            编辑
          </Link>
          <Link className="btn btn-primary" to={`/projects/${project.id}/payment/create`}>
            添加收款
          </Link>
        </div>
      </div>

      <GlassCard>
        <div className="detail-header">
          <div>
            <h2>{project.name}</h2>
            <p className="text-secondary">{project.company}</p>
          </div>
          <StatusBadge status={project.status} />
        </div>
        <div className="detail-grid">
          <div>
            <span className="text-secondary">合同编号</span>
            <strong>{project.contract_number || '-'}</strong>
          </div>
          <div>
            <span className="text-secondary">合同金额</span>
            <strong>¥{project.total_amount.toLocaleString()}</strong>
          </div>
          <div>
            <span className="text-secondary">已收款</span>
            <strong>¥{project.received_amount.toLocaleString()}</strong>
          </div>
          <div>
            <span className="text-secondary">收款进度</span>
            <strong>{progress}%</strong>
          </div>
        </div>
        {project.description ? <p className="text-secondary mt-lg">{project.description}</p> : null}
      </GlassCard>

      <GlassCard>
        <div className="glass-card-header">
          <h3 className="glass-card-title">收款计划</h3>
        </div>
        <div className="table-scroll-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>阶段</th>
                <th>金额</th>
                <th>计划日期</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td className="text-center text-secondary py-4" colSpan={5}>
                    暂无收款计划
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{payment.stage}</td>
                    <td>¥{payment.amount.toLocaleString()}</td>
                    <td>{payment.plan_date}</td>
                    <td>
                      <StatusBadge status={payment.status} />
                    </td>
                    <td>
                      {payment.status !== 'paid' ? (
                        <button className="btn btn-ghost btn-sm" onClick={() => confirmPayment(payment.id)} type="button">
                          确认收款
                        </button>
                      ) : (
                        payment.actual_date || '-'
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  )
}
