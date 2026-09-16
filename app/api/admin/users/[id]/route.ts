import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import {
  requireMasterAdmin,
  getUserById,
  setUserAdmin,
} from '@/lib/auth'
import { getDb } from '@/lib/db/connection'
import { pendingChanges, user as userTable, verification } from '@/lib/db/schema'
import { getDefaultPermissions, ALL_PERMISSIONS, type Permission } from '@/lib/permissions'

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireMasterAdmin()
    const { id } = await params
    const body = await req.json()

    const user = await getUserById(id)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const updates: {
      role?: 'user' | 'admin' | 'master_admin'
      rank?: 'junior' | 'senior' | 'lead' | 'master'
      title?: string
      permissions?: Permission[]
    } = {}

    if (body.role !== undefined) {
      if (body.role === 'master_admin' && user.role !== 'master_admin') {
        return NextResponse.json({ error: 'Cannot promote to master admin' }, { status: 400 })
      }
      updates.role = body.role
      if (body.rank !== undefined) updates.rank = body.rank
      if (body.title !== undefined) updates.title = body.title
      if (body.role === 'admin' && !body.permissions) {
        updates.permissions = getDefaultPermissions('admin')
      }
    } else {
      if (body.rank !== undefined) updates.rank = body.rank
      if (body.title !== undefined) updates.title = body.title
    }

    if (body.permissions !== undefined) {
      if (user.role === 'master_admin') {
        return NextResponse.json({ error: 'Cannot modify master admin permissions' }, { status: 400 })
      }
      const validPerms = body.permissions.filter((p: string) => ALL_PERMISSIONS.includes(p as Permission))
      updates.permissions = validPerms
    }

    const updated = await setUserAdmin(id, updates)

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      rank: updated.rank,
      title: updated.title,
      permissions: updated.permissions,
    })
  } catch (err) {
    if (err instanceof Error && err.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[admin/users] Failed to update user')
    return NextResponse.json({ error: 'Unable to update this user right now.' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireMasterAdmin()
    const { id } = await params

    if (id === admin.id) {
      return NextResponse.json({ error: 'You cannot delete your own account from the admin dashboard' }, { status: 400 })
    }

    const user = await getUserById(id)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.role === 'master_admin') {
      return NextResponse.json({ error: 'Cannot remove master admin' }, { status: 400 })
    }

    const db = await getDb()
    if (!db) {
      return NextResponse.json({ error: 'Database is temporarily unavailable.' }, { status: 503 })
    }

    // The application uses signed cookie sessions, so deleting a user row is
    // enough to invalidate their current session. Child rows created by the
    // current schema (session, account, cart and purchases) cascade from user.
    // Avoid explicitly querying optional legacy tables: older production
    // databases may not contain them, which previously made deletion fail.
    await db.transaction(async (tx) => {
      await tx.delete(verification).where(eq(verification.identifier, user.email.trim().toLowerCase()))
      await tx.delete(pendingChanges).where(eq(pendingChanges.submittedBy, user.id))
      await tx.delete(userTable).where(eq(userTable.id, user.id))
    })

    return NextResponse.json({ success: true, message: 'User account and associated data were permanently deleted.' })
  } catch (err) {
    if (err instanceof Error && err.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[admin/users] Failed to delete user')
    return NextResponse.json({ error: 'Unable to delete this user right now.' }, { status: 500 })
  }
}
