const Wallet = require("../models/Wallet");

async function getOrCreateWallet(userId, session) {
  let wallet = await Wallet.findOne({ userId }).session(session || null);
  if (!wallet) {
    wallet = await Wallet.create([{ userId, balanceMilliGems: 0 }], { session }).then((r) => r[0]);
  }
  return wallet;
}

async function getBalance(userId) {
  const wallet = await getOrCreateWallet(userId);
  return wallet.toGems();
}

/**
 * Atomically increments a wallet balance and returns {before, after} in
 * milli-gems. Uses findOneAndUpdate with $inc, which MongoDB executes as a
 * single atomic document operation - this is what prevents the "two
 * simultaneous /verify calls -> +2 Gems instead of +1" race condition
 * described in spec section 51, independent of whether a multi-document
 * transaction is also used.
 */
async function creditWallet(userId, amountMilliGems, session) {
  const before = await Wallet.findOne({ userId }).session(session || null);
  const beforeAmount = before ? before.balanceMilliGems : 0;

  const updated = await Wallet.findOneAndUpdate(
    { userId },
    { $inc: { balanceMilliGems: amountMilliGems }, $setOnInsert: { userId } },
    { new: true, upsert: true, session }
  );

  return { before: beforeAmount, after: updated.balanceMilliGems };
}

module.exports = { getOrCreateWallet, getBalance, creditWallet };
