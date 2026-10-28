import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { ApiError } from '../api/client'
import { usePageTitle } from '../hooks/usePageTitle'
import { Icon } from './Icon'

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <p className="state state--loading" role="status">
      <span className="spinner" aria-hidden="true" />
      {label}
    </p>
  )
}

/** Placeholder cards while the queue loads; screen readers hear only the label. */
export function SkeletonList({ label, rows = 5 }: { label: string; rows?: number }) {
  return (
    <div role="status" className="skeleton-list">
      <span className="visually-hidden">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton-card" aria-hidden="true">
          <span className="skeleton skeleton--avatar" />
          <span className="skeleton-card__lines">
            <span className="skeleton skeleton--line" />
            <span className="skeleton skeleton--line skeleton--short" />
          </span>
        </div>
      ))}
    </div>
  )
}

interface ErrorProps {
  error: unknown
  onRetry?: () => void
  children?: ReactNode
}

const FALLBACK = {
  title: 'Something went wrong',
  message: 'Please try again. If it keeps happening, reload the page.',
  errors: [] as string[],
}

/** Errors in plain words, with what to do next (heuristic 9). */
export function ErrorState({ error, onRetry, children }: ErrorProps) {
  // Retrying a missing record can't help; offer the ways forward instead.
  if (error instanceof ApiError && error.status === 404) return <NotFoundState />
  const { title, message, errors } = error instanceof ApiError ? error : FALLBACK
  return (
    <div className="state state--error" role="alert">
      <p className="state__title">
        <Icon name="alert" /> {title}
      </p>
      <p>{message}</p>
      <ProblemList lines={errors} />
      {children}
      {onRetry ? (
        <button type="button" className="button button--secondary" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  )
}

/** Every problem at once (e.g. each bad CSV row), so the file can be fixed in one pass. */
function ProblemList({ lines }: { lines: string[] }) {
  if (lines.length === 0) return null
  return (
    <ul className="state__list">
      {lines.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  )
}

function NotFoundState() {
  usePageTitle('Not found')
  return (
    <div className="state state--error" role="alert">
      <p className="state__title">
        <Icon name="alert" /> We couldn't find that review session
      </p>
      <p>
        The link may be old, or the session was removed. Go to the{' '}
        <Link to="/queue">latest queue</Link> or <Link to="/">upload a CSV</Link> to start a new
        one.
      </p>
    </div>
  )
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="state state--empty">
      <p className="state__title">{title}</p>
      {children}
    </div>
  )
}
