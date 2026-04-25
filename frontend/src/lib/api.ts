export type ApiError = {
  status: number
  message: string
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '')

export async function apiFetch<T>(
  path: string,
  opts?: {
    method?: string
    body?: unknown
    headers?: Record<string, string>
  },
): Promise<T> {
  if (!API_BASE) throw new Error('Missing VITE_API_BASE_URL')

  const res = await fetch(`${API_BASE}${path}`, {
    method: opts?.method ?? (opts?.body ? 'POST' : 'GET'),
    headers: {
      'Content-Type': 'application/json',
      ...(opts?.headers ?? {}),
    },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
    credentials: 'include',
  })

  const contentType = res.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const payload = isJson ? await res.json() : await res.text()

  if (!res.ok) {
    const msg =
      typeof payload === 'string'
        ? payload
        : (payload?.detail as string | undefined) || (payload?.message as string | undefined) || 'Request failed'
    const err: ApiError = { status: res.status, message: msg }
    throw err
  }

  return payload as T
}

