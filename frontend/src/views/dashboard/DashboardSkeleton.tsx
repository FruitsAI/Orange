import GlassCard from '@/components/common/GlassCard'

function SkeletonCard({ height }: { height: number }) {
  return (
    <GlassCard aria-hidden="true">
      <div className="skeleton" style={{ height }} />
    </GlassCard>
  )
}

interface DashboardSectionSkeletonProps {
  label: string
  height: number
}

export function DashboardSectionSkeleton({ label, height }: DashboardSectionSkeletonProps) {
  return (
    <div aria-label={`正在加载${label}`} aria-live="polite" role="status">
      <SkeletonCard height={height} />
    </div>
  )
}

export function DashboardStatsSkeleton() {
  return (
    <div
      aria-label="正在加载统计数据"
      aria-live="polite"
      className="grid grid-cols-4"
      role="status"
      style={{ marginBottom: 'var(--spacing-lg)' }}
    >
      {Array.from({ length: 4 }, (_, index) => (
        <SkeletonCard height={112} key={index} />
      ))}
    </div>
  )
}

export default function DashboardSkeleton() {
  return (
    <div aria-label="正在加载仪表盘" aria-live="polite" className="dashboard-view" role="status">
      <DashboardStatsSkeleton />
      <div className="grid dashboard-charts-row">
        <SkeletonCard height={360} />
        <SkeletonCard height={360} />
      </div>
      <div className="grid dashboard-projects-row">
        <SkeletonCard height={280} />
        <SkeletonCard height={280} />
      </div>
    </div>
  )
}
