import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

export interface Toast {
  id: number
  message: string
  tone: 'success' | 'error' | 'info'
  undo?: () => void
}

interface ToastValue {
  toasts: Toast[]
  notify: (toast: Omit<Toast, 'id'>) => void
  dismiss: (id: number) => void
}

const TOAST_MS = 8000
const ToastContext = createContext<ToastValue | null>(null)

/** Status messages with optional Undo (heuristics 1 and 3). Rendered in a polite live region. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  const notify = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = nextId.current++
      setToasts((current) => [...current.slice(-2), { ...toast, id }])
      window.setTimeout(() => dismiss(id), TOAST_MS)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ toasts, notify, dismiss }), [toasts, notify, dismiss])
  return <ToastContext value={value}>{children}</ToastContext>
}

export function useToasts(): ToastValue {
  const value = useContext(ToastContext)
  if (!value) throw new Error('useToasts must be used inside ToastProvider')
  return value
}
