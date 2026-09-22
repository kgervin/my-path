import { useToasts, type Toast } from '../hooks/useToasts'
import { Icon, type IconName } from './Icon'

const TOAST_ICONS: Record<Toast['tone'], IconName> = {
  success: 'check',
  error: 'alert',
  info: 'info',
}

export function Toasts() {
  const { toasts, dismiss } = useToasts()
  return (
    <div className="toasts" role="status" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.tone}`}>
          <Icon name={TOAST_ICONS[toast.tone]} />
          <p className="toast__message">{toast.message}</p>
          {toast.undo ? (
            <button
              type="button"
              className="button button--ghost button--small"
              onClick={() => {
                toast.undo?.()
                dismiss(toast.id)
              }}
            >
              <Icon name="undo" size={14} /> Undo
            </button>
          ) : null}
          <button
            type="button"
            className="button button--ghost button--small button--icon"
            aria-label="Dismiss notification"
            onClick={() => dismiss(toast.id)}
          >
            <Icon name="x" size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
