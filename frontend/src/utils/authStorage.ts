const TOKEN_KEY = 'token'
const USER_KEY = 'user'
const LEGACY_STORAGE = localStorage
const AUTH_STORAGE = sessionStorage

export function getStoredToken(): string | null {
  return AUTH_STORAGE.getItem(TOKEN_KEY)
}

export function getStoredUser<T>(): T | null {
  const raw = AUTH_STORAGE.getItem(USER_KEY)
  return raw ? JSON.parse(raw) as T : null
}

export function saveAuthState(token: string, user: unknown) {
  AUTH_STORAGE.setItem(TOKEN_KEY, token)
  AUTH_STORAGE.setItem(USER_KEY, JSON.stringify(user))
}

export function saveStoredUser(user: unknown) {
  AUTH_STORAGE.setItem(USER_KEY, JSON.stringify(user))
}

export function clearAuthStorage() {
  AUTH_STORAGE.removeItem(TOKEN_KEY)
  AUTH_STORAGE.removeItem(USER_KEY)
  LEGACY_STORAGE.removeItem(TOKEN_KEY)
  LEGACY_STORAGE.removeItem(USER_KEY)
}