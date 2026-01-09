<script setup lang="ts">
import { computed } from 'vue'
import GlassCard from '@/components/common/GlassCard.vue'

const props = defineProps<{
  label: string
  value?: string | number
  icon: string
  trend?: string
  trendValue?: string // For compatibility with AnalyticsView usage intention
  trendUp?: boolean
  trendDirection?: 'up' | 'down' // For compatibility
  iconColorClass?: string
  variant?: 'primary' | 'success' | 'warning' | 'danger'
  suffix?: string
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
      <i :class="isTrendUp ? 'ri-arrow-up-line' : 'ri-arrow-down-line'"></i> {{ displayTrend }}
    </div>
  </GlassCard>
</template>

<style scoped>
/* 样式已迁移至 liquid-glass.css，移除本地覆盖以保证 1:1 还原 */
</style>
