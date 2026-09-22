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
    const table = await screen.findByRole('table', { name: 'Students by barrier and status' })
    const rows = within(table).getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Registration hold2')
    expect(within(rows[1] as HTMLElement).getByRole('rowheader')).toHaveTextContent(
      'Registration hold',
    )
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
