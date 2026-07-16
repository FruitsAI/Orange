import { Card, Chip, Surface, type ChipTone } from '@/design-system'

export interface MetricTrend {
  accessibleLabel: string
  direction: 'down' | 'flat' | 'up'
  label: string
  tone: 'negative' | 'neutral' | 'positive'
}

export type SummaryMetricProps = {
  icon: string
  label: string
  trend?: MetricTrend
} & ({ status: 'error' | 'loading'; value?: never } | { status: 'data'; value: string })

export default function SummaryMetric({ icon, label, status, trend, value }: SummaryMetricProps) {
  const displayValue =
    status === 'loading' ? `${label}加载中` : status === 'error' ? '暂不可用' : value
  const trendTone: ChipTone =
    trend?.tone === 'positive' ? 'success' : trend?.tone === 'negative' ? 'danger' : 'neutral'

  return (
    <Card.Root
      aria-busy={status === 'loading'}
      as="article"
      className="summary-metric"
      data-motion="entrance"
      data-motion-item
      variant="secondary"
    >
      <Surface
        aria-hidden="true"
        className="summary-metric__icon"
        padding="none"
        radius="control"
        tone="accent"
        variant="inset"
      >
        <i className={icon} />
      </Surface>
      <div className="summary-metric__content">
        <span className="summary-metric__label">{label}</span>
        <strong
          className={`summary-metric__value summary-metric__value--${status}`}
          role={status === 'loading' ? 'status' : undefined}
        >
          {displayValue}
        </strong>
      </div>
      {status === 'data' && trend && (
        <Chip
          aria-label={trend.accessibleLabel}
          className="summary-metric__trend"
          size="sm"
          tone={trendTone}
        >
          <i
            aria-hidden="true"
            className={
              trend.direction === 'up'
                ? 'ri-arrow-up-line'
                : trend.direction === 'down'
                  ? 'ri-arrow-down-line'
                  : 'ri-subtract-line'
            }
          />
          {trend.label}
        </Chip>
      )}
    </Card.Root>
  )
}
