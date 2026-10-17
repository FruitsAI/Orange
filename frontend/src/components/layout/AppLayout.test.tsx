import { describe, expect, test, vi } from 'vitest'
import { fireEvent, render } from '@/test/render'
import AppLayout from './AppLayout'
import '@/styles/layout.css'

const { toggleMaximise } = vi.hoisted(() => ({
  toggleMaximise: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@wailsio/runtime', () => ({
  Window: { ToggleMaximise: toggleMaximise },
}))

describe('AppLayout', () => {
  test('renders a real draggable titlebar surface above the inset topbar', () => {
    const { container } = render(<AppLayout />, { initialEntries: ['/dashboard'] })

    const dragRegion = container.querySelector('.app-titlebar-drag-region')
    const topbar = container.querySelector('.app-topbar')

    expect(dragRegion).toBeInTheDocument()
    expect(dragRegion).toHaveAttribute('aria-hidden', 'true')
    expect(dragRegion?.nextElementSibling).toBe(topbar)
  })

  test('toggles native maximise on titlebar drag-region double click', () => {
    const { container } = render(<AppLayout />, { initialEntries: ['/dashboard'] })
    const dragRegion = container.querySelector('.app-titlebar-drag-region')

    expect(dragRegion).toBeInTheDocument()
    fireEvent.doubleClick(dragRegion!)

    expect(toggleMaximise).toHaveBeenCalledTimes(1)
  })
})
