import type { ReactNode } from 'react'

import { ApiError } from '../api/client'
import { Icon } from './Icon'

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <p className="state state--loading" role="status">
      <span className="spinner" aria-hidden="true" />
      {label}
    </p>
  )
}

interface ErrorProps {
  error: unknown
  onRetry?: () => void
  children?: ReactNode
}

/** Errors in plain words, with what to do next (heuristic 9). */
export function ErrorState({ error, onRetry, children }: ErrorProps) {
  const apiError = error instanceof ApiError ? error : null
  return (
    <div className="state state--error" role="alert">
      <p className="state__title">
        <Icon name="alert" /> {apiError?.title ?? 'Something went wrong'}
      </p>
      <p>{apiError?.message ?? 'Please try again. If it keeps happening, reload the page.'}</p>
      {apiError?.errors.length ? (
        <ul className="state__list">
          {apiError.errors.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
      {children}
      {onRetry ? (
        <button type="button" className="button button--secondary" onClick={onRetry}>
          Try again
        </button>
      ) : null}
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
