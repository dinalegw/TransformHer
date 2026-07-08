import { NextResponse } from 'next/server'
import { requireAdmin, getUsersStore } from '@/lib/auth'
import { getAllMergedBooks } from '@/lib/admin-books'
import { fetchLibrary, releaseLibraryItem } from '@/lib/library'
import { hasPermission } from '@/lib/permissions'

export async function GET() {
  try {
    const user = await requireAdmin()
    const store = getUsersStore()
    const allUsers = Array.from(store.users.values())
    const allBooks = await getAllMergedBooks({ includeArchived: true })
    const bookBySlug = new Map(allBooks.map(b => [b.slug, b]))

    const orders: Array<{
      id: number
      userId: string
      userName: string
      userEmail: string
      bookSlug: string
      bookTitle: string
      purchaseDate: string
      released: boolean
      releaseAt: string | null
      archived?: boolean
    }> = []

    for (const u of allUsers) {
      const items = await fetchLibrary(u.id, true)
      for (const item of items) {
        const book = bookBySlug.get(item.bookSlug)
        orders.push({
          id: item.id,
          userId: u.id,
          userName: u.name,
          userEmail: u.email,
          bookSlug: item.bookSlug,
          bookTitle: book?.title ?? item.bookSlug,
          purchaseDate: item.purchaseDate,
          released: item.released,
          releaseAt: item.releaseAt,
          archived: item.archived,
        })
      }
    }

    orders.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())

    return NextResponse.json({ orders, total: orders.length })
  } catch (err) {
    if (err instanceof Error && err.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Admin orders error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
