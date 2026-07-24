# TransformHer

TransformHer is an MVP digital publishing and ebook commerce platform built to help readers discover books, purchase access, and consume content through a secure, polished experience. The product is designed around a clear value proposition: simple discovery, trustworthy payments, protected access, and a clean admin workflow for managing a digital catalog.

<p align="center">
  <img src="./public/hero-reading.png" alt="TransformHer" width="600" />
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

## Product Summary

TransformHer is an MVP for a digital marketplace focused on accessible learning and empowering content. It combines the following core layers:

- a customer-facing storefront for book discovery and purchase
- a secure checkout flow powered by Paystack
- a user library with access control and reading support
- an admin dashboard for catalog and order operations
- authentication, email verification, and notification workflows

## MVP Scope

The current release is intentionally scoped to the essential product loop:

1. Browse and discover books
2. Add books to cart and complete payment
3. Access purchased content in a personal library
4. Manage catalog, users, orders, and approvals from admin tools

This keeps the product focused, testable, and deployment-ready while preserving a strong foundation for future growth.

## Core Capabilities

### Customer Experience
- storefront browsing and catalog presentation
- book detail and reading experience
- shopping cart and checkout flow
- personal library with unlock and archive behavior
- theme-aware reading experience

### Admin Experience
- book creation, editing, upload, and management
- user and order oversight
- permission-based admin access
- approval workflow for content changes

### Trust and Reliability
- secure authentication flow
- email verification and password recovery
- payment validation and order protection
- rate limiting and access control on sensitive routes

## Technical Architecture

The application is structured as a modern Next.js product with a clear separation between presentation, business logic, and data access:

- App Router frontend and route-based pages
- API routes for auth, cart, payments, and library actions
- Drizzle ORM with PostgreSQL persistence
- external integrations for Paystack and Courier
- a secure admin authorization model

## Getting Started

### Prerequisites

- Node.js 20.19+
- npm
- PostgreSQL-compatible database connection

### Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

The application runs locally at http://localhost:3000.

## Project Scripts

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

## Environment Configuration

Use the provided environment template as the source of truth:

```bash
cp .env.example .env.local
```

Required configuration includes authentication, database access, Paystack, Courier, and the seeded admin account.

## License

This project is licensed under the MIT License.

