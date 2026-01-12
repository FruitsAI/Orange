/**
 * @file api/auth.ts
 * @description 用户认证相关 API
 * 包含登录、注册、注销、密码修改及用户信息管理接口。
 */
import api, { type ApiResponse } from './index'

// 用户类型定义
export interface User {
  id: number
  username: string // 用户名
  name: string     // 真实姓名
  email: string    // 邮箱
  phone: string    // 手机号
  avatar: string   // 头像 URL
  role: string     // 角色 (admin/user)
  department: string // 部门
  position: string   // 职位
  status: number     // 状态 (1:正常, 0:禁用)
}

// 登录请求参数
export interface LoginRequest {
  username: string
  password: string
}

// 登录响应数据
export interface LoginResponse {
  token: string // JWT Token
  user: User    // 用户信息
}

// 注册请求参数
export interface RegisterRequest {
  username: string
  name: string
  email?: string
  phone?: string
  password: string
}

// 修改密码请求参数
export interface ChangePasswordRequest {
  old_password: string
  new_password: string
}

// 更新个人信息请求参数
export interface UpdateProfileRequest {
  name?: string
  email?: string
  phone?: string
  department?: string
  position?: string
}

// 认证 API 集合
// 列表请求参数
export interface UserListParams {
  page: number
  page_size: number
  keyword?: string
  _t?: number // Cache busting
}

// 用户列表响应
export interface UserListResult {
  list: User[]
  total: number
}

// 创建用户请求 (Admin)
export interface CreateUserRequest {
  username: string
  name: string
  email?: string
  phone?: string
  password: string
  role: 'admin' | 'user'
}

// 更新用户请求 (Admin)
export interface UpdateUserRequest {
  name?: string
  email?: string
  phone?: string
  department?: string
  position?: string
  role?: string
  status?: number
}

// 认证 API 集合
export const authApi = {
  // 登录
  login: (data: LoginRequest) =>
    api.post<ApiResponse<LoginResponse>>('/auth/login', data),

  // 注册
  register: (data: RegisterRequest) =>
    api.post<ApiResponse<null>>('/auth/register', data),

  // 退出登录
  logout: () =>
    api.post<ApiResponse<null>>('/auth/logout'),

  // 获取当前用户
  getCurrentUser: () =>
    api.get<ApiResponse<User>>('/users/me'),

  // 更新个人信息
  updateProfile: (data: UpdateProfileRequest) =>
    api.put<ApiResponse<User>>('/users/me', data),

  // 修改密码
  changePassword: (data: ChangePasswordRequest) =>
    api.put<ApiResponse<null>>('/users/me/password', data),

  // === User Management (Admin) ===
  getUsers: (params: UserListParams) =>
    api.get<ApiResponse<UserListResult>>('/users', { params }),

  createUser: (data: CreateUserRequest) =>
    api.post<ApiResponse<null>>('/users', data),

  updateUser: (id: number, data: UpdateUserRequest) =>
    api.put<ApiResponse<null>>(`/users/${id}`, data),

  deleteUser: (id: number) =>
    api.delete<ApiResponse<null>>(`/users/${id}`),

  resetPassword: (id: number, password: string) =>
    api.put<ApiResponse<null>>(`/users/${id}/password`, { new_password: password }),
}
