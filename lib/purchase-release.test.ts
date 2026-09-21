import { describe, expect, it } from 'vitest'
import { getInitialPurchaseReleaseState } from '@/lib/purchase-release'

describe('getInitialPurchaseReleaseState', () => {
  it('releases a verified digital purchase immediately', () => {
    const now = new Date('2026-09-21T12:00:00.000Z')
    const state = getInitialPurchaseReleaseState(now)

    expect(state.released).toBe(true)
    expect(state.releaseAt).toEqual(now)
  })
})
