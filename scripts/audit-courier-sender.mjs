const apiKey = process.env.COURIER_API_KEY
const isVercel = Boolean(process.env.VERCEL)

if (!isVercel || !apiKey) {
  console.log('[courier-sender-audit] skipped: Vercel runtime or COURIER_API_KEY unavailable')
  process.exit(0)
}

const OFFICIAL_EMAIL = 'transformher360@gmail.com'
const OFFICIAL_NAME = 'TransformHer'

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
const gmailProviders = providers.filter((provider) => provider?.provider === 'gmail')

for (const provider of gmailProviders) {
  const fromName = typeof provider?.settings?.from_name === 'string' ? provider.settings.from_name : null
  const fromEmail = typeof provider?.settings?.from_email === 'string' ? provider.settings.from_email : null
  const userName = typeof provider?.settings?.user_name === 'string' ? provider.settings.user_name : null

  console.log('[courier-sender-audit] gmail provider public identity', {
    id: provider?.id || null,
    title: provider?.title || null,
    alias: provider?.alias || null,
    fromName,
    fromEmail,
    userName,
    officialEmail: String(fromEmail || '').toLowerCase() === OFFICIAL_EMAIL,
    officialName: fromName === OFFICIAL_NAME,
  })

  if (String(fromEmail || '').toLowerCase() === OFFICIAL_EMAIL && fromName !== OFFICIAL_NAME) {
    console.warn(`[courier-sender-audit] sender display name should be ${OFFICIAL_NAME}; current provider from_name is ${JSON.stringify(fromName)}`)
  }
}

if (gmailProviders.length === 0) {
  console.warn('[courier-sender-audit] no Gmail provider found in this Courier environment')
}
