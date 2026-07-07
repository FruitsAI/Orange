import { useCallback, useEffect, useMemo, useState } from 'react'
import { dashboardApi, type DashboardStats } from '@/api/dashboard'
import GlassCard from '@/components/common/GlassCard'
import StatCard from '@/components/dashboard/StatCard'
import { useToastStore } from '@/composables/useToast'

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

export default function AnalyticsView() {
  const toastError = useToastStore((state) => state.error)
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month')
  const [stats, setStats] = useState<DashboardStats>(emptyStats)

  const loadStats = useCallback(async () => {
    try {
      const response = await dashboardApi.getStats(period)
      setStats(response.data.data)
    } catch {
      toastError('获取分析数据失败')
    }
  }, [period, toastError])

  useEffect(() => {
    const timer = window.setTimeout(loadStats, 0)
    return () => window.clearTimeout(timer)
  }, [loadStats])

  const collectionRate = useMemo(() => {
    if (!stats.total_amount) return 0
    return Math.round((stats.paid_amount / stats.total_amount) * 100)
  }, [stats])

  return (
    <div className="page-stack">
      <div className="page-toolbar">
        <select onChange={(event) => setPeriod(event.target.value as typeof period)} value={period}>
          <option value="week">本周</option>
          <option value="month">本月</option>
          <option value="quarter">本季度</option>
          <option value="year">本年</option>
        </select>
      </div>
      <div className="grid grid-cols-4 dashboard-stats-grid">
        <StatCard icon="ri-bar-chart-2-line" label="总合同金额" value={`¥${stats.total_amount.toLocaleString()}`} />
        <StatCard icon="ri-wallet-3-line" label="已收款" value={`¥${stats.paid_amount.toLocaleString()}`} />
        <StatCard icon="ri-hourglass-2-line" label="待收款" value={`¥${stats.pending_amount.toLocaleString()}`} />
        <StatCard icon="ri-percent-line" label="回款率" suffix="%" value={collectionRate} />
      </div>
      <GlassCard>
        <div className="analytics-summary">
          <div>
            <span className="text-secondary">逾期金额</span>
            <strong>¥{stats.overdue_amount.toLocaleString()}</strong>
          </div>
          <div>
            <span className="text-secondary">平均回款周期</span>
            <strong>{stats.avg_collection_days.toFixed(1)} 天</strong>
          </div>
          <div>
            <span className="text-secondary">回款周期变化</span>
            <strong>{stats.avg_collection_days_trend.toFixed(2)}%</strong>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}
