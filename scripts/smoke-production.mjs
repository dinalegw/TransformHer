const baseUrl = (process.env.SMOKE_BASE_URL || 'https://transformher.vercel.app').replace(/\/$/, '')
const allowDegraded = process.argv.includes('--allow-degraded')

const pages = [
  '/',
  '/books',
  '/faq',
  '/login',
  '/signup',
]

async function request(path) {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: 'manual',
    headers: {
      'user-agent': 'TransformHer production smoke test',
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
    health.scalingReady === true

  if (!requiredReady) {
    console.error('FAIL core, mail, or scaling readiness is false')
    failed = true
  }

  if (health.storageReady !== true && !allowDegraded) {
    console.error(
      'FAIL persistent storage is not ready. Re-run with --allow-degraded only for pre-release diagnostics.',
    )
    failed = true
  }

  if (health.status !== 'healthy' && !allowDegraded) {
    console.error(`FAIL health status is ${health.status}, expected healthy`)
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
