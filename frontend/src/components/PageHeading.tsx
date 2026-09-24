import { useEffect, useRef, type ReactNode } from 'react'

import { usePageTitle } from '../hooks/usePageTitle'

interface Props {
  title: string
  /** Browser tab title when it should differ from the visible heading. */
  documentTitle?: string
  /** Small uppercase label above the heading, e.g. "Coach queue". */
  kicker?: string
  /** Lets a surrounding landmark reference the heading (aria-labelledby). */
  id?: string
  children?: ReactNode
  /** Move focus here on mount so keyboard and screen reader users land at the new page. */
  focusOnMount?: boolean
}

export function PageHeading({
  title,
  documentTitle,
  kicker,
  id,
  children,
  focusOnMount = true,
}: Props) {
  const ref = useRef<HTMLHeadingElement>(null)
  usePageTitle(documentTitle ?? title)
  useEffect(() => {
    if (focusOnMount) ref.current?.focus({ preventScroll: true })
  }, [focusOnMount])
  return (
    <div className="page-heading">
      {kicker ? <p className="kicker">{kicker}</p> : null}
      <h1 ref={ref} id={id} tabIndex={-1}>
        {title}
      </h1>
      {children ? <div className="page-heading__lede">{children}</div> : null}
    </div>
  )
}
