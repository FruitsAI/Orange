import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { render } from '@/test/render'
import { RouterButton, RouterLink } from './RouterControls'

describe('RouterButton', () => {
  it('renders a router link with Button variants and sizes', () => {
    render(
      <RouterButton fullWidth size="lg" to="/projects/new" variant="secondary">
        新建项目
      </RouterButton>,
    )

    const link = screen.getByRole('link', { name: '新建项目' })
    expect(link).toHaveAttribute('href', '/projects/new')
    expect(link).toHaveClass('ods-button', 'ods-router-button')
    expect(link).toHaveAttribute('data-full-width', 'true')
    expect(link).toHaveAttribute('data-size', 'lg')
    expect(link).toHaveAttribute('data-variant', 'secondary')
  })

  it('prevents disabled navigation and activation', async () => {
    const onClick = vi.fn()
    render(
      <RouterButton disabled onClick={onClick} to="/projects">
        项目
      </RouterButton>,
    )

    const link = screen.getByRole('link', { name: '项目' })
    await userEvent.click(link)
    expect(onClick).not.toHaveBeenCalled()
    expect(link).toHaveAttribute('aria-disabled', 'true')
  })
})

describe('RouterLink', () => {
  it('uses router navigation with the ODS link treatment', () => {
    render(
      <RouterLink to="/settings" tone="foreground" underline="always">
        设置
      </RouterLink>,
    )

    const link = screen.getByRole('link', { name: '设置' })
    expect(link).toHaveAttribute('href', '/settings')
    expect(link).toHaveClass('ods-link', 'ods-router-link')
    expect(link).toHaveAttribute('data-tone', 'foreground')
    expect(link).toHaveAttribute('data-underline', 'always')
  })
})
