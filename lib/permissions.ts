export type UserRole = 'user' | 'admin' | 'master_admin'
export type AdminRank = 'junior' | 'senior' | 'lead' | 'master'

export interface RoleInfo {
  role: UserRole
  rank?: AdminRank
  title?: string
}

export const MASTER_ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'danieloinalegwu@gmail.com'

export function getRolePriority(role: UserRole): number {
  const map: Record<UserRole, number> = { user: 0, admin: 1, master_admin: 2 }
  return map[role]
}

export function canManageBooks(role: UserRole): boolean {
  return role === 'admin' || role === 'master_admin'
}

export function canManageAdmins(role: UserRole): boolean {
  return role === 'master_admin'
}

export function canApproveChanges(role: UserRole): boolean {
  return role === 'master_admin'
}

export function canArchiveBooks(role: UserRole): boolean {
  return role === 'master_admin'
}

export function canDeleteBooks(role: UserRole): boolean {
  return role === 'master_admin'
}

export function needsApproval(role: UserRole): boolean {
  return role === 'admin'
}

export function getDefaultRank(role: UserRole): AdminRank | undefined {
  if (role === 'master_admin') return 'master'
  if (role === 'admin') return 'junior'
  return undefined
}
