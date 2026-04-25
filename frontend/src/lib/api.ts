export type ApiError = {
  status: number
  message: string
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '')

function toMessage(payload: unknown): string {
  if (typeof payload === 'string') return payload
  if (!payload || typeof payload !== 'object') return 'Request failed'

  const anyPayload = payload as any
  const detail = anyPayload?.detail
  if (typeof detail === 'string') return detail

  // FastAPI validation errors: { detail: [ { msg, loc, ...}, ... ] }
  if (Array.isArray(detail) && detail.length) {
    const first = detail[0]
    if (first && typeof first === 'object' && 'msg' in first) return String((first as any).msg)
    return JSON.stringify(detail)
  }

  const msg = anyPayload?.message
  if (typeof msg === 'string') return msg

  try {
    return JSON.stringify(payload)
  } catch {
    return 'Request failed'
  }
}

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
    const err: ApiError = { status: res.status, message: toMessage(payload) }
    throw err
  }

  return payload as T
}

