import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

import { api } from './client'
import type { FlagAction, FlagDetail, FlagFilters, RunStatus } from './types'

const POLL_MS = 1000

export const keys = {
  meta: ['meta'] as const,
  latestRun: ['runs', 'latest'] as const,
  run: (runId: string) => ['runs', runId] as const,
  flags: (runId: string, filters: FlagFilters) => ['runs', runId, 'flags', filters] as const,
  summary: (runId: string) => ['runs', runId, 'summary'] as const,
  flag: (flagId: string) => ['flags', flagId] as const,
}

export function useMeta() {
  return useQuery({ queryKey: keys.meta, queryFn: api.meta, staleTime: Infinity })
}

export function useLatestRun() {
  return useQuery({ queryKey: keys.latestRun, queryFn: api.latestRun, retry: false })
}

/** Polls while drafts are being written so progress stays visible (heuristic 1). */
export function useRun(runId: string) {
  return useQuery({
    queryKey: keys.run(runId),
    queryFn: () => api.run(runId),
    refetchInterval: (q) => (q.state.data?.status === 'processing' ? POLL_MS : false),
  })
}

export function useFlags(runId: string, filters: FlagFilters, enabled = true) {
  return useQuery({
    queryKey: keys.flags(runId, filters),
    queryFn: () => api.flags(runId, filters),
    enabled,
  })
}

/** Keyed by run status so counters refresh the moment drafting finishes. */
export function useSummary(runId: string, runStatus: RunStatus | undefined) {
  return useQuery({
    queryKey: [...keys.summary(runId), runStatus],
    queryFn: () => api.summary(runId),
    enabled: runStatus !== undefined,
  })
}

export function useFlag(flagId: string) {
  return useQuery({ queryKey: keys.flag(flagId), queryFn: () => api.flag(flagId) })
}

/** Writes a server-returned flag into the cache and refreshes that run's lists and counters. */
export function useApplyFlagUpdate() {
  const client = useQueryClient()
  return useCallback(
    (updated: FlagDetail) => {
      client.setQueryData(keys.flag(updated.id), updated)
      void client.invalidateQueries({ queryKey: ['runs', updated.run_id] })
    },
    [client],
  )
}

export function useFlagAction(flagId: string) {
  const apply = useApplyFlagUpdate()
  return useMutation({
    mutationFn: (action: FlagAction) => api.act(flagId, action),
    onSuccess: apply,
  })
}

export function useUpload() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ file, asOf }: { file: File; asOf?: string }) => api.upload(file, asOf),
    onSuccess: (run) => {
      client.setQueryData(keys.run(run.id), run)
      client.setQueryData(keys.latestRun, run)
    },
  })
}
