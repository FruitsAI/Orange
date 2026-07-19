import {
  forwardRef,
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useState,
  type HTMLAttributes,
  type LabelHTMLAttributes,
} from 'react'
import { FieldContext, useFieldContext } from './fieldContext'

export interface FieldRootProps extends Omit<HTMLAttributes<HTMLDivElement>, 'id'> {
  disabled?: boolean
  id?: string
  invalid?: boolean
  required?: boolean
}

export const FieldRoot = forwardRef<HTMLDivElement, FieldRootProps>(function FieldRoot(
  { children, className, disabled = false, id, invalid = false, required = false, ...props },
  ref,
) {
  const generatedId = useId().replaceAll(':', '')
  const fieldId = id ?? `ods-field-${generatedId}`
  const [hasDescription, setHasDescription] = useState(false)
  const [hasError, setHasError] = useState(false)
  const registerDescription = useCallback((mounted: boolean) => setHasDescription(mounted), [])
  const registerError = useCallback((mounted: boolean) => setHasError(mounted), [])
  const value = useMemo(
    () => ({
      controlId: `${fieldId}-control`,
      descriptionId: hasDescription ? `${fieldId}-description` : '',
      disabled,
      errorId: hasError ? `${fieldId}-error` : '',
      invalid,
      registerDescription,
      registerError,
      required,
    }),
    [
      disabled,
      fieldId,
      hasDescription,
      hasError,
      invalid,
      registerDescription,
      registerError,
      required,
    ],
  )

  return (
    <FieldContext.Provider value={value}>
      <div
        {...props}
        className={['ods-field', className].filter(Boolean).join(' ')}
        data-disabled={disabled || undefined}
        data-invalid={invalid || undefined}
        data-required={required || undefined}
        data-slot="root"
        id={fieldId}
        ref={ref}
      >
        {children}
      </div>
    </FieldContext.Provider>
  )
})

export type FieldLabelProps = LabelHTMLAttributes<HTMLLabelElement>

export const FieldLabel = forwardRef<HTMLLabelElement, FieldLabelProps>(function FieldLabel(
  { children, className, ...props },
  ref,
) {
  const { controlId, required } = useFieldContext()
  return (
    <label
      {...props}
      className={['ods-field__label', className].filter(Boolean).join(' ')}
      data-slot="label"
      htmlFor={props.htmlFor ?? controlId}
      ref={ref}
    >
      {children}
      {required ? (
        <span aria-hidden="true" className="ods-field__required">
          *
        </span>
      ) : null}
    </label>
  )
})

export type FieldDescriptionProps = HTMLAttributes<HTMLParagraphElement>

export const FieldDescription = forwardRef<HTMLParagraphElement, FieldDescriptionProps>(
  function FieldDescription({ className, ...props }, ref) {
    const { descriptionId, registerDescription } = useFieldContext()

    useLayoutEffect(() => {
      registerDescription(true)
      return () => registerDescription(false)
    }, [registerDescription])

    return (
      <p
        {...props}
        className={['ods-field__description', className].filter(Boolean).join(' ')}
        data-slot="description"
        id={descriptionId}
        ref={ref}
      />
    )
  },
)

export type FieldErrorProps = HTMLAttributes<HTMLParagraphElement>

export const FieldError = forwardRef<HTMLParagraphElement, FieldErrorProps>(function FieldError(
  { className, ...props },
  ref,
) {
  const { errorId, invalid, registerError } = useFieldContext()

  useLayoutEffect(() => {
    registerError(true)
    return () => registerError(false)
  }, [registerError])

  return (
    <p
      {...props}
      className={['ods-field__error', className].filter(Boolean).join(' ')}
      data-slot="error"
      id={errorId}
      ref={ref}
      role={invalid ? 'alert' : undefined}
    />
  )
})
