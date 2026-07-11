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
  const [hasAnySettled, setHasAnySettled] = useState(false)
  const activePeriodRef = useRef<DashboardPeriod>('month')
  const requestedTrendPeriodRef = useRef<DashboardPeriod>('month')
  const mountedRef = useRef(false)
  const controllers = useRef<Partial<Record<DashboardResource, AbortController>>>({})
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
    controllers.current[resource]?.abort()
    const controller = new AbortController()
    controllers.current[resource] = controller
    const requestId = ++requestIds.current[resource]
    setResource((current) => ({
      ...current,
      error: null,
      loading: current.data === null,
      refreshing: current.data !== null,
    }))
    return { requestId, signal: controller.signal }
  }, [])

  const canCommit = useCallback(
    (resource: DashboardResource, requestId: number) =>
      mountedRef.current && requestIds.current[resource] === requestId,
    [],
  )

  const loadStats = useCallback(async () => {
    const { requestId, signal } = beginRequest('stats', setStats)
    try {
      const response = await dashboardApi.getStats(undefined, signal)
      if (!canCommit('stats', requestId)) return
      setHasAnySettled(true)
      setStats({ data: response.data.data, error: null, loading: false, refreshing: false })
    } catch (error) {
      if (signal.aborted || !canCommit('stats', requestId)) return
      setHasAnySettled(true)
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
      requestedTrendPeriodRef.current = period
      const { requestId, signal } = beginRequest('trend', setTrend)
      try {
        const response = await dashboardApi.getIncomeTrend(period, signal)
        if (!canCommit('trend', requestId)) return
        setHasAnySettled(true)
        activePeriodRef.current = period
        setActivePeriod(period)
        setTrend({ data: response.data.data, error: null, loading: false, refreshing: false })
      } catch (error) {
        if (signal.aborted || !canCommit('trend', requestId)) return
        setHasAnySettled(true)
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
    const { requestId, signal } = beginRequest('projects', setProjects)
    try {
      const response = await dashboardApi.getRecentProjects(signal)
      if (!canCommit('projects', requestId)) return
      setHasAnySettled(true)
      setProjects({ data: response.data.data, error: null, loading: false, refreshing: false })
    } catch (error) {
      if (signal.aborted || !canCommit('projects', requestId)) return
      setHasAnySettled(true)
      setProjects((current) => ({
        ...current,
        error: toError(error),
        loading: false,
        refreshing: false,
      }))
    }
  }, [beginRequest, canCommit])

  const loadPayments = useCallback(async () => {
    const { requestId, signal } = beginRequest('payments', setPayments)
    try {
      const response = await dashboardApi.getUpcomingPayments(signal)
      if (!canCommit('payments', requestId)) return
      setHasAnySettled(true)
      setPayments({
        data: response.data.data.map((payment) => toPaymentDisplay(payment)),
        error: null,
        loading: false,
        refreshing: false,
      })
    } catch (error) {
      if (signal.aborted || !canCommit('payments', requestId)) return
      setHasAnySettled(true)
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
    const activeControllers = controllers.current
    mountedRef.current = true
    void loadStats()
    void loadTrend(activePeriodRef.current)
    void loadProjects()
    void loadPayments()

    return () => {
      mountedRef.current = false
      Object.values(activeControllers).forEach((controller) => controller?.abort())
      ids.stats += 1
      ids.trend += 1
      ids.projects += 1
      ids.payments += 1
    }
  }, [loadPayments, loadProjects, loadStats, loadTrend])

  const setPeriod = useCallback(
    (period: DashboardPeriod) => {
      if (
        period === activePeriodRef.current &&
        requestedTrendPeriodRef.current === activePeriodRef.current
      ) {
        return Promise.resolve()
      }
      return loadTrend(period)
    },
    [loadTrend],
  )

  const retry = useCallback(
    (target?: RetryTarget) => {
      const requests: Promise<void>[] = []
      if (target === 'all') {
        requests.push(
          loadStats(),
          loadTrend(requestedTrendPeriodRef.current),
          loadProjects(),
          loadPayments(),
        )
      } else {
        if (target === 'stats' || (!target && stats.error)) requests.push(loadStats())
        if (target === 'trend' || (!target && trend.error)) {
          requests.push(loadTrend(requestedTrendPeriodRef.current))
        }
        if (target === 'projects' || (!target && projects.error)) requests.push(loadProjects())
        if (target === 'payments' || (!target && payments.error)) requests.push(loadPayments())
      }
      return Promise.allSettled(requests)
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

  const initialLoading =
    !hasAnySettled &&
    [stats, trend, projects, payments].every(
      (resource) => resource.loading && resource.data === null && resource.error === null,
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
