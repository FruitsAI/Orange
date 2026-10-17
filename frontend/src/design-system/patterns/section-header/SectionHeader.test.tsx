import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SectionHeader } from './SectionHeader'
import sectionHeaderCss from './section-header.css?raw'

describe('SectionHeader', () => {
  it('supports configurable heading hierarchy and trailing actions', () => {
    render(
      <SectionHeader
        actions={<button type="button">编辑</button>}
        description="最近 30 天"
        headingLevel={3}
        title="收款趋势"
      />,
    )

    expect(screen.getByRole('heading', { level: 3, name: '收款趋势' })).toBeInTheDocument()
    expect(screen.getByText('最近 30 天')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '编辑' })).toBeInTheDocument()
  })

  it('exposes compact density without leaking internal anatomy to consumers', () => {
    render(<SectionHeader density="compact" description="最近创建" title="近期项目" />)

    expect(screen.getByRole('banner')).toHaveAttribute('data-density', 'compact')
    expect(screen.getByRole('heading', { name: '近期项目' })).toBeInTheDocument()
    expect(sectionHeaderCss).toMatch(
      /\.ods-section-header\[data-density='compact'\] \.ods-section-header__title/,
    )
  })

  it('owns leading icon tone and prominent sizing as public variants', () => {
    const { container } = render(
      <SectionHeader
        description="管理系统账户"
        icon={<i className="ri-team-line" />}
        iconTone="info"
        size="lg"
        title="用户管理"
      />,
    )

    expect(screen.getByRole('banner')).toHaveAttribute('data-size', 'lg')
    expect(container.querySelector('[data-slot="icon"]')).toHaveAttribute('data-tone', 'info')
    expect(container.querySelector('[data-slot="icon"]')).toHaveAttribute('aria-hidden', 'true')
    expect(sectionHeaderCss).toContain(".ods-section-header__icon[data-tone='info']")
    expect(sectionHeaderCss).toContain(".ods-section-header[data-size='lg']")
  })
})
