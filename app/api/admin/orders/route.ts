import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getAllMergedBooks } from '@/lib/admin-books'
import { getDb, userPurchases, user as userTable } from '@/lib/db'
import { eq, desc, asc, sql, and, or, ne } from 'drizzle-orm'

export async function GET(req: Request) {
  try {
    await requireAdmin()
    const db = await getDb()
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 })
    }

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, Number(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '50')))
    const offset = (page - 1) * limit

    const allBooks = await getAllMergedBooks({ includeArchived: true })
    const bookBySlug = new Map(allBooks.map(b => [b.slug, b]))

    const whereClause = and(
      sql`${userPurchases.released} = true OR ${userPurchases.released} = false`,
    )

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

    const enriched = orders.map((o: {
      id: number
      userId: string
      userName?: string
      userEmail?: string
      bookSlug: string
      purchaseDate: Date | string
      released: boolean
      releaseAt: Date | string | null
      archived?: boolean
    }) => {
      const book = bookBySlug.get(o.bookSlug)
      return {
        id: o.id,
        userId: o.userId,
        userName: o.userName ?? 'Unknown',
        userEmail: o.userEmail ?? 'unknown@example.com',
        bookSlug: o.bookSlug,
        bookTitle: book?.title ?? o.bookSlug,
        purchaseDate: o.purchaseDate instanceof Date ? o.purchaseDate.toISOString() : o.purchaseDate,
        released: o.released,
        releaseAt: o.releaseAt instanceof Date ? o.releaseAt.toISOString() : o.releaseAt,
        archived: o.archived,
      }
    })

    return NextResponse.json({
      orders: enriched,
      total: total ?? 0,
      page,
      limit,
      totalPages: Math.ceil((total ?? 0) / limit),
    })
  } catch (err) {
    if (err instanceof Error && err.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Admin orders error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
