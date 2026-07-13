import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { render } from '@/test/render'
import PanelHeader from './PanelHeader'

describe('PanelHeader', () => {
  it('renders a level-three title, supporting copy, and action', () => {
    render(
      <PanelHeader
        action={<button type="button">查看全部</button>}
        subtitle="最近创建的项目"
        title="近期项目"
      />,
    )

    expect(screen.getByRole('heading', { level: 3, name: '近期项目' })).toHaveClass(
      'panel-header__title',
    )
    expect(screen.getByText('最近创建的项目')).toHaveClass('panel-header__subtitle')
    expect(screen.getByRole('button', { name: '查看全部' })).toBeInTheDocument()
  })

  it('supports a level-two title and omits absent optional regions', () => {
    const { container } = render(<PanelHeader headingLevel={2} title="现金流趋势" />)

    expect(screen.getByRole('heading', { level: 2, name: '现金流趋势' })).toBeInTheDocument()
    expect(container.querySelector('.panel-header__subtitle')).not.toBeInTheDocument()
    expect(container.querySelector('.panel-header__action')).not.toBeInTheDocument()
  })

  it('merges a caller class with the shared header class', () => {
    const { container } = render(<PanelHeader className="income-chart__header" title="趋势" />)

    expect(container.firstChild).toHaveClass('panel-header', 'income-chart__header')
  })
})
