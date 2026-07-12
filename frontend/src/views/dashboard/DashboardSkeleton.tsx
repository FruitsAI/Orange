import GlassCard from '@/components/common/GlassCard'

function SkeletonCard({ height }: { height: number }) {
  return (
    <GlassCard aria-hidden="true">
      <div className="skeleton" style={{ height }} />
    </GlassCard>
  )
}

function SkeletonSurface({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`dashboard-skeleton__surface ${className}`.trim()}>
      <div className="skeleton dashboard-skeleton__shimmer" />
    </div>
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
    <div className="ember-dashboard__metrics">
      {Array.from({ length: 3 }, (_, index) => (
        <SkeletonSurface className="dashboard-skeleton__metric" key={index} />
      ))}
    </div>
  )
}

export default function DashboardSkeleton() {
  return (
    <div
      aria-label="正在加载仪表盘"
      aria-live="polite"
      className="dashboard-view ember-dashboard dashboard-skeleton"
      role="status"
    >
      <SkeletonSurface className="dashboard-skeleton__hero" />
      <DashboardStatsSkeleton />
      <div className="dashboard-action-grid">
        <SkeletonSurface className="dashboard-skeleton__chart" />
        <SkeletonSurface className="dashboard-skeleton__queue" />
      </div>
      <div className="dashboard-recent-projects">
        <SkeletonSurface className="dashboard-skeleton__projects" />
      </div>
    </div>
  )
}
