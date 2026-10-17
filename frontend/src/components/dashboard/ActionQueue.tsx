import EmberPanel from '@/components/common/EmberPanel'
import { DataList, EmptyState, RouterButton, SectionHeader } from '@/design-system'
import { formatCurrency } from '@/utils/format'
import type { PaymentDisplayItem } from '@/views/dashboard/dashboardModel'

interface ActionQueueProps {
  payments: PaymentDisplayItem[]
  limit?: number
  overdueAmount?: number
}

function dueLabel(daysLeft: number) {
  if (daysLeft < 0) return `逾期${Math.abs(daysLeft)}天`
  if (daysLeft === 0) return '今日到期'
  return `${daysLeft}天后`
}

export default function ActionQueue({ payments, limit = 5, overdueAmount = 0 }: ActionQueueProps) {
  const visiblePayments = [...payments]
    .sort((left, right) => left.days_left - right.days_left)
    .slice(0, limit)

  return (
    <EmberPanel>
      <SectionHeader
        actions={
          payments.length > 0 ? (
            <RouterButton
              size="sm"
              to={overdueAmount > 0 ? '/calendar?view=overdue' : '/calendar'}
              variant="ghost"
            >
              查看全部
            </RouterButton>
          ) : undefined
        }
        density="compact"
        description="按到期时间排序，优先处理逾期款项"
        headingLevel={2}
        title="待处理收款"
      />

      {visiblePayments.length === 0 ? (
        <EmptyState
          action={
            <RouterButton
              size="sm"
              to={overdueAmount > 0 ? '/calendar?view=overdue' : '/calendar'}
              variant="secondary"
            >
              {overdueAmount > 0 ? '处理逾期款项' : '查看收款日历'}
            </RouterButton>
          }
          description={
            overdueAmount > 0
              ? `仍有 ${formatCurrency(overdueAmount)} 逾期待收，请先跟进。`
              : '可以前往收款日历查看更远日期的计划。'
          }
          icon={<i className="ri-checkbox-circle-line" />}
          size="lg"
          title={overdueAmount > 0 ? '逾期款项需要跟进' : '未来七天暂无待处理收款'}
        />
      ) : (
        <DataList.Root as="ol">
          {visiblePayments.map((item) => (
            <DataList.Item key={item.id}>
              <DataList.Link
                density="comfortable"
                icon={<i className="ri-arrow-right-s-line" />}
                markerTone={
                  item.days_left < 0 ? 'danger' : item.days_left === 0 ? 'accent' : 'neutral'
                }
                to={`/projects/${item.project_id}?tab=payments&payment=${item.id}`}
              >
                <DataList.Identity>
                  <DataList.Primary>{item.project_name}</DataList.Primary>
                  <DataList.Secondary>{item.client_name}</DataList.Secondary>
                </DataList.Identity>
                <DataList.Meta align="end" numeric>
                  <DataList.Primary>{formatCurrency(item.amount)}</DataList.Primary>
                  <DataList.Secondary tone={item.days_left < 0 ? 'danger' : 'neutral'}>
                    {dueLabel(item.days_left)}
                  </DataList.Secondary>
                </DataList.Meta>
              </DataList.Link>
            </DataList.Item>
          ))}
        </DataList.Root>
      )}
    </EmberPanel>
  )
}
