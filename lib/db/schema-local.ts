import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core'

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  passwordHash: text('password_hash'),
  isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
  username: text('username'),
  phone: text('phone'),
  showFullName: integer('show_full_name', { mode: 'boolean' }).notNull().default(false),
  role: text('role').notNull().default('user'),
  rank: text('rank'),
  title: text('title'),
  permissions: text('permissions').notNull().default('[]'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => ({
  emailIdx: uniqueIndex('user_email_idx').on(table.email),
  roleIdx: index('user_role_idx').on(table.role),
}))

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  token: text('token').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
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
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp_ms' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp_ms' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => ({
  userIdx: index('account_user_idx').on(table.userId),
  providerIdx: index('account_provider_idx').on(table.providerId),
}))

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
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
  featured: integer('featured', { mode: 'boolean' }).notNull().default(false),
  bestseller: integer('bestseller', { mode: 'boolean' }).notNull().default(false),
  source: text('source').notNull().default('seed'),
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
  deleted: integer('deleted', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
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
  purchaseDate: integer('purchase_date', { mode: 'timestamp_ms' }).notNull(),
  paymentReference: text('payment_reference'),
  released: integer('released', { mode: 'boolean' }).notNull().default(false),
  releaseAt: integer('release_at', { mode: 'timestamp_ms' }),
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
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
  addedAt: integer('added_at', { mode: 'timestamp_ms' }).notNull(),
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
  submittedAt: integer('submitted_at', { mode: 'timestamp_ms' }).notNull(),
  status: text('status').notNull().default('pending'),
  reviewedBy: text('reviewed_by'),
  reviewedAt: integer('reviewed_at', { mode: 'timestamp_ms' }),
}, (table) => ({
  statusIdx: index('pending_changes_status_idx').on(table.status),
  slugIdx: index('pending_changes_slug_idx').on(table.bookSlug),
}))

export type PendingChangeRow = typeof pendingChanges.$inferSelect
