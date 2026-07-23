import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { saveBookFile } from '@/lib/storage'

const MAX_FILE_SIZE = 50 * 1024 * 1024
const ALLOWED_EXT = ['pdf', 'doc', 'docx', 'epub', 'txt']

function hasAllowedSignature(buffer: Buffer, ext: string): boolean {
  if (buffer.length === 0) return false
  switch (ext) {
    case 'pdf':
      return buffer.subarray(0, 5).toString('latin1') === '%PDF-'
    case 'epub':
    case 'docx':
      // EPUB and DOCX are ZIP containers.
      return buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04
    case 'doc':
      // OLE compound file signature.
      return (
        buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0
      )
    case 'txt':
      // Plain text: accept printable ASCII / UTF-8 without NUL bytes.
      return !buffer.subarray(0, 512).includes(0)
    default:
      return false
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const slug = formData.get('slug') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    if (!slug) {
      return NextResponse.json({ error: 'Book slug is required' }, { status: 400 })
    }
    if (file.size === 0) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 })
    }
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
    const message = err instanceof Error ? err.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
