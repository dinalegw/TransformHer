import { NextResponse } from 'next/server'
import { requireMasterAdmin } from '@/lib/auth'
import {
  getDeletedArchiveForCompliance,
  setDeletedArchiveLegalHold,
} from '@/lib/compliance'
import { checkRateLimit } from '@/lib/rate-limit'
import { isSameOriginRequest } from '@/lib/request-security'

function limited(retryAfter?: number) {
  const seconds = retryAfter ?? 60
  return NextResponse.json(
    { error: 'Too many compliance requests. Please wait and try again.', retryAfter: seconds },
    { status: 429, headers: { 'Retry-After': String(seconds) } },
  )
}

/**
 * Retained personal/security data is deliberately disclosed through POST rather
 * than query parameters. A documented purpose or lawful-request reference can
 * contain sensitive case information and must not be copied into browser
 * history, proxy URLs or ordinary access logs.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!isSameOriginRequest(req)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }

    const rate = await checkRateLimit(req, '/api/admin/deleted-users/review')
    if (!rate.allowed) return limited(rate.retryAfter)

    const admin = await requireMasterAdmin()
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
    const reference = typeof body.reference === 'string' ? body.reference.trim() : undefined

    if (reason.length < 5 || reason.length > 500) {
      return NextResponse.json(
        { error: 'A compliance reason between 5 and 500 characters is required to view retained details.' },
        { status: 400 },
      )
    }
    if (reference && reference.length > 200) {
      return NextResponse.json({ error: 'Case reference must be 200 characters or fewer.' }, { status: 400 })
    }

    const archive = await getDeletedArchiveForCompliance(id, admin, reason, reference)
    if (!archive) return NextResponse.json({ error: 'Archive not found' }, { status: 404 })

    return NextResponse.json(
      { archive },
      { headers: { 'Cache-Control': 'no-store, private' } },
    )
  } catch (err) {
    if (err instanceof Error && err.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (err instanceof Error && err.message === 'Database not available') {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
    }
    console.error('[admin/deleted-users/detail] failed', err)
    return NextResponse.json({ error: 'Unable to load retained account details.' }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!isSameOriginRequest(req)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }

    const rate = await checkRateLimit(req, '/api/admin/deleted-users/legal-hold')
    if (!rate.allowed) return limited(rate.retryAfter)

    const admin = await requireMasterAdmin()
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const action = typeof body.action === 'string' ? body.action : ''
    const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
    const reference = typeof body.reference === 'string' ? body.reference.trim() : undefined

    if (action !== 'legal_hold' && action !== 'release_hold') {
      return NextResponse.json({ error: 'Unsupported compliance action' }, { status: 400 })
    }
    if (reason.length > 500) {
      return NextResponse.json({ error: 'Compliance reason must be 500 characters or fewer.' }, { status: 400 })
    }
    if (reference && reference.length > 200) {
      return NextResponse.json({ error: 'Case reference must be 200 characters or fewer.' }, { status: 400 })
    }

    const result = await setDeletedArchiveLegalHold(
      id,
      admin,
      action === 'legal_hold',
      reason,
      reference,
    )

    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store, private' } })
  } catch (err) {
    if (err instanceof Error && err.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (err instanceof Error && err.message === 'Archive not found') {
      return NextResponse.json({ error: err.message }, { status: 404 })
    }
    if (err instanceof Error && (
      err.message === 'A documented reason is required' ||
      err.message === 'A lawful request or case reference is required to place a legal hold'
    )) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    if (err instanceof Error && err.message === 'Database not available') {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
    }
    console.error('[admin/deleted-users/legal-hold] failed', err)
    return NextResponse.json({ error: 'Unable to update legal hold status.' }, { status: 500 })
  }
}
