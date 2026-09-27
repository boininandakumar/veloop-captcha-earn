# API Documentation — VELoop CAPTCHA Earn

Base URL (local): `http://localhost:5000/api`

All CAPTCHA/wallet routes require `Authorization: Bearer <JWT>` obtained from
`POST /auth/login`.

---

## Auth

### POST /auth/register
Request:
```json
{ "email": "demo@veloop.test", "password": "Demo@12345", "name": "Demo User" }
```
Response `201`:
```json
{ "success": true, "token": "<jwt>", "user": { "id": "...", "email": "...", "name": "..." } }
```

### POST /auth/login
Request: `{ "email": "...", "password": "..." }`
Response `200`: same shape as register.
Errors: `401 INVALID_CREDENTIALS`

### GET /auth/me
Auth required. Returns the current user's profile.

---

## CAPTCHA

### GET /api/captcha/current
Auth required. Returns the user's active (non-expired) challenge, creating
one if none exists.

Response:
```json
{
  "success": true,
  "challenge": {
    "challengeId": "CAP-92831",
    "captchaText": "A7K2P9",
    "options": ["A7K2P9", "AJK29P", "A7L9P2", "X4M8Q1"],
    "status": "ACTIVE",
    "result": null,
    "rewardStatus": "NONE",
    "expiresAt": "2026-09-27T10:32:00.000Z"
  }
}
```
`correctOption` is never present in this response.

### POST /api/captcha/new
Auth required. Discards any active challenge and issues a fresh one. Same
response shape as `current`.

### POST /api/captcha/verify
Auth required. Body: `{ "challengeId": "CAP-92831", "selectedOption": "A7K2P9" }`

Only these two fields are read — any `reward` / `isCorrect` field sent by
a client is ignored server-side.

Response `200`:
```json
{
  "success": true,
  "result": "CORRECT",
  "reward": { "currency": "GEMS", "amount": 1 },
  "rewardStatus": "PENDING",
  "challengeId": "CAP-92831"
}
```

Errors:
| Code | Status | Meaning |
|---|---|---|
| `CHALLENGE_NOT_FOUND` | 404 | Unknown challengeId |
| `FORBIDDEN` | 403 | Challenge belongs to a different user |
| `CHALLENGE_ALREADY_COMPLETED` | 409 | Challenge already verified once |
| `CHALLENGE_EXPIRED` | 410 | Past `expiresAt` |
| `INVALID_OPTION` | 400 | `selectedOption` not one of the 4 options |
| `VALIDATION_ERROR` | 400 | Missing fields |

### POST /api/captcha/claim
Auth required. Body: `{ "challengeId": "CAP-92831" }`

Mints the pending reward into the wallet and writes a ledger entry.
Response:
```json
{
  "success": true,
  "challengeId": "CAP-92831",
  "claimed": true,
  "reward": { "currency": "GEMS", "amount": 1 },
  "balance": 101
}
```
Errors: `CHALLENGE_NOT_COMPLETED` (400), `CLAIM_ALREADY_PROCESSED` (409),
`FORBIDDEN` (403), `CHALLENGE_NOT_FOUND` (404)

### POST /api/captcha/no-thanks
Auth required. Body: `{ "challengeId": "CAP-92831" }`
Forfeits a pending reward and immediately returns a brand-new challenge
(same response shape as `current`).

### GET /api/captcha/history
Auth required. Returns the user's own completed/expired challenges only.
```json
{ "success": true, "history": [ { "challengeId": "...", "date": "...", "result": "CORRECT", "reward": 1, "rewardStatus": "CLAIMED", "status": "COMPLETED" } ] }
```

### GET /api/captcha/config
Public. Returns the current (non-secret) reward configuration:
```json
{ "success": true, "currency": "GEMS", "correctReward": 1, "wrongReward": 0.5, "challengeExpirySeconds": 120 }
```

---

## Wallet

### GET /api/wallet/gems
Auth required. `{ "success": true, "currency": "GEMS", "balance": 101 }`

---

## Standard error shape
```json
{ "success": false, "code": "SOME_CODE", "message": "Human readable message." }
```
