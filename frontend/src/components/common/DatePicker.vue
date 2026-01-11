<script setup lang="ts">
/**
 * @file DatePicker.vue
 * @description 日期选择器组件
 * 支持年/月切换，日期选择，以及与 V-Model 的双向绑定。
 * 样式适配 Glassmorphism 设计风格。
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import dayjs from 'dayjs'

const props = defineProps<{
  modelValue: string    // 绑定的日期字符串 (YYYY-MM-DD)
  placeholder?: string  // 占位符
  required?: boolean    // 是否必填
  disabled?: boolean    // 是否禁用
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const isOpen = ref(false)
const wrapperRef = ref<HTMLElement | null>(null)

// 视图模式：'day' | 'month' | 'year'
type ViewMode = 'day' | 'month' | 'year'
const viewMode = ref<ViewMode>('day')

// 当前视图日期 (用于控制日历面板显示的月份)
const viewDate = ref(dayjs())

// 监听 modelValue 变化，同步视图日期
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    const d = dayjs(newVal)
    if (d.isValid()) {
      viewDate.value = d
    }
  } else {
      // 如果被清空，保持当前视图日期不变，优化体验
      if (!viewDate.value.isValid()) viewDate.value = dayjs()
  }
}, { immediate: true })

const formattedValue = computed(() => {
  if (!props.modelValue) return ''
  return dayjs(props.modelValue).format('YYYY-MM-DD')
})

const year = computed(() => viewDate.value.year())
const month = computed(() => viewDate.value.month()) // 0-indexed (0=一月)

// --- 年份范围计算 (Year View) ---
// 显示 12 个年份，以当前视图年份所属的 10 年区间为基础
const yearRangeStart = computed(() => Math.floor(year.value / 10) * 10)
const yearsList = computed(() => {
  const start = yearRangeStart.value
  const list = []
  // 生成 12 个年份 (例如 2020-2031)
  for (let i = 0; i < 12; i++) {
    const y = start + i
    list.push({
      year: y,
      isCurrent: y === year.value, // 当前视图年份
      isSelected: props.modelValue ? dayjs(props.modelValue).year() === y : false
    })
  }
  return list
})

const yearRangeLabel = computed(() => `${yearRangeStart.value}年 - ${yearRangeStart.value + 11}年`)

// --- 月份列表 (Month View) ---
const monthsList = computed(() => {
  const list = []
  for (let i = 0; i < 12; i++) {
    list.push({
      index: i,
      label: `${i + 1}月`,
      isCurrent: i === month.value,
      isSelected: props.modelValue ? (dayjs(props.modelValue).year() === year.value && dayjs(props.modelValue).month() === i) : false
    })
  }
  return list
})

// --- 日历网格计算逻辑 (Day View) ---
const days = computed(() => {
  const startOfMonth = viewDate.value.startOf('month')
  const startDayOfWeek = startOfMonth.day() // 0 (周日) 到 6 (周六)
  
  const daysArray = []
  
  // 1. 上个月的剩余日期填充 (补齐开头)
  const prevMonth = viewDate.value.subtract(1, 'month')
  const daysInPrevMonth = prevMonth.daysInMonth()
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    daysArray.push({
      date: prevMonth.date(daysInPrevMonth - i),
      isCurrentMonth: false,
      isToday: false,
      isSelected: false
    })
  }
  
  // 2. 当前月的所有日期
  const daysInMonth = viewDate.value.daysInMonth()
  const today = dayjs()
  for (let i = 1; i <= daysInMonth; i++) {
    const d = viewDate.value.date(i)
    daysArray.push({
      date: d,
      isCurrentMonth: true,
      isToday: d.isSame(today, 'day'),
      isSelected: props.modelValue ? d.isSame(dayjs(props.modelValue), 'day') : false
    })
  }
  
  // 3. 下个月的日期填充 (补齐结尾，确保总共 6 行 42 个单元格)
  const remaining = 42 - daysArray.length
  const nextMonth = viewDate.value.add(1, 'month')
  for (let i = 1; i <= remaining; i++) {
     daysArray.push({
      date: nextMonth.date(i),
      isCurrentMonth: false,
      isToday: false,
      isSelected: false
    })
  }
  
  return daysArray
})

const weekDays = ['日', '一', '二', '三', '四', '五', '六']

// Actions
const togglePicker = () => {
    if (props.disabled) return
    isOpen.value = !isOpen.value
    if (isOpen.value) {
        viewMode.value = 'day' // 重置为日期模式
    }
}

// 切换选择模式
const setViewMode = (mode: ViewMode) => {
  viewMode.value = mode
}

// Select Actions
const selectDate = (date: dayjs.Dayjs) => {
    emit('update:modelValue', date.format('YYYY-MM-DD'))
    isOpen.value = false
    viewDate.value = date
}

const selectMonth = (monthIndex: number) => {
    viewDate.value = viewDate.value.month(monthIndex)
    viewMode.value = 'day' // 选择月份后进入日期选择
}

const selectYear = (yearNum: number) => {
    viewDate.value = viewDate.value.year(yearNum)
    viewMode.value = 'month' // 选择年份后进入月份选择
}

// Navigation Actions
const handlePrev = () => {
    if (viewMode.value === 'day') {
        viewDate.value = viewDate.value.subtract(1, 'month')
    } else if (viewMode.value === 'month') {
        viewDate.value = viewDate.value.subtract(1, 'year')
    } else if (viewMode.value === 'year') {
        viewDate.value = viewDate.value.subtract(10, 'year')
    }
}

const handleNext = () => {
    if (viewMode.value === 'day') {
        viewDate.value = viewDate.value.add(1, 'month')
    } else if (viewMode.value === 'month') {
        viewDate.value = viewDate.value.add(1, 'year')
    } else if (viewMode.value === 'year') {
        viewDate.value = viewDate.value.add(10, 'year')
    }
}

const handleSuperPrev = () => {
    if (viewMode.value === 'day') {
        viewDate.value = viewDate.value.subtract(1, 'year')
    }
    // Month/Year modes mainly use single arrows for navigation, 
    // but we can map super arrows to larger jumps if needed.
    // Logic kept simple based on requirements.
}

const handleSuperNext = () => {
    if (viewMode.value === 'day') {
        viewDate.value = viewDate.value.add(1, 'year')
    }
}

// Click Outside
const handleClickOutside = (event: MouseEvent) => {
  if (wrapperRef.value && !wrapperRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="date-picker-wrapper" ref="wrapperRef">
    <!-- Input Trigger -->
    <div class="input-trigger" @click="togglePicker" :class="{ 'is-disabled': disabled }">
        <input 
            type="text" 
            readonly 
            :value="formattedValue" 
            :placeholder="placeholder || '请选择日期'"
            :required="required"
            class="readonly-input"
        />
        <i class="ri-calendar-line icon"></i>
    </div>

    <!-- Dropdown Panel -->
    <transition name="fade-slide">
        <div v-if="isOpen" class="picker-panel glass-panel">
            <!-- Header -->
            <div class="picker-header">
                <!-- Left Controls -->
                <div class="header-controls">
                    <button v-if="viewMode === 'day'" type="button" class="nav-btn" @click.stop="handleSuperPrev"><i class="ri-arrow-left-double-line"></i></button>
                    <button type="button" class="nav-btn" @click.stop="handlePrev"><i class="ri-arrow-left-s-line"></i></button>
                </div>
                
                <!-- Center Title -->
                <div class="current-date">
                    <template v-if="viewMode === 'day'">
                        <span class="year-btn" @click.stop="setViewMode('year')">{{ year }}年</span>
                        <span class="month-btn" @click.stop="setViewMode('month')">{{ month + 1 }}月</span>
                    </template>
                    <template v-else-if="viewMode === 'month'">
                         <span class="year-btn" @click.stop="setViewMode('year')">{{ year }}年</span>
                    </template>
                    <template v-else-if="viewMode === 'year'">
                         <span>{{ yearRangeLabel }}</span>
                    </template>
                </div>
                
                <!-- Right Controls -->
                <div class="header-controls">
                    <button type="button" class="nav-btn" @click.stop="handleNext"><i class="ri-arrow-right-s-line"></i></button>
                    <button v-if="viewMode === 'day'" type="button" class="nav-btn" @click.stop="handleSuperNext"><i class="ri-arrow-right-double-line"></i></button>
                </div>
            </div>
            
            <!-- Day View -->
            <div v-if="viewMode === 'day'" class="day-view">
                <!-- Weekdays -->
                <div class="weekdays-row">
                    <span v-for="day in weekDays" :key="day" class="weekday">{{ day }}</span>
                </div>
                
                <!-- Days Grid -->
                <div class="days-grid">
                    <div 
                        v-for="(item, idx) in days" 
                        :key="idx" 
                        class="day-cell"
                        :class="{ 
                            'is-current-month': item.isCurrentMonth,
                            'is-prev-next': !item.isCurrentMonth,
                            'is-today': item.isToday,
                            'is-selected': item.isSelected
                        }"
                        @click.stop="selectDate(item.date)"
                    >
                        {{ item.date.date() }}
                    </div>
                </div>
            </div>

            <!-- Month View -->
            <div v-else-if="viewMode === 'month'" class="month-view">
                <div 
                    v-for="m in monthsList" 
                    :key="m.index"
                    class="month-cell"
                    :class="{ 'is-current': m.isCurrent, 'is-selected': m.isSelected }"
                    @click.stop="selectMonth(m.index)"
                >
                    {{ m.label }}
                </div>
            </div>

            <!-- Year View -->
            <div v-else-if="viewMode === 'year'" class="year-view">
                <div 
                    v-for="y in yearsList" 
                    :key="y.year"
                    class="year-cell"
                    :class="{ 'is-current': y.isCurrent, 'is-selected': y.isSelected }"
                    @click.stop="selectYear(y.year)"
                >
                    {{ y.year }}
                </div>
            </div>

        </div>
    </transition>
  </div>
</template>

<style scoped>
.date-picker-wrapper {
    position: relative;
    width: 100%;
}

.input-trigger {
    position: relative;
    cursor: pointer;
}

.input-trigger.is-disabled {
    opacity: 0.6;
    pointer-events: none;
}

.readonly-input {
    width: 100%;
    padding: 10px 14px;
    padding-right: 36px;
    font-size: 14px;
    color: var(--text-primary);
    background: var(--bg-base);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    outline: none;
    cursor: pointer; /* Important for readonly feel */
    transition: all 0.2s;
}

