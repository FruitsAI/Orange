import { Alert, Button } from '@/design-system'

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
    <Alert
      action={
        <Button aria-label={`重试${resourceLabel}`} onClick={onRetry} size="sm" variant="secondary">
          <i aria-hidden="true" className="ri-refresh-line" />
          重试
        </Button>
      }
      icon={<i className="ri-error-warning-line" />}
      title={message}
      tone="danger"
    >
      重试此区域不会影响其他仪表盘数据。
    </Alert>
  )
}
