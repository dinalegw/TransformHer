import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { saveBookFile } from '@/lib/storage'
import { checkRateLimit } from '@/lib/rate-limit'
import { isSameOriginRequest } from '@/lib/request-security'

const MAX_FILE_SIZE = 50 * 1024 * 1024
const ALLOWED_EXT = ['pdf', 'doc', 'docx', 'epub', 'txt']

function hasAllowedSignature(buffer: Buffer, ext: string): boolean {
  if (buffer.length === 0) return false
  switch (ext) {
    case 'pdf':
      return buffer.subarray(0, 5).toString('latin1') === '%PDF-'
    case 'epub':
    case 'docx':
      return buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04
    case 'doc':
      return buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0
    case 'txt':
      return !buffer.subarray(0, 512).includes(0)
    default:
      return false
  }
}

export async function POST(req: Request) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
  }

  const rate = await checkRateLimit(req, '/api/admin/books/upload')
  if (!rate.allowed) {
    const retryAfter = rate.retryAfter ?? 60
    return NextResponse.json(
      { error: 'Too many uploads. Please wait and try again.', retryAfter },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    )
  }

  try {
    const user = await requireAdmin()
    if (
      user.role !== 'master_admin'
      && !hasPermission(user.permissions, 'create_books')
      && !hasPermission(user.permissions, 'edit_books')
    ) {
      return NextResponse.json({ error: 'Forbidden: book upload permission is required' }, { status: 403 })
    }
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (process.env.VERCEL && !process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: 'Book storage is not configured. Connect persistent private Blob storage before uploading books.' },
      { status: 503 },
    )
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file')
    const rawSlug = formData.get('slug')

    if (!(file instanceof File)) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const slug = typeof rawSlug === 'string' ? rawSlug.trim() : ''
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 120) {
      return NextResponse.json({ error: 'A valid book slug is required' }, { status: 400 })
    }
    if (file.size === 0) return NextResponse.json({ error: 'File is empty' }, { status: 400 })
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 50MB' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!ALLOWED_EXT.includes(ext)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: PDF, DOC, DOCX, EPUB, TXT' },
        { status: 400 },
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    if (!hasAllowedSignature(buffer, ext)) {
      return NextResponse.json({ error: 'File content does not match its type' }, { status: 400 })
    }

    const fileUrl = await saveBookFile(slug, file.name, buffer)
    return NextResponse.json({ fileUrl, fileName: file.name })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Unable to upload this book right now.' }, { status: 500 })
  }
}
