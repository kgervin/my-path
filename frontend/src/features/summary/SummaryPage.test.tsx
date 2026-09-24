import { screen, within } from '@testing-library/react'
import { axe } from 'vitest-axe'

import { meta, run, summary } from '../../test/fixtures'
import { renderRoute } from '../../test/render'
import { get, mockApi } from '../../test/server'

afterEach(() => vi.unstubAllGlobals())

describe('SummaryPage', () => {
  it('shows totals by barrier and status in an accessible table', async () => {
    mockApi([
      get(/\/meta$/, () => meta),
      get(/\/runs\/run-1$/, () => run),
      get(/\/runs\/run-1\/summary$/, () => summary),
    ])
    const { container } = renderRoute('/runs/run-1/summary')
    expect(await screen.findByRole('heading', { level: 1, name: 'Summary' })).toBeInTheDocument()
    const table = await screen.findByRole('table', { name: 'By barrier type' })
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((h) => h.textContent)
    expect(headers).toEqual(['Barrier', 'Flagged', 'Approved', 'Routed', 'Dismissed'])
    const [, first] = within(table).getAllByRole('row')
    expect(within(first as HTMLElement).getByRole('rowheader')).toHaveTextContent(
      'Registration hold',
    )
    const cells = within(first as HTMLElement)
      .getAllByRole('cell')
      .map((c) => c.textContent)
    // registration_hold: 2 flagged, 1 approved (approved + edited), 0 routed, 0 dismissed
    expect(cells).toEqual(['2', '1', '0', '0'])
    expect(await axe(container)).toHaveNoViolations()
  })

  it('reports load failures with a retry', async () => {
    mockApi([
      get(/\/meta$/, () => meta),
      get(/\/runs\/run-1$/, () => ({ title: 'Boom', detail: 'Down' }), 500),
    ])
    renderRoute('/runs/run-1/summary')
    expect(await screen.findByRole('alert')).toHaveTextContent('Down')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})
