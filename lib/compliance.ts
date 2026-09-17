import 'server-only'
import { randomUUID } from 'crypto'
import { and, desc, eq, lte, sql } from 'drizzle-orm'
import { getDb } from '@/lib/db/connection'
import { deletedUserArchives } from '@/lib/db/schema'
import {
  deletedUserAccessEvents,
  ensureAccessHistorySchema,
  getDeletedUserAccessHistory,
} from '@/lib/access-history'

export interface ComplianceActor {
  id: string
  email: string
}

async function ensureComplianceAuditTable() {
  const db = await getDb()
  if (!db) throw new Error('Database not available')

  await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS "deleted_user_archive_audit" (
    "id" text PRIMARY KEY,
    "archive_id" text,
    "actor_user_id" text NOT NULL,
    "actor_email" text NOT NULL,
    "action" text NOT NULL,
    "reason" text,
    "request_reference" text,
    "created_at" timestamp NOT NULL DEFAULT now()
  );`))
  await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS "deleted_user_archive_audit_archive_idx" ON "deleted_user_archive_audit"("archive_id");`))
  await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS "deleted_user_archive_audit_created_idx" ON "deleted_user_archive_audit"("created_at");`))

  return db
}

export async function recordArchiveAudit(
  actor: ComplianceActor,
  action: string,
  archiveId: string | null,
  reason?: string,
  requestReference?: string,
) {
  const db = await ensureComplianceAuditTable()
  await db.execute(sql`
    INSERT INTO "deleted_user_archive_audit"
      ("id", "archive_id", "actor_user_id", "actor_email", "action", "reason", "request_reference", "created_at")
    VALUES
      (${randomUUID()}, ${archiveId}, ${actor.id}, ${actor.email}, ${action}, ${reason ?? null}, ${requestReference ?? null}, now())
  `)
}

/**
 * Delete only records whose configured retention period has ended and that are
 * not under legal hold. This intentionally never touches active user records.
 */
export async function purgeExpiredDeletedUserArchives() {
  const db = await ensureComplianceAuditTable()
  await ensureAccessHistorySchema()

  const expired = await db.delete(deletedUserArchives)
    .where(and(
      lte(deletedUserArchives.retentionExpiresAt, new Date()),
      eq(deletedUserArchives.legalHold, false),
    ))
    .returning({ id: deletedUserArchives.id })

  if (expired.length > 0) {
    for (const row of expired) {
      await db.delete(deletedUserAccessEvents).where(eq(deletedUserAccessEvents.archiveId, row.id))
      await recordArchiveAudit(
        { id: 'system', email: 'system@transformher.local' },
        'retention_purge',
        row.id,
        'Configured retention period expired and no legal hold was active',
      )
    }
  }

  return expired.length
}

export async function listDeletedArchivesForCompliance(actor: ComplianceActor) {
  const db = await ensureComplianceAuditTable()
  await purgeExpiredDeletedUserArchives()

  const rows = await db.select().from(deletedUserArchives)
    .orderBy(desc(deletedUserArchives.accountDeletedAt))
    .limit(100)

  await recordArchiveAudit(actor, 'list_archives', null, 'Master Admin opened deleted-account archive list')

  return rows.map(({ purchaseSnapshot: _purchaseSnapshot, ...row }) => row)
}

export async function getDeletedArchiveForCompliance(
  archiveId: string,
  actor: ComplianceActor,
  reason: string,
  requestReference?: string,
) {
  const db = await ensureComplianceAuditTable()
  const rows = await db.select().from(deletedUserArchives)
    .where(eq(deletedUserArchives.id, archiveId))
    .limit(1)
  const archive = rows[0]
  if (!archive) return null

  await recordArchiveAudit(actor, 'view_archive', archiveId, reason, requestReference)

  let purchases: unknown[] = []
  try {
    const parsed = JSON.parse(archive.purchaseSnapshot)
    if (Array.isArray(parsed)) purchases = parsed
  } catch {
    purchases = []
  }

  const accessHistory = await getDeletedUserAccessHistory(archiveId)

  return { ...archive, purchaseSnapshot: purchases, accessHistory }
}

export async function setDeletedArchiveLegalHold(
  archiveId: string,
  actor: ComplianceActor,
  enabled: boolean,
  reason: string,
  requestReference?: string,
) {
  if (!reason.trim()) throw new Error('A documented reason is required')
  if (enabled && !requestReference?.trim()) {
    throw new Error('A lawful request or case reference is required to place a legal hold')
  }

  const db = await ensureComplianceAuditTable()
  const existing = await db.select({ id: deletedUserArchives.id })
    .from(deletedUserArchives)
    .where(eq(deletedUserArchives.id, archiveId))
    .limit(1)
  if (!existing[0]) throw new Error('Archive not found')

  await db.update(deletedUserArchives).set({
    legalHold: enabled,
    legalHoldReference: enabled ? requestReference?.trim() || null : null,
  }).where(eq(deletedUserArchives.id, archiveId))

  await recordArchiveAudit(
    actor,
    enabled ? 'place_legal_hold' : 'release_legal_hold',
    archiveId,
    reason.trim(),
    requestReference?.trim(),
  )

  return { success: true, legalHold: enabled }
}
