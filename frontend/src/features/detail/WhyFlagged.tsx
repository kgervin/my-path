import type { FlagDetail } from '../../api/types'
import { BarrierChip, DaysToDrop } from '../../components/Badges'
import { FIELD_LABELS, humanize, ROUTE_LABELS } from '../../lib/format'

/** Rules decide; this shows the exact source fields behind the explanation (PRD guardrail). */
export function WhyFlagged({ flag }: { flag: FlagDetail }) {
  return (
    <section className="card stack" aria-labelledby="why-heading">
      <h3 id="why-heading">Why {flag.first_name} was flagged</h3>
      <p className="flag-card__chips">
        {flag.barrier_types.map((b) => (
          <BarrierChip key={b} barrier={b} />
        ))}
      </p>
      <DaysToDrop days={flag.days_to_drop} />
      <p>{flag.explanation ?? 'The explanation is still being written.'}</p>
      <dl className="source-fields" aria-label="Source fields used">
        {Object.entries(flag.source_fields).map(([field, value]) => (
          <div key={field}>
            <dt>{FIELD_LABELS[field] ?? humanize(field)}</dt>
            <dd>
              <code>{value}</code>
            </dd>
          </div>
        ))}
      </dl>
      <p className="hint">
        Suggested route:{' '}
        {flag.route_to
          .map((r) => ROUTE_LABELS[r as keyof typeof ROUTE_LABELS] ?? humanize(r))
          .join(', ')}
      </p>
    </section>
  )
}
