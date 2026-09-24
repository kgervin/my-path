import { useId, useMemo, useState, type ReactNode } from 'react'
import { Link, Outlet, useParams } from 'react-router'

import { useFlags, useRun, useSummary } from '../../api/queries'
import { Counters } from '../../components/Counters'
import { Icon } from '../../components/Icon'
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
  const [filtersOpen, setFiltersOpen] = useState(queue.active)
  const filtersId = useId()
  useQueueNavigation(runId, list, flagId, queue.search)

  if (run.isPending) return <Loading label="Loading run…" />
  if (run.isError) return <ErrorState error={run.error} onRetry={() => void run.refetch()} />

  return (
    <div className={`queue-page${flagId ? ' queue-page--detail' : ''}`}>
      <Counters counters={summary.data?.counters} />
      <QueueHead
        pending={summary.data?.counters.pending}
        scanned={run.data.total_records}
        shown={list.length}
        runId={runId}
        focus={!flagId}
        filtersOpen={filtersOpen}
        filtersId={filtersId}
        filtered={queue.active}
        onToggleFilters={() => setFiltersOpen((open) => !open)}
      />
      <RunProgress run={run.data} />
      <div id={filtersId} hidden={!filtersOpen} className="queue-filters">
        <QueueFilters {...queue} programs={summary.data?.programs} />
      </div>
      <QueueColumns detail={flagId !== undefined}>
        <QueueResults
          ready={ready}
          flags={flags}
          total={run.data.flagged_count}
          onClear={queue.clear}
          filtered={queue.active}
        >
          <FlagList runId={runId} flags={list} selectedId={flagId} search={queue.search} />
        </QueueResults>
      </QueueColumns>
    </div>
  )
}

/** "12 students need review", or a clear done state. */
export function queueHeading(pending: number | undefined): string {
  if (pending === undefined) return 'Review queue'
  if (pending === 0) return 'Every student is reviewed'
  return `${pending} ${pending === 1 ? 'student needs' : 'students need'} review`
}

interface HeadProps {
  pending: number | undefined
  scanned: number
  shown: number
  runId: string
  focus: boolean
  filtersOpen: boolean
  filtersId: string
  filtered: boolean
  onToggleFilters: () => void
}

function QueueHead({
  pending,
  scanned,
  shown,
  runId,
  focus,
  filtersOpen,
  filtersId,
  filtered,
  onToggleFilters,
}: HeadProps) {
  return (
    <div className="queue-head">
      <PageHeading
        title={queueHeading(pending)}
        documentTitle="Review queue"
        kicker="Coach queue"
        focusOnMount={focus}
      >
        <p>
          {scanned} students scanned · {shown} shown ·{' '}
          <Link to={`/runs/${runId}/summary`}>View summary</Link>
        </p>
      </PageHeading>
      <button
        type="button"
        className="button button--secondary button--small queue-head__filter"
        aria-expanded={filtersOpen}
        aria-controls={filtersId}
        onClick={onToggleFilters}
      >
        <Icon name="filter" size={16} /> Filter{filtered ? ' (on)' : ''}
      </button>
    </div>
  )
}

/** List on the left, selected student on the right (stacked on phones). */
function QueueColumns({ detail, children }: { detail: boolean; children: ReactNode }) {
  return (
    <div className={`queue-layout${detail ? ' queue-layout--detail' : ''}`}>
      <div className="queue-layout__list">{children}</div>
      <div className="queue-layout__detail">
        <DetailPane hasSelection={detail} />
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
