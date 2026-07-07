type Status =
  | 'active'
  | 'completed'
  | 'pending'
  | 'overdue'
  | 'notstarted'
  | 'archived'
  | string

interface StatusBadgeProps {
  status: Status
  label?: string
  className?: string
}

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: '进行中', className: 'status-badge--active' },
  completed: { label: '已完成', className: 'status-badge--completed' },
  pending: { label: '即将交付', className: 'status-badge--pending' },
  overdue: { label: '已逾期', className: 'status-badge--danger' },
  notstarted: { label: '未开始', className: 'status-badge--overdue' },
  archived: { label: '已归档', className: 'status-badge--overdue' },
  confirmed: { label: '已收款', className: 'status-badge--completed' },
  paid: { label: '已收款', className: 'status-badge--completed' },
}

export default function StatusBadge({ status, label, className = '' }: StatusBadgeProps) {
  const config = statusConfig[status] ?? { label: status, className: 'status-badge--active' }

  return (
    <span className={`status-badge ${config.className} ${className}`.trim()}>
      {label ?? config.label}
    </span>
  )
}
