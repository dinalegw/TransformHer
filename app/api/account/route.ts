import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { authenticateUser, getCurrentUser } from '@/lib/auth'
import { archiveAndDeleteUser } from '@/lib/account-lifecycle'
import { checkRateLimit } from '@/lib/rate-limit'
import { isSameOriginRequest } from '@/lib/request-security'

export async function DELETE(req: Request) {
  try {
    const rate = await checkRateLimit(req, '/api/account/delete')
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many requests', retryAfter: rate.retryAfter },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfter) } },
      )
    }

    if (!isSameOriginRequest(req)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }

    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    if (user.role === 'master_admin') {
      return NextResponse.json({ error: 'Master Admin accounts cannot be self-deleted.' }, { status: 409 })
    }

    const body = await req.json().catch(() => ({}))
    if (body.confirm !== 'DELETE') {
      return NextResponse.json({ error: 'Type DELETE to confirm account deletion.' }, { status: 400 })
    }
    if (typeof body.password !== 'string' || !body.password) {
      return NextResponse.json({ error: 'Enter your current password to continue.' }, { status: 400 })
    }

    const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
    if (reason.length < 5) {
      return NextResponse.json({ error: 'Please tell us why you want to delete your account.' }, { status: 400 })
    }
    if (reason.length > 500) {
      return NextResponse.json({ error: 'Deletion reason must be 500 characters or fewer.' }, { status: 400 })
    }

    const verified = await authenticateUser(user.email, body.password)
    if (!verified || verified.id !== user.id) {
      return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 401 })
    }

    await archiveAndDeleteUser(
      user.id,
      null,
      reason,
      'self',
    )

    const jar = await cookies()
    jar.delete('transformher_session')
    jar.delete('session')

    return NextResponse.json({
      success: true,
      message: 'Your active account has been deleted. Limited records may be retained for fraud prevention, payment disputes, accounting, security, legal claims, or lawful requests under the retention policy.',
    })
  } catch (err) {
    console.error('[account/delete] Account deletion failed', err)
    if (err instanceof Error && err.message === 'User not found') {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }
    if (err instanceof Error && err.message === 'Database not available') {
      return NextResponse.json({ error: 'Account deletion is temporarily unavailable. Please try again.' }, { status: 503 })
    }
    return NextResponse.json({ error: 'Unable to delete your account right now.' }, { status: 500 })
  }
}
