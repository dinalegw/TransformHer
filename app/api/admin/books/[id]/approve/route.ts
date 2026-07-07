import { NextResponse } from 'next/server'
import { requireMasterAdmin, getCurrentUser } from '@/lib/auth'
import { approveChange } from '@/lib/admin-books'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireMasterAdmin()
    const { id } = await params
    const change = await approveChange(id, user.email)
    return NextResponse.json({ change })
  } catch (err) {
    if (err instanceof Error && err.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const message = err instanceof Error ? err.message : 'Something went wrong'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
