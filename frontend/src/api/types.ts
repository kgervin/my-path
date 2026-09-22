// Mirrors backend/src/my_path/api/schemas.py (API v1).

export type RunStatus = 'processing' | 'ready' | 'failed'
export type FlagStatus = 'new' | 'approved' | 'edited' | 'dismissed' | 'routed'
export type Urgency = 'urgent' | 'soon' | 'later'
export type Language = 'en' | 'es'
export type Tone = 'warm' | 'brief'
export type RouteTarget = 'bursar' | 'aid_office'

export interface Run {
  id: string
  filename: string
  as_of: string
  status: RunStatus
  total_records: number
  flagged_count: number
  drafted_count: number
  created_at: string
}

export interface FlagSummary {
  id: string
  student_id: string
  first_name: string
  program: string
  barrier_types: string[]
  days_to_drop: number
  route_to: string[]
  status: FlagStatus
  draft_source: 'ai' | 'template' | null
  version: number
}

export interface ActionLogEntry {
  id: string
  action: string
  coach: string
  before_text: string | null
  after_text: string | null
  reason: string | null
  created_at: string
}

export interface FlagDetail extends FlagSummary {
  run_id: string
  explanation: string | null
  source_fields: Record<string, string>
  draft_message: string | null
  original_draft: string | null
  draft_language: Language | null
  dismiss_reason: string | null
  routed_to: RouteTarget | null
  preferred_language: Language
  actions: ActionLogEntry[]
}

export interface Counters {
  flagged: number
  pending: number
  approved: number
  routed: number
  dismissed: number
  most_urgent_days_to_drop: number | null
}

export interface Summary {
  run: Run
  counters: Counters
  by_status: Partial<Record<FlagStatus, number>>
  by_barrier: Record<string, number>
  by_barrier_status: Record<string, Partial<Record<FlagStatus, number>>>
  programs: string[]
}

export interface BarrierInfo {
  id: string
  label: string
  description: string
  routes_to: string[]
}

export interface Meta {
  required_columns: string[]
  barriers: BarrierInfo[]
  max_upload_bytes: number
  max_words: number
  urgent_days: number
}

export interface FlagFilters {
  barrier?: string
  program?: string
  status?: FlagStatus
  urgency?: Urgency
}

export type FlagActionBody =
  | { action: 'approve'; message?: string }
  | { action: 'dismiss'; reason: string }
  | { action: 'route'; route_to: RouteTarget }
  | { action: 'reopen' }
  | { action: 'redraft'; language: Language; tone: Tone }

export type FlagAction = FlagActionBody & { coach: string; version: number }
