'use client'

import { useState, useCallback, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit, Trash2, X, Upload, Archive, ArchiveRestore, Loader2 } from 'lucide-react'
import { formatPrice } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const ADMIN_CATEGORIES = [
  'Mindset & Confidence',
  'Career & Wealth',
  'Wellness & Self-Care',
  'Relationships',
  'Spirituality & Purpose',
  'Leadership',
] as const

interface MergedBook {
  id: number | string
  slug: string
  title: string
  author: string
  category: string
  price: string
  currency: string
  coverImage: string
  fileUrl: string | null
  tagline: string
  description: string
  rating: string
  reviewsCount: number
  pages: number
  featured: boolean
  bestseller: boolean
  archived: boolean
  createdAt: Date | string
  source: 'seed' | 'admin'
}

interface AdminBookManagerProps {
  books: MergedBook[]
  userRole: string
  userEmail: string
  userName: string
}

type FormMode = 'create' | 'edit'

interface FormData {
  title: string
  author: string
  category: string
  price: string
  currency: string
  coverImage: string
  fileUrl: string | null
  tagline: string
  description: string
  rating: string
  reviewsCount: number
  pages: number
  featured: boolean
  bestseller: boolean
  slug: string
}

const emptyForm: FormData = {
  title: '',
  author: '',
  category: 'Mindset & Confidence',
  price: '',
  currency: 'NGN',
  coverImage: '',
  fileUrl: null,
  tagline: '',
  description: '',
  rating: '5.0',
  reviewsCount: 0,
  pages: 0,
  featured: false,
  bestseller: false,
  slug: '',
}

