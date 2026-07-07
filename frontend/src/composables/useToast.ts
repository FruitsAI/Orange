/**
 * @file composables/useToast.ts
 * @description Global toast store for React components.
 */
import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: number
  message: string
  type: ToastType
  duration?: number
}

interface ToastState {
  toasts: Toast[]
  add: (message: string, type?: ToastType, duration?: number) => number
  remove: (id: number) => void
  success: (message: string, duration?: number) => number
  error: (message: string, duration?: number) => number
  warning: (message: string, duration?: number) => number
  info: (message: string, duration?: number) => number
}

let nextId = 0

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  add(message, type = 'info', duration = 3000) {
    const id = nextId++
    const toast = { id, message, type, duration }

    set((state) => ({ toasts: [...state.toasts, toast] }))

    if (duration > 0) {
      window.setTimeout(() => get().remove(id), duration)
    }

    return id
  },

  remove(id) {
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }))
  },

  success(message, duration) {
    return get().add(message, 'success', duration)
  },

  error(message, duration) {
    return get().add(message, 'error', duration)
  },

  warning(message, duration) {
    return get().add(message, 'warning', duration)
  },

  info(message, duration) {
    return get().add(message, 'info', duration)
  },
}))

export function useToast() {
  return useToastStore()
}
