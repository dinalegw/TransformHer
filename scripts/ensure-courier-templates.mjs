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
const SITE_URL = 'https://transformher.vercel.app'
const LOGO_URL = `${SITE_URL}/apple-icon.png`
const HERO_URL = `${SITE_URL}/hero-reading.png`

const BRAND = {
  ink: '#2A2A35',
  gold: '#B9934A',
  muted: '#746C60',
  line: '#E5DED2',
}

const headers = {
  Authorization: `Bearer ${apiKey}`,
  Accept: 'application/json',
  'Content-Type': 'application/json',
}

const text = (content, options = {}) => {
  const { color, bold, italic, strikethrough, underline, ...blockOptions } = options
  const inlineStyle = {}
  if (color !== undefined) inlineStyle.color = color
  if (bold !== undefined) inlineStyle.bold = bold
  if (italic !== undefined) inlineStyle.italic = italic
  if (strikethrough !== undefined) inlineStyle.strikethrough = strikethrough
  if (underline !== undefined) inlineStyle.underline = underline

  if (Object.keys(inlineStyle).length > 0) {
    return {
      type: 'text',
      ...blockOptions,
      elements: [{ type: 'string', content, ...inlineStyle }],
    }
  }

  return { type: 'text', content, ...blockOptions }
}
const heading = (content) => text(content, { text_style: 'h1', color: BRAND.ink, bold: true })
const eyebrow = (content) => text(content, { text_style: 'subtext', color: BRAND.gold, bold: true })
const muted = (content) => text(content, { text_style: 'subtext', color: BRAND.muted })
const divider = () => ({ type: 'divider', color: BRAND.line, border_width: '1px', padding: '8px 0' })
const logo = () => ({
  type: 'image',
  src: LOGO_URL,
  alt_text: 'TransformHer',
  href: SITE_URL,
  width: '72px',
  align: 'left',
})
const hero = () => ({
  type: 'image',
  src: HERO_URL,
  alt_text: 'TransformHer reading and growth',
  href: SITE_URL,
  width: '100%',
  align: 'full',
})
const action = (content, href, backgroundColor = BRAND.ink) => ({
  type: 'action',
  content,
  href,
  style: 'button',
  align: 'left',
  background_color: backgroundColor,
})
const linkAction = (content, href) => ({
  type: 'action',
  content,
  href,
  style: 'link',
  align: 'left',
})

function emailContent(subject, label, elements, options = {}) {
  return {
    version: '2022-01-01',
    elements: [
      {
        type: 'channel',
        channel: 'email',
        elements: [
          { type: 'meta', title: subject },
          logo(),
          eyebrow(label),
          ...(options.hero ? [hero()] : []),
          ...elements,
          divider(),
          muted('TransformHer — thoughtful tools for the woman you are becoming.'),
          muted(`Questions? Reply to this email or contact ${SUPPORT_EMAIL}.`),
        ],
      },
    ],
  }
}

