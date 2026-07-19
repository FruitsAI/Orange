import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { render } from '@/test/render'
import { RouterButton, RouterIconButton, RouterLink, RouterNavLink } from './RouterControls'
import routerControlsCss from './router-controls.css?raw'

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

describe('RouterIconButton', () => {
  it('combines router navigation with the ODS icon-button contract', () => {
    render(
      <RouterIconButton label="系统设置" to="/settings" tone="accent" variant="secondary">
        <i aria-hidden="true" className="ri-settings-4-line" />
      </RouterIconButton>,
    )

    const link = screen.getByRole('link', { name: '系统设置' })
    expect(link).toHaveAttribute('href', '/settings')
    expect(link).toHaveClass('ods-button', 'ods-icon-button', 'ods-router-button')
    expect(link).toHaveAttribute('data-tone', 'accent')
    expect(link).toHaveAttribute('data-variant', 'secondary')
    expect(link.querySelector('[data-slot="icon"]')).toHaveClass('ods-icon-button__icon')
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

  it('owns the reusable pressable-row treatment and trailing icon slot', () => {
    render(
      <RouterLink
        appearance="row"
        density="comfortable"
        icon={<i className="ri-arrow-right-s-line" />}
        to="/projects/42"
      >
        星轨项目
      </RouterLink>,
    )

    const link = screen.getByRole('link', { name: '星轨项目' })
    expect(link).toHaveAttribute('data-appearance', 'row')
    expect(link).toHaveAttribute('data-density', 'comfortable')
    expect(link).toHaveAttribute('data-tone', 'foreground')
    expect(link).toHaveAttribute('data-underline', 'none')
    expect(link.querySelector('[data-slot="icon"]')).toBeInTheDocument()
    expect(link.lastElementChild).toHaveAttribute('data-slot', 'icon')
    expect(routerControlsCss).toMatch(/\.ods-router-link\[data-appearance='row'\]/)
    expect(routerControlsCss).toMatch(
      /\.ods-router-link\[data-appearance='row'\] > \.ods-link__icon \{[^}]*justify-self: end;/,
    )
    expect(routerControlsCss).toMatch(/@media \(hover: hover\) and \(pointer: fine\)/)
  })
})

describe('RouterNavLink', () => {
  it('adds the current-page contract to ODS navigation links', () => {
    render(
      <RouterNavLink
        appearance="tab"
        className={({ isActive }) => (isActive ? 'is-current' : 'is-idle')}
        to="/projects"
      >
        {({ isActive }) => (isActive ? '当前项目' : '项目管理')}
      </RouterNavLink>,
      {
        initialEntries: ['/projects/42'],
      },
    )

    const link = screen.getByRole('link', { name: '当前项目' })
    expect(link).toHaveClass('ods-link', 'ods-router-link', 'ods-router-nav-link')
    expect(link).toHaveAttribute('data-appearance', 'tab')
    expect(link).toHaveClass('is-current')
    expect(link).toHaveAttribute('aria-current', 'page')
  })

  it('owns dock icon and label slots', () => {
    render(
      <RouterNavLink
        appearance="dock"
        icon={<i aria-hidden="true" className="ri-dashboard-line" />}
        to="/dashboard"
      >
        工作台
      </RouterNavLink>,
      { initialEntries: ['/dashboard'] },
    )

    const link = screen.getByRole('link', { name: '工作台' })
    expect(link).toHaveAttribute('data-appearance', 'dock')
    expect(link.querySelector('[data-slot="icon"]')).toBeInTheDocument()
    expect(screen.getByText('工作台')).toHaveAttribute('data-slot', 'label')
  })
})
