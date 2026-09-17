import Courier from '@trycourier/courier'

export class CourierEmailError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CourierEmailError'
  }
}

let client: Courier | null = null

function getClient(): Courier {
  if (!client) {
    const apiKey = process.env.COURIER_API_KEY
    if (!apiKey) {
      throw new CourierEmailError('[courier] COURIER_API_KEY is not configured')
    }
    client = new Courier({
      apiKey,
      timeout: 30_000,
      maxRetries: 2,
    })
  }
  return client
}

function getTemplate(key: string): string {
  const templateId = process.env[key]
  if (!templateId) {
    throw new CourierEmailError(`[courier] ${key} is not configured`)
  }
  return templateId
}

async function sendMessage(
  to: string,
  templateId: string,
  data: Record<string, unknown>,
  label: string,
): Promise<void> {
  try {
    console.info(`[courier] send:${label}`, {
      to,
      template: templateId,
      dataKeys: Object.keys(data),
    })
    const res = await getClient().send.message({
      message: {
        to: { email: to },
        template: templateId,
        data,
        routing: { method: 'single', channels: ['email'] },
      },
    })
    // Courier acceptance is not delivery. Use this ID in Courier's event timeline.
    console.info(`[courier] accepted:${label}`, { requestId: res.requestId })
  } catch (error) {
    console.error(`[courier] send_failed:${label}`, {
      to,
      template: templateId,
      dataKeys: Object.keys(data),
      error,
    })
    throw new CourierEmailError(`Courier ${label} failed: ${error instanceof Error ? error.message : error}`)
  }
}

async function sendInlineEmail(
  to: string,
  title: string,
  body: string,
  label: string,
): Promise<void> {
  try {
    console.info(`[courier] send_inline:${label}`, { to })
    const res = await getClient().send.message({
      message: {
        to: { email: to },
        content: { title, body },
        routing: { method: 'single', channels: ['email'] },
      },
    })
    console.info(`[courier] accepted:${label}`, { requestId: res.requestId, mode: 'inline' })
  } catch (error) {
    console.error(`[courier] send_failed:${label}`, { to, mode: 'inline', error })
    throw new CourierEmailError(`Courier ${label} failed: ${error instanceof Error ? error.message : error}`)
  }
}

export async function sendPasswordResetEmail(to: string, resetLink: string) {
  return sendMessage(to, getTemplate('COURIER_TEMPLATE_PASSWORD_RESET'), { resetLink }, 'password_reset')
}

export async function sendPasswordResetConfirmationEmail(to: string, name: string) {
  return sendMessage(to, getTemplate('COURIER_TEMPLATE_PASSWORD_RESET_CONFIRMATION'), { name }, 'password_reset_confirmation')
}

export async function sendPasswordChangedEmail(to: string, name: string) {
  return sendMessage(to, getTemplate('COURIER_TEMPLATE_PASSWORD_CHANGED'), { name }, 'password_changed')
}

export async function sendWelcomeVerificationEmail(to: string, name: string, verifyLink: string) {
  return sendMessage(to, getTemplate('COURIER_TEMPLATE_WELCOME_VERIFY'), { name, verifyLink }, 'welcome_verify')
}

export async function sendEmailVerifiedEmail(to: string, name: string, libraryLink: string) {
  return sendMessage(to, getTemplate('COURIER_TEMPLATE_EMAIL_VERIFIED'), { name, libraryLink }, 'email_verified')
}

export async function sendVerifyNewEmailEmail(to: string, name: string, verifyLink: string) {
  return sendMessage(to, getTemplate('COURIER_TEMPLATE_VERIFY_NEW_EMAIL'), { name, verifyLink }, 'verify_new_email')
}

export async function sendLoginNotification(to: string, name: string, location?: string, device?: string) {
  const templateId = process.env.COURIER_TEMPLATE_LOGIN_NOTIFICATION
  const data = { name, location, device }

  if (templateId) {
    return sendMessage(to, templateId, data, 'login_notification')
  }

  // Keep login notifications operational even when a deployment is missing the
  // optional template variable. Courier supports inline content for email.
  const context = [location ? `Location: ${location}` : null, device ? `Device: ${device}` : null]
    .filter(Boolean)
    .join('\n')
  const body = [
    `Hi ${name},`,
    'A new sign-in to your TransformHer account was detected.',
    context || null,
    'If this was you, no action is required. If not, reset your password immediately.',
  ].filter(Boolean).join('\n\n')

  return sendInlineEmail(
    to,
    'New sign-in to your TransformHer account',
    body,
    'login_notification',
  )
}

export async function sendSecurityAlert(to: string, name: string, alertType: string, details?: string) {
  return sendMessage(to, getTemplate('COURIER_TEMPLATE_SECURITY_ALERT'), { name, alertType, details }, 'security_alert')
}

export async function sendInvitationEmail(to: string, name: string, inviteLink: string, inviterName: string) {
  return sendMessage(to, getTemplate('COURIER_TEMPLATE_INVITATION'), { name, inviteLink, inviterName }, 'invitation')
}

export async function sendPurchaseConfirmation(to: string, name: string, bookTitle: string, amount: string) {
  return sendMessage(to, getTemplate('COURIER_TEMPLATE_ORDER_CONFIRMATION'), { name, bookTitle, amount }, 'purchase_confirmation')
}

export async function sendBookReleasedEmail(to: string, name: string, bookTitle: string, libraryLink: string) {
  return sendMessage(to, getTemplate('COURIER_TEMPLATE_BOOK_RELEASED'), { name, bookTitle, libraryLink }, 'book_released')
}

export async function sendAdminOrderNotification(adminEmail: string, customerEmail: string, customerName: string, bookTitle: string, amount: string) {
  return sendMessage(adminEmail, getTemplate('COURIER_TEMPLATE_ADMIN_ORDER'), { bookTitle, customerName, customerEmail, amount }, 'admin_order')
}
