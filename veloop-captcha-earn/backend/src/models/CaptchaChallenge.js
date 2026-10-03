const mongoose = require("mongoose");
const { renderCaptchaSvg } = require("../utils/generateCaptcha");

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
    result: { type: String, enum: RESULT, default: null },

    rewardAmountMilliGems: { type: Number, default: 0 },
    rewardStatus: { type: String, enum: REWARD_STATUS, default: "NONE" },

    expiresAt: { type: Date, required: true, index: true },
    completedAt: { type: Date, default: null },
    claimedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

captchaChallengeSchema.index({ userId: 1, status: 1 });

/**
 * Strips server-only fields before anything is sent to the client.
 * The plain captchaText is NOT sent anymore - only a distorted image
 * (captchaImage), so a script cannot just read the answer from the API.
 */
captchaChallengeSchema.methods.toSafeJSON = function () {
  return {
    challengeId: this.challengeId,
    captchaImage: renderCaptchaSvg(this.captchaText, this.challengeId),
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