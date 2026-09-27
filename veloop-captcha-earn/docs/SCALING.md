# Scaling Discussion (Final Challenge)

> "If VELoop Rewards receives 100,000 CAPTCHA attempts per day, how would
> you scale this system while preventing duplicate rewards, replay
> attacks, automated abuse and inconsistent Gem balances?"

100,000/day averages ~1.16 requests/sec, but real traffic is bursty
(peaks around notification pushes, lunch breaks, etc.), so the design
below targets comfortably handling short bursts of 50-100 req/sec rather
than just the daily average.

## MongoDB indexes
Already in place and load-bearing at any scale:
- `captchachallenges`: unique `challengeId`, compound `{ userId, status }`
  (fast "does this user have an active challenge" lookups), `expiresAt`
  (for a TTL index or a periodic expiry sweep).
- `gemtransactions`: unique `{ referenceId, type }` — this is the index
  that makes duplicate-reward-prevention a database guarantee rather than
  an application-level convention that can be raced.
- Add a TTL index on `expiresAt` (`expireAfterSeconds: 0`) so expired
  `ACTIVE` challenges are reaped automatically rather than accumulating.

## Atomic updates & transactions
The current code already relies on single-document atomic operations
(`findOneAndUpdate` with `$set`/`$inc`) for both the verify state
transition and the wallet credit, which don't require a replica-set
transaction to be race-safe. At higher scale, wrapping "verify → mark
completed → claim → credit wallet → write ledger" in a MongoDB
multi-document transaction (already possible since MongoDB 4.0 on a
replica set / Atlas) adds an extra safety net for partial-failure
scenarios (e.g., app crash between wallet credit and ledger write) — worth
adding once traffic justifies the added latency cost of transactions.

## Idempotency
Every mutating action (`verify`, `claim`) is already idempotent by design
(a repeat request for a resolved `challengeId` is rejected, never
reprocessed). At scale, extend this with an `Idempotency-Key` header
pattern for the *claim* endpoint specifically, so that client-side retry
logic (e.g. a mobile app that lost the response to a network blip after
the server had already committed) can safely re-send without needing to
first check challenge state.

## Rate limiting
`express-rate-limit`'s in-memory store doesn't work across multiple
backend instances. At scale, swap its store for a Redis-backed store
(`rate-limit-redis`) so the limit is enforced consistently regardless of
which instance/pod a request lands on.

## Challenge expiry
Short-lived (60-120s) by design already, which keeps the "hot" working
set of `ACTIVE` challenges small. Combined with the TTL index above, the
collection never grows unbounded with dead challenges.

## Redis where appropriate
Good candidates, in priority order:
1. **Rate limiting store** (above).
2. **Active-challenge cache** — since a challenge is read on every page
   load/refresh, caching the "current active challenge" per user in Redis
   with a TTL matching `expiresAt` cuts MongoDB read load significantly.
3. **CaptchaRewardConfig cache** — already cached in-process with a TTL;
   Redis would let that cache be shared/invalidated across multiple
   backend instances instead of each instance polling MongoDB
   independently.

## Queue architecture
The reward-crediting path (wallet update + ledger write) is fast enough
to stay synchronous at this scale, but the **audit log** write is a good
candidate to move off the request's critical path: push audit events onto
a lightweight queue (BullMQ/Redis, or SQS/RabbitMQ) and have a worker
persist them, so a slow audit-log insert can never add latency to a
user-facing `/verify` or `/claim` call.

## Monitoring
Track, at minimum: `/verify` and `/claim` p95/p99 latency, error rate by
`code` (a spike in `CHALLENGE_ALREADY_COMPLETED` or
`CLAIM_ALREADY_PROCESSED` responses is itself a signal of replay/abuse
attempts), rate-limit rejection rate, and MongoDB connection pool
saturation.

## Fraud/risk signals
Beyond what's implemented (per-user rate limiting, user isolation,
single-use challenges), at scale it's worth adding: per-IP request
velocity (a user account being hit from many rotating IPs), a rolling
wrong/correct ratio per user (a bot brute-forcing options would show as
near-100% "wrong" attempts followed by a sudden correct if scripted), and
flagging accounts whose claim timing is suspiciously fast/regular
(sub-100ms every time suggests a script, not a human tapping a button).

## Database scaling
MongoDB Atlas can scale vertically (bigger cluster tier) well past this
volume before sharding is needed. If/when sharding is warranted, `userId`
is the natural shard key for `captchachallenges`, `gemtransactions`, and
`wallets`, since almost every query in this system is already scoped to
one user.

## API scaling
The Express API is stateless (JWT auth, no server-side sessions), so it
scales horizontally behind a load balancer with no code changes — this is
exactly why the rate limiter and challenge cache need to move to Redis
first (see above), since in-memory state doesn't survive across
instances.

## Reward reconciliation
Because every credit is backed by an immutable `gemtransactions` row with
`balanceBeforeMilliGems`/`balanceAfterMilliGems`, a nightly reconciliation
job can replay each user's ledger from `createdAt: 0` and assert the
running sum matches `wallets.balanceMilliGems` — catching any drift from a
bug or a manual database intervention before it compounds.
