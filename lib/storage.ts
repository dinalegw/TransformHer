import 'server-only'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { put, del, get } from '@vercel/blob'

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN
const USE_BLOB = !!BLOB_TOKEN
const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'books')

/* ------------------------------------------------------------------ */
/* Local fallback helpers                                               */
/* ------------------------------------------------------------------ */

import { existsSync, mkdirSync, createReadStream, statSync, unlinkSync, writeFileSync } from 'fs'

function ensureLocalDir(subdir: string): string {
  const dir = join(UPLOAD_DIR, subdir)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

function localSave(bookSlug: string, fileName: string, buffer: Buffer): string {
  const safeSlug = bookSlug
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
  const ext = fileName.split('.').pop()?.toLowerCase() || 'pdf'
  const storedName = `${randomUUID()}.${ext}`
  const dir = ensureLocalDir(safeSlug)
  const filePath = join(dir, storedName)
  require('fs').writeFileSync(filePath, buffer)
  return `/uploads/books/${safeSlug}/${storedName}`
}

function localDelete(relativeUrl: string): void {
  const publicDir = join(process.cwd(), 'public')
  const resolved = join(publicDir, relativeUrl)
  if (!resolved.startsWith(publicDir)) {
    throw new Error('Invalid file path')
  }
  try {
    if (existsSync(resolved)) {
      unlinkSync(resolved)
    }
  } catch {
    // ignore
  }
}

function localStream(relativeUrl: string) {
  const publicDir = join(process.cwd(), 'public')
  const resolved = join(publicDir, relativeUrl)
  if (!resolved.startsWith(publicDir)) return null
  if (!existsSync(resolved)) return null
  return createReadStream(resolved)
}

function localSize(relativeUrl: string): number | null {
  const publicDir = join(process.cwd(), 'public')
  const resolved = join(publicDir, relativeUrl)
  if (!resolved.startsWith(publicDir)) return null
  if (!existsSync(resolved)) return null
  const s = statSync(resolved)
  return s?.size ?? null
}

/* ------------------------------------------------------------------ */
/* MIME types                                                           */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* Public API                                                           */
/* ------------------------------------------------------------------ */

export async function saveBookFile(bookSlug: string, fileName: string, buffer: Buffer): Promise<string> {
  if (USE_BLOB) {
    const safeSlug = bookSlug
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120)
    const ext = fileName.split('.').pop()?.toLowerCase() || 'pdf'
    const pathname = `uploads/books/${safeSlug}/${randomUUID()}.${ext}`

    const blob = await put(pathname, Buffer.from(buffer), {
      access: 'public',
      token: BLOB_TOKEN,
      addRandomSuffix: false,
      contentType: getFileMimeType(fileName),
    })

    return blob.url
  }

  return localSave(bookSlug, fileName, buffer)
}

export async function deleteBookFile(relativeUrl: string): Promise<void> {
  if (USE_BLOB) {
    try {
      await del(relativeUrl, { token: BLOB_TOKEN })
    } catch {
      // ignore
    }
    return
  }

  localDelete(relativeUrl)
}

export async function getFileStream(relativeUrl: string) {
  if (USE_BLOB) {
    try {
      const result = await get(relativeUrl, { access: 'public', token: BLOB_TOKEN })
      if (!result || result.statusCode !== 200) return null
      return result.stream
    } catch {
      return null
    }
  }

  return localStream(relativeUrl)
}

export async function getFileSize(relativeUrl: string): Promise<number | null> {
  if (USE_BLOB) {
    try {
      const result = await get(relativeUrl, { access: 'public', token: BLOB_TOKEN })
      if (!result || result.statusCode !== 200) return null
      return result.blob.size ?? null
    } catch {
      return null
    }
  }

  return Promise.resolve(localSize(relativeUrl))
}

export function getFileMimeTypeFromStorage(fileName: string): string {
  return getFileMimeType(fileName)
}
