/**
 * @file api/project.ts
 * @description 项目与款项管理 API
 * 涵盖项目增删改查、款项管理、合同编号生成等核心业务接口。
 */
import api, { type ApiResponse, type PageData } from './index'
import type { User } from './auth'

// 项目数据模型
export interface Project {
  id: number
  name: string            // 项目名称
  company: string         // 所属公司
  total_amount: number    // 合同总金额
  received_amount: number // 已收款金额
  status: 'active' | 'completed' | 'pending' | 'notstarted' | 'archived' // 项目状态
  type: string            // 项目类型
  contract_number: string // 合同编号
  contract_date: string   // 签约日期
  payment_method: string  // 付款方式
  start_date: string      // 开始日期
  end_date: string        // 结束日期
  description: string     // 备注说明
  create_time: string     // 创建时间
  payments?: Payment[]    // 关联的款项列表 (可选)
  user?: User             // 负责人信息 (可选)
}

// 款项数据模型
export interface Payment {
  id: number
  project_id: number      // 关联项目 ID
  stage: string           // 阶段名称
  amount: number          // 金额
  percentage: number      // 占比 (%)
  plan_date: string       // 计划收款日期
  status: 'confirmed' | 'paid' | 'pending' | 'overdue' // 状态
  actual_date: string     // 实际收款日期
  method: string          // 收款方式
  remark: string          // 备注
  project?: Project       // 关联项目 (可选)
}

// 项目列表查询参数
export interface ProjectListParams {
  page?: number
  page_size?: number
  status?: string
  keyword?: string // 搜索关键词 (名称/公司)
}

// 创建/更新项目请求参数
export interface ProjectRequest {
  name: string
  company: string
  total_amount: number
  status?: string
  type: string
  contract_number?: string
  contract_date?: string
  payment_method?: string
  start_date: string
  end_date: string
  description?: string
}

// 创建收款请求参数
export interface PaymentRequest {
  project_id: number
  stage: string
  amount: number
  percentage?: number
  plan_date: string
  status?: string
  method?: string
  remark?: string
}

// 确认收款请求参数
export interface ConfirmPaymentRequest {
  actual_date: string
  method?: string
}

// 项目 API 集合
export const projectApi = {
  // 获取项目列表
  list: (params?: ProjectListParams) =>
    api.get<ApiResponse<PageData<Project>>>('/projects', { params }),

  // 获取项目详情
  get: (id: number) =>
    api.get<ApiResponse<Project>>(`/projects/${id}`, { params: { _t: Date.now() } }),

  // 创建项目
  create: (data: ProjectRequest) =>
    api.post<ApiResponse<Project>>('/projects', data),

  // 更新项目
  update: (id: number, data: ProjectRequest) =>
    api.put<ApiResponse<Project>>(`/projects/${id}`, data),

  // 删除项目
  delete: (id: number) =>
    api.delete<ApiResponse<null>>(`/projects/${id}`),

  // 归档项目
  archive: (id: number) =>
    api.post<ApiResponse<null>>(`/projects/${id}/archive`),

  // 获取项目收款列表
  getPayments: (projectId: number) =>
    api.get<ApiResponse<Payment[]>>(`/projects/${projectId}/payments`, { params: { _t: Date.now() } }),

  // 检查合同编号是否已存在
  checkContractNumber: (contractNumber: string, excludeId?: number) =>
    api.get<ApiResponse<{ exists: boolean }>>('/projects/check-contract-number', { 
      params: { contract_number: contractNumber, exclude_id: excludeId || 0, _t: Date.now() } 
    }),

  // 生成下一个可用的合同编号
  generateContractNumber: (date: string) =>
    api.get<ApiResponse<{ contract_number: string }>>('/projects/generate-contract-number', { 
      params: { date, _t: Date.now() } 
    }),
}

// 收款 API 集合
export const paymentApi = {
  // 获取收款列表
  list: (params?: { project_id?: number; status?: string; start_date?: string; end_date?: string; _t?: number }) =>
    api.get<ApiResponse<Payment[]>>('/payments', { params }),

  // 创建收款
  create: (data: PaymentRequest) =>
    api.post<ApiResponse<Payment>>('/payments', data),

  // 更新收款
  update: (id: number, data: PaymentRequest) =>
    api.put<ApiResponse<Payment>>(`/payments/${id}`, data),

  // 删除收款
  delete: (id: number) =>
    api.delete<ApiResponse<null>>(`/payments/${id}`),

  // 确认收款
  confirm: (id: number, data: ConfirmPaymentRequest) =>
    api.post<ApiResponse<null>>(`/payments/${id}/confirm`, data),
}
