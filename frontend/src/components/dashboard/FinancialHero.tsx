import { Link } from 'react-router-dom'

export interface FinancialHeroProps {
  cta: {
    label: string
    to: string
  }
  expectedAmountText: string
  nextPayment: {
    detailText: string
    dueLabel: string
  } | null
  overdueAmountText: string | null
  periodLabel: string
  supportingText: string
}

export default function FinancialHero({
  cta,
  expectedAmountText,
  nextPayment,
  overdueAmountText,
  periodLabel,
  supportingText,
}: FinancialHeroProps) {
  return (
    <section aria-label="财务概览" className="financial-hero">
      <div className="financial-hero__content">
        <div className="financial-hero__eyebrow">
          <span aria-hidden="true" className="financial-hero__pulse" />
          Ember Orbit
        </div>
        <h1 className="financial-hero__title">{periodLabel}预计回款</h1>
        <div className="financial-hero__amount">{expectedAmountText}</div>
        <p className="financial-hero__supporting-copy">{supportingText}</p>

        <div className="financial-hero__details">
          <div className="financial-hero__detail">
            <span className="financial-hero__detail-label">逾期风险</span>
            {overdueAmountText === null ? (
              <strong className="financial-hero__detail-value">逾期风险暂不可用</strong>
            ) : (
              <strong className="financial-hero__detail-value financial-hero__detail-value--risk">
                {overdueAmountText}
              </strong>
            )}
          </div>
          <div className="financial-hero__detail financial-hero__detail--payment">
            {nextPayment ? (
              <>
                <span className="financial-hero__detail-label">{nextPayment.dueLabel}</span>
                <strong className="financial-hero__detail-value">{nextPayment.detailText}</strong>
              </>
            ) : (
              <>
                <span className="financial-hero__detail-label">暂无待收款计划</span>
                <strong className="financial-hero__detail-value">可前往项目页安排下一笔收款</strong>
              </>
            )}
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
