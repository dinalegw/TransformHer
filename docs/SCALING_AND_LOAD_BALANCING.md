# TransformHer Scaling and Load-Balancing Architecture

## Production request path

```text
User
  -> Vercel Edge Network / CDN
  -> Vercel Function Router
  -> any healthy TransformHer function instance
  -> Neon pooled PostgreSQL endpoint
```

TransformHer does **not** implement a second reverse proxy inside the Next.js app. Vercel already owns request distribution, health-aware routing, concurrency management, and horizontal function scaling. Adding an application-level round-robin proxy in front of the same Vercel functions would add latency, another failure point, and no extra capacity.

## Balancing policies

### Runtime traffic: resource-aware / least-concurrency

Vercel's function routing layer can select an instance based on available resources and concurrent work instead of blindly rotating through instances. This is the production equivalent we want for the "least connections" requirement.

Classic round robin is intentionally **not** implemented in application code. Requests can have very different CPU, memory, database, and external API costs, so equal request counts do not imply equal load.

### Weighted traffic

Weighted traffic is a deployment concern, not a session concern. When the hosting plan supports Vercel Rolling Releases, production changes should use staged percentages such as 10% -> 50% -> 100%, with monitoring between stages and instant rollback on elevated errors.

This should not be emulated with random application redirects because that creates version skew and can split related requests across incompatible deployments.

### Sticky sessions

TransformHer deliberately uses **stateless signed-cookie sessions**. Any healthy function instance can validate the cookie and load the current account state from the shared database. Therefore server-level sticky sessions are not required.

Do not add an in-memory `user -> server` map. It would:

- break when an instance is recycled;
- reduce failover;
- create hot instances for high-traffic users;
- make autoscaling less effective;
- make deploys and rollbacks harder.

Deployment-level stickiness during a canary rollout, if enabled by the platform, is separate from application authentication affinity.

## Database connection strategy

The application prefers pooled connection URLs (`POSTGRES_URL` / `DATABASE_URL`) and only falls back to explicitly unpooled URLs when no pooled URL is available. Each warm function process keeps a deliberately small local connection pool. The external Neon pooler is the global fan-out layer.

This prevents connection storms when Vercel creates many instances during a traffic spike.

## Shared state requirements

Anything that must be consistent across requests must live outside process memory:

- authentication revocation state -> PostgreSQL (`token_version`, account status);
- rate limits -> PostgreSQL shared buckets;
- carts, purchases, users and admin state -> PostgreSQL;
- uploaded assets -> persistent object storage;
- email delivery -> Courier;
- payment state -> Paystack + persisted transaction references.

Process-local memory may only be used as a non-authoritative cache/fallback.

## Failure and surge behavior

The application should remain safe when:

- one function instance dies mid-request;
- several instances cold-start at once;
- the same user hits different instances on consecutive requests;
- traffic spikes faster than a local process can handle;
- a database connection is temporarily unavailable;
- Courier or Paystack is slow;
- a deployment is rolled back while users are active.

Critical write operations must be idempotent where practical, database constraints must prevent duplicates, and external service failures must not create duplicate charges, purchases, or accounts.

## Health and observability

Production health endpoints must check shared dependencies rather than the identity of a specific process. Request IDs should be propagated so failures can be traced across distributed instances.

## Capacity upgrades

When traffic grows materially, scale in this order:

1. Keep functions stateless and let Vercel add instances automatically.
2. Verify the database is using a pooled Neon endpoint and tune compute/connection limits.
3. Move expensive or non-interactive work to background queues/workflows.
4. Add cache layers for read-heavy public data.
5. Enable staged/weighted releases on a hosting plan that supports them.
6. Only introduce dedicated services or a custom load balancer if TransformHer later operates multiple independently managed origins outside Vercel.
