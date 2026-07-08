import { describe, it, expect, vi, beforeEach } from 'vitest'

const originalEnv = process.env

const { fn: mockSendMessage } = vi.hoisted(() => ({
  fn: vi.fn().mockResolvedValue({ requestId: 'test-request-id' }),
}))

vi.mock('@trycourier/courier', () => {
  return {
    default: class MockedCourier {
      constructor(_opts?: unknown) {}
      send = { message: mockSendMessage }
    }
  }
})

async function loadEmailModule(overrides: Record<string, string | undefined> = {}) {
  process.env = { ...originalEnv, COURIER_API_KEY: 'pk_test', ...overrides }
  vi.resetModules()
  return await import('./email')
}

describe('lib/email', () => {
  beforeEach(() => {
    mockSendMessage.mockReset()
  })

  it('sends password reset email with correct payload', async () => {
    const email = await loadEmailModule({ COURIER_TEMPLATE_PASSWORD_RESET: 'test-reset' })
    await email.sendPasswordResetEmail('user@example.com', 'https://example.com/reset')
    expect(mockSendMessage).toHaveBeenCalledWith({
      message: {
        to: { email: 'user@example.com' },
        template: 'test-reset',
        data: { resetLink: 'https://example.com/reset' },
      },
    })
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
    expect(mockSendMessage).toHaveBeenCalledWith({
      message: {
        to: { email: 'user@example.com' },
        template: 'test-changed',
        data: { name: 'Jane Doe' },
      },
    })
  })

  it('sends password reset confirmation email', async () => {
    const email = await loadEmailModule({ COURIER_TEMPLATE_PASSWORD_RESET_CONFIRMATION: 'test-reset-confirm' })
    await email.sendPasswordResetConfirmationEmail('user@example.com', 'Jane Doe')
    expect(mockSendMessage).toHaveBeenCalledWith({
      message: {
        to: { email: 'user@example.com' },
        template: 'test-reset-confirm',
        data: { name: 'Jane Doe' },
      },
    })
  })

  it('sends welcome verification email', async () => {
    const email = await loadEmailModule({ COURIER_TEMPLATE_WELCOME_VERIFY: 'test-welcome' })
    await email.sendWelcomeVerificationEmail('user@example.com', 'Jane Doe', 'https://example.com/verify')
    expect(mockSendMessage).toHaveBeenCalledWith({
      message: {
        to: { email: 'user@example.com' },
        template: 'test-welcome',
        data: { name: 'Jane Doe', verifyLink: 'https://example.com/verify' },
      },
    })
  })

  it('sends email verified email', async () => {
    const email = await loadEmailModule({ COURIER_TEMPLATE_EMAIL_VERIFIED: 'test-verified' })
    await email.sendEmailVerifiedEmail('user@example.com', 'Jane Doe', 'https://example.com/library')
    expect(mockSendMessage).toHaveBeenCalledWith({
      message: {
        to: { email: 'user@example.com' },
        template: 'test-verified',
        data: { name: 'Jane Doe', libraryLink: 'https://example.com/library' },
      },
    })
  })

  it('sends login notification without optional fields', async () => {
    const email = await loadEmailModule({ COURIER_TEMPLATE_LOGIN_NOTIFICATION: 'test-login' })
    await email.sendLoginNotification('user@example.com', 'Jane Doe')
    expect(mockSendMessage).toHaveBeenCalledWith({
      message: {
        to: { email: 'user@example.com' },
        template: 'test-login',
        data: { name: 'Jane Doe', location: undefined, device: undefined },
      },
    })
  })

  it('sends login notification with location and device', async () => {
    const email = await loadEmailModule({ COURIER_TEMPLATE_LOGIN_NOTIFICATION: 'test-login' })
    await email.sendLoginNotification('user@example.com', 'Jane Doe', 'Lagos, Nigeria', 'Chrome on Mac')
    expect(mockSendMessage).toHaveBeenCalledWith({
      message: {
        to: { email: 'user@example.com' },
        template: 'test-login',
        data: { name: 'Jane Doe', location: 'Lagos, Nigeria', device: 'Chrome on Mac' },
      },
    })
  })

  it('sends security alert', async () => {
    const email = await loadEmailModule({ COURIER_TEMPLATE_SECURITY_ALERT: 'test-alert' })
    await email.sendSecurityAlert('user@example.com', 'Jane Doe', 'password_reset', 'Reset requested from unknown IP')
    expect(mockSendMessage).toHaveBeenCalledWith({
      message: {
        to: { email: 'user@example.com' },
        template: 'test-alert',
        data: { name: 'Jane Doe', alertType: 'password_reset', details: 'Reset requested from unknown IP' },
      },
    })
  })

  it('sends verify new email', async () => {
    const email = await loadEmailModule({ COURIER_TEMPLATE_VERIFY_NEW_EMAIL: 'test-verify' })
    await email.sendVerifyNewEmailEmail('user@example.com', 'Jane Doe', 'https://example.com/verify')
    expect(mockSendMessage).toHaveBeenCalledWith({
      message: {
        to: { email: 'user@example.com' },
        template: 'test-verify',
        data: { name: 'Jane Doe', verifyLink: 'https://example.com/verify' },
      },
    })
  })

  it('sends invitation email', async () => {
    const email = await loadEmailModule({ COURIER_TEMPLATE_INVITATION: 'test-invite' })
    await email.sendInvitationEmail('new@example.com', 'John Doe', 'https://example.com/invite/abc', 'Admin User')
    expect(mockSendMessage).toHaveBeenCalledWith({
      message: {
        to: { email: 'new@example.com' },
        template: 'test-invite',
        data: { name: 'John Doe', inviteLink: 'https://example.com/invite/abc', inviterName: 'Admin User' },
      },
    })
  })

  it('sends admin order notification', async () => {
    const email = await loadEmailModule({ COURIER_TEMPLATE_ADMIN_ORDER: 'test-admin' })
    await email.sendAdminOrderNotification('admin@example.com', 'customer@example.com', 'Customer Name', 'Book Title', '10.00')
    expect(mockSendMessage).toHaveBeenCalledWith({
      message: {
        to: { email: 'admin@example.com' },
        template: 'test-admin',
        data: { bookTitle: 'Book Title', customerName: 'Customer Name', customerEmail: 'customer@example.com', amount: '10.00' },
      },
    })
  })

  it('sends purchase confirmation', async () => {
    const email = await loadEmailModule({ COURIER_TEMPLATE_ORDER_CONFIRMATION: 'test-order' })
    await email.sendPurchaseConfirmation('user@example.com', 'Jane Doe', 'My Book', '25.00')
    expect(mockSendMessage).toHaveBeenCalledWith({
      message: {
        to: { email: 'user@example.com' },
        template: 'test-order',
        data: { name: 'Jane Doe', bookTitle: 'My Book', amount: '25.00' },
      },
    })
  })

  it('sends book released email', async () => {
    const email = await loadEmailModule({ COURIER_TEMPLATE_BOOK_RELEASED: 'test-book' })
    await email.sendBookReleasedEmail('user@example.com', 'Jane Doe', 'My Book', 'https://example.com/library')
    expect(mockSendMessage).toHaveBeenCalledWith({
      message: {
        to: { email: 'user@example.com' },
        template: 'test-book',
        data: { name: 'Jane Doe', bookTitle: 'My Book', libraryLink: 'https://example.com/library' },
      },
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
