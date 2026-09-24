import { useMemo, type ReactNode } from 'react'
import { Link, Outlet, useParams } from 'react-router'

import { useFlags, useRun, useSummary } from '../../api/queries'
import { Counters } from '../../components/Counters'
import { PageHeading } from '../../components/PageHeading'
import { EmptyState, ErrorState, Loading, SkeletonList } from '../../components/StateViews'
import { FlagList } from './FlagList'
import { QueueFilters } from './QueueFilters'
import { RunProgress } from './RunProgress'
import { useQueueFilters } from './useQueueFilters'
import { useQueueNavigation } from './useQueueNavigation'

export function QueuePage() {
  const { runId = '', flagId } = useParams()
  const run = useRun(runId)
  const queue = useQueueFilters()
  const ready = run.data !== undefined && run.data.status !== 'processing'
  const summary = useSummary(runId, run.data?.status)
  const flags = useFlags(runId, queue.filters, ready)

  const list = useMemo(() => flags.data ?? [], [flags.data])
  useQueueNavigation(runId, list, flagId, queue.search)

  if (run.isPending) return <Loading label="Loading run…" />
  if (run.isError) return <ErrorState error={run.error} onRetry={() => void run.refetch()} />

  return (
    <div className={flagId ? 'queue-layout queue-layout--detail' : 'queue-layout'}>
      <div className="queue-layout__list">
        <PageHeading title="Review queue" focusOnMount={!flagId}>
          <p>
            {run.data.filename} · {run.data.total_records} students checked ·{' '}
            <Link to={`/runs/${runId}/summary`}>View summary</Link>
          </p>
        </PageHeading>
        <RunProgress run={run.data} />
        {summary.data ? <Counters counters={summary.data.counters} /> : null}
        <QueueFilters {...queue} programs={summary.data?.programs ?? []} />
        <QueueResults
          ready={ready}
          flags={flags}
          total={run.data.flagged_count}
          onClear={queue.clear}
          filtered={queue.active}
        >
          <FlagList runId={runId} flags={list} selectedId={flagId} search={queue.search} />
        </QueueResults>
      </div>
      <div className="queue-layout__detail">
        <DetailPane hasSelection={flagId !== undefined} />
      </div>
    </div>
  )
}

function DetailPane({ hasSelection }: { hasSelection: boolean }) {
  if (hasSelection) return <Outlet />
  return (
    <EmptyState title="Choose a student">
      <p>Select a student to see why they were flagged and review the draft message.</p>
    </EmptyState>
  )
}

interface ResultsProps {
  ready: boolean
  flags: ReturnType<typeof useFlags>
  total: number
  filtered: boolean
  onClear: () => void
  children: ReactNode
}

function QueueResults({ ready, flags, total, filtered, onClear, children }: ResultsProps) {
  if (!ready) return null
  if (flags.isPending) return <SkeletonList label="Loading students…" />
  if (flags.isError) return <ErrorState error={flags.error} onRetry={() => void flags.refetch()} />
  if (total === 0) {
    return (
      <EmptyState title="No barriers found">
        <p>None of the students in this file matched a barrier rule. Nice.</p>
      </EmptyState>
    )
  }
  return (
    <>
      <p className="results-count" role="status">
        Showing {flags.data.length} of {total} flagged students
      </p>
      {flags.data.length === 0 && filtered ? (
        <EmptyState title="No students match these filters">
          <button type="button" className="button button--secondary" onClick={onClear}>
            Clear filters
          </button>
        </EmptyState>
      ) : (
        children
      )}
    </>
  )
}
