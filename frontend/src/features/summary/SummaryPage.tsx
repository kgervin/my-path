import { useId } from 'react'
import { Link, useParams } from 'react-router'

import { useMeta, useRun, useSummary } from '../../api/queries'
import type { FlagStatus, Summary } from '../../api/types'
import { Counters } from '../../components/Counters'
import { PageHeading } from '../../components/PageHeading'
import { ErrorState, Loading } from '../../components/StateViews'
import { humanize, STATUS_LABELS } from '../../lib/format'

const STATUSES = Object.keys(STATUS_LABELS) as FlagStatus[]

export function SummaryPage() {
  const { runId = '' } = useParams()
  const run = useRun(runId)
  const summary = useSummary(runId, run.data?.status)

  if (run.isError) return <ErrorState error={run.error} onRetry={() => void run.refetch()} />
  if (run.isPending || summary.isPending) return <Loading label="Loading summary…" />
  if (summary.isError)
    return <ErrorState error={summary.error} onRetry={() => void summary.refetch()} />

  return (
    <>
      <PageHeading title="Run summary">
        <p>
          {summary.data.run.filename} · {summary.data.run.total_records} students checked ·{' '}
          <Link to={`/runs/${runId}`}>Back to the queue</Link>
        </p>
      </PageHeading>
      <Counters counters={summary.data.counters} />
      <BarrierTable summary={summary.data} />
    </>
  )
}

/** A real table (with caption and scoped headers); the bar is a visual aid, never the only cue. */
function BarrierTable({ summary }: { summary: Summary }) {
  const { data: meta } = useMeta()
  const captionId = useId()
  const label = (id: string) => meta?.barriers.find((b) => b.id === id)?.label ?? humanize(id)
  const rows = Object.entries(summary.by_barrier).toSorted(([, a], [, b]) => b - a)
  const max = Math.max(1, ...rows.map(([, count]) => count))

  return (
    // A scrollable region must be keyboard reachable on small screens (WCAG 2.1.1).
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
    <div className="card table-wrap" role="region" aria-labelledby={captionId} tabIndex={0}>
      <table className="table">
        <caption id={captionId}>Students by barrier and status</caption>
        <thead>
          <tr>
            <th scope="col">Barrier</th>
            <th scope="col">Total</th>
            {STATUSES.map((status) => (
              <th key={status} scope="col">
                {STATUS_LABELS[status]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([barrier, count]) => (
            <tr key={barrier}>
              <th scope="row">{label(barrier)}</th>
              <td>
                <span className="bar-cell">
                  <span
                    className="bar"
                    style={{ inlineSize: `${(count / max) * 100}%` }}
                    aria-hidden="true"
                  />
                  {count}
                </span>
              </td>
              {STATUSES.map((status) => (
                <td key={status}>{summary.by_barrier_status[barrier]?.[status] ?? 0}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="hint">A student with two barriers is counted once in each row.</p>
    </div>
  )
}
