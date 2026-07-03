import { NextResponse } from 'next/server'
import { generateResetToken } from '@/lib/auth'
import { sendPasswordResetEmail } from '@/lib/email'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }
    const token = generateResetToken(email)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
    const resetLink = `${baseUrl}/reset-password?token=${token}`

    await sendPasswordResetEmail(email, resetLink)

    return NextResponse.json({
      message: 'If that email is registered, a reset link has been sent.',
    })
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
