import { api, ApiError } from './client'

afterEach(() => vi.unstubAllGlobals())

describe('api client', () => {
  it('builds filter query strings without empty values', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response('[]'))
    vi.stubGlobal('fetch', fetchMock)
    await api.flags('r1', { barrier: 'failed_payment', program: '', status: undefined })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/runs/r1/flags?barrier=failed_payment',
      expect.anything(),
    )
  })

  it('turns problem+json into ApiError with row errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              title: 'The file needs a few fixes',
              detail: 'Fix 1',
              errors: ['Row 2'],
            }),
            {
              status: 422,
            },
          ),
      ),
    )
    const error = await api.meta().catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 422,
      title: 'The file needs a few fixes',
      message: 'Fix 1',
      errors: ['Row 2'],
    })
  })

  it('flattens FastAPI validation details and flags conflicts', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ detail: [{ msg: 'bad' }, { msg: 'worse' }] }), {
            status: 409,
          }),
      ),
    )
    const error = (await api.meta().catch((e: unknown) => e)) as ApiError
    expect(error.message).toBe('bad worse')
    expect(error.isConflict).toBe(true)
  })

  it('reports network failures in plain words', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))),
    )
    await expect(api.meta()).rejects.toMatchObject({ status: 0, title: 'Connection problem' })
  })

  it('uploads multipart form data with the as-of date', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response('{}'))
    vi.stubGlobal('fetch', fetchMock)
    await api.upload(new File(['x'], 'a.csv'), '2026-09-22')
    const [, init] = fetchMock.mock.calls[0] ?? []
    expect(init?.method).toBe('POST')
    const form = init?.body
    expect(form).toBeInstanceOf(FormData)
    expect(form instanceof FormData && form.get('as_of')).toBe('2026-09-22')
  })
})
