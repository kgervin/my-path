import { useEffect } from 'react'

/** Sets the document title so screen reader users hear where they are after navigation. */
export function usePageTitle(title: string): void {
  useEffect(() => {
    document.title = `${title} · My Path`
  }, [title])
}
