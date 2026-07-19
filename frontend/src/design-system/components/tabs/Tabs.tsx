import {
  createContext,
  forwardRef,
  useContext,
  useId,
  useMemo,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type KeyboardEvent,
} from 'react'

interface TabsContextValue {
  baseId: string
  onValueChange: (value: string) => void
  value: string
}

const TabsContext = createContext<TabsContextValue | null>(null)

const useTabsContext = () => {
  const context = useContext(TabsContext)
  if (!context) throw new Error('Tabs compound components must be used inside Tabs.Root')
  return context
}

const getValueId = (value: string) => encodeURIComponent(value).replaceAll('%', '')

const getTabId = (baseId: string, value: string) => `${baseId}-tab-${getValueId(value)}`
const getPanelId = (baseId: string, value: string) => `${baseId}-panel-${getValueId(value)}`

export interface TabsRootProps extends HTMLAttributes<HTMLDivElement> {
  onValueChange: (value: string) => void
  value: string
}

export const TabsRoot = forwardRef<HTMLDivElement, TabsRootProps>(function TabsRoot(
  { children, className, onValueChange, value, ...props },
  ref,
) {
  const generatedId = useId().replaceAll(':', '')
  const context = useMemo(
    () => ({ baseId: `ods-tabs-${generatedId}`, onValueChange, value }),
    [generatedId, onValueChange, value],
  )

  return (
    <TabsContext.Provider value={context}>
      <div
        {...props}
        className={['ods-tabs', className].filter(Boolean).join(' ')}
        data-slot="root"
        ref={ref}
      >
        {children}
      </div>
    </TabsContext.Provider>
  )
})

export interface TabsListProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical'
  variant?: 'accent' | 'navigation' | 'pill' | 'rail'
}

export const TabsList = forwardRef<HTMLDivElement, TabsListProps>(function TabsList(
  { className, orientation = 'horizontal', variant = 'pill', ...props },
  ref,
) {
  return (
    <div
      {...props}
      aria-orientation={orientation}
      className={['ods-tabs__list', className].filter(Boolean).join(' ')}
      data-orientation={orientation}
      data-slot="list"
      data-variant={variant}
      ref={ref}
      role="tablist"
    />
  )
})

export interface TabsTabProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
  value: string
}

export const TabsTab = forwardRef<HTMLButtonElement, TabsTabProps>(function TabsTab(
  { className, disabled, onClick, onKeyDown, value, ...props },
  ref,
) {
  const context = useTabsContext()
  const selected = context.value === value

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    onKeyDown?.(event)
    if (event.defaultPrevented) return

    const list = event.currentTarget.closest<HTMLElement>('[role="tablist"]')
    if (!list) return
    const tabs = Array.from(list.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)'))
    const currentIndex = tabs.indexOf(event.currentTarget)
    if (currentIndex < 0 || tabs.length === 0) return
    const vertical = list.getAttribute('aria-orientation') === 'vertical'

    let nextIndex: number | null = null
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = tabs.length - 1
    if ((!vertical && event.key === 'ArrowRight') || (vertical && event.key === 'ArrowDown')) {
      nextIndex = (currentIndex + 1) % tabs.length
    }
    if ((!vertical && event.key === 'ArrowLeft') || (vertical && event.key === 'ArrowUp')) {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length
    }
    if (nextIndex === null) return

    event.preventDefault()
    const nextTab = tabs[nextIndex]
    nextTab.focus()
    const nextValue = nextTab.dataset.value
    if (nextValue) context.onValueChange(nextValue)
  }

  return (
    <button
      {...props}
      aria-controls={getPanelId(context.baseId, value)}
      aria-selected={selected}
      className={['ods-tabs__tab', className].filter(Boolean).join(' ')}
      data-slot="tab"
      data-value={value}
      disabled={disabled}
      id={getTabId(context.baseId, value)}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) context.onValueChange(value)
      }}
      onKeyDown={handleKeyDown}
      ref={ref}
      role="tab"
      tabIndex={selected ? 0 : -1}
      type="button"
    />
  )
})

export interface TabsPanelProps extends HTMLAttributes<HTMLDivElement> {
  value: string
}

export const TabsPanel = forwardRef<HTMLDivElement, TabsPanelProps>(function TabsPanel(
  { className, value, ...props },
  ref,
) {
  const context = useTabsContext()
  const selected = context.value === value
  return (
    <div
      {...props}
      aria-labelledby={getTabId(context.baseId, value)}
      className={['ods-tabs__panel', className].filter(Boolean).join(' ')}
      data-slot="panel"
      hidden={!selected}
      id={getPanelId(context.baseId, value)}
      ref={ref}
      role="tabpanel"
      tabIndex={0}
    />
  )
})
