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
 * 格式化日期时间
 * @param datetime 日期时间字符串或Date对象
 * @returns 格式化后的日期时间字符串，如 "2024-01-01 12:30"
 */
export function formatDateTime(datetime: string | Date | null | undefined): string {
  return formatDate(datetime, 'YYYY-MM-DD HH:mm')
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

/**
 * 格式化百分比
 * @param value 数值（0-100）
 * @param decimals 小数位数，默认1位
 * @returns 格式化后的百分比字符串，如 "85.5%"
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  if (value == null || isNaN(value)) return '0%'
  return `${value.toFixed(decimals)}%`
}

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @returns 格式化后的文件大小，如 "1.5 MB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

/**
 * 截断文本
 * @param text 原始文本
 * @param maxLength 最大长度
 * @param suffix 后缀，默认 '...'
 * @returns 截断后的文本
 */
export function truncate(text: string, maxLength: number, suffix: string = '...'): string {
  if (!text || text.length <= maxLength) return text
  return text.slice(0, maxLength - suffix.length) + suffix
}