const TEMPLATES = [
  {
    key: 'COURIER_TEMPLATE_PASSWORD_RESET',
    legacyName: 'Password Reset',
    canonicalName: 'TransformHer Password Reset',
    tags: ['transformher', 'auth', 'password-reset'],
    content: emailContent('Reset your TransformHer password', 'PASSWORD HELP', [
      heading('Reset your password'),
      text('We received a request to reset the password for your TransformHer account.'),
      text('Use the secure button below. The link expires in 1 hour and can only be used once.'),
      action('Reset password', '{{resetLink}}', BRAND.gold),
      muted('If you did not request this, you can safely ignore this message.'),
    ]),
  },
  {
    key: 'COURIER_TEMPLATE_PASSWORD_RESET_CONFIRMATION',
    legacyName: 'Password Reset Confirmation',
    canonicalName: 'TransformHer Password Reset Confirmation',
    tags: ['transformher', 'auth', 'security'],
    content: emailContent('Your TransformHer password was reset', 'SECURITY CONFIRMATION', [
      heading('Password reset complete'),
      text('Hi {{name}}, your TransformHer password has been reset successfully.'),
      text('Your previous password can no longer be used to sign in.'),
      action('Go to sign in', `${SITE_URL}/login`, BRAND.gold),
      muted(`If you did not make this change, contact ${SUPPORT_EMAIL} immediately.`),
    ]),
  },
  {
    key: 'COURIER_TEMPLATE_PASSWORD_CHANGED',
    legacyName: 'Password Changed',
    canonicalName: 'TransformHer Password Changed',
    tags: ['transformher', 'auth', 'security'],
    content: emailContent('Your TransformHer password changed', 'ACCOUNT SECURITY', [
      heading('Your password has changed'),
      text('Hi {{name}}, the password for your TransformHer account was changed.'),
      text('If this was you, no further action is required.'),
      action('Secure my account', `${SITE_URL}/forgot-password`, BRAND.ink),
      muted(`If this was not you, reset your password immediately and contact ${SUPPORT_EMAIL}.`),
    ]),
  },
  {
    key: 'COURIER_TEMPLATE_WELCOME_VERIFY',
    legacyName: 'Welcome & Verify Email',
    canonicalName: 'TransformHer Welcome & Verify Email',
    tags: ['transformher', 'auth', 'welcome'],
    content: emailContent('Welcome to TransformHer — verify your email', 'WELCOME TO TRANSFORMHER', [
      heading('Welcome, {{name}}'),
      text('Your TransformHer account is ready. One final step keeps it secure and unlocks the full experience.'),
      text('Verify your email address using the button below.'),
      action('Verify my email', '{{verifyLink}}', BRAND.gold),
      muted('After verification, you can sign in and access your library.'),
    ], { hero: true }),
  },
  {
    key: 'COURIER_TEMPLATE_EMAIL_VERIFICATION_CODE',
    legacyName: 'Email Verification Code',
    canonicalName: 'TransformHer Email Verification Code',
    tags: ['transformher', 'auth', 'verification', 'security'],
    content: emailContent('Your TransformHer verification code', 'VERIFY YOUR EMAIL', [
      heading('Your verification code'),
      text('Hi {{name}}, enter the code below on your TransformHer profile to verify your email address.'),
      divider(),
      text('{{code}}', { text_style: 'h1', color: BRAND.gold, bold: true }),
      divider(),
      text('This code expires in {{expiresInMinutes}} minutes and can only be used for your signed-in account.'),
      muted(`If you did not request this code, you can ignore this email or contact ${SUPPORT_EMAIL}.`),
    ]),
  },
  {
    key: 'COURIER_TEMPLATE_EMAIL_VERIFIED',
    legacyName: 'Email Verified',
    canonicalName: 'TransformHer Email Verified',
    tags: ['transformher', 'auth'],
    content: emailContent('Your TransformHer email is verified', 'VERIFICATION COMPLETE', [
      heading('You are verified'),
      text('Hi {{name}}, your email address has been verified successfully.'),
      text('Your verified email is now locked to this TransformHer account for account security.'),
      action('Open my profile', `${SITE_URL}/profile`, BRAND.gold),
    ]),
  },
  {
    key: 'COURIER_TEMPLATE_VERIFY_NEW_EMAIL',
    legacyName: 'Verify New Email',
    canonicalName: 'TransformHer Verify New Email',
    tags: ['transformher', 'auth', 'security'],
    content: emailContent('Verify your new TransformHer email address', 'EMAIL CHANGE', [
      heading('Confirm your new email'),
      text('Hi {{name}}, confirm this email address before we update the sign-in email on your TransformHer account.'),
      action('Verify new email', '{{verifyLink}}', BRAND.gold),
      muted(`If you did not request this change, contact ${SUPPORT_EMAIL}.`),
    ]),
  },
  {
    key: 'COURIER_TEMPLATE_LOGIN_NOTIFICATION',
    legacyName: 'TransformHer Login Notification',
    canonicalName: 'TransformHer Login Notification',
    tags: ['transformher', 'login', 'security'],
    content: emailContent('New sign-in to your TransformHer account', 'SIGN-IN NOTICE', [
      heading('New sign-in detected'),
      text('Hi {{name}}, a new sign-in to your TransformHer account was detected.'),
      divider(),
      text('Location: {{location}}', { bold: true }),
      text('Device: {{device}}'),
      divider(),
      text('If this was you, no action is required.'),
      action('Secure my account', `${SITE_URL}/forgot-password`, BRAND.ink),
      muted(`If you do not recognize this activity, reset your password and contact ${SUPPORT_EMAIL}.`),
    ]),
  },
  {
    key: 'COURIER_TEMPLATE_SECURITY_ALERT',
    legacyName: 'Security Alert',
    canonicalName: 'TransformHer Security Alert',
    tags: ['transformher', 'security'],
    content: emailContent('TransformHer security alert', 'IMPORTANT SECURITY NOTICE', [
      heading('Please review this activity'),
      text('Hi {{name}}, we detected a security-related event on your TransformHer account.'),
      text('Alert: {{alertType}}', { bold: true, color: BRAND.ink }),
      text('{{details}}'),
      action('Review account security', `${SITE_URL}/forgot-password`, BRAND.gold),
      muted(`If you do not recognize this activity, contact ${SUPPORT_EMAIL} immediately.`),
    ]),
  },
  {
    key: 'COURIER_TEMPLATE_INVITATION',
    legacyName: 'Invitation',
    canonicalName: 'TransformHer Invitation',
    tags: ['transformher', 'invitation'],
    content: emailContent("You're invited to TransformHer", 'A PERSONAL INVITATION', [
      heading("You're invited"),
      text('Hi {{name}}, {{inviterName}} invited you to discover TransformHer.'),
      text('Explore transformational books created to support confidence, growth, wellness, purpose and wealth.'),
      action('Accept invitation', '{{inviteLink}}', BRAND.gold),
    ], { hero: true }),
  },
  {
    key: 'COURIER_TEMPLATE_ACCOUNT_FROZEN',
    legacyName: 'Account Frozen',
    canonicalName: 'TransformHer Account Frozen',
    tags: ['transformher', 'account', 'lifecycle', 'security'],
    content: emailContent('Your TransformHer account has been frozen', 'ACCOUNT ACCESS', [
      heading('Your account is temporarily frozen'),
      text('Hi {{name}}, sign-in access to your TransformHer account has been suspended.'),
      text('Reason: {{reason}}', { bold: true }),
      text('Your account data has not been deleted. Our support team can review the restriction with you.'),
      action('Contact TransformHer Support', `mailto:${SUPPORT_EMAIL}?subject=Frozen%20TransformHer%20Account`, BRAND.ink),
    ]),
  },
  {
    key: 'COURIER_TEMPLATE_ACCOUNT_ARCHIVED',
    legacyName: 'Account Archived',
    canonicalName: 'TransformHer Account Archived',
    tags: ['transformher', 'account', 'lifecycle'],
    content: emailContent('Your TransformHer account has been archived', 'ACCOUNT STATUS', [
      heading('Your account has been archived'),
      text('Hi {{name}}, your TransformHer account is currently archived and unavailable for sign-in.'),
      text('If you need access restored, our support team can review the account status.'),
      action('Request account review', `mailto:${SUPPORT_EMAIL}?subject=Archived%20TransformHer%20Account`, BRAND.gold),
    ]),
  },
  {
    key: 'COURIER_TEMPLATE_ACCOUNT_UNFROZEN',
    legacyName: 'Account Unfrozen',
    canonicalName: 'TransformHer Account Unfrozen',
    tags: ['transformher', 'account', 'lifecycle'],
    content: emailContent('Your TransformHer account access has been restored', 'ACCESS RESTORED', [
      heading('Your account is active again'),
      text('Hi {{name}}, the freeze on your TransformHer account has been removed.'),
      text('You can sign in again using your existing credentials.'),
      action('Sign in to TransformHer', `${SITE_URL}/login`, BRAND.gold),
    ]),
  },
  {
    key: 'COURIER_TEMPLATE_ACCOUNT_UNARCHIVED',
    legacyName: 'Account Unarchived',
    canonicalName: 'TransformHer Account Unarchived',
    tags: ['transformher', 'account', 'lifecycle'],
    content: emailContent('Your TransformHer account has been reactivated', 'ACCOUNT REACTIVATED', [
      heading('Welcome back'),
      text('Hi {{name}}, your archived TransformHer account has been restored and reactivated.'),
      text('Your sign-in access is available again.'),
      action('Return to TransformHer', `${SITE_URL}/login`, BRAND.gold),
    ]),
  },
  {
    key: 'COURIER_TEMPLATE_ORDER_CONFIRMATION',
    legacyName: 'Order Confirmation',
    canonicalName: 'TransformHer Order Confirmation',
    tags: ['transformher', 'orders'],
    content: emailContent('Your TransformHer order is confirmed', 'PURCHASE CONFIRMED', [
      heading('Thank you, {{name}}'),
      text('Your TransformHer purchase is confirmed.'),
      divider(),
      text('Book: {{bookTitle}}', { bold: true }),
      text('Amount: {{amount}}'),
      divider(),
      text('Your purchase will appear in your library according to its release availability.'),
      action('Open my library', `${SITE_URL}/library`, BRAND.gold),
    ], { hero: true }),
  },
  {
    key: 'COURIER_TEMPLATE_BOOK_RELEASED',
    legacyName: 'Book Released',
    canonicalName: 'TransformHer Book Released',
    tags: ['transformher', 'orders', 'library'],
    content: emailContent('{{bookTitle}} is now available', 'YOUR LIBRARY', [
      heading('{{bookTitle}} is ready'),
      text('Hi {{name}}, your book is now available in your TransformHer library.'),
      text('Make a little space for yourself, open the book, and continue becoming.'),
      action('Read now', '{{libraryLink}}', BRAND.gold),
    ], { hero: true }),
  },
  {
    key: 'COURIER_TEMPLATE_ADMIN_ORDER',
    legacyName: 'Admin Order Notification',
    canonicalName: 'TransformHer Admin Order Notification',
    tags: ['transformher', 'admin', 'orders'],
    content: emailContent('New TransformHer order', 'ADMIN ORDER ALERT', [
      heading('A new order was completed'),
      text('TransformHer has received a new completed order.'),
      divider(),
      text('Customer: {{customerName}}', { bold: true }),
      text('Email: {{customerEmail}}'),
      text('Book: {{bookTitle}}'),
      text('Amount: {{amount}}'),
      divider(),
      action('Open Admin Orders', `${SITE_URL}/admin?tab=orders`, BRAND.ink),
      linkAction('Open TransformHer', SITE_URL),
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
