import { NextResponse } from 'next/server'
import { requireMasterAdmin, getUsersStore, saveUsersStore } from '@/lib/auth'
import { getDefaultPermissions, ALL_PERMISSIONS, type Permission } from '@/lib/permissions'

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireMasterAdmin()
    const { id } = await params
    const body = await req.json()
    const store = getUsersStore()

    const user = store.users.get(id)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (body.role !== undefined) {
      if (body.role === 'master_admin' && user.role !== 'master_admin') {
        return NextResponse.json({ error: 'Cannot promote to master admin' }, { status: 400 })
      }
      user.role = body.role
      user.isAdmin = body.role === 'admin' || body.role === 'master_admin'
      if (body.role === 'admin' && !user.permissions?.length) {
        user.permissions = getDefaultPermissions('admin')
      }
    }
    if (body.rank !== undefined) user.rank = body.rank
    if (body.title !== undefined) user.title = body.title
    if (body.permissions !== undefined) {
      if (user.role === 'master_admin') {
        return NextResponse.json({ error: 'Cannot modify master admin permissions' }, { status: 400 })
      }
      const validPerms = body.permissions.filter((p: string) => ALL_PERMISSIONS.includes(p as Permission))
      user.permissions = validPerms
    }

    saveUsersStore()
    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      rank: user.rank,
      title: user.title,
      permissions: user.permissions,
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
    await requireMasterAdmin()
    const { id } = await params
    const store = getUsersStore()

    const user = store.users.get(id)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.role === 'master_admin') {
      return NextResponse.json({ error: 'Cannot remove master admin' }, { status: 400 })
    }

    user.isAdmin = false
    user.role = 'user'
    user.rank = undefined
    user.title = undefined
    user.permissions = []

    saveUsersStore()
    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof Error && err.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const message = err instanceof Error ? err.message : 'Something went wrong'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
