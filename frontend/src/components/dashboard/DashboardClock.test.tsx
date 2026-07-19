import { act, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@/test/render'
import DashboardClock from './DashboardClock'

describe('DashboardClock', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 18, 9, 8, 7))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders a readable local date and a complete analog dial', () => {
    const { container } = render(<DashboardClock />)

    expect(
      screen.getByRole('group', { name: '本地时间 7月18日 星期六 09:08:07' }),
    ).toBeInTheDocument()
    expect(screen.getByText('09:08')).toBeInTheDocument()
    expect(screen.getByText(':07')).toBeInTheDocument()
    expect(screen.getByText('7月18日 · 星期六')).toBeInTheDocument()
    expect(container.querySelectorAll('.dashboard-clock__marker')).toHaveLength(12)
    expect(container.querySelectorAll('.dashboard-clock__hand')).toHaveLength(3)
  })

  it('updates once per second and clears its interval when removed', () => {
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval')
    const { unmount } = render(<DashboardClock />)

    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByText(':08')).toBeInTheDocument()

    unmount()
    expect(clearIntervalSpy).toHaveBeenCalledTimes(1)
    clearIntervalSpy.mockRestore()
  })
})
