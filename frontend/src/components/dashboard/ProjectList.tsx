import { Link, useNavigate } from 'react-router-dom'
import type { Project } from '@/api/project'
import GlassCard from '@/components/common/GlassCard'
import StatusBadge from '@/components/common/StatusBadge'

interface ProjectListProps {
  projects: Project[]
}

const getProgress = (project: Project) => {
  if (!project.total_amount) return 0
  return Math.min(100, Math.round(((project.received_amount || 0) / project.total_amount) * 100))
}

export default function ProjectList({ projects }: ProjectListProps) {
  const navigate = useNavigate()

  return (
    <GlassCard className="project-list-card">
      <div className="glass-card-header">
        <div>
          <h3 className="glass-card-title">近期项目</h3>
          <p className="glass-card-subtitle">进行中的项目</p>
        </div>
        <Link className="btn btn-ghost btn-sm" to="/projects">
          查看全部 <i className="ri-arrow-right-line" />
        </Link>
      </div>

      <div className="table-scroll-container">
        <table className="data-table project-table">
          <thead>
            <tr>
              <th style={{ maxWidth: 200, minWidth: 200, width: 200 }}>项目名称</th>
              <th>客户</th>
              <th>合同金额</th>
              <th>收款进度</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 ? (
              <tr>
                <td className="text-center text-secondary py-4" colSpan={5}>
                  暂无近期项目
                </td>
              </tr>
            ) : (
              projects.map((project) => {
                const progress = getProgress(project)
                return (
                  <tr
                    className="project-row cursor-pointer hover:bg-white/5 transition-colors"
                    key={project.id}
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <td className="font-medium truncate" style={{ maxWidth: 200 }} title={project.name}>
                      {project.name}
                    </td>
                    <td className="text-secondary">{project.company}</td>
                    <td>¥{project.total_amount.toLocaleString()}</td>
                    <td>
                      <div className="flex items-center gap-sm">
                        <div className="progress-bar" style={{ width: 80 }}>
                          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-sm">{progress}%</span>
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={project.status} />
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </GlassCard>
  )
}
