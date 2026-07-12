import { Link } from 'react-router-dom'
import type { Project } from '@/api/project'
import GlassCard from '@/components/common/GlassCard'
import StatusBadge from '@/components/common/StatusBadge'
import { formatCurrency } from '@/utils/format'

interface ProjectListProps {
  projects: Project[]
}

const getProgress = (project: Project) => {
  if (!Number.isFinite(project.total_amount) || project.total_amount <= 0) return 0
  const progress = ((Number(project.received_amount) || 0) / project.total_amount) * 100
  return Math.max(0, Math.min(100, Math.round(progress)))
}

export default function ProjectList({ projects }: ProjectListProps) {
  const visibleProjects = projects.slice(0, 5)

  return (
    <GlassCard className="project-list-card project-list-card--compact">
      <div className="glass-card-header">
        <div>
          <h3 className="glass-card-title">近期项目</h3>
          <p className="glass-card-subtitle">最近创建的项目</p>
        </div>
        <Link className="btn btn-ghost btn-sm" to="/projects">
          查看全部 <i aria-hidden="true" className="ri-arrow-right-line" />
        </Link>
      </div>

      {visibleProjects.length === 0 ? (
        <div className="project-list__empty">
          <span aria-hidden="true" className="project-list__empty-icon">
            <i className="ri-folder-add-line" />
          </span>
          <strong>还没有近期项目</strong>
          <p>创建第一个项目，开始追踪合同与回款进度。</p>
          <Link className="btn btn-secondary btn-sm" to="/projects/create">
            新建项目
          </Link>
        </div>
      ) : (
        <ul className="project-list__items">
          {visibleProjects.map((project) => {
            const progress = getProgress(project)
            return (
              <li key={project.id}>
                <Link className="project-list__item" to={`/projects/${project.id}`}>
                  <span className="project-list__identity">
                    <strong title={project.name}>{project.name}</strong>
                    <span>{project.company}</span>
                  </span>
                  <span className="project-list__amount">
                    {formatCurrency(project.total_amount)}
                  </span>
                  <span aria-label={`回款进度${progress}%`} className="project-list__progress">
                    <span aria-hidden="true" className="project-list__progress-track">
                      <span style={{ width: `${progress}%` }} />
                    </span>
                    <span>回款 {progress}%</span>
                  </span>
                  <StatusBadge status={project.status} />
                  <i aria-hidden="true" className="ri-arrow-right-s-line project-list__arrow" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </GlassCard>
  )
}
