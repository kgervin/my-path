import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'

import { ApiError } from '../api/client'
import { CoachNameProvider } from '../hooks/useCoachName'
import { ToastProvider } from '../hooks/useToasts'

const MAX_RETRIES = 2

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5_000,
        // Retry transient failures only; 4xx responses will not fix themselves.
        retry: (count, error) =>
          count < MAX_RETRIES &&
          !(error instanceof ApiError && error.status >= 400 && error.status < 500),
      },
    },
  })
}

export function Providers({ children, client }: { children: ReactNode; client?: QueryClient }) {
  const [queryClient] = useState(() => client ?? createQueryClient())
  return (
    <QueryClientProvider client={queryClient}>
      <CoachNameProvider>
        <ToastProvider>{children}</ToastProvider>
      </CoachNameProvider>
    </QueryClientProvider>
  )
}
