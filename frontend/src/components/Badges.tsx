import { useMeta } from '../api/queries'
import type { FlagStatus } from '../api/types'
import { daysLabel, humanize, isUrgent, STATUS_LABELS } from '../lib/format'
import { Icon, type IconName } from './Icon'

const DEFAULT_URGENT_DAYS = 7

export function BarrierChip({ barrier }: { barrier: string }) {
  const { data: meta } = useMeta()
  const label = meta?.barriers.find((b) => b.id === barrier)?.label ?? humanize(barrier)
  return <span className="chip">{label}</span>
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
