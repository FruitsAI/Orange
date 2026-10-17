/**
 * @file composables/useToast.ts
 * @description Global toast store for React components.
 */
import { create } from 'zustand'
import { dismissToast, toast as odsToast } from '@/design-system'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastState {
  add: (message: string, type?: ToastType, duration?: number) => number
  remove: (id: number) => void
  success: (message: string, duration?: number) => number
  error: (message: string, duration?: number) => number
  warning: (message: string, duration?: number) => number
  info: (message: string, duration?: number) => number
}

export const useToastStore = create<ToastState>((_set, get) => ({
  add(message, type = 'info', duration = 3000) {
    return odsToast[type](message, duration)
  },

  remove(id) {
    dismissToast(id)
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
