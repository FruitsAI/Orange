import type { Project } from '@/api/project'
import EmberPanel from '@/components/common/EmberPanel'
import { ProjectStatusChip } from '@/components/project/ProjectStatusChip'
import { DataList, EmptyState, ProgressBar, RouterButton, SectionHeader } from '@/design-system'
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
    <EmberPanel>
      <SectionHeader
        actions={
          <RouterButton size="sm" to="/projects" variant="ghost">
            查看全部 <i aria-hidden="true" className="ri-arrow-right-line" />
          </RouterButton>
        }
        density="compact"
        description="最近创建的项目"
        headingLevel={2}
        title="近期项目"
      />

      {visibleProjects.length === 0 ? (
        <EmptyState
          action={
            <RouterButton size="sm" to="/projects/create" variant="secondary">
              新建项目
            </RouterButton>
          }
          description="创建第一个项目，开始追踪合同与回款进度。"
          icon={<i className="ri-folder-add-line" />}
          size="md"
          title="还没有近期项目"
        />
      ) : (
        <DataList.Root>
          {visibleProjects.map((project) => {
            const progress = getProgress(project)
            return (
              <DataList.Item key={project.id}>
                <DataList.Link
                  identityWidth="md"
                  icon={<i className="ri-arrow-right-s-line" />}
                  to={`/projects/${project.id}`}
                >
                  <DataList.Identity>
                    <DataList.Primary title={project.name}>{project.name}</DataList.Primary>
                    <DataList.Secondary>{project.company}</DataList.Secondary>
                  </DataList.Identity>
                  <DataList.Cell emphasis="strong" hideBelow="sm" numeric width="sm">
                    {formatCurrency(project.total_amount)}
                  </DataList.Cell>
                  <DataList.Cell hideBelow="sm" layout="meter" width="md">
                    <ProgressBar
                      label={`回款进度${progress}%`}
                      motion="reveal"
                      size="sm"
                      value={progress}
                      valueLabel={`${progress}%`}
                    />
                    <DataList.Secondary>回款 {progress}%</DataList.Secondary>
                  </DataList.Cell>
                  <ProjectStatusChip status={project.status} />
                </DataList.Link>
              </DataList.Item>
            )
          })}
        </DataList.Root>
      )}
    </EmberPanel>
  )
}
