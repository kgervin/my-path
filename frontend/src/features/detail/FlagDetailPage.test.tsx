import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'

import type { FlagDetail } from '../../api/types'
import { flagDetail, flags, meta, run, summary } from '../../test/fixtures'
import { renderRoute } from '../../test/render'
import { get, mockApi, post, reply } from '../../test/server'

afterEach(() => vi.unstubAllGlobals())

const PATH = '/runs/run-1/students/f1'

/** Serves one flag; POSTed actions return whatever ``respond`` builds (and become current). */
function api(respond: (body: Record<string, unknown>) => unknown) {
  let current: FlagDetail = flagDetail
  const { posts } = mockApi([
    get(/\/meta$/, () => meta),
    get(/\/runs\/run-1$/, () => run),
    get(/\/runs\/run-1\/summary$/, () => summary),
    get(/\/runs\/run-1\/flags$/, () => flags),
    get(/\/flags\/f1$/, () => current),
    post(/\/flags\/f1\/actions$/, (body) => {
      const result = respond(body)
      if (!(result && typeof result === 'object' && 'title' in result))
        current = result as FlagDetail
      return result
    }),
  ])
  return posts
}

const decided = (body: Record<string, unknown>, extra: Partial<FlagDetail>): FlagDetail => ({
  ...flagDetail,
  version: Number(body.version) + 1,
  ...extra,
})

function withCoach() {
  window.localStorage.setItem('my-path.coach-name', 'Coach Kim')
}

describe('FlagDetailPage: what the coach sees', () => {
  it('shows why the student was flagged with the exact source fields', async () => {
    withCoach()
    api(() => flagDetail)
    const { container } = renderRoute(PATH)
    const heading = await screen.findByRole('heading', { level: 2, name: /Maria/ })
    await waitFor(() => expect(heading).toHaveFocus())
    expect(document.title).toBe('Maria (S0001) · My Path')
    const header = screen.getByRole('region', { name: 'Maria' })
    expect(within(header).getByText(/Suggested route: Coach, Bursar/)).toBeInTheDocument()
    expect(within(header).getByText('BS Psychology · S0001')).toBeInTheDocument()
    const barriers = screen.getByRole('region', { name: 'Detected barriers' })
    const paymentFields = within(barriers).getByLabelText('Source fields for Failed payment')
    expect(within(paymentFields).getByText('Last payment status')).toBeInTheDocument()
    expect(within(paymentFields).queryByText('Hold codes')).toBeNull()
    const holdFields = within(barriers).getByLabelText('Source fields for Registration hold')
    expect(within(holdFields).getByText('BURSAR_HOLD')).toBeInTheDocument()
    expect(
      within(barriers).getByText('Ask them to update their payment method.'),
    ).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('FlagDetailPage', () => {
  it('approves with edits, sending coach name and version, and offers Undo', async () => {
    withCoach()
    const posts = api((body) =>
      body.action === 'approve'
        ? decided(body, { status: 'edited', draft_message: String(body.message) })
        : decided(body, { status: 'new' }),
    )
    const user = userEvent.setup()
    renderRoute(PATH)
    const textarea = await screen.findByLabelText('Message to Maria')
    await user.type(textarea, ' See you soon.')
    expect(screen.getByRole('button', { name: 'Restore original draft' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Approve with edits' }))

    expect(await screen.findByText(/Approved with edits\. Nothing was sent/)).toBeInTheDocument()
    expect(posts().at(-1)?.body).toMatchObject({
      action: 'approve',
      coach: 'Coach Kim',
      version: 1,
    })
    expect(screen.getByRole('button', { name: 'Reopen' })).toHaveFocus()

    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(await screen.findByText('Maria is back in the queue.')).toBeInTheDocument()
    expect(posts().at(-1)?.body).toMatchObject({ action: 'reopen', version: 2 })
  })

  it('asks for the coach name before any decision', async () => {
    api(() => flagDetail)
    renderRoute(PATH)
    expect(await screen.findByText(/Add your name before you decide/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled()
  })

  it('prevents approving an over-long message and says why', async () => {
    withCoach()
    api(() => flagDetail)
    const user = userEvent.setup()
    renderRoute(PATH)
    const textarea = await screen.findByLabelText('Message to Maria')
    await user.clear(textarea)
    await user.click(textarea)
    await user.paste('Hi Maria, '.concat('word '.repeat(125)))
    expect(await screen.findByText(/Shorten the message to under 120 words/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Approve with edits' })).toBeDisabled()
  })

  it('requires a reason to dismiss', async () => {
    withCoach()
    const posts = api((body) =>
      decided(body, { status: 'dismissed', dismiss_reason: String(body.reason) }),
    )
    const user = userEvent.setup()
    renderRoute(PATH)
    await user.click(await screen.findByRole('button', { name: 'Dismiss' }))
    const dialog = screen.getByRole('dialog', { name: 'Dismiss Maria?' })
    const confirm = within(dialog).getByRole('button', { name: 'Dismiss' })
    expect(confirm).toBeDisabled()
    await user.click(within(dialog).getByLabelText('Other'))
    await user.type(within(dialog).getByLabelText('Describe the reason'), 'Paid by phone')
    await user.click(confirm)
    expect(await screen.findByText(/Dismissed: Paid by phone/)).toBeInTheDocument()
    expect(posts().at(-1)?.body).toMatchObject({ action: 'dismiss', reason: 'Paid by phone' })
  })

  it('routes to the suggested office', async () => {
    withCoach()
    const posts = api((body) => decided(body, { status: 'routed', routed_to: 'bursar' }))
    const user = userEvent.setup()
    renderRoute(PATH)
    await user.click(await screen.findByRole('button', { name: 'Route' }))
    const dialog = screen.getByRole('dialog', { name: /Route Maria/ })
    expect(within(dialog).getByLabelText(/Bursar/)).toBeChecked()
    await user.click(within(dialog).getByRole('button', { name: 'Route to Bursar' }))
    expect(await screen.findByText(/Routed to Bursar/)).toBeInTheDocument()
    expect(posts().at(-1)?.body).toMatchObject({ action: 'route', route_to: 'bursar' })
  })

  it('confirms before a redraft replaces edits', async () => {
    withCoach()
    const posts = api((body) =>
      decided(body, {
        draft_language: 'es',
        draft_message: 'Hola Maria',
        original_draft: 'Hola Maria',
      }),
    )
    const user = userEvent.setup()
    renderRoute(PATH)
    await user.type(await screen.findByLabelText('Message to Maria'), '!')
    await user.click(screen.getByRole('button', { name: 'Español' }))
    const dialog = screen.getByRole('dialog', { name: 'Replace your edits?' })
    await user.click(within(dialog).getByRole('button', { name: 'Replace edits' }))
    await waitFor(() => expect(screen.getByLabelText('Message to Maria')).toHaveValue('Hola Maria'))
    expect(posts().at(-1)?.body).toMatchObject({ action: 'redraft', language: 'es', tone: 'warm' })
  })

  it('explains an edit conflict and offers to load the latest version', async () => {
    withCoach()
    api(() => reply(409, { title: 'Changed by someone else', detail: 'Reload to see it.' }))
    const user = userEvent.setup()
    renderRoute(PATH)
    await user.click(await screen.findByRole('button', { name: 'Approve' }))
    expect(await screen.findByText('Changed by someone else')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Load the latest version' })).toBeInTheDocument()
  })
})
