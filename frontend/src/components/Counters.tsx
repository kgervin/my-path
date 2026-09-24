import type { Counters as CounterValues } from '../api/types'

/** Stat strip (FR-7): one joined panel; the first segment is the headline count. */
export function Counters({
  counters,
  pendingLabel = 'Pending review',
}: {
  counters: CounterValues | undefined
  pendingLabel?: string
}) {
  if (!counters) return null
  const items: [string, number][] = [
    ['Flagged', counters.flagged],
    [pendingLabel, counters.pending],
    ['Approved', counters.approved],
    ['Routed', counters.routed],
    ['Dismissed', counters.dismissed],
  ]
  return (
    <section aria-label="Progress this run">
      <dl className="counters">
        {items.map(([label, value]) => (
          <div key={label} className="counter">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
