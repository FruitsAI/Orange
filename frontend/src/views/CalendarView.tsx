import { useCallback, useEffect, useMemo, useState } from 'react'
import { paymentApi, type Payment } from '@/api/project'
import GlassCard from '@/components/common/GlassCard'
import StatusBadge from '@/components/common/StatusBadge'
import { useToastStore } from '@/composables/useToast'

export default function CalendarView() {
  const toastError = useToastStore((state) => state.error)
  const [payments, setPayments] = useState<Payment[]>([])
  const [status, setStatus] = useState('')

  const loadPayments = useCallback(async () => {
    try {
      const response = await paymentApi.list({ _t: Date.now(), status: status || undefined })
      setPayments(response.data.data)
    } catch {
      toastError('获取收款日历失败')
    }
  }, [status, toastError])

  useEffect(() => {
    const timer = window.setTimeout(loadPayments, 0)
    return () => window.clearTimeout(timer)
  }, [loadPayments])

  const groupedPayments = useMemo(() => {
    return payments.reduce<Record<string, Payment[]>>((groups, payment) => {
      const month = (payment.plan_date || '').slice(0, 7) || '未设置日期'
      groups[month] = groups[month] || []
      groups[month].push(payment)
      return groups
    }, {})
  }, [payments])

  return (
    <div className="page-stack">
      <div className="page-toolbar">
        <select onChange={(event) => setStatus(event.target.value)} value={status}>
          <option value="">全部款项</option>
          <option value="pending">待收款</option>
          <option value="overdue">已逾期</option>
          <option value="paid">已收款</option>
        </select>
      </div>
      {Object.entries(groupedPayments).length === 0 ? (
        <GlassCard>暂无收款计划</GlassCard>
      ) : (
        Object.entries(groupedPayments).map(([month, items]) => (
          <GlassCard key={month}>
            <div className="glass-card-header">
              <h3 className="glass-card-title">{month}</h3>
              <span className="text-secondary">{items.length} 笔</span>
            </div>
            <div className="timeline-list">
              {items.map((payment) => (
                <div className="timeline-item" key={payment.id}>
                  <div>
                    <div className="font-semibold">{payment.stage}</div>
                    <div className="text-sm text-secondary">
                      {payment.project?.name || '未知项目'} · {payment.plan_date}
                    </div>
                  </div>
                  <div className="flex items-center gap-md">
                    <strong>¥{payment.amount.toLocaleString()}</strong>
                    <StatusBadge status={payment.status} />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        ))
      )}
    </div>
  )
}
