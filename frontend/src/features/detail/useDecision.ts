import { useCallback } from 'react'

import { api, ApiError } from '../../api/client'
import { useApplyFlagUpdate, useFlagAction } from '../../api/queries'
import type { FlagActionBody, FlagDetail } from '../../api/types'
import { useCoachName } from '../../hooks/useCoachName'
import { useToasts } from '../../hooks/useToasts'

const UNDOABLE = new Set<FlagActionBody['action']>(['approve', 'dismiss', 'route'])

/** Wraps coach actions with the coach name, optimistic-concurrency version, toasts and Undo. */
export function useDecision(flag: FlagDetail) {
  const mutation = useFlagAction(flag.id)
  const apply = useApplyFlagUpdate()
  const { coachName } = useCoachName()
  const { notify } = useToasts()

  // Undo outlives this component (the toast stays after navigation), so it calls the API directly.
  const undoFor = useCallback(
    (updated: FlagDetail) => async () => {
      try {
        apply(
          await api.act(updated.id, {
            action: 'reopen',
            coach: coachName,
            version: updated.version,
          }),
        )
        notify({ tone: 'info', message: `${updated.first_name} is back in the queue.` })
      } catch (error) {
        const message =
          error instanceof ApiError ? error.message : 'Undo failed. Reopen the student instead.'
        notify({ tone: 'error', message })
      }
    },
    [apply, coachName, notify],
  )

  const act = useCallback(
    (body: FlagActionBody, successMessage: string, onDone?: () => void) => {
      mutation.mutate(
        { ...body, coach: coachName, version: flag.version },
        {
          onSuccess: (updated) => {
            const undo = UNDOABLE.has(body.action) ? undoFor(updated) : undefined
            notify({
              tone: 'success',
              message: successMessage,
              ...(undo ? { undo: () => void undo() } : {}),
            })
            onDone?.()
          },
        },
      )
    },
    [mutation, coachName, flag.version, notify, undoFor],
  )

  return { act, pending: mutation.isPending, error: mutation.error, hasCoach: coachName !== '' }
}
