import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { SectionHeader } from '../section-header'

export interface FormSectionProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  actions?: ReactNode
  description?: ReactNode
  headingLevel?: 2 | 3 | 4
  title?: ReactNode
}

export const FormSection = forwardRef<HTMLElement, FormSectionProps>(function FormSection(
  { actions, children, className, description, headingLevel = 2, title, ...props },
  ref,
) {
  return (
    <section
      {...props}
      className={['ods-form-section', className].filter(Boolean).join(' ')}
      data-slot="form-section"
      ref={ref}
    >
      {title ? (
        <SectionHeader
          actions={actions}
          description={description}
          headingLevel={headingLevel}
          title={title}
        />
      ) : null}
      {children}
    </section>
  )
})

export type FormGridColumns = 1 | 2 | 3 | 'auto'

export interface FormGridProps extends HTMLAttributes<HTMLDivElement> {
  columns?: FormGridColumns
}

export const FormGrid = forwardRef<HTMLDivElement, FormGridProps>(function FormGrid(
  { className, columns = 2, ...props },
  ref,
) {
  return (
    <div
      {...props}
      className={['ods-form-grid', className].filter(Boolean).join(' ')}
      data-columns={columns}
      data-slot="form-grid"
      ref={ref}
    />
  )
})

export type FormActionsAlign = 'start' | 'end' | 'between'

export interface FormActionsProps extends HTMLAttributes<HTMLDivElement> {
  align?: FormActionsAlign
}

export const FormActions = forwardRef<HTMLDivElement, FormActionsProps>(function FormActions(
  { align = 'end', className, ...props },
  ref,
) {
  return (
    <div
      {...props}
      className={['ods-form-actions', className].filter(Boolean).join(' ')}
      data-align={align}
      data-slot="form-actions"
      ref={ref}
    />
  )
})
