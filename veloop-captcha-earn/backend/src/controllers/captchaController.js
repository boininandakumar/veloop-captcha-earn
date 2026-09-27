const captchaService = require("../services/captcha.service");
const rewardService = require("../services/reward.service");

function getClientIp(req) {
  return req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress;
}

// GET /api/captcha/current
async function getCurrent(req, res) {
  const challenge = await captchaService.getCurrentChallenge(req.userId);
  res.json({ success: true, challenge: challenge.toSafeJSON() });
}

// POST /api/captcha/new
async function forceNew(req, res) {
  const challenge = await captchaService.forceNewChallenge(req.userId);
  res.json({ success: true, challenge: challenge.toSafeJSON() });
}

// POST /api/captcha/verify
// SECURITY: only challengeId and selectedOption are ever read from the
// body. Any `reward`, `isCorrect`, or `userId` the client sends is
// silently discarded here - never passed down to the service layer
// (spec sections 25-27, 52-53).
async function verify(req, res) {
  const { challengeId, selectedOption } = req.body;

  if (!challengeId || typeof selectedOption !== "string") {
    return res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: "challengeId and selectedOption are required.",
    });
  }

  const challenge = await captchaService.verifyChallenge(
    { userId: req.userId, challengeId, selectedOption },
    getClientIp(req)
  );

  res.json({
    success: true,
    result: challenge.result,
    reward: {
      currency: "GEMS",
      amount: challenge.rewardAmountMilliGems / 1000,
    },
    rewardStatus: challenge.rewardStatus,
    challengeId: challenge.challengeId,
  });
}

// POST /api/captcha/claim
async function claim(req, res) {
  const { challengeId } = req.body;
  if (!challengeId) {
    return res.status(400).json({ success: false, code: "VALIDATION_ERROR", message: "challengeId is required." });
  }

  const { challenge, balanceAfterMilliGems } = await captchaService.claimReward(
    { userId: req.userId, challengeId },
    getClientIp(req)
  );

  res.json({
    success: true,
    challengeId: challenge.challengeId,
    claimed: true,
    reward: { currency: "GEMS", amount: challenge.rewardAmountMilliGems / 1000 },
    balance: balanceAfterMilliGems / 1000,
  });
}

// POST /api/captcha/no-thanks
async function noThanks(req, res) {
  const { challengeId } = req.body;
  if (!challengeId) {
    return res.status(400).json({ success: false, code: "VALIDATION_ERROR", message: "challengeId is required." });
  }
  await captchaService.forfeitReward({ userId: req.userId, challengeId });
  const nextChallenge = await captchaService.forceNewChallenge(req.userId);
  res.json({ success: true, challenge: nextChallenge.toSafeJSON() });
}

// GET /api/captcha/config  (public-safe reward config, no correct answers)
async function getPublicConfig(req, res) {
  const config = await rewardService.getConfig();
  res.json({
    success: true,
    currency: config.currency,
    correctReward: config.correctRewardMilliGems / 1000,
    wrongReward: config.wrongRewardMilliGems / 1000,
    challengeExpirySeconds: config.challengeExpirySeconds,
  });
}

module.exports = { getCurrent, forceNew, verify, claim, noThanks, getPublicConfig };
