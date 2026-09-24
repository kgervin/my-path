import type { RefObject } from 'react'

import { useMeta } from '../../api/queries'
import type { FlagDetail } from '../../api/types'
import { BarrierChip, StatusBadge } from '../../components/Badges'
import { Icon } from '../../components/Icon'
import { daysLabel, FIELD_LABELS, humanize, ROUTE_LABELS } from '../../lib/format'

interface HeaderProps {
  flag: FlagDetail
  headingRef: RefObject<HTMLHeadingElement | null>
}

/** Who the student is, how urgent, and the one-sentence reason. */
export function StudentHeader({ flag, headingRef }: HeaderProps) {
  const route = flag.route_to
    .map((r) => ROUTE_LABELS[r as keyof typeof ROUTE_LABELS] ?? humanize(r))
    .join(', ')
  return (
    <section className="card stack student-header" aria-labelledby="student-heading">
      <div className="student-header__top">
        <h2 id="student-heading" ref={headingRef} tabIndex={-1}>
          {flag.first_name}
        </h2>
        <StatusBadge status={flag.status} />
        <span className="student-header__due">
          <Icon name="clock" size={16} /> {daysLabel(flag.days_to_drop)}
        </span>
      </div>
      <p className="hint">
        {flag.program} · {flag.student_id}
      </p>
      <p className="flag-card__chips">
        {flag.barrier_types.map((b) => (
          <BarrierChip key={b} barrier={b} />
        ))}
      </p>
      <p>{flag.explanation ?? 'The explanation is still being written.'}</p>
      <p className="hint">Suggested route: {route}</p>
    </section>
  )
}

/** Rules decide; each barrier shows the exact source fields behind it (PRD guardrail). */
export function DetectedBarriers({ flag }: { flag: FlagDetail }) {
  const { data: meta } = useMeta()
  const dropDate = flag.source_fields.drop_date
  return (
    <section className="stack" aria-labelledby="barriers-heading">
      <h3 id="barriers-heading">Detected barriers</h3>
      {flag.findings.map((finding) => {
        const info = meta?.barriers.find((b) => b.id === finding.barrier)
        const fields = dropDate
          ? { ...finding.source_fields, drop_date: dropDate }
          : finding.source_fields
        return (
          <article key={finding.barrier} className="card stack barrier-card">
            <BarrierChip barrier={finding.barrier} />
            {info ? <p>{info.description}</p> : null}
            {info ? (
              <p className="barrier-card__fix">
                <span aria-hidden="true">💡</span> {info.suggested_fix}
              </p>
            ) : null}
            <dl
              className="source-fields"
              aria-label={`Source fields for ${info?.label ?? humanize(finding.barrier)}`}
            >
              {Object.entries(fields).map(([field, value]) => (
                <div key={field}>
                  <dt>{FIELD_LABELS[field] ?? humanize(field)}</dt>
                  <dd>
                    <code>{value}</code>
                  </dd>
                </div>
              ))}
            </dl>
          </article>
        )
      })}
    </section>
  )
}
