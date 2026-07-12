import { sqliteTable, text, integer, uniqueIndex, index, customType } from 'drizzle-orm/sqlite-core'

export const timestamp = customType<{ data: Date; driverData: number }>({
  dataType() { return 'integer' },
  toDriver(value: Date | number | undefined): number {
    if (value === undefined || value === null) return 0
    return value instanceof Date ? value.getTime() : Number(value)
  },
  fromDriver(value: number | bigint | null): Date {
    if (value === null || value === undefined) return new Date(0)
    return new Date(Number(value))
  },
})

export const bool = customType<{ data: boolean; driverData: number }>({
  dataType() { return 'integer' },
  toDriver(value: boolean | number | undefined): number {
    if (value === undefined || value === null) return 0
    return value ? 1 : 0
  },
  fromDriver(value: number | bigint | null): boolean {
    return Number(value) === 1
  },
})

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  emailVerified: bool('email_verified').notNull().default(false),
  image: text('image'),
  passwordHash: text('password_hash'),
  isAdmin: bool('is_admin').notNull().default(false),
  username: text('username'),
  phone: text('phone'),
  showFullName: bool('show_full_name').notNull().default(false),
  role: text('role').notNull().default('user'),
  rank: text('rank'),
  title: text('title'),
  permissions: text('permissions').notNull().default('[]'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
}, (table) => ({
  emailIdx: uniqueIndex('user_email_idx').on(table.email),
  roleIdx: index('user_role_idx').on(table.role),
}))

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
}, (table) => ({
  tokenIdx: uniqueIndex('session_token_idx').on(table.token),
  userIdx: index('session_user_idx').on(table.userId),
  expiryIdx: index('session_expiry_idx').on(table.expiresAt),
}))

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
}, (table) => ({
  userIdx: index('account_user_idx').on(table.userId),
  providerIdx: index('account_provider_idx').on(table.providerId),
}))

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
}, (table) => ({
  identifierIdx: index('verification_identifier_idx').on(table.identifier),
  expiryIdx: index('verification_expiry_idx').on(table.expiresAt),
}))

export const books = sqliteTable('books', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull(),
  title: text('title').notNull(),
  author: text('author').notNull(),
  category: text('category').notNull(),
  price: text('price').notNull().default('0'),
  currency: text('currency').notNull().default('NGN'),
  coverImage: text('cover_image').notNull(),
  fileUrl: text('file_url'),
  tagline: text('tagline').notNull().default(''),
  description: text('description').notNull().default(''),
  rating: text('rating').notNull().default('5.0'),
  reviewsCount: integer('reviews_count').notNull().default(0),
  pages: integer('pages').notNull().default(0),
  featured: bool('featured').notNull().default(false),
  bestseller: bool('bestseller').notNull().default(false),
  source: text('source').notNull().default('seed'),
  archived: bool('archived').notNull().default(false),
  deleted: bool('deleted').notNull().default(false),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
}, (table) => ({
  slugIdx: uniqueIndex('books_slug_idx').on(table.slug),
  categoryIdx: index('books_category_idx').on(table.category),
  featuredIdx: index('books_featured_idx').on(table.featured),
  bestsellerIdx: index('books_bestseller_idx').on(table.bestseller),
  sourceIdx: index('books_source_idx').on(table.source),
  featuredBestsellerIdx: index('books_featured_bestseller_idx').on(table.featured, table.bestseller),
  activeBooksIdx: index('books_active_idx').on(table.deleted, table.archived),
}))

export type Book = typeof books.$inferSelect
export type NewBook = typeof books.$inferInsert

export const userPurchases = sqliteTable('user_purchases', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  bookId: integer('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
  bookSlug: text('book_slug').notNull(),
  purchaseDate: timestamp('purchase_date').notNull(),
  paymentReference: text('payment_reference'),
  released: bool('released').notNull().default(false),
  releaseAt: timestamp('release_at'),
  archived: bool('archived').notNull().default(false),
}, (table) => ({
  userIdx: index('purchases_user_idx').on(table.userId),
  bookIdx: index('purchases_book_idx').on(table.bookId),
  slugIdx: index('purchases_slug_idx').on(table.bookSlug),
  userBookIdx: uniqueIndex('purchases_user_book_idx').on(table.userId, table.bookId),
  releaseIdx: index('purchases_release_idx').on(table.released, table.releaseAt),
}))

export type UserPurchase = typeof userPurchases.$inferSelect

export const cart = sqliteTable('cart', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  bookId: integer('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
  addedAt: timestamp('added_at').notNull(),
}, (table) => ({
  userIdx: index('cart_user_idx').on(table.userId),
  bookIdx: index('cart_book_idx').on(table.bookId),
  userBookIdx: uniqueIndex('cart_user_book_idx').on(table.userId, table.bookId),
}))

export type CartItem = typeof cart.$inferSelect

export const pendingChanges = sqliteTable('pending_changes', {
  id: text('id').primaryKey(),
  bookSlug: text('book_slug').notNull(),
  bookTitle: text('book_title').notNull(),
  type: text('type').notNull(),
  changes: text('changes').notNull().default('{}'),
  submittedBy: text('submitted_by').notNull(),
  submittedByEmail: text('submitted_by_email').notNull(),
  submittedAt: timestamp('submitted_at').notNull(),
  status: text('status').notNull().default('pending'),
  reviewedBy: text('reviewed_by'),
  reviewedAt: timestamp('reviewed_at'),
}, (table) => ({
  statusIdx: index('pending_changes_status_idx').on(table.status),
  slugIdx: index('pending_changes_slug_idx').on(table.bookSlug),
}))

export type PendingChangeRow = typeof pendingChanges.$inferSelect
