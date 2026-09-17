const apiKey = process.env.COURIER_API_KEY
const isVercel = Boolean(process.env.VERCEL)

if (!isVercel || !apiKey) {
  console.log('[courier-sender-audit] skipped: Vercel runtime or COURIER_API_KEY unavailable')
  process.exit(0)
}

const response = await fetch('https://api.courier.com/providers?limit=100', {
  headers: {
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/json',
  },
})

if (!response.ok) {
  console.warn(`[courier-sender-audit] provider inspection failed (${response.status})`)
  process.exit(0)
}

const payload = await response.json()
const providers = Array.isArray(payload?.results) ? payload.results : []
const emailProviders = providers.filter((provider) => provider?.provider === 'gmail')

const forbidden = /secret|token|key|password|credential|refresh|access|client/i
const interesting = /from|sender|email|mailbox|account|name/i

for (const provider of emailProviders) {
  const safeSettings = {}
  const settings = provider?.settings && typeof provider.settings === 'object'
    ? provider.settings
    : {}

  for (const [key, value] of Object.entries(settings)) {
    if (forbidden.test(key) || !interesting.test(key)) continue
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      safeSettings[key] = value
    }
  }

  console.log('[courier-sender-audit] gmail provider', {
    id: provider?.id || null,
    title: provider?.title || null,
    alias: provider?.alias || null,
    safeSettings,
  })
}

if (emailProviders.length === 0) {
  console.warn('[courier-sender-audit] no Gmail provider found in this Courier environment')
}
