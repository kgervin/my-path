import { useEffect, useRef, type ReactNode } from 'react'

import { usePageTitle } from '../hooks/usePageTitle'

interface Props {
  title: string
  children?: ReactNode
  /** Move focus here on mount so keyboard and screen reader users land at the new page. */
  focusOnMount?: boolean
}

export function PageHeading({ title, children, focusOnMount = true }: Props) {
  const ref = useRef<HTMLHeadingElement>(null)
  usePageTitle(title)
  useEffect(() => {
    if (focusOnMount) ref.current?.focus({ preventScroll: true })
  }, [focusOnMount])
  return (
    <div className="page-heading">
      <h1 ref={ref} tabIndex={-1}>
        {title}
      </h1>
      {children ? <div className="page-heading__lede">{children}</div> : null}
    </div>
  )
}
