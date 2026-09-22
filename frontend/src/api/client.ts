import type { FlagAction, FlagDetail, FlagFilters, FlagSummary, Meta, Run, Summary } from './types'

const BASE = '/api/v1'

/** RFC 9457 problem details, surfaced to people in plain language. */
export class ApiError extends Error {
  readonly status: number
  readonly title: string
  readonly errors: string[]

  constructor(status: number, title: string, detail: string, errors: string[] = []) {
    super(detail)
    this.name = 'ApiError'
    this.status = status
    this.title = title
    this.errors = errors
  }

  get isConflict(): boolean {
    return this.status === 409
  }
}

interface ProblemBody {
  title?: string
  detail?: string | { msg: string }[]
  errors?: string[]
}

async function toApiError(response: Response): Promise<ApiError> {
  const body = (await response.json().catch(() => ({}))) as ProblemBody
  const detail = Array.isArray(body.detail)
    ? body.detail.map((d) => d.msg).join(' ')
    : (body.detail ?? 'Something went wrong. Please try again.')
  return new ApiError(response.status, body.title ?? 'Request failed', detail, body.errors)
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { Accept: 'application/json', ...init?.headers },
    })
  } catch {
    throw new ApiError(
      0,
      'Connection problem',
      'We could not reach My Path. Check your connection and try again.',
    )
  }
  if (!response.ok) throw await toApiError(response)
  return (await response.json()) as T
}

function query(params: object): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
  return entries.length ? `?${new URLSearchParams(entries as [string, string][]).toString()}` : ''
}

export const api = {
  meta: () => request<Meta>('/meta'),
  latestRun: () => request<Run>('/runs/latest'),
  run: (runId: string) => request<Run>(`/runs/${runId}`),
  flags: (runId: string, filters: FlagFilters) =>
    request<FlagSummary[]>(`/runs/${runId}/flags${query(filters)}`),
  summary: (runId: string) => request<Summary>(`/runs/${runId}/summary`),
  flag: (flagId: string) => request<FlagDetail>(`/flags/${flagId}`),
  act: (flagId: string, action: FlagAction) =>
    request<FlagDetail>(`/flags/${flagId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action),
    }),
  upload: (file: File, asOf?: string) => {
    const form = new FormData()
    form.append('file', file)
    if (asOf) form.append('as_of', asOf)
    return request<Run>('/runs', { method: 'POST', body: form })
  },
  sampleCsvUrl: `${BASE}/sample-data.csv`,
}
