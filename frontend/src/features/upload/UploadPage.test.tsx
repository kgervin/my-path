import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'

import { meta, run } from '../../test/fixtures'
import { renderRoute } from '../../test/render'
import { get, mockApi, post } from '../../test/server'

afterEach(() => vi.unstubAllGlobals())

const header = meta.required_columns.join(',')
const csv = (text: string) => new File([text], 'students.csv', { type: 'text/csv' })

describe('UploadPage', () => {
  it('is accessible and explains the task', async () => {
    mockApi([get(/\/meta$/, () => meta)])
    const { container } = renderRoute('/')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Surface students before they slip.' }),
    ).toHaveFocus()
    expect(document.title).toBe('Upload student records · My Path')
    expect(
      screen.getByRole('heading', { level: 2, name: 'Upload student records' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Try sample data/ })).toBeEnabled()
    expect(screen.getByRole('link', { name: 'Upload CSV' })).toHaveAttribute('href', '#upload')
    expect(screen.getByRole('button', { name: 'Run My Path' })).toBeDisabled()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('blocks upload and names missing columns before sending anything', async () => {
    const { calls } = mockApi([get(/\/meta$/, () => meta)])
    const user = userEvent.setup()
    renderRoute('/')
    await screen.findByText('Required CSV columns')
    await user.upload(
      screen.getByLabelText(/Choose or drop a CSV file/),
      csv('student_id,first_name\nS1,Ana\n'),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Missing columns: program, drop_date',
    )
    expect(screen.getByRole('button', { name: 'Run My Path' })).toBeDisabled()
    expect(calls.some((c) => c.method === 'POST')).toBe(false)
  })

  it('uploads a valid file and opens the queue', async () => {
    const { posts: uploads } = mockApi([
      get(/\/meta$/, () => meta),
      post(/\/runs$/, () => ({ ...run, status: 'processing' }), 202),
      get(/\/runs\/run-1$/, () => run),
      get(/\/runs\/run-1\/summary$/, () => ({})),
      get(/\/runs\/run-1\/flags$/, () => []),
    ])
    const user = userEvent.setup()
    const { router } = renderRoute('/')
    await screen.findByText('Required CSV columns')
    await user.upload(
      screen.getByLabelText(/Choose or drop a CSV file/),
      csv(`${header}\nS1,Ana,BS,2026-10-01\n`),
    )
    expect(await screen.findByText('All required columns found. Ready to run.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Run My Path' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/runs/run-1'))
    expect(uploads().at(-1)?.path).toBe('/api/v1/runs')
  })

  it('shows every server-side row error so the file can be fixed in one pass', async () => {
    mockApi([
      get(/\/meta$/, () => meta),
      post(
        /\/runs$/,
        () => ({
          title: 'The file needs a few fixes',
          detail: 'We found 2 problem(s).',
          errors: ['Row 2: bad', 'Row 3: bad'],
        }),
        422,
      ),
    ])
    const user = userEvent.setup()
    renderRoute('/')
    await screen.findByText('Required CSV columns')
    await user.upload(
      screen.getByLabelText(/Choose or drop a CSV file/),
      csv(`${header}\nS1,Ana,BS,x\n`),
    )
    await user.click(await screen.findByRole('button', { name: 'Run My Path' }))
    expect(await screen.findByText('The file needs a few fixes')).toBeInTheDocument()
    expect(screen.getByText('Row 3: bad')).toBeInTheDocument()
  })

  it('runs the built-in sample in one click and opens the queue', async () => {
    const { posts } = mockApi([
      get(/\/meta$/, () => meta),
      get(/\/sample-data\.csv$/, () => 'student_id,first_name'),
      post(/\/runs$/, () => ({ ...run, status: 'processing' }), 202),
      get(/\/runs\/run-1$/, () => run),
      get(/\/runs\/run-1\/summary$/, () => ({})),
      get(/\/runs\/run-1\/flags$/, () => []),
    ])
    const user = userEvent.setup()
    const { router } = renderRoute('/')
    await user.click(await screen.findByRole('button', { name: /Try sample data/ }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/runs/run-1'))
    expect(posts()).toHaveLength(1)
  })
})
