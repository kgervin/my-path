import { Link } from 'react-router'

import { useMeta } from '../../api/queries'
import type { FlagSummary } from '../../api/types'
import { BarrierChip, DaysLeft, StatusBadge } from '../../components/Badges'

interface Props {
  runId: string
  flags: FlagSummary[]
  selectedId: string | undefined
  search: string
}

const DEFAULT_URGENT_DAYS = 7
const WARNING_DAYS = 14

function urgencyClass(days: number, urgentDays: number): string {
  if (days < urgentDays) return ' flag-card--critical'
  return days <= WARNING_DAYS ? ' flag-card--warning' : ''
}

export function FlagList({ runId, flags, selectedId, search }: Props) {
  const { data: meta } = useMeta()
  const urgentDays = meta?.urgent_days ?? DEFAULT_URGENT_DAYS
  const suffix = search ? `?${search}` : ''
  return (
    <ul className="flag-list" aria-label="Flagged students, most urgent first">
      {flags.map((flag) => (
        <li key={flag.id}>
          <Link
            to={`/runs/${runId}/students/${flag.id}${suffix}`}
            className={`flag-card${urgencyClass(flag.days_to_drop, urgentDays)}`}
            aria-current={flag.id === selectedId ? 'page' : undefined}
          >
            <span className="flag-card__header">
              <span className="flag-card__avatar" aria-hidden="true">
                {flag.first_name.charAt(0).toUpperCase()}
              </span>
              <span className="flag-card__info">
                <span className="flag-card__name">
                  {flag.first_name} <span className="flag-card__id">{flag.student_id}</span>
                </span>
                <span className="flag-card__program">{flag.program}</span>
              </span>
              <DaysLeft days={flag.days_to_drop} />
            </span>
            <span className="flag-card__footer">
              <span className="flag-card__chips">
                {flag.barrier_types.map((b) => (
                  <BarrierChip key={b} barrier={b} />
                ))}
              </span>
              <StatusBadge status={flag.status} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
