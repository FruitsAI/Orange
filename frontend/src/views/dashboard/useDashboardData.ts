import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { dashboardApi, type DashboardStats, type IncomeTrend } from '@/api/dashboard'
import type { Project } from '@/api/project'
import {
  getPeriodLabel,
  toPaymentDisplay,
  type DashboardPeriod,
  type PaymentDisplayItem,
} from './dashboardModel'

export type DashboardResource = 'stats' | 'trend' | 'projects' | 'payments'
export type RetryTarget = DashboardResource | 'all'

export interface DashboardResourceState<T> {
  data: T | null
  loading: boolean
  refreshing: boolean
  error: Error | null
}

const initialResource = <T,>(): DashboardResourceState<T> => ({
  data: null,
  error: null,
  loading: true,
  refreshing: false,
})

const toError = (error: unknown) =>
  error instanceof Error ? error : new Error('仪表盘数据加载失败')

export function useDashboardData() {
  const [stats, setStats] = useState(() => initialResource<DashboardStats>())
  const [trend, setTrend] = useState(() => initialResource<IncomeTrend>())
  const [projects, setProjects] = useState(() => initialResource<Project[]>())
  const [payments, setPayments] = useState(() => initialResource<PaymentDisplayItem[]>())
  const [activePeriod, setActivePeriod] = useState<DashboardPeriod>('month')
  const [initialLoading, setInitialLoading] = useState(true)
  const activePeriodRef = useRef<DashboardPeriod>('month')
  const initialLoadIdRef = useRef(0)
  const mountedRef = useRef(false)
  const requestIds = useRef<Record<DashboardResource, number>>({
    payments: 0,
    projects: 0,
    stats: 0,
    trend: 0,
  })

  const beginRequest = useCallback(<T,>(
    resource: DashboardResource,
    setResource: React.Dispatch<React.SetStateAction<DashboardResourceState<T>>>,
  ) => {
    const requestId = ++requestIds.current[resource]
    setResource((current) => ({
      ...current,
      error: null,
      loading: current.data === null,
      refreshing: current.data !== null,
    }))
    return requestId
  }, [])

  const canCommit = useCallback(
    (resource: DashboardResource, requestId: number) =>
      mountedRef.current && requestIds.current[resource] === requestId,
    [],
  )

  const loadStats = useCallback(async () => {
    const requestId = beginRequest('stats', setStats)
    try {
      const response = await dashboardApi.getStats()
      if (!canCommit('stats', requestId)) return
      setStats({ data: response.data.data, error: null, loading: false, refreshing: false })
    } catch (error) {
      if (!canCommit('stats', requestId)) return
      setStats((current) => ({
        ...current,
        error: toError(error),
        loading: false,
        refreshing: false,
      }))
    }
  }, [beginRequest, canCommit])

  const loadTrend = useCallback(
    async (period: DashboardPeriod) => {
      const requestId = beginRequest('trend', setTrend)
      try {
        const response = await dashboardApi.getIncomeTrend(period)
        if (!canCommit('trend', requestId)) return
        setTrend({ data: response.data.data, error: null, loading: false, refreshing: false })
      } catch (error) {
        if (!canCommit('trend', requestId)) return
        setTrend((current) => ({
          ...current,
          error: toError(error),
          loading: false,
          refreshing: false,
        }))
      }
    },
    [beginRequest, canCommit],
  )

  const loadProjects = useCallback(async () => {
    const requestId = beginRequest('projects', setProjects)
    try {
      const response = await dashboardApi.getRecentProjects()
      if (!canCommit('projects', requestId)) return
      setProjects({ data: response.data.data, error: null, loading: false, refreshing: false })
    } catch (error) {
      if (!canCommit('projects', requestId)) return
      setProjects((current) => ({
        ...current,
        error: toError(error),
        loading: false,
        refreshing: false,
      }))
    }
  }, [beginRequest, canCommit])

  const loadPayments = useCallback(async () => {
    const requestId = beginRequest('payments', setPayments)
    try {
      const response = await dashboardApi.getUpcomingPayments()
      if (!canCommit('payments', requestId)) return
      setPayments({
        data: response.data.data.map((payment) => toPaymentDisplay(payment)),
        error: null,
        loading: false,
        refreshing: false,
      })
    } catch (error) {
      if (!canCommit('payments', requestId)) return
      setPayments((current) => ({
        ...current,
        error: toError(error),
        loading: false,
        refreshing: false,
      }))
    }
  }, [beginRequest, canCommit])

  useEffect(() => {
    const ids = requestIds.current
    const initialLoadId = ++initialLoadIdRef.current
    mountedRef.current = true
    const initialRequests = [
      loadStats(),
      loadTrend(activePeriodRef.current),
      loadProjects(),
      loadPayments(),
    ]
    void Promise.allSettled(initialRequests).then(() => {
      if (mountedRef.current && initialLoadIdRef.current === initialLoadId) {
        setInitialLoading(false)
      }
    })

    return () => {
      mountedRef.current = false
      initialLoadIdRef.current += 1
      ids.stats += 1
      ids.trend += 1
      ids.projects += 1
      ids.payments += 1
    }
  }, [loadPayments, loadProjects, loadStats, loadTrend])

  const setPeriod = useCallback(
    (period: DashboardPeriod) => {
      if (period === activePeriodRef.current) return
      activePeriodRef.current = period
      setActivePeriod(period)
      void loadTrend(period)
    },
    [loadTrend],
  )

  const retry = useCallback(
    (target?: RetryTarget) => {
      if (target === 'all') {
        void loadStats()
        void loadTrend(activePeriodRef.current)
        void loadProjects()
        void loadPayments()
        return
      }

      if (target === 'stats' || (!target && stats.error)) void loadStats()
      if (target === 'trend' || (!target && trend.error)) void loadTrend(activePeriodRef.current)
      if (target === 'projects' || (!target && projects.error)) void loadProjects()
      if (target === 'payments' || (!target && payments.error)) void loadPayments()
    },
    [
      loadPayments,
      loadProjects,
      loadStats,
      loadTrend,
      payments.error,
      projects.error,
      stats.error,
      trend.error,
    ],
  )

  return useMemo(
    () => ({
      activePeriod,
      initialLoading,
      payments,
      periodLabel: getPeriodLabel(activePeriod),
      projects,
      retry,
      setPeriod,
      stats,
      trend,
    }),
    [
      activePeriod,
      initialLoading,
      payments,
      projects,
      retry,
      setPeriod,
      stats,
      trend,
    ],
  )
}
