<script setup lang="ts">
/**
 * @file CalendarView.vue
 * @description 收款日历页面
 * 这是一个复杂的自定义日历组件，用于展示每月的收款计划。
 * 包含日历网格视图和侧边栏详情视图，支持月度切换和按天查看。
 */
import { ref, computed, onMounted, watch } from 'vue'
import GlassCard from '@/components/common/GlassCard.vue'
import { paymentApi, type Payment } from '@/api/project'
import { formatDate } from '@/utils/format'
import dayjs from 'dayjs'

import { dictionaryApi, type DictionaryItem } from '@/api/dictionary'

const currentDate = ref(new Date())
const year = computed(() => currentDate.value.getFullYear())
const month = computed(() => currentDate.value.getMonth())

const weekDays = ["日", "一", "二", "三", "四", "五", "六"]

// 收款数据
const payments = ref<Payment[]>([])
const paymentStageOptions = ref<DictionaryItem[]>([])

// 获取字典数据
const fetchDictionaries = async () => {
  try {
    const res = await dictionaryApi.getItems('payment_stage')
    if (res.data.code === 0) {
      paymentStageOptions.value = res.data.data || []
    }
  } catch (error) {
    console.error('Failed to fetch dictionaries:', error)
  }
}

/**
 * 获取当月数据
 * 自动计算当前视图年月的起始和结束日期，查询该范围内的所有收款。
 */
const fetchPayments = async () => {
  const start = dayjs(new Date(year.value, month.value, 1)).format('YYYY-MM-01')
  const end = dayjs(new Date(year.value, month.value + 1, 0)).format('YYYY-MM-DD')
  
  try {
    const res = await paymentApi.list({ 
      start_date: start, 
      end_date: end,
      _t: Date.now() 
    })
    if (res.data.code === 0) {
      payments.value = res.data.data || []
    }
  } catch (error) {
    console.error('Failed to fetch payments:', error)
  }
}

// 监听月份变化重新获取数据
watch([year, month], () => {
  fetchPayments()
})

onMounted(async () => {
  await fetchDictionaries()
  await fetchPayments()
})

interface DisplayDay {
  day: number
  type: 'prev' | 'current' | 'next'
  hasEvent?: boolean
  isToday?: boolean
  dateStr?: string
}

/**
 * 日历核心逻辑：生成 6x7 网格所需要的所有日期对象
 * 包括上月剩余天数、当月天数、下月补充天数。
 */
const calendarDays = computed<DisplayDay[]>(() => {
  const y = year.value
  const m = month.value
  const firstDayOfWeek = new Date(y, m, 1).getDay() // 0-6
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const lastMonthDays = new Date(y, m, 0).getDate()

  const days: DisplayDay[] = []

  // 1. 上月余数
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    days.push({ day: lastMonthDays - i, type: 'prev' })
  }

  // 2. 当月日期
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === y && today.getMonth() === m
  const paymentDates = payments.value.map(p => p.plan_date.split('T')[0])

  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = dayjs(new Date(y, m, i)).format('YYYY-MM-DD')
    days.push({
      day: i,
      type: 'current',
      hasEvent: paymentDates.includes(dateStr),
      isToday: isCurrentMonth && today.getDate() === i,
      dateStr
    })
  }

  // 3. 下月填充至 42 格 (6行)
  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    days.push({ day: i, type: 'next' })
  }

  return days
})

const changeMonth = (delta: number) => {
  currentDate.value = new Date(year.value, month.value + delta, 1)
}

const setToday = () => {
  currentDate.value = new Date()
}

// 侧边栏数据 - 选中日期的收款（默认为今日，如果今日无数据则显示当月即将到期）
const selectedDate = ref(dayjs().format('YYYY-MM-DD'))

const selectDay = (day: DisplayDay) => {
  if (day.type === 'current' && day.dateStr) {
    selectedDate.value = day.dateStr
  }
}

// 侧边栏展示逻辑：选中日期的收款
const selectedDatePayments = computed(() => {
  return payments.value.filter(p => p.plan_date.startsWith(selectedDate.value))
})

// 当月所有收款（按时间排序），限制显示前3条
const monthlyPayments = computed(() => {
  const sorted = [...payments.value].sort((a, b) => new Date(a.plan_date).getTime() - new Date(b.plan_date).getTime())
  return sorted.slice(0, 3)
})

const formatStage = (p: Payment) => {
  const stageItem = paymentStageOptions.value.find(s => s.value === p.stage)
  const stageName = stageItem ? stageItem.label : p.stage
  
  if (p.percentage) {
    // 保留两位小数，如果是整数去掉小数部分 (例如 30.00 -> 30, 33.3333 -> 33.33)
    const percentage = Number(p.percentage).toFixed(2).replace(/\.0+$/, '').replace(/(\.[0-9]*[1-9])0+$/, '$1')
    return `${stageName} (${percentage}%)`
  }
  return stageName
}

const formatAmount = (amount: number) => {
  return `¥${amount.toLocaleString()}`
}

const formatDateShort = (date: string) => {
  return dayjs(date).format('MM-DD')
}
</script>

