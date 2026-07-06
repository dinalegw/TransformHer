'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'

export type Theme = 'light' | 'dark' | 'night-shift'

interface ThemeContextType {
  theme: Theme
  setTheme: (t: Theme) => void
  resolvedTheme: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  setTheme: () => {},
  resolvedTheme: 'light',
})

const STORAGE_KEY = 'transformher-theme'

function getStoredTheme(): Theme | null {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    if (s === 'light' || s === 'dark' || s === 'night-shift') return s
  } catch {}
  return null
}

function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(t: Theme) {
  const root = document.documentElement
  root.classList.remove('light', 'dark', 'night-shift')
  root.classList.add(t)

  const meta = document.querySelector('meta[name="color-scheme"]')
  if (meta) meta.setAttribute('content', t === 'light' ? 'light' : 'dark')

  const themeMeta = document.querySelector('meta[name="theme-color"]')
  if (themeMeta) {
    const map = { light: '#f6f2e9', dark: '#2a2a35', 'night-shift': '#221d14' } as const
    themeMeta.setAttribute('content', map[t])
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const stored = getStoredTheme()
    const t = stored ?? (getSystemTheme() as Theme)
    setThemeState(t)
    applyTheme(t)
    setReady(true)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      if (!getStoredTheme()) {
        const sys = mq.matches ? 'dark' : 'light'
        applyTheme(sys)
        setThemeState(sys)
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    applyTheme(t)
    try { localStorage.setItem(STORAGE_KEY, t) } catch {}
  }, [])

  const resolvedTheme: 'light' | 'dark' = theme === 'light' ? 'light' : 'dark'

  if (!ready) return null

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
