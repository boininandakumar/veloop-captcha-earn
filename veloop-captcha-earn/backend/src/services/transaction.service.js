const GemTransaction = require("../models/GemTransaction");

/**
 * Creates the ledger row for a reward. referenceId (challengeId) + type
 * has a UNIQUE index (see GemTransaction model), so if this is ever called
 * twice for the same challenge - e.g. two concurrent /verify requests that
 * both slipped past the challenge-status guard - the second insert throws
 * a duplicate-key error (code 11000) instead of silently double-crediting.
 * That error is caught by the caller and treated as "already rewarded".
 */
async function createGemTransaction(
  { userId, amountMilliGems, referenceId, balanceBeforeMilliGems, balanceAfterMilliGems },
  session
) {
  const [txn] = await GemTransaction.create(
    [
      {
        userId,
        amountMilliGems,
        type: "CAPTCHA_REWARD",
        source: "CAPTCHA_EARN",
        referenceId,
        balanceBeforeMilliGems,
        balanceAfterMilliGems,
        status: "COMPLETED",
      },
    ],
    { session }
  );
  return txn;
}

async function getHistory(userId, limit = 50) {
  return GemTransaction.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean();
}

module.exports = { createGemTransaction, getHistory };
