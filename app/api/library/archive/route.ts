import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { archiveLibraryItem } from '@/lib/library'

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { bookSlug, archived } = body

    if (!bookSlug || typeof archived !== 'boolean') {
      return NextResponse.json({ error: 'bookSlug and archived are required' }, { status: 400 })
    }

    await archiveLibraryItem(user.id, bookSlug, archived)
    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Something went wrong'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
