import { Link } from 'react-router-dom'
import { formatCurrency } from '@/utils/format'

export interface FinancialHeroProps {
  actualAmount: number | null
  cta: {
    label: string
    to: string
  }
  expectedAmount: number | null
  nextPayment: {
    amount: number
    daysLeft: number
    projectName: string
  } | null
  overdueAmount: number | null
  periodLabel: string
}

function getDueLabel(daysLeft: number) {
  return daysLeft === 0 ? '下一笔今日到期' : `下一笔 ${daysLeft} 天后到期`
}

export default function FinancialHero({
  actualAmount,
  cta,
  expectedAmount,
  nextPayment,
  overdueAmount,
  periodLabel,
}: FinancialHeroProps) {
  return (
    <section aria-label="财务概览" className="financial-hero">
      <div aria-hidden="true" className="financial-hero__orbit" />
      <div className="financial-hero__content">
        <div className="financial-hero__eyebrow">
          <span aria-hidden="true" className="financial-hero__pulse" />
          Ember Orbit
        </div>
        <h1 className="financial-hero__title">{periodLabel}预计回款</h1>
        <div className="financial-hero__amount">
          {expectedAmount === null ? '--' : formatCurrency(expectedAmount)}
        </div>
        <p className="financial-hero__supporting-copy">
          {expectedAmount === null
            ? '预计回款暂不可用'
            : actualAmount === null
              ? '已回款数据暂不可用'
              : `同期已回款 ${formatCurrency(actualAmount)}`}
        </p>

        <div className="financial-hero__details">
          <div className="financial-hero__detail">
            <span className="financial-hero__detail-label">逾期风险</span>
            {overdueAmount === null ? (
              <strong className="financial-hero__detail-value">逾期风险暂不可用</strong>
            ) : (
              <strong className="financial-hero__detail-value financial-hero__detail-value--risk">
                {formatCurrency(overdueAmount)}
              </strong>
            )}
          </div>
          <div className="financial-hero__detail financial-hero__detail--payment">
            {nextPayment ? (
              <>
                <span className="financial-hero__detail-label">
                  {getDueLabel(nextPayment.daysLeft)}
                </span>
                <strong className="financial-hero__detail-value">
                  {nextPayment.projectName} · {formatCurrency(nextPayment.amount)}
                </strong>
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
