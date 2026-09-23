import 'server-only'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { put, del, get, list } from '@vercel/blob'
import { existsSync, mkdirSync, createReadStream, statSync, unlinkSync, writeFileSync } from 'fs'

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN
const BLOB_OIDC_TOKEN = process.env.VERCEL_OIDC_TOKEN
const USE_BLOB = Boolean(BLOB_TOKEN || BLOB_OIDC_TOKEN)
const IS_VERCEL = Boolean(process.env.VERCEL)

export function isPersistentBookStorageConfigured(): boolean {
  return USE_BLOB
}

export async function canAccessPersistentBookStorage(): Promise<boolean> {
  if (!IS_VERCEL) return true

  try {
    await list({
      limit: 1,
      ...(BLOB_TOKEN ? { token: BLOB_TOKEN } : {}),
    })
    return true
  } catch (error) {
    console.warn('[storage] private Blob readiness probe failed', error)
    return false
  }
}
const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'books')

function sanitizeSlug(bookSlug: string): string {
  return bookSlug
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
}

function ensureLocalDir(subdir: string): string {
  const dir = join(UPLOAD_DIR, subdir)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function localSave(bookSlug: string, fileName: string, buffer: Buffer): string {
  const safeSlug = sanitizeSlug(bookSlug)
  const ext = fileName.split('.').pop()?.toLowerCase() || 'pdf'
  const storedName = `${randomUUID()}.${ext}`
  const dir = ensureLocalDir(safeSlug)
  const filePath = join(dir, storedName)
  writeFileSync(filePath, buffer)
  return `/uploads/books/${safeSlug}/${storedName}`
}

function resolveLocal(relativeUrl: string): string | null {
  const publicDir = join(process.cwd(), 'public')
  const resolved = join(publicDir, relativeUrl)
  return resolved.startsWith(publicDir) ? resolved : null
}

function localDelete(relativeUrl: string): void {
  const resolved = resolveLocal(relativeUrl)
  if (!resolved) throw new Error('Invalid file path')
  try {
    if (existsSync(resolved)) unlinkSync(resolved)
  } catch {
    // Deleting an already-missing local development file is harmless.
  }
}

function localStream(relativeUrl: string) {
  const resolved = resolveLocal(relativeUrl)
  if (!resolved || !existsSync(resolved)) return null
  return createReadStream(resolved)
}

function localSize(relativeUrl: string): number | null {
  const resolved = resolveLocal(relativeUrl)
  if (!resolved || !existsSync(resolved)) return null
  return statSync(resolved)?.size ?? null
}

function getFileMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase()
  const mimes: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    epub: 'application/epub+zip',
    mobi: 'application/x-mobipocket-ebook',
    txt: 'text/plain',
  }
  return mimes[ext || 'pdf'] || 'application/octet-stream'
}

export async function saveBookFile(bookSlug: string, fileName: string, buffer: Buffer): Promise<string> {
  if (USE_BLOB) {
    const safeSlug = sanitizeSlug(bookSlug)
    const ext = fileName.split('.').pop()?.toLowerCase() || 'pdf'
    const pathname = `uploads/books/${safeSlug}/${randomUUID()}.${ext}`

    const blob = await put(pathname, Buffer.from(buffer), {
      access: 'private',
      ...(BLOB_TOKEN ? { token: BLOB_TOKEN } : {}),
      addRandomSuffix: false,
      contentType: getFileMimeType(fileName),
    })

    // Store the opaque pathname, not a directly shareable public URL. The
    // authenticated read route retrieves the private object and streams it.
    return blob.pathname
  }

  if (IS_VERCEL) {
    throw new Error('Persistent book storage is not configured')
  }

  return localSave(bookSlug, fileName, buffer)
}

export async function deleteBookFile(storageKey: string): Promise<void> {
  if (USE_BLOB) {
    try {
      await del(storageKey, BLOB_TOKEN ? { token: BLOB_TOKEN } : undefined)
    } catch {
      // Best-effort cleanup. Database changes must not leak provider internals.
    }
    return
  }
  localDelete(storageKey)
}

export async function getFileStream(storageKey: string) {
  if (USE_BLOB) {
    try {
      const result = await get(storageKey, {
        access: 'private',
        ...(BLOB_TOKEN ? { token: BLOB_TOKEN } : {}),
      })
      if (!result || result.statusCode !== 200) return null
      return result.stream
    } catch {
      return null
    }
  }
  return localStream(storageKey)
}

export async function getFileSize(storageKey: string): Promise<number | null> {
  if (USE_BLOB) {
    try {
      const result = await get(storageKey, {
        access: 'private',
        ...(BLOB_TOKEN ? { token: BLOB_TOKEN } : {}),
      })
      if (!result || result.statusCode !== 200) return null
      return result.blob.size ?? null
    } catch {
      return null
    }
  }
  return Promise.resolve(localSize(storageKey))
}

export function getFileMimeTypeFromStorage(fileName: string): string {
  return getFileMimeType(fileName)
}
