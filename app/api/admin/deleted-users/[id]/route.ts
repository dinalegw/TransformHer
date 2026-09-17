import { NextResponse } from 'next/server'
import { requireMasterAdmin } from '@/lib/auth'
import {
  getDeletedArchiveForCompliance,
  setDeletedArchiveLegalHold,
} from '@/lib/compliance'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireMasterAdmin()
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const reason = searchParams.get('reason')?.trim() || ''
    const reference = searchParams.get('reference')?.trim() || undefined

    if (reason.length < 5) {
      return NextResponse.json(
        { error: 'A compliance reason is required to view retained details.' },
        { status: 400 },
      )
    }

    const archive = await getDeletedArchiveForCompliance(id, admin, reason, reference)
    if (!archive) return NextResponse.json({ error: 'Archive not found' }, { status: 404 })

    return NextResponse.json({ archive })
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
    const origin = req.headers.get('origin')
    if (origin && new URL(origin).host !== new URL(req.url).host) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }

    const admin = await requireMasterAdmin()
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const action = typeof body.action === 'string' ? body.action : ''
    const reason = typeof body.reason === 'string' ? body.reason : ''
    const reference = typeof body.reference === 'string' ? body.reference : undefined

    if (action !== 'legal_hold' && action !== 'release_hold') {
      return NextResponse.json({ error: 'Unsupported compliance action' }, { status: 400 })
    }

    const result = await setDeletedArchiveLegalHold(
      id,
      admin,
      action === 'legal_hold',
      reason,
      reference,
    )

    return NextResponse.json(result)
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
