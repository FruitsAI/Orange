/**
 * @file stores/auth.ts
 * @description 用户认证状态管理
 * 管理用户登录状态、Token、用户信息及相关操作（登录、注销、更新信息）。
 */
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { authApi, type User, type LoginRequest } from '@/api/auth'
import { clearAuthStorage, getStoredToken, getStoredUser, saveAuthState, saveStoredUser } from '@/utils/authStorage'

export const useAuthStore = defineStore('auth', () => {
  // State: 从 sessionStorage 初始化状态，实现更安全的持久化
  // 安全说明：使用 sessionStorage 而非 localStorage
  // - sessionStorage 在浏览器关闭后自动清除
  // - 降低了 XSS 攻击窃取 Token 的风险
  // - 用户需要重新登录，但安全性更高
  const token = ref<string | null>(getStoredToken())
  const user = ref<User | null>(getStoredUser<User>())
  const loading = ref(false) // 异步操作加载状态
  const error = ref<string | null>(null) // 错误信息

  // Getters (Computed)
  // 判断是否有 Token
  const isLoggedIn = computed(() => !!token.value)
  // 与 isLoggedIn 相同，可根据业务扩展
  const isAuthenticated = computed(() => !!token.value)

  /**
   * 用户登录
   * @param credentials 登录凭证 (username, password)
   * @returns 登录成功返回 true, 失败返回 false
   */
  async function login(credentials: LoginRequest) {
    loading.value = true
    error.value = null

    try {
      const response = await authApi.login(credentials)
      const { token: newToken, user: userData } = response.data.data

      // 保存到 state
      token.value = newToken
      user.value = userData
      saveAuthState(newToken, userData)

      return true
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : '登录失败'
      return false
    } finally {
      loading.value = false
    }
  }


  /**
   * 退出登录
   * 清除服务端 Session 及本地 Token 和用户信息
   */
  async function logout() {
    try {
      await authApi.logout()
    } catch {
      // 忽略错误，仍然清除本地状态
    }

    // 清除状态
    token.value = null
    user.value = null
    clearAuthStorage()
  }

  /**
   * 刷新当前用户信息
   * 从后端获取最新的用户信息并更新本地存储
   */
  async function refreshUser() {
    if (!token.value) return

    try {
      const response = await authApi.getCurrentUser()
      user.value = response.data.data
      saveStoredUser(response.data.data)
    } catch {
      // Token 可能已过期
      await logout()
    }
  }

  /**
   * 更新个人资料
   * @param data 需要更新的字段
   */
  async function updateProfile(data: { name?: string; phone?: string; department?: string; position?: string }) {
    loading.value = true
    error.value = null

    try {
      const response = await authApi.updateProfile(data)
      user.value = response.data.data
      saveStoredUser(response.data.data)
      return true
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : '更新失败'
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * 修改密码
   * @param oldPassword 旧密码
   * @param newPassword 新密码
   */
  async function changePassword(oldPassword: string, newPassword: string) {
    loading.value = true
    error.value = null

    try {
      await authApi.changePassword({ old_password: oldPassword, new_password: newPassword })
      return true
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : '修改失败'
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    token,
    user,
    loading,
    error,
    // Computed
    isLoggedIn,
    isAuthenticated,
    // Actions
    login,
    logout,
    refreshUser,
    updateProfile,
    changePassword,
  }
})
