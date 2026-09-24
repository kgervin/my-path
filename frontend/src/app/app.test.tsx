import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'

import { flags, meta, run, summary } from '../test/fixtures'
import { renderRoute } from '../test/render'
import { get, mockApi } from '../test/server'
import { sectionFor } from './Layout'

afterEach(() => vi.unstubAllGlobals())

describe('sectionFor', () => {
  it.each([
    ['/', 'upload'],
    ['/queue', 'queue'],
    ['/runs/abc', 'queue'],
    ['/runs/abc/students/f1', 'queue'],
    ['/summary', 'summary'],
    ['/runs/abc/summary', 'summary'],
    ['/help', 'help'],
    ['/nope', null],
  ])('%s -> %s', (path, section) => {
    expect(sectionFor(path)).toBe(section)
  })
})

describe('app shell', () => {
  it('has a skip link, landmarks and marks the current section', async () => {
    mockApi([get(/\/meta$/, () => meta), get(/\/runs\/latest$/, () => run)])
    const { container } = renderRoute('/help')
    expect(await screen.findByRole('heading', { level: 1, name: 'Help' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute(
      'href',
      '#main',
    )
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Help' })).toHaveAttribute('aria-current', 'page')
    expect(document.title).toBe('Help · My Path')
    expect(await screen.findByText('Failed payment')).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('sends Queue to the latest run', async () => {
    mockApi([
      get(/\/meta$/, () => meta),
      get(/\/runs\/latest$/, () => run),
      get(/\/runs\/run-1$/, () => run),
      get(/\/runs\/run-1\/summary$/, () => summary),
      get(/\/runs\/run-1\/flags$/, () => flags),
    ])
    const { router } = renderRoute('/queue')
    await waitFor(() => expect(document.title).toBe('Review queue · My Path'))
    expect(router.state.location.pathname).toBe('/runs/run-1')
  })

  it('explains what to do when there are no runs yet', async () => {
    mockApi([get(/\/meta$/, () => meta)])
    renderRoute('/summary')
    expect(await screen.findByText('No students to review yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Upload a CSV' })).toHaveAttribute('href', '/')
  })

  it('shows a helpful 404 page', async () => {
    mockApi([get(/\/meta$/, () => meta)])
    renderRoute('/does-not-exist')
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })

  it('saves the coach name for the action log', async () => {
    mockApi([get(/\/meta$/, () => meta)])
    const user = userEvent.setup()
    renderRoute('/help')
    await user.type(await screen.findByLabelText('Your name'), 'Coach Kim')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByText('Coach: Coach Kim')).toBeInTheDocument()
    expect(window.localStorage.getItem('my-path.coach-name')).toBe('Coach Kim')
  })
})
