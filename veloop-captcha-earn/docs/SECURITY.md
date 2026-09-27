# Security Documentation

## 1. Frontend reward manipulation
The frontend never computes, stores, or sends a reward amount. `POST
/captcha/verify` accepts only `{ challengeId, selectedOption }` —
`captchaController.verify` destructures exactly those two fields, so a
`reward: 100000` in the body is simply never read (`src/controllers/
captchaController.js`).

## 2. Correct-answer exposure
`CaptchaChallenge.correctOption` is `select: false` in the schema, so it is
excluded from every default Mongoose query. The one place it's needed
(`captcha.service.verifyChallenge`) explicitly `.select("+correctOption")`s
it, uses it only in a server-side comparison, and it is never attached to
any response object (`toSafeJSON()` never includes it).

## 3. Replay attacks (same challenge submitted twice)
`verifyChallenge` performs the ACTIVE→COMPLETED transition as a single
atomic `findOneAndUpdate` filtered on `status: "ACTIVE"`. A second `/verify`
call for the same `challengeId` finds no matching document to update and is
rejected with `CHALLENGE_ALREADY_COMPLETED` — this also closes the
concurrent-request race described below.

## 4. Duplicate rewards
Two independent layers:
1. The atomic `ACTIVE → COMPLETED` transition above ensures at most one
   request can ever compute and store a reward for a challenge.
2. `GemTransaction` has a **unique index** on `(referenceId, type)`. Even if
   a future code path bypassed layer 1, a second insert for the same
   challenge throws a MongoDB duplicate-key error, which `claimReward`
   catches and turns into a wallet-credit rollback + `CLAIM_ALREADY_PROCESSED`.

## 5. Challenge theft / cross-user access
Every challenge stores `userId` from the authenticated JWT at creation
time (never from a request body). `verifyChallenge` and `claimReward` both
compare `challenge.userId` to `req.userId` (from `requireAuth`, itself
derived only from the verified JWT signature) and return `403 FORBIDDEN` +
an `AuditLog` entry (`SUSPICIOUS_REQUEST`) on mismatch.

## 6. User impersonation
`requireAuth` derives `req.userId` exclusively from `jwt.verify(token,
JWT_SECRET).sub`. No route ever reads a `userId` from `req.body`,
`req.params`, or `req.query` to decide whose data to act on.

## 7. API abuse / rate limiting
`express-rate-limit` is applied to `/captcha/current`, `/new`, `/verify`,
`/claim`, keyed by `req.userId` (falls back to IP for unauthenticated
requests). Defaults: 30 requests / 60s per user — tune via
`RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MS`.

## 8. Race conditions (concurrent verify / concurrent claim)
- **Verify race:** see #3 — the atomic status transition means only one of
  two simultaneous `/verify` calls can succeed.
- **Claim race:** `claimReward` atomically flips `rewardStatus: "PENDING" →
  "CLAIMED"` via `findOneAndUpdate`. A second, third, Nth simultaneous
  `/claim` call finds `rewardStatus` no longer `"PENDING"` and is rejected
  with `409 CLAIM_ALREADY_PROCESSED` before it ever touches the wallet.
- Wallet credits themselves use `$inc` via `findOneAndUpdate`, which
  MongoDB executes as a single atomic document operation.

## 9. Expired-challenge reuse
`verifyChallenge` checks `status !== "ACTIVE" || expiresAt <= now` before
doing anything else, and the atomic transition additionally filters on
`expiresAt: { $gt: now }` so a challenge that expires in the split second
between the check and the update still can't be completed.

## 10. Fractional Gem precision
Wrong answers award `0.5` Gem. Instead of storing floating point gem
values (subject to binary floating-point drift after many additions), the
wallet and every ledger row store **integer milli-gems** (`gems × 1000`).
Conversion to a decimal happens only at the API response boundary
(`Wallet.toGems()`).

## What this system does NOT claim
Per spec §49, this is not presented as "100% fraud proof." It does not
include device fingerprinting, CAPTCHA-solving-bot detection, or IP
reputation scoring — those are out of scope for an internship-level
implementation and are called out as future work in the README.
