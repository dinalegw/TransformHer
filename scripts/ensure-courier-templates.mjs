import { writeFile } from 'node:fs/promises'
import path from 'node:path'

const isVercel = Boolean(process.env.VERCEL)
const apiKey = process.env.COURIER_API_KEY

if (!isVercel || !apiKey) {
  console.log('[courier-templates] skipped: Vercel runtime or COURIER_API_KEY unavailable')
  process.exit(0)
}

const API_BASE = 'https://api.courier.com'
const ROUTING_NAME = 'TransformHer Email'
const SUPPORT_EMAIL = 'transformher360@gmail.com'

const headers = {
  Authorization: `Bearer ${apiKey}`,
  Accept: 'application/json',
  'Content-Type': 'application/json',
}

function emailContent(subject, elements) {
  return {
    version: '2022-01-01',
    elements: [
      {
        type: 'channel',
        channel: 'email',
        elements: [
          { type: 'meta', title: subject },
          ...elements,
        ],
      },
    ],
  }
}

const text = (content) => ({ type: 'text', content })
const action = (content, href) => ({ type: 'action', content, href })

const TEMPLATES = [
  {
    key: 'COURIER_TEMPLATE_PASSWORD_RESET',
    legacyName: 'Password Reset',
    canonicalName: 'TransformHer Password Reset',
    tags: ['transformher', 'auth', 'password-reset'],
    content: emailContent('Reset your TransformHer password', [
      text('We received a request to reset your TransformHer password.'),
      action('Reset password', '{{resetLink}}'),
      text('This reset link expires in 1 hour and can only be used once.'),
      text('If you did not request this change, you can safely ignore this email.'),
    ]),
  },
  {
    key: 'COURIER_TEMPLATE_PASSWORD_RESET_CONFIRMATION',
    legacyName: 'Password Reset Confirmation',
    canonicalName: 'TransformHer Password Reset Confirmation',
    tags: ['transformher', 'auth', 'security'],
    content: emailContent('Your TransformHer password was reset', [
      text('Hi {{name}}, your TransformHer password has been reset successfully.'),
      text(`If you did not make this change, contact ${SUPPORT_EMAIL} and secure your account immediately.`),
    ]),
  },
  {
    key: 'COURIER_TEMPLATE_PASSWORD_CHANGED',
    legacyName: 'Password Changed',
    canonicalName: 'TransformHer Password Changed',
    tags: ['transformher', 'auth', 'security'],
    content: emailContent('Your TransformHer password changed', [
      text('Hi {{name}}, the password for your TransformHer account was changed.'),
      text(`If this was not you, reset your password immediately and contact ${SUPPORT_EMAIL}.`),
    ]),
  },
  {
    key: 'COURIER_TEMPLATE_WELCOME_VERIFY',
    legacyName: 'Welcome & Verify Email',
    canonicalName: 'TransformHer Welcome & Verify Email',
    tags: ['transformher', 'auth', 'welcome'],
    content: emailContent('Welcome to TransformHer — verify your email', [
      text('Hi {{name}}, welcome to TransformHer.'),
      text('Verify your email address to finish setting up your account.'),
      action('Verify email', '{{verifyLink}}'),
    ]),
  },
  {
    key: 'COURIER_TEMPLATE_EMAIL_VERIFIED',
    legacyName: 'Email Verified',
    canonicalName: 'TransformHer Email Verified',
    tags: ['transformher', 'auth'],
    content: emailContent('Your TransformHer email is verified', [
      text('Hi {{name}}, your email address has been verified successfully.'),
      action('Open your library', '{{libraryLink}}'),
    ]),
  },
  {
    key: 'COURIER_TEMPLATE_VERIFY_NEW_EMAIL',
    legacyName: 'Verify New Email',
    canonicalName: 'TransformHer Verify New Email',
    tags: ['transformher', 'auth', 'security'],
    content: emailContent('Verify your new TransformHer email address', [
      text('Hi {{name}}, confirm this email address for your TransformHer account.'),
      action('Verify new email', '{{verifyLink}}'),
      text(`If you did not request this change, contact ${SUPPORT_EMAIL}.`),
    ]),
  },
  {
    key: 'COURIER_TEMPLATE_LOGIN_NOTIFICATION',
    legacyName: 'TransformHer Login Notification',
    canonicalName: 'TransformHer Login Notification',
    tags: ['transformher', 'login', 'security'],
    content: emailContent('New sign-in to your TransformHer account', [
      text('Hi {{name}}, a new sign-in to your TransformHer account was detected.'),
      text('Location: {{location}}\nDevice: {{device}}'),
      text(`If this was you, no action is required. If not, reset your password and contact ${SUPPORT_EMAIL}.`),
    ]),
  },
  {
    key: 'COURIER_TEMPLATE_SECURITY_ALERT',
    legacyName: 'Security Alert',
    canonicalName: 'TransformHer Security Alert',
    tags: ['transformher', 'security'],
    content: emailContent('TransformHer security alert', [
      text('Hi {{name}}, we detected a security-related event on your account.'),
      text('Alert: {{alertType}}'),
      text('{{details}}'),
      text(`If you do not recognize this activity, contact ${SUPPORT_EMAIL} immediately.`),
    ]),
  },
  {
    key: 'COURIER_TEMPLATE_INVITATION',
    legacyName: 'Invitation',
    canonicalName: 'TransformHer Invitation',
    tags: ['transformher', 'invitation'],
    content: emailContent("You're invited to TransformHer", [
      text('Hi {{name}}, {{inviterName}} invited you to TransformHer.'),
      action('Accept invitation', '{{inviteLink}}'),
    ]),
  },
  {
    key: 'COURIER_TEMPLATE_ACCOUNT_FROZEN',
    legacyName: 'Account Frozen',
    canonicalName: 'TransformHer Account Frozen',
    tags: ['transformher', 'account', 'lifecycle', 'security'],
    content: emailContent('Your TransformHer account has been frozen', [
      text('Hi {{name}}, your TransformHer account has been frozen and sign-in access has been suspended.'),
      text('Reason: {{reason}}'),
      text(`If you believe this was done in error or want us to review the issue, contact our support team at ${SUPPORT_EMAIL}.`),
      action('Contact TransformHer Support', `mailto:${SUPPORT_EMAIL}?subject=Frozen%20TransformHer%20Account`),
    ]),
  },
  {
    key: 'COURIER_TEMPLATE_ACCOUNT_ARCHIVED',
    legacyName: 'Account Archived',
    canonicalName: 'TransformHer Account Archived',
    tags: ['transformher', 'account', 'lifecycle'],
    content: emailContent('Your TransformHer account has been archived', [
      text('Hi {{name}}, your TransformHer account has been archived and is not currently available for sign-in.'),
      text(`If you need the account restored or want help resolving the issue, contact ${SUPPORT_EMAIL}.`),
      action('Contact TransformHer Support', `mailto:${SUPPORT_EMAIL}?subject=Archived%20TransformHer%20Account`),
    ]),
  },
  {
    key: 'COURIER_TEMPLATE_ACCOUNT_UNFROZEN',
    legacyName: 'Account Unfrozen',
    canonicalName: 'TransformHer Account Unfrozen',
    tags: ['transformher', 'account', 'lifecycle'],
    content: emailContent('Your TransformHer account has been restored', [
      text('Hi {{name}}, the freeze on your TransformHer account has been removed.'),
      text('You can sign in again using your existing credentials.'),
      text(`If you still experience any issue, contact ${SUPPORT_EMAIL}.`),
    ]),
  },
  {
    key: 'COURIER_TEMPLATE_ACCOUNT_UNARCHIVED',
    legacyName: 'Account Unarchived',
    canonicalName: 'TransformHer Account Unarchived',
    tags: ['transformher', 'account', 'lifecycle'],
    content: emailContent('Your TransformHer account has been reactivated', [
      text('Hi {{name}}, your archived TransformHer account has been restored and reactivated.'),
      text('You can now sign in again using your existing credentials.'),
      text(`If you need any additional help, contact ${SUPPORT_EMAIL}.`),
    ]),
  },
  {
    key: 'COURIER_TEMPLATE_ORDER_CONFIRMATION',
    legacyName: 'Order Confirmation',
    canonicalName: 'TransformHer Order Confirmation',
    tags: ['transformher', 'orders'],
    content: emailContent('Your TransformHer order is confirmed', [
      text('Hi {{name}}, thank you for your purchase.'),
      text('Book: {{bookTitle}}'),
      text('Amount: {{amount}}'),
      text('Your purchase will appear in your TransformHer library according to its release availability.'),
    ]),
  },
  {
    key: 'COURIER_TEMPLATE_BOOK_RELEASED',
    legacyName: 'Book Released',
    canonicalName: 'TransformHer Book Released',
    tags: ['transformher', 'orders', 'library'],
    content: emailContent('{{bookTitle}} is now available', [
      text('Hi {{name}}, {{bookTitle}} is now available in your TransformHer library.'),
      action('Read now', '{{libraryLink}}'),
    ]),
  },
  {
    key: 'COURIER_TEMPLATE_ADMIN_ORDER',
    legacyName: 'Admin Order Notification',
    canonicalName: 'TransformHer Admin Order Notification',
    tags: ['transformher', 'admin', 'orders'],
    content: emailContent('New TransformHer order', [
      text('A new TransformHer order was completed.'),
      text('Customer: {{customerName}} ({{customerEmail}})'),
      text('Book: {{bookTitle}}'),
      text('Amount: {{amount}}'),
    ]),
  },
]