<template>
  <div class="calendar-view">
    <div class="main-layout grid gap-lg">
      <!-- Calendar Main -->
      <GlassCard>
        <div class="glass-card-header mb-md">
          <div class="flex items-center gap-md">
            <button class="btn btn-ghost btn-icon" @click="changeMonth(-1)">
              <i class="ri-arrow-left-s-line"></i>
            </button>
            <h3 class="glass-card-title text-lg">{{ year }}年{{ month + 1 }}月</h3>
            <button class="btn btn-ghost btn-icon" @click="changeMonth(1)">
              <i class="ri-arrow-right-s-line"></i>
            </button>
          </div>
          <div class="flex gap-sm">
            <button class="btn btn-ghost btn-sm" @click="changeMonth(-1)">上月</button>
            <button class="btn btn-secondary btn-sm" @click="setToday">本月</button>
            <button class="btn btn-ghost btn-sm" @click="changeMonth(1)">下月</button>
          </div>
        </div>

        <div class="grid grid-cols-7 text-center mb-4">
          <div
            v-for="d in weekDays"
            :key="d"
            class="text-sm text-secondary font-medium p-sm"
          >
            {{ d }}
          </div>
        </div>

        <div class="grid grid-cols-7 gap-1" id="calendarGrid">
          <div
            v-for="(item, idx) in calendarDays"
            :key="idx"
            class="calendar-day"
            :class="{
              'text-tertiary': item.type !== 'current',
              'today': item.isToday,
              'selected': item.dateStr === selectedDate
            }"
            @click="selectDay(item)"
          >
            {{ item.day }}
            <span v-if="item.hasEvent" class="event-dot"></span>
          </div>
        </div>
      </GlassCard>

      <!-- Sidebar -->
      <div class="flex flex-col gap-md">
        <GlassCard>
          <div class="glass-card-header">
            <h3 class="glass-card-title">选中日期收款</h3>
            <span class="text-sm text-secondary">{{ formatDate(selectedDate) }}</span>
          </div>
          <div v-if="selectedDatePayments.length === 0" class="flex flex-col items-center justify-center p-lg text-center">
            <i class="ri-calendar-check-line text-4xl text-tertiary mb-md"></i>
            <p class="text-secondary">该日无收款计划</p>
          </div>
          <div v-else class="flex flex-col gap-sm p-sm">
             <div
              v-for="(p, idx) in selectedDatePayments"
              :key="idx"
              class="flex items-center justify-between p-sm rounded-md border border-transparent bg-soft"
            >
              <div>
                <div class="font-medium text-sm">{{ formatStage(p) }}</div>
                <div class="text-sm text-secondary">{{ p.project?.name || '未知项目' }}</div>
              </div>
              <div class="text-right">
                <div class="font-semibold">¥{{ formatAmount(p.amount) }}</div>
                <div class="text-sm" :class="p.status === 'overdue' ? 'text-danger' : 'text-secondary'">
                   {{ p.status === 'paid' ? '已收' : (p.status === 'overdue' ? '逾期' : '待收') }}
                </div>
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div class="glass-card-header mb-md">
            <h3 class="glass-card-title">近期收款</h3>
          </div>
          <div class="flex flex-col gap-sm">
            <div
              v-for="(p, idx) in monthlyPayments"
              :key="idx"
              class="flex items-center justify-between p-sm rounded-md border border-transparent hover:bg-bg-hover transition-colors"
              :class="{ 'bg-danger-soft': p.status === 'overdue' }"
              style="border-radius: var(--radius-sm);"
            >
              <div>
                <div class="font-medium text-sm">{{ formatStage(p) }}</div>
                <div class="text-sm text-secondary">{{ p.project?.name }}</div>
              </div>
              <div class="text-right">
                <div class="font-semibold">¥{{ formatAmount(p.amount) }}</div>
                <div
                  class="text-sm"
                  :class="p.status === 'overdue' ? 'text-danger' : 'text-secondary'"
                >
                  {{ formatDateShort(p.plan_date) }}
                </div>
              </div>
            </div>
          </div>
          <div v-if="monthlyPayments.length === 0" class="text-center text-secondary py-md text-sm">
            本月无收款计划
          </div>
        </GlassCard>
      </div>
    </div>
  </div>
</template>

<style scoped>
.main-layout {
  grid-template-columns: 2fr 1fr;
}

@media (max-width: 1024px) {
  .main-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .calendar-day {
    height: 48px;
    padding: 4px;
    font-size: 13px;
  }

  .event-dot {
    bottom: 4px;
    right: 4px;
    width: 4px;
    height: 4px;
  }
}

.calendar-day {
  height: 56px;
  border-radius: var(--radius-sm);
  padding: 8px;
  font-weight: 500;
  transition: all 0.2s;
  cursor: pointer;
  position: relative;
  border: 1px solid transparent; /* Prevent layout shift on hover */
}

.calendar-day:hover {
  background: rgba(var(--text-primary-rgb), 0.03);
}

[data-theme='dark'] .calendar-day:hover {
  background: rgba(255, 255, 255, 0.05);
}

.calendar-day.today {
  background: var(--bg-elevated);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.calendar-day.selected {
  background: rgba(var(--color-primary-rgb), 0.1);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.event-dot {
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-primary);
}

.bg-danger-soft {
  background: rgba(239, 68, 68, 0.05);
}
</style>
