import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { projectApi, type Project } from '@/api/project'
import GlassCard from '@/components/common/GlassCard'
import StatusBadge from '@/components/common/StatusBadge'
import { useToastStore } from '@/composables/useToast'

export default function ProjectsView() {
  const navigate = useNavigate()
  const toastError = useToastStore((state) => state.error)
  const [projects, setProjects] = useState<Project[]>([])
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    try {
      const response = await projectApi.list({
        keyword: keyword || undefined,
        page: 1,
        page_size: 50,
        status: status || undefined,
      })
      setProjects(response.data.data.list)
    } catch {
      toastError('获取项目列表失败')
    } finally {
      setLoading(false)
    }
  }, [keyword, status, toastError])

  useEffect(() => {
    const timer = window.setTimeout(fetchProjects, 0)
    return () => window.clearTimeout(timer)
  }, [fetchProjects])

  return (
    <div className="page-stack">
      <div className="page-toolbar">
        <div className="filter-row">
          <input
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索项目或客户"
            type="search"
            value={keyword}
          />
          <select onChange={(event) => setStatus(event.target.value)} value={status}>
            <option value="">全部状态</option>
            <option value="active">进行中</option>
            <option value="completed">已完成</option>
            <option value="pending">即将交付</option>
            <option value="notstarted">未开始</option>
            <option value="archived">已归档</option>
          </select>
        </div>
        <Link className="btn btn-primary" to="/projects/create">
          <i className="ri-add-line" /> 新建项目
        </Link>
      </div>

      <GlassCard>
        <div className="table-scroll-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>项目名称</th>
                <th>客户</th>
                <th>合同编号</th>
                <th>合同金额</th>
                <th>已收款</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="text-center text-secondary py-4" colSpan={7}>
                    正在加载...
                  </td>
                </tr>
              ) : projects.length === 0 ? (
                <tr>
                  <td className="text-center text-secondary py-4" colSpan={7}>
                    暂无项目
                  </td>
                </tr>
              ) : (
                projects.map((project) => (
                  <tr className="project-row" key={project.id} onClick={() => navigate(`/projects/${project.id}`)}>
                    <td className="font-medium">{project.name}</td>
                    <td className="text-secondary">{project.company}</td>
                    <td>{project.contract_number || '-'}</td>
                    <td>¥{project.total_amount.toLocaleString()}</td>
                    <td>¥{project.received_amount.toLocaleString()}</td>
                    <td>
                      <StatusBadge status={project.status} />
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={(event) => {
                          event.stopPropagation()
                          navigate(`/projects/edit/${project.id}`)
                        }}
                        type="button"
                      >
                        编辑
                      </button>
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
