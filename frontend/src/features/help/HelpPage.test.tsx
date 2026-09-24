import { screen, within } from '@testing-library/react'
import { axe } from 'vitest-axe'

import { meta } from '../../test/fixtures'
import { renderRoute } from '../../test/render'
import { get, mockApi } from '../../test/server'

afterEach(() => vi.unstubAllGlobals())

describe('HelpPage', () => {
  it('documents the live barriers, statuses and shortcuts accessibly', async () => {
    mockApi([get(/\/meta$/, () => meta)])
    const { container } = renderRoute('/help')
    expect(await screen.findByRole('heading', { level: 1, name: 'Help' })).toBeInTheDocument()

    const sections = screen.getByRole('navigation', { name: 'Help sections' })
    expect(within(sections).getByRole('link', { name: 'Statuses' })).toHaveAttribute(
      'href',
      '#statuses',
    )

    const barriers = screen.getByRole('region', { name: 'Barriers' })
    const first = meta.barriers[0]
    if (!first) throw new Error('fixture needs a barrier')
    expect(await within(barriers).findByText(first.description)).toBeInTheDocument()

    expect(screen.getByText('Approved with edits')).toBeInTheDocument()
    expect(screen.getByText('Next student')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Privacy and safety' })).toHaveTextContent(
      'synthetic data only',
    )

    expect(await axe(container)).toHaveNoViolations()
  })
})
