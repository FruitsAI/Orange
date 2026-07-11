import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { render } from '@/test/render'
import FinancialHero, { type FinancialHeroProps } from './FinancialHero'

const baseProps: FinancialHeroProps = {
  cta: { label: '处理待收款', to: '/projects/42' },
  expectedAmountText: '人民币 12,345 元',
  nextPayment: {
    detailText: '星轨品牌升级 · 人民币 3,200 元',
    dueLabel: '下一笔 3 天后到期',
  },
  overdueAmountText: '人民币 1,500 元',
  periodLabel: '近30天',
  supportingText: '同期已回款 人民币 8,000 元',
}

describe('FinancialHero', () => {
  it('presents the period expected income as the semantic hero heading and stable RMB amount', () => {
    render(<FinancialHero {...baseProps} />)

    expect(screen.getByRole('region', { name: '财务概览' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: '近30天预计回款' })).toBeInTheDocument()
    expect(screen.getByText('人民币 12,345 元')).toBeInTheDocument()
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
        nextPayment={{ detailText: '今日项目', dueLabel: '今日到期' }}
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
        nextPayment={null}
      />,
    )

    expect(screen.getByText('暂无待收款计划')).toBeInTheDocument()
    expect(screen.getByText('可前往项目页安排下一笔收款')).toBeInTheDocument()
  })

  it('renders exactly one primary action with the supplied target', () => {
    render(<FinancialHero {...baseProps} />)

    const action = screen.getByRole('link', { name: '处理待收款' })
    expect(action).toHaveAttribute('href', '/projects/42')
    expect(screen.getAllByRole('link')).toHaveLength(1)
  })

  it('renders explicit unavailable copy instead of inventing missing amounts', () => {
    render(
      <FinancialHero
        {...baseProps}
        expectedAmountText="--"
        overdueAmountText={null}
        supportingText="预计回款暂不可用"
      />,
    )

    expect(screen.getByText('--')).toBeInTheDocument()
    expect(screen.getByText('预计回款暂不可用')).toBeInTheDocument()
    expect(screen.getByText('逾期风险暂不可用')).toBeInTheDocument()
  })

  it('has no decorative orbit element and imports no business formatter', () => {
    const { container } = render(<FinancialHero {...baseProps} />)
    const source = readFileSync(resolve('src/components/dashboard/FinancialHero.tsx'), 'utf8')

    expect(container.querySelector('.financial-hero__orbit')).not.toBeInTheDocument()
    expect(source).not.toContain('formatCurrency')
  })
})