.readonly-input:focus {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(255, 159, 10, 0.1);
}

.icon {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-secondary);
    pointer-events: none;
    font-size: 16px;
}

.picker-panel {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    width: 280px;
    min-height: 290px;
    z-index: 100;
    padding: 16px;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.3);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
}

[data-theme='dark'] .picker-panel {
    background: rgba(30, 30, 30, 0.95);
    border-color: rgba(255, 255, 255, 0.05);
}

/* Header */
.picker-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    height: 32px;
}

.header-controls {
    display: flex;
    gap: 4px;
}

.current-date {
    font-weight: 600;
    display: flex;
    gap: 8px;
    color: var(--text-primary);
    font-size: 15px;
}

.year-btn, .month-btn {
    cursor: pointer;
    transition: color 0.2s;
}
.year-btn:hover, .month-btn:hover {
    color: var(--color-primary);
}

.nav-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    color: var(--text-secondary);
    transition: all 0.2s;
    background: transparent;
    border: none;
    cursor: pointer;
}

.nav-btn:hover {
    background: rgba(0,0,0,0.05);
    color: var(--color-primary);
}

[data-theme='dark'] .nav-btn:hover {
    background: rgba(255,255,255,0.1);
}

/* Weekdays */
.weekdays-row {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    margin-bottom: 8px;
}

