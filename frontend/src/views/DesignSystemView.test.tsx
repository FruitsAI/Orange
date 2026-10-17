import { render as renderReact, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from '@/App'
import DesignSystemView from '@/views/DesignSystemView'
import { render } from '@/test/render'

describe('DesignSystemView', () => {
  it('composes the showcase from Orange Design System patterns and surfaces', () => {
    const { container } = render(<DesignSystemView />)

    expect(screen.getByRole('heading', { level: 1, name: 'Orange 设计系统' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: '按钮 Button' })).toBeInTheDocument()
    expect(container.querySelector('.ods-page-header')).toBeInTheDocument()
    expect(
      container.querySelector('.design-showcase__section .ods-section-header'),
    ).toBeInTheDocument()
    expect(container.querySelector('.design-showcase__scroll-item.ods-surface')).toBeInTheDocument()
    expect(container.querySelector('[data-variant="brand"]')).toBeInTheDocument()
    expect(document.querySelectorAll('[data-slot="toaster"]')).toHaveLength(0)
  })

  it('relies on the single application-level toast host', () => {
    renderReact(
      <MemoryRouter initialEntries={['/design-system']}>
        <Routes>
          <Route element={<App />}>
            <Route element={<DesignSystemView />} path="/design-system" />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(document.querySelectorAll('[data-slot="toaster"]')).toHaveLength(1)
  })
})
