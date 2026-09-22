import { useId, useState } from 'react'

import type { RouteTarget } from '../../api/types'
import { Dialog } from '../../components/Dialog'
import { ROUTE_LABELS } from '../../lib/format'

const DISMISS_REASONS = [
  'Already resolved',
  'Student withdrew on purpose',
  'Wrong data in the record',
  'Duplicate of another outreach',
] as const
const OTHER = 'other'

interface DismissProps {
  open: boolean
  name: string
  busy: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
}

/** A reason is required so the team learns why drafts were not used (heuristic 5). */
export function DismissDialog({ open, name, busy, onClose, onConfirm }: DismissProps) {
  const [choice, setChoice] = useState<string>('')
  const [other, setOther] = useState('')
  const id = useId()
  const reason = choice === OTHER ? other.trim() : choice
  return (
    <Dialog
      open={open}
      title={`Dismiss ${name}?`}
      description="They leave the queue and no message is approved. You can undo this."
      confirmLabel="Dismiss"
      busy={busy || !reason}
      onClose={onClose}
      onConfirm={() => reason && onConfirm(reason)}
    >
      <fieldset className="radio-group">
        <legend>Reason</legend>
        {[...DISMISS_REASONS, OTHER].map((value) => (
          <label key={value} className="radio">
            <input
              type="radio"
              name={`${id}-reason`}
              value={value}
              checked={choice === value}
              onChange={() => setChoice(value)}
              required
            />
            {value === OTHER ? 'Other' : value}
          </label>
        ))}
      </fieldset>
      {choice === OTHER ? (
        <div className="field">
          <label htmlFor={`${id}-other`}>Describe the reason</label>
          <input
            id={`${id}-other`}
            value={other}
            maxLength={500}
            onChange={(e) => setOther(e.target.value)}
            required
          />
        </div>
      ) : null}
    </Dialog>
  )
}

interface RouteProps {
  open: boolean
  name: string
  suggested: string[]
  busy: boolean
  onClose: () => void
  onConfirm: (target: RouteTarget) => void
}

const TARGETS: RouteTarget[] = ['bursar', 'aid_office']

export function RouteDialog({ open, name, suggested, busy, onClose, onConfirm }: RouteProps) {
  const initial = TARGETS.find((t) => suggested.includes(t)) ?? 'bursar'
  const [target, setTarget] = useState<RouteTarget>(initial)
  const id = useId()
  return (
    <Dialog
      open={open}
      title={`Route ${name} to another office`}
      description="The office gets this case to act on. No message goes to the student."
      confirmLabel={`Route to ${ROUTE_LABELS[target]}`}
      busy={busy}
      onClose={onClose}
      onConfirm={() => onConfirm(target)}
    >
      <fieldset className="radio-group">
        <legend>Office</legend>
        {TARGETS.map((value) => (
          <label key={value} className="radio">
            <input
              type="radio"
              name={`${id}-target`}
              value={value}
              checked={target === value}
              onChange={() => setTarget(value)}
            />
            {ROUTE_LABELS[value]}
            {suggested.includes(value) ? <span className="hint"> (suggested)</span> : null}
          </label>
        ))}
      </fieldset>
    </Dialog>
  )
}
