import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'

import { meta } from '../../test/fixtures'
import { renderRoute } from '../../test/render'
import { get, mockApi } from '../../test/server'

afterEach(() => vi.unstubAllGlobals())

describe('HelpPage', () => {
  it('documents the live barrier rules, the CSV columns and FAQs accessibly', async () => {
    mockApi([get(/\/meta$/, () => meta)])
    const user = userEvent.setup()
    const { container } = renderRoute('/help')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Help & reference' }),
    ).toBeInTheDocument()
    expect(document.title).toBe('Help · My Path')

    const sections = screen.getByRole('navigation', { name: 'Help sections' })
    expect(within(sections).getByRole('link', { name: 'FAQ' })).toHaveAttribute('href', '#faq')

    const rules = screen.getByRole('region', { name: 'Barrier detection rules' })
    const first = meta.barriers[0]
    if (!first) throw new Error('fixture needs a barrier')
    expect(await within(rules).findByText(first.description)).toBeInTheDocument()
    expect(within(rules).getByText(first.suggested_fix)).toBeInTheDocument()

    const table = screen.getByRole('table', { name: 'Required CSV columns' })
    expect(within(table).getByRole('rowheader', { name: 'drop_date' })).toBeInTheDocument()

    const question = screen.getByText('Can I undo a decision?')
    const answer = screen.getByText(/choose Reopen/)
    expect(answer).not.toBeVisible()
    await user.click(question)
    expect(answer).toBeVisible()

    expect(await axe(container)).toHaveNoViolations()
  })
})
