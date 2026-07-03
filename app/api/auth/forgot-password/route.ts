import { NextResponse } from 'next/server'
import { generateResetToken } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }
    const token = generateResetToken(email)
    return NextResponse.json({
      message: 'If that email is registered, you will receive a reset link.',
      ...(process.env.NODE_ENV === 'development' && { devResetLink: `${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/reset-password?token=${token}` }),
    })
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
