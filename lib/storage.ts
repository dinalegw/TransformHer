import 'server-only'
import { writeFileSync, existsSync, mkdirSync, createReadStream, statSync, unlinkSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'books')

function ensureDir(subdir: string): string {
  const dir = join(UPLOAD_DIR, subdir)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

export function saveBookFile(bookSlug: string, fileName: string, buffer: Buffer): string {
  const safeSlug = bookSlug
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
  const ext = fileName.split('.').pop()?.toLowerCase() || 'pdf'
  const storedName = `${randomUUID()}.${ext}`
  const dir = ensureDir(safeSlug)
  const filePath = join(dir, storedName)
  writeFileSync(filePath, buffer)
  return `/uploads/books/${safeSlug}/${storedName}`
}

export function getBookFilePath(relativeUrl: string): string {
  return join(process.cwd(), 'public', relativeUrl)
}

export function deleteBookFile(relativeUrl: string): void {
  const filePath = getBookFilePath(relativeUrl)
  try {
    if (existsSync(filePath)) {
      unlinkSync(filePath)
    }
  } catch {
    // file couldn't be removed, ignore
  }
}

export function getFileStream(relativeUrl: string) {
  const filePath = getBookFilePath(relativeUrl)
  if (!existsSync(filePath)) return null
  return createReadStream(filePath)
}

export function getFileSize(relativeUrl: string): number | null {
  const filePath = getBookFilePath(relativeUrl)
  if (!existsSync(filePath)) return null
  const s = statSync(filePath)
  return s?.size ?? null
}

export function getFileMimeType(fileName: string): string {
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
