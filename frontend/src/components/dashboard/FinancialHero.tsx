import { RouterButton } from '@/design-system'

type ExpectedDisplay =
  | { status: 'error' }
  | { status: 'loading' }
  | { amountText: string; status: 'data'; supportingText: string }

type OverdueDisplay =
  | { status: 'error' }
  | { status: 'loading' }
  | { amountText: string; status: 'data' }

type PaidDisplay =
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
  overdueCount?: number | null
  paid: PaidDisplay
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

function PaidContent({ paid }: Pick<FinancialHeroProps, 'paid'>) {
  if (paid.status === 'loading') return <strong>已回款加载中</strong>
  if (paid.status === 'error') return <strong>暂不可用</strong>
  return <strong>{paid.amountText}</strong>
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
        <span className="financial-hero__detail-label">未来七天无新到期计划</span>
        <strong className="financial-hero__detail-value">逾期款项仍需优先跟进</strong>
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
  overdueCount,
  paid,
  payment,
  periodLabel,
}: FinancialHeroProps) {
  return (
    <section
      aria-busy={busy}
      aria-label="财务概览"
      className="financial-hero"
      data-motion="entrance"
    >
      <div className="financial-hero__risk">
        <div className="financial-hero__risk-label">
          <i aria-hidden="true" className="ri-error-warning-line" />
          <span>逾期待收</span>
        </div>
        <div className="financial-hero__risk-total">
          <OverdueContent overdue={overdue} />
          {overdueCount != null && overdueCount > 0 ? (
            <span className="financial-hero__risk-count">{overdueCount} 笔需跟进</span>
          ) : null}
        </div>
        <p>到期款项请及时跟进，避免影响项目回款。</p>
        <RouterButton className="financial-hero__cta" size="lg" to={cta.to} variant="primary">
          {cta.label}
          <i aria-hidden="true" className="ri-arrow-right-line" />
        </RouterButton>
      </div>

      <div className="financial-hero__metric">
        <span className="financial-hero__metric-label">{periodLabel}预计回款</span>
        <ExpectedContent expected={expected} />
      </div>

      <div className="financial-hero__metric financial-hero__metric--paid">
        <span className="financial-hero__metric-label">已回款</span>
        <PaidContent paid={paid} />
        <div className="financial-hero__next-payment">
          <PaymentContent payment={payment} />
        </div>
      </div>
    </section>
  )
}
