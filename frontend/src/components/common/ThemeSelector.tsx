import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { getThemeModeLabel, THEME_OPTIONS, type ThemeMode, useThemeStore } from '@/stores/theme'

interface ThemeSelectorProps {
  onBeforeOpen?: () => void
  onOpenChange?: (open: boolean) => void
  open?: boolean
}

export default function ThemeSelector({ onBeforeOpen, onOpenChange, open }: ThemeSelectorProps) {
  const theme = useThemeStore((state) => state.theme)
  const effectiveTheme = useThemeStore((state) => state.effectiveTheme)
  const setTheme = useThemeStore((state) => state.setTheme)
  const [internalOpen, setInternalOpen] = useState(false)
  const [activeOptionIndex, setActiveOptionIndex] = useState(() =>
    THEME_OPTIONS.findIndex((option) => option.value === theme),
  )
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen
  const effectiveLabel = effectiveTheme === 'dark' ? '深色' : '亮色'
  const triggerLabel = `主题：${getThemeModeLabel(theme)}，当前显示${effectiveLabel}`

  const setOpen = useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) setInternalOpen(nextOpen)
      onOpenChange?.(nextOpen)
    },
    [isControlled, onOpenChange],
  )

  const closeAndRestoreFocus = useCallback(() => {
    setOpen(false)
    triggerRef.current?.focus()
  }, [setOpen])

  useLayoutEffect(() => {
    if (!isOpen) return

    const positionMenu = () => {
      const trigger = triggerRef.current
      const menu = menuRef.current
      if (!trigger || !menu) return

      const gutter = 12
      const gap = 10
      const availableWidth = Math.max(0, window.innerWidth - gutter * 2)
      const menuWidth = Math.min(196, availableWidth)
      const rect = trigger.getBoundingClientRect()
      const left = Math.max(
        gutter,
        Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - gutter),
      )
      let top = rect.bottom + gap
      if (menu.offsetHeight > 0 && top + menu.offsetHeight > window.innerHeight - gutter) {
        top = Math.max(gutter, rect.top - menu.offsetHeight - gap)
      }

      menu.style.left = `${left}px`
      menu.style.top = `${top}px`
    }

    positionMenu()
    window.addEventListener('resize', positionMenu)
    window.addEventListener('scroll', positionMenu, true)
    return () => {
      window.removeEventListener('resize', positionMenu)
      window.removeEventListener('scroll', positionMenu, true)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    optionRefs.current[THEME_OPTIONS.findIndex((option) => option.value === theme)]?.focus()

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      closeAndRestoreFocus()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [closeAndRestoreFocus, isOpen, theme])

  const selectTheme = (mode: ThemeMode) => {
    setTheme(mode)
    closeAndRestoreFocus()
  }

  const handleOptionKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | undefined
    if (event.key === 'ArrowDown') nextIndex = (index + 1) % THEME_OPTIONS.length
    if (event.key === 'ArrowUp')
      nextIndex = (index - 1 + THEME_OPTIONS.length) % THEME_OPTIONS.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = THEME_OPTIONS.length - 1
    if (nextIndex === undefined) return
    event.preventDefault()
    setActiveOptionIndex(nextIndex)
    optionRefs.current[nextIndex]?.focus()
  }

  return (
    <>
      <button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={triggerLabel}
        className="app-topbar__icon-button theme-selector__trigger"
        onClick={() => {
          if (!isOpen) {
            setActiveOptionIndex(THEME_OPTIONS.findIndex((option) => option.value === theme))
            onBeforeOpen?.()
          }
          setOpen(!isOpen)
        }}
        ref={triggerRef}
        title={triggerLabel}
        type="button"
      >
        <i
          aria-hidden="true"
          className={effectiveTheme === 'dark' ? 'ri-moon-line' : 'ri-sun-line'}
        />
      </button>

      {isOpen && typeof document !== 'undefined'
        ? createPortal(
            <>
              <button
                aria-label="关闭主题菜单"
                className="app-topbar__overlay theme-selector__overlay"
                onClick={closeAndRestoreFocus}
                tabIndex={-1}
                type="button"
              />
              <div
                aria-label="主题模式"
                className="theme-selector__menu app-topbar-portal"
                ref={menuRef}
                role="listbox"
              >
                {THEME_OPTIONS.map((option, index) => (
                  <button
                    aria-selected={theme === option.value}
                    className="theme-selector__option"
                    key={option.value}
                    onClick={() => selectTheme(option.value)}
                    onFocus={() => setActiveOptionIndex(index)}
                    onKeyDown={(event) => handleOptionKeyDown(event, index)}
                    ref={(node) => {
                      optionRefs.current[index] = node
                    }}
                    role="option"
                    tabIndex={activeOptionIndex === index ? 0 : -1}
                    type="button"
                  >
                    <i aria-hidden="true" className={option.icon} />
                    <span>{option.label}</span>
                    {theme === option.value ? (
                      <i aria-hidden="true" className="ri-check-line" />
                    ) : null}
                  </button>
                ))}
              </div>
            </>,
            document.body,
          )
        : null}
    </>
  )
}
