import { NextResponse } from 'next/server'
import { generateResetToken } from '@/lib/auth'
import { sendPasswordResetEmail } from '@/lib/email'
import { getBaseUrl } from '@/lib/utils'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const token = generateResetToken(email)
    const resetLink = `${getBaseUrl()}/reset-password?token=${token}`

    try {
      await sendPasswordResetEmail(email, resetLink)
    } catch (emailErr) {
      console.error('Forgot password email failed to send:', emailErr)
    }

    return NextResponse.json({
      message: 'If that email is registered, a reset link has been sent.',
    })
  } catch (err) {
    console.error('Forgot password error:', err)
    const message = err instanceof Error ? err.message : 'Something went wrong'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
