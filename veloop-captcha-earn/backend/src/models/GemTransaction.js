const mongoose = require("mongoose");

const gemTransactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    amountMilliGems: { type: Number, required: true },
    type: { type: String, enum: ["CAPTCHA_REWARD"], default: "CAPTCHA_REWARD" },
    source: { type: String, default: "CAPTCHA_EARN" },
    referenceId: { type: String, required: true, index: true }, // challengeId
    balanceBeforeMilliGems: { type: Number, required: true },
    balanceAfterMilliGems: { type: Number, required: true },
    status: { type: String, enum: ["COMPLETED", "FAILED"], default: "COMPLETED" },
  },
  { timestamps: true }
);

// One completed ledger entry per challenge claim - this unique index is
// what actually makes claim idempotent under concurrent requests, not
// just the challenge.rewardStatus flag (belt + suspenders, see claim flow).
gemTransactionSchema.index({ referenceId: 1, type: 1 }, { unique: true });

module.exports = mongoose.model("GemTransaction", gemTransactionSchema);
