import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'

import { flagDetail, flags, meta, run, summary } from '../../test/fixtures'
import { renderRoute } from '../../test/render'
import { get, mockApi } from '../../test/server'

afterEach(() => vi.unstubAllGlobals())

function api(overrides: { run?: object; flags?: object[] } = {}) {
  return mockApi([
    get(/\/meta$/, () => meta),
    get(/\/runs\/run-1$/, () => ({ ...run, ...overrides.run })),
    get(/\/runs\/run-1\/summary$/, () => summary),
    get(/\/runs\/run-1\/flags$/, (_init, url) =>
      url.searchParams.get('barrier') === 'failed_payment' ? [] : (overrides.flags ?? flags),
    ),
    get(/\/flags\/f1$/, () => flagDetail),
    get(/\/flags\/f2$/, () => ({ ...flagDetail, ...flags[1] })),
  ])
}

describe('QueuePage', () => {
  it('shows counters and students, most urgent first, with urgency in text not just colour', async () => {
    api()
    const { container } = renderRoute('/runs/run-1')
    const list = await screen.findByRole('list', { name: /Flagged students/ })
    const items = within(list).getAllByRole('link')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Maria')
    expect(items[0]).toHaveTextContent('Urgent: 3 days to drop')
    expect(items[1]).not.toHaveTextContent('Urgent')
    expect(screen.getByText('Showing 2 of 2 flagged students')).toBeInTheDocument()
    const counters = screen.getByRole('region', { name: 'Progress this run' })
    expect(within(counters).getByText('Needs review').nextSibling).toHaveTextContent('1')
    expect(await axe(container)).toHaveNoViolations()
  })

  it('keeps filters in the URL and offers a way out of empty results', async () => {
    const { calls } = api()
    const user = userEvent.setup()
    const { router } = renderRoute('/runs/run-1')
    await screen.findByRole('list', { name: /Flagged students/ })
    await user.selectOptions(screen.getByLabelText('Barrier'), 'failed_payment')
    expect(await screen.findByText('No students match these filters')).toBeInTheDocument()
    expect(router.state.location.search).toBe('?barrier=failed_payment')
    expect(calls.some((c) => c.path.endsWith('flags?barrier=failed_payment'))).toBe(true)
    await user.click(screen.getAllByRole('button', { name: 'Clear filters' })[0] as HTMLElement)
    await waitFor(() => expect(router.state.location.search).toBe(''))
  })

  it('shows drafting progress while the run is processing', async () => {
    api({ run: { status: 'processing', drafted_count: 1 } })
    renderRoute('/runs/run-1')
    expect(await screen.findByText('Writing drafts: 1 of 2')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '1')
  })

  it('explains a failed run and a run with no barriers', async () => {
    api({ run: { status: 'failed', drafted_count: 1 } })
    renderRoute('/runs/run-1')
    expect(await screen.findByText('Drafting stopped early')).toBeInTheDocument()
  })

  it('celebrates an empty run', async () => {
    api({ run: { flagged_count: 0 }, flags: [] })
    renderRoute('/runs/run-1')
    expect(await screen.findByText('No barriers found')).toBeInTheDocument()
  })

  it('moves between students with j and k', async () => {
    api()
    const user = userEvent.setup()
    const { router } = renderRoute('/runs/run-1')
    await screen.findByRole('list', { name: /Flagged students/ })
    await user.keyboard('j')
    await waitFor(() => expect(router.state.location.pathname).toBe('/runs/run-1/students/f1'))
    await screen.findByRole('heading', { level: 2, name: /Maria/ })
    await user.keyboard('j')
    await waitFor(() => expect(router.state.location.pathname).toBe('/runs/run-1/students/f2'))
    await user.keyboard('k')
    await waitFor(() => expect(router.state.location.pathname).toBe('/runs/run-1/students/f1'))
  })
})
