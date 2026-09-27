# Database Documentation

MongoDB via Mongoose. Suggested database name: `veloop_captcha`.

## Collections

### users
| Field | Type | Notes |
|---|---|---|
| email | String | unique, lowercase |
| passwordHash | String | bcrypt, never returned by API |
| name | String | |

### wallets
| Field | Type | Notes |
|---|---|---|
| userId | ObjectId → User | unique (one wallet per user) |
| balanceMilliGems | Number | **Balance stored as integer milli-gems (gems × 1000)** to avoid floating-point drift from the 0.5-Gem wrong-answer reward (see spec §78). Converted to a decimal at the API boundary only. |

### captchachallenges
| Field | Type | Notes |
|---|---|---|
| challengeId | String | unique, public ID e.g. `CAP-92831` |
| userId | ObjectId → User | indexed |
| captchaText | String | the visible code, e.g. `A7K2P9` |
| options | [String] | exactly 4, one of which equals `correctOption` |
| correctOption | String | **`select: false`** at schema level — never returned by a default query, and stripped again by `toSafeJSON()` as defense in depth |
| status | enum | `ACTIVE` \| `COMPLETED` \| `EXPIRED` \| `DISCARDED` |
| selectedOption | String | set once, at verify time |
| result | enum | `CORRECT` \| `WRONG` \| null |
| rewardAmountMilliGems | Number | decided server-side only |
| rewardStatus | enum | `NONE` \| `PENDING` \| `CLAIMED` \| `FORFEITED` |
| expiresAt | Date | indexed |
| completedAt / claimedAt | Date | |

Indexes: `{ challengeId: 1 } unique`, `{ userId: 1, status: 1 }`, `{ expiresAt: 1 }`.

### gemtransactions (ledger)
| Field | Type | Notes |
|---|---|---|
| userId | ObjectId → User | |
| amountMilliGems | Number | |
| type | enum | `CAPTCHA_REWARD` |
| referenceId | String | the challengeId this reward came from |
| balanceBeforeMilliGems / balanceAfterMilliGems | Number | snapshot for audit trail |
| status | enum | `COMPLETED` \| `FAILED` |

**Index: `{ referenceId: 1, type: 1 } unique`** — this is the hard database-level
guarantee that a given challenge can only ever produce one reward
transaction, independent of any application-level race condition.

### captcharewardconfigs
Single-document config (`key: "default"`): `correctRewardMilliGems`,
`wrongRewardMilliGems`, `currency`, `challengeExpirySeconds`, `active`.
Read through a small in-memory TTL cache in `reward.service.js` so it isn't
re-queried on every request, but can still be changed without a redeploy.

### auditlogs
Append-only log of security-relevant events: `CHALLENGE_CREATED`,
`CHALLENGE_VERIFIED`, `REWARD_CREATED`, `REWARD_CLAIMED`,
`DUPLICATE_ATTEMPT`, `INVALID_ATTEMPT`, `EXPIRED_CHALLENGE`,
`SUSPICIOUS_REQUEST`.

## Why not `CaptchaAttempt` as a separate collection?
The spec allows combining `CaptchaAttempt` and `CaptchaChallenge` (§38) if it
fits the architecture better. Since each challenge can only ever be
attempted once (single-use, enforced by the `ACTIVE → COMPLETED` atomic
transition), the attempt fields (`selectedOption`, `result`, `rewardAmount`)
were folded directly into `CaptchaChallenge` to avoid an unnecessary join —
this is documented here so the choice is explicit and intentional rather
than an oversight.
