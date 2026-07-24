# Glow Scents

A production-ready digital storefront and reader built with Next.js for selling and delivering premium ebooks. The platform combines a customer-facing catalog, secure checkout with Paystack, a role-based admin dashboard, and a resilient email and auth workflow.

<p align="center">
  <img src="./public/hero-reading.png" alt="Glow Scents" width="600" />
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?style=flat&logo=next.js" />
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript" />
  <img alt="TailwindCSS" src="https://img.shields.io/badge/TailwindCSS-4-06B6D4?style=flat&logo=tailwindcss" />
  <img alt="Drizzle" src="https://img.shields.io/badge/Drizzle-ORM-C5F74F?style=flat&logo=drizzle" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql" />
  <img alt="Paystack" src="https://img.shields.io/badge/Paystack-00A3E0?style=flat&logo=paystack" />
  <img alt="Courier" src="https://img.shields.io/badge/Courier-00D4AA?style=flat" />
  <img alt="Vitest" src="https://img.shields.io/badge/Vitest-6E9F18?style=flat&logo=vitest" />
  <img alt="MIT" src="https://img.shields.io/badge/license-MIT-green?style=flat" />
</p>

## Overview

Glow Scents is a full-stack ebook commerce and reading platform designed for publishing, selling, and managing digital content securely. It includes:

- a public storefront with book discovery and browsing
- authenticated user accounts with email verification and reset flows
- Paystack-powered checkout
- a protected admin portal with granular permissions
- a library experience for purchased content with unlock and archive controls
- email delivery and notification workflows through Courier

## Tech Stack

- Frontend: Next.js 16, React 19, Tailwind CSS 4, shadcn/ui
- Backend: Next.js App Router, API routes, Drizzle ORM
- Database: PostgreSQL via NeonDB
- Auth: custom secure session model with salted hashing and signed tokens
- Payments: Paystack
- Email: Courier
- Testing: Vitest
- Tooling: TypeScript, ESLint, Prettier

## Project Structure

```text
app/              Next.js routes and pages
components/       Shared UI components
lib/              Business logic, auth, payments, email, storage
drizzle/          SQL migrations
public/           Static assets and uploaded content
scripts/          Migration and template setup utilities
```

## Core Features

### Customer Experience
- Product catalog with search and sorting
- Book detail pages and reader experience
- Cart and checkout flow
- Personal library with purchase unlock and archive handling
- Multi-theme reading interface

### Admin Operations
- Book CRUD and upload management
- Role-based admin permissions
- User and order management
- Pending change review and approval workflow

### Security and Reliability
- Email verification and password recovery
- Secure cookie-based sessions
- Permission-aware middleware and access checks
- Rate limiting on sensitive endpoints
- Validation for uploads, checkout state, and payment confirmation

## Getting Started

### Prerequisites

- Node.js 20.19+
- npm
- PostgreSQL-compatible database connection

### Installation

```bash
npm install
cp .env.example .env.local
npm run dev
```

The app will be available at http://localhost:3000.

## Environment Variables

Use the sample file as the source of truth:

```bash
cp .env.example .env.local
```

Required variables include:

- `AUTH_SECRET`
- `POSTGRES_URL`
- `POSTGRES_URL_NON_POOLING`
- `PAYSTACK_SECRET_KEY`
- `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`
- `COURIER_API_KEY`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

## Common Scripts

```bash
npm run dev
npm run build
npm run start
npm run typecheck
npm run lint
npm test
npm run db:generate
npm run db:migrate
npm run db:studio
npm run db:push
```

## Admin Access

The default admin account is seeded from environment variables. Change the values in `.env.local` before first run if you need a custom bootstrap admin user.

## License

This project is licensed under the MIT License.

