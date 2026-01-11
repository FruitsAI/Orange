<script setup lang="ts">
/**
 * @file DashboardView.vue
 * @description 应用仪表盘首页
 * 聚合展示核心业务指标、图表和快捷操作入口。
 * 负责并行拉取多个 API 数据接口，并组装成 UI 所需的数据结构。
 */
import { ref, onMounted, onActivated, computed } from 'vue'
import StatCard from '@/components/dashboard/StatCard.vue'
import IncomeChart from '@/components/dashboard/IncomeChart.vue'
import QuickActions from '@/components/dashboard/QuickActions.vue'
import ProjectList from '@/components/dashboard/ProjectList.vue'
import UpcomingPayments from '@/components/dashboard/UpcomingPayments.vue'
import { dashboardApi, type DashboardStats } from '@/api/dashboard'
import type { Project, Payment } from '@/api/project'
import { useToast } from '@/composables/useToast'

const toast = useToast()

const statsData = ref<DashboardStats>({
  total_amount: 0,
  paid_amount: 0,
  pending_amount: 0,
  overdue_amount: 0,
  total_trend: 0,
  paid_trend: 0,
  pending_trend: 0,
  overdue_trend: 0,
  avg_collection_days: 0,
  avg_collection_days_trend: 0,
})

const statsDisplay = computed(() => [
  { 
    label: '总收款金额', 
    value: `¥${statsData.value.total_amount.toLocaleString()}`, 
    icon: 'ri-money-dollar-circle-line', 
    trendPrefix: '较上月',
    trend: `${Math.abs(statsData.value.total_trend)}%`, 
    trendUp: statsData.value.total_trend >= 0, 
    iconColorClass: 'stat-card-icon--primary' 
  },
  { 
    label: '已结算金额', 
    value: `¥${statsData.value.paid_amount.toLocaleString()}`, 
    icon: 'ri-checkbox-circle-line', 
    trendPrefix: '较上月',
    trend: `${Math.abs(statsData.value.paid_trend)}%`, 
    trendUp: statsData.value.paid_trend >= 0, 
    iconColorClass: 'stat-card-icon--success' 
  },
  { 
    label: '待结算金额', 
    value: `¥${statsData.value.pending_amount.toLocaleString()}`, 
    icon: 'ri-time-line', 
    trendPrefix: '较上月',
    trend: `${Math.abs(statsData.value.pending_trend)}%`, 
    trendUp: statsData.value.pending_trend >= 0, // Pending trend up might be bad? Usually context dependent. optimized: false? Keeping simple.
    iconColorClass: 'stat-card-icon--warning' 
  },
  { 
    label: '逾期金额', 
    value: `¥${statsData.value.overdue_amount.toLocaleString()}`, 
    icon: 'ri-error-warning-line', 
    trendPrefix: '较上月',
    trend: `${Math.abs(statsData.value.overdue_trend)}%`, 
    trendUp: statsData.value.overdue_trend >= 0, // Overdue up is definitely bad. But trendUp usually just controls arrow direction.
    iconColorClass: 'stat-card-icon--danger' 
  },
])

const incomeLabels = ref<string[]>([])
const incomeValues = ref<number[]>([])

const recentProjects = ref<Project[]>([])
// Use correct type for payments
interface PaymentDisplayItem {
  id: number
  project_id: number
  project_name: string
  client_name: string
  days_left: number
  amount: number
  status: string
}
const upcomingPayments = ref<PaymentDisplayItem[]>([])

const loading = ref(true)

const activePeriod = ref<'week' | 'month' | 'quarter' | 'year'>('month')

const fetchDashboardData = async () => {
  loading.value = true
  try {
    // 并行请求所有数据，提升加载速度
    const [statsRes, trendRes, projectRes, paymentRes] = await Promise.all([
      dashboardApi.getStats(),
      dashboardApi.getIncomeTrend(activePeriod.value),
      dashboardApi.getRecentProjects(),
      dashboardApi.getUpcomingPayments(),
    ])

    if (statsRes.data.code === 0) {
      statsData.value = statsRes.data.data
    }

    if (trendRes.data.code === 0) {
      incomeLabels.value = trendRes.data.data.labels
      incomeValues.value = trendRes.data.data.actual_values
    }

    if (projectRes.data.code === 0) {
      recentProjects.value = projectRes.data.data
    }

    if (paymentRes.data.code === 0) {
      upcomingPayments.value = paymentRes.data.data.map((p: Payment) => {
        // 使用标准日期计算剩余天数
        const due = new Date(p.plan_date)
        const today = new Date()
        const diffTime = due.getTime() - today.getTime()
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        
        return {
          id: p.id,
          project_id: p.project_id,
          project_name: p.project ? p.project.name : '未知项目',
          client_name: p.project ? p.project.company : '未知客户',
          days_left: days >= 0 ? days : 0, 
          amount: p.amount,
          status: days < 0 ? 'danger' : days < 3 ? 'danger' : days < 7 ? 'warning' : 'success'
        }
      })
    }

  } catch (error) {
    console.error('Failed to fetch dashboard data', error)
    toast.error('获取仪表盘数据失败')
  } finally {
    loading.value = false
  }
}

const handlePeriodChange = async (period: 'week' | 'month' | 'quarter' | 'year') => {
  activePeriod.value = period
  try {
    const res = await dashboardApi.getIncomeTrend(period)
    if (res.data.code === 0 && res.data.data) {
      incomeLabels.value = res.data.data.labels
      incomeValues.value = res.data.data.actual_values
    }
  } catch (error) {
    console.error('Failed to update income trend', error)
  }
}

onMounted(() => {
  fetchDashboardData()
})

onActivated(() => {
  fetchDashboardData()
})
</script>

<template>
  <div class="dashboard-view">
    <!-- Stats Grid -->
    <div class="grid grid-cols-4" style="margin-bottom: var(--spacing-lg);">
      <StatCard
        v-for="stat in statsDisplay"
        :key="stat.label"
        v-bind="stat"
      />
    </div>

    <!-- Charts & Actions -->
    <div class="grid dashboard-charts-row">
      <IncomeChart 
        :labels="incomeLabels" 
        :values="incomeValues" 
        v-model="activePeriod"
        @change="handlePeriodChange"
      />
      <QuickActions />
    </div>

    <!-- Projects & Payments -->
    <div class="grid dashboard-projects-row">
      <ProjectList :projects="recentProjects" />
      <UpcomingPayments :payments="upcomingPayments" />
    </div>
  </div>
</template>

<style scoped>
.dashboard-charts-row {
  grid-template-columns: 2fr 1fr;
  align-items: stretch;
  margin-bottom: var(--spacing-lg);
}

.dashboard-projects-row {
  grid-template-columns: 2fr 1fr;
  align-items: stretch;
}

@media (max-width: 1024px) {
  .dashboard-charts-row,
  .dashboard-projects-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .dashboard-charts-row,
  .dashboard-projects-row {
    gap: var(--spacing-md);
  }
}
</style>
