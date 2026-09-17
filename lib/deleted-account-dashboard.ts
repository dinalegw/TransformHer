import 'server-only'
import { desc, sql } from 'drizzle-orm'
import { getDb } from '@/lib/db/connection'
import { deletedUserArchives } from '@/lib/db/schema'
import {
  purgeExpiredDeletedUserArchives,
  recordArchiveAudit,
  type ComplianceActor,
} from '@/lib/compliance'

export interface DeletedAccountDashboardSummary {
  total: number
  recent: Array<{
    id: string
    originalName: string
    originalEmail: string
    accountDeletedAt: Date
    deletionType: string
    deletionReason: string | null
  }>
}

export async function getDeletedAccountDashboardSummary(
  actor: ComplianceActor,
): Promise<DeletedAccountDashboardSummary> {
  const db = await getDb()
  if (!db) throw new Error('Database not available')

  await purgeExpiredDeletedUserArchives()

  const [countRow, recent] = await Promise.all([
    db.select({ total: sql<number>`count(*)::int` }).from(deletedUserArchives),
    db.select({
      id: deletedUserArchives.id,
      originalName: deletedUserArchives.originalName,
      originalEmail: deletedUserArchives.originalEmail,
      accountDeletedAt: deletedUserArchives.accountDeletedAt,
      deletionType: deletedUserArchives.deletionType,
      deletionReason: deletedUserArchives.deletionReason,
    })
      .from(deletedUserArchives)
      .orderBy(desc(deletedUserArchives.accountDeletedAt))
      .limit(5),
  ])

  await recordArchiveAudit(
    actor,
    'dashboard_archive_summary',
    null,
    'Master Admin viewed deleted-account summary on dashboard',
  )

  return {
    total: Number(countRow[0]?.total ?? 0),
    recent,
  }
}
