import type { FlagStatus, RouteTarget } from '../api/types'

export function daysLabel(days: number): string {
  if (days < 0) return `Drop date passed ${Math.abs(days)} ${days === -1 ? 'day' : 'days'} ago`
  if (days === 0) return 'Drop date is today'
  return `${days} ${days === 1 ? 'day' : 'days'} to drop`
}

export function isUrgent(days: number, urgentDays: number): boolean {
  return days < urgentDays
}

export const STATUS_LABELS: Record<FlagStatus, string> = {
  new: 'Needs review',
  approved: 'Approved',
  edited: 'Approved with edits',
  dismissed: 'Dismissed',
  routed: 'Routed',
}

export const ROUTE_LABELS: Record<RouteTarget | 'coach', string> = {
  coach: 'Coach',
  bursar: 'Bursar',
  aid_office: 'Aid office',
}

export const FIELD_LABELS: Record<string, string> = {
  balance_usd: 'Balance (USD)',
  hold_codes: 'Hold codes',
  last_payment_status: 'Last payment status',
  aid_items_missing: 'Aid items missing',
  last_lms_login: 'Last course login',
  next_term_credits: 'Next-term credits',
  drop_date: 'Drop date',
}

export function humanize(value: string): string {
  const spaced = value.replaceAll('_', ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  )
}
