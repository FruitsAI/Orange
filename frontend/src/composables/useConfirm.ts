import { createContext, useContext } from 'react'
import type { ButtonVariant } from '@/design-system'

export interface ConfirmOptions {
  actionLabel?: string
  actionVariant?: ButtonVariant
  cancelLabel?: string
  message: string
  title?: string
}

export type ConfirmRequest = ConfirmOptions | string

export interface ConfirmApi {
  confirm: (request: ConfirmRequest) => Promise<boolean>
}

export const ConfirmContext = createContext<ConfirmApi | null>(null)

export const useConfirm = () => {
  const context = useContext(ConfirmContext)
  if (!context) throw new Error('useConfirm must be used inside ConfirmProvider')
  return context
}

export default useConfirm
