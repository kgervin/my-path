import { Link } from 'react-router'

import type { FlagSummary } from '../../api/types'
import { BarrierChip, DaysToDrop, StatusBadge } from '../../components/Badges'

interface Props {
  runId: string
  flags: FlagSummary[]
  selectedId: string | undefined
  search: string
}

export function FlagList({ runId, flags, selectedId, search }: Props) {
  const suffix = search ? `?${search}` : ''
  return (
    <ul className="flag-list" aria-label="Flagged students, most urgent first">
      {flags.map((flag) => (
        <li key={flag.id}>
          <Link
            to={`/runs/${runId}/students/${flag.id}${suffix}`}
            className="flag-card"
            aria-current={flag.id === selectedId ? 'page' : undefined}
          >
            <span className="flag-card__top">
              <span className="flag-card__name">
                {flag.first_name} <span className="flag-card__id">{flag.student_id}</span>
              </span>
              <StatusBadge status={flag.status} />
            </span>
            <span className="flag-card__program">{flag.program}</span>
            <span className="flag-card__chips">
              {flag.barrier_types.map((b) => (
                <BarrierChip key={b} barrier={b} />
              ))}
            </span>
            <DaysToDrop days={flag.days_to_drop} />
          </Link>
        </li>
      ))}
    </ul>
  )
}
