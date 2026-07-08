import { NextResponse } from 'next/server'
import { verifyResetToken, updatePassword, getUserNameByEmail } from '@/lib/auth'
import { sendPasswordChangedEmail } from '@/lib/email'

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json()
    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }
    const email = verifyResetToken(token)
    if (!email) {
      return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 })
    }
    await updatePassword(email, password)
    try {
      const name = await getUserNameByEmail(email) ?? email.split('@')[0]
      await sendPasswordChangedEmail(email, name)
    } catch (err) {
      console.error('Failed to send password changed email:', err)
    }
    return NextResponse.json({ message: 'Password updated successfully' })
  } catch (err) {
    console.error('Reset password error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
