import { afterEach, describe, expect, it } from 'vitest'
import { getBaseUrl } from './utils'

const originalEnv = { ...process.env }

afterEach(() => {
  process.env = { ...originalEnv }
})

describe('getBaseUrl', () => {
  it('never uses an immutable Vercel deployment URL for production customer links', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      VERCEL_ENV: 'production',
      VERCEL_URL: 'transformher-randomhash-dinalegws-projects.vercel.app',
      VERCEL_PROJECT_PRODUCTION_URL: '',
      TRANSFORMHER_PUBLIC_URL: '',
      NEXT_PUBLIC_BASE_URL: '',
    }

    expect(getBaseUrl()).toBe('https://transformher.vercel.app')
  })

  it('uses Vercel project production URL when available', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      VERCEL_ENV: 'production',
      VERCEL_PROJECT_PRODUCTION_URL: 'transformher.vercel.app',
      TRANSFORMHER_PUBLIC_URL: '',
    }

    expect(getBaseUrl()).toBe('https://transformher.vercel.app')
  })

  it('allows an explicit canonical custom domain override', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      VERCEL_ENV: 'production',
      TRANSFORMHER_PUBLIC_URL: 'https://www.example.com/',
    }

    expect(getBaseUrl()).toBe('https://www.example.com')
  })
})
