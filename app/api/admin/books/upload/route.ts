import { NextResponse } from 'next/server'
import { requireAdmin, getCurrentUser } from '@/lib/auth'
import { saveBookFile } from '@/lib/storage'
import { findAdminBookBySlug } from '@/lib/admin-books'

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const slug = formData.get('slug') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    if (!slug) {
      return NextResponse.json({ error: 'Book slug is required' }, { status: 400 })
    }

    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/epub+zip', 'text/plain']
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.pdf') && !file.name.endsWith('.doc') && !file.name.endsWith('.docx') && !file.name.endsWith('.epub') && !file.name.endsWith('.txt')) {
      return NextResponse.json({ error: 'Invalid file type. Allowed: PDF, DOC, DOCX, EPUB, TXT' }, { status: 400 })
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum size is 50MB' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const fileUrl = saveBookFile(slug, file.name, buffer)

    return NextResponse.json({ fileUrl, fileName: file.name })
  } catch (err) {
    console.error('Upload error:', err)
    const message = err instanceof Error ? err.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
