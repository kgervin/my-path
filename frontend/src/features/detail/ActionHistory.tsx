import type { ActionLogEntry } from '../../api/types'
import { formatDateTime, humanize } from '../../lib/format'

/** FR-8: timestamp, coach and before/after text. Collapsed by default (minimalist design). */
export function ActionHistory({ actions }: { actions: ActionLogEntry[] }) {
  if (actions.length === 0) return null
  return (
    <details className="disclosure">
      <summary>History ({actions.length})</summary>
      <ol className="history">
        {actions.toReversed().map((entry) => (
          <li key={entry.id}>
            <p>
              <strong>{humanize(entry.action)}</strong> by {entry.coach} ·{' '}
              <time dateTime={entry.created_at}>{formatDateTime(entry.created_at)}</time>
            </p>
            {entry.reason ? <p>Reason: {humanize(entry.reason)}</p> : null}
            {entry.before_text !== entry.after_text ? (
              <div className="history__diff">
                <p className="hint">Before</p>
                <blockquote>{entry.before_text}</blockquote>
                <p className="hint">After</p>
                <blockquote>{entry.after_text}</blockquote>
              </div>
            ) : null}
          </li>
        ))}
      </ol>
    </details>
  )
}
