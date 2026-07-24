import { beforeEach, describe, expect, it, vi } from 'vitest'

const fetchMock = vi.fn()

vi.stubGlobal('fetch', fetchMock)

describe('lib/paystack', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    delete process.env.PAYSTACK_SECRET_KEY
  })

  it('throws a clear error when PAYSTACK_SECRET_KEY is not configured', async () => {
    const paystack = await import('./paystack')

    await expect(
      paystack.initializePaystackPayment({
        email: 'user@example.com',
        amount: 25,
        reference: 'ref-123',
      })
    ).rejects.toThrow(/PAYSTACK_SECRET_KEY/)

    expect(fetchMock).not.toHaveBeenCalled()
  })
})
