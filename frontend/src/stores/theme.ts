/**
 * @file stores/theme.ts
 * @description React/Zustand theme state.
 */
import { create } from 'zustand'

export type ThemeMode = 'light' | 'dark' | 'auto'
export type EffectiveTheme = 'light' | 'dark'

interface ThemeState {
  theme: ThemeMode
  effectiveTheme: EffectiveTheme
  initializeTheme: () => () => void
  applyTheme: () => void
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
}

const isThemeMode = (value: string | null): value is ThemeMode =>
  value === 'light' || value === 'dark' || value === 'auto'

const getStoredTheme = (): ThemeMode => {
  if (typeof window === 'undefined') return 'auto'
  const stored = window.localStorage.getItem('theme')
  return isThemeMode(stored) ? stored : 'auto'
}

const resolveEffectiveTheme = (theme: ThemeMode): EffectiveTheme => {
  if (theme !== 'auto') return theme
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: getStoredTheme(),
  effectiveTheme: resolveEffectiveTheme(getStoredTheme()),

  initializeTheme() {
    get().applyTheme()

    if (typeof window === 'undefined') return () => {}

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (get().theme === 'auto') {
        get().applyTheme()
      }
    }

    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  },

  applyTheme() {
    const effectiveTheme = resolveEffectiveTheme(get().theme)
    set({ effectiveTheme })

    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', effectiveTheme)
    }
  },

  setTheme(theme) {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('theme', theme)
    }

    set({ theme })
    get().applyTheme()
  },

  toggleTheme() {
    get().setTheme(get().effectiveTheme === 'dark' ? 'light' : 'dark')
  },
}))

/** Applies the persisted/system theme synchronously before React's first render. */
export const applyThemeBeforeRender = () => {
  useThemeStore.getState().applyTheme()
}
