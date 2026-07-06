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
│   ├── admin/      Admin dashboard
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
COURIER_TEMPLATE_ORDER_CONFIRMATION=...   # Purchase confirmation (72h unlock) template ID
COURIER_TEMPLATE_BOOK_RELEASED=...        # Book released notification template ID
COURIER_TEMPLATE_ADMIN_ORDER=...          # Admin order notification template ID

# Payments (Paystack)
PAYSTACK_SECRET_KEY=sk_test_...          # Paystack secret key

# Optional
NEXT_PUBLIC_BASE_URL=http://localhost:3000  # Public-facing URL
ADMIN_EMAIL=admin@example.com               # Admin notification email
```

## ✦ License

This project is [MIT](LICENSE) licensed.

---

<p align="center">
  <sub>Built with ❤️ to empower every woman, one page at a time.</sub>
</p>
