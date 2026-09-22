import { useMemo } from 'react'
import { useNavigate } from 'react-router'

import type { FlagSummary } from '../../api/types'
import { useHotkeys } from '../../hooks/useHotkeys'

/** j / k move to the next / previous student in the current (filtered) queue. */
export function useQueueNavigation(
  runId: string,
  list: FlagSummary[],
  flagId: string | undefined,
  search: string,
) {
  const navigate = useNavigate()
  const handlers = useMemo(() => {
    const suffix = search ? `?${search}` : ''
    const index = list.findIndex((f) => f.id === flagId)
    const go = (offset: number) => {
      const target = index === -1 ? list[0] : list[index + offset]
      if (target) void navigate(`/runs/${runId}/students/${target.id}${suffix}`)
    }
    return { j: () => go(1), k: () => go(-1) }
  }, [list, flagId, navigate, runId, search])
  useHotkeys(handlers, list.length > 0)
}
