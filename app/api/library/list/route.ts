import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { fetchLibrary } from '@/lib/library'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const library = await fetchLibrary(user.id)
  return NextResponse.json({ items: library })
}
