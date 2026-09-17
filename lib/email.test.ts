import { describe, it, expect, vi, beforeEach } from 'vitest'

const originalEnv = process.env
const SUPPORT_EMAIL = 'transformher360@gmail.com'
const SENDER = `TransformHer <${SUPPORT_EMAIL}>`

const { mockSendMessage, mockCourierConstructor } = vi.hoisted(() => ({
  mockSendMessage: vi.fn().mockResolvedValue({ requestId: 'test-request-id' }),
  mockCourierConstructor: vi.fn(),
}))

vi.mock('@trycourier/courier', () => {
  return {
    default: class MockedCourier {
      constructor(opts?: unknown) {
        mockCourierConstructor(opts)
      }
      send = { message: mockSendMessage }
    }
  }
})

async function loadEmailModule(overrides: Record<string, string | undefined> = {}) {
  process.env = { ...originalEnv, COURIER_API_KEY: 'pk_test', ...overrides }
  vi.resetModules()
  return await import('./email')
}

function expectEmailSend(
  to: string,
  template: string,
  data: Record<string, unknown>,
) {
  expect(mockSendMessage).toHaveBeenCalledWith({
    message: {
      to: { email: to },
      template,
      data: {
        ...data,
        supportEmail: SUPPORT_EMAIL,
      },
      routing: { method: 'single', channels: ['email'] },
      channels: {
        email: {
          override: {
            from: SENDER,
            reply_to: SUPPORT_EMAIL,
          },
        },
      },
    },
  })
}

