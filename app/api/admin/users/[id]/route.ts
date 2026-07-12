import { NextResponse } from 'next/server'
import {
  requireMasterAdmin,
  getUserById,
  setUserAdmin,
  demoteUserToRegular,
  listAllUsers,
} from '@/lib/auth'
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
    const message = err instanceof Error ? err.message : 'Something went wrong'
    return NextResponse.json({ error: message }, { status: 500 })
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
      return NextResponse.json({ error: 'You cannot demote yourself' }, { status: 400 })
    }

    const user = await getUserById(id)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.role === 'master_admin') {
      return NextResponse.json({ error: 'Cannot remove master admin' }, { status: 400 })
    }

    // Never leave the platform without a master admin.
    if (user.role === 'admin') {
      const allUsers = await listAllUsers()
      const remainingMasters = allUsers.filter(
        (u) => u.role === 'master_admin' && u.id !== id,
      )
      if (remainingMasters.length === 0) {
        return NextResponse.json(
          { error: 'Cannot demote the last master admin' },
          { status: 400 },
        )
      }
    }

    await demoteUserToRegular(id)
    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof Error && err.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const message = err instanceof Error ? err.message : 'Something went wrong'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
