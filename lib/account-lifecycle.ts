import { randomUUID } from 'crypto'
import { and, eq, sql } from 'drizzle-orm'
import { getDb } from '@/lib/db/connection'
import { deletedUserArchives, user as userTable, userPurchases, cart, verification, pendingChanges } from '@/lib/db/schema'

export type DeletionActor = { id: string; email: string; role: string }

export async function freezeUser(userId: string, actor: DeletionActor, reason: string) {
  const db = await getDb()
  if (!db) throw new Error('Database not available')
  await db.update(userTable).set({
    accountStatus: 'frozen', frozenAt: new Date(), frozenBy: actor.id,
    freezeReason: reason || 'Frozen by Master Admin',
    tokenVersion: sql`${userTable.tokenVersion} + 1`, updatedAt: new Date(),
  }).where(eq(userTable.id, userId))
}

export async function unfreezeUser(userId: string) {
  const db = await getDb()
  if (!db) throw new Error('Database not available')
  await db.update(userTable).set({
    accountStatus: 'active', frozenAt: null, frozenBy: null, freezeReason: null,
    tokenVersion: sql`${userTable.tokenVersion} + 1`, updatedAt: new Date(),
  }).where(eq(userTable.id, userId))
}

/** Archive evidence first, then erase the active account in one transaction. */
export async function archiveAndDeleteUser(userId: string, actor: DeletionActor | null, reason: string, deletionType: 'self' | 'master_admin') {
  const db = await getDb()
  if (!db) throw new Error('Database not available')

  await db.transaction(async (tx) => {
    const rows = await tx.select().from(userTable).where(eq(userTable.id, userId)).limit(1)
    const target = rows[0]
    if (!target) throw new Error('User not found')

    const purchases = await tx.select({
      bookId: userPurchases.bookId, bookSlug: userPurchases.bookSlug,
      purchaseDate: userPurchases.purchaseDate, paymentReference: userPurchases.paymentReference,
      released: userPurchases.released, releaseAt: userPurchases.releaseAt,
    }).from(userPurchases).where(eq(userPurchases.userId, userId))

    await tx.insert(deletedUserArchives).values({
      id: randomUUID(), originalUserId: target.id, originalEmail: target.email,
      originalName: target.name, username: target.username, phone: target.phone,
      accountCreatedAt: target.createdAt, accountDeletedAt: new Date(),
      deletionType, deletedBy: actor?.id ?? target.id, deletionReason: reason,
      accountStatusAtDeletion: target.accountStatus ?? 'active', emailVerified: target.emailVerified,
      purchaseSnapshot: JSON.stringify(purchases), retentionReason: 'Fraud prevention, payment disputes, accounting, security investigations and lawful requests',
      retentionExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), legalHold: false,
      createdAt: new Date(),
    })

    await tx.delete(verification).where(eq(verification.identifier, target.email.trim().toLowerCase()))
    await tx.delete(pendingChanges).where(eq(pendingChanges.submittedBy, userId))
    await tx.delete(cart).where(eq(cart.userId, userId))
    await tx.delete(userPurchases).where(eq(userPurchases.userId, userId))
    // Current auth uses signed cookies. Do not query optional legacy session/account tables.
    await tx.delete(userTable).where(eq(userTable.id, userId))
  })
}
