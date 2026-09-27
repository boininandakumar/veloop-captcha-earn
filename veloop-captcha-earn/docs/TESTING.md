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
