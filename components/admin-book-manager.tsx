'use client'

import { useState, useCallback, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit, Trash2, X } from 'lucide-react'
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
  tagline: string
  description: string
  rating: string
  reviewsCount: number
  pages: number
  featured: boolean
  bestseller: boolean
  createdAt: Date | string
  source: 'seed' | 'admin'
}

interface AdminBook extends MergedBook {
  id: string
  source: 'admin'
}

interface AdminBookManagerProps {
  books: MergedBook[]
}

type FormMode = 'create' | 'edit'

interface FormData {
  title: string
  author: string
  category: string
  price: string
  currency: string
  coverImage: string
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
  tagline: '',
  description: '',
  rating: '5.0',
  reviewsCount: 0,
  pages: 0,
  featured: false,
  bestseller: false,
  slug: '',
}

export function AdminBookManager({ books }: AdminBookManagerProps) {
  const router = useRouter()
  const [modal, setModal] = useState<{ mode: FormMode; book?: MergedBook } | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState('')

  const openCreate = useCallback(() => {
    setForm(emptyForm)
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
      tagline: book.tagline ?? '',
      description: book.description ?? '',
      rating: book.rating ?? '5.0',
      reviewsCount: book.reviewsCount ?? 0,
      pages: book.pages ?? 0,
      featured: book.featured ?? false,
      bestseller: book.bestseller ?? false,
      slug: book.slug,
    })
    setModal({ mode: 'edit', book })
    setError('')
  }, [])

  const closeModal = useCallback(() => {
    setModal(null)
    setError('')
  }, [])

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const url = modal?.mode === 'create'
        ? '/api/admin/books'
        : `/api/admin/books/${(modal?.book as AdminBook)?.id}`

      const method = modal?.mode === 'create' ? 'POST' : 'PUT'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong')
      }

      closeModal()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }, [modal, form, closeModal, router])

  const handleDelete = useCallback(async (book: MergedBook & { id: string }) => {
    if (!confirm(`Delete "${book.title}"? This cannot be undone.`)) return

    setDeleting(book.id)
    setError('')

    try {
      const res = await fetch(`/api/admin/books/${book.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong')
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setDeleting(null)
    }
  }, [router])

  const updateField = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  const isAdminBook = (book: MergedBook): book is MergedBook & AdminBook =>
    book.source === 'admin'

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
              <th className="px-4 py-3 font-medium">Featured</th>
              <th className="px-4 py-3 font-medium">Bestseller</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {books.map((book) => (
              <tr key={`${book.source}-${book.id}`} className="transition-colors hover:bg-muted/50">
                <td className="max-w-48 truncate px-4 py-3 font-medium text-foreground">
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
                  {book.featured ? (
                    <span className="text-green-600">Yes</span>
                  ) : (
                    <span className="text-muted-foreground">No</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {book.bestseller ? (
                    <span className="text-green-600">Yes</span>
                  ) : (
                    <span className="text-muted-foreground">No</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {isAdminBook(book) ? (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => openEdit(book)}
                        aria-label={`Edit ${book.title}`}
                      >
                        <Edit className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleDelete(book)}
                        disabled={deleting === book.id}
                        aria-label={`Delete ${book.title}`}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">Read-only</span>
                  )}
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
                  {saving ? 'Saving...' : modal.mode === 'create' ? 'Create Book' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
