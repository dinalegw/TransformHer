import {
  boolean,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
  foreignKey,
  check,
} from 'drizzle-orm/pg-core'

/* ------------------------------------------------------------------ */
/* Enums                                                               */
/* ------------------------------------------------------------------ */

export const userRoleEnum = pgEnum('user_role', ['user', 'admin', 'master_admin'])
export const adminRankEnum = pgEnum('admin_rank', ['junior', 'senior', 'lead', 'master'])
export const bookCategoryEnum = pgEnum('book_category', [
  'Mindset & Confidence',
  'Career & Wealth',
  'Wellness & Self-Care',
  'Relationships',
  'Spirituality & Purpose',
  'Leadership',
])
export const currencyEnum = pgEnum('currency', ['NGN', 'USD', 'GBP', 'EUR'])
export const changeStatusEnum = pgEnum('change_status', ['pending', 'approved', 'rejected'])
export const changeTypeEnum = pgEnum('change_type', ['create', 'update', 'delete', 'archive'])
export const bookSourceEnum = pgEnum('book_source', ['seed', 'admin'])

/* ------------------------------------------------------------------ */
/* Users & Auth                                                        */
/* ------------------------------------------------------------------ */

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  passwordHash: text('password_hash'),
  isAdmin: boolean('is_admin').notNull().default(false),
  username: text('username'),
  phone: text('phone'),
  showFullName: boolean('show_full_name').notNull().default(false),
  role: userRoleEnum('role').notNull().default('user'),
  rank: adminRankEnum('rank'),
  title: text('title'),
  permissions: text('permissions').notNull().default('[]'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  emailIdx: uniqueIndex('user_email_idx').on(table.email),
  roleIdx: index('user_role_idx').on(table.role),
}))

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
}, (table) => ({
  tokenIdx: uniqueIndex('session_token_idx').on(table.token),
  userIdx: index('session_user_idx').on(table.userId),
  expiryIdx: index('session_expiry_idx').on(table.expiresAt),
}))

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdx: index('account_user_idx').on(table.userId),
  providerIdx: index('account_provider_idx').on(table.providerId),
}))

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  identifierIdx: index('verification_identifier_idx').on(table.identifier),
  expiryIdx: index('verification_expiry_idx').on(table.expiresAt),
}))

/* ------------------------------------------------------------------ */
/* Books                                                               */
/* ------------------------------------------------------------------ */

export const books = pgTable('books', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  author: text('author').notNull(),
  category: bookCategoryEnum('category').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull().default('0'),
  currency: currencyEnum('currency').notNull().default('NGN'),
  coverImage: text('cover_image').notNull(),
  fileUrl: text('file_url'),
  tagline: text('tagline').notNull().default(''),
  description: text('description').notNull().default(''),
  rating: numeric('rating', { precision: 2, scale: 1 }).notNull().default('5.0'),
  reviewsCount: integer('reviews_count').notNull().default(0),
  pages: integer('pages').notNull().default(0),
  featured: boolean('featured').notNull().default(false),
  bestseller: boolean('bestseller').notNull().default(false),
  source: bookSourceEnum('source').notNull().default('seed'),
  archived: boolean('archived').notNull().default(false),
  deleted: boolean('deleted').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
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

/* ------------------------------------------------------------------ */
/* User Purchases / Library                                            */
/* ------------------------------------------------------------------ */

export const userPurchases = pgTable('user_purchases', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  bookId: integer('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
  bookSlug: text('book_slug').notNull(),
  purchaseDate: timestamp('purchase_date').notNull().defaultNow(),
  paymentReference: text('payment_reference'),
  released: boolean('released').notNull().default(false),
  releaseAt: timestamp('release_at'),
  archived: boolean('archived').notNull().default(false),
}, (table) => ({
  userIdx: index('purchases_user_idx').on(table.userId),
  bookIdx: index('purchases_book_idx').on(table.bookId),
  slugIdx: index('purchases_slug_idx').on(table.bookSlug),
  userBookIdx: uniqueIndex('purchases_user_book_idx').on(table.userId, table.bookId),
  releaseIdx: index('purchases_release_idx').on(table.released, table.releaseAt),
}))

export type UserPurchase = typeof userPurchases.$inferSelect

/* ------------------------------------------------------------------ */
/* Cart                                                                */
/* ------------------------------------------------------------------ */

export const cart = pgTable('cart', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  bookId: integer('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
  addedAt: timestamp('added_at').notNull().defaultNow(),
}, (table) => ({
  userIdx: index('cart_user_idx').on(table.userId),
  bookIdx: index('cart_book_idx').on(table.bookId),
  userBookIdx: uniqueIndex('cart_user_book_idx').on(table.userId, table.bookId),
}))

export type CartItem = typeof cart.$inferSelect

/* ------------------------------------------------------------------ */
/* Pending Changes (sub-admin workflow)                                */
/* ------------------------------------------------------------------ */

export const pendingChanges = pgTable('pending_changes', {
  id: text('id').primaryKey(),
  bookSlug: text('book_slug').notNull(),
  bookTitle: text('book_title').notNull(),
  type: changeTypeEnum('type').notNull(),
  changes: text('changes').notNull().default('{}'),
  submittedBy: text('submitted_by').notNull(),
  submittedByEmail: text('submitted_by_email').notNull(),
  submittedAt: timestamp('submitted_at').notNull().defaultNow(),
  status: changeStatusEnum('status').notNull().default('pending'),
  reviewedBy: text('reviewed_by'),
  reviewedAt: timestamp('reviewed_at'),
}, (table) => ({
  statusIdx: index('pending_changes_status_idx').on(table.status),
  slugIdx: index('pending_changes_slug_idx').on(table.bookSlug),
}))

export type PendingChangeRow = typeof pendingChanges.$inferSelect
