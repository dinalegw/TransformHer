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
  <img src="https://img.shields.io/badge/Paystack-00A3E0?style=flat&logo=paystack" alt="Paystack"/>
  <img src="https://img.shields.io/badge/ESLint-4B32C3?style=flat&logo=eslint" alt="ESLint"/>
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat" alt="MIT"/>
</p>

---

**TransformHer** is a premium digital platform empowering girls and women to transform their lives through carefully curated eBooks, resources, and community — blending a world-class shopping experience with meaningful content.

## ✦ What's Inside

```
transformher/
├── app/            Next.js App Router (pages, API routes, auth)
│   ├── api/        Backend API (auth, cart, paystack)
│   ├── admin/      Admin dashboard (with sidebar layout)
│   ├── books/      eBook marketplace & detail pages
│   ├── cart/       Shopping cart
│   ├── library/    My Library (purchased books)
│   ├── profile/    Profile settings
│   └── (auth)/     Auth pages (login, register, reset)
├── components/     Shared UI components
├── lib/            Utilities, DB, auth, cart, payments
├── scripts/        DB migration & setup scripts
└── public/         Static assets
```

## ✦ Stack

| Layer | Tech |
|-------|------|
| **Frontend** | Next.js 16 · React 19 · TailwindCSS 4 · shadcn/ui |
| **Backend** | Next.js API Routes · Drizzle ORM · NeonDB (PostgreSQL) |
| **Auth** | Custom (PBKDF2 + HMAC tokens) |
| **Payments** | Paystack |
| **Email** | Courier |
| **Tooling** | TypeScript 5 · ESLint |

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
- Granular permission assignment per admin

### Sub-Admin
- Book management (create, edit)
- View orders
- Permissions assigned by master admin
- Changes require master admin approval

### User
- Browse and purchase books
- Personal library with 72-hour unlock timer
- Profile management

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
| **Settings** | Master only | Platform configuration |

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

## ✦ Prerequisites

- **Node.js** 18+ (uses [Next.js 16](https://nextjs.org))

## ✦ Getting Started

```bash
# install dependencies
npm install

# create environment file
# (see required variables below)
# then run the development server
npm run dev
```

## ✦ Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests |
| `npm run db:migrate` | Run DB migrations |
| `node scripts/setup-templates.mjs` | Create/update Courier email templates |

## ✦ Environment Variables

```env
# Required
AUTH_SECRET=your-secret-key              # HMAC secret for session tokens

# Database (at least one required)
POSTGRES_URL_NON_POOLING=postgres://...  # NeonDB connection string
POSTGRES_URL=postgres://...              # Pooled connection (fallback)

# Email (Courier)
COURIER_API_KEY=pk_...                    # Courier API key
COURIER_TEMPLATE_PASSWORD_RESET=...       # Password reset template ID
COURIER_TEMPLATE_WELCOME_VERIFY=...       # Welcome + verification template ID
COURIER_TEMPLATE_EMAIL_VERIFIED=...       # Email verified confirmation template ID
COURIER_TEMPLATE_ORDER_CONFIRMATION=...   # Purchase confirmation template ID
COURIER_TEMPLATE_BOOK_RELEASED=...        # Book released notification template ID
COURIER_TEMPLATE_ADMIN_ORDER=...          # Admin order notification template ID

# Payments (Paystack)
PAYSTACK_SECRET_KEY=sk_test_...          # Paystack secret key
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_...  # Paystack public key

# Admin
ADMIN_EMAIL=admin@example.com            # Master admin email
ADMIN_PASSWORD=YourPassword123           # Master admin password

# Optional
NEXT_PUBLIC_BASE_URL=http://localhost:3000  # Public-facing URL
```

## ✦ Default Admin Credentials

When running locally without a database:

- **Email:** Value of `ADMIN_EMAIL` env var (default: `admin@transformher.com`)
- **Password:** Value of `ADMIN_PASSWORD` env var (default: `Admin@123`)

The admin user is auto-seeded on first startup. Password changes via env vars are synced on every restart.

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
| `/api/books/[slug]/read` | GET | Auth | Stream book file |
| `/api/paystack/initialize` | POST | Auth | Initialize Paystack payment |
| `/api/paystack/verify` | POST | Auth | Verify Paystack payment |

## ✦ License

This project is [MIT](LICENSE) licensed.

---

<p align="center">
  <sub>Built with ❤️ to empower every woman, one page at a time.</sub>
</p>
