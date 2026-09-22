import { vi } from 'vitest'

type Handler = (body: Record<string, unknown>, url: URL) => unknown
interface Route {
  method: string
  pattern: RegExp
  handler: Handler
  status: number
}

const REPLY = Symbol('reply')
interface Reply {
  [REPLY]: true
  status: number
  body: unknown
}

/** Return from a handler to choose the status code dynamically. */
export const reply = (status: number, body: unknown): Reply => ({ [REPLY]: true, status, body })
const isReply = (value: unknown): value is Reply =>
  typeof value === 'object' && value !== null && REPLY in value

/** Minimal fetch fake: route by method + path regex, record calls, return JSON. */
export function mockApi(routes: Route[]) {
  const calls: { method: string; path: string; body: Record<string, unknown> }[] = []
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const url = new URL(String(input), 'http://localhost')
    const method = init?.method ?? 'GET'
    const body =
      typeof init?.body === 'string' ? (JSON.parse(init.body) as Record<string, unknown>) : {}
    calls.push({ method, path: url.pathname + url.search, body })
    const route = routes.find((r) => r.method === method && r.pattern.test(url.pathname))
    if (!route)
      return new Response(JSON.stringify({ title: 'Not found', detail: 'nope' }), { status: 404 })
    const result = route.handler(body, url)
    const { status, body: payload } = isReply(result)
      ? result
      : { status: route.status, body: result }
    return new Response(JSON.stringify(payload), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  })
  vi.stubGlobal('fetch', fetchMock)
  const posts = () => calls.filter((c) => c.method === 'POST')
  return { calls, posts }
}

export const get = (pattern: RegExp, handler: Handler, status = 200): Route => ({
  method: 'GET',
  pattern,
  handler,
  status,
})
export const post = (pattern: RegExp, handler: Handler, status = 200): Route => ({
  method: 'POST',
  pattern,
  handler,
  status,
})
