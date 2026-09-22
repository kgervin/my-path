import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

import type { FlagFilters, FlagStatus, Urgency } from '../../api/types'

const KEYS = ['barrier', 'program', 'status', 'urgency'] as const

/** Filters live in the URL so a filtered queue can be bookmarked or shared (heuristic 7). */
export function useQueueFilters() {
  const [params, setParams] = useSearchParams()

  const filters = useMemo<FlagFilters>(
    () => ({
      barrier: params.get('barrier') ?? undefined,
      program: params.get('program') ?? undefined,
      status: (params.get('status') as FlagStatus | null) ?? undefined,
      urgency: (params.get('urgency') as Urgency | null) ?? undefined,
    }),
    [params],
  )

  const setFilter = useCallback(
    (key: (typeof KEYS)[number], value: string) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current)
          if (value) next.set(key, value)
          else next.delete(key)
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  const clear = useCallback(() => setParams({}, { replace: true }), [setParams])
  const active = KEYS.some((key) => params.has(key))

  return { filters, setFilter, clear, active, search: params.toString() }
}
