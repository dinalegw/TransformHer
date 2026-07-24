# Glow Scents

A high-level digital publishing and ebook commerce platform built with Next.js. The application enables readers to browse books, purchase access, and consume content through a secure library experience, while giving administrators a role-based system to manage books, users, orders, and content approvals.

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

Glow Scents is designed to support a modern digital content business with a simple operating model:

- readers can discover books, add them to a cart, and complete payment securely
- users receive a personalized library experience with access control and archive support
- administrators can manage products, users, approvals, and order fulfillment from one portal
- the application is built with a secure authentication and notification layer to support production use

## What the Product Includes

### Customer-facing experience
- storefront for browsing books
- search and catalog organization
- cart and checkout flow with Paystack
- library access for purchased books
- reading experience with theme support

### Admin experience
- book management and upload workflow
- user and order oversight
- role-based permission controls
- pending change approval process

### Platform reliability
- email verification and password recovery
- secure session handling
- payment and checkout validation
- moderation-friendly content workflows

## Architecture at a Glance

The project is organized around a Next.js app with a clear separation between:

- the public storefront and content reader
- authenticated user and library APIs
- admin management APIs and permission checks
- Drizzle-backed PostgreSQL persistence
- external services for payments and email delivery

## Getting Started

### Requirements

- Node.js 20.19+
- npm
- PostgreSQL connection details

### Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Then open http://localhost:3000.

## Useful Scripts

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

## Environment Setup

The project uses the sample environment file as the starting point:

```bash
cp .env.example .env.local
```

At minimum, configure variables for authentication, database access, Paystack, Courier, and the seeded admin account.

## License

This project is licensed under the MIT License.