export function AdminBookManager({ books, userRole, userEmail, userName }: AdminBookManagerProps) {
  const router = useRouter()
  const [modal, setModal] = useState<{ mode: FormMode; book?: MergedBook } | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<string | null>(null)

  const isMaster = userRole === 'master_admin'
  const needsPending = userRole === 'admin'

  const openCreate = useCallback(() => {
    setForm(emptyForm)
    setUploadedFile(null)
    setModal({ mode: 'create' })
    setError('')
  }, [])

  const openEdit = useCallback((book: MergedBook) => {
    setForm({
      title: book.title,
      author: book.author,
      category: book.category,
      price: book.price,
      currency: book.currency,
      coverImage: book.coverImage,
      fileUrl: book.fileUrl,
      tagline: book.tagline ?? '',
      description: book.description ?? '',
      rating: book.rating ?? '5.0',
      reviewsCount: book.reviewsCount ?? 0,
      pages: book.pages ?? 0,
      featured: book.featured ?? false,
      bestseller: book.bestseller ?? false,
      slug: book.slug,
    })
    setUploadedFile(book.fileUrl || null)
    setModal({ mode: 'edit', book })
    setError('')
  }, [])

  const closeModal = useCallback(() => {
    setModal(null)
    setUploadedFile(null)
    setError('')
  }, [])

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')

    try {
      const slug = form.slug
      if (!slug) {
        throw new Error('Please set a slug first')
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('slug', slug)

      const res = await fetch('/api/admin/books/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')

      setUploadedFile(data.fileUrl)
      setForm((prev) => ({ ...prev, fileUrl: data.fileUrl }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }, [form.slug])

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const isSeedEdit = modal?.mode === 'edit' && modal?.book?.source === 'seed'

    let url: string
    let method: string

    if (isSeedEdit || modal?.mode === 'create') {
      url = '/api/admin/books'
      method = 'POST'
    } else {
      url = `/api/admin/books/${(modal?.book as { id: string })?.id}`
      method = 'PUT'
    }

    const payload = { ...form }

    try {
      // If sub-admin and not master, submit as pending change
      if (needsPending && method === 'POST' && modal?.mode === 'create') {
        const res = await fetch('/api/admin/books', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Something went wrong')
      } else {
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Something went wrong')
      }

      closeModal()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }, [modal, form, closeModal, router, needsPending])

  const handleDelete = useCallback(async (book: MergedBook) => {
    if (!isMaster) {
      setError('Only master admin can delete books')
      return
    }
    if (!confirm(`Delete "${book.title}"? This removes it from the store but NOT from owners' libraries.`)) return

    setDeleting(String(book.id))
    setError('')

    try {
      const params = new URLSearchParams()
      params.set('source', book.source)
      if (book.source === 'seed') params.set('slug', book.slug)

      const res = await fetch(`/api/admin/books/${book.id}?${params.toString()}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setDeleting(null)
    }
  }, [router, isMaster])

  const handleArchive = useCallback(async (book: MergedBook, archived: boolean) => {
    setError('')
    try {
      const res = await fetch('/api/admin/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: book.slug,
          archived,
          title: book.title,
          author: book.author,
          category: book.category,
          price: book.price,
          currency: book.currency,
          coverImage: book.coverImage,
          tagline: book.tagline,
          description: book.description,
          rating: book.rating,
          reviewsCount: book.reviewsCount,
          pages: book.pages,
          featured: book.featured,
          bestseller: book.bestseller,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Operation failed')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }, [router])

  const updateField = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  return (
    <>
      {error && (
        <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {books.length} book{books.length !== 1 ? 's' : ''}
          {!isMaster && <span className="ml-2 text-xs text-amber-600">(sub-admin — some actions restricted)</span>}
        </p>
        <Button onClick={openCreate} size="sm">
          <Plus className="size-4" />
          Add Book
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Author</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">File</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {books.map((book) => (
              <tr key={`${book.source}-${book.id}`} className="transition-colors hover:bg-muted/50">
                <td className="max-w-40 truncate px-4 py-3 font-medium text-foreground">
                  {book.title}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{book.author}</td>
                <td className="px-4 py-3 text-muted-foreground">{book.category}</td>
                <td className="px-4 py-3 text-foreground">
                  {formatPrice(book.price, book.currency)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider ${
                      book.source === 'seed'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                    }`}
                  >
                    {book.source === 'seed' ? 'Seed' : 'Custom'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {book.archived ? (
                    <span className="text-xs text-amber-600">Archived</span>
                  ) : (
                    <span className="text-xs text-green-600">Active</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {book.fileUrl ? (
                    <span className="text-xs text-green-600">Uploaded</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">None</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => openEdit(book)}
                      aria-label={`Edit ${book.title}`}
                    >
                      <Edit className="size-3.5" />
                    </Button>
                    {isMaster && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleArchive(book, !book.archived)}
                          aria-label={book.archived ? 'Unarchive' : 'Archive'}
                        >
                          {book.archived ? (
                            <ArchiveRestore className="size-3.5 text-amber-600" />
                          ) : (
                            <Archive className="size-3.5 text-muted-foreground" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleDelete(book)}
                          disabled={deleting === String(book.id)}
                          aria-label={`Delete ${book.title}`}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-background p-6 shadow-xl ring-1 ring-border">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-heading text-lg text-foreground">
                {modal.mode === 'create' ? 'Add Book' : 'Edit Book'}
              </h2>
              <Button variant="ghost" size="icon-xs" onClick={closeModal} aria-label="Close">
                <X className="size-4" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="title" className="mb-1 block text-xs font-medium text-muted-foreground">
                  Title *
                </label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="author" className="mb-1 block text-xs font-medium text-muted-foreground">
                  Author *
                </label>
                <Input
                  id="author"
                  value={form.author}
                  onChange={(e) => updateField('author', e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="slug" className="mb-1 block text-xs font-medium text-muted-foreground">
                  Slug
                </label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => updateField('slug', e.target.value)}
                  placeholder="Auto-generated from title"
                />
              </div>

              <div>
                <label htmlFor="category" className="mb-1 block text-xs font-medium text-muted-foreground">
                  Category *
                </label>
                <select
                  id="category"
                  value={form.category}
                  onChange={(e) => updateField('category', e.target.value)}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  required
                >
                  {ADMIN_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="price" className="mb-1 block text-xs font-medium text-muted-foreground">
                    Price (kobo) *
                  </label>
                  <Input
                    id="price"
                    type="number"
                    value={form.price}
                    onChange={(e) => updateField('price', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="currency" className="mb-1 block text-xs font-medium text-muted-foreground">
                    Currency
                  </label>
                  <Input
                    id="currency"
                    value={form.currency}
                    onChange={(e) => updateField('currency', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="coverImage" className="mb-1 block text-xs font-medium text-muted-foreground">
                  Cover Image URL *
                </label>
                <Input
                  id="coverImage"
                  value={form.coverImage}
                  onChange={(e) => updateField('coverImage', e.target.value)}
                  placeholder="/books/example.png"
                  required
                />
              </div>

              {/* File Upload */}
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Book File (PDF, DOC, DOCX, EPUB, TXT — max 50MB)
                </label>
                <div className="flex items-center gap-2">
                  <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-input bg-transparent px-3 py-1.5 text-sm transition-colors hover:bg-muted">
                    <Upload className="size-4" />
                    {uploading ? 'Uploading...' : 'Choose File'}
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.epub,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/epub+zip,text/plain"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploading || !form.slug}
                    />
                  </label>
                  {uploading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                </div>
                {uploadedFile && (
                  <p className="mt-1 text-xs text-green-600">
                    File uploaded: {uploadedFile.split('/').pop()}
                  </p>
                )}
                {!form.slug && (
                  <p className="mt-1 text-xs text-amber-600">
                    Set a slug before uploading a file
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="tagline" className="mb-1 block text-xs font-medium text-muted-foreground">
                  Tagline
                </label>
                <Input
                  id="tagline"
                  value={form.tagline}
                  onChange={(e) => updateField('tagline', e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="description" className="mb-1 block text-xs font-medium text-muted-foreground">
                  Description
                </label>
                <textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label htmlFor="rating" className="mb-1 block text-xs font-medium text-muted-foreground">
                    Rating
                  </label>
                  <Input
                    id="rating"
                    value={form.rating}
                    onChange={(e) => updateField('rating', e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="reviewsCount" className="mb-1 block text-xs font-medium text-muted-foreground">
                    Reviews
                  </label>
                  <Input
                    id="reviewsCount"
                    type="number"
                    value={form.reviewsCount}
                    onChange={(e) => updateField('reviewsCount', Number(e.target.value))}
                  />
                </div>
                <div>
                  <label htmlFor="pages" className="mb-1 block text-xs font-medium text-muted-foreground">
                    Pages
                  </label>
                  <Input
                    id="pages"
                    type="number"
                    value={form.pages}
                    onChange={(e) => updateField('pages', Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => updateField('featured', e.target.checked)}
                    className="size-4 rounded border-border accent-primary"
                  />
                  Featured
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.bestseller}
                    onChange={(e) => updateField('bestseller', e.target.checked)}
                    className="size-4 rounded border-border accent-primary"
                  />
                  Bestseller
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={closeModal}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={saving}>
                  {saving
                    ? 'Saving...'
                    : needsPending && modal?.mode === 'create'
                      ? 'Submit for Approval'
                      : modal?.mode === 'create'
                        ? 'Create Book'
                        : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
