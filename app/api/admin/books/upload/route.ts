import { NextResponse } from 'next/server'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { requireAdmin } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { checkRateLimit } from '@/lib/rate-limit'
import { isSameOriginRequest } from '@/lib/request-security'
import { canAccessPersistentBookStorage } from '@/lib/storage'

const ALLOWED_CONTENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/epub+zip',
  'application/zip',
  'text/plain',
]

const PATHNAME_RE =
  /^uploads\/books\/[a-z0-9]+(?:-[a-z0-9]+)*\/[A-Za-z0-9._-]+\.(pdf|doc|docx|epub|txt)$/i

export async function POST(req: Request) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
  }

  if (!(await canAccessPersistentBookStorage())) {
    return NextResponse.json(
      {
        error:
          'Private book storage is not connected yet. Connect a private Vercel Blob store to enable device uploads.',
      },
      { status: 503 },
    )
  }

  let body: HandleUploadBody
  try {
    body = (await req.json()) as HandleUploadBody
  } catch {
    return NextResponse.json({ error: 'Invalid upload request' }, { status: 400 })
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        const rate = await checkRateLimit(req, '/api/admin/books/upload')
        if (!rate.allowed) {
          throw new Error('Too many uploads. Please wait and try again.')
        }

        const user = await requireAdmin()
        if (
          user.role !== 'master_admin'
          && !hasPermission(user.permissions, 'create_books')
          && !hasPermission(user.permissions, 'edit_books')
        ) {
          throw new Error('Forbidden: book upload permission is required')
        }

        if (!PATHNAME_RE.test(pathname)) {
          throw new Error('Invalid book upload path or file type')
        }

        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({
            userId: user.id,
            bookUpload: true,
          }),
        }
      },
      onUploadCompleted: async ({ blob }) => {
        if (!PATHNAME_RE.test(blob.pathname)) {
          throw new Error('Unexpected completed book upload path')
        }
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (err) {
    console.error('Upload token/completion error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unable to upload this book right now.' },
      { status: 400 },
    )
  }
}
