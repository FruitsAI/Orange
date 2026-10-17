import { FieldDescription, FieldError, FieldLabel, FieldRoot } from './Field'

export { FieldDescription, FieldError, FieldLabel, FieldRoot }
export { useFieldControlProps } from './fieldContext'
export type {
  FieldDescriptionProps,
  FieldErrorProps,
  FieldLabelProps,
  FieldRootProps,
} from './Field'

export const Field = {
  Description: FieldDescription,
  Error: FieldError,
  Label: FieldLabel,
  Root: FieldRoot,
}
