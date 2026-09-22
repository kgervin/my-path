import type { Counters as CounterValues } from '../api/types'
import { daysLabel } from '../lib/format'

/** Counters across the top of the queue (FR-7). A description list reads well to screen readers. */
export function Counters({ counters }: { counters: CounterValues }) {
  const items: [string, string | number][] = [
    ['Flagged', counters.flagged],
    ['Needs review', counters.pending],
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
        <div className="counter counter--wide">
          <dt>Most urgent open</dt>
          <dd className="counter__text">
            {counters.most_urgent_days_to_drop === null
              ? 'All reviewed'
              : daysLabel(counters.most_urgent_days_to_drop)}
          </dd>
        </div>
      </dl>
    </section>
  )
}
