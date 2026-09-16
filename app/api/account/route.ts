import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getCurrentUser } from '@/lib/auth'
import { archiveAndDeleteUser } from '@/lib/account-lifecycle'
import { checkRateLimit } from '@/lib/rate-limit'

export async function DELETE(req: Request) {
  try {
    const rate = checkRateLimit(req, '/api/account/delete')
    if (!rate.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    if (user.role === 'master_admin') return NextResponse.json({ error: 'Master Admin accounts cannot be self-deleted.' }, { status: 409 })
    const body = await req.json().catch(() => ({}))
    if (body.confirm !== 'DELETE') return NextResponse.json({ error: 'Type DELETE to confirm account deletion.' }, { status: 400 })
    await archiveAndDeleteUser(user.id, null, String(body.reason || 'User requested account deletion'), 'self')
    const jar = await cookies()
    jar.delete('transformher_session')
    jar.delete('session')
    return NextResponse.json({ success: true, message: 'Your active account has been deleted. Limited records may be retained for fraud prevention, payment disputes, accounting, security, legal claims, or lawful requests under the retention policy.' })
  } catch (err) {
    console.error('[account/delete] Account deletion failed')
    if (err instanceof Error && err.message === 'User not found') return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    return NextResponse.json({ error: 'Unable to delete your account right now.' }, { status: 500 })
  }
}
