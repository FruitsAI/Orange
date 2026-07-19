import {
  createContext,
  forwardRef,
  useContext,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type MutableRefObject,
  type ReactNode,
  type Ref,
} from 'react'

interface ListboxContextValue {
  activeValue: string | null
  onSelect: (value: string) => void
  selectedValues: string[]
  setActiveValue: (value: string) => void
}

const ListboxContext = createContext<ListboxContextValue | null>(null)

const useListboxContext = () => {
  const context = useContext(ListboxContext)
  if (!context) throw new Error('Listbox.Item must be used inside Listbox')
  return context
}

const assignRef = <T,>(ref: Ref<T> | undefined, node: T | null) => {
  if (typeof ref === 'function') ref(node)
  else if (ref) (ref as MutableRefObject<T | null>).current = node
}

const moveFocus = (event: KeyboardEvent<HTMLUListElement>) => {
  const items = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(
      '[role="option"]:not([aria-disabled="true"])',
    ),
  )
  if (items.length === 0) return
  const currentIndex = items.indexOf(document.activeElement as HTMLElement)

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    items[(currentIndex + 1) % items.length]?.focus()
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    items[(currentIndex - 1 + items.length) % items.length]?.focus()
  } else if (event.key === 'Home') {
    event.preventDefault()
    items[0]?.focus()
  } else if (event.key === 'End') {
    event.preventDefault()
    items[items.length - 1]?.focus()
  }
}

export interface ListboxProps extends Omit<HTMLAttributes<HTMLUListElement>, 'onSelect'> {
  onSelect: (value: string) => void
  selectedValues?: string[]
  selectionMode?: 'single' | 'multiple'
}

export const ListboxRoot = forwardRef<HTMLUListElement, ListboxProps>(function ListboxRoot(
  {
    children,
    className,
    onKeyDown,
    onSelect,
    selectedValues = [],
    selectionMode = 'single',
    ...props
  },
  ref,
) {
  const listRef = useRef<HTMLUListElement | null>(null)
  const [activeValue, setActiveValue] = useState<string | null>(() => selectedValues[0] ?? null)

  useLayoutEffect(() => {
    const items = Array.from(
      listRef.current?.querySelectorAll<HTMLElement>(
        '[role="option"]:not([aria-disabled="true"])',
      ) ?? [],
    )
    if (items.length === 0) return

    const activeItem = items.find((item) => item.dataset.value === activeValue)
    if (activeItem) return

    const selectedItem = items.find((item) => selectedValues.includes(item.dataset.value ?? ''))
    const fallbackValue = (selectedItem ?? items[0]).dataset.value
    if (fallbackValue) setActiveValue(fallbackValue)
  }, [activeValue, children, selectedValues])

  return (
    <ListboxContext.Provider value={{ activeValue, onSelect, selectedValues, setActiveValue }}>
      <ul
        {...props}
        aria-multiselectable={selectionMode === 'multiple' || undefined}
        className={['ods-listbox', className].filter(Boolean).join(' ')}
        data-slot="listbox"
        onKeyDown={(event) => {
          onKeyDown?.(event)
          if (!event.defaultPrevented) moveFocus(event)
        }}
        ref={(node) => {
          listRef.current = node
          assignRef(ref, node)
        }}
        role="listbox"
      >
        {children}
      </ul>
    </ListboxContext.Provider>
  )
})

export interface ListboxItemProps extends Omit<HTMLAttributes<HTMLLIElement>, 'onSelect'> {
  description?: ReactNode
  disabled?: boolean
  startContent?: ReactNode
  value: string
}

export const ListboxItem = forwardRef<HTMLLIElement, ListboxItemProps>(function ListboxItem(
  {
    children,
    className,
    description,
    disabled = false,
    onClick,
    onFocus,
    onKeyDown,
    startContent,
    value,
    ...props
  },
  ref,
) {
  const { activeValue, onSelect, selectedValues, setActiveValue } = useListboxContext()
  const selected = selectedValues.includes(value)
  const itemId = useId().replaceAll(':', '')

  const select = () => {
    if (!disabled) onSelect(value)
  }

  return (
    <li
      {...props}
      aria-disabled={disabled || undefined}
      aria-selected={selected}
      className={['ods-listbox__item', className].filter(Boolean).join(' ')}
      data-selected={selected || undefined}
      data-slot="item"
      data-value={value}
      id={itemId}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) select()
      }}
      onFocus={(event) => {
        onFocus?.(event)
        if (!disabled) setActiveValue(value)
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        if (event.defaultPrevented) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          select()
        }
      }}
      ref={ref}
      role="option"
      tabIndex={!disabled && activeValue === value ? 0 : -1}
    >
      {startContent ? (
        <span className="ods-listbox__start" data-slot="start">
          {startContent}
        </span>
      ) : null}
      <span className="ods-listbox__content">
        <span className="ods-listbox__label">{children}</span>
        {description ? <span className="ods-listbox__description">{description}</span> : null}
      </span>
      <span aria-hidden="true" className="ods-listbox__check" data-slot="check">
        ✓
      </span>
    </li>
  )
})

// Compound component namespaces are intentionally exported as a stable object.
// eslint-disable-next-line react-refresh/only-export-components
export const Listbox = Object.assign(ListboxRoot, { Item: ListboxItem })
