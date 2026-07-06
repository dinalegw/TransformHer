'use client'

import { useState, useRef, useEffect } from 'react'
import { Moon, Sun, Bed } from 'lucide-react'
import { useTheme, type Theme } from '@/components/theme-provider'

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'night-shift', label: 'Night Shift', icon: Bed },
]

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const current = OPTIONS.find(o => o.value === theme) ?? OPTIONS[0]
  const Icon = current.icon

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
        aria-label="Select theme"
      >
        <Icon className="size-3.5" />
        <span className="hidden sm:inline">{current.label}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1.5 w-40 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
            {OPTIONS.map(opt => {
              const OptIcon = opt.icon
              const active = opt.value === theme
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setTheme(opt.value); setOpen(false) }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors ${
                    active
                      ? 'bg-primary/10 text-foreground'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  <OptIcon className="size-4" />
                  {opt.label}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
