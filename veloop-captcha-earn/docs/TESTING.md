# Testing Documentation

Use the provided Postman collection (`postman/VELoop-Captcha.postman_collection.json`)
or curl. Steps assume the backend is running locally on `:5000` and you've
run `npm run seed` once.

For each case: **request**, **expected response**, and what to screenshot
for submission.

## 1. Login
`POST /api/auth/login` with the seeded demo user → `200` + JWT. Save the
token as a Postman collection variable `{{token}}` (the collection does
this automatically via a test script on the Login request).

## 2. Get current challenge
`GET /api/captcha/current` → `200`, challenge JSON with `options.length === 4`
and no `correctOption` field anywhere in the response body.

## 3. Correct answer
Submit the option that matches `captchaText` exactly →
`POST /api/captcha/verify` → `200`, `result: "CORRECT"`, `reward.amount: 1`.

## 4. Wrong answer
Get a new challenge, submit any non-matching option → `200`,
`result: "WRONG"`, `reward.amount: 0.5`.

## 5. Claim
`POST /api/captcha/claim` after a correct verify → `200`, `claimed: true`,
`balance` increased by the reward amount. Confirm in MongoDB Compass /
`mongosh` that `wallets.balanceMilliGems` and a new `gemtransactions` row
both reflect the change.

## 6. Duplicate claim
Immediately repeat step 5 with the same `challengeId` → `409
CLAIM_ALREADY_PROCESSED`, balance unchanged.

