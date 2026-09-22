import type { Run } from '../../api/types'

/** Visible, announced progress while drafts are written (heuristic 1). */
export function RunProgress({ run }: { run: Run }) {
  if (run.status === 'failed') {
    return (
      <div className="state state--error" role="alert">
        <p className="state__title">Drafting stopped early</p>
        <p>
          {run.drafted_count} of {run.flagged_count} drafts are ready. The rest will be retried when
          the service restarts. You can review the ready ones now.
        </p>
      </div>
    )
  }
  if (run.status !== 'processing') return null
  return (
    <div className="progress" role="status">
      <label htmlFor="draft-progress">
        Writing drafts: {run.drafted_count} of {run.flagged_count}
      </label>
      <progress id="draft-progress" max={run.flagged_count} value={run.drafted_count} />
    </div>
  )
}
