import { useEffect } from 'react'

type Handlers = Partial<Record<string, () => void>>

const TYPING = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

/** Single-key accelerators for expert users (heuristic 7). Ignored while typing. */
export function useHotkeys(handlers: Handlers, enabled = true): void {
  useEffect(() => {
    if (!enabled) return undefined
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (target && (TYPING.has(target.tagName) || target.isContentEditable)) return
      const handler = handlers[event.key]
      if (handler) {
        event.preventDefault()
        handler()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handlers, enabled])
}
