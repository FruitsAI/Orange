import { useNavigate } from 'react-router-dom'
import GlassCard from '@/components/common/GlassCard'

const actions = [
  {
    name: '新建项目',
    icon: 'ri-add-circle-line',
    path: '/projects/create',
    color: '#3b82f6',
    bg: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.05))',
  },
  {
    name: '添加收款',
    icon: 'ri-money-dollar-box-line',
    path: '/payment/create',
    color: '#10b981',
    bg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.05))',
  },
  {
    name: '生成报表',
    icon: 'ri-file-chart-line',
    path: '/analytics',
    color: '#8b5cf6',
    bg: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(139, 92, 246, 0.05))',
  },
  {
    name: '收款日历',
    icon: 'ri-calendar-check-line',
    path: '/calendar',
    color: '#f59e0b',
    bg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(245, 158, 11, 0.05))',
  },
]

export default function QuickActions() {
  const navigate = useNavigate()

  return (
    <GlassCard>
      <div className="glass-card-header">
        <h3 className="glass-card-title">快捷操作</h3>
      </div>
      <div className="quick-actions-grid">
        {actions.map((action) => (
          <button className="quick-action cursor-pointer" key={action.name} onClick={() => navigate(action.path)} type="button">
            <div className="quick-action-icon" style={{ background: action.bg, color: action.color }}>
              <i className={action.icon} />
            </div>
            <span className="text-sm font-medium">{action.name}</span>
          </button>
        ))}
      </div>
    </GlassCard>
  )
}
