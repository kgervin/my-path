import { useEffect, useRef } from 'react'

import type { FlagDetail } from '../../api/types'
import { Icon } from '../../components/Icon'
import { ROUTE_LABELS, STATUS_LABELS } from '../../lib/format'

interface Props {
  flag: FlagDetail
  edited: boolean
  canApprove: boolean
  pending: boolean
  onApprove: (next: boolean) => void
  onRoute: () => void
  onDismiss: () => void
  onReopen: () => void
}

/**
 * Same actions, same order, on every student (heuristic 4). When a decision swaps these
 * controls, focus moves to the new first control instead of being lost to <body>.
 */
export function DecisionBar(props: Props) {
  const { flag } = props
  const ref = useRef<HTMLDivElement>(null)
  const previousStatus = useRef(flag.status)

  useEffect(() => {
    if (previousStatus.current !== flag.status) ref.current?.querySelector('button')?.focus()
    previousStatus.current = flag.status
  }, [flag.status])

  return (
    <div ref={ref}>
      {flag.status === 'new' ? <OpenActions {...props} /> : <Decided {...props} />}
    </div>
  )
}

function Decided({ flag, pending, onReopen }: Props) {
  return (
    <div className="decision decision--done" role="status">
      <p>
        <Icon name="check" /> {STATUS_LABELS[flag.status]}
        {flag.routed_to ? ` to ${ROUTE_LABELS[flag.routed_to]}` : ''}
        {flag.dismiss_reason ? `: ${flag.dismiss_reason}` : ''}. Nothing was sent to the student.
      </p>
      <button
        type="button"
        className="button button--secondary"
        onClick={onReopen}
        disabled={pending}
      >
        <Icon name="undo" size={16} /> Reopen
      </button>
    </div>
  )
}

function OpenActions({ edited, canApprove, pending, onApprove, onRoute, onDismiss }: Props) {
  const approveLabel = edited ? 'Approve with edits' : 'Approve'
  return (
    <div className="decision">
      <button
        type="button"
        className="button button--primary"
        disabled={!canApprove || pending}
        onClick={() => onApprove(false)}
      >
        <Icon name="check" size={16} /> {approveLabel}
      </button>
      <button
        type="button"
        className="button button--secondary"
        disabled={!canApprove || pending}
        onClick={() => onApprove(true)}
      >
        {approveLabel} and next <Icon name="next" size={16} />
      </button>
      <button
        type="button"
        className="button button--secondary"
        disabled={pending}
        onClick={onRoute}
      >
        <Icon name="send" size={16} /> Route
      </button>
      <button
        type="button"
        className="button button--danger"
        disabled={pending}
        onClick={onDismiss}
      >
        <Icon name="x" size={16} /> Dismiss
      </button>
    </div>
  )
}
