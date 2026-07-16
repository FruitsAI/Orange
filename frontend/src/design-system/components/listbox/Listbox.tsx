import {
  createContext,
  forwardRef,
  useContext,
  useId,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react'

interface ListboxContextValue {
  onSelect: (value: string) => void
  selectedValues: string[]
}

const ListboxContext = createContext<ListboxContextValue | null>(null)

const useListboxContext = () => {
  const context = useContext(ListboxContext)
  if (!context) throw new Error('Listbox.Item must be used inside Listbox')
  return context
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

const ListboxRoot = forwardRef<HTMLUListElement, ListboxProps>(function ListboxRoot(
  { children, className, onSelect, selectedValues = [], selectionMode = 'single', ...props },
  ref,
) {
  return (
    <ListboxContext.Provider value={{ onSelect, selectedValues }}>
      <ul
        {...props}
        aria-multiselectable={selectionMode === 'multiple' || undefined}
        className={['ods-listbox', className].filter(Boolean).join(' ')}
        data-slot="listbox"
        onKeyDown={moveFocus}
        ref={ref}
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

const ListboxItem = forwardRef<HTMLLIElement, ListboxItemProps>(function ListboxItem(
  { children, className, description, disabled = false, startContent, value, ...props },
  ref,
) {
  const { onSelect, selectedValues } = useListboxContext()
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
      id={itemId}
      onClick={select}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          select()
        }
      }}
      ref={ref}
      role="option"
      tabIndex={disabled ? -1 : 0}
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
