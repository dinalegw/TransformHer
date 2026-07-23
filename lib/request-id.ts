import { randomUUID } from 'crypto'

let requestIdHeader = 'x-request-id'

export function getRequestId(request: { headers: { get(name: string): string | null } }): string {
  const existing = request.headers.get(requestIdHeader)
  if (existing) return existing
  return randomUUID()
}

export function setRequestIdHeader(header: string): void {
  requestIdHeader = header
}
