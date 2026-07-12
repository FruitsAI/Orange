import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { render } from '@/test/render'
import DashboardSkeleton from './DashboardSkeleton'

describe('DashboardSkeleton', () => {
  it('matches the hero, metrics, action grid, and recent-project layout', () => {
    const { container } = render(<DashboardSkeleton />)

    expect(screen.getByRole('status', { name: '正在加载仪表盘' })).toBeInTheDocument()
    expect(screen.getAllByRole('status')).toHaveLength(1)
    expect(container.querySelectorAll('.dashboard-skeleton__hero')).toHaveLength(1)
    expect(container.querySelectorAll('.dashboard-skeleton__metric')).toHaveLength(3)
    expect(container.querySelectorAll('.dashboard-action-grid > *')).toHaveLength(2)
    expect(container.querySelectorAll('.dashboard-recent-projects')).toHaveLength(1)
  })

  it('hides decorative skeleton surfaces from assistive technology', () => {
    const { container } = render(<DashboardSkeleton />)

    const surfaces = container.querySelectorAll('.dashboard-skeleton__surface')
    expect(surfaces.length).toBeGreaterThan(0)
    surfaces.forEach((surface) => expect(surface).toHaveAttribute('aria-hidden', 'true'))
  })
})
