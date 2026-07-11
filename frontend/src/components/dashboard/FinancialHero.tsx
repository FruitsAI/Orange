import { Link } from 'react-router-dom'

type ExpectedDisplay =
  | { status: 'error' }
  | { status: 'loading' }
  | { amountText: string; status: 'data'; supportingText: string }

type OverdueDisplay =
  | { status: 'error' }
  | { status: 'loading' }
  | { amountText: string; status: 'data' }

type PaymentDisplay =
  | { status: 'empty' }
  | { status: 'error' }
  | { status: 'loading' }
  | { detailText: string; dueLabel: string; status: 'data' }

export interface FinancialHeroProps {
  busy: boolean
  cta: {
    label: string
    to: string
  }
  expected: ExpectedDisplay
  overdue: OverdueDisplay
  payment: PaymentDisplay
  periodLabel: string
}

function ExpectedContent({ expected }: Pick<FinancialHeroProps, 'expected'>) {
  if (expected.status === 'loading') {
    return (
      <>
        <div className="financial-hero__amount financial-hero__amount--loading">预计回款加载中</div>
        <p className="financial-hero__supporting-copy">正在汇总当前周期</p>
      </>
    )
  }

  if (expected.status === 'error') {
    return (
      <>
        <div className="financial-hero__amount">--</div>
        <p className="financial-hero__supporting-copy">预计回款暂不可用</p>
      </>
    )
  }

  return (
    <>
      <div className="financial-hero__amount">{expected.amountText}</div>
      <p className="financial-hero__supporting-copy">{expected.supportingText}</p>
    </>
  )
}

function OverdueContent({ overdue }: Pick<FinancialHeroProps, 'overdue'>) {
  if (overdue.status === 'loading') {
    return <strong className="financial-hero__detail-value">逾期风险加载中</strong>
  }
  if (overdue.status === 'error') {
    return <strong className="financial-hero__detail-value">逾期风险暂不可用</strong>
  }
  return (
    <strong className="financial-hero__detail-value financial-hero__detail-value--risk">
      {overdue.amountText}
    </strong>
  )
}

function PaymentContent({ payment }: Pick<FinancialHeroProps, 'payment'>) {
  if (payment.status === 'loading') {
    return (
      <>
        <span className="financial-hero__detail-label">收款计划加载中</span>
        <strong className="financial-hero__detail-value">正在查找最近到期款项</strong>
      </>
    )
  }
  if (payment.status === 'error') {
    return (
      <>
        <span className="financial-hero__detail-label">收款计划暂不可用</span>
        <strong className="financial-hero__detail-value">请稍后重试此区域</strong>
      </>
    )
  }
  if (payment.status === 'empty') {
    return (
      <>
        <span className="financial-hero__detail-label">暂无待收款计划</span>
        <strong className="financial-hero__detail-value">可前往项目页安排下一笔收款</strong>
      </>
    )
  }
  return (
    <>
      <span className="financial-hero__detail-label">{payment.dueLabel}</span>
      <strong className="financial-hero__detail-value">{payment.detailText}</strong>
    </>
  )
}

export default function FinancialHero({
  busy,
  cta,
  expected,
  overdue,
  payment,
  periodLabel,
}: FinancialHeroProps) {
  return (
    <section aria-busy={busy} aria-label="财务概览" className="financial-hero">
      <div className="financial-hero__content">
        <div className="financial-hero__eyebrow">
          <span aria-hidden="true" className="financial-hero__pulse" />
          Ember Orbit
        </div>
        <h1 className="financial-hero__title">{periodLabel}预计回款</h1>
        <ExpectedContent expected={expected} />

        <div className="financial-hero__details">
          <div className="financial-hero__detail">
            <span className="financial-hero__detail-label">逾期风险</span>
            <OverdueContent overdue={overdue} />
          </div>
          <div className="financial-hero__detail financial-hero__detail--payment">
            <PaymentContent payment={payment} />
          </div>
        </div>
      </div>

      <Link className="financial-hero__cta" to={cta.to}>
        {cta.label}
        <i aria-hidden="true" className="ri-arrow-right-up-line" />
      </Link>
    </section>
  )
}
