import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useId,
  useMemo,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react'

interface AccordionContextValue {
  baseId: string
  isOpen: (key: string) => boolean
  toggle: (key: string) => void
}

const AccordionContext = createContext<AccordionContextValue | null>(null)

const useAccordionContext = () => {
  const context = useContext(AccordionContext)
  if (!context) throw new Error('Accordion.Item must be used inside Accordion')
  return context
}

export interface AccordionProps extends Omit<HTMLAttributes<HTMLDivElement>, 'defaultValue'> {
  defaultValue?: string[]
  multiple?: boolean
  onValueChange?: (value: string[]) => void
  value?: string[]
}

export const AccordionRoot = forwardRef<HTMLDivElement, AccordionProps>(function AccordionRoot(
  { children, className, defaultValue = [], multiple = false, onValueChange, value, ...props },
  ref,
) {
  const generatedId = useId().replaceAll(':', '')
  const [internal, setInternal] = useState<string[]>(defaultValue)
  const open = value ?? internal

  const toggle = useCallback(
    (key: string) => {
      const next = open.includes(key)
        ? open.filter((item) => item !== key)
        : multiple
          ? [...open, key]
          : [key]
      if (value === undefined) setInternal(next)
      onValueChange?.(next)
    },
    [multiple, onValueChange, open, value],
  )

  const context = useMemo<AccordionContextValue>(
    () => ({
      baseId: `ods-accordion-${generatedId}`,
      isOpen: (key) => open.includes(key),
      toggle,
    }),
    [generatedId, open, toggle],
  )

  return (
    <AccordionContext.Provider value={context}>
      <div
        {...props}
        className={['ods-accordion', className].filter(Boolean).join(' ')}
        data-slot="accordion"
        ref={ref}
      >
        {children}
      </div>
    </AccordionContext.Provider>
  )
})

export interface AccordionItemProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  itemKey: string
  subtitle?: ReactNode
  title: ReactNode
}

export const AccordionItem = forwardRef<HTMLDivElement, AccordionItemProps>(function AccordionItem(
  { children, className, itemKey, subtitle, title, ...props },
  ref,
) {
  const { baseId, isOpen, toggle } = useAccordionContext()
  const open = isOpen(itemKey)
  const triggerId = `${baseId}-trigger-${itemKey}`
  const panelId = `${baseId}-panel-${itemKey}`

  return (
    <div
      {...props}
      className={['ods-accordion__item', className].filter(Boolean).join(' ')}
      data-open={open || undefined}
      data-slot="item"
      ref={ref}
    >
      <h3 className="ods-accordion__heading">
        <button
          aria-controls={panelId}
          aria-expanded={open}
          className="ods-accordion__trigger"
          data-slot="trigger"
          id={triggerId}
          onClick={() => toggle(itemKey)}
          type="button"
        >
          <span className="ods-accordion__titles">
            <span className="ods-accordion__title">{title}</span>
            {subtitle ? <span className="ods-accordion__subtitle">{subtitle}</span> : null}
          </span>
          <span aria-hidden="true" className="ods-accordion__indicator" data-slot="indicator">
            ›
          </span>
        </button>
      </h3>
      <div
        aria-labelledby={triggerId}
        className="ods-accordion__panel"
        data-slot="panel"
        hidden={!open}
        id={panelId}
        role="region"
      >
        <div className="ods-accordion__content">{children}</div>
      </div>
    </div>
  )
})

// Compound component namespaces are intentionally exported as a stable object.
// eslint-disable-next-line react-refresh/only-export-components
export const Accordion = Object.assign(AccordionRoot, { Item: AccordionItem })
