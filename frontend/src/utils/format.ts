/**
 * @file format.ts
 * @description 通用格式化工具函数
 *
 * 统一项目中的日期、金额、数字等格式化逻辑，避免重复定义
 */

import dayjs from 'dayjs'

/**
 * 格式化金额为人民币
 * @param amount 金额数字
 * @param decimals 小数位数，默认2位
 * @returns 格式化后的金额字符串，如 "¥1,234.56"
 */
export function formatCurrency(amount: number, decimals: number = 2): string {
  if (amount == null || isNaN(amount)) return '¥0.00'
  return `¥${amount.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}`
}

/**
 * 格式化日期
 * @param date 日期字符串或Date对象
 * @param format 格式化模板，默认 'YYYY-MM-DD'
 * @returns 格式化后的日期字符串，无效日期返回 '-'
 */
export function formatDate(date: string | Date | null | undefined, format: string = 'YYYY-MM-DD'): string {
  if (!date) return '-'
  const d = dayjs(date)
  return d.isValid() ? d.format(format) : '-'
}

/**
 * 格式化相对时间（如 "2小时前"）
 * @param date 日期字符串或Date对象
 * @returns 相对时间描述
 */
export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return '-'
  const d = dayjs(date)
  if (!d.isValid()) return '-'

  const now = dayjs()
  const diffMinutes = now.diff(d, 'minute')
  const diffHours = now.diff(d, 'hour')
  const diffDays = now.diff(d, 'day')

  if (diffMinutes < 1) return '刚刚'
  if (diffMinutes < 60) return `${diffMinutes}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffDays < 7) return `${diffDays}天前`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}个月前`
  return `${Math.floor(diffDays / 365)}年前`
}
