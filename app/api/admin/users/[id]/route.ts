import { NextResponse } from 'next/server'
import { requireMasterAdmin, getUserById, setUserAdmin } from '@/lib/auth'
import { getDefaultPermissions, ALL_PERMISSIONS, type Permission } from '@/lib/permissions'
import { checkRateLimit } from '@/lib/rate-limit'
import {
  archiveAndDeleteUser,
  archiveUser,
  freezeUser,
  restoreArchivedUser,
  unfreezeUser,
} from '@/lib/account-lifecycle'

function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin')
  if (!origin) return true
  try {
    return new URL(origin).host === new URL(req.url).host
  } catch {
    return false
  }
}

function rateLimited(retryAfter: number) {
  return NextResponse.json(
    { error: 'Too many admin account changes. Please wait and try again.', retryAfter },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } },
  )
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!sameOrigin(req)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }

    const rate = await checkRateLimit(req, '/api/admin/users/update')
    if (!rate.allowed) return rateLimited(rate.retryAfter)

    const admin = await requireMasterAdmin()
    const { id } = await params
    const target = await getUserById(id)
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const body = await req.json().catch(() => ({}))
    const action = typeof body.action === 'string' ? body.action : null

    if (action) {
      if (id === admin.id) {
        return NextResponse.json({ error: 'You cannot change your own Master Admin lifecycle state here.' }, { status: 409 })
      }
      if (target.role === 'master_admin') {
        return NextResponse.json({ error: 'Cannot change another Master Admin lifecycle state.' }, { status: 409 })
      }

      if (action === 'freeze') {
        const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : ''
        await freezeUser(id, admin, reason || 'Frozen by Master Admin')
        return NextResponse.json({ success: true, status: 'frozen' })
      }
      if (action === 'unfreeze') {
        await unfreezeUser(id)
        return NextResponse.json({ success: true, status: 'active' })
      }
      if (action === 'archive') {
        await archiveUser(id)
        return NextResponse.json({ success: true, status: 'archived' })
      }
      if (action === 'restore') {
        await restoreArchivedUser(id)
        return NextResponse.json({ success: true, status: 'active' })
      }

      return NextResponse.json({ error: 'Unsupported lifecycle action' }, { status: 400 })
    }

    const updates: {
      role?: 'user' | 'admin' | 'master_admin'
      rank?: 'junior' | 'senior' | 'lead' | 'master'
      title?: string
      permissions?: Permission[]
    } = {}

    if (body.role !== undefined) {
      if (target.role === 'master_admin' || body.role === 'master_admin') {
        return NextResponse.json({ error: 'Master Admin role cannot be changed through this endpoint.' }, { status: 409 })
      }
      if (!['user', 'admin'].includes(body.role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
      }
      updates.role = body.role
      if (body.role === 'admin' && body.permissions === undefined) {
        updates.permissions = getDefaultPermissions('admin')
      }
    }

    if (body.rank !== undefined) {
      if (!['junior', 'senior', 'lead', 'master'].includes(body.rank)) {
        return NextResponse.json({ error: 'Invalid admin rank' }, { status: 400 })
      }
      updates.rank = body.rank
    }

    if (body.title !== undefined) {
      const title = String(body.title).trim()
      if (title.length > 100) {
        return NextResponse.json({ error: 'Admin title must be 100 characters or fewer.' }, { status: 400 })
      }
      updates.title = title
    }

    if (body.permissions !== undefined) {
      if (target.role === 'master_admin') {
        return NextResponse.json({ error: 'Cannot modify Master Admin permissions' }, { status: 409 })
      }
      if (!Array.isArray(body.permissions)) {
        return NextResponse.json({ error: 'Permissions must be an array' }, { status: 400 })
      }
      const invalidPermission = body.permissions.find(
        (permission: unknown) => typeof permission !== 'string' || !ALL_PERMISSIONS.includes(permission as Permission),
      )
      if (invalidPermission !== undefined) {
        return NextResponse.json({ error: 'One or more permissions are invalid.' }, { status: 400 })
      }
      updates.permissions = body.permissions as Permission[]
    }

    const updated = await setUserAdmin(id, updates)
    return NextResponse.json(updated)
  } catch (err) {
    if (err instanceof Error && err.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[admin/users] update failed', err)
    return NextResponse.json({ error: 'Unable to update this user right now.' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!sameOrigin(req)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }

    const rate = await checkRateLimit(req, '/api/admin/users/delete')
    if (!rate.allowed) return rateLimited(rate.retryAfter)

    const admin = await requireMasterAdmin()
    const { id } = await params
    if (id === admin.id) {
      return NextResponse.json({ error: 'You cannot delete your own Master Admin account.' }, { status: 409 })
    }

    const target = await getUserById(id)
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    if (target.role === 'master_admin') {
      return NextResponse.json({ error: 'Cannot delete a Master Admin account.' }, { status: 409 })
    }

    const body = await req.json().catch(() => ({}))
    const requestedReason = typeof body.reason === 'string' ? body.reason.trim() : ''
    if (requestedReason.length > 500) {
      return NextResponse.json({ error: 'Deletion reason must be 500 characters or fewer.' }, { status: 400 })
    }

    await archiveAndDeleteUser(
      id,
      admin,
      requestedReason || 'Deleted by Master Admin',
      'master_admin',
    )

    return NextResponse.json({
      success: true,
      message: 'Active account deleted and permitted compliance records archived.',
    })
  } catch (err) {
    if (err instanceof Error && err.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[admin/users] delete failed', err)
    return NextResponse.json({ error: 'Unable to delete this user right now.' }, { status: 500 })
  }
}
