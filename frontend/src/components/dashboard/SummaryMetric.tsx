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

  return (
    <article aria-busy={status === 'loading'} className="summary-metric">
      <div aria-hidden="true" className="summary-metric__icon">
        <i className={icon} />
      </div>
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
        <span
          aria-label={trend.accessibleLabel}
          className={`summary-metric__trend summary-metric__trend--${trend.tone}`}
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
        </span>
      )}
    </article>
  )
}