.weekday {
    text-align: center;
    font-size: 12px;
    color: var(--text-secondary);
    font-weight: 500;
}

/* Days Grid */
.days-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    row-gap: 4px;
}

.day-cell {
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    color: var(--text-primary);
}

.day-cell.is-prev-next {
    color: var(--text-placeholder);
    opacity: 0.5;
}

.day-cell:hover {
    background: rgba(var(--color-primary-rgb), 0.1);
    color: var(--color-primary);
}

.day-cell.is-today {
    color: var(--color-primary);
    font-weight: 600;
}

.day-cell.is-selected {
    background: var(--color-primary);
    color: white;
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(var(--color-primary-rgb), 0.4);
}

.day-cell.is-selected:hover {
    background: var(--color-primary);
    opacity: 0.9;
}

/* Month & Year Views */
.month-view, .year-view {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    padding: 8px 0;
    flex: 1;
}

.month-cell, .year-cell {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 48px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    color: var(--text-primary);
    transition: all 0.2s;
}

.month-cell:hover, .year-cell:hover {
    background: rgba(var(--color-primary-rgb), 0.1);
    color: var(--color-primary);
}

.month-cell.is-current, .year-cell.is-current {
    font-weight: bold;
    color: var(--color-primary);
}

.month-cell.is-selected, .year-cell.is-selected {
    background: var(--color-primary);
    color: white;
    font-weight: 600;
    box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.3);
}

/* Animations */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}
</style>
