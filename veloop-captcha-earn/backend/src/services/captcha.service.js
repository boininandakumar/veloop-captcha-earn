const crypto = require("crypto");
const CaptchaChallenge = require("../models/CaptchaChallenge");
const { buildChallenge } = require("../utils/generateCaptcha");
const rewardService = require("./reward.service");
const walletService = require("./wallet.service");
const transactionService = require("./transaction.service");
const audit = require("./audit.service");

class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function newChallengeId() {
  return `CAP-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
}

/**
 * Invalidates any dangling ACTIVE challenge(s) for a user before issuing a
 * new one, so a stale challengeId from an old tab can never be replayed
 * (spec sections 34/35: "old CAPTCHA data discarded, new challenge
 * generated"). Uses updateMany so this is safe even if more than one
 * ACTIVE row exists due to a past bug/edge case.
 */
async function discardActiveChallenges(userId) {
  await CaptchaChallenge.updateMany(
    { userId, status: "ACTIVE" },
    { $set: { status: "DISCARDED" } }
  );
}

async function createChallenge(userId) {
  await discardActiveChallenges(userId);

  const config = await rewardService.getConfig();
  const { captchaText, correctOption, options } = buildChallenge();
  const expiresAt = new Date(Date.now() + config.challengeExpirySeconds * 1000);

  const challenge = await CaptchaChallenge.create({
    challengeId: newChallengeId(),
    userId,
    captchaText,
    options,
    correctOption,
    status: "ACTIVE",
    expiresAt,
  });

  await audit.log("CHALLENGE_CREATED", { userId, referenceId: challenge.challengeId });
  return challenge;
}

/**
 * GET /api/captcha/current - reuses an existing non-expired ACTIVE
 * challenge if one exists (so refreshing the page doesn't burn a new
 * CAPTCHA every time), otherwise issues a fresh one.
 */
async function getCurrentChallenge(userId) {
  const existing = await CaptchaChallenge.findOne({ userId, status: "ACTIVE" });

  if (existing && existing.expiresAt > new Date()) {
    return existing;
  }

  if (existing && existing.expiresAt <= new Date()) {
    existing.status = "EXPIRED";
    await existing.save();
    await audit.log("EXPIRED_CHALLENGE", { userId, referenceId: existing.challengeId });
  }

  return createChallenge(userId);
}

async function forceNewChallenge(userId) {
  return createChallenge(userId);
}

/**
 * POST /api/captcha/verify
 *
 * This is the security-critical path. The request body must contain ONLY
 * { challengeId, selectedOption } - the controller strips everything else
 * before calling this function, so a client-supplied `reward` or
 * `isCorrect` field can never reach this logic (spec sections 26/27/52/53).
 */
async function verifyChallenge({ userId, challengeId, selectedOption }, ip) {
  // select("+correctOption") because the schema marks it select:false by default.
  const challenge = await CaptchaChallenge.findOne({ challengeId }).select("+correctOption");

  if (!challenge) {
    throw new ApiError(404, "CHALLENGE_NOT_FOUND", "This CAPTCHA challenge does not exist.");
  }

  if (String(challenge.userId) !== String(userId)) {
    await audit.log("SUSPICIOUS_REQUEST", {
      userId,
      referenceId: challengeId,
      metadata: { reason: "cross_user_challenge_access" },
      ip,
    });
    throw new ApiError(403, "FORBIDDEN", "This challenge does not belong to your account.");
  }

  if (challenge.status === "COMPLETED") {
    await audit.log("DUPLICATE_ATTEMPT", { userId, referenceId: challengeId, ip });
    throw new ApiError(409, "CHALLENGE_ALREADY_COMPLETED", "This CAPTCHA has already been completed.");
  }

  if (challenge.status !== "ACTIVE" || challenge.expiresAt <= new Date()) {
    if (challenge.status === "ACTIVE") {
      challenge.status = "EXPIRED";
      await challenge.save();
    }
    await audit.log("EXPIRED_CHALLENGE", { userId, referenceId: challengeId, ip });
    throw new ApiError(410, "CHALLENGE_EXPIRED", "Challenge expired. Please continue with a new CAPTCHA.");
  }

  if (!challenge.options.includes(selectedOption)) {
    await audit.log("INVALID_ATTEMPT", { userId, referenceId: challengeId, ip, metadata: { selectedOption } });
    throw new ApiError(400, "INVALID_OPTION", "Selected option is not part of this challenge.");
  }

  // --- Atomic status transition: this single findOneAndUpdate is the
  // concurrency guard for "two simultaneous /verify calls" (spec section
  // 51). Only the request that actually flips ACTIVE -> COMPLETED
  // proceeds to grant a reward; a losing concurrent request gets
  // modifiedCount effectively 0 / matched:null and is rejected below.
  const claimedForVerification = await CaptchaChallenge.findOneAndUpdate(
    { challengeId, userId, status: "ACTIVE", expiresAt: { $gt: new Date() } },
    { $set: { status: "COMPLETED", selectedOption, completedAt: new Date() } },
    { new: true }
  );

  if (!claimedForVerification) {
    // Someone else (or a racing duplicate request) already completed it
    // a moment ago.
    await audit.log("DUPLICATE_ATTEMPT", { userId, referenceId: challengeId, ip });
    throw new ApiError(409, "CHALLENGE_ALREADY_COMPLETED", "This CAPTCHA has already been completed.");
  }

  const isCorrect = selectedOption === challenge.correctOption;
  const rewardAmountMilliGems = await rewardService.calculateReward(isCorrect);

  claimedForVerification.result = isCorrect ? "CORRECT" : "WRONG";
  claimedForVerification.rewardAmountMilliGems = rewardAmountMilliGems;
  claimedForVerification.rewardStatus = "PENDING";
  await claimedForVerification.save();

  await audit.log("CHALLENGE_VERIFIED", {
    userId,
    referenceId: challengeId,
    metadata: { result: claimedForVerification.result },
    ip,
  });
  await audit.log("REWARD_CREATED", {
    userId,
    referenceId: challengeId,
    metadata: { amountMilliGems: rewardAmountMilliGems },
    ip,
  });

  return claimedForVerification;
}

/**
 * POST /api/captcha/claim
 *
 * Actually mints the pending reward into the user's wallet. The
 * findOneAndUpdate below atomically flips rewardStatus PENDING -> CLAIMED;
 * if the user double/triple-clicks Claim, only the first request wins that
 * transition and every later one is rejected before it can touch the
 * wallet (spec section 31: claim idempotency). The GemTransaction unique
 * index on (referenceId, type) is a second, independent guard in case of
 * any future code path that bypasses this function.
 */
async function claimReward({ userId, challengeId }, ip) {
  const challenge = await CaptchaChallenge.findOne({ challengeId });

  if (!challenge) {
    throw new ApiError(404, "CHALLENGE_NOT_FOUND", "This CAPTCHA challenge does not exist.");
  }
  if (String(challenge.userId) !== String(userId)) {
    await audit.log("SUSPICIOUS_REQUEST", {
      userId,
      referenceId: challengeId,
      metadata: { reason: "cross_user_claim_attempt" },
      ip,
    });
    throw new ApiError(403, "FORBIDDEN", "This challenge does not belong to your account.");
  }
  if (challenge.status !== "COMPLETED") {
    throw new ApiError(400, "CHALLENGE_NOT_COMPLETED", "This challenge has not been verified yet.");
  }

  const atomicClaim = await CaptchaChallenge.findOneAndUpdate(
    { challengeId, userId, rewardStatus: "PENDING" },
    { $set: { rewardStatus: "CLAIMED", claimedAt: new Date() } },
    { new: true }
  );

  if (!atomicClaim) {
    await audit.log("DUPLICATE_ATTEMPT", { userId, referenceId: challengeId, ip, metadata: { action: "claim" } });
    throw new ApiError(409, "CLAIM_ALREADY_PROCESSED", "This reward has already been claimed or is not claimable.");
  }

  const { before, after } = await walletService.creditWallet(userId, atomicClaim.rewardAmountMilliGems);

  try {
    await transactionService.createGemTransaction({
      userId,
      amountMilliGems: atomicClaim.rewardAmountMilliGems,
      referenceId: challengeId,
      balanceBeforeMilliGems: before,
      balanceAfterMilliGems: after,
    });
  } catch (err) {
    if (err.code === 11000) {
      // Ledger already has an entry for this challengeId - a previous
      // request already credited it. We already flipped rewardStatus
      // atomically above so this should be unreachable, but if it ever
      // happens we must NOT double count: roll the wallet credit back.
      await walletService.creditWallet(userId, -atomicClaim.rewardAmountMilliGems);
      throw new ApiError(409, "CLAIM_ALREADY_PROCESSED", "This reward has already been claimed.");
    }
    throw err;
  }

  await audit.log("REWARD_CLAIMED", {
    userId,
    referenceId: challengeId,
    metadata: { amountMilliGems: atomicClaim.rewardAmountMilliGems },
    ip,
  });

  return { challenge: atomicClaim, balanceAfterMilliGems: after };
}

/**
 * "No Thanks" - the user forfeits a pending reward instead of claiming it.
 * The challenge is already COMPLETED/immutable; we just mark the reward
 * as forfeited so it can never later be claimed, and the frontend should
 * follow this up with GET/POST /captcha/new for a fresh challenge.
 */
async function forfeitReward({ userId, challengeId }) {
  const result = await CaptchaChallenge.findOneAndUpdate(
    { challengeId, userId, rewardStatus: "PENDING" },
    { $set: { rewardStatus: "FORFEITED" } },
    { new: true }
  );
  if (!result) {
    throw new ApiError(409, "NOT_CLAIMABLE", "This reward is not in a claimable/forfeitable state.");
  }
  return result;
}

async function getHistory(userId, limit = 50) {
  const rows = await CaptchaChallenge.find({
    userId,
    status: { $in: ["COMPLETED", "EXPIRED"] },
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select("challengeId result rewardAmountMilliGems rewardStatus status createdAt completedAt")
    .lean();

  return rows.map((r) => ({
    challengeId: r.challengeId,
    date: r.completedAt || r.createdAt,
    result: r.result,
    reward: r.rewardAmountMilliGems / 1000,
    rewardStatus: r.rewardStatus,
    status: r.status,
  }));
}

module.exports = {
  ApiError,
  getCurrentChallenge,
  forceNewChallenge,
  verifyChallenge,
  claimReward,
  forfeitReward,
  getHistory,
};
