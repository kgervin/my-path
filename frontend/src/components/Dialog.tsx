import { useEffect, useId, useRef, type FormEvent, type ReactNode } from 'react'

interface Props {
  open: boolean
  title: string
  description?: string
  confirmLabel: string
  onConfirm: (event: FormEvent<HTMLFormElement>) => void
  onClose: () => void
  children?: ReactNode
  busy?: boolean
}

/** Native <dialog>: the browser handles focus trapping, Escape and inert background. */
export function Dialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
  children,
  busy,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={onClose}
    >
      <form
        method="dialog"
        onSubmit={(event) => {
          event.preventDefault()
          onConfirm(event)
        }}
      >
        <h2 id={titleId}>{title}</h2>
        {description ? <p id={descriptionId}>{description}</p> : null}
        {children}
        <div className="dialog__actions">
          <button type="button" className="button button--secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button button--primary" disabled={busy}>
            {confirmLabel}
          </button>
        </div>
      </form>
    </dialog>
  )
}
