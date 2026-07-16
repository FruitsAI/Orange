import { Chip, type ChipTone } from '@/design-system'

const projectStatusMeta: Record<string, { icon: string; label: string; tone: ChipTone }> = {
  active: { icon: 'ri-loader-4-line', label: '进行中', tone: 'accent' },
  archived: { icon: 'ri-archive-line', label: '已归档', tone: 'neutral' },
  completed: { icon: 'ri-checkbox-circle-line', label: '已完成', tone: 'success' },
  notstarted: { icon: 'ri-time-line', label: '未开始', tone: 'neutral' },
  overdue: { icon: 'ri-error-warning-line', label: '已逾期', tone: 'danger' },
  pending: { icon: 'ri-timer-line', label: '即将交付', tone: 'warning' },
}

const paymentStatusMeta: Record<string, { label: string; tone: ChipTone }> = {
  confirmed: { label: '已收款', tone: 'success' },
  overdue: { label: '已逾期', tone: 'warning' },
  paid: { label: '已收款', tone: 'success' },
  pending: { label: '待收款', tone: 'neutral' },
}

export function ProjectStatusChip({ status }: { status: string }) {
  const meta = projectStatusMeta[status] ?? {
    icon: 'ri-information-line',
    label: status,
    tone: 'neutral' as const,
  }

  return (
    <Chip size="sm" tone={meta.tone}>
      <i aria-hidden="true" className={meta.icon} />
      {meta.label}
    </Chip>
  )
}

export function PaymentStatusChip({ status }: { status: string }) {
  const meta = paymentStatusMeta[status] ?? { label: status, tone: 'neutral' as const }
  return (
    <Chip size="sm" tone={meta.tone}>
      {meta.label}
    </Chip>
  )
}
