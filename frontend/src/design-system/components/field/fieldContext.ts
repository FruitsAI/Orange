import { createContext, useContext } from 'react'

export interface FieldContextValue {
  controlId: string
  descriptionId: string
  disabled: boolean
  errorId: string
  invalid: boolean
  registerDescription: (mounted: boolean) => void
  registerError: (mounted: boolean) => void
  required: boolean
}

export const FieldContext = createContext<FieldContextValue | null>(null)

export const useFieldContext = () => {
  const context = useContext(FieldContext)
  if (!context) throw new Error('Field compound components must be used inside Field.Root')
  return context
}

interface FieldControlProps {
  'aria-describedby'?: string
  'aria-invalid'?: boolean | 'false' | 'grammar' | 'spelling' | 'true'
  disabled?: boolean
  id?: string
  required?: boolean
}

export const useFieldControlProps = <Props extends FieldControlProps>(props: Props): Props => {
  const context = useContext(FieldContext)
  if (!context) return props

  const describedBy = [
    props['aria-describedby'],
    context.descriptionId,
    context.invalid ? context.errorId : '',
  ]
    .filter(Boolean)
    .join(' ')

  return {
    ...props,
    'aria-describedby': describedBy || undefined,
    'aria-invalid': context.invalid ? true : props['aria-invalid'],
    disabled: context.disabled || props.disabled,
    id: props.id ?? context.controlId,
    required: context.required || props.required,
  }
}
