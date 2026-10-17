import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import { paymentApi } from '@/api/project'
import ActionQueue from '@/components/dashboard/ActionQueue'
import FinancialHero, { type FinancialHeroProps } from '@/components/dashboard/FinancialHero'
import IncomeChart from '@/components/dashboard/IncomeChart'
import ProjectList from '@/components/dashboard/ProjectList'
import { formatCurrency } from '@/utils/format'
import DashboardError from './dashboard/DashboardError'
import DashboardSkeleton, { DashboardSectionSkeleton } from './dashboard/DashboardSkeleton'
import {
  findNearestUpcomingPayment,
  getPaymentDueLabel,
  normalizeSeries,
  sumIncomeValues,
  toPaymentDisplay,
  type PaymentDisplayItem,
} from './dashboard/dashboardModel'
import { useDashboardData } from './dashboard/useDashboardData'

export default function DashboardView() {
  const [overduePayments, setOverduePayments] = useState<PaymentDisplayItem[] | null>(null)
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

  useEffect(() => {
    let active = true
    void paymentApi.overdue().then(
      (response) => {
        if (active) setOverduePayments(response.data.data.map((item) => toPaymentDisplay(item)))
      },
      () => {
        if (active) setOverduePayments(null)
      },
    )
    return () => {
      active = false
    }
  }, [])

  const queuePayments = [...(overduePayments || []), ...(payments.data || [])]
  const nearestPayment = findNearestUpcomingPayment(payments.data)
  const expectedValues = trend.data
    ? normalizeSeries(trend.data.labels, trend.data.expected_values)
    : []
  const actualValues = trend.data
    ? normalizeSeries(trend.data.labels, trend.data.actual_values)
    : []
  const expected: FinancialHeroProps['expected'] = trend.data
    ? {
        amountText: formatCurrency(sumIncomeValues(expectedValues)),
        status: 'data',
        supportingText: `同期已回款 ${formatCurrency(sumIncomeValues(actualValues))}`,
      }
    : trend.loading
      ? { status: 'loading' }
      : { status: 'error' }
  const overdue: FinancialHeroProps['overdue'] = stats.data
    ? { amountText: formatCurrency(stats.data.overdue_amount), status: 'data' }
    : stats.loading
      ? { status: 'loading' }
      : { status: 'error' }
  const paid: FinancialHeroProps['paid'] = stats.data
    ? { amountText: formatCurrency(stats.data.paid_amount), status: 'data' }
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
  if (initialLoading) return <DashboardSkeleton />

  return (
    <div className="ember-dashboard" data-motion-scope="dashboard">
      <header className="dashboard-page-heading">
        <div>
          <span className="dashboard-page-heading__eyebrow">Orange · 工作台</span>
          <h1>今日回款概览</h1>
          <p>{dayjs().format('M月D日')} · 先处理风险，再安排下一笔收款</p>
        </div>
        <p className="dashboard-page-heading__aside">做好每一笔收款，让项目更健康。</p>
      </header>
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
          stats.data && stats.data.overdue_amount > 0
            ? { label: '处理逾期', to: '/calendar?view=overdue' }
            : nearestPayment
              ? {
                  label: '处理待收款',
                  to: `/projects/${nearestPayment.project_id}?tab=payments&payment=${nearestPayment.id}`,
                }
              : { label: '查看项目', to: '/projects' }
        }
        expected={expected}
        overdue={overdue}
        overdueCount={overduePayments?.length}
        paid={paid}
        payment={payment}
        periodLabel={periodLabel}
      />

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
          aria-busy={payments.loading || payments.refreshing}
          aria-label="待处理收款"
          className="dashboard-action-grid__queue flex flex-col gap-md"
          data-motion="entrance"
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
          {(payments.data || (overduePayments?.length ?? 0) > 0) && (
            <ActionQueue overdueAmount={stats.data?.overdue_amount ?? 0} payments={queuePayments} />
          )}
        </section>
        <section
          aria-busy={trend.loading || trend.refreshing}
          aria-label="现金流趋势"
          className="dashboard-action-grid__chart flex flex-col gap-md"
          data-motion="entrance"
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
              actualValues={actualValues}
              expectedValues={expectedValues}
              labels={trend.data.labels}
              onPeriodChange={setPeriod}
              period={activePeriod}
            />
          )}
        </section>
      </div>

      <section
        aria-busy={projects.loading || projects.refreshing}
        aria-label="近期项目"
        className="dashboard-recent-projects flex flex-col gap-md"
        data-motion="entrance"
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
