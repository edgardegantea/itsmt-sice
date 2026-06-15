import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastStore {
  toasts: Toast[]
  toast: (message: string, type?: ToastType) => void
  success: (message: string) => void
  error: (message: string) => void
  warning: (message: string) => void
  info: (message: string) => void
  remove: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => {
  const add = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2)
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3800)
  }

  return {
    toasts: [],
    toast:   (m, t) => add(m, t),
    success: (m)    => add(m, 'success'),
    error:   (m)    => add(m, 'error'),
    warning: (m)    => add(m, 'warning'),
    info:    (m)    => add(m, 'info'),
    remove:  (id)   => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  }
})
