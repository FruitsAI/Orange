import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ConfirmContext, type ConfirmOptions, type ConfirmRequest } from '@/composables/useConfirm'
import { AlertDialog } from '@/design-system'

interface PendingConfirmation {
  options: ConfirmOptions
  resolve: (confirmed: boolean) => void
}

const normalizeRequest = (request: ConfirmRequest): ConfirmOptions =>
  typeof request === 'string' ? { message: request } : request

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirmation | null>(null)
  const pendingRef = useRef<PendingConfirmation | null>(null)

  const confirm = useCallback((request: ConfirmRequest) => {
    pendingRef.current?.resolve(false)

    return new Promise<boolean>((resolve) => {
      const next = { options: normalizeRequest(request), resolve }
      pendingRef.current = next
      setPending(next)
    })
  }, [])

  const settle = useCallback((confirmed: boolean) => {
    const current = pendingRef.current
    if (!current) return

    pendingRef.current = null
    setPending(null)
    current.resolve(confirmed)
  }, [])

  useEffect(
    () => () => {
      pendingRef.current?.resolve(false)
      pendingRef.current = null
    },
    [],
  )

  const value = useMemo(() => ({ confirm }), [confirm])
  const options = pending?.options

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <AlertDialog
        action={options?.actionLabel ?? '确认'}
        actionVariant={options?.actionVariant ?? 'primary'}
        cancel={options?.cancelLabel ?? '取消'}
        description={options?.message}
        onAction={() => settle(true)}
        onClose={() => settle(false)}
        open={pending !== null}
        title={options?.title ?? '请确认'}
      />
    </ConfirmContext.Provider>
  )
}
