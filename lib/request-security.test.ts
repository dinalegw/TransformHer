import { describe, expect, it } from 'vitest'
import { isSameOriginRequest } from './request-security'

describe('isSameOriginRequest', () => {
  it('accepts a same-origin browser mutation', () => {
    const request = new Request('https://transformher.vercel.app/api/cart', {
      method: 'POST',
      headers: { origin: 'https://transformher.vercel.app' },
    })
    expect(isSameOriginRequest(request)).toBe(true)
  })

  it('rejects an explicit cross-origin browser mutation', () => {
    const request = new Request('https://transformher.vercel.app/api/cart', {
      method: 'POST',
      headers: { origin: 'https://attacker.example' },
    })
    expect(isSameOriginRequest(request)).toBe(false)
  })

  it('rejects cross-site fetch metadata even when Origin is unavailable', () => {
    const request = new Request('https://transformher.vercel.app/api/cart', {
      method: 'POST',
      headers: { 'sec-fetch-site': 'cross-site' },
    })
    expect(isSameOriginRequest(request)).toBe(false)
  })

  it('permits non-browser clients that omit browser origin metadata', () => {
    const request = new Request('https://transformher.vercel.app/api/cart', {
      method: 'POST',
    })
    expect(isSameOriginRequest(request)).toBe(true)
  })
})
