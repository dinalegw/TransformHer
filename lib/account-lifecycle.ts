import { randomUUID } from 'crypto'
import { eq, sql } from 'drizzle-orm'
import { getDb } from '@/lib/db/connection'
import { deletedUserArchives, user as userTable, userPurchases, cart, pendingChanges } from '@/lib/db/schema'

export type DeletionActor = { id: string; email: string; role: string }

function getRetentionDays() {
  const configured = Number.parseInt(process.env.ACCOUNT_ARCHIVE_RETENTION_DAYS || '', 10)
  if (!Number.isFinite(configured)) return 365
  return Math.min(Math.max(configured, 30), 3650)
}

export async function freezeUser(userId: string, actor: DeletionActor, reason: string) {
  const db = await getDb()
  if (!db) throw new Error('Database not available')

  await db.update(userTable).set({
    accountStatus: 'frozen',
    frozenAt: new Date(),
    frozenBy: actor.id,
    freezeReason: reason || 'Frozen by Master Admin',
    archivedAt: null,
    tokenVersion: sql`${userTable.tokenVersion} + 1`,
    updatedAt: new Date(),
  }).where(eq(userTable.id, userId))
}

export async function unfreezeUser(userId: string) {
  const db = await getDb()
  if (!db) throw new Error('Database not available')

  await db.update(userTable).set({
    accountStatus: 'active',
    frozenAt: null,
    frozenBy: null,
    freezeReason: null,
    archivedAt: null,
    tokenVersion: sql`${userTable.tokenVersion} + 1`,
    updatedAt: new Date(),
  }).where(eq(userTable.id, userId))
}

export async function archiveUser(userId: string) {
  const db = await getDb()
  if (!db) throw new Error('Database not available')

  await db.update(userTable).set({
    accountStatus: 'archived',
    archivedAt: new Date(),
    frozenAt: null,
    frozenBy: null,
    freezeReason: null,
    tokenVersion: sql`${userTable.tokenVersion} + 1`,
    updatedAt: new Date(),
  }).where(eq(userTable.id, userId))
}

export async function restoreArchivedUser(userId: string) {
  const db = await getDb()
  if (!db) throw new Error('Database not available')

  await db.update(userTable).set({
    accountStatus: 'active',
    archivedAt: null,
    tokenVersion: sql`${userTable.tokenVersion} + 1`,
    updatedAt: new Date(),
  }).where(eq(userTable.id, userId))
}

/** Archive permitted evidence first, then erase the active account in one transaction. */
export async function archiveAndDeleteUser(
  userId: string,
  actor: DeletionActor | null,
  reason: string,
  deletionType: 'self' | 'master_admin',
) {
  const db = await getDb()
  if (!db) throw new Error('Database not available')

  const retentionDays = getRetentionDays()

  await db.transaction(async (tx) => {
    const rows = await tx.select().from(userTable).where(eq(userTable.id, userId)).limit(1)
    const target = rows[0]
    if (!target) throw new Error('User not found')

    const purchases = await tx.select({
      bookId: userPurchases.bookId,
      bookSlug: userPurchases.bookSlug,
      purchaseDate: userPurchases.purchaseDate,
      paymentReference: userPurchases.paymentReference,
      released: userPurchases.released,
      releaseAt: userPurchases.releaseAt,
    }).from(userPurchases).where(eq(userPurchases.userId, userId))

    await tx.insert(deletedUserArchives).values({
      id: randomUUID(),
      originalUserId: target.id,
      originalEmail: target.email,
      originalName: target.name,
      username: target.username,
      phone: target.phone,
      accountCreatedAt: target.createdAt,
      accountDeletedAt: new Date(),
      deletionType,
      deletedBy: actor?.id ?? target.id,
      deletionReason: reason,
      accountStatusAtDeletion: target.accountStatus ?? 'active',
      emailVerified: target.emailVerified,
      purchaseSnapshot: JSON.stringify(purchases),
      retentionReason: 'Fraud prevention, payment disputes, accounting, security investigations and lawful requests',
      retentionExpiresAt: new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000),
      legalHold: false,
      createdAt: new Date(),
    })

    await tx.delete(pendingChanges).where(eq(pendingChanges.submittedBy, userId))
    await tx.delete(cart).where(eq(cart.userId, userId))
    await tx.delete(userPurchases).where(eq(userPurchases.userId, userId))

    // Auth/verification tokens are signed and stateless in the current system.
    // Do not query optional legacy session/account/verification tables: deleting
    // the user invalidates signed sessions, and legacy FK rows cascade when present.
    await tx.delete(userTable).where(eq(userTable.id, userId))
  })
}
