const CaptchaRewardConfig = require("../models/CaptchaRewardConfig");

let cachedConfig = null;
let cachedAt = 0;
const CACHE_TTL_MS = 30_000;

/**
 * Reads reward amounts from the database (CaptchaRewardConfig), not from
 * a hardcoded constant in a controller - so ops can change correct/wrong
 * reward values without a redeploy. Falls back to env vars / spec defaults
 * only if no config document exists yet (first boot before seeding).
 */
async function getConfig() {
  const now = Date.now();
  if (cachedConfig && now - cachedAt < CACHE_TTL_MS) return cachedConfig;

  let config = await CaptchaRewardConfig.findOne({ key: "default" }).lean();
  if (!config) {
    config = await CaptchaRewardConfig.create({
      key: "default",
      correctRewardMilliGems: Math.round(Number(process.env.CAPTCHA_CORRECT_REWARD || 1) * 1000),
      wrongRewardMilliGems: Math.round(Number(process.env.CAPTCHA_WRONG_REWARD || 0.5) * 1000),
      challengeExpirySeconds: Number(process.env.CAPTCHA_EXPIRY_SECONDS || 120),
      active: true,
    }).then((doc) => doc.toObject());
  }

  cachedConfig = config;
  cachedAt = now;
  return config;
}

/**
 * The ONLY place reward amount is decided. Never trust a `reward` field
 * from the client request body (spec section 25/52) - this function takes
 * only a boolean of whether the server-side comparison was correct.
 */
async function calculateReward(isCorrect) {
  const config = await getConfig();
  return isCorrect ? config.correctRewardMilliGems : config.wrongRewardMilliGems;
}

module.exports = { getConfig, calculateReward };
