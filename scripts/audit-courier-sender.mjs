const apiKey = process.env.COURIER_API_KEY
const isVercel = Boolean(process.env.VERCEL)

if (!isVercel || !apiKey) {
  console.log('[courier-sender] skipped: Vercel runtime or COURIER_API_KEY unavailable')
  process.exit(0)
}

const API_BASE = 'https://api.courier.com'
const OFFICIAL_EMAIL = 'transformher360@gmail.com'
const OFFICIAL_NAME = 'TransformHer'

const headers = {
  Authorization: `Bearer ${apiKey}`,
  Accept: 'application/json',
  'Content-Type': 'application/json',
}

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

const payload = await courier('/providers?limit=100')
const providers = Array.isArray(payload?.results) ? payload.results : []
const gmailProviders = providers.filter((provider) => provider?.provider === 'gmail')

if (gmailProviders.length === 0) {
  throw new Error('No Gmail provider is configured in the Courier Production environment')
}

const candidates = gmailProviders.filter((provider) => {
  const email = typeof provider?.settings?.from_email === 'string'
    ? provider.settings.from_email.trim().toLowerCase()
    : ''
  const alias = typeof provider?.alias === 'string' ? provider.alias.trim().toLowerCase() : ''
  return email === OFFICIAL_EMAIL || alias === 'transformher'
})

if (candidates.length === 0) {
  throw new Error(`No Courier Gmail provider is associated with the official sender ${OFFICIAL_EMAIL}`)
}

for (const provider of candidates) {
  if (!provider?.id || !provider?.settings || typeof provider.settings !== 'object') continue

  const before = {
    id: provider.id,
    alias: provider.alias || null,
    fromName: typeof provider.settings.from_name === 'string' ? provider.settings.from_name : null,
    fromEmail: typeof provider.settings.from_email === 'string' ? provider.settings.from_email : null,
    userName: typeof provider.settings.user_name === 'string' ? provider.settings.user_name : null,
  }

  const desiredSettings = {
    ...provider.settings,
    from_name: OFFICIAL_NAME,
    from_email: OFFICIAL_EMAIL,
    user_name: OFFICIAL_NAME,
  }

  const needsRepair = before.fromName !== OFFICIAL_NAME
    || before.fromEmail?.toLowerCase() !== OFFICIAL_EMAIL
    || before.userName !== OFFICIAL_NAME

  if (needsRepair) {
    // Courier's provider update endpoint is a full replacement. Preserve every
    // existing provider setting (including OAuth values) in memory and replace
    // only the public sender identity fields. Never print provider settings.
    await courier(`/providers/${encodeURIComponent(provider.id)}`, {
      method: 'POST',
      body: JSON.stringify({
        provider: provider.provider,
        title: provider.title,
        alias: provider.alias,
        settings: desiredSettings,
      }),
    })
    console.log('[courier-sender] repaired Gmail sender identity', {
      id: provider.id,
      alias: provider.alias || null,
      fromName: OFFICIAL_NAME,
      fromEmail: OFFICIAL_EMAIL,
    })
  } else {
    console.log('[courier-sender] Gmail sender identity already correct', {
      id: provider.id,
      alias: provider.alias || null,
      fromName: before.fromName,
      fromEmail: before.fromEmail,
    })
  }

  const refreshed = await courier(`/providers/${encodeURIComponent(provider.id)}`)
  const verifiedName = refreshed?.settings?.from_name
  const verifiedEmail = refreshed?.settings?.from_email
  const verifiedUserName = refreshed?.settings?.user_name

  if (
    verifiedName !== OFFICIAL_NAME
    || String(verifiedEmail || '').toLowerCase() !== OFFICIAL_EMAIL
    || verifiedUserName !== OFFICIAL_NAME
  ) {
    throw new Error(`Courier Gmail sender identity verification failed for provider ${provider.id}`)
  }

  console.log('[courier-sender] verified public identity', {
    id: provider.id,
    fromName: verifiedName,
    fromEmail: verifiedEmail,
    userName: verifiedUserName,
  })
}
