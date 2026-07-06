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
