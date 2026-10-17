/**
 * @file stores/theme.ts
 * @description React/Zustand theme state.
 */
import { create } from 'zustand'

export type ThemeMode = 'light' | 'dark' | 'auto'
export type EffectiveTheme = 'light' | 'dark'

export const THEME_OPTIONS: ReadonlyArray<{
  icon: string
  label: string
  value: ThemeMode
}> = [
  { icon: 'ri-computer-line', label: '跟随系统', value: 'auto' },
  { icon: 'ri-sun-line', label: '亮色', value: 'light' },
  { icon: 'ri-moon-line', label: '深色', value: 'dark' },
]

export const getThemeModeLabel = (theme: ThemeMode) =>
  THEME_OPTIONS.find((option) => option.value === theme)?.label ?? '跟随系统'

interface ThemeState {
  theme: ThemeMode
  effectiveTheme: EffectiveTheme
  initializeTheme: () => () => void
  applyTheme: (transition?: boolean) => void
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

// Keep synchronized with --ods-duration-fast (200ms) in design-system/tokens/semantic.css.
export const THEME_TRANSITION_DURATION = 200
let transitionTimer: number | undefined

const clearThemeTransition = () => {
  if (transitionTimer !== undefined && typeof window !== 'undefined') {
    window.clearTimeout(transitionTimer)
  }
  transitionTimer = undefined
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove('theme-transitioning')
  }
}

const startThemeTransition = () => {
  clearThemeTransition()
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return
  }

  document.documentElement.classList.add('theme-transitioning')
  transitionTimer = window.setTimeout(clearThemeTransition, THEME_TRANSITION_DURATION)
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: getStoredTheme(),
  effectiveTheme: resolveEffectiveTheme(getStoredTheme()),

  initializeTheme() {
    get().applyTheme(false)

    if (typeof window === 'undefined') return () => {}

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (get().theme === 'auto') {
        get().applyTheme(true)
      }
    }

    media.addEventListener('change', handleChange)
    return () => {
      media.removeEventListener('change', handleChange)
      clearThemeTransition()
    }
  },

  applyTheme(transition = false) {
    const effectiveTheme = resolveEffectiveTheme(get().theme)
    if (transition) startThemeTransition()
    set({ effectiveTheme })

    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', effectiveTheme)
      // WKWebView can leave descendants that consume inherited custom
      // properties on the previous composited frame until the window resizes.
      // Rebuilding body layout in the same task invalidates that stale frame;
      // the browser cannot paint the temporary display:none state.
      if (transition && document.body) {
        const previousDisplay = document.body.style.display
        const scrollX = window.scrollX
        const scrollY = window.scrollY
        document.body.style.display = 'none'
        void document.body.offsetHeight
        document.body.style.display = previousDisplay
        if (scrollX !== 0 || scrollY !== 0) {
          window.scrollTo(scrollX, scrollY)
        }
      }
    }
  },

  setTheme(theme) {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('theme', theme)
    }

    set({ theme })
    get().applyTheme(true)
  },

  toggleTheme() {
    get().setTheme(get().effectiveTheme === 'dark' ? 'light' : 'dark')
  },
}))

/** Applies the persisted/system theme synchronously before React's first render. */
export const applyThemeBeforeRender = () => {
  useThemeStore.getState().applyTheme(false)
}
