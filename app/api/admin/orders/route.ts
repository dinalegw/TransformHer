import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getAllMergedBooks } from '@/lib/admin-books'
import { getDb, userPurchases, user as userTable } from '@/lib/db'
import { eq, desc, sql } from 'drizzle-orm'
import { hasPermission } from '@/lib/permissions'

function parsePositiveInteger(value: string | null, fallback: number, max: number) {
  if (!value) return fallback
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) return fallback
  return Math.min(parsed, max)
}

export async function GET(req: Request) {
  try {
    const admin = await requireAdmin()
    if (admin.role !== 'master_admin' && !hasPermission(admin.permissions, 'view_orders')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const db = await getDb()
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 })
    }

    const { searchParams } = new URL(req.url)
    const page = parsePositiveInteger(searchParams.get('page'), 1, 1_000_000)
    const limit = parsePositiveInteger(searchParams.get('limit'), 50, 100)
    const offset = (page - 1) * limit

    const allBooks = await getAllMergedBooks({ includeArchived: true })
    const bookBySlug = new Map(allBooks.map((book) => [book.slug, book]))

    const baseQuery = db.select({
      id: userPurchases.id,
      userId: userPurchases.userId,
      userName: userTable.name,
      userEmail: userTable.email,
      bookSlug: userPurchases.bookSlug,
      purchaseDate: userPurchases.purchaseDate,
      released: userPurchases.released,
      releaseAt: userPurchases.releaseAt,
      archived: userPurchases.archived,
    })
      .from(userPurchases)
      .leftJoin(userTable, eq(userPurchases.userId, userTable.id))
      .orderBy(desc(userPurchases.purchaseDate))

    const [{ count: total }] = await db.select({ count: sql<number>`count(*)::int` })
      .from(userPurchases)
      .leftJoin(userTable, eq(userPurchases.userId, userTable.id))

    const orders = await baseQuery.limit(limit).offset(offset)

    const enriched = orders.map((order) => {
      const book = bookBySlug.get(order.bookSlug)
      return {
        id: order.id,
        userId: order.userId,
        userName: order.userName ?? 'Unknown',
        userEmail: order.userEmail ?? 'unknown@example.com',
        bookSlug: order.bookSlug,
        bookTitle: book?.title ?? order.bookSlug,
        purchaseDate: order.purchaseDate.toISOString(),
        released: order.released,
        releaseAt: order.releaseAt ? order.releaseAt.toISOString() : null,
        archived: order.archived,
      }
    })

    const safeTotal = total ?? 0
    return NextResponse.json({
      orders: enriched,
      total: safeTotal,
      page,
      limit,
      totalPages: Math.ceil(safeTotal / limit),
    })
  } catch (err) {
    if (err instanceof Error && err.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Admin orders error:', err)
    return NextResponse.json({ error: 'Unable to load orders right now.' }, { status: 500 })
  }
}
