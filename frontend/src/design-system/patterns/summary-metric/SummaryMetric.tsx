import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { Chip, type ChipTone } from '../../components/chip'
import {
  Card,
  Surface,
  type CardTone,
  type CardVariant,
  type SurfaceTone,
} from '../../components/surface'

export interface MetricTrend {
  accessibleLabel: string
  direction: 'down' | 'flat' | 'up'
  label: string
  tone: 'negative' | 'neutral' | 'positive'
}

interface SummaryMetricBaseProps extends Omit<ComponentPropsWithoutRef<'article'>, 'children'> {
  errorValue?: ReactNode
  icon?: ReactNode | string
  iconTone?: SurfaceTone
  label: ReactNode
  layout?: 'compact' | 'stacked'
  loadingValue?: ReactNode
  meta?: ReactNode
  tone?: CardTone
  trend?: MetricTrend
  variant?: CardVariant
}

export type SummaryMetricProps = SummaryMetricBaseProps &
  ({ status: 'error' | 'loading'; value?: never } | { status: 'data'; value: ReactNode })

export function SummaryMetric({
  className,
  errorValue = '暂不可用',
  icon,
  iconTone = 'accent',
  label,
  layout = 'compact',
  loadingValue,
  meta,
  status,
  tone = 'neutral',
  trend,
  value,
  variant = 'secondary',
  ...props
}: SummaryMetricProps) {
  const displayValue =
    status === 'loading'
      ? (loadingValue ?? (typeof label === 'string' ? `${label}加载中` : '加载中'))
      : status === 'error'
        ? errorValue
        : value
  const trendTone: ChipTone =
    trend?.tone === 'positive' ? 'success' : trend?.tone === 'negative' ? 'danger' : 'neutral'
  const iconContent = typeof icon === 'string' ? <i className={icon} /> : icon
  const trailing =
    meta ??
    (status === 'data' && trend ? (
      <Chip aria-label={trend.accessibleLabel} size="sm" tone={trendTone}>
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
    ) : null)

  return (
    <Card.Root
      {...props}
      aria-busy={status === 'loading'}
      as="article"
      className={['ods-summary-metric', className].filter(Boolean).join(' ')}
      data-layout={layout}
      data-motion="entrance"
      data-motion-item
      data-status={status}
      tone={tone}
      variant={variant}
    >
      {iconContent ? (
        <Surface
          aria-hidden="true"
          className="ods-summary-metric__icon"
          padding="none"
          radius="control"
          tone={iconTone}
          variant="inset"
        >
          {iconContent}
        </Surface>
      ) : null}
      <div className="ods-summary-metric__content">
        <span className="ods-summary-metric__label">{label}</span>
        <strong
          className="ods-summary-metric__value"
          role={status === 'loading' ? 'status' : undefined}
        >
          {displayValue}
        </strong>
      </div>
      {trailing ? <div className="ods-summary-metric__meta">{trailing}</div> : null}
    </Card.Root>
  )
}
