import { Card, Chip, Surface, type SurfaceTone } from '@/design-system'

interface StatCardProps {
  label: string
  value?: string | number
  icon: string
  trend?: string
  trendPrefix?: string
  trendValue?: string
  trendUp?: boolean
  trendDirection?: 'up' | 'down'
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
  variant,
  suffix,
}: StatCardProps) {
  const displayTrend = trend || trendValue
  const isTrendUp = trendUp ?? trendDirection === 'up'
  const iconTone: SurfaceTone = variant === 'primary' ? 'accent' : (variant ?? 'neutral')

  return (
    <Card.Root className="stat-card" gap="none" variant="tertiary">
      <Surface
        aria-hidden="true"
        className="stat-card-icon"
        padding="none"
        radius="control"
        tone={iconTone}
        variant="inset"
      >
        <i className={icon} />
      </Surface>
      <div className="stat-card-value">
        {value}
        {suffix ? <span className="text-lg ml-1">{suffix}</span> : null}
      </div>
      <div className="stat-card-label">{label}</div>
      {displayTrend ? (
        <Chip className="stat-card-trend" size="sm" tone={isTrendUp ? 'success' : 'danger'}>
          {trendPrefix ? <span className="mr-1 opacity-75">{trendPrefix}</span> : null}
          <i className={isTrendUp ? 'ri-arrow-up-line' : 'ri-arrow-down-line'} /> {displayTrend}
        </Chip>
      ) : null}
    </Card.Root>
  )
}