describe('lib/email', () => {
  beforeEach(() => {
    mockSendMessage.mockClear()
    mockSendMessage.mockResolvedValue({ requestId: 'test-request-id' })
    mockCourierConstructor.mockClear()
  })

  it('sends password reset email with support routing', async () => {
    const email = await loadEmailModule({ COURIER_TEMPLATE_PASSWORD_RESET: 'test-reset' })
    await email.sendPasswordResetEmail('user@example.com', 'https://example.com/reset')
    expectEmailSend('user@example.com', 'test-reset', { resetLink: 'https://example.com/reset' })
  })

  it('requires a Courier API key instead of silently using another provider key', async () => {
    const email = await loadEmailModule({
      COURIER_API_KEY: undefined,
      COURIER_TEMPLATE_PASSWORD_RESET: 'test-reset',
      RENDERED_API_KEY: 'render-test-key',
    })

    await expect(email.sendPasswordResetEmail('user@example.com', 'https://example.com/reset')).rejects
      .toThrow(email.CourierEmailError)
    expect(mockCourierConstructor).not.toHaveBeenCalled()
  })

  it('throws CourierEmailError when Courier fails', async () => {
    const email = await loadEmailModule({ COURIER_TEMPLATE_PASSWORD_RESET: 'test-reset' })
    mockSendMessage.mockRejectedValue(new Error('Courier error'))
    await expect(email.sendPasswordResetEmail('user@example.com', 'https://example.com/reset')).rejects
      .toThrow(email.CourierEmailError)
  })

  it('throws CourierEmailError when template env var is missing', async () => {
    const email = await loadEmailModule({ COURIER_TEMPLATE_PASSWORD_RESET: undefined })
    await expect(email.sendPasswordResetEmail('user@example.com', 'https://example.com/reset')).rejects
      .toThrow(email.CourierEmailError)
  })

  it('sends password changed email', async () => {
    const email = await loadEmailModule({ COURIER_TEMPLATE_PASSWORD_CHANGED: 'test-changed' })
    await email.sendPasswordChangedEmail('user@example.com', 'Ada')
    expectEmailSend('user@example.com', 'test-changed', { name: 'Ada' })
  })

  it('sends password reset confirmation email', async () => {
    const email = await loadEmailModule({ COURIER_TEMPLATE_PASSWORD_RESET_CONFIRMATION: 'test-reset-confirm' })
    await email.sendPasswordResetConfirmationEmail('user@example.com', 'Ada')
    expectEmailSend('user@example.com', 'test-reset-confirm', { name: 'Ada' })
  })

  it('sends welcome verification email', async () => {
    const email = await loadEmailModule({ COURIER_TEMPLATE_WELCOME_VERIFY: 'test-welcome' })
    await email.sendWelcomeVerificationEmail('user@example.com', 'Ada', 'https://example.com/verify')
    expectEmailSend('user@example.com', 'test-welcome', { name: 'Ada', verifyLink: 'https://example.com/verify' })
  })

  it('sends email verified email', async () => {
    const email = await loadEmailModule({ COURIER_TEMPLATE_EMAIL_VERIFIED: 'test-verified' })
    await email.sendEmailVerifiedEmail('user@example.com', 'Ada', 'https://example.com/library')
    expectEmailSend('user@example.com', 'test-verified', { name: 'Ada', libraryLink: 'https://example.com/library' })
  })

  it('sends login notification without optional fields', async () => {
    const email = await loadEmailModule({ COURIER_TEMPLATE_LOGIN_NOTIFICATION: 'test-login' })
    await email.sendLoginNotification('user@example.com', 'Ada')
    expectEmailSend('user@example.com', 'test-login', { name: 'Ada', location: undefined, device: undefined })
  })

  it('sends login notification with location and device', async () => {
    const email = await loadEmailModule({ COURIER_TEMPLATE_LOGIN_NOTIFICATION: 'test-login' })
    await email.sendLoginNotification('user@example.com', 'Ada', 'Lagos, NG', 'Browser')
    expectEmailSend('user@example.com', 'test-login', { name: 'Ada', location: 'Lagos, NG', device: 'Browser' })
  })

  it('sends security alert', async () => {
    const email = await loadEmailModule({ COURIER_TEMPLATE_SECURITY_ALERT: 'test-alert' })
    await email.sendSecurityAlert('user@example.com', 'Ada', 'Sign-in', 'Unknown device')
    expectEmailSend('user@example.com', 'test-alert', { name: 'Ada', alertType: 'Sign-in', details: 'Unknown device' })
  })

  it('sends verify new email', async () => {
    const email = await loadEmailModule({ COURIER_TEMPLATE_VERIFY_NEW_EMAIL: 'test-verify' })
    await email.sendVerifyNewEmailEmail('user@example.com', 'Ada', 'https://example.com/verify-new')
    expectEmailSend('user@example.com', 'test-verify', { name: 'Ada', verifyLink: 'https://example.com/verify-new' })
  })

  it('sends invitation email', async () => {
    const email = await loadEmailModule({ COURIER_TEMPLATE_INVITATION: 'test-invite' })
    await email.sendInvitationEmail('user@example.com', 'Ada', 'https://example.com/invite', 'Ngozi')
    expectEmailSend('user@example.com', 'test-invite', { name: 'Ada', inviteLink: 'https://example.com/invite', inviterName: 'Ngozi' })
  })

  it('sends frozen account lifecycle email with reason and support routing', async () => {
    const email = await loadEmailModule({ COURIER_TEMPLATE_ACCOUNT_FROZEN: 'test-frozen' })
    await email.sendAccountFrozenEmail('user@example.com', 'Ada', 'Review required')
    expectEmailSend('user@example.com', 'test-frozen', { name: 'Ada', reason: 'Review required' })
  })

  it('sends archived account lifecycle email', async () => {
    const email = await loadEmailModule({ COURIER_TEMPLATE_ACCOUNT_ARCHIVED: 'test-archived' })
    await email.sendAccountArchivedEmail('user@example.com', 'Ada')
    expectEmailSend('user@example.com', 'test-archived', { name: 'Ada' })
  })

  it('sends account unfrozen lifecycle email', async () => {
    const email = await loadEmailModule({ COURIER_TEMPLATE_ACCOUNT_UNFROZEN: 'test-unfrozen' })
    await email.sendAccountUnfrozenEmail('user@example.com', 'Ada')
    expectEmailSend('user@example.com', 'test-unfrozen', { name: 'Ada' })
  })

  it('sends account unarchived lifecycle email', async () => {
    const email = await loadEmailModule({ COURIER_TEMPLATE_ACCOUNT_UNARCHIVED: 'test-unarchived' })
    await email.sendAccountUnarchivedEmail('user@example.com', 'Ada')
    expectEmailSend('user@example.com', 'test-unarchived', { name: 'Ada' })
  })

  it('sends admin order notification', async () => {
    const email = await loadEmailModule({ COURIER_TEMPLATE_ADMIN_ORDER: 'test-admin' })
    await email.sendAdminOrderNotification('admin@example.com', 'customer@example.com', 'Ada', 'Book', '₦1,000')
    expectEmailSend('admin@example.com', 'test-admin', { bookTitle: 'Book', customerName: 'Ada', customerEmail: 'customer@example.com', amount: '₦1,000' })
  })

  it('sends purchase confirmation', async () => {
    const email = await loadEmailModule({ COURIER_TEMPLATE_ORDER_CONFIRMATION: 'test-order' })
    await email.sendPurchaseConfirmation('user@example.com', 'Ada', 'Book', '₦1,000')
    expectEmailSend('user@example.com', 'test-order', { name: 'Ada', bookTitle: 'Book', amount: '₦1,000' })
  })

  it('sends book released email', async () => {
    const email = await loadEmailModule({ COURIER_TEMPLATE_BOOK_RELEASED: 'test-book' })
    await email.sendBookReleasedEmail('user@example.com', 'Ada', 'Book', 'https://example.com/library')
    expectEmailSend('user@example.com', 'test-book', { name: 'Ada', bookTitle: 'Book', libraryLink: 'https://example.com/library' })
  })

  it('preserves cause on error', async () => {
    const email = await loadEmailModule({ COURIER_TEMPLATE_PASSWORD_RESET: 'test-reset' })
    mockSendMessage.mockRejectedValue(new Error('original'))
    await expect(email.sendPasswordResetEmail('user@example.com', 'https://example.com/reset')).rejects
      .toThrow('Courier password_reset failed: original')
  })
})
