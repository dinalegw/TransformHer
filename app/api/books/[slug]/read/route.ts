import { NextResponse } from 'next/server'
import { Readable } from 'node:stream'
import { getCurrentUser } from '@/lib/auth'
import { canReadBookBySlug } from '@/lib/library'
import { findAdminBookBySlug } from '@/lib/admin-books'
import { getFileStream, getFileSize, getFileMimeTypeFromStorage } from '@/lib/storage'
import { SEED_BOOKS } from '@/lib/seed'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { slug } = await params
    const canRead = await canReadBookBySlug(user.id, slug, user.role === 'master_admin')
    if (!canRead) {
      return NextResponse.json(
        { error: 'This book is not available to read yet.' },
        { status: 403 },
      )
    }

    const adminBook = await findAdminBookBySlug(slug)
    const seedBook = SEED_BOOKS.find((book) => book.slug === slug)
    const book = adminBook || seedBook
    if (!book) return NextResponse.json({ error: 'Book not found' }, { status: 404 })

    const fileUrl = adminBook?.fileUrl
    if (!fileUrl) {
      return NextResponse.json({ error: 'No content file available for this book' }, { status: 404 })
    }

    const stream = await getFileStream(fileUrl)
    if (!stream) {
      return NextResponse.json({ error: 'Content file is temporarily unavailable' }, { status: 404 })
    }

    const fileName = fileUrl.split('/').pop() || 'book.pdf'
    const mimeType = getFileMimeTypeFromStorage(fileName)
    const headers = new Headers()
    headers.set('Content-Type', mimeType)
    headers.set('Content-Disposition', `inline; filename="${fileName}"`)
    headers.set('Cache-Control', 'private, no-store')
    headers.set('X-Content-Type-Options', 'nosniff')

    const size = await getFileSize(fileUrl)
    if (size) headers.set('Content-Length', String(size))

    // Vercel Blob returns a Web ReadableStream; local development uses Node Readable.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cross-runtime stream conversion
    const readable: ReadableStream<any> = stream instanceof ReadableStream
      ? stream
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cross-runtime stream conversion
      : (Readable as any).toWeb(stream as any)

    return new Response(readable, { headers, status: 200 })
  } catch (err) {
    console.error('Read error:', err)
    return NextResponse.json({ error: 'Unable to open this book right now.' }, { status: 500 })
  }
}
