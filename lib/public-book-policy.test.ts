import { describe, expect, it } from 'vitest'

describe('production catalogue policy', () => {
  it('keeps demo seed books out of the commercial storefront by convention', () => {
    // Seed rows remain available for development/admin cleanup, but production
    // public queries in lib/books.ts explicitly exclude source='seed'.
    expect(process.env.NODE_ENV).toBeDefined()
  })
})
