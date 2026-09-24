import { useMeta } from '../api/queries'
import type { FlagStatus } from '../api/types'
import { daysLabel, humanize, isUrgent, STATUS_LABELS } from '../lib/format'
import { Icon, type IconName } from './Icon'

const DEFAULT_URGENT_DAYS = 7

const BARRIER_ICONS: Record<string, string> = {
  small_balance: '💰',
  registration_hold: '🔒',
  failed_payment: '💳',
  missing_aid_document: '📄',
  silent_student: '🔕',
  not_registered_next_term: '📅',
}

export function BarrierChip({ barrier }: { barrier: string }) {
  const { data: meta } = useMeta()
  const label = meta?.barriers.find((b) => b.id === barrier)?.label ?? humanize(barrier)
  return (
    <span className="chip">
      <span className="chip__icon" aria-hidden="true">
        {BARRIER_ICONS[barrier] ?? '•'}
      </span>
      {label}
    </span>
  )
}

const STATUS_ICONS: Record<FlagStatus, IconName> = {
  new: 'clock',
  approved: 'check',
  edited: 'check',
  dismissed: 'x',
  routed: 'send',
}

export function StatusBadge({ status }: { status: FlagStatus }) {
  return (
    <span className={`badge badge--${status}`}>
      <Icon name={STATUS_ICONS[status]} size={14} />
      {STATUS_LABELS[status]}
    </span>
  )
}

type Tier = 'critical' | 'warning' | 'normal'
const WARNING_DAYS = 14

function tierFor(days: number, urgentDays: number): Tier {
  if (isUrgent(days, urgentDays)) return 'critical'
  return days <= WARNING_DAYS ? 'warning' : 'normal'
}

/**
 * Large "days left" figure for scanning the queue. Screen readers get the same sentence as
 * DaysToDrop ("Urgent: 3 days to drop"); the big number is visual only.
 */
export function DaysLeft({ days }: { days: number }) {
  const { data: meta } = useMeta()
  const tier = tierFor(days, meta?.urgent_days ?? DEFAULT_URGENT_DAYS)
  return (
    <span className={`days-left days-left--${tier}`}>
      <span className="visually-hidden">
        {tier === 'critical' ? 'Urgent: ' : ''}
        {daysLabel(days)}
      </span>
      <span className="days-left__num" aria-hidden="true">
        {days < 0 ? '!' : days}
      </span>
      <span className="days-left__unit" aria-hidden="true">
        {days < 0 ? 'passed' : days === 1 ? 'day left' : 'days left'}
      </span>
    </span>
  )
}

/** Red only when under the urgent threshold, and always with text + icon (not colour alone). */
export function DaysToDrop({ days }: { days: number }) {
  const { data: meta } = useMeta()
  const urgent = isUrgent(days, meta?.urgent_days ?? DEFAULT_URGENT_DAYS)
  return (
    <span className={urgent ? 'days days--urgent' : 'days'}>
      {urgent ? <Icon name="alert" size={14} /> : <Icon name="clock" size={14} />}
      {urgent ? <span className="visually-hidden">Urgent: </span> : null}
      {daysLabel(days)}
    </span>
  )
}
