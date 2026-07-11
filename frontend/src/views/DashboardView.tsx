import { useCallback, useEffect, useMemo, useState } from 'react'
import { dashboardApi, type DashboardStats } from '@/api/dashboard'
import type { Payment, Project } from '@/api/project'
import IncomeChart from '@/components/dashboard/IncomeChart'
import ProjectList from '@/components/dashboard/ProjectList'
import QuickActions from '@/components/dashboard/QuickActions'
import StatCard from '@/components/dashboard/StatCard'
import UpcomingPayments, { type PaymentDisplayItem } from '@/components/dashboard/UpcomingPayments'
import { useToastStore } from '@/composables/useToast'

type Period = 'week' | 'month' | 'quarter' | 'year'

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

const toPaymentDisplay = (payment: Payment): PaymentDisplayItem => {
  const due = new Date(payment.plan_date)
  const today = new Date()
  const days = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  return {
    amount: payment.amount,
    client_name: payment.project?.company || '未知客户',
    days_left: Math.max(0, days),
    id: payment.id,
    project_id: payment.project_id,
    project_name: payment.project?.name || '未知项目',
    status: days < 0 ? 'danger' : days < 3 ? 'danger' : days < 7 ? 'warning' : 'success',
  }
}

export default function DashboardView() {
  const toastError = useToastStore((state) => state.error)
  const [statsData, setStatsData] = useState<DashboardStats>(emptyStats)
  const [incomeLabels, setIncomeLabels] = useState<string[]>([])
  const [incomeValues, setIncomeValues] = useState<number[]>([])
  const [recentProjects, setRecentProjects] = useState<Project[]>([])
  const [upcomingPayments, setUpcomingPayments] = useState<PaymentDisplayItem[]>([])
  const [activePeriod, setActivePeriod] = useState<Period>('month')
  const [, setLoading] = useState(true)

  const statsDisplay = useMemo(
    () => [
      {
        icon: 'ri-money-dollar-circle-line',
        iconColorClass: 'stat-card-icon--primary',
        label: '总收款金额',
        trend: `${Math.abs(statsData.total_trend).toFixed(2)}%`,
        trendPrefix: '较上月',
        trendUp: statsData.total_trend >= 0,
        value: `¥${statsData.total_amount.toLocaleString()}`,
      },
      {
        icon: 'ri-checkbox-circle-line',
        iconColorClass: 'stat-card-icon--success',
        label: '已结算金额',
        trend: `${Math.abs(statsData.paid_trend).toFixed(2)}%`,
        trendPrefix: '较上月',
        trendUp: statsData.paid_trend >= 0,
        value: `¥${statsData.paid_amount.toLocaleString()}`,
      },
      {
        icon: 'ri-time-line',
        iconColorClass: 'stat-card-icon--warning',
        label: '待结算金额',
        trend: `${Math.abs(statsData.pending_trend).toFixed(2)}%`,
        trendPrefix: '较上月',
        trendUp: statsData.pending_trend >= 0,
        value: `¥${statsData.pending_amount.toLocaleString()}`,
      },
      {
        icon: 'ri-error-warning-line',
        iconColorClass: 'stat-card-icon--danger',
        label: '逾期金额',
        trend: `${Math.abs(statsData.overdue_trend).toFixed(2)}%`,
        trendPrefix: '较上月',
        trendUp: statsData.overdue_trend >= 0,
        value: `¥${statsData.overdue_amount.toLocaleString()}`,
      },
    ],
    [statsData],
  )

  const fetchDashboardData = useCallback(
    async (period: Period) => {
      setLoading(true)
      try {
        const [statsRes, trendRes, projectRes, paymentRes] = await Promise.all([
          dashboardApi.getStats(),
          dashboardApi.getIncomeTrend(period),
          dashboardApi.getRecentProjects(),
          dashboardApi.getUpcomingPayments(),
        ])

        setStatsData(statsRes.data.data)
        setIncomeLabels(trendRes.data.data.labels)
        setIncomeValues(trendRes.data.data.actual_values)
        setRecentProjects(projectRes.data.data)
        setUpcomingPayments(paymentRes.data.data.map(toPaymentDisplay).slice(0, 3))
      } catch (error) {
        console.error('Failed to fetch dashboard data', error)
        toastError('获取仪表盘数据失败')
      } finally {
        setLoading(false)
      }
    },
    [toastError],
  )

  const handlePeriodChange = async (period: Period) => {
    setActivePeriod(period)
    try {
      const response = await dashboardApi.getIncomeTrend(period)
      setIncomeLabels(response.data.data.labels)
      setIncomeValues(response.data.data.actual_values)
    } catch (error) {
      console.error('Failed to update income trend', error)
      toastError('更新趋势图失败')
    }
  }

  useEffect(() => {
    window.setTimeout(() => fetchDashboardData(activePeriod), 0)
  }, [activePeriod, fetchDashboardData])

  return (
    <div className="dashboard-view">
      <div className="grid grid-cols-4" style={{ marginBottom: 'var(--spacing-lg)' }}>
        {statsDisplay.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid dashboard-charts-row">
        <IncomeChart
          labels={incomeLabels}
          onPeriodChange={handlePeriodChange}
          period={activePeriod}
          values={incomeValues}
        />
        <QuickActions />
      </div>

      <div className="grid dashboard-projects-row">
        <ProjectList projects={recentProjects} />
        <UpcomingPayments payments={upcomingPayments} />
      </div>
    </div>
  )
}
