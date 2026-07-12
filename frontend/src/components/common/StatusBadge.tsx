type Status = 'active' | 'completed' | 'pending' | 'overdue' | 'notstarted' | 'archived' | string

interface StatusBadgeProps {
  status: Status
  label?: string
  className?: string
}

const statusConfig: Record<string, { label: string; className: string; icon: string }> = {
  active: { label: '进行中', className: 'status-badge--active', icon: 'ri-loader-4-line' },
  completed: {
    label: '已完成',
    className: 'status-badge--completed',
    icon: 'ri-checkbox-circle-line',
  },
  pending: { label: '即将交付', className: 'status-badge--pending', icon: 'ri-time-line' },
  overdue: {
    label: '已逾期',
    className: 'status-badge--overdue',
    icon: 'ri-alarm-warning-line',
  },
  notstarted: {
    label: '未开始',
    className: 'status-badge--notstarted',
    icon: 'ri-circle-line',
  },
  archived: { label: '已归档', className: 'status-badge--archived', icon: 'ri-archive-line' },
  confirmed: {
    label: '已收款',
    className: 'status-badge--completed',
    icon: 'ri-checkbox-circle-line',
  },
  paid: {
    label: '已收款',
    className: 'status-badge--completed',
    icon: 'ri-checkbox-circle-line',
  },
}

export default function StatusBadge({ status, label, className = '' }: StatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status,
    className: 'status-badge--notstarted',
    icon: 'ri-circle-line',
  }

  return (
    <span className={`status-badge ${config.className} ${className}`.trim()}>
      <i aria-hidden="true" className={`status-badge__icon ${config.icon}`} />
      {label ?? config.label}
    </span>
  )
}
