export interface SummaryMetricProps {
  icon: string
  label: string
  trend?: {
    direction: 'down' | 'up'
    label: string
  }
  value: string
}

export default function SummaryMetric({ icon, label, trend, value }: SummaryMetricProps) {
  return (
    <article className="summary-metric">
      <div aria-hidden="true" className="summary-metric__icon">
        <i className={icon} />
      </div>
      <div className="summary-metric__content">
        <span className="summary-metric__label">{label}</span>
        <strong className="summary-metric__value">{value}</strong>
      </div>
      {trend && (
        <span className={`summary-metric__trend summary-metric__trend--${trend.direction}`}>
          <i
            aria-hidden="true"
            className={trend.direction === 'up' ? 'ri-arrow-up-line' : 'ri-arrow-down-line'}
          />
          {trend.label}
        </span>
      )}
    </article>
  )
}
