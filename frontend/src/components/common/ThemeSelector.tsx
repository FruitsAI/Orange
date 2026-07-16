import { useCallback, useEffect, useRef, useState } from 'react'
import { IconButton, Listbox, Popover } from '@/design-system'
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
  const triggerRef = useRef<HTMLButtonElement>(null)
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen
  const effectiveLabel = effectiveTheme === 'dark' ? '深色' : '亮色'
  const triggerLabel = `主题：${getThemeModeLabel(theme)}，当前显示${effectiveLabel}`

  const setOpen = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen && !isOpen) onBeforeOpen?.()
      if (!isControlled) setInternalOpen(nextOpen)
      onOpenChange?.(nextOpen)
      if (!nextOpen) queueMicrotask(() => triggerRef.current?.focus())
    },
    [isControlled, isOpen, onBeforeOpen, onOpenChange],
  )

  useEffect(() => {
    if (!isOpen) return
    queueMicrotask(() => {
      document
        .querySelector<HTMLElement>(
          '.theme-selector__popover [role="option"][aria-selected="true"]',
        )
        ?.focus()
    })
  }, [isOpen])

  const selectTheme = (value: string) => {
    setTheme(value as ThemeMode)
    setOpen(false)
  }

  return (
    <Popover.Root onOpenChange={setOpen} open={isOpen} placement="bottom-end">
      <Popover.Trigger>
        <IconButton
          aria-haspopup="listbox"
          className="app-topbar__icon-button theme-selector__trigger"
          label={triggerLabel}
          ref={triggerRef}
          title={triggerLabel}
          variant="secondary"
        >
          <i
            aria-hidden="true"
            className={effectiveTheme === 'dark' ? 'ri-moon-line' : 'ri-sun-line'}
          />
        </IconButton>
      </Popover.Trigger>

      <Popover.Content className="theme-selector__popover" role="presentation">
        <Listbox
          aria-label="主题模式"
          onSelect={selectTheme}
          selectedValues={[theme]}
          selectionMode="single"
        >
          {THEME_OPTIONS.map((option) => (
            <Listbox.Item
              key={option.value}
              startContent={<i aria-hidden="true" className={option.icon} />}
              value={option.value}
            >
              {option.label}
            </Listbox.Item>
          ))}
        </Listbox>
      </Popover.Content>
    </Popover.Root>
  )
}
