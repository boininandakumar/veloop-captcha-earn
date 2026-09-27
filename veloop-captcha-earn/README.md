# VELoop Rewards — CAPTCHA Earn Module (MERN)

A full-stack implementation of the CAPTCHA Earn feature: users solve a
4-option code-matching challenge to earn Gems. **The frontend only
displays the experience — the backend owns every fact that matters**
(correct answer, result, reward amount, gem balance, claim eligibility).

## Architecture

```
React (Vite)  →  Express API  →  MongoDB (Mongoose)
```

- `frontend/` — React + Vite SPA, dark "premium fintech" UI matching the
  supplied design reference.
- `backend/` — Node/Express/MongoDB API. All CAPTCHA logic, reward
  calculation, wallet balance, and the transaction ledger live here.
- `docs/` — API, database, security, and testing documentation.
- `postman/` — a ready-to-import Postman collection covering the happy
  path and the required negative tests.

## Why the frontend can't cheat

- The correct answer (`correctOption`) is marked `select: false` in the
  Mongoose schema and is never included in any API response.
- `/captcha/verify` reads only `{ challengeId, selectedOption }` from the
  request body — any `reward` or `isCorrect` field a malicious client
  sends is discarded before it ever reaches the service layer.
- The Gem balance lives in MongoDB (`wallets` collection) and is only ever
  changed through an atomic `$inc` update inside `claimReward()`.
- Every reward is backed by an immutable ledger row (`gemtransactions`)
  with a **unique index** preventing a challenge from ever producing more
  than one reward, even under concurrent requests.

Full rationale: see [`docs/SECURITY.md`](docs/SECURITY.md).

## Reward flow (design decision)

The spec is slightly ambiguous about exactly when the Gem balance changes.
This implementation treats **verify** as *determining* the result and
reward amount (stored as `rewardStatus: "PENDING"` on the challenge), and
**claim** as the step that actually credits the wallet and writes the
ledger entry — mirroring the "Claim → Rewarded Ad → Reward completed"
flow in spec §36-37 and making the Claim button a real, idempotent
backend operation rather than a cosmetic one. "No Thanks" forfeits the
pending reward (`rewardStatus: "FORFEITED"`) and immediately issues a new
challenge.

## Getting started

### 1. Prerequisites
- Node.js 18+
- A MongoDB database — easiest is a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster (spec §72 says you must use your own, not VELoop's production DB)

### 2. Backend
```bash
cd backend
cp .env.example .env      # then fill in MONGO_URI and JWT_SECRET
npm install
npm run seed              # creates demo@veloop.test / Demo@12345 with 100 Gems
npm run dev                # http://localhost:5000
```

### 3. Frontend
```bash
cd frontend
cp .env.example .env       # VITE_API_BASE_URL=http://localhost:5000/api
npm install
npm run dev                 # http://localhost:5173
```

Log in with `demo@veloop.test` / `Demo@12345` and open **CAPTCHA Earn**.

## Testing
See [`docs/TESTING.md`](docs/TESTING.md) for the full list of required
positive/negative/concurrency tests, or import
`postman/VELoop-Captcha.postman_collection.json` into Postman and run
requests 1→11 in order (the first two requests auto-save your JWT and
challengeId as collection variables).

## Deployment
- **Frontend** → Vercel or Netlify (`npm run build`, publish `frontend/dist`)
- **Backend** → Render or Railway (`npm start`, set the same env vars as `.env.example`)
- **Database** → MongoDB Atlas

After deploying, update `VITE_API_BASE_URL` (frontend) and `CLIENT_ORIGIN`
(backend, for CORS) to point at each other's live URLs.

## Environment variables
See `backend/.env.example` and `frontend/.env.example`. **Never commit a
real `.env` file** — `.gitignore` already excludes them.

## What's intentionally out of scope
Per spec §49/§72, this does not claim to be "100% fraud-proof" and does
not use VELoop's production credentials, a real ad network, or bot/device
fingerprinting — see the closing note in `docs/SECURITY.md`.

## Scaling discussion (spec §96)
See [`docs/SCALING.md`](docs/SCALING.md) for the write-up on handling
100,000 CAPTCHA attempts/day.
