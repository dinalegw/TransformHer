<p align="center">
  <img src="./public/hero-reading.png" alt="TransformHer" width="600"/>
</p>

<h1 align="center">✦ TransformHer ✦</h1>

<p align="center">
  <b><i>Every Page Changes a Life.</i></b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat&logo=next.js" alt="Next.js"/>
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react" alt="React"/>
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/TailwindCSS-4-06B6D4?style=flat&logo=tailwindcss" alt="TailwindCSS"/>
  <img src="https://img.shields.io/badge/Drizzle-ORM-C5F74F?style=flat&logo=drizzle" alt="Drizzle"/>
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/Paystack-00A3E0?style=flat&logo=paystack" alt="Paystack"/>
  <img src="https://img.shields.io/badge/Courier-00D4AA?style=flat" alt="Courier"/>
  <img src="https://img.shields.io/badge/ESLint-4B32C3?style=flat&logo=eslint" alt="ESLint"/>
  <img src="https://img.shields.io/badge/Vitest-6E9F18?style=flat&logo=vitest" alt="Vitest"/>
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat" alt="MIT"/>
</p>

---

**TransformHer** is a full-stack digital eBook marketplace built with Next.js — a small, purpose-built platform for purchasing and reading digital books focused on empowering girls and women.

The platform features a storefront for browsing and purchasing books via Paystack, a private admin dashboard with role-based access control, email notifications via Courier, a multi-theme reading experience, and a complete authentication system with email verification and password recovery.

---

## ✦ What's Inside

```
transformher/
├── app/              Next.js App Router (pages, API routes, layouts)
│   ├── (auth)/       Auth pages (login, signup, forgot/reset password)
│   ├── admin/        Admin dashboard (sidebar layout + tabbed management)
│   ├── api/          Backend API (auth, admin, cart, paystack, library)
│   ├── books/        eBook catalog & detail pages
│   ├── cart/         Shopping cart
│   ├── library/      My Library (purchased books)
│   ├── faq/          Frequently asked questions
│   ├── profile/      Profile settings
│   └── verify-email/ Email verification handler
├── components/       Shared UI components (shadcn/ui, admin, site)
├── lib/              Utilities, DB, auth, email, cart, payments
├── drizzle/          Drizzle ORM migrations
├── scripts/          DB migration, Courier template setup, test utilities
├── public/           Static assets (images, book files, uploads)
└── .github/          CI workflow (typecheck, lint, test, build)
```

---

## ✦ Features

### Storefront
- Browse a catalog of books with search, category filter, and sort (popular, newest, price)
- Book detail pages with descriptions, previews, and related recommendations
- Shopping cart with add/remove and Paystack checkout
- Personal library with 72-hour unlock timer and archive support
- Online book reader with streaming file delivery
- FAQ page with accordion-style questions

### Authentication & Security
- Custom auth system (PBKDF2 + timing-safe comparison + HMAC session tokens)
- Email verification flow with verification tokens
- Password reset with email notification
- Security notifications (login alerts, password changes)
- Content Security Policy headers in production
- Session-based cookies with secure/same-site attributes
- Session invalidation on admin permission changes (`tokenVersion`)
- Rate limiting on auth, payment, and checkout endpoints

### Admin Dashboard
- Persistent sidebar with tabbed management interface
- Full book CRUD with PDF upload (extension + magic byte validation, 50 MB limit)
- User management with search and role promotion
- Order management with book unlock capability
- Pending changes workflow (sub-admin submits, master approves/rejects)
- Granular permission assignment per admin

### Email System (Courier)
- Welcome & email verification emails
- Password reset and change confirmation
- Login notifications and security alerts
- Purchase confirmation and book release notifications
- Admin order notifications
- Invitation emails

### Multi-Theme Reading
- Light, dark, and `night-shift` (warm) reading modes
- Inline script prevents theme flash on page load

## ✦ Stack

| Layer | Tech |
|-------|------|
| **Frontend** | Next.js 16 · React 19 · TailwindCSS 4 · shadcn/ui · @base-ui/react · Lucide React |
| **Backend** | Next.js API Routes · Drizzle ORM · NeonDB (PostgreSQL) |
| **Auth** | Custom (PBKDF2 + HMAC tokens) |
| **Payments** | Paystack |
| **Email** | Courier (12 notification templates) |
| **Analytics** | Vercel Analytics |
| **Testing** | Vitest |
| **CI** | GitHub Actions (typecheck, lint, test, build) |
| **Tooling** | TypeScript 5 · ESLint 9 · Prettier |

---

## ✦ Role-Based Access Control

The platform features a **granular permission system** with three user roles:

### Master Admin
- Full access to all books without purchase
- Dedicated admin sidebar portal
- Manage all books (create, edit, delete, archive)
- Approve/reject pending changes from sub-admins
- Manage administrators (promote/demote users)
- Assign granular permissions to sub-admins
- View all users with search
- View all orders with unlock capability

