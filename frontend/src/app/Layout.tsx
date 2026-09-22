import { Link, Outlet, useLocation } from 'react-router'

import { Toasts } from '../components/Toasts'
import { CoachNameField } from './CoachNameField'

type Section = 'upload' | 'queue' | 'summary' | 'help' | null

const NAV: { to: string; label: string; section: Exclude<Section, null> }[] = [
  { to: '/', label: 'Upload', section: 'upload' },
  { to: '/queue', label: 'Queue', section: 'queue' },
  { to: '/summary', label: 'Summary', section: 'summary' },
  { to: '/help', label: 'Help', section: 'help' },
]

/** Run pages live under /runs/:id, so match sections by path shape, not by link target. */
export function sectionFor(pathname: string): Section {
  if (pathname === '/') return 'upload'
  if (pathname === '/summary' || /^\/runs\/[^/]+\/summary$/.test(pathname)) return 'summary'
  if (pathname === '/queue' || pathname.startsWith('/runs/')) return 'queue'
  if (pathname === '/help') return 'help'
  return null
}

export function Layout() {
  const current = sectionFor(useLocation().pathname)
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <header className="site-header">
        <div className="site-header__inner">
          <Link to="/" className="brand" aria-label="My Path home">
            <svg aria-hidden="true" width="28" height="28" viewBox="0 0 32 32">
              <rect width="32" height="32" rx="8" fill="currentColor" />
              <path
                d="M8 24c4-10 12-6 16-16"
                stroke="var(--color-accent)"
                strokeWidth="3.5"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
            <span>My Path</span>
          </Link>
          <nav aria-label="Main">
            <ul className="nav">
              {NAV.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="nav__link"
                    aria-current={current === item.section ? 'page' : undefined}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <CoachNameField />
        </div>
      </header>
      <main id="main" className="site-main" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="site-footer">
        <p>Synthetic data only. Nothing is sent to students: a coach approves every message.</p>
      </footer>
      <Toasts />
    </>
  )
}
