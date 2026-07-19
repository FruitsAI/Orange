export type ToastTone = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  duration: number
  id: number
  message: string
  tone: ToastTone
}

type Listener = () => void

const DEFAULT_DURATION_MS = 3000

let toasts: ToastItem[] = []
let nextId = 0
const listeners = new Set<Listener>()
const timers = new Map<number, ReturnType<typeof setTimeout>>()

const emit = () => {
  for (const listener of listeners) listener()
}

export const subscribeToasts = (listener: Listener) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const getToasts = () => toasts

export const dismissToast = (id: number) => {
  const timer = timers.get(id)
  if (timer) {
    clearTimeout(timer)
    timers.delete(id)
  }
  toasts = toasts.filter((item) => item.id !== id)
  emit()
}

const push = (message: string, tone: ToastTone, duration = DEFAULT_DURATION_MS) => {
  const id = nextId++
  toasts = [...toasts, { duration, id, message, tone }]
  emit()
  if (duration > 0) {
    timers.set(
      id,
      setTimeout(() => dismissToast(id), duration),
    )
  }
  return id
}

/** Imperative toast API, usable outside React (stores, api handlers). */
export const toast = {
  error: (message: string, duration?: number) => push(message, 'error', duration),
  info: (message: string, duration?: number) => push(message, 'info', duration),
  success: (message: string, duration?: number) => push(message, 'success', duration),
  warning: (message: string, duration?: number) => push(message, 'warning', duration),
}
