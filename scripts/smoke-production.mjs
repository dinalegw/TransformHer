const baseUrl = (process.env.SMOKE_BASE_URL || 'https://transformher.vercel.app').replace(/\/$/, '')
const allowDegraded = process.argv.includes('--allow-degraded')

const pages = [
  '/',
  '/books',
  '/faq',
  '/login',
  '/signup',
  '/privacy',
  '/terms',
  '/refund-policy',
]

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: 'manual',
    ...init,
    headers: {
      'user-agent': 'TransformHer production smoke test',
      ...(init.headers || {}),
    },
  })

  return response
}

let failed = false

for (const path of pages) {
  const response = await request(path)
  const ok = response.status >= 200 && response.status < 400
  console.log(`${ok ? 'PASS' : 'FAIL'} ${response.status} ${path}`)
  if (!ok) failed = true
}

const healthResponse = await request('/api/health')
if (!healthResponse.ok) {
  console.error(`FAIL ${healthResponse.status} /api/health`)
  failed = true
} else {
  const health = await healthResponse.json()
  console.log('Health:', JSON.stringify(health))

  const requiredReady =
    health.coreReady === true &&
    health.mailReady === true &&
    health.googleAuthReady === true &&
    health.scalingReady === true

  if (!requiredReady) {
    console.error('FAIL core, mail, Google auth, or scaling readiness is false')
    failed = true
  }

  if (health.storageReady !== true && !allowDegraded) {
    console.error(
      'FAIL persistent storage is not ready. Re-run with --allow-degraded only for pre-release diagnostics.',
    )
    failed = true
  }

  if (health.status !== 'ok' && !allowDegraded) {
    console.error(`FAIL health status is ${health.status}, expected ok`)
    failed = true
  }
}

const securityResponse = await request('/')
const requiredSecurityHeaders = [
  'content-security-policy',
  'strict-transport-security',
  'x-content-type-options',
  'referrer-policy',
  'permissions-policy',
]
for (const header of requiredSecurityHeaders) {
  if (securityResponse.headers.get(header)) {
    console.log(`PASS security header ${header}`)
  } else {
    console.error(`FAIL missing security header ${header}`)
    failed = true
  }
}

const protectedPages = ['/profile', '/library', '/admin']
for (const path of protectedPages) {
  const response = await request(path)
  const location = response.headers.get('location') || ''
  const protectedRoute =
    response.status >= 300 &&
    response.status < 400 &&
    location.includes('/login')

  console.log(
    `${protectedRoute ? 'PASS' : 'FAIL'} ${response.status} protected route ${path}`,
  )
  if (!protectedRoute) failed = true
}

const socialSessionApi = await request('/api/auth/get-session')
if (socialSessionApi.status === 200) {
  console.log('PASS Google/Better Auth session endpoint is available')
} else {
  console.error(
    `FAIL Google/Better Auth session endpoint returned ${socialSessionApi.status}, expected 200`,
  )
  failed = true
}

const libraryApi = await request('/api/library')
if (libraryApi.status === 401) {
  console.log('PASS unauthenticated library API is denied')
} else {
  console.error(
    `FAIL unauthenticated library API returned ${libraryApi.status}, expected 401`,
  )
  failed = true
}

for (const path of ['/api/paystack/initialize', '/api/cart/checkout']) {
  const response = await request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  })
  if (response.status === 403) {
    console.log(`PASS cross-origin mutation guard ${path}`)
  } else {
    console.error(
      `FAIL mutation guard ${path} returned ${response.status}, expected 403`,
    )
    failed = true
  }
}

const missingResponse = await request('/__transformher_smoke_missing__')
if (missingResponse.status === 404) {
  console.log('PASS 404 missing-route behavior')
} else {
  console.error(
    `FAIL missing route returned ${missingResponse.status}, expected 404`,
  )
  failed = true
}

if (failed) {
  process.exitCode = 1
} else {
  console.log(`Production smoke checks passed for ${baseUrl}`)
}