### Sub-Admin
- Book management (create, edit)
- View orders
- Permissions assigned by master admin
- Changes require master admin approval

### User
- Browse and purchase books
- Personal library with 72-hour unlock timer
- Profile management (name, username, phone, display preference)

---

## ✦ Admin Portal

The admin portal includes a **persistent sidebar** with sections:

| Section | Access | Description |
|---------|--------|-------------|
| **Dashboard** | All admins | Stats overview (books, users, pending changes) |
| **Books** | All admins | Full book CRUD with file upload |
| **Users** | Master only | View all users, search, promote to admin |
| **Admins** | Master only | Manage administrators, assign permissions |
| **Orders** | All admins | View all purchases, unlock books for users |
| **Pending Changes** | Master only | Approve/reject sub-admin changes |

### Permissions System

Master admins can assign specific permissions to sub-admins:

- `view_books` — Browse the book catalog
- `create_books` — Add new books
- `edit_books` — Modify existing books
- `delete_books` — Remove books from the store
- `archive_books` — Archive/unarchive books
- `approve_changes` — Approve pending changes
- `manage_users` — View and manage users
- `manage_admins` — Promote/demote administrators
- `view_orders` — View purchase orders
- `manage_orders` — Manage order fulfillment
- `unlock_books` — Release books to users
- `view_analytics` — View analytics and reports
- `manage_settings` — Configure platform settings

---

## ✦ Prerequisites

