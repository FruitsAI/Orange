import {
  cloneElement,
  forwardRef,
  useId,
  useState,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react'

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right'

export interface TooltipProps extends Omit<HTMLAttributes<HTMLDivElement>, 'content'> {
  children: ReactElement<HTMLAttributes<HTMLElement>>
  content: ReactNode
  placement?: TooltipPlacement
}

export const Tooltip = forwardRef<HTMLDivElement, TooltipProps>(function Tooltip(
  { children, className, content, placement = 'top', ...props },
  ref,
) {
  const [open, setOpen] = useState(false)
  const tooltipId = useId().replaceAll(':', '')
  const childProps = children.props

  const trigger = cloneElement(children, {
    'aria-describedby': open ? tooltipId : childProps['aria-describedby'],
    onBlur: (event) => {
      setOpen(false)
      childProps.onBlur?.(event)
    },
    onFocus: (event) => {
      setOpen(true)
      childProps.onFocus?.(event)
    },
    onMouseEnter: (event) => {
      setOpen(true)
      childProps.onMouseEnter?.(event)
    },
    onMouseLeave: (event) => {
      setOpen(false)
      childProps.onMouseLeave?.(event)
    },
  } satisfies HTMLAttributes<HTMLElement>)

  return (
    <div
      {...props}
      className={['ods-tooltip', className].filter(Boolean).join(' ')}
      data-slot="tooltip"
      ref={ref}
    >
      {trigger}
      <div
        className="ods-tooltip__content"
        data-open={open || undefined}
        data-placement={placement}
        data-slot="content"
        id={tooltipId}
        role="tooltip"
      >
        {content}
      </div>
    </div>
  )
})
