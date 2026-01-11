<script setup lang="ts">
/**
 * @file AnalyticsView.vue
 * @description 数据分析页面
 * 展示收入趋势、收款结构饼图及核心指标卡片。
 * 集成了 Chart.js 图表库，并支持导出报表。
 */
import { onMounted, ref, watch, onUnmounted, computed } from 'vue'
import GlassCard from '@/components/common/GlassCard.vue'
import StatCard from '@/components/dashboard/StatCard.vue'
import { Chart, registerables } from 'chart.js'
import { useThemeStore } from '@/stores/theme'
import { dashboardApi, type DashboardStats } from '@/api/dashboard'

// 注册 Chart.js 组件
Chart.register(...registerables)

const themeStore = useThemeStore()
const barChartCanvas = ref<HTMLCanvasElement | null>(null)
const doughnutChartCanvas = ref<HTMLCanvasElement | null>(null)

let barChartInstance: Chart | null = null
let doughnutChartInstance: Chart | null = null

// 统计数据状态
const stats = ref<DashboardStats>({
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

// 计算收款率 (已收 / 总额)
const collectionRate = computed(() => {
  if (stats.value.total_amount === 0) return 0
  return ((stats.value.paid_amount / stats.value.total_amount) * 100).toFixed(1)
})

// 计算逾期率 (逾期 / 总额)
const overdueRate = computed(() => {
  if (stats.value.total_amount === 0) return 0
  return ((stats.value.overdue_amount / stats.value.total_amount) * 100).toFixed(1)
})

const fetchStats = async () => {
  try {
    const res = await dashboardApi.getStats(activePeriod.value)
    if (res.data.code === 0 && res.data.data) {
      stats.value = res.data.data
      updateDoughnutChart()
    }
  } catch (error) {
    console.error('Failed to fetch stats:', error)
  }
}

// 默认统计周期
const activePeriod = ref<'week' | 'month' | 'quarter' | 'year'>('month')

const periods = ['week', 'month', 'quarter', 'year'] as const

/**
 * 切换统计周期并刷新数据
 */
const changePeriod = async (period: 'week' | 'month' | 'quarter' | 'year') => {
  activePeriod.value = period
  await Promise.all([fetchStats(), fetchCharts()])
}

const fetchCharts = async () => {
  try {
    const res = await dashboardApi.getIncomeTrend(activePeriod.value)
    if (res.data.code === 0 && res.data.data) {
      updateBarChart(res.data.data.labels, res.data.data.actual_values, res.data.data.expected_values)
    }
  } catch (error) {
    console.error('Failed to fetch income trend:', error)
  }
}

const updateBarChart = (labels: string[], actual: number[], expected: number[]) => {
  if (!barChartInstance) return
  barChartInstance.data.labels = labels
  if (barChartInstance.data.datasets[0]) {
     barChartInstance.data.datasets[0].data = actual
  }
  if (barChartInstance.data.datasets[1]) {
     barChartInstance.data.datasets[1].data = expected
  }
  barChartInstance.update()
}

const updateDoughnutChart = () => {
  if (!doughnutChartInstance) return
  const s = stats.value
  if (doughnutChartInstance.data.datasets[0]) {
    doughnutChartInstance.data.datasets[0].data = [s.paid_amount, s.pending_amount, s.overdue_amount]
  }
  doughnutChartInstance.update()
}

const initCharts = () => {
  if (barChartInstance) barChartInstance.destroy()
  if (doughnutChartInstance) doughnutChartInstance.destroy()

  const isDark = themeStore.effectiveTheme === 'dark'

  const colors = {
    primary: '#FF9F0A',
    primaryLight: 'rgba(255, 159, 10, 0.3)',
    success: isDark ? "#30D158" : "#34C759",
    warning: isDark ? "#FF9F0A" : "#FF9500",
    danger: isDark ? "#FF453A" : "#FF3B30",
    teal: isDark ? "#64D2FF" : "#5AC8FA",
    textColor: isDark ? "rgba(235, 235, 245, 0.6)" : "rgba(60, 60, 67, 0.6)",
    gridColor: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.05)",
  }

  // Bar Chart
  if (barChartCanvas.value) {
    const ctx = barChartCanvas.value.getContext('2d')
    if (ctx) {
      barChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: [],
          datasets: [
            {
              label: "实际收款",
              data: [],
              backgroundColor: colors.primary,
              borderRadius: 8,
              borderSkipped: false,
            },
            {
              label: "预期收款",
              data: [],
              backgroundColor: colors.primaryLight,
              borderRadius: 8,
              borderSkipped: false,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                color: colors.textColor,
                padding: 16,
                usePointStyle: true,
                pointStyle: "circle",
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: colors.gridColor },
              ticks: { color: colors.textColor },
            },
            x: {
              grid: { display: false },
              ticks: { color: colors.textColor },
            },
          },
        },
      })
    }
  }

  // Doughnut Chart
  if (doughnutChartCanvas.value) {
    const ctx = doughnutChartCanvas.value.getContext('2d')
    if (ctx) {
      doughnutChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ["已收款", "待收款", "逾期"],
          datasets: [
            {
              data: [0, 0, 0],
              backgroundColor: [colors.success, colors.teal, colors.danger],
              borderWidth: 0,
              hoverOffset: 8,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "68%",
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                color: colors.textColor,
                padding: 16,
                usePointStyle: true,
                pointStyle: "circle",
              },
            },
          },
        },
      })
    }
  }
}