- **Node.js** 20.19+ (uses [Next.js 16](https://nextjs.org))
- **npm** (package manager — comes with Node.js)
- **NeonDB PostgreSQL** connection string (for production / Vercel deployment)

## ✦ Getting Started

```bash
# install dependencies
npm install

# copy and fill in environment variables
cp .env.example .env.local

# then run the development server
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

---

## ✦ Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run typecheck` | TypeScript type checking (`tsc --noEmit`) |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests (Vitest) |
| `npm run db:generate` | Generate Drizzle migrations from schema |
| `npm run db:migrate` | Run pending migrations |
| `npm run db:studio` | Open Drizzle Studio GUI |
| `npm run db:push` | Push schema directly to database |
| `node scripts/setup-templates.mjs` | Create/update Courier email templates |

---

## ✦ Environment Variables

```env
# Required
AUTH_SECRET=replace-with-a-long-random-string  # HMAC secret for session tokens

# Database (required)
POSTGRES_URL_NON_POOLING=postgres://...         # NeonDB direct connection string
POSTGRES_URL=postgres://...                     # Pooled connection (fallback)

# Email (Courier)
COURIER_API_KEY=pk_...                          # Courier API key
RENDERED_API_KEY=re_...                         # Rendered API key (fallback)
COURIER_TEMPLATE_PASSWORD_RESET=...             # Password reset template ID
COURIER_TEMPLATE_PASSWORD_RESET_CONFIRMATION=... # Password reset confirmation
COURIER_TEMPLATE_PASSWORD_CHANGED=...           # Password changed notification
COURIER_TEMPLATE_WELCOME_VERIFY=...             # Welcome + email verification
COURIER_TEMPLATE_EMAIL_VERIFIED=...             # Email verified confirmation
COURIER_TEMPLATE_VERIFY_NEW_EMAIL=...           # Verify new email
COURIER_TEMPLATE_LOGIN_NOTIFICATION=...         # New login notification
COURIER_TEMPLATE_SECURITY_ALERT=...             # Security alert
COURIER_TEMPLATE_INVITATION=...                 # Admin invitation
COURIER_TEMPLATE_ORDER_CONFIRMATION=...         # Purchase confirmation
COURIER_TEMPLATE_BOOK_RELEASED=...              # Book released notification
COURIER_TEMPLATE_ADMIN_ORDER=...               # Admin order notification

# Payments (Paystack)
PAYSTACK_SECRET_KEY=sk_test_...               # Paystack secret key
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_...   # Paystack public key

# Admin
ADMIN_EMAIL=admin@transformher.com            # Master admin email
ADMIN_PASSWORD=ChangeMeStrong123              # Master admin password

# Optional
NEXT_PUBLIC_BASE_URL=http://localhost:3000    # Public-facing URL
```

---

## ✦ Default Admin Credentials

- **Email:** Value of `ADMIN_EMAIL` env var (default: `admin@transformher.com`)
- **Password:** Value of `ADMIN_PASSWORD` env var (default: `ChangeMeStrong123`)

The admin user is auto-seeded on first startup. Password changes via env vars are synced on every restart.

---

## ✦ API Routes

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/auth/login` | POST | — | Authenticate user |
| `/api/auth/register` | POST | — | Create account |
| `/api/auth/logout` | POST | — | Sign out |
| `/api/auth/me` | GET | — | Get current user |
| `/api/auth/me` | PUT | Auth | Update profile |
| `/api/auth/forgot-password` | POST | — | Request password reset |
| `/api/auth/reset-password` | POST | — | Reset password |
| `/api/auth/verify-email` | GET | — | Verify email |
| `/api/admin/books` | GET | Admin | List all books |
| `/api/admin/books` | POST | Admin | Create book |
| `/api/admin/books/[id]` | PUT | Admin | Update book |
| `/api/admin/books/[id]` | DELETE | Admin | Delete book |
| `/api/admin/books/[id]/approve` | POST | Master | Approve pending change |
| `/api/admin/books/[id]/reject` | POST | Master | Reject pending change |
| `/api/admin/books/upload` | POST | Admin | Upload book file |
| `/api/admin/users` | GET | Master | List all users |
| `/api/admin/users/[id]` | PUT | Master | Update user role/permissions |
| `/api/admin/users/[id]` | DELETE | Master | Demote user |
| `/api/admin/orders` | GET | Admin | List all orders |
| `/api/admin/orders/unlock` | POST | Admin | Unlock book for user |
| `/api/admin/notifications` | GET | Master | List pending changes |
| `/api/cart` | GET | Auth | Get cart items |
| `/api/cart` | POST | Auth | Add to cart |
| `/api/cart` | DELETE | Auth | Remove from cart |
| `/api/cart/checkout` | POST | Auth | Initialize checkout |
| `/api/cart/checkout/confirm` | POST | Auth | Confirm purchase |
| `/api/library` | GET | Auth | Get library items |
| `/api/library/archive` | POST | Auth | Archive/unarchive item |
| `/api/library/list` | GET | Auth | List all library items |
| `/api/books/[slug]/read` | GET | Auth | Stream book file |
| `/api/paystack/initialize` | POST | Auth | Initialize Paystack payment |
| `/api/paystack/verify` | POST | Auth | Verify Paystack payment |
| `/api/health` | GET | — | Health check |

---

## ✦ Notes & Improvements

This codebase is built for production and has been hardened for responsiveness,
rendering correctness, and edge-case safety.

### Responsiveness

- **Storefront** is fully fluid: the header collapses its nav to a compact menu
  below `lg`, the hero spotlight card renders on all screen sizes, product and
  library grids reflow from 4 → 2 → 1 columns, and catalog controls stack on
  small screens.
- **Admin portal** ships a slide-in drawer sidebar (with overlay + Escape/backdrop
  close) on mobile, horizontally scrollable data tables, and a modal that closes
  on backdrop click or `Esc`.
- **Theme system** supports light, dark, and a warm `night-shift` reading mode,
  with an inline script that sets the class before paint to avoid a flash.

### Edge cases handled

- **Payments** — checkout confirms the amount Paystack actually collected against
  the cart total, skips books removed between checkout start and confirmation
  (no orphaned purchases with empty slugs), and re-sends a verification/expiry
  guard on refresh.
- **Books** — archived books are filtered at the query level; slugs are sanitized
  on create/edit (closing path-traversal in file storage); the public book cache
  is invalidated when admins edit books so prices/titles update immediately.
  Uploads are validated by extension **and** magic bytes (≤ 50 MB).
- **Library** — a 72-hour unlock timer releases purchases and emails the reader;
  `addToCart` rejects deleted/archived/out-of-stock books. Users can archive
  books in their library to declutter their view.
- **Auth** — password reset no longer reveals whether an email is registered;
  the logout cookie mirrors the production `secure`/`sameSite` attributes; last
  master admin and self-demotion are blocked; email verification is required
  before purchase; security notifications are sent on new logins and password
  changes.
- **Security** — Content Security Policy headers applied via middleware in
  production; HMAC-signed session tokens with configurable expiry; admin routes
  are protected by middleware with live database state checks on every request;
  admin sessions are invalidated when roles/permissions change; rate limiting is
  enforced on auth, payment, and checkout endpoints; password verification uses
  timing-safe comparison.
- **Reading** — book files stream via `Readable.toWeb` for correct behavior on
  serverless runtimes, with inline `Content-Disposition`.

### Data layer

- Uses **Drizzle ORM** over PostgreSQL (NeonDB) in production.
- Public and admin queries are cached in-memory (TTL ~30–60s) and invalidated on
  mutation.
- Designed for Vercel serverless: no local filesystem fallback, no native
  SQLite dependencies, single pooled NeonDB connection per serverless instance.

### CI Pipeline

GitHub Actions runs on every push and pull request to `main` — type checking,
ESLint, Vitest tests (with coverage), and Next.js production build.

---

## ✦ License

This project is [MIT](LICENSE) licensed.

---

<p align="center">
  <sub>Built with ❤️ to empower every woman, one page at a time.</sub>
</p>
