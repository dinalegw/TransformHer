# Security Policy

TransformHer handles authentication, payments, transactional email, user-account lifecycle operations and protected digital-library access. Security reports are taken seriously.

## Reporting a vulnerability

Please **do not open a public GitHub issue** for a vulnerability that could expose user data, bypass authentication or authorization, affect payments, disclose secrets, or permit destructive actions.

Send a private report to:

**transformher360@gmail.com**

Include:

- a clear description of the issue
- the affected route, feature or component
- reproducible steps or a minimal proof of concept
- the expected and observed behavior
- potential impact
- any suggested mitigation

Do not include real user credentials, payment credentials, session cookies or unnecessary personal data.

## Responsible testing

Please test only accounts and data you own or are explicitly authorized to use. Do not perform denial-of-service testing, destructive testing against production data, credential attacks, spam, social engineering, or attempts to access another user's private content.

## Scope

Security-relevant areas include:

- authentication and session validation
- role and permission enforcement
- password reset and email verification
- account freeze/archive/delete flows
- Paystack checkout and confirmation logic
- protected library and reader access
- admin and Master Admin mutations
- rate limiting and same-origin protections
- secret handling and environment configuration
- private ebook storage and file access

## Disclosure

Please allow reasonable time to investigate and deploy a fix before public disclosure. If a report is valid, we will aim to acknowledge it, investigate impact, fix the issue, and document the resolution appropriately.

This policy is for responsible security reporting and does not create a bug-bounty or compensation commitment.
