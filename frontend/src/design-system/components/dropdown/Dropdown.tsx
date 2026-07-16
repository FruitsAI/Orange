import {
  cloneElement,
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import {
  Popover,
  usePopoverClose,
  usePopoverOpen,
  type PopoverPlacement,
  type PopoverTriggerProps,
} from '../popover'

const MENU_ITEM_SELECTOR = '[role="menuitem"]:not([aria-disabled="true"])'

export interface DropdownProps {
  children: ReactNode
  onOpenChange?: (open: boolean) => void
  open?: boolean
  placement?: PopoverPlacement
}

export function DropdownRoot({
  children,
  onOpenChange,
  open,
  placement = 'bottom-start',
}: DropdownProps) {
  return (
    <Popover.Root onOpenChange={onOpenChange} open={open} placement={placement}>
      {children}
    </Popover.Root>
  )
}

export function DropdownTrigger({ children }: PopoverTriggerProps) {
  const open = usePopoverOpen()
  const childProps = children.props

  return (
    <Popover.Trigger>
      {cloneElement(children, {
        'aria-haspopup': childProps['aria-haspopup'] ?? 'menu',
        onKeyDown: (event) => {
          childProps.onKeyDown?.(event)
          if (event.defaultPrevented) return
          if (
            event.key !== 'ArrowDown' &&
            event.key !== 'ArrowUp' &&
            event.key !== 'Enter' &&
            event.key !== ' '
          ) {
            return
          }
          event.preventDefault()
          open()
        },
      })}
    </Popover.Trigger>
  )
}

const moveFocus = (event: KeyboardEvent<HTMLDivElement>) => {
  const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR))
  if (items.length === 0) return
  const currentIndex = items.indexOf(document.activeElement as HTMLElement)
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    items[(currentIndex + 1) % items.length]?.focus()
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    items[(currentIndex - 1 + items.length) % items.length]?.focus()
  }
}

export interface DropdownMenuProps extends HTMLAttributes<HTMLDivElement> {
  label?: string
}

export function DropdownMenu({
  children,
  className,
  label,
  onKeyDown,
  ...props
}: DropdownMenuProps) {
  return (
    <Popover.Content
      className={['ods-dropdown', className].filter(Boolean).join(' ')}
      initialFocus={MENU_ITEM_SELECTOR}
      role="menu"
    >
      <div
        {...props}
        aria-label={label}
        className="ods-dropdown__list"
        data-slot="menu"
        onKeyDown={(event) => {
          onKeyDown?.(event)
          if (!event.defaultPrevented) moveFocus(event)
        }}
        role="none"
      >
        {children}
      </div>
    </Popover.Content>
  )
}

export interface DropdownItemProps extends Omit<HTMLAttributes<HTMLButtonElement>, 'onSelect'> {
  closeOnSelect?: boolean
  disabled?: boolean
  onSelect?: () => void
  shortcut?: ReactNode
  startContent?: ReactNode
  tone?: 'default' | 'danger'
}

export const DropdownItem = forwardRef<HTMLButtonElement, DropdownItemProps>(function DropdownItem(
  {
    children,
    className,
    closeOnSelect = true,
    disabled = false,
    onClick,
    onSelect,
    shortcut,
    startContent,
    tone = 'default',
    ...props
  },
  ref,
) {
  const close = usePopoverClose()

  return (
    <button
      {...props}
      aria-disabled={disabled || undefined}
      className={['ods-dropdown__item', className].filter(Boolean).join(' ')}
      data-slot="item"
      data-tone={tone}
      disabled={disabled}
      onClick={(event) => {
        onClick?.(event)
        if (event.defaultPrevented) return
        onSelect?.()
        if (closeOnSelect) close()
      }}
      ref={ref}
      role="menuitem"
      tabIndex={-1}
      type="button"
    >
      {startContent ? (
        <span className="ods-dropdown__start" data-slot="start">
          {startContent}
        </span>
      ) : null}
      <span className="ods-dropdown__label">{children}</span>
      {shortcut ? <span className="ods-dropdown__shortcut">{shortcut}</span> : null}
    </button>
  )
})

// Compound component namespaces are intentionally exported as a stable object.
// eslint-disable-next-line react-refresh/only-export-components
export const Dropdown = Object.assign(DropdownRoot, {
  Item: DropdownItem,
  Menu: DropdownMenu,
  Trigger: DropdownTrigger,
})
