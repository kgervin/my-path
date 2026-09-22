import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

import { readStored, writeStored } from '../lib/storage'

const STORAGE_KEY = 'my-path.coach-name'

interface CoachNameValue {
  coachName: string
  setCoachName: (name: string) => void
}

const CoachNameContext = createContext<CoachNameValue | null>(null)

export function CoachNameProvider({ children }: { children: ReactNode }) {
  const [coachName, setName] = useState(() => readStored(STORAGE_KEY) ?? '')
  const setCoachName = useCallback((name: string) => {
    const trimmed = name.trim()
    setName(trimmed)
    writeStored(STORAGE_KEY, trimmed)
  }, [])
  const value = useMemo(() => ({ coachName, setCoachName }), [coachName, setCoachName])
  return <CoachNameContext value={value}>{children}</CoachNameContext>
}

export function useCoachName(): CoachNameValue {
  const value = useContext(CoachNameContext)
  if (!value) throw new Error('useCoachName must be used inside CoachNameProvider')
  return value
}
