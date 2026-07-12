import ActionQueue from '@/components/dashboard/ActionQueue'
import FinancialHero, { type FinancialHeroProps } from '@/components/dashboard/FinancialHero'
import IncomeChart from '@/components/dashboard/IncomeChart'
import ProjectList from '@/components/dashboard/ProjectList'
import SummaryMetric, { type SummaryMetricProps } from '@/components/dashboard/SummaryMetric'
import { formatCurrency } from '@/utils/format'
import DashboardError from './dashboard/DashboardError'
import DashboardSkeleton, { DashboardSectionSkeleton } from './dashboard/DashboardSkeleton'
import {
  findNearestUpcomingPayment,
  getPaymentDueLabel,
  sumIncomeValues,
  toMetricTrend,
} from './dashboard/dashboardModel'
import { useDashboardData } from './dashboard/useDashboardData'

export default function DashboardView() {
  const {
    activePeriod,
    initialLoading,
    payments,
    periodLabel,
    projects,
    retry,
    setPeriod,
    stats,
    trend,
  } = useDashboardData()
  const nearestPayment = findNearestUpcomingPayment(payments.data)
  const expected: FinancialHeroProps['expected'] = trend.data
    ? {
        amountText: formatCurrency(sumIncomeValues(trend.data.expected_values)),
        status: 'data',
        supportingText: `同期已回款 ${formatCurrency(sumIncomeValues(trend.data.actual_values))}`,
      }
    : trend.loading
      ? { status: 'loading' }
      : { status: 'error' }
  const overdue: FinancialHeroProps['overdue'] = stats.data
    ? { amountText: formatCurrency(stats.data.overdue_amount), status: 'data' }
    : stats.loading
      ? { status: 'loading' }
      : { status: 'error' }
  const payment: FinancialHeroProps['payment'] = nearestPayment
    ? {
        detailText: `${nearestPayment.project_name} · ${formatCurrency(nearestPayment.amount)}`,
        dueLabel: getPaymentDueLabel(nearestPayment.days_left),
        status: 'data',
      }
    : payments.data
      ? { status: 'empty' }
      : payments.loading
        ? { status: 'loading' }
        : { status: 'error' }
  const summaryMetrics: SummaryMetricProps[] = stats.data
    ? [
        {
          icon: 'ri-checkbox-circle-line',
          label: '已结算',
          status: 'data',
          trend: toMetricTrend(stats.data.paid_trend, true),
          value: formatCurrency(stats.data.paid_amount),
        },
        {
          icon: 'ri-time-line',
          label: '待结算',
          status: 'data',
          trend: toMetricTrend(stats.data.pending_trend, false),
          value: formatCurrency(stats.data.pending_amount),
        },
        {
          icon: 'ri-timer-line',
          label: '平均回款',
          status: 'data',
          trend: toMetricTrend(stats.data.avg_collection_days_trend, false),
          value: `${stats.data.avg_collection_days} 天`,
        },
      ]
    : [
        {
          icon: 'ri-checkbox-circle-line',
          label: '已结算',
          status: stats.loading ? 'loading' : 'error',
        },
        { icon: 'ri-time-line', label: '待结算', status: stats.loading ? 'loading' : 'error' },
        { icon: 'ri-timer-line', label: '平均回款', status: stats.loading ? 'loading' : 'error' },
      ]

  if (initialLoading) return <DashboardSkeleton />

  return (
    <div className="dashboard-view ember-dashboard">
      <FinancialHero
        busy={
          stats.loading ||
          stats.refreshing ||
          trend.loading ||
          trend.refreshing ||
          payments.loading ||
          payments.refreshing
        }
        cta={
          nearestPayment
            ? {
                label: '处理待收款',
                to: `/projects/${nearestPayment.project_id}?tab=payments&payment=${nearestPayment.id}`,
              }
            : { label: '查看项目', to: '/projects' }
        }
        expected={expected}
        overdue={overdue}
        payment={payment}
        periodLabel={periodLabel}
      />

      <div aria-busy={stats.loading || stats.refreshing} className="ember-dashboard__metrics">
        {summaryMetrics.map((metric) => (
          <SummaryMetric key={metric.label} {...metric} />
        ))}
      </div>

      {stats.error && (
        <div className="ember-dashboard__error">
          <DashboardError
            message="统计数据加载失败"
            onRetry={() => retry('stats')}
            resourceLabel="统计数据"
          />
        </div>
      )}

      <div className="dashboard-action-grid">
        <section
          aria-busy={trend.loading || trend.refreshing}
          aria-label="现金流趋势"
          className="dashboard-action-grid__chart flex flex-col gap-md"
        >
          {trend.error && (
            <DashboardError
              message="收入趋势加载失败"
              onRetry={() => retry('trend')}
              resourceLabel="收入趋势"
            />
          )}
          {trend.loading && !trend.data && (
            <DashboardSectionSkeleton height={360} label="收入趋势" />
          )}
          {trend.data && (
            <IncomeChart
              actualValues={trend.data.actual_values}
              expectedValues={trend.data.expected_values}
              labels={trend.data.labels}
              onPeriodChange={setPeriod}
              period={activePeriod}
            />
          )}
        </section>
        <section
          aria-busy={payments.loading || payments.refreshing}
          aria-label="待处理收款"
          className="dashboard-action-grid__queue flex flex-col gap-md"
        >
          {payments.error && (
            <DashboardError
              message="收款计划加载失败"
              onRetry={() => retry('payments')}
              resourceLabel="收款计划"
            />
          )}
          {payments.loading && !payments.data && (
            <DashboardSectionSkeleton height={360} label="收款计划" />
          )}
          {payments.data && <ActionQueue payments={payments.data} />}
        </section>
      </div>

      <section
        aria-busy={projects.loading || projects.refreshing}
        aria-label="近期项目"
        className="dashboard-recent-projects flex flex-col gap-md"
      >
        {projects.error && (
          <DashboardError
            message="近期项目加载失败"
            onRetry={() => retry('projects')}
            resourceLabel="近期项目"
          />
        )}
        {projects.loading && !projects.data && (
          <DashboardSectionSkeleton height={280} label="近期项目" />
        )}
        {projects.data && <ProjectList projects={projects.data} />}
      </section>
    </div>
  )
}
