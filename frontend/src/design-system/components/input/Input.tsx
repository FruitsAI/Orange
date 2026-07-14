import {
  forwardRef,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { useFieldControlProps } from '../field/fieldContext'

export type ControlSize = 'sm' | 'md' | 'lg'

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: ControlSize
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, size = 'md', ...props },
  ref,
) {
  const controlProps = useFieldControlProps(props)
  return (
    <input
      {...controlProps}
      className={['ods-input', className].filter(Boolean).join(' ')}
      data-size={size}
      data-slot="input"
      ref={ref}
    />
  )
})

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  size?: ControlSize
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { className, size = 'md', ...props },
  ref,
) {
  const controlProps = useFieldControlProps(props)
  return (
    <textarea
      {...controlProps}
      className={['ods-textarea', className].filter(Boolean).join(' ')}
      data-size={size}
      data-slot="textarea"
      ref={ref}
    />
  )
})

export interface NativeSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  size?: ControlSize
}

export const NativeSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(function NativeSelect(
  { className, size = 'md', ...props },
  ref,
) {
  const controlProps = useFieldControlProps(props)
  return (
    <select
      {...controlProps}
      className={['ods-native-select', className].filter(Boolean).join(' ')}
      data-size={size}
      data-slot="select"
      ref={ref}
    />
  )
})

export interface InputGroupProps extends HTMLAttributes<HTMLDivElement> {
  endContent?: ReactNode
  startContent?: ReactNode
}

export const InputGroup = forwardRef<HTMLDivElement, InputGroupProps>(function InputGroup(
  { children, className, endContent, startContent, ...props },
  ref,
) {
  return (
    <div
      {...props}
      className={['ods-input-group', className].filter(Boolean).join(' ')}
      data-slot="group"
      ref={ref}
    >
      {startContent ? (
        <span className="ods-input-group__content" data-slot="start-content">
          {startContent}
        </span>
      ) : null}
      {children}
      {endContent ? (
        <span className="ods-input-group__content" data-slot="end-content">
          {endContent}
        </span>
      ) : null}
    </div>
  )
})
