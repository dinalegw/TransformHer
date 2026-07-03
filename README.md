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
</p>

---

**TransformHer** is a premium digital platform empowering girls and women to transform their lives through carefully curated eBooks, resources, and community — blending a world-class shopping experience with meaningful content.

## ✦ What's Inside

```
transformher/
├── app/            Next.js App Router (pages, API routes, auth)
│   ├── api/        Backend API (auth, paystack)
│   ├── admin/      Admin dashboard
│   ├── books/      eBook marketplace pages
│   └── (auth)/     Auth pages (login, register)
├── components/     Shared UI components
├── lib/            Utilities, DB, auth, payments
└── public/         Static assets
```

## ✦ Stack

| Layer | Tech |
|-------|------|
| **Frontend** | Next.js 16 · React 19 · TailwindCSS 4 · shadcn/ui |
| **Backend** | Next.js API Routes · Drizzle ORM (in-memory) |
| **Auth** | Custom (PBKDF2 + HMAC tokens) |
| **Payments** | Paystack |
| **Tooling** | TypeScript 5 · ESLint |

## ✦ Prerequisites

- **Node.js** 18+ (uses [Next.js 16](https://nextjs.org))
- **pnpm** — install via `npm install -g pnpm`

## ✦ Getting Started

```bash
# install dependencies
pnpm install

# copy environment variables
cp .env.example .env.local

# run the development server
pnpm dev
```

## ✦ Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |

## ✦ Environment Variables

```env
AUTH_SECRET=your-secret-key           # used for session tokens
PAYSTACK_SECRET_KEY=sk_test_...       # Paystack secret key
NEXT_PUBLIC_BASE_URL=http://localhost:3000  # your domain
```

## ✦ License

**Private** — All rights reserved.

---

<p align="center">
  <sub>Built with ❤️ to empower every woman, one page at a time.</sub>
</p>
