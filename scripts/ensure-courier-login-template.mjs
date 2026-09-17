const isVercel = Boolean(process.env.VERCEL)
const apiKey = process.env.COURIER_API_KEY

if (!isVercel || !apiKey) {
  console.log('[courier-bootstrap] skipped: Vercel runtime or COURIER_API_KEY unavailable')
  process.exit(0)
}

const API_BASE = 'https://api.courier.com'
const TEMPLATE_NAME = 'TransformHer Login Notification'
const ROUTING_NAME = 'TransformHer Email'

const headers = {
  Authorization: `Bearer ${apiKey}`,
  Accept: 'application/json',
  'Content-Type': 'application/json',
}

async function courier(path, init = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers || {}) },
  })

  const raw = await response.text()
  let body = null
  if (raw) {
    try {
      body = JSON.parse(raw)
    } catch {
      body = raw
    }
  }

  if (!response.ok) {
    throw new Error(`Courier ${init.method || 'GET'} ${path} failed (${response.status}): ${typeof body === 'string' ? body : JSON.stringify(body)}`)
  }

  return body
}

function rows(payload) {
  if (!payload || typeof payload !== 'object') return []
  if (Array.isArray(payload.results)) return payload.results
  if (Array.isArray(payload.notifications)) return payload.notifications
  if (Array.isArray(payload.data)) return payload.data
  return []
}

async function findTemplate() {
  let cursor = null
  for (let page = 0; page < 10; page += 1) {
    const suffix = cursor ? `?limit=100&cursor=${encodeURIComponent(cursor)}` : '?limit=100'
    const payload = await courier(`/notifications${suffix}`)
    const match = rows(payload).find((item) => item?.name === TEMPLATE_NAME)
    if (match) return match
    cursor = payload?.paging?.more ? payload?.paging?.cursor : null
    if (!cursor) return null
  }
  return null
}

async function findRoutingStrategy() {
  let cursor = null
  for (let page = 0; page < 10; page += 1) {
    const suffix = cursor ? `?limit=100&cursor=${encodeURIComponent(cursor)}` : '?limit=100'
    const payload = await courier(`/routing-strategies${suffix}`)
    const match = rows(payload).find((item) => item?.name === ROUTING_NAME)
    if (match) return match
    cursor = payload?.paging?.more ? payload?.paging?.cursor : null
    if (!cursor) return null
  }
  return null
}

async function ensureRoutingStrategy() {
  const existing = await findRoutingStrategy()
  if (existing?.id) return existing.id

  const created = await courier('/routing-strategies', {
    method: 'POST',
    body: JSON.stringify({
      name: ROUTING_NAME,
      description: 'Primary email routing for TransformHer transactional notifications',
      tags: ['transformher', 'production', 'email'],
      routing: { method: 'single', channels: ['email'] },
    }),
  })

  if (!created?.id) throw new Error('Courier routing strategy creation returned no id')
  console.log(`[courier-bootstrap] created routing strategy ${created.id}`)
  return created.id
}

async function ensureLoginTemplate() {
  const existing = await findTemplate()
  if (existing?.id) {
    if (existing.state !== 'PUBLISHED') {
      await courier(`/notifications/${existing.id}/publish`, {
        method: 'POST',
        body: '{}',
      })
      console.log(`[courier-bootstrap] published existing login template ${existing.id}`)
    }
    return { id: existing.id, created: false }
  }

  const strategyId = await ensureRoutingStrategy()
  const created = await courier('/notifications', {
    method: 'POST',
    body: JSON.stringify({
      notification: {
        name: TEMPLATE_NAME,
        tags: ['transformher', 'security', 'login'],
        brand: null,
        subscription: null,
        routing: { strategy_id: strategyId },
        content: {
          version: '2022-01-01',
          elements: [
            {
              type: 'channel',
              channel: 'email',
              elements: [
                { type: 'meta', title: 'New sign-in to your TransformHer account' },
                {
                  type: 'text',
                  content: 'Hi {{name}}, a new sign-in to your TransformHer account was detected.',
                },
                {
                  type: 'text',
                  content: 'Location: {{location}}\nDevice: {{device}}',
                },
                {
                  type: 'text',
                  content: 'If this was you, no action is required. If not, reset your password immediately.',
                },
              ],
            },
          ],
        },
      },
    }),
  })

  const id = created?.notification?.id || created?.id
  if (!id) throw new Error(`Courier login template creation returned no id: ${JSON.stringify(created)}`)

  await courier(`/notifications/${id}/publish`, {
    method: 'POST',
    body: '{}',
  })
  console.log(`[courier-bootstrap] created and published login template ${id}`)
  return { id, created: true }
}

async function verifyTemplate(id) {
  await courier(`/notifications/${id}/content`)
  console.log(`[courier-bootstrap] published content verified for ${id}`)
}

async function sendOneTimeVerification(id, created) {
  if (!created || !process.env.ADMIN_EMAIL) return

  const result = await courier('/send', {
    method: 'POST',
    body: JSON.stringify({
      message: {
        to: { email: process.env.ADMIN_EMAIL },
        template: id,
        data: {
          name: 'TransformHer Admin',
          location: 'Production verification',
          device: 'Vercel deployment bootstrap',
        },
      },
    }),
  })

  const requestId = result?.requestId
  if (!requestId) throw new Error('Courier verification send returned no requestId')
  console.log(`[courier-bootstrap] verification send accepted requestId=${requestId}`)

  for (let attempt = 0; attempt < 5; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2000))
    try {
      const message = await courier(`/messages/${encodeURIComponent(requestId)}`)
      const status = message?.status || message?.message?.status || 'UNKNOWN'
      console.log(`[courier-bootstrap] verification status=${status} requestId=${requestId}`)
      if (['DELIVERED', 'SENT'].includes(status)) return
      if (['UNROUTABLE', 'UNDELIVERABLE', 'FAILED'].includes(status)) {
        throw new Error(`Courier verification failed with status ${status}`)
      }
    } catch (error) {
      if (attempt === 4) {
        console.warn(`[courier-bootstrap] status check incomplete: ${error instanceof Error ? error.message : error}`)
      }
    }
  }
}

try {
  const template = await ensureLoginTemplate()
  await verifyTemplate(template.id)
  console.log(`[courier-bootstrap] COURIER_TEMPLATE_LOGIN_NOTIFICATION=${template.id}`)
  await sendOneTimeVerification(template.id, template.created)
} catch (error) {
  console.error('[courier-bootstrap] failed', error)
  process.exit(1)
}
