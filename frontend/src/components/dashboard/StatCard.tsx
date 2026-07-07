import GlassCard from '@/components/common/GlassCard'

interface StatCardProps {
  label: string
  value?: string | number
  icon: string
  trend?: string
  trendPrefix?: string
  trendValue?: string
  trendUp?: boolean
  trendDirection?: 'up' | 'down'
  iconColorClass?: string
  variant?: 'primary' | 'success' | 'warning' | 'danger'
  suffix?: string
}

export default function StatCard({
  label,
  value,
  icon,
  trend,
  trendPrefix,
  trendValue,
  trendUp,
  trendDirection,
  iconColorClass,
  variant,
  suffix,
}: StatCardProps) {
  const displayTrend = trend || trendValue
  const isTrendUp = trendUp ?? trendDirection === 'up'
  const computedIconClass = iconColorClass || (variant ? `stat-card-icon--${variant}` : '')

  return (
    <GlassCard className="stat-card">
      <div className={`stat-card-icon ${computedIconClass}`.trim()}>
        <i className={icon} />
      </div>
      <div className="stat-card-value">
        {value}
        {suffix ? <span className="text-lg ml-1">{suffix}</span> : null}
      </div>
      <div className="stat-card-label">{label}</div>
      {displayTrend ? (
        <div className={`stat-card-trend ${isTrendUp ? 'stat-card-trend--up' : 'stat-card-trend--down'}`}>
          {trendPrefix ? <span className="mr-1 opacity-75">{trendPrefix}</span> : null}
          <i className={isTrendUp ? 'ri-arrow-up-line' : 'ri-arrow-down-line'} /> {displayTrend}
        </div>
      ) : null}
    </GlassCard>
  )
}
