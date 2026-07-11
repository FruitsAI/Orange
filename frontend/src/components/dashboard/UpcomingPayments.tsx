import { useNavigate } from 'react-router-dom'
import GlassCard from '@/components/common/GlassCard'
import type { PaymentDisplayItem } from '@/views/dashboard/dashboardModel'

export type { PaymentDisplayItem } from '@/views/dashboard/dashboardModel'

interface UpcomingPaymentsProps {
  payments: PaymentDisplayItem[]
}

const statusColorMap: Record<string, string> = {
  danger: 'var(--color-danger)',
  pending: 'var(--text-secondary)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
}

const statusBgMap: Record<string, string> = {
  danger: 'rgba(255, 69, 58, 0.05)',
  pending: 'rgba(255, 255, 255, 0.05)',
  success: 'rgba(50, 215, 75, 0.05)',
  warning: 'rgba(255, 214, 10, 0.05)',
}

export default function UpcomingPayments({ payments }: UpcomingPaymentsProps) {
  const navigate = useNavigate()

  return (
    <GlassCard>
      <div className="glass-card-header">
        <h3 className="glass-card-title">即将到期收款</h3>
        <span className="status-badge status-badge--overdue">{payments.length}笔待收</span>
      </div>

      <div className="flex flex-col gap-md">
        {payments.length === 0 ? (
          <div className="text-center text-secondary py-4">暂无即将到期款项</div>
        ) : (
          payments.map((item) => {
            const color = statusColorMap[item.status] || statusColorMap.pending
            return (
              <div
                className="flex items-center justify-between p-md cursor-pointer hover:opacity-80 transition-opacity"
                key={item.id}
                onClick={() => navigate(`/projects/${item.project_id}`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ')
                    navigate(`/projects/${item.project_id}`)
                }}
                role="button"
                style={{
                  background: statusBgMap[item.status] || statusBgMap.pending,
                  borderLeft: `3px solid ${color}`,
                  borderRadius: 'var(--radius-md)',
                }}
                tabIndex={0}
              >
                <div>
                  <div className="font-semibold">{item.project_name}</div>
                  <div className="text-sm text-secondary mt-sm">{item.client_name}</div>
                  <div className="text-sm mt-sm" style={{ color }}>
                    {item.days_left < 0
                      ? `已逾期${Math.abs(item.days_left)}天`
                      : item.days_left === 0
                        ? '今天到期'
                        : `${item.days_left}天后到期`}
                  </div>
                </div>
                <div className="text-xl font-bold">¥{item.amount.toLocaleString()}</div>
              </div>
            )
          })
        )}
      </div>
    </GlassCard>
  )
}
