import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendPasswordResetEmail(to: string, resetLink: string) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? 'noreply@transformher.com',
    to,
    subject: 'Reset your TransformHer password',
    html: `
      <div style="max-width:480px;margin:0 auto;font-family:sans-serif;">
        <h1 style="color:#8B5CF6;">TransformHer</h1>
        <p>You requested a password reset. Click the button below to set a new password:</p>
        <a href="${resetLink}" style="display:inline-block;padding:12px 24px;background:#8B5CF6;color:#fff;text-decoration:none;border-radius:999px;font-weight:600;">
          Reset password
        </a>
        <p style="margin-top:24px;color:#6b7280;font-size:14px;">
          This link expires in 1 hour. If you didn't request this, you can ignore this email.
        </p>
      </div>
    `,
  })
}
