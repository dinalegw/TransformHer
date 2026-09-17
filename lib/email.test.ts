import { describe, it, expect, vi, beforeEach } from 'vitest'

const originalEnv = process.env
const SUPPORT_EMAIL = 'transformher360@gmail.com'

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
    const email = await loadEmailModule()
    await expect(email.sendPasswordResetEmail('user@example.com', 'https://example.com/reset')).rejects
      .toThrow(email.CourierEmailError)
  })

  it('sends password changed email', async () => {
    const email = await loadEmailModule({ COURIER_TEMPLATE_PASSWORD_CHANGED: 'test-changed' })
    await email.sendPasswordChangedEmail('user@example.com', 'Jane Doe')
    expectEmailSend('user@example.com', 'test-changed', { name: 'Jane Doe' })
  })

  it('sends password reset confirmation email', async () => {
    const email = await loadEmailModule({ COURIER_TEMPLATE_PASSWORD_RESET_CONFIRMATION: 'test-reset-confirm' })
    await email.sendPasswordResetConfirmationEmail('user@example.com', 'Jane Doe')
    expectEmailSend('user@example.com', 'test-reset-confirm', { name: 'Jane Doe' })
  })

  it('sends welcome verification email', async () => {
    const email = await loadEmailModule({ COURIER_TEMPLATE_WELCOME_VERIFY: 'test-welcome' })
    await email.sendWelcomeVerificationEmail('user@example.com', 'Jane Doe', 'https://example.com/verify')
    expectEmailSend('user@example.com', 'test-welcome', {
      name: 'Jane Doe',
      verifyLink: 'https://example.com/verify',
    })
  })

  it('sends email verified email', async () => {
    const email = await loadEmailModule({ COURIER_TEMPLATE_EMAIL_VERIFIED: 'test-verified' })
    await email.sendEmailVerifiedEmail('user@example.com', 'Jane Doe', 'https://example.com/library')
    expectEmailSend('user@example.com', 'test-verified', {
      name: 'Jane Doe',
      libraryLink: 'https://example.com/library',
    })
  })

  it('sends login notification without optional fields', async () => {
    const email = await loadEmailModule({ COURIER_TEMPLATE_LOGIN_NOTIFICATION: 'test-login' })
    await email.sendLoginNotification('user@example.com', 'Jane Doe')
    expectEmailSend('user@example.com', 'test-login', {
      name: 'Jane Doe',
      location: undefined,
      device: undefined,
    })
  })

  it('sends login notification with location and device', async () => {
    const email = await loadEmailModule({ COURIER_TEMPLATE_LOGIN_NOTIFICATION: 'test-login' })
    await email.sendLoginNotification('user@example.com', 'Jane Doe', 'Lagos, Nigeria', 'Chrome on Mac')
    expectEmailSend('user@example.com', 'test-login', {
      name: 'Jane Doe',
      location: 'Lagos, Nigeria',
      device: 'Chrome on Mac',
    })
  })

  it('sends security alert', async () => {
    const email = await loadEmailModule({ COURIER_TEMPLATE_SECURITY_ALERT: 'test-alert' })
    await email.sendSecurityAlert('user@example.com', 'Jane Doe', 'password_reset', 'Reset requested from unknown IP')
    expectEmailSend('user@example.com', 'test-alert', {
      name: 'Jane Doe',
      alertType: 'password_reset',
      details: 'Reset requested from unknown IP',
    })
  })

  it('sends verify new email', async () => {
    const email = await loadEmailModule({ COURIER_TEMPLATE_VERIFY_NEW_EMAIL: 'test-verify' })
    await email.sendVerifyNewEmailEmail('user@example.com', 'Jane Doe', 'https://example.com/verify')
    expectEmailSend('user@example.com', 'test-verify', {
      name: 'Jane Doe',
      verifyLink: 'https://example.com/verify',
    })
  })

  it('sends invitation email', async () => {
    const email = await loadEmailModule({ COURIER_TEMPLATE_INVITATION: 'test-invite' })
    await email.sendInvitationEmail('new@example.com', 'John Doe', 'https://example.com/invite/abc', 'Admin User')
    expectEmailSend('new@example.com', 'test-invite', {
      name: 'John Doe',
      inviteLink: 'https://example.com/invite/abc',
      inviterName: 'Admin User',
    })
  })

  it('sends frozen account lifecycle email with reason and support routing', async () => {
    const email = await loadEmailModule({ COURIER_TEMPLATE_ACCOUNT_FROZEN: 'test-frozen' })
    await email.sendAccountFrozenEmail('user@example.com', 'Jane Doe', 'Manual security review')
    expectEmailSend('user@example.com', 'test-frozen', {
      name: 'Jane Doe',
      reason: 'Manual security review',
    })
  })

  it('sends archived account lifecycle email', async () => {
    const email = await loadEmailModule({ COURIER_TEMPLATE_ACCOUNT_ARCHIVED: 'test-archived' })
    await email.sendAccountArchivedEmail('user@example.com', 'Jane Doe')
    expectEmailSend('user@example.com', 'test-archived', { name: 'Jane Doe' })
  })

  it('sends account unfrozen lifecycle email', async () => {
    const email = await loadEmailModule({ COURIER_TEMPLATE_ACCOUNT_UNFROZEN: 'test-unfrozen' })
    await email.sendAccountUnfrozenEmail('user@example.com', 'Jane Doe')
    expectEmailSend('user@example.com', 'test-unfrozen', { name: 'Jane Doe' })
  })

  it('sends account unarchived lifecycle email', async () => {
    const email = await loadEmailModule({ COURIER_TEMPLATE_ACCOUNT_UNARCHIVED: 'test-unarchived' })
    await email.sendAccountUnarchivedEmail('user@example.com', 'Jane Doe')
    expectEmailSend('user@example.com', 'test-unarchived', { name: 'Jane Doe' })
  })

  it('sends admin order notification', async () => {
    const email = await loadEmailModule({ COURIER_TEMPLATE_ADMIN_ORDER: 'test-admin' })
    await email.sendAdminOrderNotification('admin@example.com', 'customer@example.com', 'Customer Name', 'Book Title', '10.00')
    expectEmailSend('admin@example.com', 'test-admin', {
      bookTitle: 'Book Title',
      customerName: 'Customer Name',
      customerEmail: 'customer@example.com',
      amount: '10.00',
    })
  })

  it('sends purchase confirmation', async () => {
    const email = await loadEmailModule({ COURIER_TEMPLATE_ORDER_CONFIRMATION: 'test-order' })
    await email.sendPurchaseConfirmation('user@example.com', 'Jane Doe', 'My Book', '25.00')
    expectEmailSend('user@example.com', 'test-order', {
      name: 'Jane Doe',
      bookTitle: 'My Book',
      amount: '25.00',
    })
  })

  it('sends book released email', async () => {
    const email = await loadEmailModule({ COURIER_TEMPLATE_BOOK_RELEASED: 'test-book' })
    await email.sendBookReleasedEmail('user@example.com', 'Jane Doe', 'My Book', 'https://example.com/library')
    expectEmailSend('user@example.com', 'test-book', {
      name: 'Jane Doe',
      bookTitle: 'My Book',
      libraryLink: 'https://example.com/library',
    })
  })

  it('preserves cause on error', async () => {
    const email = await loadEmailModule({ COURIER_TEMPLATE_PASSWORD_RESET: 'test-reset' })
    mockSendMessage.mockRejectedValue(new Error('original'))
    try {
      await email.sendPasswordResetEmail('user@example.com', 'https://example.com/reset')
    } catch (error) {
      expect(error).toBeInstanceOf(email.CourierEmailError)
      expect((error as Error).message).toContain('Courier password_reset failed')
    }
  })
})
