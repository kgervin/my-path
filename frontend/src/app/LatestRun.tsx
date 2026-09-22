import { Link, Navigate } from 'react-router'

import { ApiError } from '../api/client'
import { useLatestRun } from '../api/queries'
import { PageHeading } from '../components/PageHeading'
import { EmptyState, ErrorState, Loading } from '../components/StateViews'

/** Resolves "the current run" so Queue and Summary work from the main navigation. */
export function LatestRun({ view }: { view: 'queue' | 'summary' }) {
  const { data: run, error, isPending, refetch } = useLatestRun()
  if (isPending) return <Loading label="Finding the latest run…" />
  if (run)
    return (
      <Navigate replace to={view === 'queue' ? `/runs/${run.id}` : `/runs/${run.id}/summary`} />
    )
  if (error instanceof ApiError && error.status === 404) {
    return (
      <>
        <PageHeading title={view === 'queue' ? 'Queue' : 'Summary'} />
        <EmptyState title="No students to review yet">
          <p>
            <Link to="/">Upload a CSV</Link> to flag students and draft outreach.
          </p>
        </EmptyState>
      </>
    )
  }
  return <ErrorState error={error} onRetry={() => void refetch()} />
}
