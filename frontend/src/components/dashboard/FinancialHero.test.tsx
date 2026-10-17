import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { render } from '@/test/render'
import FinancialHero, { type FinancialHeroProps } from './FinancialHero'

const baseProps: FinancialHeroProps = {
  busy: false,
  cta: { label: '处理待收款', to: '/projects/42' },
  expected: {
    amountText: '人民币 12,345 元',
    status: 'data',
    supportingText: '同期已回款 人民币 8,000 元',
  },
  overdue: { amountText: '人民币 1,500 元', status: 'data' },
  payment: {
    detailText: '星轨品牌升级 · 人民币 3,200 元',
    dueLabel: '下一笔 3 天后到期',
    status: 'data',
  },
  periodLabel: '近30天',
}

describe('FinancialHero', () => {
  it('presents the period expected income as the semantic hero heading and stable RMB amount', () => {
    render(<FinancialHero {...baseProps} />)

    expect(screen.getByRole('region', { name: '财务概览' })).toHaveAttribute(
      'data-motion',
      'entrance',
    )
    expect(screen.getByRole('region', { name: '财务概览' })).toHaveClass('ods-surface')
    expect(screen.getByRole('region', { name: '财务概览' })).toHaveAttribute(
      'data-variant',
      'brand',
    )
    expect(screen.getByRole('region', { name: '财务概览' })).toHaveAttribute('data-radius', 'shell')
    expect(document.querySelector('.financial-hero__pulse')).toHaveAttribute(
      'data-motion',
      'continuous',
    )
    expect(screen.getByRole('heading', { level: 1, name: '近30天预计回款' })).toBeInTheDocument()
    expect(screen.getByText('人民币 12,345 元')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /本地时间/ })).toBeInTheDocument()
  })

  it('shows overdue risk and the next payment countdown', () => {
    render(<FinancialHero {...baseProps} />)

    expect(screen.getByText('逾期风险')).toBeInTheDocument()
    expect(screen.getByText('人民币 1,500 元')).toBeInTheDocument()
    expect(screen.getByText('下一笔 3 天后到期')).toBeInTheDocument()
    expect(screen.getByText('星轨品牌升级 · 人民币 3,200 元')).toBeInTheDocument()
  })

  it('renders supplied payment copy without deriving or formatting it', () => {
    render(
      <FinancialHero
        {...baseProps}
        payment={{ detailText: '今日项目', dueLabel: '今日到期', status: 'data' }}
      />,
    )

    expect(screen.getByText('今日到期')).toBeInTheDocument()
    expect(screen.getByText('今日项目')).toBeInTheDocument()
  })

  it('shows a safe empty state when there is no upcoming payment', () => {
    render(
      <FinancialHero
        {...baseProps}
        cta={{ label: '查看项目', to: '/projects' }}
        payment={{ status: 'empty' }}
      />,
    )

    expect(screen.getByText('暂无待收款计划')).toBeInTheDocument()
    expect(screen.getByText('可前往项目页安排下一笔收款')).toBeInTheDocument()
  })

  it('renders exactly one primary action with the supplied target', () => {
    render(<FinancialHero {...baseProps} />)

    const action = screen.getByRole('link', { name: '处理待收款' })
    expect(action).toHaveAttribute('href', '/projects/42')
    expect(action).toHaveAttribute('data-size', 'lg')
    expect(action).toHaveAttribute('data-variant', 'primary')
    expect(screen.getAllByRole('link')).toHaveLength(1)
  })

  it('renders explicit unavailable copy instead of inventing missing amounts', () => {
    render(
      <FinancialHero
        {...baseProps}
        expected={{ status: 'error' }}
        overdue={{ status: 'error' }}
        payment={{ status: 'error' }}
      />,
    )

    expect(screen.getByText('--')).toBeInTheDocument()
    expect(screen.getByText('预计回款暂不可用')).toBeInTheDocument()
    expect(screen.getByText('逾期风险暂不可用')).toBeInTheDocument()
    expect(screen.getByText('收款计划暂不可用')).toBeInTheDocument()
    expect(screen.queryByText('暂无待收款计划')).not.toBeInTheDocument()
  })

  it('marks initial resource work busy and distinguishes loading from empty', () => {
    render(
      <FinancialHero
        {...baseProps}
        busy
        expected={{ status: 'loading' }}
        overdue={{ status: 'loading' }}
        payment={{ status: 'loading' }}
      />,
    )

    expect(screen.getByRole('region', { name: '财务概览' })).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText('预计回款加载中')).toBeInTheDocument()
    expect(screen.getByText('逾期风险加载中')).toBeInTheDocument()
    expect(screen.getByText('收款计划加载中')).toBeInTheDocument()
    expect(screen.queryByText('暂无待收款计划')).not.toBeInTheDocument()
  })

  it('has no decorative orbit element and imports no business formatter', () => {
    const { container } = render(<FinancialHero {...baseProps} />)
    const source = readFileSync(resolve('src/components/dashboard/FinancialHero.tsx'), 'utf8')

    expect(container.querySelector('.financial-hero__orbit')).not.toBeInTheDocument()
    expect(source).not.toContain('formatCurrency')
  })
})
