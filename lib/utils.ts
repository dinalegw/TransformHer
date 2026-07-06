import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getDisplayName(user: {
  name: string
  username?: string | null
  showFullName?: boolean | null
}): string {
  if (user.showFullName || !user.username) return user.name
  return user.username
}

export function getBaseUrl(): string {
  const vercelUrl = process.env.VERCEL_URL
  if (vercelUrl) return `https://${vercelUrl}`
  return process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
}
