import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { render } from '@/test/render'
import FinancialHero, { type FinancialHeroProps } from './FinancialHero'

const baseProps: FinancialHeroProps = {
  actualAmount: 8_000,
  cta: { label: '处理待收款', to: '/projects/42' },
  expectedAmount: 12_345,
  nextPayment: {
    amount: 3_200,
    daysLeft: 3,
    projectName: '星轨品牌升级',
  },
  overdueAmount: 1_500,
  periodLabel: '近30天',
}

describe('FinancialHero', () => {
  it('presents the period expected income as the semantic hero heading and stable RMB amount', () => {
    render(<FinancialHero {...baseProps} />)

    expect(screen.getByRole('region', { name: '财务概览' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: '近30天预计回款' })).toBeInTheDocument()
    expect(screen.getByText('¥12,345.00')).toBeInTheDocument()
  })

  it('shows overdue risk and the next payment countdown', () => {
    render(<FinancialHero {...baseProps} />)

    expect(screen.getByText('逾期风险')).toBeInTheDocument()
    expect(screen.getByText('¥1,500.00')).toBeInTheDocument()
    expect(screen.getByText('下一笔 3 天后到期')).toBeInTheDocument()
    expect(screen.getByText('星轨品牌升级 · ¥3,200.00')).toBeInTheDocument()
  })

  it('uses an explicit today label for a payment due today', () => {
    render(
      <FinancialHero {...baseProps} nextPayment={{ ...baseProps.nextPayment!, daysLeft: 0 }} />,
    )

    expect(screen.getByText('下一笔今日到期')).toBeInTheDocument()
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
        actualAmount={null}
        expectedAmount={null}
        overdueAmount={null}
      />,
    )

    expect(screen.getByText('--')).toBeInTheDocument()
    expect(screen.getByText('预计回款暂不可用')).toBeInTheDocument()
    expect(screen.getByText('逾期风险暂不可用')).toBeInTheDocument()
  })
})
