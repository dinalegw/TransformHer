import Courier from '@trycourier/courier'

let _client: Courier | null = null

function getClient(): Courier {
  if (!_client) {
    const apiKey = process.env.COURIER_API_KEY
    if (!apiKey) {
      throw new EmailSendError('COURIER_API_KEY is not configured')
    }
    _client = new Courier({
      apiKey,
      maxRetries: 3,
      timeout: 30_000,
    })
  }
  return _client
}

function getTemplate(key: string): string {
  const value = process.env[key]
  if (!value || typeof value !== 'string') {
    throw new EmailSendError(`${key} environment variable is required`)
  }
  return value
}

export class EmailSendError extends Error {
  cause: unknown
  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'EmailSendError'
    this.cause = cause
  }
}

async function sendCourierMessage(
  to: string,
  template: string,
  data: Record<string, unknown>,
  context: string,
): Promise<void> {
  const client = getClient()
  try {
    await client.send.message({
      message: {
        to: { email: to },
        template,
        data,
      },
    })
  } catch (error) {
    if (error instanceof Error) {
      console.error(`[email] Courier ${context} failed:`, {
        message: error.message,
        raw: error,
      })
    } else {
      console.error(`[email] Courier ${context} failed with unknown error:`, error)
    }
    throw new EmailSendError(`Courier ${context} failed`, error)
  }
}

export async function sendPasswordResetEmail(to: string, resetLink: string) {
  return sendCourierMessage(
    to,
    getTemplate('COURIER_TEMPLATE_PASSWORD_RESET'),
    { resetLink },
    'password reset email'
  )
}

export async function sendPasswordResetConfirmationEmail(to: string, name: string) {
  return sendCourierMessage(
    to,
    getTemplate('COURIER_TEMPLATE_PASSWORD_RESET_CONFIRMATION'),
    { name },
    'password reset confirmation email'
  )
}

export async function sendPasswordChangedEmail(to: string, name: string) {
  return sendCourierMessage(
    to,
    getTemplate('COURIER_TEMPLATE_PASSWORD_CHANGED'),
    { name },
    'password changed notification'
  )
}

export async function sendWelcomeVerificationEmail(to: string, name: string, verifyLink: string) {
  return sendCourierMessage(
    to,
    getTemplate('COURIER_TEMPLATE_WELCOME_VERIFY'),
    { name, verifyLink },
    'welcome verification email'
  )
}

export async function sendEmailVerifiedEmail(to: string, name: string, libraryLink: string) {
  return sendCourierMessage(
    to,
    getTemplate('COURIER_TEMPLATE_EMAIL_VERIFIED'),
    { name, libraryLink },
    'email verified notification'
  )
}

export async function sendVerifyNewEmailEmail(to: string, name: string, verifyLink: string) {
  return sendCourierMessage(
    to,
    getTemplate('COURIER_TEMPLATE_VERIFY_NEW_EMAIL'),
    { name, verifyLink },
    'verify new email notification'
  )
}

export async function sendPurchaseConfirmation(
  to: string,
  name: string,
  bookTitle: string,
  amount: string,
) {
  return sendCourierMessage(
    to,
    getTemplate('COURIER_TEMPLATE_ORDER_CONFIRMATION'),
    { name, bookTitle, amount },
    'purchase confirmation'
  )
}

export async function sendBookReleasedEmail(
  to: string,
  name: string,
  bookTitle: string,
  libraryLink: string,
) {
  return sendCourierMessage(
    to,
    getTemplate('COURIER_TEMPLATE_BOOK_RELEASED'),
    { name, bookTitle, libraryLink },
    'book released notification'
  )
}

export async function sendAdminOrderNotification(
  adminEmail: string,
  customerEmail: string,
  customerName: string,
  bookTitle: string,
  amount: string,
) {
  return sendCourierMessage(
    adminEmail,
    getTemplate('COURIER_TEMPLATE_ADMIN_ORDER'),
    { bookTitle, customerName, customerEmail, amount },
    'admin order notification'
  )
}

export async function sendLoginNotification(to: string, name: string, location?: string, device?: string) {
  return sendCourierMessage(
    to,
    getTemplate('COURIER_TEMPLATE_LOGIN_NOTIFICATION'),
    { name, location, device },
    'login notification'
  )
}

export async function sendSecurityAlert(to: string, name: string, alertType: string, details?: string) {
  return sendCourierMessage(
    to,
    getTemplate('COURIER_TEMPLATE_SECURITY_ALERT'),
    { name, alertType, details },
    'security alert'
  )
}

export async function sendInvitationEmail(to: string, name: string, inviteLink: string, inviterName: string) {
  return sendCourierMessage(
    to,
    getTemplate('COURIER_TEMPLATE_INVITATION'),
    { name, inviteLink, inviterName },
    'invitation email'
  )
}