async function courier(pathname, init = {}) {
  const response = await fetch(`${API_BASE}${pathname}`, {
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
    const summary = typeof body === 'string' ? body : JSON.stringify(body)
    throw new Error(`Courier ${init.method || 'GET'} ${pathname} failed (${response.status}): ${summary}`)
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

async function listAll(pathname) {
  const all = []
  let cursor = null
  for (let page = 0; page < 20; page += 1) {
    const join = pathname.includes('?') ? '&' : '?'
    const suffix = `${join}limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`
    const payload = await courier(`${pathname}${suffix}`)
    all.push(...rows(payload))
    cursor = payload?.paging?.more ? payload?.paging?.cursor : null
    if (!cursor) break
  }
  return all
}

async function getConfiguredEmailProviders() {
  const [configuredProviders, emailCatalog] = await Promise.all([
    listAll('/providers'),
    listAll('/providers/catalog?channel=email'),
  ])

  const emailProviderTypes = new Set(emailCatalog.map((item) => item?.provider).filter(Boolean))
  const providerKeys = [...new Set(
    configuredProviders
      .map((item) => item?.provider)
      .filter((provider) => provider && emailProviderTypes.has(provider)),
  )]

  if (providerKeys.length === 0) {
    throw new Error('No configured Courier email provider is available in the Production workspace')
  }

  // Provider identifiers are safe to log; provider settings/credentials never are.
  console.log(`[courier-templates] configured email providers: ${providerKeys.join(', ')}`)
  return providerKeys
}

async function ensureRoutingStrategy(emailProviders) {
  const strategies = await listAll('/routing-strategies')
  const existing = strategies.find((item) => item?.name === ROUTING_NAME)
  const desired = {
    name: ROUTING_NAME,
    description: 'Primary email routing for TransformHer transactional notifications',
    tags: ['transformher', 'production', 'email'],
    routing: { method: 'single', channels: ['email'] },
    channels: { email: { providers: emailProviders } },
    providers: {},
  }

  if (existing?.id) {
    await courier(`/routing-strategies/${encodeURIComponent(existing.id)}`, {
      method: 'PUT',
      body: JSON.stringify(desired),
    })
    console.log(`[courier-templates] verified routing strategy ${existing.id}`)
    return existing.id
  }

  const created = await courier('/routing-strategies', {
    method: 'POST',
    body: JSON.stringify(desired),
  })

  if (!created?.id) throw new Error('Courier routing strategy creation returned no id')
  console.log(`[courier-templates] created email routing strategy ${created.id}`)
  return created.id
}

function hasEmailChannel(content) {
  const elements = Array.isArray(content?.elements) ? content.elements : []
  return elements.some((item) => item?.type === 'channel' && item?.channel === 'email')
}

async function repairContent(id, definition) {
  await courier(`/notifications/${encodeURIComponent(id)}/content`, {
    method: 'PUT',
    body: JSON.stringify({ content: definition.content, state: 'PUBLISHED' }),
  })

  const published = await courier(`/notifications/${encodeURIComponent(id)}/content`)
  if (!hasEmailChannel(published)) {
    throw new Error(`Template ${id} has no published email channel after update`)
  }
  return id
}

async function replaceTemplate(id, definition, strategyId) {
  await courier(`/notifications/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({
      published: false,
      notification: {
        name: definition.canonicalName,
        tags: definition.tags,
        brand: null,
        subscription: null,
        routing: { strategy_id: strategyId },
        content: definition.content,
      },
    }),
  })

  await courier(`/notifications/${encodeURIComponent(id)}/publish`, {
    method: 'POST',
    body: '{}',
  })
  await repairContent(id, definition)
  return id
}

async function createTemplate(definition, strategyId) {
  const created = await courier('/notifications', {
    method: 'POST',
    body: JSON.stringify({
      published: false,
      notification: {
        name: definition.canonicalName,
        tags: definition.tags,
        brand: null,
        subscription: null,
        routing: { strategy_id: strategyId },
        content: definition.content,
      },
    }),
  })

  const id = created?.notification?.id || created?.id
  if (!id) throw new Error(`Courier template creation returned no id for ${definition.key}`)

  await courier(`/notifications/${encodeURIComponent(id)}/publish`, {
    method: 'POST',
    body: '{}',
  })
  await repairContent(id, definition)
  console.log(`[courier-templates] created ${definition.key}=${id}`)
  return id
}

async function ensureTemplate(definition, strategyId, templates) {
  const configuredId = process.env[definition.key]?.trim()
  const candidate = configuredId
    ? { id: configuredId, source: 'environment' }
    : templates
      .filter((item) => item?.name === definition.canonicalName || item?.name === definition.legacyName)
      .map((item) => ({ id: item.id, source: 'workspace' }))
      .find((item) => item.id)

  if (candidate?.id) {
    try {
      const id = await replaceTemplate(candidate.id, definition, strategyId)
      console.log(`[courier-templates] verified ${definition.key}=${id} source=${candidate.source}`)
      return id
    } catch (error) {
      console.warn(`[courier-templates] replacing unusable ${definition.key} template ${candidate.id}: ${error instanceof Error ? error.message : error}`)
    }
  }

  return createTemplate(definition, strategyId)
}

async function archiveDuplicateTemplates(activeIds) {
  const templates = await listAll('/notifications')
  const active = new Set(Object.values(activeIds))
  const managedNames = new Set(TEMPLATES.flatMap((item) => [item.legacyName, item.canonicalName]))

  for (const item of templates) {
    if (!item?.id || !managedNames.has(item.name) || active.has(item.id)) continue
    try {
      await courier(`/notifications/${encodeURIComponent(item.id)}`, { method: 'DELETE' })
      console.log(`[courier-templates] archived duplicate ${item.name} ${item.id}`)
    } catch (error) {
      console.warn(`[courier-templates] could not archive duplicate ${item.id}: ${error instanceof Error ? error.message : error}`)
    }
  }
}

async function writeManifest(ids) {
  const ordered = Object.fromEntries(TEMPLATES.map((item) => [item.key, ids[item.key]]))
  const lines = [
    '// Generated by scripts/ensure-courier-templates.mjs during the Vercel build.',
    '// Do not put API keys or recipient data in this file.',
    'export const COURIER_TEMPLATE_IDS: Record<string, string> = ' + JSON.stringify(ordered, null, 2),
    '',
  ]
  const output = path.join(process.cwd(), 'lib', 'courier-template-manifest.ts')
  await writeFile(output, lines.join('\n'), 'utf8')
  console.log(`[courier-templates] wrote verified manifest with ${Object.keys(ordered).length} email templates`)
}

try {
  const emailProviders = await getConfiguredEmailProviders()
  const strategyId = await ensureRoutingStrategy(emailProviders)
  const templates = await listAll('/notifications')
  const ids = {}

  for (const definition of TEMPLATES) {
    ids[definition.key] = await ensureTemplate(definition, strategyId, templates)
  }

  await archiveDuplicateTemplates(ids)
  await writeManifest(ids)
  console.log('[courier-templates] all TransformHer transactional email templates are published, routed and provider-backed')
} catch (error) {
  console.error('[courier-templates] failed', error)
  process.exit(1)
}
