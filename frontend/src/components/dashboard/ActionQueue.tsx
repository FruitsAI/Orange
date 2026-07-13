import { Link } from 'react-router-dom'
import EmberPanel from '@/components/common/EmberPanel'
import EmptyState from '@/components/common/EmptyState'
import PanelHeader from '@/components/common/PanelHeader'
import { formatCurrency } from '@/utils/format'
import type { PaymentDisplayItem } from '@/views/dashboard/dashboardModel'

interface ActionQueueProps {
  payments: PaymentDisplayItem[]
  limit?: number
}

function dueLabel(daysLeft: number) {
  if (daysLeft < 0) return `逾期${Math.abs(daysLeft)}天`
  if (daysLeft === 0) return '今日到期'
  return `${daysLeft}天后`
}

export default function ActionQueue({ payments, limit = 5 }: ActionQueueProps) {
  const visiblePayments = [...payments]
    .sort((left, right) => left.days_left - right.days_left)
    .slice(0, limit)

  return (
    <EmberPanel>
      <PanelHeader
        action={
          payments.length > 0 ? (
            <Link className="btn btn-ghost btn-sm" to="/calendar">
              查看全部
            </Link>
          ) : undefined
        }
        headingLevel={2}
        subtitle="按到期紧迫度排序"
        title="待处理收款"
      />

      {visiblePayments.length === 0 ? (
        <EmptyState
          action={
            <Link className="btn btn-ghost btn-sm" to="/calendar">
              查看收款日历
            </Link>
          }
          description="可以前往收款日历查看更远日期的计划。"
          icon={<i className="ri-checkbox-circle-line" />}
          title="未来七天暂无待处理收款"
        />
      ) : (
        <ol className="action-queue__list">
          {visiblePayments.map((item) => (
            <li key={item.id}>
              <Link
                className={`action-queue__item action-queue__item--${item.days_left < 0 ? 'overdue' : item.days_left === 0 ? 'today' : 'upcoming'}`}
                to={`/projects/${item.project_id}?tab=payments&payment=${item.id}`}
              >
                <span className="action-queue__copy">
                  <strong>{item.project_name}</strong>
                  <span>{item.client_name}</span>
                </span>
                <span className="action-queue__meta">
                  <strong>{formatCurrency(item.amount)}</strong>
                  <span>{dueLabel(item.days_left)}</span>
                </span>
                <i aria-hidden="true" className="ri-arrow-right-s-line action-queue__arrow" />
              </Link>
            </li>
          ))}
        </ol>
      )}
    </EmberPanel>
  )
}
