import { useMemo } from 'react'
import type { DashboardStats } from '@/api/dashboard'
import IncomeChart from '@/components/dashboard/IncomeChart'
import ProjectList from '@/components/dashboard/ProjectList'
import QuickActions from '@/components/dashboard/QuickActions'
import StatCard from '@/components/dashboard/StatCard'
import UpcomingPayments from '@/components/dashboard/UpcomingPayments'
import DashboardError from './dashboard/DashboardError'
import DashboardSkeleton from './dashboard/DashboardSkeleton'
import { useDashboardData } from './dashboard/useDashboardData'

const emptyStats: DashboardStats = {
  avg_collection_days: 0,
  avg_collection_days_trend: 0,
  overdue_amount: 0,
  overdue_trend: 0,
  paid_amount: 0,
  paid_trend: 0,
  pending_amount: 0,
  pending_trend: 0,
  total_amount: 0,
  total_trend: 0,
}

export default function DashboardView() {
  const { activePeriod, initialLoading, payments, projects, retry, setPeriod, stats, trend } =
    useDashboardData()
  const statsData = stats.data ?? emptyStats

  const statsDisplay = useMemo(
    () => [
      {
        icon: 'ri-money-dollar-circle-line',
        iconColorClass: 'stat-card-icon--primary',
        label: '总收款金额',
        trend: `${Math.abs(statsData.total_trend).toFixed(2)}%`,
        trendPrefix: '较上期',
        trendUp: statsData.total_trend >= 0,
        value: `¥${statsData.total_amount.toLocaleString()}`,
      },
      {
        icon: 'ri-checkbox-circle-line',
        iconColorClass: 'stat-card-icon--success',
        label: '已结算金额',
        trend: `${Math.abs(statsData.paid_trend).toFixed(2)}%`,
        trendPrefix: '较上期',
        trendUp: statsData.paid_trend >= 0,
        value: `¥${statsData.paid_amount.toLocaleString()}`,
      },
      {
        icon: 'ri-time-line',
        iconColorClass: 'stat-card-icon--warning',
        label: '待结算金额',
        trend: `${Math.abs(statsData.pending_trend).toFixed(2)}%`,
        trendPrefix: '较上期',
        trendUp: statsData.pending_trend >= 0,
        value: `¥${statsData.pending_amount.toLocaleString()}`,
      },
      {
        icon: 'ri-error-warning-line',
        iconColorClass: 'stat-card-icon--danger',
        label: '逾期金额',
        trend: `${Math.abs(statsData.overdue_trend).toFixed(2)}%`,
        trendPrefix: '较上期',
        trendUp: statsData.overdue_trend >= 0,
        value: `¥${statsData.overdue_amount.toLocaleString()}`,
      },
    ],
    [statsData],
  )

  if (initialLoading) return <DashboardSkeleton />

  return (
    <div className="dashboard-view">
      {stats.error && (
        <div style={{ marginBottom: 'var(--spacing-md)' }}>
          <DashboardError
            message="统计数据加载失败"
            onRetry={() => retry('stats')}
            resourceLabel="统计数据"
          />
        </div>
      )}
      {stats.data && (
        <div
          aria-busy={stats.refreshing}
          className="grid grid-cols-4"
          style={{ marginBottom: 'var(--spacing-lg)' }}
        >
          {statsDisplay.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>
      )}

      <div className="grid dashboard-charts-row">
        <div aria-busy={trend.refreshing} className="flex flex-col gap-md">
          {trend.error && (
            <DashboardError
              message="收入趋势加载失败"
              onRetry={() => retry('trend')}
              resourceLabel="收入趋势"
            />
          )}
          {trend.data && (
            <IncomeChart
              labels={trend.data.labels}
              onPeriodChange={setPeriod}
              period={activePeriod}
              values={trend.data.actual_values}
            />
          )}
        </div>
        <QuickActions />
      </div>

      <div className="grid dashboard-projects-row">
        <div aria-busy={projects.refreshing} className="flex flex-col gap-md">
          {projects.error && (
            <DashboardError
              message="近期项目加载失败"
              onRetry={() => retry('projects')}
              resourceLabel="近期项目"
            />
          )}
          {projects.data && <ProjectList projects={projects.data} />}
        </div>
        <div aria-busy={payments.refreshing} className="flex flex-col gap-md">
          {payments.error && (
            <DashboardError
              message="收款计划加载失败"
              onRetry={() => retry('payments')}
              resourceLabel="收款计划"
            />
          )}
          {payments.data && <UpcomingPayments payments={payments.data.slice(0, 3)} />}
        </div>
      </div>
    </div>
  )
}
