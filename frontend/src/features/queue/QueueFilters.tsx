import { useId } from 'react'

import { useMeta } from '../../api/queries'
import { STATUS_LABELS } from '../../lib/format'
import type { useQueueFilters } from './useQueueFilters'

type Props = ReturnType<typeof useQueueFilters> & { programs: string[] | undefined }

const URGENCY_OPTIONS = [
  ['urgent', 'Under 7 days'],
  ['soon', '7 to 14 days'],
  ['later', 'More than 14 days'],
] as const

const NO_PROGRAMS: string[] = []

export function QueueFilters({ filters, setFilter, clear, active, programs = NO_PROGRAMS }: Props) {
  const { data: meta } = useMeta()
  const id = useId()
  return (
    <search className="filters" aria-label="Filter students">
      <div className="field field--compact">
        <label htmlFor={`${id}-barrier`}>Barrier</label>
        <select
          id={`${id}-barrier`}
          value={filters.barrier ?? ''}
          onChange={(e) => setFilter('barrier', e.target.value)}
        >
          <option value="">All barriers</option>
          {meta?.barriers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field field--compact">
        <label htmlFor={`${id}-urgency`}>Days to drop</label>
        <select
          id={`${id}-urgency`}
          value={filters.urgency ?? ''}
          onChange={(e) => setFilter('urgency', e.target.value)}
        >
          <option value="">Any time</option>
          {URGENCY_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="field field--compact">
        <label htmlFor={`${id}-program`}>Program</label>
        <select
          id={`${id}-program`}
          value={filters.program ?? ''}
          onChange={(e) => setFilter('program', e.target.value)}
        >
          <option value="">All programs</option>
          {programs.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
      <div className="field field--compact">
        <label htmlFor={`${id}-status`}>Status</label>
        <select
          id={`${id}-status`}
          value={filters.status ?? ''}
          onChange={(e) => setFilter('status', e.target.value)}
        >
          <option value="">Any status</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {active ? (
        <button type="button" className="button button--link" onClick={clear}>
          Clear filters
        </button>
      ) : null}
    </search>
  )
}
