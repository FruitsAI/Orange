<script setup lang="ts">
/**
 * @file StatCard.vue
 * @description 仪表盘统计卡片组件
 * 展示单个核心指标 (如总收入、项目数)，支持显示趋势变化。
 */
import { computed } from 'vue'
import GlassCard from '@/components/common/GlassCard.vue'

const props = defineProps<{
  label: string           // 指标名称
  value?: string | number // 指标值
  icon: string            // 图标类名
  trend?: string          // 趋势文本 (如 "+12%")
  trendPrefix?: string    // 趋势前缀文本 (如 "较上月")
  trendValue?: string     // 兼容性字段 (同 trend)
  trendUp?: boolean       // 是否为上升趋势 (决定颜色)
  trendDirection?: 'up' | 'down' // 兼容性字段
  iconColorClass?: string // 图标颜色样式类
  variant?: 'primary' | 'success' | 'warning' | 'danger' // 预设主题色
  suffix?: string         // 数值后缀 (如单位)
}>()

const computedIconClass = computed(() => {
  if (props.iconColorClass) return props.iconColorClass
  if (props.variant) return `stat-card-icon--${props.variant}`
  return ''
})

const displayTrend = computed(() => props.trend || props.trendValue)

const isTrendUp = computed(() => {
  if (props.trendUp !== undefined) return props.trendUp
  return props.trendDirection === 'up'
})
</script>

<template>
  <GlassCard class="stat-card">
    <div class="stat-card-icon" :class="computedIconClass">
      <i :class="icon"></i>
    </div>
    <div class="stat-card-value">
      <slot name="value">
        {{ value }}<span v-if="suffix" class="text-lg ml-1">{{ suffix }}</span>
      </slot>
    </div>
    <div class="stat-card-label">{{ label }}</div>
    <div 
      v-if="displayTrend"
      class="stat-card-trend" 
      :class="isTrendUp ? 'stat-card-trend--up' : 'stat-card-trend--down'"
    >
      <span v-if="trendPrefix" class="mr-1 opacity-75">{{ trendPrefix }}</span> 
      <i :class="isTrendUp ? 'ri-arrow-up-line' : 'ri-arrow-down-line'"></i> {{ displayTrend }}
    </div>
  </GlassCard>
</template>

<style scoped>
/* 样式已迁移至 liquid-glass.css，移除本地覆盖以保证 1:1 还原 */
</style>
