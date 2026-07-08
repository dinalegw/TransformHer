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

  describe('sendPasswordResetEmail', () => {
    it('sends with correct template and data', async () => {
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

    it('throws EmailSendError when Courier fails', async () => {
      const email = await loadEmailModule({ COURIER_TEMPLATE_PASSWORD_RESET: 'test-reset' })
      mockSendMessage.mockRejectedValue(new Error('Courier error'))

      await expect(email.sendPasswordResetEmail('user@example.com', 'https://example.com/reset'))
        .rejects
        .toThrow(email.EmailSendError)
    })

    it('throws EmailSendError when env var is missing', async () => {
      const email = await loadEmailModule()

      await expect(email.sendPasswordResetEmail('user@example.com', 'https://example.com/reset'))
        .rejects
        .toThrow(email.EmailSendError)
    })
  })

  describe('sendPasswordChangedEmail', () => {
    it('sends with correct template and data', async () => {
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
  })

  describe('sendPasswordResetConfirmationEmail', () => {
    it('sends with correct template and data', async () => {
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
  })

  describe('sendWelcomeVerificationEmail', () => {
    it('sends with correct template and data', async () => {
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
  })

  describe('sendEmailVerifiedEmail', () => {
    it('sends with correct template and data', async () => {
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
  })

  describe('sendLoginNotification', () => {
    it('sends without optional location and device', async () => {
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

    it('sends with location and device', async () => {
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
  })

  describe('sendSecurityAlert', () => {
    it('sends with correct template and data', async () => {
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
  })

  describe('sendVerifyNewEmailEmail', () => {
    it('sends with correct template and data', async () => {
      const email = await loadEmailModule({ COURIER_TEMPLATE_VERIFY_NEW_EMAIL: 'test-verify-new' })

      await email.sendVerifyNewEmailEmail('user@example.com', 'Jane Doe', 'https://example.com/verify-new')

      expect(mockSendMessage).toHaveBeenCalledWith({
        message: {
          to: { email: 'user@example.com' },
          template: 'test-verify-new',
          data: { name: 'Jane Doe', verifyLink: 'https://example.com/verify-new' },
        },
      })
    })
  })

  describe('sendInvitationEmail', () => {
    it('sends with correct template and data', async () => {
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
  })

  describe('sendAdminOrderNotification', () => {
    it('sends to admin email with correct data', async () => {
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
  })

  describe('sendPurchaseConfirmation', () => {
    it('sends with correct template and data', async () => {
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
  })

  describe('sendBookReleasedEmail', () => {
    it('sends with correct template and data', async () => {
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
  })

  describe('EmailSendError', () => {
    it('preserves the cause', async () => {
      const email = await loadEmailModule({ COURIER_TEMPLATE_PASSWORD_RESET: 'test-reset' })
      mockSendMessage.mockRejectedValue(new Error('original'))

      try {
        await email.sendPasswordResetEmail('user@example.com', 'https://example.com/reset')
      } catch (error) {
        expect(error).toBeInstanceOf(email.EmailSendError)
        expect((error as unknown as Record<string, unknown>).cause).toBeInstanceOf(Error)
        expect((error as Error).message).toContain('password reset email')
      }
    })
  })
})
