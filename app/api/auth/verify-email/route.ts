import { NextResponse } from 'next/server'
import { verifyEmailToken, markEmailVerified, getUserNameByEmail } from '@/lib/auth'
import { sendEmailVerifiedEmail } from '@/lib/email'
import { getBaseUrl } from '@/lib/utils'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    const email = verifyEmailToken(token)
    if (!email) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
    }

    await markEmailVerified(email)
    const name = (await getUserNameByEmail(email)) ?? email.split('@')[0]

    try {
      await sendEmailVerifiedEmail(email, name, `${getBaseUrl()}/library`)
    } catch (err) {
      console.error('Failed to send verified email:', err)
    }

    return NextResponse.json({ success: true, message: 'Email verified successfully' })
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