## 7. Duplicate verification
Repeat step 3/4's `/verify` call with the same `challengeId` → `409
CHALLENGE_ALREADY_COMPLETED`.

## 8. Expired challenge
Temporarily set `CAPTCHA_EXPIRY_SECONDS=5` in `.env`, request a challenge,
wait 6+ seconds, then `/verify` → `410 CHALLENGE_EXPIRED`.

## 9. Fake reward / fake isCorrect
`POST /api/captcha/verify` with body
`{ "challengeId": "...", "selectedOption": "...", "reward": 100000, "isCorrect": true }`
→ response `reward.amount` is still the configured `1` or `0.5`, proving
the extra fields were ignored.

## 10. Cross-user challenge access
Log in as a second user (register a new account), then try to
`/verify`/`/claim` the first user's `challengeId` → `403 FORBIDDEN`.

## 11. Concurrent requests
Fire two `/verify` requests for the same `challengeId` at the same time
(Postman Runner, or two terminal `curl`s launched together with `&`) →
exactly one succeeds with a result, the other gets `409
CHALLENGE_ALREADY_COMPLETED`. Repeat the same pattern for `/claim` →
exactly one `200`, others `409`. Confirm in MongoDB that only one
`gemtransactions` row exists for that `challengeId`.

## 12. Unauthorized request
Call any `/captcha/*` route without an `Authorization` header → `401
NO_TOKEN`.

## 13. Rate limit
Script ~40 rapid requests to `/api/captcha/current` within a minute (below
the default 30/min limit fails the rest) → later requests return `429
RATE_LIMITED`.

For the submission, capture a screenshot (or terminal output) of each
numbered case's response, plus one MongoDB Compass screenshot each of:
`captchachallenges`, `gemtransactions`, and `wallets` after a full
correct → claim cycle.

---

# Test Results (Postman, run on 2026-10-05)

| # | Test | Request | Result | Screenshot |
|---|------|---------|--------|------------|
| 1 | Login | POST /api/auth/login | 200 OK, JWT token returned | ![](screenshots/01-login.png) |
| 2 | Get challenge | GET /api/captcha/current | 200 OK, 4 options and `captchaImage`, no `correctOption` | ![](screenshots/02-get-challenge.png) |
| 3 | Wrong answer | POST /api/captcha/verify | 200 OK, `result: WRONG`, reward 0.5 | ![](screenshots/03-wrong-answer.png) |
| 4 | Claim | POST /api/captcha/claim | 200 OK, `claimed: true`, balance 106 → 106.5 | ![](screenshots/04-claim.png) |
| 5 | Duplicate claim | POST /api/captcha/claim | 409 `CLAIM_ALREADY_PROCESSED` | ![](screenshots/05-duplicate-claim.png) |
| 6 | Duplicate verify | POST /api/captcha/verify | 409 `CHALLENGE_ALREADY_COMPLETED` | ![](screenshots/06-duplicate-verify.png) |
| 7 | Expired challenge | POST /api/captcha/verify | 410 `CHALLENGE_EXPIRED` | ![](screenshots/07-expired.png) |
| 8 | Option not in challenge | POST /api/captcha/verify | 400 `INVALID_OPTION` | ![](screenshots/08-invalid-option.png) |
| 9 | Fake reward / fake isCorrect | POST /api/captcha/verify | 200 OK, reward is only the real 0.5 (fake 100000 ignored) | ![](screenshots/09-fake-reward.png) |
| 10 | Gem balance | GET /api/wallet/gems | 200 OK, balance 106.5 | ![](screenshots/10-balance.png) |
| 11 | History | GET /api/captcha/history | 200 OK, list of past challenges | ![](screenshots/11-history.png) |
| 12 | Unauthorized | GET /api/captcha/current (no token) | 401 `NO_TOKEN` | ![](screenshots/12-unauthorized.png) |

The correct-answer case (+1 Gem) was tested in the app UI (balance 105 → 106).
# Test Results (Postman, run on 2026-10-05)

Every result below is the real response copied from Postman.

## 1. Login: `POST /api/auth/login` → 200 OK
```json
{ "success": true, "token": "eyJhbGciOiJIUzI1NiIs... (shortened)", "user": { "email": "demo@veloop.test", "name": "Demo User" } }
```

## 2. Get challenge: `GET /api/captcha/current` → 200 OK
The response has 4 options and a `captchaImage`. There is no `correctOption` anywhere.
```json
{ "success": true, "challenge": { "challengeId": "CAP-C46E492B3D", "captchaImage": "data:image/svg+xml;utf8,... (shortened)", "options": ["M4VXMP", "M4VXMR", "MAVKMR", "MAVXMR"], "status": "ACTIVE", "result": null, "rewardStatus": "NONE" } }
```

## 3. Expired challenge: `POST /api/captcha/verify` → 410
```json
{ "success": false, "code": "CHALLENGE_EXPIRED", "message": "Challenge expired. Please continue with a new CAPTCHA." }
```

## 4. Option that is not part of the challenge: `POST /api/captcha/verify` → 400
```json
{ "success": false, "code": "INVALID_OPTION", "message": "Selected option is not part of this challenge." }
```

## 5. Claim: `POST /api/captcha/claim` → 200 OK
The answer was wrong, so the reward is 0.5 Gem. The balance went from 106 to 106.5.
```json
{ "success": true, "challengeId": "CAP-794D7F5B98", "claimed": true, "reward": { "currency": "GEMS", "amount": 0.5 }, "balance": 106.5 }
```

## 6. Duplicate claim: `POST /api/captcha/claim` → 409
```json
{ "success": false, "code": "CLAIM_ALREADY_PROCESSED", "message": "This reward has already been claimed or is not claimable." }
```

## 7. Duplicate verification: `POST /api/captcha/verify` → 409
```json
{ "success": false, "code": "CHALLENGE_ALREADY_COMPLETED", "message": "This CAPTCHA has already been completed." }
```

## 8. Fake reward / fake isCorrect: `POST /api/captcha/verify` → 200 OK
The request body contained `"isCorrect": true` and `"reward": 100000`. The server ignored both. In the history, this challenge (`CAP-4A3384837A`) shows `result: WRONG` and `reward: 0.5`, which are the real server values.

## 9. Gem balance: `GET /api/wallet/gems` → 200 OK
```json
{ "success": true, "currency": "GEMS", "balance": 106.5 }
```

## 10. History: `GET /api/captcha/history` → 200 OK
The first entries are shown here. The full list also has CLAIMED, FORFEITED and EXPIRED challenges.
```json
{ "success": true, "history": [
  { "challengeId": "CAP-4A3384837A", "result": "WRONG", "reward": 0.5, "rewardStatus": "PENDING", "status": "COMPLETED" },
  { "challengeId": "CAP-794D7F5B98", "result": "WRONG", "reward": 0.5, "rewardStatus": "CLAIMED", "status": "COMPLETED" }
] }
```

## 11. Unauthorized request (no token): `GET /api/captcha/current` → 401
```json
{ "success": false, "code": "NO_TOKEN", "message": "Authentication required." }
```

## Correct answer
Tested in the app UI. The correct answer gives +1 Gem, and the balance went from 105 to 106, and later from 106.50 to 107.50 (see the demo video).

## Still to be tested
Cross-user access (403), concurrent requests, and the rate limit (429).