/**
 * @file stores/auth.ts
 * @description React/Zustand user authentication state.
 */
import { create } from 'zustand'
import { authApi, type LoginRequest, type User } from '@/api/auth'
import {
  clearAuthStorage,
  getStoredToken,
  getStoredUser,
  saveAuthState,
  saveStoredUser,
} from '@/utils/authStorage'

interface AuthState {
  token: string | null
  user: User | null
  loading: boolean
  error: string | null
  isLoggedIn: boolean
  isAuthenticated: boolean
  login: (credentials: LoginRequest) => Promise<boolean>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  updateProfile: (data: {
    name?: string
    phone?: string
    department?: string
    position?: string
  }) => Promise<boolean>
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>
}

const storedToken = getStoredToken()

const setAuthSession = (token: string | null, user: User | null) => ({
  token,
  user,
  isLoggedIn: Boolean(token),
  isAuthenticated: Boolean(token),
})

export const useAuthStore = create<AuthState>((set, get) => ({
  ...setAuthSession(storedToken, getStoredUser<User>()),
  loading: false,
  error: null,

  async login(credentials) {
    set({ loading: true, error: null })

    try {
      const response = await authApi.login(credentials)
      const { token, user } = response.data.data

      saveAuthState(token, user)
      set({ ...setAuthSession(token, user), loading: false })
      return true
    } catch (err: unknown) {
      set({
        error: err instanceof Error ? err.message : '登录失败',
        loading: false,
      })
      return false
    }
  },

  async logout() {
    try {
      await authApi.logout()
    } catch {
      // Local cleanup must still happen when the server session has already expired.
    }

    clearAuthStorage()
    set({ ...setAuthSession(null, null), error: null, loading: false })
  },

  async refreshUser() {
    if (!get().token) return

    try {
      const response = await authApi.getCurrentUser()
      saveStoredUser(response.data.data)
      set({ user: response.data.data })
    } catch {
      await get().logout()
    }
  },

  async updateProfile(data) {
    set({ loading: true, error: null })

    try {
      const response = await authApi.updateProfile(data)
      saveStoredUser(response.data.data)
      set({ user: response.data.data, loading: false })
      return true
    } catch (err: unknown) {
      set({
        error: err instanceof Error ? err.message : '更新失败',
        loading: false,
      })
      return false
    }
  },

  async changePassword(oldPassword, newPassword) {
    set({ loading: true, error: null })

    try {
      await authApi.changePassword({
        old_password: oldPassword,
        new_password: newPassword,
      })
      set({ loading: false })
      return true
    } catch (err: unknown) {
      set({
        error: err instanceof Error ? err.message : '修改失败',
        loading: false,
      })
      return false
    }
  },
}))