watch(() => themeStore.effectiveTheme, () => {
  initCharts()
  fetchCharts()
  updateDoughnutChart()
})

onMounted(async () => {
  initCharts()
  await fetchStats()
  await fetchCharts()
})

onUnmounted(() => {
  if (barChartInstance) barChartInstance.destroy()
  if (doughnutChartInstance) doughnutChartInstance.destroy()
})
// 动态计算趋势前缀
const trendPrefix = computed(() => {
  switch (activePeriod.value) {
    case 'week': return '较上周'
    case 'month': return '较上月'
    case 'quarter': return '较上季'
    case 'year': return '较上年'
    default: return '较上期'
  }
})

const chartTitle = computed(() => {
  switch (activePeriod.value) {
    case 'week': return '周度收入对比'
    case 'month': return '月度收入对比'
    case 'quarter': return '季度收入对比'
    case 'year': return '年度收入对比'
    default: return '收入对比'
  }
})
</script>

<template>
  <div class="analytics-view">
    <div class="analytics-toolbar">
      <div class="flex gap-sm">
        <button 
          v-for="p in periods" 
          :key="p"
          class="btn btn-sm"
          :class="activePeriod === p ? 'btn-secondary active' : 'btn-ghost'"
          @click="changePeriod(p)"
        >
          {{ p === 'week' ? '周' : p === 'month' ? '月' : p === 'quarter' ? '季' : '年' }}
        </button>
      </div>
      <button class="btn btn-secondary"><i class="ri-download-line"></i> <span class="btn-text">导出报表</span></button>
    </div>

    <div class="grid grid-cols-4 gap-lg mb-lg">
      <StatCard
        label="平均收款周期"
        :value="Math.round(stats.avg_collection_days)"
        suffix="天"
        icon="ri-time-line"
        :trendPrefix="trendPrefix"
        trend-direction="up"
        :trend-up="stats.avg_collection_days_trend >= 0"
        :trendValue="Math.abs(stats.avg_collection_days_trend).toFixed(1) + '%'"
        variant="primary"
      />
      <StatCard
        label="预期收款"
        :value="'¥' + stats.total_amount.toLocaleString()"
        icon="ri-funds-line"
        :trendPrefix="trendPrefix"
        trend-direction="up"
        :trend-up="stats.total_trend >= 0"
        :trendValue="Math.abs(stats.total_trend).toFixed(1) + '%'"
        variant="success"
      />
      <StatCard
        label="收款率"
        :value="collectionRate"
        suffix="%"
        icon="ri-percent-line"
        :trendPrefix="trendPrefix"
        trend-direction="up"
        :trend-up="stats.paid_trend >= 0"
        :trendValue="Math.abs(stats.paid_trend).toFixed(1) + '%'"
        variant="warning"
      />
      <StatCard
        label="逾期比例"
        :value="overdueRate"
        suffix="%"
        icon="ri-error-warning-line"
        :trendPrefix="trendPrefix"
        trend-direction="down"
        :trend-up="stats.overdue_trend >= 0"
        :trendValue="Math.abs(stats.overdue_trend).toFixed(1) + '%'"
        variant="danger"
      />
    </div>

    <div class="grid chart-layout gap-lg">
      <GlassCard>
        <div class="glass-card-header">
          <h3 class="glass-card-title">{{ chartTitle }}</h3>
        </div>
        <div class="chart-container">
          <canvas ref="barChartCanvas"></canvas>
        </div>
      </GlassCard>

      <GlassCard>
        <div class="glass-card-header">
          <h3 class="glass-card-title">收款结构</h3>
        </div>
        <div class="chart-container">
          <canvas ref="doughnutChartCanvas"></canvas>
        </div>
      </GlassCard>
    </div>
  </div>
</template>

<style scoped>
/* 工具栏 */
.analytics-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
  flex-wrap: wrap;
}

.chart-layout {
  grid-template-columns: 1fr 1fr;
}

@media (max-width: 1024px) {
  .chart-layout {
    grid-template-columns: 1fr;
  }
}

.chart-container {
  position: relative;
  height: 300px;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .analytics-toolbar {
    flex-wrap: wrap;
    gap: var(--spacing-sm);
  }

  .analytics-toolbar > .flex {
    flex-wrap: nowrap;
  }

  .analytics-toolbar > button {
    flex-shrink: 0;
  }

  .btn-text {
    display: none;
  }

  .chart-container {
    height: 250px;
  }
}
</style>
