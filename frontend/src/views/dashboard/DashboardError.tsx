interface DashboardErrorProps {
  message: string
  onRetry: () => void
  resourceLabel?: string
}

export default function DashboardError({
  message,
  onRetry,
  resourceLabel = '收款计划',
}: DashboardErrorProps) {
  return (
    <div className="glass-card" role="alert">
      <div className="flex items-center justify-between gap-md">
        <div>
          <div className="font-semibold">{message}</div>
          <div className="text-sm text-secondary mt-sm">重试此区域不会影响其他仪表盘数据。</div>
        </div>
        <button
          aria-label={`重试${resourceLabel}`}
          className="btn btn-secondary btn-sm"
          onClick={onRetry}
          type="button"
        >
          <i aria-hidden="true" className="ri-refresh-line" />
          重试
        </button>
      </div>
    </div>
  )
}
