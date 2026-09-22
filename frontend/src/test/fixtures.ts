import type { FlagDetail, FlagSummary, Meta, Run, Summary } from '../api/types'

export const meta: Meta = {
  required_columns: ['student_id', 'first_name', 'program', 'drop_date'],
  barriers: [
    {
      id: 'failed_payment',
      label: 'Failed payment',
      description: 'Payment failed.',
      routes_to: ['coach', 'bursar'],
    },
    {
      id: 'registration_hold',
      label: 'Registration hold',
      description: 'Has a hold.',
      routes_to: ['coach'],
    },
  ],
  max_upload_bytes: 2_097_152,
  max_words: 120,
  urgent_days: 7,
}

export const run: Run = {
  id: 'run-1',
  filename: 'students.csv',
  as_of: '2026-09-22',
  status: 'ready',
  total_records: 200,
  flagged_count: 2,
  drafted_count: 2,
  created_at: '2026-09-22T17:00:00Z',
}

export const flags: FlagSummary[] = [
  {
    id: 'f1',
    student_id: 'S0001',
    first_name: 'Maria',
    program: 'BS Psychology',
    barrier_types: ['failed_payment', 'registration_hold'],
    days_to_drop: 3,
    route_to: ['coach', 'bursar'],
    status: 'new',
    draft_source: 'template',
    version: 1,
  },
  {
    id: 'f2',
    student_id: 'S0002',
    first_name: 'Wei',
    program: 'BA Communication',
    barrier_types: ['registration_hold'],
    days_to_drop: 20,
    route_to: ['coach'],
    status: 'approved',
    draft_source: 'ai',
    version: 2,
  },
]

export const flagDetail: FlagDetail = {
  ...(flags[0] as FlagSummary),
  run_id: 'run-1',
  explanation:
    'Maria has a failed last payment (last_payment_status); the drop date is 2026-09-25.',
  source_fields: {
    drop_date: '2026-09-25',
    last_payment_status: 'failed',
    hold_codes: 'BURSAR_HOLD',
  },
  draft_message: 'Hi Maria,\n\nYour last payment did not go through.\n\nYour success coach',
  original_draft: 'Hi Maria,\n\nYour last payment did not go through.\n\nYour success coach',
  draft_language: 'en',
  dismiss_reason: null,
  routed_to: null,
  preferred_language: 'en',
  actions: [],
}

export const summary: Summary = {
  run,
  counters: {
    flagged: 2,
    pending: 1,
    approved: 1,
    routed: 0,
    dismissed: 0,
    most_urgent_days_to_drop: 3,
  },
  by_status: { new: 1, approved: 1 },
  by_barrier: { failed_payment: 1, registration_hold: 2 },
  by_barrier_status: { failed_payment: { new: 1 }, registration_hold: { new: 1, approved: 1 } },
  programs: ['BA Communication', 'BS Psychology'],
}
