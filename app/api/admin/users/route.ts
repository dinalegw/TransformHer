import { NextResponse } from 'next/server'
import { requireMasterAdmin, listAllUsers } from '@/lib/auth'
import { getDb } from '@/lib/db/connection'
import { user as userTable } from '@/lib/db/schema'

export async function GET() {
  try {
    await requireMasterAdmin()

    const [users, db] = await Promise.all([listAllUsers(), getDb()])
    if (!db) {
      return NextResponse.json({ error: 'User management is temporarily unavailable.' }, { status: 503 })
    }

    const lifecycleRows = await db.select({
      id: userTable.id,
      accountStatus: userTable.accountStatus,
      frozenAt: userTable.frozenAt,
      archivedAt: userTable.archivedAt,
    }).from(userTable)

    const lifecycle = new Map(lifecycleRows.map((row) => [row.id, row]))
    const enrichedUsers = users.map((user) => ({
      ...user,
      accountStatus: lifecycle.get(user.id)?.accountStatus ?? 'active',
      frozenAt: lifecycle.get(user.id)?.frozenAt ?? null,
      archivedAt: lifecycle.get(user.id)?.archivedAt ?? null,
    }))

    return NextResponse.json({ users: enrichedUsers, total: enrichedUsers.length })
  } catch (err) {
    if (err instanceof Error && err.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Admin users error:', err)
    return NextResponse.json({ error: 'Unable to load users right now.' }, { status: 500 })
  }
}
