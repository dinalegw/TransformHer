# Contributing to TransformHer

Thanks for helping improve TransformHer.

## Before you start

1. Check open issues and pull requests to avoid duplicating work.
2. For security-sensitive findings, follow `SECURITY.md` instead of opening a public issue.
3. Keep pull requests focused on one problem or feature.

## Local setup

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Use your own development credentials and never commit secrets. Google OAuth development requires your own `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` and the local callback `http://localhost:3000/api/auth/callback/google`; never reuse or publish production OAuth secrets.

## Quality checks

Before opening a pull request, run the project checks defined in `package.json`, including TypeScript, linting, tests and a production build when practical.

## Pull requests

A useful pull request should explain:

- what problem it solves
- what changed
- how it was tested
- any database, environment-variable, payment, email or deployment impact
- screenshots for user-interface changes when useful

Do not weaken authentication, authorization, payment verification, same-origin mutation checks, rate limits, storage protections or account-lifecycle controls simply to make a test pass.

## Testing areas

Contributions and testing are especially welcome around authentication edge cases (including Google OAuth linking and duplicate-account prevention), permissions, payment idempotency, account lifecycle behavior, email delivery, library entitlements, admin workflows, responsive UI, accessibility and failure handling.

## Content and copyright

Only submit book text, cover art, images or other media that you have the right to contribute.

## Conduct

Be constructive, specific and respectful. Technical criticism is welcome; harassment or disclosure of private user data is not.
