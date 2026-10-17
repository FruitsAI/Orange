/**
 * @file project.ts
 * @description 项目相关类型定义
 */

/**
 * 项目列表查询参数
 */
export interface ProjectListParams {
  page: number
  page_size: number
  keyword?: string
  status?: string
  _t?: number // 防止缓存的时间戳
}
