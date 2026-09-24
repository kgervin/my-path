import { useId } from 'react'
import { Link, useParams } from 'react-router'

import { useRun, useSummary } from '../../api/queries'
import type { Summary } from '../../api/types'
import { BarrierChip } from '../../components/Badges'
import { Counters } from '../../components/Counters'
import { PageHeading } from '../../components/PageHeading'
import { ErrorState, Loading } from '../../components/StateViews'

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
      <PageHeading title="Summary" documentTitle="Run summary">
        <p>
          {summary.data.run.total_records} students scanned this session ·{' '}
          <Link to={`/runs/${runId}`}>Back to the queue</Link>
        </p>
      </PageHeading>
      <Counters counters={summary.data.counters} pendingLabel="Pending" />
      <BarrierTable summary={summary.data} />
    </>
  )
}

/** A real table (caption, scoped headers). Color only reinforces the column headers. */
function BarrierTable({ summary }: { summary: Summary }) {
  const captionId = useId()
  const { by_barrier: byBarrier, by_barrier_status: byStatus } = summary
  const rows = Object.entries(byBarrier).toSorted(([, a], [, b]) => b - a)
  const count = (barrier: string, ...statuses: (keyof NonNullable<(typeof byStatus)[string]>)[]) =>
    statuses.reduce((sum, s) => sum + (byStatus[barrier]?.[s] ?? 0), 0)

  return (
    // A scrollable region must be keyboard reachable on small screens (WCAG 2.1.1).
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
    <div className="card table-wrap" role="region" aria-labelledby={captionId} tabIndex={0}>
      <table className="table">
        <caption id={captionId}>By barrier type</caption>
        <thead>
          <tr>
            <th scope="col">Barrier</th>
            <th scope="col">Flagged</th>
            <th scope="col">Approved</th>
            <th scope="col">Routed</th>
            <th scope="col">Dismissed</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([barrier, total]) => (
            <tr key={barrier}>
              <th scope="row">
                <BarrierChip barrier={barrier} />
              </th>
              <td className="num num--strong">{total}</td>
              <td className="num num--success">{count(barrier, 'approved', 'edited')}</td>
              <td className="num num--info">{count(barrier, 'routed')}</td>
              <td className="num num--muted">{count(barrier, 'dismissed')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
