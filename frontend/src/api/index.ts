/**
 * @file api/index.ts
 * @description API 请求基础配置
 * 封装 Axios 实例，配置基础 URL、超时时间，并实现请求与响应拦截器。
 * 处理 Token 自动注入、统一错误处理以及登录过期跳转逻辑。
 */
import axios, { type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { clearAuthStorage, getStoredToken } from '@/utils/authStorage'

// API 统一响应结构
export interface ApiResponse<T = unknown> {
  code: number    // 业务状态码 (0: 成功, 其他: 失败)
  message: string // 响应消息
  data: T         // 响应数据
}

// 通用分页响应数据结构
export interface PageData<T> {
  list: T[]         // 数据列表
  total: number     // 总记录数
  page: number      // 当前页码
  page_size: number // 每页条数
}

// 创建全局 Axios 实例
const api: AxiosInstance = axios.create({
  baseURL: '/api/v1', // API 接口前缀
  timeout: 10000,     // 请求超时时间 (10秒)
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器：自动注入 JWT Token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getStoredToken()
    if (token && config.headers) {
      // 如果存在 Token，添加到 Authorization 头 (Bearer Schema)
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 处理 Token 过期逻辑的全局回调
// 为了避免循环引用 (store 依赖 api, api 依赖 store)，此处采用 setter 注入方式
let authLogout: (() => void) | null = null

export const setAuthLogout = (fn: () => void) => {
  authLogout = fn
}

// 响应拦截器：处理业务错误和 Token 过期

api.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const { code, message } = response.data

    // 成功
    if (code === 0) {
      return response
    }

    // Token 过期
    if (code === 2002) {
      if (authLogout) {
        authLogout()
      } else {
        clearAuthStorage()
        window.location.href = '/login'
      }
      return Promise.reject(new Error('登录已过期，请重新登录'))
    }

    // 其他错误
    return Promise.reject(new Error(message || '请求失败'))
  },
  (error) => {
    const apiError = error.response?.data as Partial<ApiResponse> | undefined
    const code = apiError?.code

    if (error.response?.status === 401 || code === 2001 || code === 2002) {
      if (authLogout) {
        authLogout()
      } else {
        clearAuthStorage()
        window.location.href = '/login'
      }
    }

    return Promise.reject(new Error(apiError?.message || error.message || '请求失败'))
  }
)

export default api
