const mongoose = require("mongoose");

const STATUS = ["ACTIVE", "COMPLETED", "EXPIRED", "DISCARDED"];
const RESULT = ["CORRECT", "WRONG", null];
const REWARD_STATUS = ["NONE", "PENDING", "CLAIMED", "FORFEITED"];

const captchaChallengeSchema = new mongoose.Schema(
  {
    challengeId: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    captchaText: { type: String, required: true },
    options: { type: [String], required: true, validate: (v) => v.length === 4 },
    // NEVER returned by any serializer / API response - see toSafeJSON below.
    correctOption: { type: String, required: true, select: false },

    status: { type: String, enum: STATUS, default: "ACTIVE", index: true },
    selectedOption: { type: String, default: null },
    result: { type: String, enum: REWARD_STATUS ? RESULT : RESULT, default: null },

    rewardAmountMilliGems: { type: Number, default: 0 },
    rewardStatus: { type: String, enum: REWARD_STATUS, default: "NONE" },

    expiresAt: { type: Date, required: true, index: true },
    completedAt: { type: Date, default: null },
    claimedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// A user should not be able to have unlimited dangling ACTIVE challenges;
// helps "GET /current" reuse logic and is good practice, not a hard lock.
captchaChallengeSchema.index({ userId: 1, status: 1 });

/**
 * Strips server-only-authoritative fields before anything is sent to the
 * client. correctOption is already `select: false` at the schema level
 * (defense in depth #1); this is defense in depth #2 for any place a
 * document might get serialized directly.
 */
captchaChallengeSchema.methods.toSafeJSON = function () {
  return {
    challengeId: this.challengeId,
    captchaText: this.captchaText,
    options: this.options,
    status: this.status,
    result: this.result,
    reward:
      this.result != null
        ? { currency: "GEMS", amount: this.rewardAmountMilliGems / 1000 }
        : undefined,
    rewardStatus: this.rewardStatus,
    expiresAt: this.expiresAt,
  };
};

module.exports = mongoose.model("CaptchaChallenge", captchaChallengeSchema);
