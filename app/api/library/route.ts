import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { fetchLibrary } from '@/lib/library'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const library = await fetchLibrary(user.id)
  return NextResponse.json(library)
}

export async function POST(req: Request) {
  void req
  return NextResponse.json({ error: 'Library access is granted only after verified payment.' }, { status: 405 })
}

export async function DELETE(req: Request) {
  void req
  return NextResponse.json({ error: 'Purchased library items cannot be removed.' }, { status: 405 })
}
