import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from './index'
import { dashboardApi } from './dashboard'

vi.mock('./index', () => ({
  default: {
    get: vi.fn(),
  },
}))

describe('dashboardApi cancellation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('passes AbortSignal through every dashboard request config', () => {
    const signal = new AbortController().signal

    dashboardApi.getStats('month', signal)
    dashboardApi.getIncomeTrend('week', signal)
    dashboardApi.getRecentProjects(signal)
    dashboardApi.getUpcomingPayments(signal)

    expect(vi.mocked(api.get).mock.calls).toEqual([
      ['/dashboard/stats', expect.objectContaining({ signal })],
      ['/dashboard/income-trend', expect.objectContaining({ signal })],
      ['/dashboard/recent-projects', expect.objectContaining({ signal })],
      ['/dashboard/upcoming-payments', expect.objectContaining({ signal })],
    ])
  })
})
