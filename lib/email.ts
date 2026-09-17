import Courier from '@trycourier/courier'
import { COURIER_TEMPLATE_IDS } from '@/lib/courier-template-manifest'

export class CourierEmailError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CourierEmailError'
  }
}

export interface CourierSendReceipt {
  requestId: string
}

export interface CourierDispatchState {
  state: 'sent' | 'failed' | 'pending'
  status: string | null
}

export const DEFAULT_LOGIN_NOTIFICATION_TEMPLATE_ID =
  COURIER_TEMPLATE_IDS.COURIER_TEMPLATE_LOGIN_NOTIFICATION || 'nt_01m2qga613e48rk85s854qc59r'

export function getCourierTemplateId(key: string): string {
  const generated = COURIER_TEMPLATE_IDS[key]?.trim()
  const configured = process.env[key]?.trim()

  // Vercel builds generate and verify this manifest directly from the connected
  // Courier workspace before Next.js bundles the application. Prefer those
  // verified IDs in Vercel so stale legacy environment values cannot override
  // repaired templates. Outside Vercel, explicit environment values remain
  // useful for tests and local development.
  if (process.env.VERCEL && generated) return generated
  if (configured) return configured
  if (generated) return generated

  throw new CourierEmailError(`[courier] ${key} is not configured`)
}

export function getLoginNotificationTemplateId(): string {
  return getCourierTemplateId('COURIER_TEMPLATE_LOGIN_NOTIFICATION')
}

let client: Courier | null = null

function getApiKey(): string {
  const apiKey = process.env.COURIER_API_KEY
  if (!apiKey) throw new CourierEmailError('[courier] COURIER_API_KEY is not configured')
  return apiKey
}

function getClient(): Courier {
  if (!client) {
    client = new Courier({
      apiKey: getApiKey(),
      timeout: 30_000,
      maxRetries: 2,
    })
  }
  return client
}

function recipientDomain(address: string): string {
  const at = address.lastIndexOf('@')
  return at >= 0 ? address.slice(at + 1).toLowerCase().slice(0, 120) : 'invalid'
}

async function sendMessage(
  to: string,
  templateId: string,
  data: Record<string, unknown>,
  label: string,
): Promise<CourierSendReceipt> {
  try {
    console.info(`[courier] send:${label}`, {
      recipientDomain: recipientDomain(to),
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
    console.info(`[courier] accepted:${label}`, { requestId: res.requestId })
    return { requestId: res.requestId }
  } catch (error) {
    console.error(`[courier] send_failed:${label}`, {
      recipientDomain: recipientDomain(to),
      template: templateId,
      dataKeys: Object.keys(data),
      error,
    })
    throw new CourierEmailError(`Courier ${label} failed: ${error instanceof Error ? error.message : error}`)
  }
}

async function readCourierMessageStatus(messageId: string): Promise<string | null> {
  const response = await fetch(`https://api.courier.com/messages/${encodeURIComponent(messageId)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new CourierEmailError(`Courier message status lookup failed (${response.status})`)
  }

  const body = await response.json() as { status?: unknown }
  return typeof body.status === 'string' ? body.status.toUpperCase() : null
}

const SUCCESS_STATUSES = new Set(['SENT', 'DELIVERED', 'OPENED', 'CLICKED'])
const FAILURE_STATUSES = new Set(['UNROUTABLE', 'UNDELIVERABLE', 'FAILED', 'CANCELED', 'CANCELLED'])

/**
 * A successful Courier send call only means the request was accepted. For
 * critical account emails we briefly poll Courier so we can distinguish an
 * accepted request from an immediate provider/routing failure and avoid telling
 * the user an email was sent when Courier already knows it was not.
 */
export async function waitForCourierDispatch(
  messageId: string,
  attempts = 4,
): Promise<CourierDispatchState> {
  let lastStatus: string | null = null

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, Math.min(1000, 250 * attempt)))
    }

    try {
      lastStatus = await readCourierMessageStatus(messageId)
    } catch (error) {
      console.warn('[courier] status_check_failed', {
        messageId,
        error: error instanceof Error ? error.message : String(error),
      })
      return { state: 'pending', status: lastStatus }
    }

    if (lastStatus && SUCCESS_STATUSES.has(lastStatus)) {
      return { state: 'sent', status: lastStatus }
    }
    if (lastStatus && FAILURE_STATUSES.has(lastStatus)) {
      return { state: 'failed', status: lastStatus }
    }
  }

  return { state: 'pending', status: lastStatus }
}

export async function sendPasswordResetEmail(to: string, resetLink: string) {
  return sendMessage(to, getCourierTemplateId('COURIER_TEMPLATE_PASSWORD_RESET'), { resetLink }, 'password_reset')
}

export async function sendPasswordResetConfirmationEmail(to: string, name: string) {
  return sendMessage(to, getCourierTemplateId('COURIER_TEMPLATE_PASSWORD_RESET_CONFIRMATION'), { name }, 'password_reset_confirmation')
}

export async function sendPasswordChangedEmail(to: string, name: string) {
  return sendMessage(to, getCourierTemplateId('COURIER_TEMPLATE_PASSWORD_CHANGED'), { name }, 'password_changed')
}

export async function sendWelcomeVerificationEmail(to: string, name: string, verifyLink: string) {
  return sendMessage(to, getCourierTemplateId('COURIER_TEMPLATE_WELCOME_VERIFY'), { name, verifyLink }, 'welcome_verify')
}

export async function sendEmailVerifiedEmail(to: string, name: string, libraryLink: string) {
  return sendMessage(to, getCourierTemplateId('COURIER_TEMPLATE_EMAIL_VERIFIED'), { name, libraryLink }, 'email_verified')
}

export async function sendVerifyNewEmailEmail(to: string, name: string, verifyLink: string) {
  return sendMessage(to, getCourierTemplateId('COURIER_TEMPLATE_VERIFY_NEW_EMAIL'), { name, verifyLink }, 'verify_new_email')
}

export async function sendLoginNotification(to: string, name: string, location?: string, device?: string) {
  return sendMessage(
    to,
    getLoginNotificationTemplateId(),
    { name, location, device },
    'login_notification',
  )
}

export async function sendSecurityAlert(to: string, name: string, alertType: string, details?: string) {
  return sendMessage(to, getCourierTemplateId('COURIER_TEMPLATE_SECURITY_ALERT'), { name, alertType, details }, 'security_alert')
}

export async function sendInvitationEmail(to: string, name: string, inviteLink: string, inviterName: string) {
  return sendMessage(to, getCourierTemplateId('COURIER_TEMPLATE_INVITATION'), { name, inviteLink, inviterName }, 'invitation')
}

export async function sendPurchaseConfirmation(to: string, name: string, bookTitle: string, amount: string) {
  return sendMessage(to, getCourierTemplateId('COURIER_TEMPLATE_ORDER_CONFIRMATION'), { name, bookTitle, amount }, 'purchase_confirmation')
}

export async function sendBookReleasedEmail(to: string, name: string, bookTitle: string, libraryLink: string) {
  return sendMessage(to, getCourierTemplateId('COURIER_TEMPLATE_BOOK_RELEASED'), { name, bookTitle, libraryLink }, 'book_released')
}

export async function sendAdminOrderNotification(adminEmail: string, customerEmail: string, customerName: string, bookTitle: string, amount: string) {
  return sendMessage(adminEmail, getCourierTemplateId('COURIER_TEMPLATE_ADMIN_ORDER'), { bookTitle, customerName, customerEmail, amount }, 'admin_order')
}
